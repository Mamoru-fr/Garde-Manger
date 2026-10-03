// ============================================
// DirectoryActions - Actions pour interagir avec l'annuaire
// ============================================

"use server";

import { DirectoryProduct, SimplifiedDirectoryItem } from "@/lib/types/scanTypes";
import { getCurrentSession } from "@/lib/utils/auth";
import { searchInDirectory, searchByName, searchByNameLocal, isValidBarcode, cleanBarcode } from "@/lib/services/DirectoryService";
import { ActionResponse } from "@/lib/types";
import { SearchProductsByNameSchema } from "@/lib/validations/object";

/**
 * Cherche un produit dans l'annuaire par code-barres
 * Utilise le service DirectoryService mais côté serveur pour sécurité
 */
export async function searchProductInDirectory(barcode: string): Promise<ActionResponse<SimplifiedDirectoryItem | null>> {
  try {
    // Valider le code-barres
    if (!barcode || !barcode.trim()) {
      return {
        success: false,
        error: "Code-barres vide",
        code: "INVALID_BARCODE",
      };
    }

    const cleanCode = cleanBarcode(barcode);
    
    if (!isValidBarcode(cleanCode)) {
      return {
        success: false,
        error: "Code-barres invalide",
        code: "INVALID_BARCODE",
      };
    }

    const item = await searchInDirectory(cleanCode);
    
    if (!item) {
      return {
        success: true,
        data: null,
        error: "Produit non trouvé dans l'annuaire",
        code: "NOT_FOUND",
      };
    }

    return {
      success: true,
      data: item,
    };
  } catch (error) {
    console.error("Erreur recherche annuaire:", error);
    return {
      success: false,
      error: "Erreur lors de la recherche dans l'annuaire",
      code: "INTERNAL_ERROR",
    };
  }
}

/**
 * Cherche des produits par nom (annuaire local d'abord, OpenFoodFacts en repli)
 * Recherche manuelle sans scanner : l'annuaire object_directory est interrogé
 * sur le nom et la marque ; OpenFoodFacts prend le relais si rien en local.
 */
export async function searchProductsByName(query: string, limit: number = 10): Promise<ActionResponse<SimplifiedDirectoryItem[]>> {
  try {
    // Vérifier la session : les données de l'annuaire sont réservées aux utilisateurs connectés
    const session = await getCurrentSession();

    if (!session?.user) {
      return {
        success: false,
        error: "Non autorisé",
        code: "UNAUTHORIZED",
      };
    }

    // Validation stricte des entrées (obligation de couche : la porte d'entrée valide toujours)
    const parsed = SearchProductsByNameSchema.safeParse({ query, limit });

    if (!parsed.success) {
      return {
        success: true,
        data: [],
        error: "Requête trop courte ou invalide",
        code: "VALIDATION_ERROR",
      };
    }

    const { query: cleanQuery, limit: cleanLimit } = parsed.data;

    // 1. Recherche locale dans l'annuaire (nom + marque)
    const localItems = await searchByNameLocal(cleanQuery, cleanLimit);

    if (localItems.length > 0) {
      return {
        success: true,
        data: localItems,
      };
    }

    // 2. Repli sur OpenFoodFacts si l'annuaire local ne connaît pas le produit
    const offItems = await searchByName(cleanQuery, cleanLimit);

    return {
      success: true,
      data: offItems,
    };
  } catch (error) {
    console.error("Erreur recherche par nom:", error);
    return {
      success: false,
      error: "Erreur lors de la recherche par nom",
      code: "INTERNAL_ERROR",
    };
  }
}

/**
 * Vérifie un code-barres et retourne son statut complet
 * (annuaire + installations de l'utilisateur)
 */
export async function checkBarcodeComplete(barcode: string): Promise<ActionResponse<{
  foundInDirectory: boolean;
  directoryItem?: SimplifiedDirectoryItem | null;
  foundInUserInstallations: boolean;
  installations?: Array<{
    installationId: string;
    installationName: string;
    quantity: number;
  }>;
}>> {
  try {
    const session = await getCurrentSession();
    
    if (!session?.user) {
      return {
        success: false,
        error: "Non autorisé",
        code: "UNAUTHORIZED",
      };
    }

    // Chercher dans l'annuaire
    const directoryItem = await searchInDirectory(barcode);
    const foundInDirectory = !!directoryItem;

    // ICI: Chercher dans les installations de l'utilisateur
    // (À implémenter avec la base de données)
    // Pour l'instant, on retourne une structure vide
    const installations: Array<{ installationId: string; installationName: string; quantity: number; }> = []; // TODO: Implémenter la recherche en DB

    return {
      success: true,
      data: {
        foundInDirectory,
        directoryItem: directoryItem || null,
        foundInUserInstallations: installations.length > 0,
        installations,
      },
    };
  } catch (error) {
    console.error("Erreur vérification complète du code-barres:", error);
    return {
      success: false,
      error: "Erreur lors de la vérification",
      code: "INTERNAL_ERROR",
    };
  }
}

/**
 * Récupère les métadonnées d'un code-barres directement depuis l'API
 * (pour affichage rapide sans passer par la base)
 */
export async function getBarcodeMetadata(barcode: string): Promise<ActionResponse<DirectoryProduct | null>> {
  try {
    const cleanCode = cleanBarcode(barcode);
    
    if (!isValidBarcode(cleanCode)) {
      return {
        success: false,
        error: "Code-barres invalide",
        code: "INVALID_BARCODE",
      };
    }

    // Récupérer directement depuis OpenFoodFacts
    const response = await fetch(
      `https://api.openfoodfacts.org/api/v3/product/${cleanCode}.json`,
      {
        headers: {
          'User-Agent': 'Garde-Manger/1.0',
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return { success: true, data: null };
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: { product?: DirectoryProduct } = await response.json();
    
    return {
      success: true,
      data: data.product || null,
    };
  } catch (error) {
    console.error("Erreur récupération métadonnées:", error);
    return {
      success: false,
      error: "Erreur lors de la récupération",
      code: "INTERNAL_ERROR",
    };
  }
}
