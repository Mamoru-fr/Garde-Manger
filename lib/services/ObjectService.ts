import { db } from "@/lib/db/drizzle";
import {
  objectDirectory,
  barcodeDirectory,
  objectInstallation,
  categories,
  units,
  users,
  objectHistory,
  installations,
  userInstallations,
  objectTypes,
  shops,
} from "@/lib/db/schema";
import { ActionResponse, ErrorCodes, GlobalObjectWithInstances, ObjectInstance, NutritionalData } from "@/lib/types";
import { eq, and, like, or, count, desc, asc, gt, lt, lte, isNotNull } from "drizzle-orm";
import { randomUUID } from "crypto";

// ============================================================================
// SERVICES POUR LA GESTION DES OBJETS
// ============================================================================


// SERVICES POUR LA GESTION DES OBJETS Dans L'ANNUAIRE
// ============================================================================

// Créer un nouvel objet dans l'annuaire central
export async function createObjectDirectoryService(
  input: { name: string; description?: string; categoryId?: string; unitId?: string }
): Promise<ActionResponse<{ objectId: string }>> {
  try {
    // Vérifier si un objet avec ce nom existe déjà
    const existingObject = await db
      .select()
      .from(objectDirectory)
      .where(eq(objectDirectory.name, input.name))
      .limit(1);

    if (existingObject.length > 0) {
      return {
        success: false,
        error: "Un objet avec ce nom existe déjà",
        code: ErrorCodes.OBJECT_ALREADY_EXISTS,
      };
    }

    // Créer le nouvel objet
    const newObject = await db
      .insert(objectDirectory)
      .values({
        id: randomUUID(),
        name: input.name,
        description: input.description,
        categoryId: input.categoryId,
        unitId: input.unitId,
        defaultQuantity: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return {
      success: true,
      data: { objectId: newObject[0].id },
    };
  } catch (error) {
    console.error("[ObjectService] Erreur lors de la création de l'objet:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de la création de l'objet",
      code: ErrorCodes.INTERNAL_ERROR,
      details: error,
    };
  }
}

// Rechercher des objets dans l'annuaire
export async function searchObjectsService(
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
    // Appliquer les filtres
    const whereConditions = [];
    
    if (search) {
      whereConditions.push(
        or(
          like(objectDirectory.name, `%${search}%`),
          like(objectDirectory.description, `%${search}%`)
        )
      );
    }

    if (categoryId) {
      whereConditions.push(eq(objectDirectory.categoryId, categoryId));
    }

    // Construire la requête de base
    let query: any = db
      .select({
        id: objectDirectory.id,
        name: objectDirectory.name,
        description: objectDirectory.description,
        categoryId: objectDirectory.categoryId,
        unitId: objectDirectory.unitId,
      })
      .from(objectDirectory);

    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions));
    }

    // Compter le total
    const countResult = await db
      .select({ count: count() })
      .from(objectDirectory)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);
    const total = countResult[0]?.count || 0;

    // Récupérer les objets avec paginations
    const objectsResult = await query
      .limit(limit)
      .offset(offset)
      .orderBy(asc(objectDirectory.name));

    // Récupérer les noms des catégories et unités
    const objectsWithDetails = await Promise.all(
      (objectsResult as any[]).map(async (obj: any) => {
        let category: string | null = null;
        if (obj.categoryId) {
          const categoryData = await db
            .select({ name: categories.name })
            .from(categories)
            .where(eq(categories.id, obj.categoryId))
            .limit(1);
          category = categoryData[0]?.name || null;
        }

        let unit: string | null = null;
        if (obj.unitId) {
          const unitData = await db
            .select({ name: units.name })
            .from(units)
            .where(eq(units.id, obj.unitId))
            .limit(1);
          unit = unitData[0]?.name || null;
        }

        return {
          id: obj.id,
          name: obj.name,
          description: obj.description,
          category,
          unit,
        };
      })
    );

    return {
      success: true,
      data: {
        objects: objectsWithDetails,
        total,
      },
    };
  } catch (error) {
    console.error("[ObjectService] Erreur lors de la recherche d'objets:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de la recherche d'objets",
      code: ErrorCodes.INTERNAL_ERROR,
      details: error,
    };
  }
}

// ============================================================================
// SERVICES POUR LES CODES-BARRES
// ============================================================================

// Ajouter un code-barres à un objet
export async function addBarcodeToObjectService(
  objectDirectoryId: string,
  barcode: string
): Promise<ActionResponse<{ barcodeId: string }>> {
  try {
    // Vérifier si l'objet existe
    const existingObject = await db
      .select()
      .from(objectDirectory)
      .where(eq(objectDirectory.id, objectDirectoryId))
      .limit(1);

    if (!existingObject.length) {
      return {
        success: false,
        error: "Objet non trouvé",
        code: ErrorCodes.OBJECT_NOT_FOUND,
      };
    }

    // Vérifier si ce code-barres existe déjà
    const existingBarcode = await db
      .select()
      .from(barcodeDirectory)
      .where(eq(barcodeDirectory.barcode, barcode))
      .limit(1);

    if (existingBarcode.length > 0) {
      return {
        success: false,
        error: "Ce code-barres est déjà associé à un autre objet",
        code: ErrorCodes.BARCODE_ALREADY_EXISTS,
      };
    }

    // Créer le nouveau code-barres
    const newBarcode = await db
      .insert(barcodeDirectory)
      .values({
        id: randomUUID(),
        objectDirectoryId,
        barcode,
        barcodeType: "EAN13",
        createdAt: new Date(),
      })
      .returning();

    return {
      success: true,
      data: { barcodeId: newBarcode[0].id },
    };
  } catch (error) {
    console.error("[ObjectService] Erreur lors de l'ajout du code-barres:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de l'ajout du code-barres",
      code: ErrorCodes.INTERNAL_ERROR,
      details: error,
    };
  }
}

// Rechercher un objet par code-barres
export async function searchObjectByBarcodeService(
  barcode: string
): Promise<ActionResponse<{
  object: {
    id: string;
    name: string;
    description: string | null;
  };
} | null>> {
  try {
    // Trouver l'objet par code-barres
    const barcodeData = await db
      .select()
      .from(barcodeDirectory)
      .where(eq(barcodeDirectory.barcode, barcode))
      .limit(1);

    if (!barcodeData.length) {
      return {
        success: true,
        data: null,
      };
    }

    // Obtenir l'objet
    const objectData = await db
      .select()
      .from(objectDirectory)
      .where(eq(objectDirectory.id, barcodeData[0].objectDirectoryId))
      .limit(1);

    if (!objectData.length) {
      return {
        success: true,
        data: null,
      };
    }

    return {
      success: true,
      data: {
        object: {
          id: objectData[0].id,
          name: objectData[0].name,
          description: objectData[0].description,
        },
      },
    };
  } catch (error) {
    console.error("[ObjectService] Erreur lors de la recherche par code-barres:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de la recherche par code-barres",
      code: ErrorCodes.INTERNAL_ERROR,
      details: error,
    };
  }
}

// ============================================================================
// SERVICES POUR LES OBJETS DANS LES INSTALLATIONS
// ============================================================================

// Ajouter un objet à une installation
export async function addObjectToInstallationService(
  installationId: string,
  objectDirectoryId: string,
  quantity: number,
  userId: string,
  location?: string,
  expiryDate?: Date
): Promise<ActionResponse<{ objectInstallationId: string }>> {
  try {
    // Vérifier si l'objet existe dans l'annuaire
    const existingObject = await db
      .select()
      .from(objectDirectory)
      .where(eq(objectDirectory.id, objectDirectoryId))
      .limit(1);

    if (!existingObject.length) {
      return {
        success: false,
        error: "Objet non trouvé dans l'annuaire",
        code: ErrorCodes.OBJECT_NOT_FOUND,
      };
    }

    // Vérifier si l'objet existe déjà dans cette installation
    const existingObjectInstallation = await db
      .select()
      .from(objectInstallation)
      .where(and(
        eq(objectInstallation.installationId, installationId),
        eq(objectInstallation.objectDirectoryId, objectDirectoryId)
      ))
      .limit(1);

    let objectInstallationId: string;

    if (existingObjectInstallation.length > 0) {
      // Mettre à jour la quantité existante
      const updatedQuantity = existingObjectInstallation[0].quantity + quantity;
      const updated = await db
        .update(objectInstallation)
        .set({
          quantity: updatedQuantity,
          location: location || existingObjectInstallation[0].location,
          expiryDate: expiryDate || existingObjectInstallation[0].expiryDate,
          updatedAt: new Date(),
        })
        .where(eq(objectInstallation.id, existingObjectInstallation[0].id))
        .returning();
      
      objectInstallationId = updated[0].id;
    } else {
      // Créer un nouvel objet dans l'installation
      const newObjectInstallation = await db
        .insert(objectInstallation)
        .values({
          id: randomUUID(),
          installationId,
          objectDirectoryId,
          quantity,
          location,
          expiryDate,
          addedDate: new Date(),
          createdBy: userId,
          updatedAt: new Date(),
        })
        .returning();
      
      objectInstallationId = newObjectInstallation[0].id;
    }

    return {
      success: true,
      data: { objectInstallationId },
    };
  } catch (error) {
    console.error("[ObjectService] Erreur lors de l'ajout de l'objet à l'installation:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de l'ajout de l'objet à l'installation",
      code: ErrorCodes.INTERNAL_ERROR,
      details: error,
    };
  }
}

// Mettre à jour un objet dans une installation
export async function updateObjectInInstallationService(
  objectInstallationId: string,
  input: { quantity?: number; location?: string; expiryDate?: Date },
  userId: string
): Promise<ActionResponse<void>> {
  try {
    // Récupérer les anciennes valeurs pour l'historique
    const oldObject = await db
      .select()
      .from(objectInstallation)
      .where(eq(objectInstallation.id, objectInstallationId))
      .limit(1);

    if (!oldObject.length) {
      return {
        success: false,
        error: "Objet non trouvé dans l'installation",
        code: ErrorCodes.OBJECT_NOT_FOUND,
      };
    }

    // Mettre à jour l'objet
    const updates: Record<string, any> = { updatedAt: new Date() };
    
    if (input.quantity !== undefined) {
      updates.quantity = input.quantity;
    }
    if (input.location !== undefined) {
      updates.location = input.location;
    }
    if (input.expiryDate !== undefined) {
      updates.expiryDate = input.expiryDate;
    }

    await db
      .update(objectInstallation)
      .set(updates)
      .where(eq(objectInstallation.id, objectInstallationId));

    return {
      success: true,
    };
  } catch (error) {
    console.error("[ObjectService] Erreur lors de la mise à jour de l'objet:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de la mise à jour de l'objet",
      code: ErrorCodes.INTERNAL_ERROR,
      details: error,
    };
  }
}

// Supprimer un objet d'une installation
export async function removeObjectFromInstallationService(
  objectInstallationId: string,
  userId: string
): Promise<ActionResponse<void>> {
  try {
    // Vérifier que l'objet existe
    const oldObject = await db
      .select()
      .from(objectInstallation)
      .where(eq(objectInstallation.id, objectInstallationId))
      .limit(1);

    if (!oldObject.length) {
      return {
        success: false,
        error: "Objet non trouvé dans l'installation",
        code: ErrorCodes.OBJECT_NOT_FOUND,
      };
    }

    // Supprimer l'objet
    await db
      .delete(objectInstallation)
      .where(eq(objectInstallation.id, objectInstallationId));

    return {
      success: true,
    };
  } catch (error) {
    console.error("[ObjectService] Erreur lors de la suppression de l'objet:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de la suppression de l'objet",
      code: ErrorCodes.INTERNAL_ERROR,
      details: error,
    };
  }
}

// Récupérer tous les objets d'une installation
export async function getObjectsInInstallationService(
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
    // Vérifier que l'utilisateur a accès à cette installation
    const accessCheck = await db
      .select()
      .from(userInstallations)
      .where(and(
        eq(userInstallations.userId, userId),
        eq(userInstallations.installationId, installationId)
      ))
      .limit(1);

    if (!accessCheck.length) {
      return {
        success: false,
        error: "Accès refusé. Tu n'as pas accès à cette installation.",
        code: ErrorCodes.INSTALLATION_ACCESS_DENIED,
      };
    }

    // Récupérer tous les objets de l'installation avec leurs détails
    const objectsResult = await db
      .select({
        id: objectInstallation.id,
        objectDirectoryId: objectInstallation.objectDirectoryId,
        quantity: objectInstallation.quantity,
        location: objectInstallation.location,
        expiryDate: objectInstallation.expiryDate,
        objectName: objectDirectory.name,
        objectDescription: objectDirectory.description,
        categoryId: objectDirectory.categoryId,
        unitId: objectDirectory.unitId,
      })
      .from(objectInstallation)
      .leftJoin(
        objectDirectory,
        eq(objectDirectory.id, objectInstallation.objectDirectoryId)
      )
      .where(eq(objectInstallation.installationId, installationId))
      .orderBy(desc(objectInstallation.addedDate));

    // Récupérer les catégories et unités pour chaque objet
    const objectsWithDetails = await Promise.all(
      objectsResult.map(async (obj) => {
        let category: string | null = null;
        if (obj.categoryId) {
          const categoryData = await db
            .select({ name: categories.name })
            .from(categories)
            .where(eq(categories.id, obj.categoryId))
            .limit(1);
          category = categoryData[0]?.name || null;
        }

        let unit: string | null = null;
        if (obj.unitId) {
          const unitData = await db
            .select({ name: units.name })
            .from(units)
            .where(eq(units.id, obj.unitId))
            .limit(1);
          unit = unitData[0]?.name || null;
        }

        // Trouver le code-barres principal
        let barcode: string | null = null;
        const barcodeData = await db
          .select({ barcode: barcodeDirectory.barcode })
          .from(barcodeDirectory)
          .where(eq(barcodeDirectory.objectDirectoryId, obj.objectDirectoryId))
          .limit(1);
        if (barcodeData.length > 0) {
          barcode = barcodeData[0].barcode;
        }

        return {
          id: obj.id,
          objectDirectoryId: obj.objectDirectoryId,
          name: obj.objectName || "",
          category,
          unit,
          quantity: obj.quantity,
          location: obj.location,
          expiryDate: obj.expiryDate,
          barcode,
        };
      })
    );

    return {
      success: true,
      data: {
        objects: objectsWithDetails,
      },
    };
  } catch (error) {
    console.error("[ObjectService] Erreur lors de la récupération des objets:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de la récupération des objets",
      code: ErrorCodes.INTERNAL_ERROR,
      details: error,
    };
  }
}

// ============================================================================
// SERVICES SUPPLÉMENTAIRES
// ============================================================================

// Obtenir les détails d'un objet dans l'annuaire
export async function getObjectDirectoryDetailsService(
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
    // Obtenir l'objet
    const objectResult = await db
      .select()
      .from(objectDirectory)
      .where(eq(objectDirectory.id, objectId))
      .limit(1);

    if (!objectResult.length) {
      return {
        success: false,
        error: "Objet non trouvé",
        code: ErrorCodes.OBJECT_NOT_FOUND,
      };
    }

    const obj = objectResult[0];

    // Obtenir la catégorie
    let category = null;
    if (obj.categoryId) {
      const categoryData = await db
        .select()
        .from(categories)
        .where(eq(categories.id, obj.categoryId))
        .limit(1);
      if (categoryData.length > 0) {
        category = {
          id: categoryData[0].id,
          name: categoryData[0].name,
          type: categoryData[0].type,
        };
      }
    }

    // Obtenir l'unité
    let unit = null;
    if (obj.unitId) {
      const unitData = await db
        .select()
        .from(units)
        .where(eq(units.id, obj.unitId))
        .limit(1);
      if (unitData.length > 0) {
        unit = {
          id: unitData[0].id,
          name: unitData[0].name,
          symbol: unitData[0].symbol,
          type: unitData[0].type,
        };
      }
    }

    // Obtenir les codes-barres
    const barcodes = await db
      .select()
      .from(barcodeDirectory)
      .where(eq(barcodeDirectory.objectDirectoryId, objectId));

    return {
      success: true,
      data: {
        object: {
          id: obj.id,
          name: obj.name,
          description: obj.description,
          category,
          unit,
          defaultQuantity: obj.defaultQuantity || 1,
          barcodes: barcodes.map(b => ({
            id: b.id,
            barcode: b.barcode,
            barcodeType: b.barcodeType || "EAN13",
          })),
          createdAt: obj.createdAt || new Date(),
          updatedAt: obj.updatedAt || new Date(),
        },
      },
    };
  } catch (error) {
    console.error("[ObjectService] Erreur lors de la récupération des détails:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de la récupération des détails",
      code: ErrorCodes.INTERNAL_ERROR,
      details: error,
    };
  }
}

// Importer des objets
export async function importObjectsService(
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
  let importedCount = 0;
  let failedCount = 0;

  try {
    for (const obj of objects) {
      try {
        // Vérifier ou créer l'objet dans l'annuaire
        let objectId: string;

        // Rechercher l'objet existant par nom
        const existingObject = await db
          .select()
          .from(objectDirectory)
          .where(and(
            eq(objectDirectory.name, obj.name),
            obj.categoryId ? eq(objectDirectory.categoryId, obj.categoryId) : undefined
          ))
          .limit(1);

        if (existingObject.length > 0) {
          objectId = existingObject[0].id;
        } else {
          // Créer un nouvel objet
          const newObject = await db
            .insert(objectDirectory)
            .values({
              id: randomUUID(),
              name: obj.name,
              description: obj.description,
              categoryId: obj.categoryId,
              unitId: obj.unitId,
              defaultQuantity: 1,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            .returning();
          objectId = newObject[0].id;
        }

        // Si un code-barres est fourni, l'associer
        if (obj.barcode) {
          const existingBarcode = await db
            .select()
            .from(barcodeDirectory)
            .where(eq(barcodeDirectory.barcode, obj.barcode))
            .limit(1);

          if (existingBarcode.length === 0) {
            await db.insert(barcodeDirectory).values({
              id: randomUUID(),
              objectDirectoryId: objectId,
              barcode: obj.barcode,
              barcodeType: "EAN13",
              createdAt: new Date(),
            });
          }
        }

        // Ajouter l'objet à l'installation
        await addObjectToInstallationService(
          obj.installationId,
          objectId,
          obj.quantity,
          userId
        );

        importedCount++;
      } catch (error) {
        console.error("[ObjectService] Erreur lors de l'import d'un objet:", error);
        failedCount++;
      }
    }

    return {
      success: true,
      data: { importedCount, failedCount },
    };
  } catch (error) {
    console.error("[ObjectService] Erreur lors de l'import des objets:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de l'import des objets",
      code: ErrorCodes.INTERNAL_ERROR,
      details: error,
    };
  }
}

// Exporter des objets
export async function exportObjectsService(
  installationId: string,
  userId: string
): Promise<ActionResponse<{ exportData: string }>> {
  try {
    // Vérifier que l'utilisateur a accès à cette installation
    const accessCheck = await db
      .select()
      .from(userInstallations)
      .where(and(
        eq(userInstallations.userId, userId),
        eq(userInstallations.installationId, installationId)
      ))
      .limit(1);

    if (!accessCheck.length) {
      return {
        success: false,
        error: "Accès refusé. Tu n'as pas accès à cette installation.",
        code: ErrorCodes.INSTALLATION_ACCESS_DENIED,
      };
    }

    // Récupérer tous les objets de l'installation
    const objectsResult = await db
      .select({
        name: objectDirectory.name,
        description: objectDirectory.description,
        quantity: objectInstallation.quantity,
        location: objectInstallation.location,
        expiryDate: objectInstallation.expiryDate,
      })
      .from(objectInstallation)
      .leftJoin(
        objectDirectory,
        eq(objectDirectory.id, objectInstallation.objectDirectoryId)
      )
      .where(eq(objectInstallation.installationId, installationId));

    // Formater les données pour l'export
    const exportData = objectsResult.map((obj) => ({
      name: obj.name,
      description: obj.description,
      quantity: obj.quantity,
      location: obj.location,
      expiryDate: obj.expiryDate?.toISOString().split('T')[0] || null,
    }));

    // Convertir en JSON
    const exportDataString = JSON.stringify(exportData, null, 2);

    return {
      success: true,
      data: { exportData: exportDataString },
    };
  } catch (error) {
    console.error("[ObjectService] Erreur lors de l'export des objets:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de l'export des objets",
      code: ErrorCodes.INTERNAL_ERROR,
      details: error,
    };
  }
}

// Supprimer un objet de l'annuaire
export async function deleteObjectFromDirectoryService(
  objectId: string
): Promise<ActionResponse<void>> {
  try {
    // Supprimer tous les codes-barres associés
    await db
      .delete(barcodeDirectory)
      .where(eq(barcodeDirectory.objectDirectoryId, objectId));

    // Supprimer tous les objets dans les installations
    await db
      .delete(objectInstallation)
      .where(eq(objectInstallation.objectDirectoryId, objectId));

    // Supprimer l'objet de l'annuaire
    await db
      .delete(objectDirectory)
      .where(eq(objectDirectory.id, objectId));

    return {
      success: true,
    };
  } catch (error) {
    console.error("[ObjectService] Erreur lors de la suppression de l'objet:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de la suppression de l'objet",
      code: ErrorCodes.INTERNAL_ERROR,
      details: error,
    };
  }
}

// Obtenir les objets expirés prochainement
export async function getExpiringObjectsService(
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
    // Vérifier que l'utilisateur a accès à cette installation
    const accessCheck = await db
      .select()
      .from(userInstallations)
      .where(and(
        eq(userInstallations.userId, userId),
        eq(userInstallations.installationId, installationId)
      ))
      .limit(1);

    if (!accessCheck.length) {
      return {
        success: false,
        error: "Accès refusé. Tu n'as pas accès à cette installation.",
        code: ErrorCodes.INSTALLATION_ACCESS_DENIED,
      };
    }

    // Calculer les dates limites
    const today = new Date();
    const limitDate = new Date(today);
    limitDate.setDate(limitDate.getDate() + days);

    // Récupérer les objets qui expireront dans les X jours
    const objectsResult = await db
      .select({
        id: objectInstallation.id,
        objectDirectoryId: objectInstallation.objectDirectoryId,
        quantity: objectInstallation.quantity,
        location: objectInstallation.location,
        expiryDate: objectInstallation.expiryDate,
        name: objectDirectory.name,
      })
      .from(objectInstallation)
      .leftJoin(
        objectDirectory,
        eq(objectDirectory.id, objectInstallation.objectDirectoryId)
      )
      .where(and(
        eq(objectInstallation.installationId, installationId),
        lte(objectInstallation.expiryDate, limitDate),
        gt(objectInstallation.expiryDate, today),
      ))
      .orderBy(asc(objectInstallation.expiryDate));

    // Calculer le nombre de jours restants pour chaque objet
    const objectsWithDays = objectsResult.map((obj) => {
      if (!obj.expiryDate) {
        return null;
      }

      const expiryDate = new Date(obj.expiryDate);
      const diffTime = expiryDate.getTime() - today.getTime();
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (daysLeft >= 0) {
        return {
          id: obj.id,
          name: obj.name,
          quantity: obj.quantity,
          location: obj.location,
          expiryDate: expiryDate,
          daysLeft,
        };
      }
      return null;
    }).filter(Boolean) as Array<{
      id: string;
      name: string;
      quantity: number;
      location: string | null;
      expiryDate: Date;
      daysLeft: number;
    }>;

    return {
      success: true,
      data: {
        objects: objectsWithDays,
      },
    };
  } catch (error) {
    console.error("[ObjectService] Erreur lors de la récupération des objets expirés:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de la récupération des objets expirés",
      code: ErrorCodes.INTERNAL_ERROR,
      details: error,
    };
  }
}

// Obtenir les statistiques d'une installation
export async function getInstallationStatsService(
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
    // Vérifier que l'utilisateur a accès à cette installation
    const accessCheck = await db
      .select()
      .from(userInstallations)
      .where(and(
        eq(userInstallations.userId, userId),
        eq(userInstallations.installationId, installationId)
      ))
      .limit(1);

    if (!accessCheck.length) {
      return {
        success: false,
        error: "Accès refusé. Tu n'as pas accès à cette installation.",
        code: ErrorCodes.INSTALLATION_ACCESS_DENIED,
      };
    }

    // Compter le nombre total d'objets
    const totalObjectsResult = await db
      .select({ count: count() })
      .from(objectInstallation)
      .where(eq(objectInstallation.installationId, installationId));
    const totalObjects = totalObjectsResult[0]?.count || 0;

    // Calculer la quantité totale
    const quantityItems = await db
      .select({ quantity: objectInstallation.quantity })
      .from(objectInstallation)
      .where(eq(objectInstallation.installationId, installationId));
    const totalQuantity = quantityItems.reduce((sum, item) => sum + item.quantity, 0);

    // Compter les objets par catégorie
    const objectsByCategoryResult = await db
      .select({
        category: categories.name,
        count: count(),
      })
      .from(objectInstallation)
      .leftJoin(
        objectDirectory,
        eq(objectDirectory.id, objectInstallation.objectDirectoryId)
      )
      .leftJoin(
        categories,
        eq(categories.id, objectDirectory.categoryId)
      )
      .where(eq(objectInstallation.installationId, installationId))
      .groupBy(categories.name);

    const objectsByCategory = objectsByCategoryResult.map((item) => ({
      category: item.category || "Non catégorisé",
      count: item.count,
    }));

    // Compter les objets par statut d'expiration
    const today = new Date();
    const expiringDate = new Date(today);
    expiringDate.setDate(expiringDate.getDate() + 7);

    const expiringSoonResult = await db
      .select({ count: count() })
      .from(objectInstallation)
      .where(and(
        eq(objectInstallation.installationId, installationId),
        gt(objectInstallation.expiryDate, today),
        lte(objectInstallation.expiryDate, expiringDate),
      ));
    const expiringSoon = expiringSoonResult[0]?.count || 0;

    const expiredResult = await db
      .select({ count: count() })
      .from(objectInstallation)
      .where(and(
        eq(objectInstallation.installationId, installationId),
        lt(objectInstallation.expiryDate, today),
      ));
    const expired = expiredResult[0]?.count || 0;

    const valid = totalObjects - expiringSoon - expired;

    return {
      success: true,
      data: {
        stats: {
          totalObjects,
          totalQuantity,
          objectsByCategory,
          expiringSoon,
          expired,
          valid,
        },
      },
    };
  } catch (error) {
    console.error("[ObjectService] Erreur lors de la récupération des statistiques:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de la récupération des statistiques",
      code: ErrorCodes.INTERNAL_ERROR,
      details: error,
    };
  }
}

// ============================================================================
// NOUVEAUX SERVICES POUR LA GESTION DES OBJETS GLOBAUX
// ============================================================================

// Récupérer un objet global avec toutes ses instances dans les installations de l'utilisateur
export async function getGlobalObjectService(
  objectDirectoryId: string,
  userId: string
): Promise<ActionResponse<GlobalObjectWithInstances>> {
  try {
    // 1. Vérifier que l'objet global existe
    const objectResult = await db
      .select({
        id: objectDirectory.id,
        name: objectDirectory.name,
        description: objectDirectory.description,
        categoryId: objectDirectory.categoryId,
        unitId: objectDirectory.unitId,
        objectTypeId: objectDirectory.objectTypeId,
        nutriscore: objectDirectory.nutriscore,
        brand: objectDirectory.brand,
        openFoodFactsId: objectDirectory.openFoodFactsId,
        defaultQuantity: objectDirectory.defaultQuantity,
        createdAt: objectDirectory.createdAt,
        updatedAt: objectDirectory.updatedAt,
      })
      .from(objectDirectory)
      .where(eq(objectDirectory.id, objectDirectoryId))
      .limit(1);

    if (!objectResult.length) {
      return {
        success: false,
        error: "Objet global non trouvé",
        code: ErrorCodes.OBJECT_NOT_FOUND,
      };
    }

    const globalObject = objectResult[0];

    // 2. Récupérer toutes les instances de cet objet dans les installations de l'utilisateur
    const instancesResult = await db
      .select({
        id: objectInstallation.id,
        installationId: objectInstallation.installationId,
        installationName: installations.name,
        quantity: objectInstallation.quantity,
        location: objectInstallation.location,
        purchaseDate: objectInstallation.purchaseDate,
        expiryDate: objectInstallation.expiryDate,
        shopId: objectInstallation.shopId,
        shopName: shops.name,
        lotNumber: objectInstallation.lotNumber,
        price: objectInstallation.price,
        note: objectInstallation.note,
      })
      .from(objectInstallation)
      .leftJoin(
        installations,
        eq(installations.id, objectInstallation.installationId)
      )
      .leftJoin(
        userInstallations,
        and(
          eq(userInstallations.installationId, objectInstallation.installationId),
          eq(userInstallations.userId, userId)
        )
      )
      .leftJoin(
        shops,
        eq(shops.id, objectInstallation.shopId)
      )
      .where(
        and(
          eq(objectInstallation.objectDirectoryId, objectDirectoryId),
          eq(userInstallations.userId, userId)
        )
      );

    // 3. Calculer la quantité totale
    const totalQuantity = instancesResult.reduce(
      (sum, instance) => sum + instance.quantity,
      0
    );

    // 4. Formater les instances
    const instances: any[] = instancesResult.map((instance) => ({
      id: instance.id,
      installationId: instance.installationId,
      installationName: instance.installationName || "Inconnu",
      quantity: instance.quantity,
      location: instance.location,
      purchaseDate: instance.purchaseDate,
      expiryDate: instance.expiryDate,
      shopId: instance.shopId,
      shopName: instance.shopName,
      lotNumber: instance.lotNumber,
      price: instance.price,
      note: instance.note,
    }));

    // 5. Récupérer les informations dédiées (catégorie, unité, type)
    const [category, unit, objectType] = await Promise.all([
      globalObject.categoryId
        ? db
            .select({
              id: categories.id,
              name: categories.name,
              description: categories.description,
              type: categories.type,
              createdAt: categories.createdAt,
            })
            .from(categories)
            .where(eq(categories.id, globalObject.categoryId))
            .limit(1)
        : Promise.resolve([]),
      globalObject.unitId
        ? db
            .select({
              id: units.id,
              name: units.name,
              symbol: units.symbol,
              type: units.type,
              createdAt: units.createdAt,
            })
            .from(units)
            .where(eq(units.id, globalObject.unitId))
            .limit(1)
        : Promise.resolve([]),
      globalObject.objectTypeId
        ? db
            .select({
              id: objectTypes.id,
              name: objectTypes.name,
              description: objectTypes.description,
              icon: objectTypes.icon,
              parentTypeId: objectTypes.parentTypeId,
              createdAt: objectTypes.createdAt,
              updatedAt: objectTypes.updatedAt,
            })
            .from(objectTypes)
            .where(eq(objectTypes.id, globalObject.objectTypeId))
            .limit(1)
        : Promise.resolve([]),
    ]);

    return {
      success: true,
      data: {
        ...globalObject,
        totalQuantity,
        instances,
        category: category[0] || null,
        unit: unit[0] || null,
        objectType: objectType[0] || null,
      },
    };
  } catch (error) {
    console.error("[ObjectService] Erreur lors de la récupération de l'objet global:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de la récupération de l'objet global",
      code: ErrorCodes.INTERNAL_ERROR,
      details: error,
    };
  }
}

// Récupérer toutes les instances d'un objet global dans une installation spécifique
export async function getObjectInstancesService(
  objectDirectoryId: string,
  installationId: string
): Promise<ActionResponse<{
  instances: ObjectInstance[];
  totalQuantity: number;
}>> {
  try {
    // Récupérer les instances de cet objet dans l'installation
    const instancesResult = await db
      .select({
        id: objectInstallation.id,
        installationId: objectInstallation.installationId,
        installationName: installations.name,
        quantity: objectInstallation.quantity,
        location: objectInstallation.location,
        purchaseDate: objectInstallation.purchaseDate,
        expiryDate: objectInstallation.expiryDate,
        shopId: objectInstallation.shopId,
        shopName: shops.name,
        lotNumber: objectInstallation.lotNumber,
        price: objectInstallation.price,
        note: objectInstallation.note,
      })
      .from(objectInstallation)
      .leftJoin(
        installations,
        eq(installations.id, objectInstallation.installationId)
      )
      .leftJoin(
        shops,
        eq(shops.id, objectInstallation.shopId)
      )
      .where(
        and(
          eq(objectInstallation.objectDirectoryId, objectDirectoryId),
          eq(objectInstallation.installationId, installationId)
        )
      );

    // Calculer la quantité totale
    const totalQuantity = instancesResult.reduce(
      (sum, instance) => sum + instance.quantity,
      0
    );

    // Formater les instances
    const instances: any[] = instancesResult.map((instance) => ({
      id: instance.id,
      installationId: instance.installationId,
      installationName: instance.installationName || "Inconnu",
      quantity: instance.quantity,
      location: instance.location,
      purchaseDate: instance.purchaseDate,
      expiryDate: instance.expiryDate,
      shopId: instance.shopId,
      shopName: instance.shopName,
      lotNumber: instance.lotNumber,
      price: instance.price,
      note: instance.note,
    }));

    return {
      success: true,
      data: {
        instances,
        totalQuantity,
      },
    };
  } catch (error) {
    console.error("[ObjectService] Erreur lors de la récupération des instances:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de la récupération des instances",
      code: ErrorCodes.INTERNAL_ERROR,
      details: error,
    };
  }
}

// Récupérer les données nutritionnelles depuis OpenFoodFacts
export async function fetchNutritionalDataService(
  barcode: string
): Promise<ActionResponse<{
  nutriscore: string;
  productName: string;
  brand: string;
  ingredients: string[];
  allergens: string;
  imageUrl: string;
  openFoodFactsId: string;
}>> {
  try {
    // Appel à l'API OpenFoodFacts (gratuite, pas besoin de clé API)
    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    const data = await response.json();

    if (!data.product) {
      return {
        success: false,
        error: "Produit non trouvé dans OpenFoodFacts",
        code: ErrorCodes.NOT_FOUND,
      };
    }

    const product = data.product;
    
    // Extraire les ingrédients
    const ingredients = product.ingredients_text
      ? product.ingredients_text.split(', ')
      : [];

    return {
      success: true,
      data: {
        nutriscore: product.nutriscore_grade || "U",
        productName: product.product_name || product.abbreviated_product_name || "Produit inconnu",
        brand: product.brands || "Inconnu",
        ingredients,
        allergens: product.allergens || "",
        imageUrl: product.image_url || product.image_front_url || "",
        openFoodFactsId: product._id || barcode,
      },
    };
  } catch (error) {
    console.error("[ObjectService] Erreur lors de la récupération OpenFoodFacts:", error);
    return {
      success: false,
      error: "Erreur lors de la récupération des données OpenFoodFacts",
      code: ErrorCodes.OPEN_FOOD_FACTS_ERROR,
      details: error,
    };
  }
}

// ============================================================================
// SERVICES POUR LES TYPES D'OBJETS
// ============================================================================

// Créer un type d'objet
export async function createObjectTypeService(
  name: string,
  description?: string,
  icon?: string,
  parentTypeId?: string
): Promise<ActionResponse<{ objectTypeId: string }>> {
  try {
    const id = randomUUID();
    
    const newType = await db
      .insert(objectTypes)
      .values({
        id,
        name,
        description,
        icon,
        parentTypeId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    if (!newType.length) {
      return {
        success: false,
        error: "Échec de la création du type d'objet",
        code: ErrorCodes.INTERNAL_ERROR,
      };
    }

    return {
      success: true,
      data: { objectTypeId: id },
    };
  } catch (error) {
    console.error("[ObjectService] Erreur lors de la création du type:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de la création du type",
      code: ErrorCodes.INTERNAL_ERROR,
      details: error,
    };
  }
}

// Lister tous les types d'objets
export async function listObjectTypesService(): Promise<ActionResponse<{ types: any[] }>> {
  try {
    const types = await db
      .select({
        id: objectTypes.id,
        name: objectTypes.name,
        description: objectTypes.description,
        icon: objectTypes.icon,
        parentTypeId: objectTypes.parentTypeId,
        createdAt: objectTypes.createdAt,
      })
      .from(objectTypes)
      .orderBy(objectTypes.name);

    return {
      success: true,
      data: { types },
    };
  } catch (error) {
    console.error("[ObjectService] Erreur lors de la récupération des types:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de la récupération des types",
      code: ErrorCodes.INTERNAL_ERROR,
      details: error,
    };
  }
}

// ============================================================================
// SERVICES POUR LES MAGASINS
// ============================================================================

// Créer un magasin
export async function createShopService(
  name: string,
  address?: string,
  city?: string
): Promise<ActionResponse<{ shopId: string }>> {
  try {
    const id = randomUUID();
    
    const newShop = await db
      .insert(shops)
      .values({
        id,
        name,
        address,
        city,
        createdAt: new Date(),
      })
      .returning();

    if (!newShop.length) {
      return {
        success: false,
        error: "Échec de la création du magasin",
        code: ErrorCodes.INTERNAL_ERROR,
      };
    }

    return {
      success: true,
      data: { shopId: id },
    };
  } catch (error) {
    console.error("[ObjectService] Erreur lors de la création du magasin:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de la création du magasin",
      code: ErrorCodes.INTERNAL_ERROR,
      details: error,
    };
  }
}

// Lister tous les magasins
export async function listShopsService(): Promise<ActionResponse<{ shops: any[] }>> {
  try {
    const shopsList = await db
      .select({
        id: shops.id,
        name: shops.name,
        address: shops.address,
        city: shops.city,
        createdAt: shops.createdAt,
      })
      .from(shops)
      .orderBy(shops.name);

    return {
      success: true,
      data: { shops: shopsList },
    };
  } catch (error) {
    console.error("[ObjectService] Erreur lors de la récupération des magasins:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de la récupération des magasins",
      code: ErrorCodes.INTERNAL_ERROR,
      details: error,
    };
  }
}
