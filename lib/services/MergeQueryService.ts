// ============================================
// MergeQueryService — la fusion des génériques côté données (bloc 4, R4)
// Modèle générique/poids — la fusion manuelle des doublons (spec 03/10 :
// Alexis seul réunit ce qui va ensemble, jamais de fusion automatique).
//
// Ce service charge ce qui vit sous le générique SOURCE (lignes de
// stock, variantes, codes-barres), délègue les décisions à la partie
// pure (MergeViewService, testée — règle 5), exécute les déplacements,
// puis supprime la source. Le bouton vit sur la page de la source,
// la modale choisit la cible (décision tech lead 05/10).
//
// ⚠️ PIÈGE GRAVÉ (barcode_directory) : la colonne héritée
// objectDirectoryId référence la source avec onDelete "cascade" —
// supprimer la source sans re-pointer ses codes-barres les EFFACERAIT
// en cascade (les scans futurs ne reconnaîtraient plus ces produits).
// Le re-pointage se fait donc AVANT la suppression. Les barcodes
// portés par une variante suivent leur variante : si la variante est
// fusionnée, ses barcodes sont re-pointés vers la variante gardée
// AVANT sa suppression (productVariantId est onDelete "set null" —
// sinon le lien serait silencieusement coupé).
//
// ⚠️ PAS DE TRANSACTION (driver neon-http — decision tech lead 05/10 :
// changer de driver serait « relou » pour un geste de dev) : chaque
// étape attrape « ce qui reste sous la source » — une relance achève
// une fusion interrompue sans rien déplacer deux fois. LA SEULE
// EXCEPTION documentée : la sommation d'une ligne nue (incrément de la
// cible, puis suppression de la ligne source) a une micro-fenêtre
// entre ses deux écritures ; un crash exactement dedans doublerait la
// quantité d'une ligne nue au pire — visible et corrigeable à la main
// (c'est une quantité de stock, jamais une perte d'info).
//
// Piège gravé : liste SQL = inArray(), JAMAIS sql`= ANY(...)` avec le
// driver Neon HTTP (erreurs 22P02/42809).
// ============================================

import { eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db/drizzle";
import {
  objectDirectory,
  productVariants,
  objectInstallation,
  barcodeDirectory,
} from "@/lib/db/schema";

import {
  decideVariantMerge,
  normalizeVariantBrand,
  planStockLineMoves,
  type VariantMergeRaw,
} from "./MergeViewService";

import { ErrorCodes } from "@/lib/types";
import type { ActionResponse } from "@/lib/types";

// --------------------------------------------
// mergeGenericsService — vider la source dans la cible, puis la supprimer
// --------------------------------------------

export interface MergeGenericsResult {
  targetDirectoryId: string;
  removedGenericId: string;
  movedStockLines: number; // lignes déménagées telles quelles
  summedStockLines: number; // lignes nues sommées sur la cible
  movedVariants: number; // variantes déménagées
  mergedVariants: number; // variantes fusionnées champ par champ
}

export async function mergeGenericsService(
  sourceDirectoryId: string,
  targetDirectoryId: string
): Promise<ActionResponse<MergeGenericsResult>> {
  try {
    // 1. La source existe — si elle a déjà disparu, c'est qu'une fusion
    //    précédente l'a consommée : réponse honnête, pas un succés muet.
    const sourceRows = await db
      .select({ id: objectDirectory.id })
      .from(objectDirectory)
      .where(eq(objectDirectory.id, sourceDirectoryId))
      .limit(1);

    if (!sourceRows.length) {
      return {
        success: false,
        error: "Générique source non trouvé",
        code: ErrorCodes.NOT_FOUND,
      };
    }

    // 2. La cible existe.
    const targetRows = await db
      .select({ id: objectDirectory.id })
      .from(objectDirectory)
      .where(eq(objectDirectory.id, targetDirectoryId))
      .limit(1);

    if (!targetRows.length) {
      return {
        success: false,
        error: "Générique cible non trouvé",
        code: ErrorCodes.NOT_FOUND,
      };
    }

    // 3. Source ≠ cible (la ceinture et les bretelles du contrôleur).
    if (sourceDirectoryId === targetDirectoryId) {
      return {
        success: false,
        error: "Un générique ne peut pas se fusionner dans lui-même",
        code: ErrorCodes.VALIDATION_ERROR,
      };
    }

    let movedStockLines = 0;
    let summedStockLines = 0;
    let movedVariants = 0;
    let mergedVariants = 0;

    // --------------------------------------------
    // ÉTAPE 1 — les variantes (avant tout le reste : leurs barcodes
    // doivent suivre les fusions AVANT toute suppression).
    // --------------------------------------------
    const sourceVariants = await db
      .select({
        id: productVariants.id,
        brand: productVariants.brand,
        nutriscore: productVariants.nutriscore,
        imageUrl: productVariants.imageUrl,
        openFoodFactsId: productVariants.openFoodFactsId,
        nutrients: productVariants.nutrients,
        isReadOnly: productVariants.isReadOnly,
      })
      .from(productVariants)
      .where(eq(productVariants.genericDirectoryId, sourceDirectoryId));

    if (sourceVariants.length > 0) {
      const targetVariants = await db
        .select({
          id: productVariants.id,
          brand: productVariants.brand,
          nutriscore: productVariants.nutriscore,
          imageUrl: productVariants.imageUrl,
          openFoodFactsId: productVariants.openFoodFactsId,
          nutrients: productVariants.nutrients,
          isReadOnly: productVariants.isReadOnly,
        })
        .from(productVariants)
        .where(eq(productVariants.genericDirectoryId, targetDirectoryId));

      // Index de collision : marque normalisée → variante cible.
      const targetByBrand = new Map<string, VariantMergeRaw>();
      for (const tv of targetVariants) {
        targetByBrand.set(normalizeVariantBrand(tv.brand), tv);
      }

      for (const sv of sourceVariants) {
        const decision = decideVariantMerge(
          sv,
          targetByBrand.get(normalizeVariantBrand(sv.brand)) ?? null
        );

        if (
          decision.shouldMerge &&
          decision.keptVariantId &&
          decision.removedVariantId &&
          decision.mergedFields
        ) {
          // Fusion champ par champ : la cible garde son id, la source
          // disparaît — ses barcodes sont re-pointés AVANT la
          // suppression (piège onDelete "set null").
          const keptId = decision.keptVariantId;
          const removedId = decision.removedVariantId;

          await db
            .update(productVariants)
            .set({
              ...decision.mergedFields,
              updatedAt: new Date(),
            })
            .where(eq(productVariants.id, keptId));

          await db
            .update(barcodeDirectory)
            .set({ productVariantId: keptId })
            .where(eq(barcodeDirectory.productVariantId, removedId));

          await db
            .delete(productVariants)
            .where(eq(productVariants.id, removedId));

          mergedVariants++;
        } else {
          // Pas de collision : la variante déménage telle quelle.
          await db
            .update(productVariants)
            .set({
              genericDirectoryId: targetDirectoryId,
              updatedAt: new Date(),
            })
            .where(eq(productVariants.id, sv.id));
          movedVariants++;
        }
      }
    }

    // --------------------------------------------
    // ÉTAPE 2 — les lignes de stock (le plan vient de la partie pure).
    // --------------------------------------------
    const sourceLines = await db
      .select({
        id: objectInstallation.id,
        installationId: objectInstallation.installationId,
        quantity: objectInstallation.quantity,
        location: objectInstallation.location,
        purchaseDate: objectInstallation.purchaseDate,
        expiryDate: objectInstallation.expiryDate,
        shopId: objectInstallation.shopId,
        lotNumber: objectInstallation.lotNumber,
        price: objectInstallation.price,
        note: objectInstallation.note,
        quantityValue: objectInstallation.quantityValue,
        quantityUnitId: objectInstallation.quantityUnitId,
        equivalentValue: objectInstallation.equivalentValue,
        equivalentUnitId: objectInstallation.equivalentUnitId,
      })
      .from(objectInstallation)
      .where(eq(objectInstallation.objectDirectoryId, sourceDirectoryId));

    if (sourceLines.length > 0) {
      const targetLines = await db
        .select({
          id: objectInstallation.id,
          installationId: objectInstallation.installationId,
          quantity: objectInstallation.quantity,
          location: objectInstallation.location,
          purchaseDate: objectInstallation.purchaseDate,
          expiryDate: objectInstallation.expiryDate,
          shopId: objectInstallation.shopId,
          lotNumber: objectInstallation.lotNumber,
          price: objectInstallation.price,
          note: objectInstallation.note,
          quantityValue: objectInstallation.quantityValue,
          quantityUnitId: objectInstallation.quantityUnitId,
          equivalentValue: objectInstallation.equivalentValue,
          equivalentUnitId: objectInstallation.equivalentUnitId,
        })
        .from(objectInstallation)
        .where(eq(objectInstallation.objectDirectoryId, targetDirectoryId));

      // Les sélections ci-dessus matchent StockLineRaw champ à champ
      // (les dates arrivent en Date | null, StockLineRaw les type
      // unknown — assignable) : pas de cast nécessaire.
      const plan = planStockLineMoves(sourceLines, targetLines);

      const summedSourceIds: string[] = [];

      for (const move of plan) {
        if (move.action === "sum" && move.targetLineId && move.newQuantity !== undefined) {
          // Quantité absolue calculée au plan : la ligne cible ne
          // prend JAMAIS les infos complémentaires de la source
          // (la définition de la ligne nue la protège).
          await db
            .update(objectInstallation)
            .set({ quantity: move.newQuantity, updatedAt: new Date() })
            .where(eq(objectInstallation.id, move.targetLineId));
          summedSourceIds.push(move.sourceLineId);
          summedStockLines++;
        } else {
          // Déménagement tel quel : la ligne garde son id, son
          // historique, toutes ses infos — seul le directory change.
          await db
            .update(objectInstallation)
            .set({ objectDirectoryId: targetDirectoryId, updatedAt: new Date() })
            .where(eq(objectInstallation.id, move.sourceLineId));
          movedStockLines++;
        }
      }

      // Les lignes nues sommées disparaissent (leur quantité vit
      // désormais dans la ligne cible). inArray ONLY — piège Neon.
      if (summedSourceIds.length > 0) {
        await db
          .delete(objectInstallation)
          .where(inArray(objectInstallation.id, summedSourceIds));
      }
    }

    // --------------------------------------------
    // ÉTAPE 3 — les codes-barres de la colonne héritée (re-pointage
    // AVANT la suppression : onDelete "cascade", piège gravé).
    // Les barcodes portés par une variante ont déjà suivi leur
    // variante à l'étape 1 — ici on ne touche que la colonne legacy.
    // --------------------------------------------
    await db
      .update(barcodeDirectory)
      .set({ objectDirectoryId: targetDirectoryId })
      .where(eq(barcodeDirectory.objectDirectoryId, sourceDirectoryId));

    // --------------------------------------------
    // ÉTAPE 4 — garde défensive puis suppression de la source.
    // S'il reste quoi que ce soit dessous, on ne supprime PAS (le
    // cascade détruirait) : réponse d'erreur honnête, relance requise.
    // --------------------------------------------
    const remainingVariants = await db
      .select({ id: productVariants.id })
      .from(productVariants)
      .where(eq(productVariants.genericDirectoryId, sourceDirectoryId))
      .limit(1);

    const remainingLines = await db
      .select({ id: objectInstallation.id })
      .from(objectInstallation)
      .where(eq(objectInstallation.objectDirectoryId, sourceDirectoryId))
      .limit(1);

    const remainingBarcodes = await db
      .select({ id: barcodeDirectory.id })
      .from(barcodeDirectory)
      .where(eq(barcodeDirectory.objectDirectoryId, sourceDirectoryId))
      .limit(1);

    if (remainingVariants.length || remainingLines.length || remainingBarcodes.length) {
      return {
        success: false,
        error:
          "La fusion n'a pas pu finir : il reste des données sous le générique source. Relancez la fusion pour l'achever.",
        code: ErrorCodes.INTERNAL_ERROR,
      };
    }

    await db
      .delete(objectDirectory)
      .where(eq(objectDirectory.id, sourceDirectoryId));

    return {
      success: true,
      data: {
        targetDirectoryId,
        removedGenericId: sourceDirectoryId,
        movedStockLines,
        summedStockLines,
        movedVariants,
        mergedVariants,
      },
    };
  } catch (error) {
    console.error(
      "[MergeQueryService] Erreur lors de la fusion des génériques:",
      error
    );
    return {
      success: false,
      error: "Une erreur est survenue lors de la fusion",
      code: ErrorCodes.INTERNAL_ERROR,
      details: error,
    };
  }
}
