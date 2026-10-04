// ============================================
// ACTIONS POUR LA FONCTIONNALITÉ "MON STOCK"
// Vue générique (bloc 3) : les actions valident
// la session et délèguent aux services — zéro
// requête ici, en lecture comme en écriture
// (round de fermeture du bloc 3).
// ============================================

import { auth } from "@/lib/auth/auth";
import { getAuthHeaders } from "@/lib/utils/auth";
import { ObjectController } from "@/lib/controllers/ObjectController";
import type { StockItemUpdateInput } from "@/lib/services/ObjectService";
import { StockResponse } from "@/lib/types/stockTypes";
import { ErrorCodes } from "@/lib/types";
import {
  getGenericStockView,
  getGenericDirectoryDetail,
  getInstallationDirectoryDetail,
} from "@/lib/services/StockQueryService";
import type {
  GenericStockFilters,
  GenericStockActionResult,
  GenericDirectoryDetailResult,
  InstallationDirectoryDetailResult,
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
 * FICHE GÉNÉRIQUE D'INSTALLATION (niveau 3 de la pyramide — bloc 3)
 * `/installations/[id]/stock/[directoryId]` : la carte du générique
 * dans le périmètre d'une installation — ses lignes sont exactement
 * les sachets à lister (édition/suppression par la ligne).
 * L'action orchestre (session) et délègue au service — zéro DB ici.
 */
export async function getInstallationDirectoryCard(
  installationId: string,
  directoryId: string
): Promise<InstallationDirectoryDetailResult> {
  try {
    console.log(
      "[StockActions] getInstallationDirectoryCard:",
      installationId,
      directoryId
    );
    const headers = await getAuthHeaders();
    const session = await auth.api.getSession({ headers });

    if (!session?.user) {
      return {
        success: false,
        error: "Non autorisé",
        code: ErrorCodes.UNAUTHORIZED,
      };
    }

    const detail = await getInstallationDirectoryDetail(
      session.user.id,
      installationId,
      directoryId
    );
    if (!detail.ok) {
      if (detail.code === "NOT_FOUND") {
        // Fiche inconnue ou sans aucune ligne dans cette installation :
        // le niveau 3 est une fiche de STOCK, comme le niveau 2.
        return {
          success: false,
          error: "Fiche générique introuvable dans cette installation",
          code: ErrorCodes.NOT_FOUND,
        };
      }
      return {
        success: false,
        error: "Installation inaccessible",
        code: detail.code,
      };
    }

    return { success: true, card: detail.card };
  } catch (error) {
    console.error(
      "[StockActions] Erreur dans getInstallationDirectoryCard:",
      error
    );
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
  input: StockItemUpdateInput
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

    // Round de fermeture : accès, permissions et requête vivent dans
    // ObjectService, derrière ObjectController — zéro DB côté action
    return await ObjectController.updateStockItem(
      installationId,
      objectInstallationId,
      session.user.id,
      input
    );
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

    // Round de fermeture : accès, permissions et requête vivent dans
    // ObjectService, derrière ObjectController — zéro DB côté action
    return await ObjectController.deleteStockItem(
      installationId,
      objectInstallationId,
      session.user.id
    );
  } catch (error) {
    console.error("[StockActions] Erreur dans deleteStockItem:", error);
    return {
      success: false,
      error: "Erreur lors de la suppression de l'objet",
      code: ErrorCodes.INTERNAL_ERROR,
    };
  }
}
