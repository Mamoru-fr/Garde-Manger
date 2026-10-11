import { describe, it, expect } from "vitest";
import {
  buildOffCreationPlan,
  buildScanVariantSummary,
  applyVariantToDirectoryItem,
  buildScanCorrectionPlan,
  buildBarcodeLinkPlan,
} from "@/lib/services/ScanResolutionViewService";

// ============================================
// TDD — Chantier 4:2 : barcode → variante → générique
// Décisions Alexis 05/10 : Q2 = générique au nom COMPLET (la marque vit
// dans la variante) ; Q1 = rattrapage pour que tout fonctionne "comme sur
// des roulettes" ; Q3 (nom corrigé → variante) = UI au round suivant.
// Service PUR — aucun import DB (piège drizzle/Neon gravé au bloc 3).
// ============================================

describe("buildOffCreationPlan", () => {
  it("porte le nom complet sur le générique, la marque descend dans la variante", () => {
    const plan = buildOffCreationPlan({
      name: "Spaghettis Panzani",
      brand: "Panzani",
      description: "Pâtes alimentaires",
      nutriscore: "a",
      imageUrl: "https://images.openfoodfacts.org/spaghetti.jpg",
      openFoodFactsId: "3011111021017",
    });
    expect(plan.generic.name).toBe("Spaghettis Panzani");
    expect(plan.generic.brand).toBeNull();
    expect(plan.variant.brand).toBe("Panzani");
  });

  it("garde la description sur le générique uniquement", () => {
    const plan = buildOffCreationPlan({
      name: "Jus d'orange",
      brand: "Tropicana",
      description: "Jus d'orange pur jus",
      nutriscore: null,
      imageUrl: null,
      openFoodFactsId: "326349",
    });
    expect(plan.generic.description).toBe("Jus d'orange pur jus");
    expect(plan.variant).not.toHaveProperty("description");
  });

  it("normalise le Nutri-Score en majuscule côté variante", () => {
    const plan = buildOffCreationPlan({
      name: "Yaourt",
      brand: "Danone",
      description: null,
      nutriscore: "b",
      imageUrl: null,
      openFoodFactsId: "303349",
    });
    expect(plan.variant.nutriscore).toBe("B");
  });

  it("traite une marque absente ou blanche comme vrac (null)", () => {
    const sansMarque = buildOffCreationPlan({
      name: "Riz basmati", brand: undefined, description: null,
      nutriscore: null, imageUrl: null, openFoodFactsId: "1",
    });
    const marqueBlanche = buildOffCreationPlan({
      name: "Riz basmati", brand: "   ", description: null,
      nutriscore: null, imageUrl: null, openFoodFactsId: "2",
    });
    expect(sansMarque.variant.brand).toBeNull();
    expect(marqueBlanche.variant.brand).toBeNull();
  });

  it("verrouille les deux niveaux (isReadOnly true, produits OFF)", () => {
    const plan = buildOffCreationPlan({
      name: "X", brand: "Y", description: null,
      nutriscore: null, imageUrl: null, openFoodFactsId: "3",
    });
    expect(plan.generic.isReadOnly).toBe(true);
    expect(plan.variant.isReadOnly).toBe(true);
  });

  it("porte l'identifiant OFF sur les deux niveaux (lookup legacy + fiche)", () => {
    const plan = buildOffCreationPlan({
      name: "X", brand: "Y", description: null,
      nutriscore: null, imageUrl: null, openFoodFactsId: "30111110",
    });
    expect(plan.generic.openFoodFactsId).toBe("30111110");
    expect(plan.variant.openFoodFactsId).toBe("30111110");
  });
});

describe("buildScanVariantSummary", () => {
  it("résume une variante avec id, marque, Nutri-Score normalisé", () => {
    const s = buildScanVariantSummary({
      id: "v1", brand: "Carrefour", nutriscore: "c",
      imageUrl: null, isReadOnly: null,
    });
    expect(s).toEqual({
      id: "v1", brand: "Carrefour", nutriscore: "C",
      imageUrl: null, isReadOnly: false,
    });
  });

  it("retourne null sans variante (fiche legacy)", () => {
    expect(buildScanVariantSummary(null)).toBeNull();
  });

  it("null → false sur le verrou, undefined image → null", () => {
    const s = buildScanVariantSummary({
      id: "v2", brand: null, nutriscore: undefined as unknown as null,
      imageUrl: undefined as unknown as null, isReadOnly: true,
    });
    expect(s?.isReadOnly).toBe(true);
    expect(s?.nutriscore).toBeNull();
    expect(s?.imageUrl).toBeNull();
  });
});

describe("applyVariantToDirectoryItem", () => {
  const base = {
    id: "d1",
    barcode: "3011111021017",
    name: "Spaghettis",
    brand: null,
    nutriscore: null,
    openFoodFactsId: "3011111021017",
    isReadOnly: true,
  };

  it("la variante prime : marque et Nutri-Score écrasent le générique à l'affichage", () => {
    const out = applyVariantToDirectoryItem(
      { ...base, brand: "Panzani", nutriscore: "A" },
      { id: "v1", brand: "Barilla", nutriscore: "B", imageUrl: null, isReadOnly: true },
    );
    expect(out.item.brand).toBe("Barilla");
    expect(out.item.nutriscore).toBe("B");
    expect(out.item.variant?.id).toBe("v1");
  });

  it("fiche legacy sans variante : champs générique inchangés, variant undefined", () => {
    const out = applyVariantToDirectoryItem(
      { ...base, brand: "Panzani", nutriscore: "A" },
      null,
    );
    expect(out.item.brand).toBe("Panzani");
    expect(out.item.nutriscore).toBe("A");
    expect(out.item.variant).toBeUndefined();
  });

  it("variante sans Nutri-Score : repli sur celui du générique, pas d'écrasement par null", () => {
    const out = applyVariantToDirectoryItem(
      { ...base, nutriscore: "A" },
      { id: "v1", brand: "Barilla", nutriscore: null, imageUrl: null, isReadOnly: true },
    );
    expect(out.item.nutriscore).toBe("A");
    expect(out.item.brand).toBe("Barilla");
  });
});

// ============================================
// TDD — Chantier 4:2 R2 (11/10) : correction de nom/marque au scan.
// Décisions Alexis 11/10 : le nom corrigé va sur le GÉNÉRIQUE (seul
// porteur du nom), la marque corrigée sur la VARIANTE quand elle existe
// (repli générique sinon — statu quo Q2 06/10) ; la correction PASSE le
// verrou OFF (les fiches mal nommées par OpenFoodFacts sont la cible).
// Partie pure — plan de correction calculé sans DB.
// ============================================

describe("buildScanCorrectionPlan", () => {
  const base = {
    currentName: "Cristaline Eau minérale",
    submittedName: "Cristaline Eau minérale",
    currentBrand: "Cristaline",
    submittedBrand: "Cristaline",
    hasVariant: true,
  };

  it("aucune modification : rien à corriger", () => {
    const plan = buildScanCorrectionPlan(base);
    expect(plan.nameChanged).toBe(false);
    expect(plan.brandChanged).toBe(false);
  });

  it("nom modifié : nameChanged", () => {
    const plan = buildScanCorrectionPlan({ ...base, submittedName: "Cristaline eau source" });
    expect(plan.nameChanged).toBe(true);
    expect(plan.brandChanged).toBe(false);
  });

  it("nom identique après trim : pas de correction", () => {
    const plan = buildScanCorrectionPlan({ ...base, submittedName: "  Cristaline Eau minérale  " });
    expect(plan.nameChanged).toBe(false);
  });

  it("nom soumis vide : jamais d'effacement", () => {
    const plan = buildScanCorrectionPlan({ ...base, submittedName: "   " });
    expect(plan.nameChanged).toBe(false);
  });

  it("marque modifiée : brandChanged", () => {
    const plan = buildScanCorrectionPlan({ ...base, submittedBrand: "Carrefour" });
    expect(plan.brandChanged).toBe(true);
  });

  it("marque identique insensible à la casse : pas de correction", () => {
    const plan = buildScanCorrectionPlan({ ...base, submittedBrand: "cristaline" });
    expect(plan.brandChanged).toBe(false);
  });

  it("marque courante null, soumise remplie : correction", () => {
    const plan = buildScanCorrectionPlan({ ...base, currentBrand: null, submittedBrand: "Cristaline" });
    expect(plan.brandChanged).toBe(true);
  });

  it("marque soumise vide : jamais d'effacement", () => {
    const plan = buildScanCorrectionPlan({ ...base, submittedBrand: "" });
    expect(plan.brandChanged).toBe(false);
  });

  it("avec variante : la marque corrigée vise la variante", () => {
    const plan = buildScanCorrectionPlan({ ...base, submittedBrand: "Carrefour" });
    expect(plan.brandTarget).toBe("variant");
  });

  it("sans variante : la marque corrigée vise le générique (statu quo)", () => {
    const plan = buildScanCorrectionPlan({ ...base, hasVariant: false, submittedBrand: "Carrefour" });
    expect(plan.brandTarget).toBe("generic");
  });
});

// ============================================
// Liaison code-barres → fiche existante (round 3 du 4:2 — 11/10) :
// scanner un code inconnu et dire « c'est ce produit-là ». Le plan pur
// décide entre liaison, no-op (déjà liée) et conflit (liée ailleurs).
// ============================================
describe("buildBarcodeLinkPlan — liaison code-barres → fiche existante", () => {
  it("aucune ligne existante : liaison à écrire", () => {
    const plan = buildBarcodeLinkPlan({
      existingDirectoryId: null,
      existingVariantId: null,
      targetDirectoryId: "dir-1",
    });
    expect(plan.action).toBe("link");
  });

  it("déjà liée à la même fiche (sans variante) : no-op idempotent", () => {
    const plan = buildBarcodeLinkPlan({
      existingDirectoryId: "dir-1",
      existingVariantId: null,
      targetDirectoryId: "dir-1",
    });
    expect(plan.action).toBe("noop");
  });

  it("déjà liée à la même fiche (avec variante) : no-op — la variante prime, jamais écrasée", () => {
    const plan = buildBarcodeLinkPlan({
      existingDirectoryId: "dir-1",
      existingVariantId: "var-1",
      targetDirectoryId: "dir-1",
    });
    expect(plan.action).toBe("noop");
  });

  it("liée à une AUTRE fiche : conflit — refus explicite, jamais de re-pointage silencieux", () => {
    const plan = buildBarcodeLinkPlan({
      existingDirectoryId: "dir-1",
      existingVariantId: null,
      targetDirectoryId: "dir-2",
    });
    expect(plan.action).toBe("conflict");
    expect(plan.currentDirectoryId).toBe("dir-1");
  });

  it("cible vide ou blanche : invalide, rien à écrire", () => {
    const plan = buildBarcodeLinkPlan({
      existingDirectoryId: null,
      existingVariantId: null,
      targetDirectoryId: "   ",
    });
    expect(plan.action).toBe("invalid");
  });

  it("cible identique après trim : liaison normale (l'espace ne masque pas un doublon)", () => {
    const plan = buildBarcodeLinkPlan({
      existingDirectoryId: null,
      existingVariantId: null,
      targetDirectoryId: "  dir-1  ",
    });
    expect(plan.action).toBe("link");
    expect(plan.targetDirectoryId).toBe("dir-1");
  });
});
