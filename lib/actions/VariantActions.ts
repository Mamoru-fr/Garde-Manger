// ============================================
// ACTIONS POUR LES VARIANTES (bloc 4)
// Modèle générique/poids — spec §2.2 (fiches détail variantes)
//
// Les actions valident la session et délèguent au contrôleur —
// zéro requête ici (invariant du round de fermeture du bloc 3).
// Entrée officielle des composants clients pour tout ce qui
// touche les variantes (liste Q1a, fiche Q2b, réaffiliation Q3a,
// fusion des génériques R4).
// ============================================

"use server";

import { auth } from "@/lib/auth/auth";
import { getAuthHeaders } from "@/lib/utils/auth";
import { VariantController } from "@/lib/controllers/VariantController";
import type { MergeGenericsResult } from "@/lib/services/MergeQueryService";
import { ErrorCodes } from "@/lib/types";
import type { ActionResponse } from "@/lib/types";
import type { VariantDetails, VariantLine } from "@/lib/services/VariantViewService";

/**
 * LISTER LES VARIANTES D'UN GÉNÉRIQUE (Q1a) — la section repliable
 * « voir les différents X » de la page niveau 2. Retourne les lignes
 * déjà triées (marques alphabétiques, vrac en fin — partie pure testée).
 */
export async function getDirectoryVariants(
  directoryId: string
): Promise<ActionResponse<{ variants: VariantLine[] }>> {
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

    return await VariantController.getDirectoryVariants(directoryId);
  } catch (error) {
    console.error("[VariantActions] Erreur dans getDirectoryVariants:", error);
    return {
      success: false,
      error: "Une erreur est survenue",
      code: ErrorCodes.INTERNAL_ERROR,
      details: error,
    };
  }
}

/**
 * FICHE DÉTAIL D'UNE VARIANTE (Q2b) — page dédiée (fondation au bloc 4,
 * enrichie plus tard : nutriments déjà portés dans la carte).
 */
export async function getVariantCard(
  variantId: string
): Promise<ActionResponse<{ card: VariantDetails }>> {
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

    return await VariantController.getVariantCard(variantId);
  } catch (error) {
    console.error("[VariantActions] Erreur dans getVariantCard:", error);
    return {
      success: false,
      error: "Une erreur est survenue",
      code: ErrorCodes.INTERNAL_ERROR,
      details: error,
    };
  }
}

/**
 * RÉAFFILIER UNE VARIANTE (Q3a) — la déplace vers un autre générique ;
 * sert aussi à la fusion manuelle des doublons d'Alexis.
 */
export async function reassignVariantToGeneric(
  variantId: string,
  newGenericDirectoryId: string
): Promise<ActionResponse<{ genericDirectoryId: string }>> {
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

    return await VariantController.reassignVariantToGeneric(
      variantId,
      newGenericDirectoryId
    );
  } catch (error) {
    console.error(
      "[VariantActions] Erreur dans reassignVariantToGeneric:",
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

/**
 * FUSIONNER DEUX GÉNÉRIQUES (R4 — doublons d'annuaire) : tout ce qui
 * vit sous la source (lignes de stock, variantes, codes-barres)
 * déménage vers la cible, puis la source est supprimée. Le bouton
 * vit sur la page de la source, la modale choisit la cible.
 */
export async function mergeGenerics(
  sourceDirectoryId: string,
  targetDirectoryId: string
): Promise<ActionResponse<MergeGenericsResult>> {
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

    return await VariantController.mergeGenerics(
      sourceDirectoryId,
      targetDirectoryId
    );
  } catch (error) {
    console.error("[VariantActions] Erreur dans mergeGenerics:", error);
    return {
      success: false,
      error: "Une erreur est survenue",
      code: ErrorCodes.INTERNAL_ERROR,
      details: error,
    };
  }
}
