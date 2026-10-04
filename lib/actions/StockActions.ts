// ============================================
// ACTIONS POUR LA FONCTIONNALITÉ "MON STOCK"
// Vue générique (bloc 3) : les actions valident
// la session et délèguent aux services — zéro
// requête ici pour la lecture. update/delete
// conservent leurs accès directs en attendant le
// round de fermeture du bloc (délégation prévue
// à ObjectService — voir PROJET.md §5).
// ============================================

import { auth } from "@/lib/auth/auth";
import { getAuthHeaders } from "@/lib/utils/auth";
import { db } from "@/lib/db/drizzle";
import {
  objectInstallation,
  userInstallations
} from "@/lib/db/schema";
import {
  eq,
  and
} from "drizzle-orm";
import { StockResponse } from "@/lib/types/stockTypes";
import { ErrorCodes } from "@/lib/types";
import {
  getGenericStockView,
  getGenericDirectoryDetail,
} from "@/lib/services/StockQueryService";
import type {
  GenericStockFilters,
  GenericStockActionResult,
  GenericDirectoryDetailResult,
} from "@/lib/services/StockQueryService";

/**
 * VUE GÉNÉRIQUE DU STOCK (bloc 3) — fiches génériques sans marque,
 * quantités agrégées §3.3, affichage selon les préférences §4.2.
 * L'action orchestre (session) et délègue au service (règle des couches).
 */
export async function getUserGenericStock(
  filters: GenericStockFilters = {}
): Promise<GenericStockActionResult> {
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

    const view = await getGenericStockView(session.user.id, filters);
    if (!view.ok) {
      return {
        success: false,
        error: "Installation non trouvée ou non accessible",
        code: ErrorCodes.INSTALLATION_ACCESS_DENIED,
      };
    }

    return { success: true, cards: view.cards, stats: view.stats };
  } catch (error) {
    console.error("[StockActions] Erreur dans getUserGenericStock:", error);
    return {
      success: false,
      error: "Erreur lors de la récupération du stock",
      code: ErrorCodes.INTERNAL_ERROR,
    };
  }
}

/**
 * VUE GÉNÉRIQUE DU STOCK pour une installation (bloc 3).
 */
export async function getInstallationGenericStock(
  installationId: string,
  filters: GenericStockFilters = {}
): Promise<GenericStockActionResult> {
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

    const view = await getGenericStockView(session.user.id, {
      ...filters,
      installationId,
    });
    if (!view.ok) {
      return {
        success: false,
        error: "Installation non trouvée ou non accessible",
        code: ErrorCodes.INSTALLATION_ACCESS_DENIED,
      };
    }

    return { success: true, cards: view.cards, stats: view.stats };
  } catch (error) {
    console.error("[StockActions] Erreur dans getInstallationGenericStock:", error);
    return {
      success: false,
      error: "Erreur lors de la récupération du stock",
      code: ErrorCodes.INTERNAL_ERROR,
    };
  }
}

/**
 * FICHE GÉNÉRIQUE GLOBALE (bloc 3, niveau 2 de la pyramide) : la
 * carte du générique dans TOUT le périmètre de l'utilisateur + l'encadré
 * « quantité par installation ». L'action orchestre (session) et
 * délègue au service (règle des couches).
 */
export async function getGenericDirectoryCard(
  directoryId: string
): Promise<GenericDirectoryDetailResult> {
  try {
    console.log("[StockActions] getGenericDirectoryCard:", directoryId);
    const headers = await getAuthHeaders();
    const session = await auth.api.getSession({ headers });

    if (!session?.user) {
      return {
        success: false,
        error: "Non autorisé",
        code: ErrorCodes.UNAUTHORIZED,
      };
    }

    const detail = await getGenericDirectoryDetail(session.user.id, directoryId);
    if (!detail.ok) {
      if (detail.code === "NOT_FOUND") {
        // Fiche inconnue ou sans aucune ligne dans le périmètre :
        // le niveau 2 est une fiche de STOCK, pas un annuaire.
        return {
          success: false,
          error: "Fiche générique introuvable dans votre stock",
          code: ErrorCodes.NOT_FOUND,
        };
      }
      return {
        success: false,
        error: "Aucune installation accessible",
        code: detail.code,
      };
    }

    return { success: true, card: detail.card, breakdown: detail.breakdown };
  } catch (error) {
    console.error("[StockActions] Erreur dans getGenericDirectoryCard:", error);
    return {
      success: false,
      error: "Erreur lors de la récupération de la fiche",
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
