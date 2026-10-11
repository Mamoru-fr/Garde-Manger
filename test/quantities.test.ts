// ============================================
// Test du QuantityService — conversion, agrégation, affichage
// (modèle générique/poids, spec gravée le 03/10/2026 — .vibe/plans/spec-modele-generique-poids.md)
// Écrit AVANT l'implémentation (TDD-first) — règle 5 de tour-de-main.
// Fonctions pures : aucune DB, aucun réseau — les unités sont passées
// en entrée telles que le seed de la base les fournira (§3.1).
// ============================================

import { describe, it, expect } from "vitest";

import {
  QuantityUnit,
  QuantityEntry,
  convertToBase,
  aggregateQuantities,
  selectableUnitsFor,
  formatQuantity,
  formatAggregation,
} from "../lib/services/QuantityService";

// ---- Les unités du seed, en mémoire (§3.1 de la spec) ----
const units: Record<string, QuantityUnit> = {
  g: { id: "g", symbol: "g", family: "masse", conversionFactor: 1, isBase: true },
  kg: { id: "kg", symbol: "kg", family: "masse", conversionFactor: 1000, isBase: false },
  mg: { id: "mg", symbol: "mg", family: "masse", conversionFactor: 0.001, isBase: false },
  t: { id: "t", symbol: "t", family: "masse", conversionFactor: 1000000, isBase: false },
  ml: { id: "ml", symbol: "ml", family: "volume", conversionFactor: 1, isBase: true },
  cl: { id: "cl", symbol: "cl", family: "volume", conversionFactor: 10, isBase: false },
  l: { id: "l", symbol: "L", family: "volume", conversionFactor: 1000, isBase: false },
  unite: { id: "unite", symbol: "unité", family: "discrete", conversionFactor: null, isBase: false },
  sachet: { id: "sachet", symbol: "sachet", family: "discrete", conversionFactor: null, isBase: false },
  boite: { id: "boite", symbol: "boîte", family: "discrete", conversionFactor: null, isBase: false },
};

const masseUnits = Object.values(units).filter((u) => u.family === "masse");

// ============================================
// convertToBase — conversion vers l'unité de base de la famille
// ============================================
describe("convertToBase", () => {
  it("convertit vers l'unité de base de la famille", () => {
    expect(convertToBase(1, units.kg)).toBe(1000);
    expect(convertToBase(0.75, units.l)).toBe(750);
    expect(convertToBase(500, units.g)).toBe(500);
    expect(convertToBase(250, units.cl)).toBe(2500);
  });

  it("retourne null pour une unité non convertible (discrète)", () => {
    expect(convertToBase(2, units.sachet)).toBeNull();
  });
});

// ============================================
// aggregateQuantities — la règle d'agrégation complète (§3.3)
// ============================================
describe("aggregateQuantities — règle §3.3 de la spec", () => {
  it("additionne tout ce qui est convertible dans l'unité de base (l'exemple canonique du riz)", () => {
    // 3 sachets de 1 kg + 5 sachets de 500 g + 750 g en vrac = 6250 g
    const entries: QuantityEntry[] = [
      { value: 3, unitId: "sachet", equivalentValue: 1000, equivalentUnitId: "g" },
      { value: 5, unitId: "sachet", equivalentValue: 500, equivalentUnitId: "g" },
      { value: 750, unitId: "g" },
    ];
    const result = aggregateQuantities(entries, units);
    expect(result.totals.masse).toBe(6250);
    expect(result.contributingDiscretes).toHaveLength(2);
    expect(result.leftovers).toHaveLength(0);
  });

  it("intègre un discret avec équivalent connu au total, composition retenue pour les parenthèses", () => {
    // 2 sachets de 250 g = 500 g, et l'affichage doit pouvoir dire "(dont 2 sachets de 250 g)"
    const result = aggregateQuantities(
      [{ value: 2, unitId: "sachet", equivalentValue: 250, equivalentUnitId: "g" }],
      units
    );
    expect(result.totals.masse).toBe(500);
    expect(result.contributingDiscretes[0].value).toBe(2);
    expect(result.contributingDiscretes[0].equivalentValue).toBe(250);
  });

  it("empile un discret SANS équivalent à côté (jamais dans le total)", () => {
    const result = aggregateQuantities(
      [
        { value: 1500, unitId: "g" },
        { value: 2, unitId: "sachet" },
      ],
      units
    );
    expect(result.totals.masse).toBe(1500);
    expect(result.leftovers).toEqual([{ value: 2, unitId: "sachet" }]);
  });

  it("agrège les familles séparément (masse et volume ne se mélangent jamais)", () => {
    const result = aggregateQuantities(
      [
        { value: 1500, unitId: "g" },
        { value: 2, unitId: "l" },
      ],
      units
    );
    expect(result.totals.masse).toBe(1500);
    expect(result.totals.volume).toBe(2000);
    expect(result.leftovers).toHaveLength(0);
  });

  it("retourne un tableau vide pour une saisie vide", () => {
    const result = aggregateQuantities([], units);
    expect(result.totals.masse ?? 0).toBe(0);
    expect(result.leftovers).toHaveLength(0);
  });
});

// ============================================
// selectableUnitsFor — seuil de lisibilité 0,1 (§4.1)
// ============================================
describe("selectableUnitsFor — seuil de lisibilité 0,1 (règle §4.1)", () => {
  it("propose g, kg et mg pour 500 g — jamais la tonne", () => {
    const ids = selectableUnitsFor(500, masseUnits).map((u) => u.id);
    expect(ids).toContain("g");
    expect(ids).toContain("kg");
    expect(ids).toContain("mg");
    expect(ids).not.toContain("t");
  });

  it("propose la tonne pour une demi-tonne réelle (horizon entrepôt)", () => {
    const ids = selectableUnitsFor(500000, masseUnits).map((u) => u.id);
    expect(ids).toContain("t");
  });

  it("ne propose aucune unité convertible pour un total nul", () => {
    expect(selectableUnitsFor(0, masseUnits)).toHaveLength(0);
  });
});

// ============================================
// formatQuantity — affichage FR, virgule décimale
// ============================================
describe("formatQuantity — affichage FR", () => {
  it("formate dans l'unité demandée, virgule décimale, sans zéro traînant", () => {
    expect(formatQuantity(5750, units.g)).toBe("5750 g");
    expect(formatQuantity(5750, units.kg)).toBe("5,75 kg");
    expect(formatQuantity(500, units.g)).toBe("500 g");
    expect(formatQuantity(500, units.kg)).toBe("0,5 kg");
    expect(formatQuantity(500000, units.t)).toBe("0,5 t");
  });
});

// ============================================
// formatAggregation — l'affichage complet de la fiche générique
// ============================================
describe("formatAggregation — l'affichage complet de la fiche", () => {
  const prefs = { masse: "g", volume: "ml" };

  it("une seule famille, une seule quantité (l'option A quand tout convertit)", () => {
    // 1 kg + 500 g = 1500 g
    const result = aggregateQuantities(
      [
        { value: 1, unitId: "kg" },
        { value: 500, unitId: "g" },
      ],
      units
    );
    expect(formatAggregation(result, units, prefs)).toBe("1500 g");
  });

  it("respecte la préférence d'affichage de l'utilisateur par famille", () => {
    const result = aggregateQuantities(
      [
        { value: 1, unitId: "kg" },
        { value: 500, unitId: "g" },
      ],
      units
    );
    expect(formatAggregation(result, units, { masse: "kg", volume: "ml" })).toBe("1,5 kg");
  });

  it("replie sur l'unité de base si la préférence ne passe pas le seuil", () => {
    // 500 g de riz : jamais question de l'afficher en tonnes
    const result = aggregateQuantities([{ value: 500, unitId: "g" }], units);
    expect(formatAggregation(result, units, { masse: "t", volume: "ml" })).toBe("500 g");
  });

  it("affiche la composition des discrets intégrés entre parenthèses", () => {
    const result = aggregateQuantities(
      [{ value: 2, unitId: "sachet", equivalentValue: 250, equivalentUnitId: "g" }],
      units
    );
    expect(formatAggregation(result, units, prefs)).toBe("500 g (dont 2 sachets de 250 g)");
  });

  it("empile les discrets sans équivalent après le total, un segment par unité (l'option B compressive)", () => {
    const result = aggregateQuantities(
      [
        { value: 1500, unitId: "g" },
        { value: 2, unitId: "sachet" },
        { value: 24, unitId: "unite" },
      ],
      units
    );
    expect(formatAggregation(result, units, prefs)).toBe("1500 g + 2 sachets + 24 unités");
  });

  it("24 œufs, sans grammage — discret pur (la règle des œufs)", () => {
    const result = aggregateQuantities([{ value: 24, unitId: "unite" }], units);
    expect(formatAggregation(result, units, prefs)).toBe("24 unités");
  });

  it("deux familles convertibles : un segment par famille", () => {
    const result = aggregateQuantities(
      [
        { value: 1500, unitId: "g" },
        { value: 2, unitId: "l" },
      ],
      units
    );
    expect(formatAggregation(result, units, prefs)).toBe("1500 g + 2000 ml");
  });

  it("fiche vide : chaîne vide", () => {
    const result = aggregateQuantities([], units);
    expect(formatAggregation(result, units, prefs)).toBe("");
  });
});
