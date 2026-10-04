// ============================================
// CONTRÔLEUR POUR LES VARIANTES (bloc 4)
// Modèle générique/poids — spec §2.2 (fiches détail variantes)
//
// Pattern ObjectController : validation des entrées (ids non vides),
// puis délégation au service — zéro requête ici (invariant du round
// de fermeture du bloc 3 : Action → Controller → Service, la DB ne
// vit que dans les services).
// ============================================

import { ActionResponse, ErrorCodes } from "@/lib/types";

import {
  getVariantsForDirectoryService,
  getVariantDetailsService,
  reassignVariantToGenericService,
} from "@/lib/services/VariantQueryService";
import { mergeGenericsService } from "@/lib/services/MergeQueryService";
import type { MergeGenericsResult } from "@/lib/services/MergeQueryService";
import type { VariantDetails, VariantLine } from "@/lib/services/VariantViewService";

export class VariantController {
  // Lister les variantes (marques) d'un générique — Q1a, section repliable
  // de la page niveau 2.
  static async getDirectoryVariants(
    directoryId: string
  ): Promise<ActionResponse<{ variants: VariantLine[] }>> {
    try {
      if (!directoryId || !directoryId.trim()) {
        return {
          success: false,
          error: "L'identifiant du générique est requis",
          code: ErrorCodes.VALIDATION_ERROR,
        };
      }

      return await getVariantsForDirectoryService(directoryId);
    } catch (error) {
      console.error(
        "[VariantController] Erreur dans getDirectoryVariants:",
        error
      );
      return {
        success: false,
        error: "Une erreur est survenue",
        code: ErrorCodes.INTERNAL_ERROR,
        details: error,
      };
    }
  }

  // La fiche détail d'une variante — Q2b, page dédiée (fondation).
  static async getVariantCard(
    variantId: string
  ): Promise<ActionResponse<{ card: VariantDetails }>> {
    try {
      if (!variantId || !variantId.trim()) {
        return {
          success: false,
          error: "L'identifiant de la variante est requis",
          code: ErrorCodes.VALIDATION_ERROR,
        };
      }

      return await getVariantDetailsService(variantId);
    } catch (error) {
      console.error("[VariantController] Erreur dans getVariantCard:", error);
      return {
        success: false,
        error: "Une erreur est survenue",
        code: ErrorCodes.INTERNAL_ERROR,
        details: error,
      };
    }
  }

  // Réaffilier une variante vers un autre générique — Q3a (sert aussi à
  // la fusion manuelle des doublons).
  static async reassignVariantToGeneric(
    variantId: string,
    newGenericDirectoryId: string
  ): Promise<ActionResponse<{ genericDirectoryId: string }>> {
    try {
      if (!variantId || !variantId.trim()) {
        return {
          success: false,
          error: "L'identifiant de la variante est requis",
          code: ErrorCodes.VALIDATION_ERROR,
        };
      }
      if (!newGenericDirectoryId || !newGenericDirectoryId.trim()) {
        return {
          success: false,
          error: "L'identifiant du générique cible est requis",
          code: ErrorCodes.VALIDATION_ERROR,
        };
      }

      return await reassignVariantToGenericService(
        variantId,
        newGenericDirectoryId
      );
    } catch (error) {
      console.error(
        "[VariantController] Erreur dans reassignVariantToGeneric:",
        error
      );
      return {
        success: false,
        error: "Une erreur est survenue",
        code: ErrorCodes.INTERNAL_ERROR,
        details: error,
      };
    }
  }

  // Fusionner deux génériques (R4 — la fusion manuelle des doublons) :
  // tout ce qui vit sous la source (stock, variantes, barcodes)
  // déménage vers la cible, puis la source est supprimée.
  static async mergeGenerics(
    sourceDirectoryId: string,
    targetDirectoryId: string
  ): Promise<ActionResponse<MergeGenericsResult>> {
    try {
      if (!sourceDirectoryId || !sourceDirectoryId.trim()) {
        return {
          success: false,
          error: "L'identifiant du générique source est requis",
          code: ErrorCodes.VALIDATION_ERROR,
        };
      }
      if (!targetDirectoryId || !targetDirectoryId.trim()) {
        return {
          success: false,
          error: "L'identifiant du générique cible est requis",
          code: ErrorCodes.VALIDATION_ERROR,
        };
      }

      return await mergeGenericsService(
        sourceDirectoryId,
        targetDirectoryId
      );
    } catch (error) {
      console.error("[VariantController] Erreur dans mergeGenerics:", error);
      return {
        success: false,
        error: "Une erreur est survenue",
        code: ErrorCodes.INTERNAL_ERROR,
        details: error,
      };
    }
  }
}
