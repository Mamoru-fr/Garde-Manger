// ============================================
// ACTIONS POUR LA FONCTIONNALITÉ "MON STOCK"
// ============================================

import { auth } from "@/lib/auth/auth";
import { getAuthHeaders } from "@/lib/utils/auth";
import { db } from "@/lib/db/drizzle";
import { 
  objectInstallation, 
  installations, 
  objectDirectory, 
  barcodeDirectory,
  shops,
  userInstallations
} from "@/lib/db/schema";
import { 
  eq, 
  and, 
  or, 
  like, 
  isNull, 
  desc, 
  asc,
  lte,
  gte,
  sql,
  count,
  sum
} from "drizzle-orm";
import { 
  StockItemWithExpiryStatus, 
  StockFilters, 
  StockStats,
  StockResponse,
  canEditStockItem
} from "@/lib/types/stockTypes";
import { ErrorCodes } from "@/lib/types";

// ========== Helpers ==========

/**
 * Calcule le statut de péremption en fonction du nombre de jours restants
 */
function getExpiryStatus(daysUntilExpiry: number | null): 'normal' | 'warning' | 'urgent' | 'expired' | 'no_date' {
  if (daysUntilExpiry === null) return 'no_date';
  if (daysUntilExpiry < 0) return 'expired';
  if (daysUntilExpiry <= 3) return 'urgent';
  if (daysUntilExpiry <= 7) return 'warning';
  return 'normal';
}

/**
 * Retourne les conditions de filtre Drizzle pour le statut de péremption
 */
function getExpiryFilter(expiryStatus: 'warning' | 'urgent' | 'expired' | 'normal' | 'no_date'): any[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  switch (expiryStatus) {
    case 'expired':
      return [lte(objectInstallation.expiryDate, today)];
    case 'urgent':
      const urgentDate = new Date(today);
      urgentDate.setDate(urgentDate.getDate() + 3);
      return [
        and(
          gte(objectInstallation.expiryDate, today),
          lte(objectInstallation.expiryDate, urgentDate)
        )
      ];
    case 'warning':
      const warningStart = new Date(today);
      warningStart.setDate(warningStart.getDate() + 3);
      const warningEnd = new Date(today);
      warningEnd.setDate(warningEnd.getDate() + 7);
      return [
        and(
          gte(objectInstallation.expiryDate, warningStart),
          lte(objectInstallation.expiryDate, warningEnd)
        )
      ];
    case 'normal':
      const normalDate = new Date(today);
      normalDate.setDate(normalDate.getDate() + 7);
      return [gte(objectInstallation.expiryDate, normalDate)];
    case 'no_date':
      return [isNull(objectInstallation.expiryDate)];
    default:
      return [];
  }
}

/**
 * Calcule les jours restants jusqu'à la date de péremption
 */
function calculateDaysUntilExpiry(expiryDate: Date | null): number | null {
  if (!expiryDate) return null;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  
  const diffTime = expiry.getTime() - today.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Formate un item de la base de données en StockItemWithExpiryStatus
 */
function formatStockItem(
  item: any,
  installationName: string,
  userRole: 'owner' | 'editor' | 'viewer' | null
): StockItemWithExpiryStatus {
  const priceInCents = item.price || 0;
  const expiryDate = item.expiryDate ? new Date(item.expiryDate) : null;
  const purchaseDate = item.purchaseDate ? new Date(item.purchaseDate) : null;
  const daysUntilExpiry = calculateDaysUntilExpiry(expiryDate);
  const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;
  const effectiveRole = userRole || 'viewer';
  
  return {
    id: item.id,
    installationId: item.installationId,
    installationName,
    objectDirectoryId: item.objectDirectoryId,
    barcode: item.barcode,
    name: item.name || 'Objet sans nom',
    brand: item.brand,
    category: item.category,
    description: item.description,
    quantity: item.quantity,
    unit: item.unit,
    location: item.location,
    purchaseDate,
    expiryDate,
    lotNumber: item.lotNumber,
    price: priceInCents,
    notes: item.note,
    nutriscore: item.nutriscore,
    imageUrl: item.imageUrl,
    shopId: item.shopId,
    shopName: item.shopName,
    isReadOnly: item.isReadOnly || false,
    hasEditPermission: canEditStockItem(effectiveRole),
    createdAt: new Date(item.addedDate),
    updatedAt: new Date(item.updatedAt),
    isExpired,
    daysUntilExpiry,
    expiryStatus: getExpiryStatus(daysUntilExpiry),
  };
}

// ========== Actions principales ==========

/**
 * Récupère le stock d'une installation spécifique
 */
export async function getInstallationStock(
  installationId: string,
  filters: StockFilters = {}
): Promise<StockResponse> {
  try {
    // 1. Vérifier l'accès de l'utilisateur à l'installation
    const headers = await getAuthHeaders();
    const session = await auth.api.getSession({ headers });
    
    if (!session?.user) {
      return {
        success: false,
        error: "Non autorisé",
        code: ErrorCodes.UNAUTHORIZED,
      };
    }

    // 2. Vérifier l'accès à l'installation
    const accessResult = await db.query.userInstallations.findFirst({
      where: and(
        eq(userInstallations.userId, session.user.id),
        eq(userInstallations.installationId, installationId)
      ),
    });
    
    if (!accessResult) {
      return {
        success: false,
        error: "Accès refusé à cette installation",
        code: ErrorCodes.INSTALLATION_ACCESS_DENIED,
      };
    }

    const userRole = accessResult.role;

    // 3. Construire la requête principale
    const query = db
      .select({
        id: objectInstallation.id,
        installationId: objectInstallation.installationId,
        objectDirectoryId: objectInstallation.objectDirectoryId,
        quantity: objectInstallation.quantity,
        location: objectInstallation.location,
        purchaseDate: objectInstallation.purchaseDate,
        expiryDate: objectInstallation.expiryDate,
        lotNumber: objectInstallation.lotNumber,
        price: objectInstallation.price,
        note: objectInstallation.note,
        shopId: objectInstallation.shopId,
        addedDate: objectInstallation.addedDate,
        updatedAt: objectInstallation.updatedAt,
        // Champs de objectDirectory
        name: objectDirectory.name,
        brand: objectDirectory.brand,
        description: objectDirectory.description,
        nutriscore: objectDirectory.nutriscore,
        imageUrl: objectDirectory.imageUrl,
        category: objectDirectory.categoryId,
        unit: objectDirectory.unitId,
        isReadOnly: objectDirectory.isReadOnly,
        // Champs de barcodeDirectory
        barcode: barcodeDirectory.barcode,
        // Champs de shops
        shopName: shops.name,
      })
      .from(objectInstallation)
      .leftJoin(
        objectDirectory,
        eq(objectInstallation.objectDirectoryId, objectDirectory.id)
      )
      .leftJoin(
        barcodeDirectory,
        eq(objectInstallation.objectDirectoryId, barcodeDirectory.objectDirectoryId)
      )
      .leftJoin(
        shops,
        eq(objectInstallation.shopId, shops.id)
      )
      .where(
        and(
          eq(objectInstallation.installationId, installationId),
          ...(filters.searchQuery ? [
            or(
              like(objectDirectory.name, `%${filters.searchQuery}%`),
              like(barcodeDirectory.barcode, `%${filters.searchQuery}%`),
              like(objectDirectory.brand, `%${filters.searchQuery}%`)
            )
          ] : []),
          ...(filters.category ? [eq(objectDirectory.categoryId, filters.category)] : []),
          ...(filters.location ? [eq(objectInstallation.location, filters.location)] : []),
          ...(filters.expiryStatus && filters.expiryStatus !== 'all' ? getExpiryFilter(filters.expiryStatus) : [])
        )
      )
      .orderBy(
        (() => {
          switch (filters.sortBy) {
            case 'name':
              return filters.sortOrder === 'asc' ? asc(objectDirectory.name) : desc(objectDirectory.name);
            case 'quantity':
              return filters.sortOrder === 'asc' ? asc(objectInstallation.quantity) : desc(objectInstallation.quantity);
            case 'expiry_date':
              return filters.sortOrder === 'asc' ? asc(objectInstallation.expiryDate) : desc(objectInstallation.expiryDate);
            case 'purchase_date':
              return filters.sortOrder === 'asc' ? asc(objectInstallation.purchaseDate) : desc(objectInstallation.purchaseDate);
            case 'added_date':
            default:
              return filters.sortOrder === 'asc' ? asc(objectInstallation.addedDate) : desc(objectInstallation.addedDate);
          }
        })()
      )

    // 6. Exécuter la requête
    const items = await query.execute();
    
    // 7. Récupérer le nom de l'installation
    const installation = await db.query.installations.findFirst({
      where: eq(installations.id, installationId),
      columns: { name: true },
    });
    
    const installationName = installation?.name || 'Installation inconnue';

    // 8. Formater les résultats
    const formattedItems: StockItemWithExpiryStatus[] = items.map(item =>
      formatStockItem(item, installationName, userRole)
    );

    // 9. Calculer les statistiques
    const stats: StockStats = {
      totalItems: formattedItems.length,
      totalQuantity: formattedItems.reduce((sum, item) => sum + item.quantity, 0),
      totalValue: formattedItems.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0),
      expiringSoonCount: formattedItems.filter(item => item.expiryStatus === 'warning' || item.expiryStatus === 'urgent').length,
      expiredCount: formattedItems.filter(item => item.expiryStatus === 'expired').length,
      categoriesDistribution: formattedItems.reduce((acc, item) => {
        if (item.category) {
          acc[item.category] = (acc[item.category] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>),
      installationsDistribution: {}, // Pas applicable pour une seule installation
    };

    return {
      success: true,
      data: formattedItems,
      stats,
    };
  } catch (error) {
    console.error("[StockActions] Erreur dans getInstallationStock:", error);
    return {
      success: false,
      error: "Erreur lors de la récupération du stock",
      code: ErrorCodes.INTERNAL_ERROR,
    };
  }
}

/**
 * Récupère le stock de TOUTES les installations de l'utilisateur
 */
export async function getUserStock(
  filters: StockFilters = {}
): Promise<StockResponse> {
  try {
    // 1. Vérifier la session
    const headers = await getAuthHeaders();
    const session = await auth.api.getSession({ headers });
    
    if (!session?.user) {
      return {
        success: false,
        error: "Non autorisé",
        code: ErrorCodes.UNAUTHORIZED,
      };
    }

    // 2. Récupérer toutes les installations accessibles par l'utilisateur
    const userInstallationsList = await db.query.userInstallations.findMany({
      where: eq(userInstallations.userId, session.user.id),
      with: {
        installation: true,
      },
    });
    
    if (!userInstallationsList.length) {
      return {
        success: true,
        data: [],
        stats: {
          totalItems: 0,
          totalQuantity: 0,
          totalValue: 0,
          expiringSoonCount: 0,
          expiredCount: 0,
          categoriesDistribution: {},
          installationsDistribution: {},
        },
      };
    }

    // 3. Créer un mapping des rôles par installation
    const installationRoles = userInstallationsList.reduce((acc, ui) => {
      acc[ui.installationId] = ui.role;
      return acc;
    }, {} as Record<string, 'owner' | 'editor' | 'viewer' | null>);

    // 4.Filtrer par installation si spécifié
    const installationIds = filters.installationId 
      ? [filters.installationId] 
      : userInstallationsList.map(ui => ui.installationId);
    
    if (!installationIds.length) {
      return { success: true, data: [], stats: getEmptyStats() };
    }

    // 5. Construire la requête principale (similaire à getInstallationStock mais pour plusieurs installations)
    const query = db
      .select({
        id: objectInstallation.id,
        installationId: objectInstallation.installationId,
        objectDirectoryId: objectInstallation.objectDirectoryId,
        quantity: objectInstallation.quantity,
        location: objectInstallation.location,
        purchaseDate: objectInstallation.purchaseDate,
        expiryDate: objectInstallation.expiryDate,
        lotNumber: objectInstallation.lotNumber,
        price: objectInstallation.price,
        note: objectInstallation.note,
        shopId: objectInstallation.shopId,
        addedDate: objectInstallation.addedDate,
        updatedAt: objectInstallation.updatedAt,
        // Champs de objectDirectory
        name: objectDirectory.name,
        brand: objectDirectory.brand,
        description: objectDirectory.description,
        nutriscore: objectDirectory.nutriscore,
        imageUrl: objectDirectory.imageUrl,
        category: objectDirectory.categoryId,
        unit: objectDirectory.unitId,
        isReadOnly: objectDirectory.isReadOnly,
        // Champs de barcodeDirectory
        barcode: barcodeDirectory.barcode,
        // Champs de shops
        shopName: shops.name,
        // Champs de installation
        installationName: installations.name,
      })
      .from(objectInstallation)
      .leftJoin(
        objectDirectory,
        eq(objectInstallation.objectDirectoryId, objectDirectory.id)
      )
      .leftJoin(
        barcodeDirectory,
        eq(objectInstallation.objectDirectoryId, barcodeDirectory.objectDirectoryId)
      )
      .leftJoin(
        shops,
        eq(objectInstallation.shopId, shops.id)
      )
      .leftJoin(
        installations,
        eq(objectInstallation.installationId, installations.id)
      )
      .where(
        and(
          sql`${objectInstallation.installationId} = ANY(${installationIds})`,
          ...(filters.searchQuery ? [
            or(
              like(objectDirectory.name, `%${filters.searchQuery}%`),
              like(barcodeDirectory.barcode, `%${filters.searchQuery}%`),
              like(objectDirectory.brand, `%${filters.searchQuery}%`)
            )
          ] : []),
          ...(filters.category ? [eq(objectDirectory.categoryId, filters.category)] : []),
          ...(filters.location ? [eq(objectInstallation.location, filters.location)] : []),
          ...(filters.expiryStatus && filters.expiryStatus !== 'all' ? getExpiryFilter(filters.expiryStatus) : [])
        )
      )
      .orderBy(
        (() => {
          switch (filters.sortBy) {
            case 'name':
              return filters.sortOrder === 'asc' ? asc(objectDirectory.name) : desc(objectDirectory.name);
            case 'quantity':
              return filters.sortOrder === 'asc' ? asc(objectInstallation.quantity) : desc(objectInstallation.quantity);
            case 'expiry_date':
              return filters.sortOrder === 'asc' ? asc(objectInstallation.expiryDate) : desc(objectInstallation.expiryDate);
            case 'purchase_date':
              return filters.sortOrder === 'asc' ? asc(objectInstallation.purchaseDate) : desc(objectInstallation.purchaseDate);
            case 'added_date':
            default:
              return filters.sortOrder === 'asc' ? asc(objectInstallation.addedDate) : desc(objectInstallation.addedDate);
          }
        })()
      )

    // 8. Exécuter la requête
    const items = await query.execute();
    
    // 9. Formater les résultats
    const formattedItems: StockItemWithExpiryStatus[] = items.map(item => {
      const role = installationRoles[item.installationId] || 'viewer';
      return formatStockItem(item, item.installationName || 'Installation inconnue', role);
    });

    // 10. Calculer les statistiques
    const stats: StockStats = {
      totalItems: formattedItems.length,
      totalQuantity: formattedItems.reduce((sum, item) => sum + item.quantity, 0),
      totalValue: formattedItems.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0),
      expiringSoonCount: formattedItems.filter(item => item.expiryStatus === 'warning' || item.expiryStatus === 'urgent').length,
      expiredCount: formattedItems.filter(item => item.expiryStatus === 'expired').length,
      categoriesDistribution: formattedItems.reduce((acc, item) => {
        if (item.category) {
          acc[item.category] = (acc[item.category] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>),
      installationsDistribution: formattedItems.reduce((acc, item) => {
        acc[item.installationId] = (acc[item.installationId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };

    return {
      success: true,
      data: formattedItems,
      stats,
    };
  } catch (error) {
    console.error("[StockActions] Erreur dans getUserStock:", error);
    return {
      success: false,
      error: "Erreur lors de la récupération du stock",
      code: ErrorCodes.INTERNAL_ERROR,
    };
  }
}

/**
 * Met à jour un objet dans le stock
 */
export async function updateStockItem(
  installationId: string,
  objectInstallationId: string,
  input: {
    quantity?: number;
    location?: string | null;
    purchaseDate?: Date | null;
    expiryDate?: Date | null;
    lotNumber?: string | null;
    price?: number | null;
    notes?: string | null;
    shopId?: string | null;
  }
): Promise<StockResponse> {
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

    // Vérifier l'accès en écriture
    const accessResult = await db.query.userInstallations.findFirst({
      where: and(
        eq(userInstallations.userId, session.user.id),
        eq(userInstallations.installationId, installationId)
      ),
    });
    
    if (!accessResult) {
      return {
        success: false,
        error: "Accès refusé",
        code: ErrorCodes.INSTALLATION_ACCESS_DENIED,
      };
    }
    
    if (accessResult.role !== 'owner' && accessResult.role !== 'editor') {
      return {
        success: false,
        error: "Permission refusée : vous n'avez pas les droits pour modifier cet objet",
        code: ErrorCodes.UNAUTHORIZED,
      };
    }

    // Vérifier que l'objet appartient bien à l'installation
    const existingItem = await db.query.objectInstallation.findFirst({
      where: and(
        eq(objectInstallation.id, objectInstallationId),
        eq(objectInstallation.installationId, installationId)
      ),
    });
    
    if (!existingItem) {
      return {
        success: false,
        error: "Objet non trouvé",
        code: ErrorCodes.OBJECT_NOT_FOUND,
      };
    }

    // Construire l'update
    const updateData: Record<string, unknown> = {};
    
    if (input.quantity !== undefined) updateData.quantity = input.quantity;
    if (input.location !== undefined) updateData.location = input.location;
    if (input.purchaseDate !== undefined) updateData.purchaseDate = input.purchaseDate;
    if (input.expiryDate !== undefined) updateData.expiryDate = input.expiryDate;
    if (input.lotNumber !== undefined) updateData.lotNumber = input.lotNumber;
    if (input.price !== undefined) updateData.price = input.price;
    if (input.notes !== undefined) updateData.note = input.notes;
    if (input.shopId !== undefined) updateData.shopId = input.shopId;
    
    updateData.updatedAt = new Date();

    // Exécuter la mise à jour
    await db
      .update(objectInstallation)
      .set(updateData)
      .where(eq(objectInstallation.id, objectInstallationId));

    return {
      success: true,
    };
  } catch (error) {
    console.error("[StockActions] Erreur dans updateStockItem:", error);
    return {
      success: false,
      error: "Erreur lors de la mise à jour de l'objet",
      code: ErrorCodes.INTERNAL_ERROR,
    };
  }
}

/**
 * Supprime un objet du stock
 */
export async function deleteStockItem(
  installationId: string,
  objectInstallationId: string
): Promise<StockResponse> {
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

    // Vérifier l'accès en écriture
    const accessResult = await db.query.userInstallations.findFirst({
      where: and(
        eq(userInstallations.userId, session.user.id),
        eq(userInstallations.installationId, installationId)
      ),
    });
    
    if (!accessResult) {
      return {
        success: false,
        error: "Accès refusé",
        code: ErrorCodes.INSTALLATION_ACCESS_DENIED,
      };
    }
    
    if (accessResult.role !== 'owner' && accessResult.role !== 'editor') {
      return {
        success: false,
        error: "Permission refusée : vous n'avez pas les droits pour supprimer cet objet",
        code: ErrorCodes.UNAUTHORIZED,
      };
    }

    // Vérifier que l'objet appartient bien à l'installation
    const existingItem = await db.query.objectInstallation.findFirst({
      where: and(
        eq(objectInstallation.id, objectInstallationId),
        eq(objectInstallation.installationId, installationId)
      ),
    });
    
    if (!existingItem) {
      return {
        success: false,
        error: "Objet non trouvé",
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
    console.error("[StockActions] Erreur dans deleteStockItem:", error);
    return {
      success: false,
      error: "Erreur lors de la suppression de l'objet",
      code: ErrorCodes.INTERNAL_ERROR,
    };
  }
}

// ========== Helpers pour les statistiques vides ==========

function getEmptyStats(): StockStats {
  return {
    totalItems: 0,
    totalQuantity: 0,
    totalValue: 0,
    expiringSoonCount: 0,
    expiredCount: 0,
    categoriesDistribution: {},
    installationsDistribution: {},
  };
}
