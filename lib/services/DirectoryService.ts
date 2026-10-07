// ============================================
// DirectoryService - Service pour interagir avec les API annuaire
// ============================================

import { db } from "@/lib/db/drizzle";
import { objectDirectory, barcodeDirectory, productVariants } from "@/lib/db/schema";
import {
  buildOffCreationPlan,
  buildScanVariantSummary,
  applyVariantToDirectoryItem,
  type ScanVariantSummary,
} from "@/lib/services/ScanResolutionViewService";
import { eq, or, ilike } from "drizzle-orm";
import { randomUUID } from "crypto";
import { DirectoryProduct, SimplifiedDirectoryItem } from "@/lib/types/scanTypes";

// Configuration de l'API OpenFoodFacts
const OPEN_FOOD_FACTS_API_URL = "https://api.openfoodfacts.org/api/v3";
const USER_AGENT = "Garde-Manger/1.0 (https://garde-manger.example.com)";

// Cache local pour éviter des appels répétés pour le même code-barres
const scanCache = new Map<string, { item: SimplifiedDirectoryItem; timestamp: number; fromDB: boolean }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes en ms

/**
 * Récupère la meilleure URL d'image disponible depuis un produit OpenFoodFacts
 */
function getBestImageUrl(product: DirectoryProduct): string | undefined {
  // Privilégier les images frontales dans cet ordre
  const imageUrls = [
    product.image_url,
    product.image_front_url,
    product.image_small_url,
    product.image_thumb_url,
  ];
  
  for (const url of imageUrls) {
    if (url) {
      // Remplacer les domaines obsolètes si nécessaire
      return url.replace('static.openfoodfacts.org', 'images.openfoodfacts.org');
    }
  }
  
  return undefined;
}

/**
 * Récupère un produit brut depuis OpenFoodFacts par son code-barres
 */
export async function fetchFromOpenFoodFacts(barcode: string): Promise<DirectoryProduct | null> {
  try {
    const cleanedBarcode = cleanBarcode(barcode);
    
    const response = await fetch(
      `${OPEN_FOOD_FACTS_API_URL}/product/${cleanedBarcode}.json`,
      {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        console.log(`Produit non trouvé dans OpenFoodFacts: ${cleanedBarcode}`);
        return null;
      }
      throw new Error(`Erreur API OpenFoodFacts: ${response.status} ${response.statusText}`);
    }

    const data: { product?: DirectoryProduct; status?: number; status_verb?: string } = await response.json();
    
    if (!data.product) {
      console.log(`Aucun produit trouvé pour le code: ${cleanedBarcode}`);
      return null;
    }

    return data.product as DirectoryProduct & { 
      product_name?: string; 
      product_name_fr?: string;
      quantity?: string;
      serving_size?: string;
      nutriscore_grade?: string;
      ingredients_text?: string;
      allergens?: string;
      allergens_from_ingredients?: string;
      brands?: string;
      code?: string;
      id?: string;
    };
  } catch (error) {
    console.error(`Erreur lors de la récupération du code ${barcode} depuis OpenFoodFacts:`, error);
    return null;
  }
}

/**
 * Mappe un produit OpenFoodFacts vers les champs de SimplifiedDirectoryItem
 */
function mapOffProductToDirectoryData(
  product: DirectoryProduct & { 
    product_name?: string; 
    product_name_fr?: string;
    code?: string;
    id?: string;
  }
): Omit<SimplifiedDirectoryItem, 'id' | 'barcode' | 'isReadOnly'> {
  return {
    name: product.product_name || product.generic_name || `Produit sans nom`,
    brand: product.brands || undefined,
    category: product.categories?.split(',')[0] || undefined,
    description: product.generic_name || product.ingredients_text || undefined,
    imageUrl: getBestImageUrl(product),
    quantity: product.quantity || product.serving_size || undefined,
    nutriscore: product.nutriscore_grade || undefined,
    ingredients: product.ingredients_text || undefined,
    allergens: product.allergens || product.allergens_from_ingredients || undefined,
    openFoodFactsId: product.id || product.code,
    productName: product.product_name_fr || product.product_name || undefined,
  };
}

/**
 * Cherche un produit dans la base locale ou OpenFoodFacts par son code-barres.
 * Si introuvable localement, crée l'objet dans la base avec les données OpenFoodFacts (isReadOnly=true).
 */
export async function searchProductInDirectory(barcode: string): Promise<{ 
  success: boolean; 
  data: SimplifiedDirectoryItem | null; 
  created: boolean;
}> {
  const cleanedBarcode = cleanBarcode(barcode);
  
  // 1. Vérifier le cache
  if (scanCache.has(cleanedBarcode)) {
    const cached = scanCache.get(cleanedBarcode)!;
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return { 
        success: true, 
        data: cached.item, 
        created: !cached.fromDB,
      };
    }
    scanCache.delete(cleanedBarcode);
  }

  try {
    // 2. Chercher en base locale via openFoodFactsId ou barcodeDirectory
    const localResult = await db
      .select({
        id: objectDirectory.id,
        name: objectDirectory.name,
        description: objectDirectory.description,
        brand: objectDirectory.brand,
        nutriscore: objectDirectory.nutriscore,
        imageUrl: objectDirectory.openFoodFactsId, // ✅ À améliorer: stocker imageUrl dans objectDirectory plus tard
        openFoodFactsId: objectDirectory.openFoodFactsId,
        isReadOnly: objectDirectory.isReadOnly,
        barcodeRowId: barcodeDirectory.id,
        barcodeRowVariantId: barcodeDirectory.productVariantId,
        variantId: productVariants.id,
        variantBrand: productVariants.brand,
        variantNutriscore: productVariants.nutriscore,
        variantIsReadOnly: productVariants.isReadOnly,
      })
      .from(objectDirectory)
      .leftJoin(barcodeDirectory, eq(barcodeDirectory.objectDirectoryId, objectDirectory.id))
      .leftJoin(productVariants, eq(productVariants.id, barcodeDirectory.productVariantId))
      .where(
        or(
          eq(objectDirectory.openFoodFactsId, cleanedBarcode),
          eq(barcodeDirectory.barcode, cleanedBarcode),
        )
      )
      .limit(1);

    if (localResult.length > 0) {
      const localItem = localResult[0];

      // Chaîne 4:2 §5 : barcode → variante → générique. La variante liée
      // prime à l'affichage ; sans variante (fiche legacy), repli générique.
      let variantSummary = buildScanVariantSummary(
        localItem.variantId
          ? {
              id: localItem.variantId,
              brand: localItem.variantBrand,
              nutriscore: localItem.variantNutriscore,
              imageUrl: null,
              isReadOnly: localItem.variantIsReadOnly,
            }
          : null,
      );

      // Rattrapage (Q1 Alexis 05/10 : « comme sur des roulettes ») — les fiches
      // OFF nées entre le bloc 2 et la chaîne 4:2 portent marque et Nutri-Score
      // sur le générique, sans variante. Le premier scan qui les retrouve abaisse
      // ces champs dans une variante et lie le code-barres. Achèvement par
      // relance : chaque étape est idempotente (la variante manquante seule est
      // créée, le lien barcode n'est écrit qu'une fois).
      if (!variantSummary && localItem.barcodeRowId && localItem.isReadOnly) {
        // Une écriture ratée ne casse pas la lecture : repli legacy, le
        // rattrapage se rejouera au scan suivant (chaque étape idempotente).
        try {
        const variantId = randomUUID();
        await db.insert(productVariants).values({
          id: variantId,
          genericDirectoryId: localItem.id,
          brand: localItem.brand,
          nutriscore: localItem.nutriscore,
          imageUrl: null,
          openFoodFactsId: localItem.openFoodFactsId,
          isReadOnly: true,
        });
        await db
          .update(barcodeDirectory)
          .set({ productVariantId: variantId })
          .where(eq(barcodeDirectory.id, localItem.barcodeRowId));
        variantSummary = buildScanVariantSummary({
          id: variantId,
          brand: localItem.brand,
          nutriscore: localItem.nutriscore,
          imageUrl: null,
          isReadOnly: true,
        });
        } catch (rattrapageError) {
          console.error("[DirectoryService] Rattrapage variante 4:2 échoué (repli legacy) :", rattrapageError);
        }
      }

      const { item } = applyVariantToDirectoryItem(
        {
          id: localItem.id,
          barcode: cleanedBarcode,
          name: localItem.name,
          brand: localItem.brand || null,
          description: localItem.description || undefined,
          imageUrl: undefined,
          nutriscore: localItem.nutriscore || null,
          openFoodFactsId: localItem.openFoodFactsId || undefined,
          isReadOnly: localItem.isReadOnly || false,
        },
        variantSummary,
      );

      scanCache.set(cleanedBarcode, { item, timestamp: Date.now(), fromDB: true });
      return { success: true, data: item, created: false };
    }

    // 3. Chercher dans OpenFoodFacts
    const offProduct = await fetchFromOpenFoodFacts(cleanedBarcode);
    if (!offProduct) {
      console.log(`Produit non trouvé dans OpenFoodFacts: ${cleanedBarcode}`);
      // Mettre en cache le résultat négatif
      scanCache.set(cleanedBarcode, { 
        item: null as any, 
        timestamp: Date.now(), 
        fromDB: false 
      });
      return { success: true, data: null, created: false };
    }

    // 4. Chaîne 4:2 : générique (nom COMPLET, Q2 Alexis 05/10) + variante
    //    (marque, Nutri-Score, image) + code-barres lié à la VARIANTE (§5 :
    //    barcode → variante → générique). Ordre relançable : générique →
    //    variante → barcode ; une fiche interrompue avant la variante est
    //    complétée par le rattrapage du hit local au scan suivant.
    const newDirectoryId = randomUUID();
    const newVariantId = randomUUID();
    const offData = mapOffProductToDirectoryData(offProduct as any);
    const plan = buildOffCreationPlan({
      name: offData.name,
      brand: offData.brand ?? null,
      description: offData.description ?? null,
      nutriscore: offData.nutriscore ?? null,
      imageUrl: offData.imageUrl ?? null,
      openFoodFactsId: offData.openFoodFactsId || cleanedBarcode,
    });

    await db.insert(objectDirectory).values({
      id: newDirectoryId,
      name: plan.generic.name,
      description: plan.generic.description,
      openFoodFactsId: plan.generic.openFoodFactsId,
      isReadOnly: true, // ✅ Verrouillé car vient d'OpenFoodFacts
    });

    // 5. La variante porte la marque et le Nutri-Score (Q2 — ils descendent,
    //    plus jamais sur le générique créé)
    await db.insert(productVariants).values({
      id: newVariantId,
      genericDirectoryId: newDirectoryId,
      brand: plan.variant.brand,
      nutriscore: plan.variant.nutriscore,
      imageUrl: plan.variant.imageUrl,
      openFoodFactsId: plan.variant.openFoodFactsId,
      isReadOnly: true,
    });

    // L'entrée barcodeDirectory pointe désormais sur la variante (§5)
    await db.insert(barcodeDirectory).values({
      id: randomUUID(),
      objectDirectoryId: newDirectoryId,
      productVariantId: newVariantId,
      barcode: cleanedBarcode,
      barcodeType: "EAN13",
    });

    // 6. Construire l'objet à retourner — la variante prime à l'affichage
    const variantSummary: ScanVariantSummary = {
      id: newVariantId,
      brand: plan.variant.brand,
      nutriscore: plan.variant.nutriscore,
      imageUrl: plan.variant.imageUrl,
      isReadOnly: true,
    };
    const item: SimplifiedDirectoryItem = {
      id: newDirectoryId,
      barcode: cleanedBarcode,
      name: plan.generic.name,
      brand: plan.variant.brand,
      description: plan.generic.description,
      imageUrl: plan.variant.imageUrl || undefined,
      nutriscore: plan.variant.nutriscore,
      openFoodFactsId: plan.generic.openFoodFactsId || undefined,
      isReadOnly: true, // ✅ Forcé à true pour les objets OpenFoodFacts
      variant: variantSummary,
    };

    scanCache.set(cleanedBarcode, { item, timestamp: Date.now(), fromDB: false });
    return { success: true, data: item, created: true };
  } catch (error) {
    console.error(`[DirectoryService] Erreur dans searchProductInDirectory:`, error);
    return { success: false, data: null, created: false };
  }
}

/**
 * Cherche plusieurs codes-barres en une seule requête (batch)
 */
export async function searchMultipleInDirectory(barcodes: string[]): Promise<Map<string, SimplifiedDirectoryItem | null>> {
  const results = new Map<string, SimplifiedDirectoryItem | null>();
  
  for (const barcode of barcodes) {
    const { data } = await searchProductInDirectory(barcode);
    results.set(barcode, data);
  }
  
  return results;
}

/**
 * Recherche par nom de produit (pour l'autocomplétion)
 */
export async function searchByName(query: string, limit: number = 10): Promise<SimplifiedDirectoryItem[]> {
  try {
    const response = await fetch(
      `${OPEN_FOOD_FACTS_API_URL}/search/?search_terms=${encodeURIComponent(query)}&search_simple=1&json=1&page_size=${limit}`,
      {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      return [];
    }

    const data: { products?: DirectoryProduct[] } = await response.json();
    
    if (!data.products || !Array.isArray(data.products)) {
      return [];
    }

    return data.products.slice(0, limit).map(product => {
      const p = product as DirectoryProduct & { product_name?: string };
      return {
        id: p.id || p.code || '',
        barcode: p.code || p.id || '',
        name: p.product_name || p.generic_name || `Produit sans nom`,
        brand: p.brands?.split(',')[0] || undefined,
        category: p.categories?.split(',')[0] || undefined,
        imageUrl: getBestImageUrl(p),
        openFoodFactsId: p.id || p.code,
      };
    });
  } catch (error) {
    console.error(`Erreur lors de la recherche par nom:`, error);
    return [];
  }
}

/**
 * Recherche locale par nom de produit dans l'annuaire (object_directory)
 * Correspondance partielle insensible à la casse sur le nom ET la marque.
 * Même signature et même forme de retour que searchByName (OpenFoodFacts)
 * pour que l'action appelle les deux sources de la même façon.
 */
export async function searchByNameLocal(query: string, limit: number = 10): Promise<SimplifiedDirectoryItem[]> {
  try {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return [];
    }

    const pattern = `%${trimmedQuery}%`;

    const results = await db
      .select({
        id: objectDirectory.id,
        name: objectDirectory.name,
        description: objectDirectory.description,
        brand: objectDirectory.brand,
        nutriscore: objectDirectory.nutriscore,
        openFoodFactsId: objectDirectory.openFoodFactsId,
        isReadOnly: objectDirectory.isReadOnly,
      })
      .from(objectDirectory)
      .where(
        or(
          ilike(objectDirectory.name, pattern),
          ilike(objectDirectory.brand, pattern),
        )
      )
      .limit(limit);

    return results.map((item) => ({
      id: item.id,
      barcode: "", // Recherche par nom : la fiche locale est identifiée par son id, pas par un code-barres
      name: item.name,
      brand: item.brand || undefined,
      description: item.description || undefined,
      nutriscore: item.nutriscore || undefined,
      openFoodFactsId: item.openFoodFactsId || undefined,
      isReadOnly: item.isReadOnly || false,
    }));
  } catch (error) {
    console.error(`[DirectoryService] Erreur dans searchByNameLocal:`, error);
    return [];
  }
}

/**
 * Vérifie si un code-barres est valide
 */
export function isValidBarcode(barcode: string): boolean {
  const numbersOnly = barcode.replace(/\D/g, '');
  const ean13Regex = /^\d{13}$/;
  const ean8Regex = /^\d{8}$/;
  const upcRegex = /^\d{12}$/;
  
  return ean13Regex.test(numbersOnly) || 
         ean8Regex.test(numbersOnly) || 
         upcRegex.test(numbersOnly) ||
         numbersOnly.length >= 8;
}

/**
 * Nettoie un code-barres pour le format standard
 */
export function cleanBarcode(barcode: string): string {
  return barcode
    .replace(/[-\s]/g, '')
    .replace(/^0+/, '')
    .toUpperCase();
}

// Alias pour la rétrocompatibilité (ancienne fonction searchInDirectory)
export async function searchInDirectory(barcode: string): Promise<SimplifiedDirectoryItem | null> {
  const result = await searchProductInDirectory(barcode);
  return result.success ? result.data : null;
}

// Exporter les constantes pour tests
export {
  OPEN_FOOD_FACTS_API_URL,
  USER_AGENT,
  CACHE_TTL,
  scanCache,
};
