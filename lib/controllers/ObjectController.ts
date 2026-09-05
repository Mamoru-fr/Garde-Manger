import { ActionResponse, ErrorCodes } from "@/lib/types";

// ============================================================================
// IMPORTS DES SERVICES
// ============================================================================
import {
  createObjectDirectoryService,
  searchObjectsService,
  addBarcodeToObjectService,
  searchObjectByBarcodeService,
  addObjectToInstallationService,
  updateObjectInInstallationService,
  removeObjectFromInstallationService,
  getObjectsInInstallationService,
  getObjectDirectoryDetailsService,
  importObjectsService,
  exportObjectsService,
  deleteObjectFromDirectoryService,
  getExpiringObjectsService,
  getInstallationStatsService,
  getGlobalObjectService,
  getObjectInstancesService,
  fetchNutritionalDataService,
  createObjectTypeService,
  listObjectTypesService,
  createShopService,
  listShopsService,
} from "@/lib/services/ObjectService";

// ============================================================================
// CONTRÔLEUR POUR LA GESTION DES OBJETS
// ============================================================================

export class ObjectController {
  // Créer un nouvel objet dans l'annuaire
  static async createObjectDirectory(
    input: { name: string; description?: string; categoryId?: string; unitId?: string },
    userId: string
  ): Promise<ActionResponse<{ objectId: string }>> {
    try {
      // Validation supplémentaire
      if (!input.name || input.name.length > 100) {
        return {
          success: false,
          error: "Le nom de l'objet doit contenir entre 1 et 100 caractères",
          code: ErrorCodes.VALIDATION_ERROR,
        };
      }

      const result = await createObjectDirectoryService(input);
      return result;
    } catch (error) {
      return {
        success: false,
        error: "Erreur lors de la création de l'objet",
        code: ErrorCodes.INTERNAL_ERROR,
      };
    }
  }

  // Rechercher des objets dans l'annuaire
  static async searchObjects(input: {
    search?: string;
    categoryId?: string;
    limit?: number;
    offset?: number;
  }): Promise<ActionResponse<{
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
      const result = await searchObjectsService(
        input.search,
        input.categoryId,
        input.limit || 20,
        input.offset || 0
      );
      return result;
    } catch (error) {
      return {
        success: false,
        error: "Erreur lors de la recherche d'objets",
        code: ErrorCodes.INTERNAL_ERROR,
      };
    }
  }

  // Ajouter un code-barres à un objet
  static async addBarcodeToObject(
    objectDirectoryId: string,
    barcode: string
  ): Promise<ActionResponse<{ barcodeId: string }>> {
    try {
      // Validation supplémentaire
      if (!objectDirectoryId) {
        return {
          success: false,
          error: "L'ID de l'objet est requis",
          code: ErrorCodes.VALIDATION_ERROR,
        };
      }

      if (!barcode || barcode.length < 1) {
        return {
          success: false,
          error: "Le code-barres est requis",
          code: ErrorCodes.VALIDATION_ERROR,
        };
      }

      const result = await addBarcodeToObjectService(objectDirectoryId, barcode);
      return result;
    } catch (error) {
      return {
        success: false,
        error: "Erreur lors de l'ajout du code-barres",
        code: ErrorCodes.INTERNAL_ERROR,
      };
    }
  }

  // Rechercher un objet par code-barres
  static async searchObjectByBarcode(
    barcode: string
  ): Promise<ActionResponse<{
    object: {
      id: string;
      name: string;
      description: string | null;
    };
  } | null>> {
    try {
      if (!barcode) {
        return {
          success: false,
          error: "Le code-barres est requis",
          code: ErrorCodes.VALIDATION_ERROR,
        };
      }

      const result = await searchObjectByBarcodeService(barcode);
      return result;
    } catch (error) {
      return {
        success: false,
        error: "Erreur lors de la recherche par code-barres",
        code: ErrorCodes.INTERNAL_ERROR,
      };
    }
  }

  // Ajouter un objet à une installation
  static async addObjectToInstallation(
    installationId: string,
    objectDirectoryId: string,
    quantity: number,
    userId: string,
    location?: string,
    expiryDate?: Date
  ): Promise<ActionResponse<{ objectInstallationId: string }>> {
    try {
      // Validation supplémentaire
      if (!installationId) {
        return {
          success: false,
          error: "L'ID de l'installation est requis",
          code: ErrorCodes.VALIDATION_ERROR,
        };
      }

      if (!objectDirectoryId) {
        return {
          success: false,
          error: "L'ID de l'objet est requis",
          code: ErrorCodes.VALIDATION_ERROR,
        };
      }

      if (!quantity || quantity <= 0) {
        return {
          success: false,
          error: "La quantité doit être supérieure à 0",
          code: ErrorCodes.VALIDATION_ERROR,
        };
      }

      const result = await addObjectToInstallationService(
        installationId,
        objectDirectoryId,
        quantity,
        userId,
        location,
        expiryDate
      );
      return result;
    } catch (error) {
      return {
        success: false,
        error: "Erreur lors de l'ajout de l'objet à l'installation",
        code: ErrorCodes.INTERNAL_ERROR,
      };
    }
  }

  // Mettre à jour un objet dans une installation
  static async updateObjectInInstallation(
    objectInstallationId: string,
    userId: string,
    input: { quantity?: number; location?: string; expiryDate?: Date }
  ): Promise<ActionResponse<void>> {
    try {
      // Validation supplémentaire
      if (!objectInstallationId) {
        return {
          success: false,
          error: "L'ID de l'objet dans l'installation est requis",
          code: ErrorCodes.VALIDATION_ERROR,
        };
      }

      if (input.quantity !== undefined && (input.quantity <= 0)) {
        return {
          success: false,
          error: "La quantité doit être supérieure à 0",
          code: ErrorCodes.VALIDATION_ERROR,
        };
      }

      const result = await updateObjectInInstallationService(
        objectInstallationId,
        input,
        userId
      );
      return result;
    } catch (error) {
      return {
        success: false,
        error: "Erreur lors de la mise à jour de l'objet",
        code: ErrorCodes.INTERNAL_ERROR,
      };
    }
  }

  // Supprimer un objet d'une installation
  static async removeObjectFromInstallation(
    objectInstallationId: string,
    userId: string
  ): Promise<ActionResponse<void>> {
    try {
      // Validation supplémentaire
      if (!objectInstallationId) {
        return {
          success: false,
          error: "L'ID de l'objet dans l'installation est requis",
          code: ErrorCodes.VALIDATION_ERROR,
        };
      }

      const result = await removeObjectFromInstallationService(
        objectInstallationId,
        userId
      );
      return result;
    } catch (error) {
      return {
        success: false,
        error: "Erreur lors de la suppression de l'objet",
        code: ErrorCodes.INTERNAL_ERROR,
      };
    }
  }

  // Récupérer tous les objets d'une installation
  static async getObjectsInInstallation(
    installationId: string,
    userId: string
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
      // Validation supplémentaire
      if (!installationId) {
        return {
          success: false,
          error: "L'ID de l'installation est requis",
          code: ErrorCodes.VALIDATION_ERROR,
        };
      }

      const result = await getObjectsInInstallationService(installationId, userId);
      return result;
    } catch (error) {
      return {
        success: false,
        error: "Erreur lors de la récupération des objets",
        code: ErrorCodes.INTERNAL_ERROR,
      };
    }
  }

  // Obtenir les détails d'un objet dans l'annuaire
  static async getObjectDirectoryDetails(
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
      if (!objectId) {
        return {
          success: false,
          error: "L'ID de l'objet est requis",
          code: ErrorCodes.VALIDATION_ERROR,
        };
      }

      const result = await getObjectDirectoryDetailsService(objectId);
      return result;
    } catch (error) {
      return {
        success: false,
        error: "Erreur lors de la récupération des détails de l'objet",
        code: ErrorCodes.INTERNAL_ERROR,
      };
    }
  }

  // Importer des objets
  static async importObjects(
    objects: Array<{
      name: string;
      description?: string;
      categoryId?: string;
      unitId?: string;
      quantity: number;
      barcode?: string;
      installationId: string;
    }>,
    userId: string
  ): Promise<ActionResponse<{ importedCount: number; failedCount: number }>> {
    try {
      if (!objects || !Array.isArray(objects) || objects.length === 0) {
        return {
          success: false,
          error: "La liste des objets à importer est vide ou invalide",
          code: ErrorCodes.VALIDATION_ERROR,
        };
      }

      const result = await importObjectsService(objects, userId);
      return result;
    } catch (error) {
      return {
        success: false,
        error: "Erreur lors de l'import des objets",
        code: ErrorCodes.INTERNAL_ERROR,
      };
    }
  }

  // Exporter des objets
  static async exportObjects(
    installationId: string,
    userId: string
  ): Promise<ActionResponse<{ exportData: string }>> {
    try {
      if (!installationId) {
        return {
          success: false,
          error: "L'ID de l'installation est requis",
          code: ErrorCodes.VALIDATION_ERROR,
        };
      }

      const result = await exportObjectsService(installationId, userId);
      return result;
    } catch (error) {
      return {
        success: false,
        error: "Erreur lors de l'export des objets",
        code: ErrorCodes.INTERNAL_ERROR,
      };
    }
  }

  // Supprimer un objet de l'annuaire
  static async deleteObjectFromDirectory(
    objectId: string
  ): Promise<ActionResponse<void>> {
    try {
      if (!objectId) {
        return {
          success: false,
          error: "L'ID de l'objet est requis",
          code: ErrorCodes.VALIDATION_ERROR,
        };
      }

      const result = await deleteObjectFromDirectoryService(objectId);
      return result;
    } catch (error) {
      return {
        success: false,
        error: "Erreur lors de la suppression de l'objet",
        code: ErrorCodes.INTERNAL_ERROR,
      };
    }
  }

  // Obtenir les objets expirés prochainement
  static async getExpiringObjects(
    installationId: string,
    userId: string,
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
      if (!installationId) {
        return {
          success: false,
          error: "L'ID de l'installation est requis",
          code: ErrorCodes.VALIDATION_ERROR,
        };
      }

      const result = await getExpiringObjectsService(
        installationId,
        userId,
        days
      );
      return result;
    } catch (error) {
      return {
        success: false,
        error: "Erreur lors de la récupération des objets expirés",
        code: ErrorCodes.INTERNAL_ERROR,
      };
    }
  }

  // Obtenir les statistiques d'une installation
  static async getInstallationStats(
    installationId: string,
    userId: string
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
      if (!installationId) {
        return {
          success: false,
          error: "L'ID de l'installation est requis",
          code: ErrorCodes.VALIDATION_ERROR,
        };
      }

      const result = await getInstallationStatsService(installationId, userId);
      return result;
    } catch (error) {
      return {
        success: false,
        error: "Erreur lors de la récupération des statistiques",
        code: ErrorCodes.INTERNAL_ERROR,
      };
    }
  }

  // Récupérer un objet global avec toutes ses instances
  static async getGlobalObject(
    objectDirectoryId: string,
    userId: string
  ): Promise<ActionResponse<any>> {
    try {
      const result = await getGlobalObjectService(objectDirectoryId, userId);
      return result;
    } catch (error) {
      return {
        success: false,
        error: "Erreur lors de la récupération de l'objet global",
        code: ErrorCodes.INTERNAL_ERROR,
      };
    }
  }

  // Récupérer les instances d'un objet global dans une installation
  static async getObjectInstances(
    objectDirectoryId: string,
    installationId: string
  ): Promise<ActionResponse<any>> {
    try {
      const result = await getObjectInstancesService(objectDirectoryId, installationId);
      return result;
    } catch (error) {
      return {
        success: false,
        error: "Erreur lors de la récupération des instances de l'objet",
        code: ErrorCodes.INTERNAL_ERROR,
      };
    }
  }

  // Récupérer les données nutritionnelles depuis OpenFoodFacts
  static async fetchNutritionalData(
    barcode: string
  ): Promise<ActionResponse<any>> {
    try {
      const result = await fetchNutritionalDataService(barcode);
      return result;
    } catch (error) {
      return {
        success: false,
        error: "Erreur lors de la récupération des données nutritionnelles",
        code: ErrorCodes.OPEN_FOOD_FACTS_ERROR,
      };
    }
  }

  // Créer un type d'objet
  static async createObjectType(
    name: string,
    description?: string,
    icon?: string,
    parentTypeId?: string
  ): Promise<ActionResponse<any>> {
    try {
      // Validation
      if (!name || name.trim() === "") {
        return {
          success: false,
          error: "Le nom du type est requis",
          code: ErrorCodes.VALIDATION_ERROR,
        };
      }

      const result = await createObjectTypeService(name, description, icon, parentTypeId);
      return result;
    } catch (error) {
      return {
        success: false,
        error: "Erreur lors de la création du type d'objet",
        code: ErrorCodes.INTERNAL_ERROR,
      };
    }
  }

  // Lister tous les types d'objets
  static async listObjectTypes(): Promise<ActionResponse<any>> {
    try {
      const result = await listObjectTypesService();
      return result;
    } catch (error) {
      return {
        success: false,
        error: "Erreur lors de la récupération des types d'objets",
        code: ErrorCodes.INTERNAL_ERROR,
      };
    }
  }

  // Créer un magasin
  static async createShop(
    name: string,
    address?: string,
    city?: string
  ): Promise<ActionResponse<any>> {
    try {
      // Validation
      if (!name || name.trim() === "") {
        return {
          success: false,
          error: "Le nom du magasin est requis",
          code: ErrorCodes.VALIDATION_ERROR,
        };
      }

      const result = await createShopService(name, address, city);
      return result;
    } catch (error) {
      return {
        success: false,
        error: "Erreur lors de la création du magasin",
        code: ErrorCodes.INTERNAL_ERROR,
      };
    }
  }

  // Lister tous les magasins
  static async listShops(): Promise<ActionResponse<any>> {
    try {
      const result = await listShopsService();
      return result;
    } catch (error) {
      return {
        success: false,
        error: "Erreur lors de la récupération des magasins",
        code: ErrorCodes.INTERNAL_ERROR,
      };
    }
  }
}
