// ============================================
// VariantQueryService — les variantes côté données (bloc 4)
// Modèle générique/poids — spec gravée le 03/10/2026 (.vibe/plans/spec-modele-generique-poids.md §2.2)
//
// Ce service charge ce que la vue réclame (les variantes d'un générique,
// la fiche détail d'une variante, la réaffiliation Q3a), puis délègue la
// construction à VariantViewService (partie pure, testée — règle 5).
// La séparation en deux fichiers garde la partie pure testable sans
// charger la DB (lib/db/drizzle crée son client Neon au chargement).
//
// Décisions du tech lead du 04/10 soir :
// - Q1a : « voir les différents X » = la liste des variantes du générique ;
// - Q2b : la fiche détail a sa PAGE dédiée (fondation, enrichie plus tard) ;
// - Q3a : « réaffilier » déplace une variante vers un autre générique —
//   sert aussi à la fusion manuelle des doublons ;
// - Q4b : le scan (barcode → variante) est reporté au chantier 4:2
//   (barcodeDirectory.productVariantId est prêt, ce service n'y touche pas).
//
// Piège gravé : liste SQL = inArray(), JAMAIS sql`= ANY(...)` avec le
// driver Neon HTTP (erreurs 22P02/42809).
// ============================================

import { eq } from "drizzle-orm";

import { db } from "@/lib/db/drizzle";
import { objectDirectory, productVariants } from "@/lib/db/schema";

import {
  buildVariantDetails,
  buildVariantLines,
  type VariantDetails,
  type VariantLine,
} from "./VariantViewService";

import { ErrorCodes } from "@/lib/types";
import type { ActionResponse } from "@/lib/types";

// --------------------------------------------
// getVariantsForDirectoryService — la liste des marques d'un générique (Q1a)
// --------------------------------------------

export async function getVariantsForDirectoryService(
  directoryId: string
): Promise<ActionResponse<{ variants: VariantLine[] }>> {
  try {
    const rows = await db
      .select({
        id: productVariants.id,
        brand: productVariants.brand,
        nutriscore: productVariants.nutriscore,
        imageUrl: productVariants.imageUrl,
        openFoodFactsId: productVariants.openFoodFactsId,
        isReadOnly: productVariants.isReadOnly,
      })
      .from(productVariants)
      .where(eq(productVariants.genericDirectoryId, directoryId));

    // Le tri d'affichage (marques alphabétiques, vrac en fin) vit dans
    // la partie pure testée — la requête reste neutre.
    return { success: true, data: { variants: buildVariantLines(rows) } };
  } catch (error) {
    console.error(
      "[VariantQueryService] Erreur lors du chargement des variantes:",
      error
    );
    return {
      success: false,
      error: "Une erreur est survenue lors du chargement des variantes",
      code: ErrorCodes.INTERNAL_ERROR,
      details: error,
    };
  }
}

// --------------------------------------------
// getVariantDetailsService — la fiche détail d'une variante (Q2b : fondation)
// --------------------------------------------

export async function getVariantDetailsService(
  variantId: string
): Promise<ActionResponse<{ card: VariantDetails }>> {
  try {
    // innerJoin : le parent {id, name} pour le fil d'Ariane de la page.
    // La FK cascade rend l'orphelin improbable — le builder pur garde
    // sa garde défensive si la jointure échouait quand même.
    const rows = await db
      .select({
        id: productVariants.id,
        brand: productVariants.brand,
        nutriscore: productVariants.nutriscore,
        imageUrl: productVariants.imageUrl,
        openFoodFactsId: productVariants.openFoodFactsId,
        isReadOnly: productVariants.isReadOnly,
        nutrients: productVariants.nutrients,
        createdAt: productVariants.createdAt,
        updatedAt: productVariants.updatedAt,
        genericId: objectDirectory.id,
        genericName: objectDirectory.name,
      })
      .from(productVariants)
      .innerJoin(
        objectDirectory,
        eq(productVariants.genericDirectoryId, objectDirectory.id)
      )
      .where(eq(productVariants.id, variantId))
      .limit(1);

    if (!rows.length) {
      return {
        success: false,
        error: "Variante non trouvée",
        code: ErrorCodes.NOT_FOUND,
      };
    }

    const row = rows[0];
    const card = buildVariantDetails({
      id: row.id,
      brand: row.brand,
      nutriscore: row.nutriscore,
      imageUrl: row.imageUrl,
      openFoodFactsId: row.openFoodFactsId,
      isReadOnly: row.isReadOnly,
      nutrients: row.nutrients,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      generic: { id: row.genericId, name: row.genericName },
    });

    return { success: true, data: { card } };
  } catch (error) {
    console.error(
      "[VariantQueryService] Erreur lors du chargement de la variante:",
      error
    );
    return {
      success: false,
      error: "Une erreur est survenue lors du chargement de la variante",
      code: ErrorCodes.INTERNAL_ERROR,
      details: error,
    };
  }
}

// --------------------------------------------
// reassignVariantToGenericService — la réaffiliation (Q3a)
// Sert aussi à la fusion manuelle des doublons du générique.
// --------------------------------------------

export async function reassignVariantToGenericService(
  variantId: string,
  newGenericDirectoryId: string
): Promise<ActionResponse<{ genericDirectoryId: string }>> {
  try {
    // 1. La variante existe (OBJECT_NOT_FOUND, cohérent avec ObjectService).
    const variantRows = await db
      .select({
        id: productVariants.id,
        genericDirectoryId: productVariants.genericDirectoryId,
      })
      .from(productVariants)
      .where(eq(productVariants.id, variantId))
      .limit(1);

    if (!variantRows.length) {
      return {
        success: false,
        error: "Variante non trouvée",
        code: ErrorCodes.OBJECT_NOT_FOUND,
      };
    }

    // 2. Idempotence : même générique → rien à écrire, succès tel quel.
    if (variantRows[0].genericDirectoryId === newGenericDirectoryId) {
      return { success: true, data: { genericDirectoryId: newGenericDirectoryId } };
    }

    // 3. Le générique cible existe (NOT_FOUND — le code dédié n'existe pas
    //    pour les directory, NOT_FOUND reste le code de lecture).
    const targetRows = await db
      .select({ id: objectDirectory.id })
      .from(objectDirectory)
      .where(eq(objectDirectory.id, newGenericDirectoryId))
      .limit(1);

    if (!targetRows.length) {
      return {
        success: false,
        error: "Générique cible non trouvé",
        code: ErrorCodes.NOT_FOUND,
      };
    }

    // 4. Le déplacement, horodaté.
    await db
      .update(productVariants)
      .set({
        genericDirectoryId: newGenericDirectoryId,
        updatedAt: new Date(),
      })
      .where(eq(productVariants.id, variantId));

    return { success: true, data: { genericDirectoryId: newGenericDirectoryId } };
  } catch (error) {
    console.error(
      "[VariantQueryService] Erreur lors de la réaffiliation de la variante:",
      error
    );
    return {
      success: false,
      error: "Une erreur est survenue lors de la réaffiliation de la variante",
      code: ErrorCodes.INTERNAL_ERROR,
      details: error,
    };
  }
}
