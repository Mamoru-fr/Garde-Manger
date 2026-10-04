// ============================================
// Test du MergeViewService — fusion manuelle des génériques
// (bloc 4, round 4 — doublons d'annuaire)
// Écrit AVANT l'implémentation (TDD-first) — règle 5 de tour-de-main.
// Fonctions pures : aucune DB — les lignes arrivent telles que la
// requête les ramènera.
//
// Décisions du tech lead (04/10 soir → 05/10) gravées ici :
// - une ligne « nue » = la quantité et son conditionnement, RIEN
//   d'autre (ni date d'achat/péremption, ni magasin, ni lot, ni prix,
//   ni note, ni emplacement) ;
// - deux lignes nues ne somment que si leurs conditionnements
//   concordent (tous les deux sans, ou mêmes valeurs + mêmes unités) ;
// - une ligne informée déménage telle quelle : en base on garde les
//   lignes distinctes, l'UI les regroupe sous la carte générique ;
// - collision de variantes : même marque (insensible casse, vrac inclus)
//   → fusion champ par champ (on ne perd rien) ; marques différentes →
//   les deux restent.
// ============================================

import { describe, it, expect } from "vitest";

import {
  StockLineRaw,
  VariantMergeRaw,
  hasComplementaryInfo,
  packagingMatches,
  planStockLineMoves,
  decideVariantMerge,
} from "../lib/services/MergeViewService";

// Une ligne de stock « nue » : quantité + conditionnement, rien d'autre.
const bareLine = (overrides: Partial<StockLineRaw> = {}): StockLineRaw => ({
  id: "line-1",
  installationId: "inst-1",
  quantity: 3,
  location: null,
  purchaseDate: null,
  expiryDate: null,
  shopId: null,
  lotNumber: null,
  price: null,
  note: null,
  quantityValue: null,
  quantityUnitId: null,
  equivalentValue: null,
  equivalentUnitId: null,
  ...overrides,
});

describe("hasComplementaryInfo — la définition de la ligne « nue »", () => {
  it("une ligne quantité-seule est nue (sans complément)", () => {
    expect(hasComplementaryInfo(bareLine())).toBe(false);
  });

  it("une ligne avec conditionnement (quantité valeur + unité) reste NUE", () => {
    // Décision tech lead : le conditionnement fait partie de la ligne nue.
    expect(
      hasComplementaryInfo(
        bareLine({ quantityValue: 2, quantityUnitId: "unit-kg" })
      )
    ).toBe(false);
  });

  it("une péremption seule suffit à informer la ligne", () => {
    expect(hasComplementaryInfo(bareLine({ expiryDate: new Date("2026-12-31") }))).toBe(true);
  });

  it("une note seule suffit à informer la ligne", () => {
    expect(hasComplementaryInfo(bareLine({ note: "À consommer rapidement" }))).toBe(true);
  });

  it("un emplacement seul suffit à informer la ligne", () => {
    expect(hasComplementaryInfo(bareLine({ location: "Étagère 1" }))).toBe(true);
  });
});

describe("packagingMatches — concordance des conditionnements", () => {
  it("deux lignes sans conditionnement concordent", () => {
    expect(packagingMatches(bareLine(), bareLine())).toBe(true);
  });

  it("mêmes valeurs + mêmes unités concordent", () => {
    const a = bareLine({ quantityValue: 1, quantityUnitId: "unit-kg" });
    const b = bareLine({ quantityValue: 1, quantityUnitId: "unit-kg" });
    expect(packagingMatches(a, b)).toBe(true);
  });

  it("des unités différentes ne concordent pas (kg ≠ g)", () => {
    const a = bareLine({ quantityValue: 1, quantityUnitId: "unit-kg" });
    const b = bareLine({ quantityValue: 1000, quantityUnitId: "unit-g" });
    expect(packagingMatches(a, b)).toBe(false);
  });

  it("une conditionnée et une sans conditionnement ne concordent pas", () => {
    const a = bareLine({ quantityValue: 1, quantityUnitId: "unit-kg" });
    expect(packagingMatches(a, bareLine())).toBe(false);
  });
});

describe("planStockLineMoves — le plan de déménagement du stock", () => {
  it("ligne nue concordante → sommée sur la ligne nue de la cible", () => {
    const source = [bareLine({ id: "src-1", quantity: 3 })];
    const target = [bareLine({ id: "tgt-1", quantity: 2 })];
    const moves = planStockLineMoves(source, target);
    expect(moves).toHaveLength(1);
    expect(moves[0].action).toBe("sum");
    expect(moves[0].targetLineId).toBe("tgt-1");
    expect(moves[0].newQuantity).toBe(5);
  });

  it("deux lignes nues vers la même ligne cible → cumulées dans l'ordre", () => {
    const source = [
      bareLine({ id: "src-1", quantity: 3 }),
      bareLine({ id: "src-2", quantity: 2 }),
    ];
    const target = [bareLine({ id: "tgt-1", quantity: 1 })];
    const moves = planStockLineMoves(source, target);
    expect(moves).toHaveLength(2);
    expect(moves[0].newQuantity).toBe(4); // 1 + 3
    expect(moves[1].newQuantity).toBe(6); // 1 + 3 + 2
    expect(moves[1].targetLineId).toBe("tgt-1");
  });

  it("ligne nue mais conditionnement différent → déplacée telle quelle", () => {
    const source = [
      bareLine({ id: "src-1", quantityValue: 2, quantityUnitId: "unit-sachets" }),
    ];
    const target = [bareLine({ id: "tgt-1" })]; // sans conditionnement
    const moves = planStockLineMoves(source, target);
    expect(moves).toHaveLength(1);
    expect(moves[0].action).toBe("move");
    expect(moves[0].sourceLineId).toBe("src-1");
  });

  it("ligne informée (péremption) → déplacée telle quelle, jamais sommée", () => {
    const source = [
      bareLine({ id: "src-1", expiryDate: new Date("2026-12-31") }),
    ];
    const target = [bareLine({ id: "tgt-1", quantity: 2 })];
    const moves = planStockLineMoves(source, target);
    expect(moves).toHaveLength(1);
    expect(moves[0].action).toBe("move");
  });

  it("installation sans ligne cible → la ligne nue déménage (pas de sommation)", () => {
    const source = [bareLine({ id: "src-1", installationId: "inst-2" })];
    const target = [bareLine({ id: "tgt-1", installationId: "inst-1" })];
    const moves = planStockLineMoves(source, target);
    expect(moves).toHaveLength(1);
    expect(moves[0].action).toBe("move");
  });

  it("la sommation ne retient JAMAIS les infos complémentaires de la source", () => {
    // La ligne cible nue reste nue : on ne lui colle pas la note de la source.
    const source = [bareLine({ id: "src-1", quantity: 3 })];
    const target = [bareLine({ id: "tgt-1", quantity: 2 })];
    const moves = planStockLineMoves(source, target);
    expect(moves[0].action).toBe("sum");
    expect(moves[0].newQuantity).toBe(5);
  });
});

describe("decideVariantMerge — collision de variantes", () => {
  const variant = (overrides: Partial<VariantMergeRaw> = {}): VariantMergeRaw => ({
    id: "var-x",
    brand: "Lidl",
    nutriscore: null,
    imageUrl: null,
    openFoodFactsId: null,
    nutrients: null,
    isReadOnly: false,
    ...overrides,
  });

  it("même marque insensible à la casse → fusion champ par champ, rien ne se perd", () => {
    const source = variant({
      id: "var-src",
      brand: "lidl",
      nutriscore: "B",
      imageUrl: null,
      openFoodFactsId: "off-123",
    });
    const target = variant({
      id: "var-tgt",
      brand: "Lidl",
      nutriscore: null,
      imageUrl: "https://img/lidl.jpg",
      openFoodFactsId: null,
    });
    const decision = decideVariantMerge(source, target);
    expect(decision.shouldMerge).toBe(true);
    expect(decision.removedVariantId).toBe("var-src");
    expect(decision.mergedFields?.nutriscore).toBe("B"); // de la source
    expect(decision.mergedFields?.imageUrl).toBe("https://img/lidl.jpg"); // de la cible
    expect(decision.mergedFields?.openFoodFactsId).toBe("off-123"); // de la source
  });

  it("marques différentes → pas de fusion (les deux restent)", () => {
    const source = variant({ id: "var-src", brand: "Carrefour" });
    const target = variant({ id: "var-tgt", brand: "Intermarché" });
    const decision = decideVariantMerge(source, target);
    expect(decision.shouldMerge).toBe(false);
  });

  it("deux vrac (brand null) → fusion (même « Sans marque »)", () => {
    const source = variant({ id: "var-src", brand: null, nutrients: { energy: 100 } });
    const target = variant({ id: "var-tgt", brand: null });
    const decision = decideVariantMerge(source, target);
    expect(decision.shouldMerge).toBe(true);
    expect(decision.mergedFields?.nutrients).toEqual({ energy: 100 });
  });

  it("pas de variante cible → pas de fusion (déménagement simple)", () => {
    const decision = decideVariantMerge(variant({ id: "var-src" }), null);
    expect(decision.shouldMerge).toBe(false);
  });

  it("la cible garde son id — c'est la source qui est retirée", () => {
    const source = variant({ id: "var-src", brand: "Lidl" });
    const target = variant({ id: "var-tgt", brand: "Lidl" });
    const decision = decideVariantMerge(source, target);
    expect(decision.keptVariantId).toBe("var-tgt");
    expect(decision.removedVariantId).toBe("var-src");
  });
});
