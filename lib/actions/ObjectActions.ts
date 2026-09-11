"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { getAuthHeaders } from "@/lib/utils/auth";
import { ObjectController } from "@/lib/controllers/ObjectController";
import { InstallationController } from "@/lib/controllers/InstallationController";
import { ActionResponse, ErrorCodes } from "@/lib/types";

// ============================================================================
// ACTIONS POUR LA GESTION DES OBJETS DANS L'ANNUAIRE
// ============================================================================

// Action pour créer un nouvel objet dans l'annuaire
export async function createObjectDirectory(
  prevState: ActionResponse<{ objectId: string }> | null,
  formData: FormData
): Promise<ActionResponse<{ objectId: string }>> {
  try {
    // Récupérer la session
    const headers = await getAuthHeaders();
    const session = await auth.api.getSession({ headers });
    
    if (!session?.user) {
      return {
        success: false,
        error: "Tu dois être connecté pour créer un objet",
        code: ErrorCodes.UNAUTHORIZED,
      };
    }

    // Extraire les données du formulaire
    const input = {
      name: formData.get("name") as string,
      description: formData.get("description") as string | undefined,
      categoryId: formData.get("categoryId") as string | undefined,
      unitId: formData.get("unitId") as string | undefined,
    };

    // Appeler le contrôleur
    const result = await ObjectController.createObjectDirectory(
      input,
      session.user.id
    );

    if (!result.success) {
      return result;
    }

    // Rediriger vers la page de l'objet
    redirect(`/objects/${result.data?.objectId}`);
  } catch (error) {
    console.error("[ObjectActions] Erreur lors de la création de l'objet:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de la création de l'objet",
      code: ErrorCodes.INTERNAL_ERROR,
    };
  }
}

// Action pour rechercher des objets
export async function searchObjects(
  search?: string,
  categoryId?: string,
  limit: number = 20,
  offset: number = 0
): Promise<ActionResponse<{
  objects: Array<{
    id: string;
    name: string;
    description: string | null;
    category: string | null;
    unit: string | null;
  }>;
  total: number;
}>> {
  try {
    const result = await ObjectController.searchObjects({
      search,
      categoryId,
      limit,
      offset,
    });
    return result;
  } catch (error) {
    console.error("[ObjectActions] Erreur lors de la recherche d'objets:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de la recherche d'objets",
      code: ErrorCodes.INTERNAL_ERROR,
    };
  }
}

// Action pour ajouter un code-barres à un objet
export async function addBarcodeToObject(
  prevState: ActionResponse<{ barcodeId: string }> | null,
  formData: FormData
): Promise<ActionResponse<{ barcodeId: string }>> {
  try {
    // Récupérer la session
    const headers = await getAuthHeaders();
    const session = await auth.api.getSession({ headers });
    
    if (!session?.user) {
      return {
        success: false,
        error: "Tu dois être connecté pour ajouter un code-barres",
        code: ErrorCodes.UNAUTHORIZED,
      };
    }

    const objectDirectoryId = formData.get("objectDirectoryId") as string;
    const barcode = formData.get("barcode") as string;

    // Appeler le contrôleur
    const result = await ObjectController.addBarcodeToObject(
      objectDirectoryId,
      barcode
    );

    return result;
  } catch (error) {
    console.error("[ObjectActions] Erreur lors de l'ajout du code-barres:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de l'ajout du code-barres",
      code: ErrorCodes.INTERNAL_ERROR,
    };
  }
}

// Action pour rechercher un objet par code-barres
export async function searchObjectByBarcode(
  barcode: string
): Promise<ActionResponse<{
  object: {
    id: string;
    name: string;
    description: string | null;
  };
} | null>> {
  try {
    const result = await ObjectController.searchObjectByBarcode(barcode);
    return result;
  } catch (error) {
    console.error("[ObjectActions] Erreur lors de la recherche par code-barres:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de la recherche par code-barres",
      code: ErrorCodes.INTERNAL_ERROR,
    };
  }
}

// ============================================================================
// ACTIONS POUR LES OBJETS DANS LES INSTALLATIONS
// ============================================================================

// Action pour ajouter un objet à une installation
export async function addObjectToInstallation(
  prevState: ActionResponse<{ objectInstallationId: string }> | null,
  formData: FormData
): Promise<ActionResponse<{ objectInstallationId: string }>> {
  try {
    // Récupérer la session
    const headers = await getAuthHeaders();
    const session = await auth.api.getSession({ headers });
    
    if (!session?.user) {
      return {
        success: false,
        error: "Tu dois être connecté pour ajouter un objet",
        code: ErrorCodes.UNAUTHORIZED,
      };
    }

    const installationId = formData.get("installationId") as string;
    const objectDirectoryId = formData.get("objectDirectoryId") as string;
    const quantity = parseInt(formData.get("quantity") as string) || 1;
    const location = formData.get("location") as string | undefined;
    const expiryDateString = formData.get("expiryDate") as string | undefined;
    
    let expiryDate: Date | undefined;
    if (expiryDateString) {
      expiryDate = new Date(expiryDateString);
    }

    // Appeler le contrôleur
    const result = await ObjectController.addObjectToInstallation(
      installationId,
      objectDirectoryId,
      quantity,
      session.user.id,
      location,
      expiryDate
    );

    return result;
  } catch (error) {
    console.error("[ObjectActions] Erreur lors de l'ajout de l'objet:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de l'ajout de l'objet",
      code: ErrorCodes.INTERNAL_ERROR,
    };
  }
}

// Action pour scanner un code-barres et ajouter un objet à une installation
export async function scanAndAddObject(
  installationId: string,
  barcode: string,
  quantity: number = 1
): Promise<ActionResponse<{ 
  objectInstallationId: string; 
  foundByBarcode: boolean; 
}>> {
  try {
    // Récupérer la session
    const headers = await getAuthHeaders();
    const session = await auth.api.getSession({ headers });
    
    if (!session?.user) {
      return {
        success: false,
        error: "Tu dois être connecté pour ajouter un objet",
        code: ErrorCodes.UNAUTHORIZED,
      };
    }

    // Rechercher l'objet par code-barres
    const searchResult = await ObjectController.searchObjectByBarcode(barcode);
    
    if (searchResult.success && searchResult.data && searchResult.data.object) {
      // Objet trouvé par code-barres
      const objectId = searchResult.data.object.id;
      
      // Ajouter l'objet à l'installation
      const addResult = await ObjectController.addObjectToInstallation(
        installationId,
        objectId,
        quantity,
        session.user.id
      );

      if (addResult.success) {
        return {
          success: true,
          data: {
            objectInstallationId: addResult.data!.objectInstallationId,
            foundByBarcode: true,
          },
        };
      }
      
      return addResult as ActionResponse<{ objectInstallationId: string; foundByBarcode: boolean; }>;
    }

    // Objet non trouvé par code-barres, retourner une réponse spéciale
    return {
      success: true,
      data: {
        objectInstallationId: "",
        foundByBarcode: false,
      },
    };
  } catch (error) {
    console.error("[ObjectActions] Erreur lors du scan:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors du scan",
      code: ErrorCodes.INTERNAL_ERROR,
    };
  }
}

// Action pour rechercher et ajouter un objet par nom
export async function searchAndAddObject(
  installationId: string,
  name: string,
  quantity: number = 1
): Promise<ActionResponse<{ 
  objectInstallationId: string; 
  objectId: string; 
}>> {
  try {
    // Récupérer la session
    const headers = await getAuthHeaders();
    const session = await auth.api.getSession({ headers });
    
    if (!session?.user) {
      return {
        success: false,
        error: "Tu dois être connecté pour ajouter un objet",
        code: ErrorCodes.UNAUTHORIZED,
      };
    }

    // Chercher l'objet par nom
    const searchResult = await ObjectController.searchObjects({
      search: name,
      limit: 1,
    });
    
    if (searchResult.success && searchResult.data && searchResult.data.objects.length > 0) {
      const objectId = searchResult.data.objects[0].id;
      
      // Ajouter l'objet à l'installation
      const addResult = await ObjectController.addObjectToInstallation(
        installationId,
        objectId,
        quantity,
        session.user.id
      );

      if (addResult.success) {
        return {
          success: true,
          data: {
            objectInstallationId: addResult.data!.objectInstallationId,
            objectId: objectId,
          },
        };
      }
      
      return addResult as ActionResponse<{ objectInstallationId: string; objectId: string; }>;
    }

    // Objet non trouvé, créer un nouvel objet
    const createResult = await ObjectController.createObjectDirectory(
      { name },
      session.user.id
    );
    
    if (createResult.success) {
      const objectId = createResult.data!.objectId;
      
      // Ajouter le nouvel objet à l'installation
      const addResult = await ObjectController.addObjectToInstallation(
        installationId,
        objectId,
        quantity,
        session.user.id
      );

      if (addResult.success) {
        return {
          success: true,
          data: {
            objectInstallationId: addResult.data!.objectInstallationId,
            objectId: objectId,
          },
        };
      }
    }

    return createResult as ActionResponse<{ objectInstallationId: string; objectId: string; }>;
  } catch (error) {
    console.error("[ObjectActions] Erreur lors de la recherche et ajout:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de la recherche et ajout",
      code: ErrorCodes.INTERNAL_ERROR,
    };
  }
}

// Action pour mettre à jour un objet dans une installation
export async function updateObjectInInstallation(
  prevState: ActionResponse<void> | null,
  formData: FormData
): Promise<ActionResponse<void>> {
  try {
    // Récupérer la session
    const headers = await getAuthHeaders();
    const session = await auth.api.getSession({ headers });
    
    if (!session?.user) {
      return {
        success: false,
        error: "Tu dois être connecté pour mettre à jour un objet",
        code: ErrorCodes.UNAUTHORIZED,
      };
    }

    const objectInstallationId = formData.get("objectInstallationId") as string;
    const quantityString = formData.get("quantity") as string;
    const location = formData.get("location") as string | undefined;
    const expiryDateString = formData.get("expiryDate") as string | undefined;

    const input: {
      quantity?: number;
      location?: string;
      expiryDate?: Date;
    } = {};

    if (quantityString) {
      input.quantity = parseInt(quantityString);
    }
    if (location) {
      input.location = location;
    }
    if (expiryDateString) {
      input.expiryDate = new Date(expiryDateString);
    }

    // Appeler le contrôleur
    const result = await ObjectController.updateObjectInInstallation(
      objectInstallationId,
      session.user.id,
      input
    );

    return result;
  } catch (error) {
    console.error("[ObjectActions] Erreur lors de la mise à jour:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de la mise à jour",
      code: ErrorCodes.INTERNAL_ERROR,
    };
  }
}

// Action pour supprimer un objet d'une installation
export async function removeObjectFromInstallation(
  objectInstallationId: string
): Promise<ActionResponse<void>> {
  try {
    // Récupérer la session
    const headers = await getAuthHeaders();
    const session = await auth.api.getSession({ headers });
    
    if (!session?.user) {
      return {
        success: false,
        error: "Tu dois être connecté pour supprimer un objet",
        code: ErrorCodes.UNAUTHORIZED,
      };
    }

    // Appeler le contrôleur
    const result = await ObjectController.removeObjectFromInstallation(
      objectInstallationId,
      session.user.id
    );

    return result;
  } catch (error) {
    console.error("[ObjectActions] Erreur lors de la suppression:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de la suppression",
      code: ErrorCodes.INTERNAL_ERROR,
    };
  }
}

// Action pour obtenir les objets d'une installation
export async function getObjectsInInstallation(
  installationId: string
): Promise<ActionResponse<{
  objects: Array<{
    id: string;
    objectDirectoryId: string;
    name: string;
    category: string | null;
    unit: string | null;
    quantity: number;
    location: string | null;
    expiryDate: Date | null;
    barcode: string | null;
  }>;
}>> {
  try {
    // Récupérer la session
    const headers = await getAuthHeaders();
    const session = await auth.api.getSession({ headers });
    
    if (!session?.user) {
      return {
        success: false,
        error: "Tu dois être connecté pour voir les objets",
        code: ErrorCodes.UNAUTHORIZED,
      };
    }

    const result = await ObjectController.getObjectsInInstallation(
      installationId,
      session.user.id
    );

    return result;
  } catch (error) {
    console.error("[ObjectActions] Erreur lors de la récupération des objets:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de la récupération des objets",
      code: ErrorCodes.INTERNAL_ERROR,
    };
  }
}

// Action pour obtenir les détails d'un objet
export async function getObjectDirectoryDetails(
  objectId: string
): Promise<ActionResponse<{
  object: {
    id: string;
    name: string;
    description: string | null;
    category: { id: string; name: string; type: string } | null;
    unit: { id: string; name: string; symbol: string; type: string } | null;
    defaultQuantity: number;
    barcodes: Array<{ id: string; barcode: string; barcodeType: string }>;
    createdAt: Date;
    updatedAt: Date;
  };
}>> {
  try {
    const result = await ObjectController.getObjectDirectoryDetails(objectId);
    return result;
  } catch (error) {
    console.error("[ObjectActions] Erreur lors de la récupération des détails:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de la récupération des détails",
      code: ErrorCodes.INTERNAL_ERROR,
    };
  }
}

// Action pour obtenir les statistiques d'une installation
export async function getInstallationStats(
  installationId: string
): Promise<ActionResponse<{
  stats: {
    totalObjects: number;
    totalQuantity: number;
    objectsByCategory: Array<{ category: string; count: number }>;
    expiringSoon: number;
    expired: number;
    valid: number;
  };
}>> {
  try {
    // Récupérer la session
    const headers = await getAuthHeaders();
    const session = await auth.api.getSession({ headers });
    
    if (!session?.user) {
      return {
        success: false,
        error: "Tu dois être connecté pour voir les statistiques",
        code: ErrorCodes.UNAUTHORIZED,
      };
    }

    const result = await ObjectController.getInstallationStats(
      installationId,
      session.user.id
    );

    if (!result.success) {
      return result;
    }

    return result;
  } catch (error) {
    console.error("[ObjectActions] Erreur lors de la récupération des statistiques:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de la récupération des statistiques",
      code: ErrorCodes.INTERNAL_ERROR,
    };
  }
}

// Action pour obtenir les objets expirés
export async function getExpiringObjects(
  installationId: string,
  days: number = 7
): Promise<ActionResponse<{
  objects: Array<{
    id: string;
    name: string;
    quantity: number;
    location: string | null;
    expiryDate: Date;
    daysLeft: number;
  }>;
}>> {
  try {
    // Récupérer la session
    const headers = await getAuthHeaders();
    const session = await auth.api.getSession({ headers });
    
    if (!session?.user) {
      return {
        success: false,
        error: "Tu dois être connecté pour voir les objets expirés",
        code: ErrorCodes.UNAUTHORIZED,
      };
    }

    const result = await ObjectController.getExpiringObjects(
      installationId,
      session.user.id,
      days
    );

    return result;
  } catch (error) {
    console.error("[ObjectActions] Erreur lors de la récupération des objets expirés:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de la récupération des objets expirés",
      code: ErrorCodes.INTERNAL_ERROR,
    };
  }
}

// Action pour importer des objets
export async function importObjects(
  installationId: string,
  jsonData: string
): Promise<ActionResponse<{ importedCount: number; failedCount: number }>> {
  try {
    // Récupérer la session
    const headers = await getAuthHeaders();
    const session = await auth.api.getSession({ headers });
    
    if (!session?.user) {
      return {
        success: false,
        error: "Tu dois être connecté pour importer des objets",
        code: ErrorCodes.UNAUTHORIZED,
      };
    }

    // Parser le JSON
    let objects;
    try {
      objects = JSON.parse(jsonData);
    } catch (parseError) {
      return {
        success: false,
        error: "Le fichier JSON est invalide",
        code: ErrorCodes.VALIDATION_ERROR,
      };
    }

    // Vérifier que c'est un tableau
    if (!Array.isArray(objects)) {
      return {
        success: false,
        error: "Le fichier doit contenir un tableau d'objets",
        code: ErrorCodes.VALIDATION_ERROR,
      };
    }

    // Ajouter l'installationId à chaque objet
    const objectsWithInstallationId = objects.map(obj => ({
      ...obj,
      installationId,
    }));

    const result = await ObjectController.importObjects(
      objectsWithInstallationId,
      session.user.id
    );

    return result;
  } catch (error) {
    console.error("[ObjectActions] Erreur lors de l'import:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de l'import",
      code: ErrorCodes.INTERNAL_ERROR,
    };
  }
}

// Action pour exporter des objets
export async function exportObjects(
  installationId: string
): Promise<ActionResponse<{ exportData: string }>> {
  try {
    // Récupérer la session
    const headers = await getAuthHeaders();
    const session = await auth.api.getSession({ headers });
    
    if (!session?.user) {
      return {
        success: false,
        error: "Tu dois être connecté pour exporter des objets",
        code: ErrorCodes.UNAUTHORIZED,
      };
    }

    const result = await ObjectController.exportObjects(
      installationId,
      session.user.id
    );

    return result;
  } catch (error) {
    console.error("[ObjectActions] Erreur lors de l'export:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de l'export",
      code: ErrorCodes.INTERNAL_ERROR,
    };
  }
}

// Action pour supprimer un objet de l'annuaire
export async function deleteObjectFromDirectory(
  objectId: string
): Promise<ActionResponse<void>> {
  try {
    // Récupérer la session
    const headers = await getAuthHeaders();
    const session = await auth.api.getSession({ headers });
    
    if (!session?.user) {
      return {
        success: false,
        error: "Tu dois être connecté pour supprimer un objet de l'annuaire",
        code: ErrorCodes.UNAUTHORIZED,
      };
    }

    const result = await ObjectController.deleteObjectFromDirectory(objectId);
    return result;
  } catch (error) {
    console.error("[ObjectActions] Erreur lors de la suppression de l'annuaire:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de la suppression de l'annuaire",
      code: ErrorCodes.INTERNAL_ERROR,
    };
  }
}

// ============================================================================
// NOUVELLES ACTIONS POUR LA GESTION DES OBJETS GLOBAUX
// ============================================================================

// Action pour récupérer un objet global avec toutes ses instances
export async function getGlobalObject(
  objectDirectoryId: string
): Promise<ActionResponse<any>> {
  try {
    // Récupérer la session
    const headers = await getAuthHeaders();
    const session = await auth.api.getSession({ headers });

    if (!session?.user) {
      return {
        success: false,
        error: "Tu dois être connecté pour voir cet objet",
        code: ErrorCodes.UNAUTHORIZED,
      };
    }

    const result = await ObjectController.getGlobalObject(
      objectDirectoryId,
      session.user.id
    );
    return result;
  } catch (error) {
    console.error("[ObjectActions] Erreur lors de la récupération de l'objet global:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de la récupération de l'objet global",
      code: ErrorCodes.INTERNAL_ERROR,
    };
  }
}

// Action pour récupérer les instances d'un objet global dans une installation
export async function getObjectInstances(
  objectDirectoryId: string,
  installationId: string
): Promise<ActionResponse<any>> {
  try {
    // Récupérer la session
    const headers = await getAuthHeaders();
    const session = await auth.api.getSession({ headers });

    if (!session?.user) {
      return {
        success: false,
        error: "Tu dois être connecté pour voir ces informations",
        code: ErrorCodes.UNAUTHORIZED,
      };
    }

    // Vérifier que l'utilisateur a accès à l'installation
    const accessResult = await InstallationController.checkAccess(
      session.user.id,
      installationId
    );

    if (!accessResult.success || !accessResult.data?.hasAccess) {
      return {
        success: false,
        error: "Tu n'as pas accès à cette installation",
        code: ErrorCodes.INSTALLATION_ACCESS_DENIED,
      };
    }

    const result = await ObjectController.getObjectInstances(
      objectDirectoryId,
      installationId
    );
    return result;
  } catch (error) {
    console.error("[ObjectActions] Erreur lors de la récupération des instances:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de la récupération des instances",
      code: ErrorCodes.INTERNAL_ERROR,
    };
  }
}

// Action pour récupérer les données nutritionnelles depuis OpenFoodFacts
export async function fetchNutritionalData(
  barcode: string
): Promise<ActionResponse<any>> {
  try {
    // Récupérer la session (optionnel, pour logging)
    const headers = await getAuthHeaders();
    const session = await auth.api.getSession({ headers });

    const result = await ObjectController.fetchNutritionalData(barcode);
    return result;
  } catch (error) {
    console.error("[ObjectActions] Erreur lors de la récupération des données OpenFoodFacts:", error);
    return {
      success: false,
      error: "Erreur lors de la récupération des données nutritionnelles",
      code: ErrorCodes.OPEN_FOOD_FACTS_ERROR,
    };
  }
}

// ============================================================================
// ACTIONS POUR LES TYPES D'OBJETS
// ============================================================================

// Action pour créer un type d'objet
export async function createObjectType(
  prevState: ActionResponse<{ objectTypeId: string }> | null,
  formData: FormData
): Promise<ActionResponse<{ objectTypeId: string }>> {
  try {
    // Récupérer la session
    const headers = await getAuthHeaders();
    const session = await auth.api.getSession({ headers });

    if (!session?.user) {
      return {
        success: false,
        error: "Tu dois être connecté pour créer un type d'objet",
        code: ErrorCodes.UNAUTHORIZED,
      };
    }

    const name = formData.get("name") as string;
    const description = formData.get("description") as string | undefined;
    const icon = formData.get("icon") as string | undefined;
    const parentTypeId = formData.get("parentTypeId") as string | undefined;

    const result = await ObjectController.createObjectType(
      name,
      description,
      icon,
      parentTypeId
    );
    return result;
  } catch (error) {
    console.error("[ObjectActions] Erreur lors de la création du type:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de la création du type",
      code: ErrorCodes.INTERNAL_ERROR,
    };
  }
}

// Action pour lister tous les types d'objets
export async function listObjectTypes(): Promise<ActionResponse<any>> {
  try {
    // Récupérer la session
    const headers = await getAuthHeaders();
    const session = await auth.api.getSession({ headers });

    if (!session?.user) {
      return {
        success: false,
        error: "Tu dois être connecté pour voir les types",
        code: ErrorCodes.UNAUTHORIZED,
      };
    }

    const result = await ObjectController.listObjectTypes();
    return result;
  } catch (error) {
    console.error("[ObjectActions] Erreur lors de la récupération des types:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de la récupération des types",
      code: ErrorCodes.INTERNAL_ERROR,
    };
  }
}

// ============================================================================
// ACTIONS POUR LES MAGASINS
// ============================================================================

// Action pour créer un magasin
export async function createShop(
  prevState: ActionResponse<{ shopId: string }> | null,
  formData: FormData
): Promise<ActionResponse<{ shopId: string }>> {
  try {
    // Récupérer la session
    const headers = await getAuthHeaders();
    const session = await auth.api.getSession({ headers });

    if (!session?.user) {
      return {
        success: false,
        error: "Tu dois être connecté pour créer un magasin",
        code: ErrorCodes.UNAUTHORIZED,
      };
    }

    const name = formData.get("name") as string;
    const address = formData.get("address") as string | undefined;
    const city = formData.get("city") as string | undefined;

    const result = await ObjectController.createShop(name, address, city);
    return result;
  } catch (error) {
    console.error("[ObjectActions] Erreur lors de la création du magasin:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de la création du magasin",
      code: ErrorCodes.INTERNAL_ERROR,
    };
  }
}

// Action pour lister tous les magasins
export async function listShops(): Promise<ActionResponse<any>> {
  try {
    // Récupérer la session
    const headers = await getAuthHeaders();
    const session = await auth.api.getSession({ headers });

    if (!session?.user) {
      return {
        success: false,
        error: "Tu dois être connecté pour voir les magasins",
        code: ErrorCodes.UNAUTHORIZED,
      };
    }

    const result = await ObjectController.listShops();
    return result;
  } catch (error) {
    console.error("[ObjectActions] Erreur lors de la récupération des magasins:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de la récupération des magasins",
      code: ErrorCodes.INTERNAL_ERROR,
    };
  }
}

// ==========================================================================
// NOUVELLES ACTIONS SPÉCIFIQUES POUR LE FLUX DE SCAN MODERNE
// ==========================================================================

import { SimplifiedDirectoryItem } from "@/lib/types/scanTypes";
import { searchProductInDirectory } from "@/lib/services/DirectoryService";
import { db } from "@/lib/db/drizzle";
import { objectInstallation, installations, userInstallations, users, objectDirectory, barcodeDirectory } from "@/lib/db/schema";
import { and, eq, desc, inArray } from "drizzle-orm";

/**
 * Vérifie si un code-barres existe dans une installation spécifique
 * et retourne la quantité actuelle
 */
export async function checkBarcodeInInstallation(
  installationId: string,
  barcode: string
): Promise<ActionResponse<{ found: boolean; quantity: number; objectId?: string }>> {
  try {
    const headers = await getAuthHeaders();
    const session = await auth.api.getSession({ headers });

    if (!session?.user) {
      return {
        success: false,
        error: "Non autorisé",
        code: ErrorCodes.UNAUTHORIZED,
      };
    }

    // Vérifier l'accès à l'installation
    const accessResult = await InstallationController.checkAccess(
      session.user.id,
      installationId
    );

    if (!accessResult.success || !accessResult.data?.hasAccess) {
      return {
        success: false,
        error: "Accès refusé à cette installation",
        code: ErrorCodes.INSTALLATION_ACCESS_DENIED,
      };
    }

    // Chercher l'objet dans l'installation via le code-barres (jointure nécessaire)
    const obj = await db.query.objectInstallation.findFirst({
      where: and(
        eq(objectInstallation.installationId, installationId),
        inArray(objectInstallation.objectDirectoryId, 
          db.select({ id: barcodeDirectory.objectDirectoryId })
            .from(barcodeDirectory)
            .where(eq(barcodeDirectory.barcode, barcode))
        )
      ),
      columns: { id: true, quantity: true },
      with: {
        objectDirectory: true,
      },
    });

    if (obj) {
      return {
        success: true,
        data: {
          found: true,
          quantity: obj.quantity,
          objectId: obj.id,
        },
      };
    }

    return {
      success: true,
      data: {
        found: false,
        quantity: 0,
      },
    };
  } catch (error) {
    console.error("[ObjectActions] Erreur checkBarcodeInInstallation:", error);
    return {
      success: false,
      error: "Erreur lors de la vérification du code-barres",
      code: ErrorCodes.INTERNAL_ERROR,
    };
  }
}

/**
 * Effectue un scan complet : cherche dans l'annuaire ET dans l'installation
 * Retourne toutes les infos nécessaires pour les modales
 */
export async function performCompleteScan(
  installationId: string,
  barcode: string
): Promise<ActionResponse<{
  foundInDirectory: boolean;
  directoryItem?: SimplifiedDirectoryItem | null;
  foundInInstallation: boolean;
  currentQuantity: number;
  objectId?: string;
}>> {
  try {
    const headers = await getAuthHeaders();
    const session = await auth.api.getSession({ headers });

    if (!session?.user) {
      return {
        success: false,
        error: "Non autorisé",
        code: ErrorCodes.UNAUTHORIZED,
      };
    }

    // Vérifier l'accès à l'installation
    const accessResult = await InstallationController.checkAccess(
      session.user.id,
      installationId
    );

    if (!accessResult.success || !accessResult.data?.hasAccess) {
      return {
        success: false,
        error: "Accès refusé à cette installation",
        code: ErrorCodes.INSTALLATION_ACCESS_DENIED,
      };
    }

    // 1. Chercher dans l'annuaire
    const directoryResponse = await searchProductInDirectory(barcode);

    // 2. Chercher dans l'installation
    const installationCheck = await checkBarcodeInInstallation(installationId, barcode);

    return {
      success: true,
      data: {
        foundInDirectory: directoryResponse.success && !!directoryResponse.data,
        directoryItem: directoryResponse.success ? directoryResponse.data : null,
        foundInInstallation: installationCheck.success && installationCheck.data ? installationCheck.data.found : false,
        currentQuantity: installationCheck.success && installationCheck.data ? installationCheck.data.quantity : 0,
        objectId: installationCheck.success && installationCheck.data ? installationCheck.data.objectId : undefined,
      },
    };
  } catch (error) {
    console.error("[ObjectActions] Erreur performCompleteScan:", error);
    return {
      success: false,
      error: "Erreur lors du scan complet",
      code: ErrorCodes.INTERNAL_ERROR,
    };
  }
}

/**
 * Ajoute un objet scanné à une installation
 * Crée l'objet dans l'annuaire s'il n'existe pas
 */
export async function addScannedObject(
  installationId: string,
  barcode: string,
  quantity: number = 1,
  additionalData?: {
    name?: string;
    category?: string;
    description?: string;
    brand?: string;
    expiryDate?: Date;
    location?: string;
  }
): Promise<ActionResponse<{ objectId: string; createdInDirectory: boolean }>> {
  try {
    const headers = await getAuthHeaders();
    const session = await auth.api.getSession({ headers });

    if (!session?.user) {
      return {
        success: false,
        error: "Non autorisé",
        code: ErrorCodes.UNAUTHORIZED,
      };
    }

    // Vérifier l'accès à l'installation
    const accessResult = await InstallationController.checkAccess(
      session.user.id,
      installationId
    );

    if (!accessResult.success || !accessResult.data?.hasAccess) {
      return {
        success: false,
        error: "Accès refusé",
        code: ErrorCodes.INSTALLATION_ACCESS_DENIED,
      };
    }

    // 1. Chercher dans l'annuaire
    const directoryResponse = await searchProductInDirectory(barcode);

    let objectDirectoryId: string;
    let createdInDirectory = false;

    if (directoryResponse.success && directoryResponse.data) {
      // Objet trouvé dans l'annuaire
      objectDirectoryId = directoryResponse.data.id;
      createdInDirectory = false;
    } else {
      // Objet non trouvé dans l'annuaire → créer un nouvel objet
      if (!additionalData?.name) {
        return {
          success: false,
          error: "Le nom de l'objet est requis car il n'a pas été trouvé dans l'annuaire",
          code: ErrorCodes.VALIDATION_ERROR,
        };
      }

      // Créer un nouvel objet dans l'annuaire
      const createResult = await ObjectController.createObjectDirectory(
        {
          name: additionalData.name,
          description: additionalData.description,
        },
        session.user.id
      );

      if (!createResult.success) {
        return createResult as ActionResponse<{ objectId: string; createdInDirectory: boolean }>;
      }

      objectDirectoryId = createResult.data!.objectId;
      createdInDirectory = true;

      // Ajouter le code-barres au nouvel objet
      await ObjectController.addBarcodeToObject(
        objectDirectoryId,
        barcode
      );
    }

    // 2. Ajouter l'objet à l'installation
    const addResult = await ObjectController.addObjectToInstallation(
      installationId,
      objectDirectoryId,
      quantity,
      session.user.id,
      additionalData?.location,
      additionalData?.expiryDate
    );

    if (!addResult.success) {
      return {
        success: false,
        error: addResult.error || "Erreur lors de l'ajout",
        code: addResult.code,
      };
    }

    return {
      success: true,
      data: {
        objectId: addResult.data!.objectInstallationId,
        createdInDirectory,
      },
    };
  } catch (error) {
    console.error("[ObjectActions] Erreur addScannedObject:", error);
    return {
      success: false,
      error: "Erreur lors de l'ajout de l'objet scanné",
      code: ErrorCodes.INTERNAL_ERROR,
    };
  }
}

/**
 * Met à jour la quantité d'un objet dans une installation
 * (utilisé pour ajouter ou retirer une quantité existante)
 */
export async function updateObjectQuantityInInstallation(
  installationId: string,
  barcode: string,
  newQuantity: number
): Promise<ActionResponse<{ objectId: string; previousQuantity: number }>> {
  try {
    const headers = await getAuthHeaders();
    const session = await auth.api.getSession({ headers });

    if (!session?.user) {
      return {
        success: false,
        error: "Non autorisé",
        code: ErrorCodes.UNAUTHORIZED,
      };
    }

    // Vérifier l'accès à l'installation
    const accessResult = await InstallationController.checkAccess(
      session.user.id,
      installationId
    );

    if (!accessResult.success || !accessResult.data?.hasAccess) {
      return {
        success: false,
        error: "Accès refusé",
        code: ErrorCodes.INSTALLATION_ACCESS_DENIED,
      };
    }

    // Trouver l'objet dans l'installation (jointure nécessaire pour barcode)
    const obj = await db.query.objectInstallation.findFirst({
      where: and(
        eq(objectInstallation.installationId, installationId),
        inArray(objectInstallation.objectDirectoryId, 
          db.select({ id: barcodeDirectory.objectDirectoryId })
            .from(barcodeDirectory)
            .where(eq(barcodeDirectory.barcode, barcode))
        )
      ),
      columns: { id: true, quantity: true },
    });

    if (!obj) {
      return {
        success: false,
        error: "Objet non trouvé dans cette installation",
        code: ErrorCodes.OBJECT_NOT_FOUND,
      };
    }

    const previousQuantity = obj.quantity;

    // Si newQuantity <= 0, supprimer l'objet
    if (newQuantity <= 0) {
      const removeResult = await removeObjectFromInstallation(obj.id);
      if (!removeResult.success) {
        return removeResult as ActionResponse<{ objectId: string; previousQuantity: number }>;
      }

      return {
        success: true,
        data: {
          objectId: obj.id,
          previousQuantity,
        },
      };
    }

    // Mettre à jour la quantité
    await db
      .update(objectInstallation)
      .set({
        quantity: newQuantity,
        updatedAt: new Date(),
      })
      .where(eq(objectInstallation.id, obj.id));

    return {
      success: true,
      data: {
        objectId: obj.id,
        previousQuantity,
      },
    };
  } catch (error) {
    console.error("[ObjectActions] Erreur updateObjectQuantityInInstallation:", error);
    return {
      success: false,
      error: "Erreur lors de la mise à jour de la quantité",
      code: ErrorCodes.INTERNAL_ERROR,
    };
  }
}

/**
 * Ajoute ou retire une quantité à un objet existant
 */
export async function adjustObjectQuantity(
  installationId: string,
  barcode: string,
  adjustment: number // Positif pour ajouter, négatif pour retirer
): Promise<ActionResponse<{ objectId: string; newQuantity: number }>> {
  try {
    const headers = await getAuthHeaders();
    const session = await auth.api.getSession({ headers });

    if (!session?.user) {
      return {
        success: false,
        error: "Non autorisé",
        code: ErrorCodes.UNAUTHORIZED,
      };
    }

    // Vérifier l'accès à l'installation
    const accessResult = await InstallationController.checkAccess(
      session.user.id,
      installationId
    );

    if (!accessResult.success || !accessResult.data?.hasAccess) {
      return {
        success: false,
        error: "Accès refusé",
        code: ErrorCodes.INSTALLATION_ACCESS_DENIED,
      };
    }

    // Trouver l'objet dans l'installation (jointure nécessaire pour barcode)
    const obj = await db.query.objectInstallation.findFirst({
      where: and(
        eq(objectInstallation.installationId, installationId),
        inArray(objectInstallation.objectDirectoryId, 
          db.select({ id: barcodeDirectory.objectDirectoryId })
            .from(barcodeDirectory)
            .where(eq(barcodeDirectory.barcode, barcode))
        )
      ),
      columns: { id: true, quantity: true },
    });

    if (!obj) {
      return {
        success: false,
        error: "Objet non trouvé dans cette installation",
        code: ErrorCodes.OBJECT_NOT_FOUND,
      };
    }

    const newQuantity = obj.quantity + adjustment;

    // Si la quantité passe à 0 ou en dessous, supprimer l'objet
    if (newQuantity <= 0) {
      const removeResult = await removeObjectFromInstallation(obj.id);
      if (!removeResult.success) {
        return removeResult as ActionResponse<{ objectId: string; newQuantity: number }>;
      }

      return {
        success: true,
        data: {
          objectId: obj.id,
          newQuantity: 0,
        },
      };
    }

    // Mettre à jour la quantité
    await db
      .update(objectInstallation)
      .set({
        quantity: newQuantity,
        updatedAt: new Date(),
      })
      .where(eq(objectInstallation.id, obj.id));

    return {
      success: true,
      data: {
        objectId: obj.id,
        newQuantity,
      },
    };
  } catch (error) {
    console.error("[ObjectActions] Erreur adjustObjectQuantity:", error);
    return {
      success: false,
      error: "Erreur lors de l'ajustement de la quantité",
      code: ErrorCodes.INTERNAL_ERROR,
    };
  }
}

/**
 * Ajuste la quantité d'un objet en utilisant son ID d'installation (objectInstallationId)
 * C'est plus direct que adjustObjectQuantity qui utilise le barcode
 */
export async function adjustObjectQuantityByInstallationId(
  objectInstallationId: string,
  adjustment: number // Positif pour ajouter, négatif pour retirer
): Promise<ActionResponse<{ newQuantity: number }>> {
  try {
    const headers = await getAuthHeaders();
    const session = await auth.api.getSession({ headers });

    if (!session?.user) {
      return {
        success: false,
        error: "Non autorisé",
        code: ErrorCodes.UNAUTHORIZED,
      };
    }

    // Vérifier que l'objet appartient à une installation accessible
    const obj = await db.query.objectInstallation.findFirst({
      where: eq(objectInstallation.id, objectInstallationId),
      columns: { id: true, quantity: true, installationId: true },
    });

    if (!obj) {
      return {
        success: false,
        error: "Objet non trouvé",
        code: ErrorCodes.OBJECT_NOT_FOUND,
      };
    }

    // Vérifier l'accès à l'installation
    const accessResult = await InstallationController.checkAccess(
      session.user.id,
      obj.installationId
    );

    if (!accessResult.success || !accessResult.data?.hasAccess) {
      return {
        success: false,
        error: "Accès refusé",
        code: ErrorCodes.INSTALLATION_ACCESS_DENIED,
      };
    }

    const newQuantity = obj.quantity + adjustment;

    // Si la quantité passe à 0 ou en dessous, supprimer l'objet
    if (newQuantity <= 0) {
      const removeResult = await removeObjectFromInstallation(objectInstallationId);
      if (!removeResult.success) {
        return removeResult as ActionResponse<{ newQuantity: number }>;
      }

      return {
        success: true,
        data: {
          newQuantity: 0,
        },
      };
    }

    // Mettre à jour la quantité
    await db
      .update(objectInstallation)
      .set({
        quantity: newQuantity,
        updatedAt: new Date(),
      })
      .where(eq(objectInstallation.id, objectInstallationId));

    return {
      success: true,
      data: {
        newQuantity,
      },
    };
  } catch (error) {
    console.error("[ObjectActions] Erreur adjustObjectQuantityByInstallationId:", error);
    return {
      success: false,
      error: "Erreur lors de l'ajustement de la quantité",
      code: ErrorCodes.INTERNAL_ERROR,
    };
  }
}

/**
 * Ajoute un objet à une installation avec tous les paramètres (pour le déplacement)
 * Version simple sans FormData, pour usage côté client
 */
export async function addObjectToInstallationSimple(
  installationId: string,
  objectDirectoryId: string,
  quantity: number,
  location?: string,
  expiryDate?: Date
): Promise<ActionResponse<{ objectInstallationId: string }>> {
  try {
    const headers = await getAuthHeaders();
    const session = await auth.api.getSession({ headers });

    if (!session?.user) {
      return {
        success: false,
        error: "Non autorisé",
        code: ErrorCodes.UNAUTHORIZED,
      };
    }

    // Appeler le contrôleur directement
    const result = await ObjectController.addObjectToInstallation(
      installationId,
      objectDirectoryId,
      quantity,
      session.user.id,
      location,
      expiryDate
    );

    return result;
  } catch (error) {
    console.error("[ObjectActions] Erreur addObjectToInstallationSimple:", error);
    return {
      success: false,
      error: "Erreur lors de l'ajout de l'objet",
      code: ErrorCodes.INTERNAL_ERROR,
    };
  }
}

// ============================================================================
// ACTIONS UNIFIÉES POUR LE FORMULAIRE DE SCAN (avec tous les champs)
// ============================================================================

// Action pour ajouter ou mettre à jour un objet scanné avec tous les détails
// Utilisée par ScanDetailsForm
// NOTE: Ces fonctions ne sont pas utilisées actuellement, commentées pour éviter les erreurs de compilation
// TODO: À implémenter correctement plus tard avec support des nouveaux champs dans le backend

// export async function addScannedObjectWithDetails(
//   prevState: ActionResponse<{ objectInstallationId: string; createdInDirectory: boolean }> | null,
//   formData: FormData
// ): Promise<ActionResponse<{ objectInstallationId: string; createdInDirectory: boolean }>> {
//   // TODO: Implémenter
// }

// // Action pour mettre à jour un objet existant avec tous les détails
// // Utilisée par ScanDetailsForm pour les objets déjà existants
// export async function updateScannedObjectWithDetails(
//   prevState: ActionResponse<{ objectInstallationId: string }> | null,
//   formData: FormData
// ): Promise<ActionResponse<{ objectInstallationId: string }>> {
//   // TODO: Implémenter
// }
