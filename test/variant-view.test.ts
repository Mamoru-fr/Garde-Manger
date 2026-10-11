// ============================================
// Test du VariantViewService — fiches détail (variantes)
// (bloc 4 de la spec générique/poids — .vibe/plans/spec-modele-generique-poids.md §2.2)
// Écrit AVANT l'implémentation (TDD-first) — règle 5 de tour-de-main.
// Fonctions pures : aucune DB — les lignes arrivent telles que la requête
// les ramènera (brand null = vrac, nutriments JSONB structure OFF flexible).
//
// Décisions du tech lead (04/10 soir) gravées ici :
// - Q1a : « voir les différents X » vit sur la page niveau 2, section repliable ;
// - Q2b : la fiche détail a sa PAGE dédiée — fondation au bloc 4, enrichie plus tard ;
// - Q3a : « réaffilier » sur chaque ligne de variante ;
// - Q4b : le scan (barcode → variante) est reporté au chantier 4:2.
// ============================================

import { describe, it, expect } from "vitest";

import {
  VariantRawLine,
  VariantLine,
  VariantRawDetails,
  VariantDetails,
  buildVariantLines,
  buildVariantDetails,
} from "../lib/services/VariantViewService";

describe("buildVariantLines — la liste des marques d'un générique", () => {
  it("retourne une liste vide sans erreur", () => {
    expect(buildVariantLines([])).toEqual([]);
  });

  it("donne une étiquette « Sans marque » au vrac (brand null), hasBrand false", () => {
    const raw: VariantRawLine[] = [
      {
        id: "v-vrac",
        brand: null,
        nutriscore: null,
        imageUrl: null,
        openFoodFactsId: null,
        isReadOnly: false,
      },
    ];
    const lines = buildVariantLines(raw);
    expect(lines).toHaveLength(1);
    expect(lines[0].brand).toBeNull();
    expect(lines[0].brandLabel).toBe("Sans marque");
    expect(lines[0].hasBrand).toBe(false);
  });

  it("garde la marque telle quelle quand elle existe", () => {
    const raw: VariantRawLine[] = [
      {
        id: "v-crf",
        brand: "Carrefour",
        nutriscore: "B",
        imageUrl: "https://img/crf.png",
        openFoodFactsId: "3017760000109",
        isReadOnly: true,
      },
    ];
    const lines = buildVariantLines(raw);
    expect(lines[0].brandLabel).toBe("Carrefour");
    expect(lines[0].hasBrand).toBe(true);
    expect(lines[0].nutriscore).toBe("B");
    expect(lines[0].isReadOnly).toBe(true);
  });

  it("trie les marques alphabétiquement (insensible à la casse), le vrac toujours en fin", () => {
    const raw: VariantRawLine[] = [
      { id: "v-lidl", brand: "lidl", nutriscore: null, imageUrl: null, openFoodFactsId: null, isReadOnly: false },
      { id: "v-vrac", brand: null, nutriscore: null, imageUrl: null, openFoodFactsId: null, isReadOnly: false },
      { id: "v-crf", brand: "Carrefour", nutriscore: null, imageUrl: null, openFoodFactsId: null, isReadOnly: false },
      { id: "v-ab", brand: "ab", nutriscore: null, imageUrl: null, openFoodFactsId: null, isReadOnly: false },
    ];
    const lines = buildVariantLines(raw);
    expect(lines.map((l) => l.id)).toEqual(["v-ab", "v-crf", "v-lidl", "v-vrac"]);
  });

  it("normalise le Nutri-Score en majuscule, laisse null à null", () => {
    const raw: VariantRawLine[] = [
      { id: "v-1", brand: "Auchan", nutriscore: "a", imageUrl: null, openFoodFactsId: null, isReadOnly: false },
      { id: "v-2", brand: "Biocoop", nutriscore: null, imageUrl: null, openFoodFactsId: null, isReadOnly: null },
    ];
    const lines = buildVariantLines(raw);
    expect(lines[0].nutriscore).toBe("A");
    expect(lines[1].nutriscore).toBeNull();
    // isReadOnly null (default SQL) → false
    expect(lines[1].isReadOnly).toBe(false);
  });
});

describe("buildVariantDetails — la fiche détail (fondation, enrichie plus tard)", () => {
  const base: VariantRawDetails = {
    id: "v-crf",
    brand: "Carrefour",
    nutriscore: "b",
    imageUrl: "https://img/crf.png",
    openFoodFactsId: "3017760000109",
    isReadOnly: true,
    nutrients: { "energy-kcal_100g": 350, sugars_100g: 2.1 },
    createdAt: new Date("2026-10-04T10:00:00Z"),
    updatedAt: new Date("2026-10-04T12:00:00Z"),
    generic: { id: "dir-riz", name: "Riz" },
  };

  it("porte le générique parent, le Nutri-Score normalisé, le verrou OFF", () => {
    const card: VariantDetails = buildVariantDetails(base);
    expect(card.generic).toEqual({ id: "dir-riz", name: "Riz" });
    expect(card.nutriscore).toBe("B");
    expect(card.hasBrand).toBe(true);
    expect(card.isReadOnly).toBe(true);
  });

  it("passe les nutriments JSONB tels quels, null reste null", () => {
    expect(buildVariantDetails(base).nutrients).toEqual({
      "energy-kcal_100g": 350,
      sugars_100g: 2.1,
    });
    const sansNutriments: VariantRawDetails = { ...base, nutrients: null };
    expect(buildVariantDetails(sansNutriments).nutrients).toBeNull();
  });

  it("sérialise les dates en ISO (le JSON du client ne porte pas de Date)", () => {
    const card = buildVariantDetails(base);
    expect(card.createdAt).toBe("2026-10-04T10:00:00.000Z");
    expect(card.updatedAt).toBe("2026-10-04T12:00:00.000Z");
  });

  it("laisse les dates absentes à null et les chaînes ISO telles quelles", () => {
    const iso: VariantRawDetails = {
      ...base,
      createdAt: null,
      updatedAt: "2026-10-04T12:00:00.000Z",
    };
    const card = buildVariantDetails(iso);
    expect(card.createdAt).toBeNull();
    expect(card.updatedAt).toBe("2026-10-04T12:00:00.000Z");
  });

  it("survit à un générique parent orphelin (jointure null — garde défensive)", () => {
    const orphelin: VariantRawDetails = { ...base, generic: null };
    const card = buildVariantDetails(orphelin);
    expect(card.generic).toBeNull();
  });
});
