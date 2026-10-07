import { describe, it, expect } from "vitest";
import {
  buildOffCreationPlan,
  buildScanVariantSummary,
  applyVariantToDirectoryItem,
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
