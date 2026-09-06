// ============================================
// DirectoryService - Service pour interagir avec les API annuaire
// ============================================

import { DirectoryProduct, SimplifiedDirectoryItem } from "@/lib/types/scanTypes";

// Configuration de l'API OpenFoodFacts
const OPEN_FOOD_FACTS_API_URL = "https://world.openfoodfacts.org/api/v0";
const USER_AGENT = "Garde-Manger/1.0 (https://garde-manger.example.com)";

// Cache local pour éviter des appels répétés pour le même code-barres
const scanCache = new Map<string, { item: SimplifiedDirectoryItem; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes en ms

/**
 * Cherche un produit dans OpenFoodFacts par son code-barres
 * @param barcode - Le code-barres à rechercher
 * @returns Promise<SimplifiedDirectoryItem | null> - Le produit trouvé ou null
 */
export async function searchInDirectory(barcode: string): Promise<SimplifiedDirectoryItem | null> {
  // Vérifier le cache d'abord
  if (scanCache.has(barcode)) {
    const cached = scanCache.get(barcode)!;
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.item;
    }
    // Cache expiré, supprimer
    scanCache.delete(barcode);
  }

  try {
    const cleanBarcode = barcode.replace(/[-\s]/g, ''); // Nettoyer le code
    
    // Appel API OpenFoodFacts
    const response = await fetch(
      `${OPEN_FOOD_FACTS_API_URL}/product/${cleanBarcode}.json`,
      {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        // Produit non trouvé
        console.log(`Produit non trouvé dans OpenFoodFacts: ${cleanBarcode}`);
        return null;
      }
      throw new Error(`Erreur API OpenFoodFacts: ${response.status} ${response.statusText}`);
    }

    const data: { product?: DirectoryProduct; status?: number; status_verb?: string } = await response.json();
    
    if (!data.product) {
      console.log(`Aucun produit trouvé pour le code: ${cleanBarcode}`);
      return null;
    }

    const product = data.product as DirectoryProduct & { 
      product_name?: string; 
      product_name_fr?: string;
      quantity?: string;
      serving_size?: string;
      nutriscore_grade?: string;
      ingredients_text?: string;
      allergens?: string;
      allergens_from_ingredients?: string;
      brands?: string
    };
    
    // Construire l'objet simplifié
    const item: SimplifiedDirectoryItem = {
      id: product.id || cleanBarcode,
      barcode: cleanBarcode,
      name: product.product_name || product.generic_name || `Produit #${cleanBarcode}`,
      brand: product.brands || product.manufacturer_tags?.[0] || undefined,
      category: product.categories || product.food_groups || undefined,
      description: product.ingredients_text || product.generic_name || undefined,
      imageUrl: getBestImageUrl(product),
      quantity: product.quantity || product.serving_size || undefined,
      nutriscore: product.nutriscore_grade || undefined,
      ingredients: product.ingredients_text || undefined,
      allergens: product.allergens || product.allergens_from_ingredients || undefined,
      openFoodFactsId: product.id,
      productName: product.product_name_fr || product.product_name || undefined,
    };

    // Mettre en cache
    scanCache.set(barcode, { item, timestamp: Date.now() });
    
    return item;
  } catch (error) {
    console.error(`Erreur lors de la recherche du code ${barcode} dans l'annuaire:`, error);
    return null;
  }
}

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
 * Recherche plusieurs codes-barres en une seule requête (batch)
 */
export async function searchMultipleInDirectory(barcodes: string[]): Promise<Map<string, SimplifiedDirectoryItem | null>> {
  const results = new Map<string, SimplifiedDirectoryItem | null>();
  
  for (const barcode of barcodes) {
    const item = await searchInDirectory(barcode);
    results.set(barcode, item);
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
        id: p.id || p.code || p._id || '',
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
 * Vérifie si un code-barres est valide
 */
export function isValidBarcode(barcode: string): boolean {
  // Supprimer les caractères non numériques pour les codes EAN/UPC
  const numbersOnly = barcode.replace(/\D/g, '');
  
  // Les codes EAN-13 ont 13 chiffres
  const ean13Regex = /^\d{13}$/;
  // Les codes EAN-8 ont 8 chiffres
  const ean8Regex = /^\d{8}$/;
  // Les codes UPC-A ont 12 chiffres
  const upcRegex = /^\d{12}$/;
  
  return ean13Regex.test(numbersOnly) || 
         ean8Regex.test(numbersOnly) || 
         upcRegex.test(numbersOnly) ||
         numbersOnly.length >= 8; // Accepter d'autres longueurs pour QR codes
}

/**
 * Nettoie un code-barres pour le format standard
 */
export function cleanBarcode(barcode: string): string {
  return barcode
    .replace(/[-\s]/g, '')  // Supprimer les tirets et espaces
    .replace(/^0+/, '')    // Supprimer les zéros initiaux (sauf si c'est le seul)
    .toUpperCase();        // Majuscules pour les codes alphanumériques
}

// Exporter les constantes pour tests
export {
  OPEN_FOOD_FACTS_API_URL,
  USER_AGENT,
  CACHE_TTL,
  scanCache,
};
