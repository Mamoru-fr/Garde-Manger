// ============================================
// Test du StockViewService — vue principale en fiches génériques
// (bloc 3 de la spec générique/poids — .vibe/plans/spec-modele-generique-poids.md)
// Écrit AVANT l'implémentation (TDD-first) — règle 5 de tour-de-main.
// Fonctions pures : aucune DB — les lignes arrivent telles que la requête
// les ramènera, les unités telles que le seed les fournit (§3.1).
//
// Décisions du tech lead (03/10 soir) gravées ici :
// - Q1a : une fiche par générique GLOBAL, toutes installations confondues ;
// - le détail de la fiche liste ses lignes d'instance (une par sachet) ;
// - legacy : l'entier quantity devient N × « unité » discret (§3.3.4),
//   jusqu'à la bascule de la saisie au bloc 5.
// ============================================

import { describe, it, expect } from "vitest";

import {
  QuantityUnit,
  DisplayPreferences,
} from "../lib/services/QuantityService";
import {
  StockRowInput,
  buildGenericCards,
  uniqueInstallationsFromCards,
  uniqueCategoriesFromCards,
  buildInstallationBreakdown,
} from "../lib/services/StockViewService";

// ---- Les unités du seed, en mémoire (§3.1 de la spec) ----
const units: Record<string, QuantityUnit> = {
  g: { id: "g", symbol: "g", family: "masse", conversionFactor: 1, isBase: true },
  kg: { id: "kg", symbol: "kg", family: "masse", conversionFactor: 1000, isBase: false },
  t: { id: "t", symbol: "t", family: "masse", conversionFactor: 1000000, isBase: false },
  ml: { id: "ml", symbol: "ml", family: "volume", conversionFactor: 1, isBase: true },
  l: { id: "l", symbol: "L", family: "volume", conversionFactor: 1000, isBase: false },
  unite: { id: "unite", symbol: "unité", family: "discrete", conversionFactor: null, isBase: false },
  sachet: { id: "sachet", symbol: "sachet", family: "discrete", conversionFactor: null, isBase: false },
  boite: { id: "boite", symbol: "boîte", family: "discrete", conversionFactor: null, isBase: false },
};

// L'unité discrète canonique vers laquelle l'entier legacy se projette.
const legacyUnit = units.unite;

const noPrefs: DisplayPreferences = {};

// ---- Fabrique de lignes : une ligne d'instance, valeurs par défaut saines ----
const makeRow = (over: Partial<StockRowInput> = {}): StockRowInput => ({
  id: "line-1",
  installationId: "inst-1",
  installationName: "Cuisine",
  quantity: 1,
  quantityValue: null,
  quantityUnitId: null,
  equivalentValue: null,
  equivalentUnitId: null,
  location: null,
  purchaseDate: null,
  expiryDate: null,
  price: null,
  note: null,
  shopId: null,
  addedDate: new Date("2026-01-01T00:00:00Z"),
  hasEditPermission: true,
  directoryId: "gen-riz",
  directoryName: "Riz",
  categoryId: "epicerie",
  unitFamily: "masse",
  ...over,
});

// ============================================
// buildGenericCards — groupement par générique + agrégation + affichage
// ============================================
describe("buildGenericCards — la fiche générique (bloc 3)", () => {
  it("regroupe les lignes par générique et agrège le legacy en unités discrètes (§3.3.4)", () => {
    const cards = buildGenericCards(
      [
        makeRow({ id: "l1", quantity: 2 }),
        makeRow({ id: "l2", quantity: 3 }),
      ],
      units,
      noPrefs,
      legacyUnit
    );

    expect(cards).toHaveLength(1);
    expect(cards[0].id).toBe("gen-riz");
    expect(cards[0].name).toBe("Riz");
    expect(cards[0].quantityLabel).toBe("5 unités");
    expect(cards[0].lines).toHaveLength(2);
  });

  it("affiche l'agrégat complet §3.3 : convertible + discret avec équivalent + discret sans équivalent", () => {
    // 1 kg en vrac + 2 sachets de 250 g + 1 sachet sans équivalent connu
    const cards = buildGenericCards(
      [
        makeRow({ id: "l1", quantityValue: 1, quantityUnitId: "kg" }),
        makeRow({
          id: "l2",
          quantityValue: 2,
          quantityUnitId: "sachet",
          equivalentValue: 250,
          equivalentUnitId: "g",
        }),
        makeRow({ id: "l3", quantityValue: 1, quantityUnitId: "sachet" }),
      ],
      units,
      noPrefs,
      legacyUnit
    );

    expect(cards[0].quantityLabel).toBe(
      "1500 g (dont 2 sachets de 250 g) + 1 sachet"
    );
    expect(cards[0].aggregation.totals.masse).toBe(1500);
  });

  it("respecte la préférence d'affichage par famille (§4.2) et replie sur la base sous le seuil (§4.1)", () => {
    const rows = [
      makeRow({ id: "l1", quantityValue: 1, quantityUnitId: "kg" }),
      makeRow({ id: "l2", quantityValue: 500, quantityUnitId: "g" }),
    ];

    // Préférence kg → « 1,5 kg »
    const withKg = buildGenericCards(rows, units, { masse: "kg" }, legacyUnit);
    expect(withKg[0].quantityLabel).toBe("1,5 kg");

    // Préférence tonne : 1500 g = 0,0015 t < seuil 0,1 → repli sur la base
    const withTonne = buildGenericCards(rows, units, { masse: "t" }, legacyUnit);
    expect(withTonne[0].quantityLabel).toBe("1500 g");
  });

  it("sépare deux génériques en deux cartes", () => {
    const cards = buildGenericCards(
      [
        makeRow({ id: "l1", directoryId: "gen-riz", directoryName: "Riz", quantityValue: 1, quantityUnitId: "kg" }),
        makeRow({ id: "l2", directoryId: "gen-pates", directoryName: "Pâtes", quantityValue: 500, quantityUnitId: "g" }),
      ],
      units,
      noPrefs,
      legacyUnit
    );

    expect(cards).toHaveLength(2);
    expect(cards.map((c) => c.name)).toEqual(["Riz", "Pâtes"]);
    // Sans préférence, l'agrégat s'affiche dans l'unité de base : 1000 g.
    expect(cards[0].quantityLabel).toBe("1000 g");
    expect(cards[1].quantityLabel).toBe("500 g");
  });

  it("la saisie moderne prime sur l'entier legacy quand elle existe", () => {
    // Ligne créée par le futur bloc 5 : quantity=7 (legacy ignoré), 500 g saisis
    const cards = buildGenericCards(
      [makeRow({ id: "l1", quantity: 7, quantityValue: 500, quantityUnitId: "g" })],
      units,
      noPrefs,
      legacyUnit
    );

    expect(cards[0].quantityLabel).toBe("500 g");
    expect(cards[0].aggregation.totals.masse).toBe(500);
  });

  it("porte la péremption la plus proche et trie les lignes : péremption croissante, sans-date à la fin", () => {
    const d1 = new Date("2026-12-01T00:00:00Z");
    const d2 = new Date("2026-11-15T00:00:00Z");
    const cards = buildGenericCards(
      [
        makeRow({ id: "l1", expiryDate: d1 }),
        makeRow({ id: "l2", expiryDate: null }),
        makeRow({ id: "l3", expiryDate: d2 }),
      ],
      units,
      noPrefs,
      legacyUnit
    );

    expect(cards[0].nearestExpiryDate?.getTime()).toBe(d2.getTime());
    expect(cards[0].lines.map((l) => l.id)).toEqual(["l3", "l1", "l2"]);
  });

  it("fusionne les installations d'un même générique global (Q1a), badge en ordre d'apparition", () => {
    const cards = buildGenericCards(
      [
        makeRow({ id: "l1", installationId: "inst-2", installationName: "Garde-manger" }),
        makeRow({ id: "l2", installationId: "inst-1", installationName: "Cuisine" }),
        makeRow({ id: "l3", installationId: "inst-2", installationName: "Garde-manger" }),
      ],
      units,
      noPrefs,
      legacyUnit
    );

    expect(cards).toHaveLength(1);
    expect(cards[0].installations).toEqual([
      { id: "inst-2", name: "Garde-manger" },
      { id: "inst-1", name: "Cuisine" },
    ]);
  });

  it("la fiche est éditable si au moins une ligne l'est", () => {
    const cards = buildGenericCards(
      [
        makeRow({ id: "l1", hasEditPermission: false }),
        makeRow({ id: "l2", hasEditPermission: false }),
        makeRow({ id: "l3", hasEditPermission: true }),
      ],
      units,
      noPrefs,
      legacyUnit
    );

    expect(cards[0].hasEditPermission).toBe(true);
  });

  it("calcule la valeur : legacy prix unitaire × quantité, moderne prix payé de la ligne", () => {
    const cards = buildGenericCards(
      [
        // legacy : 2 unités à 1,50 € l'unité = 300 centimes
        makeRow({ id: "l1", quantity: 2, price: 150 }),
        // moderne : un achat de 2,00 € = 200 centimes
        makeRow({ id: "l2", quantityValue: 1, quantityUnitId: "sachet", price: 200 }),
      ],
      units,
      noPrefs,
      legacyUnit
    );

    expect(cards[0].totalValue).toBe(500);
  });

  it("porte l'étalon du générique, même null (fiche antérieure au bloc 2)", () => {
    const cards = buildGenericCards(
      [makeRow({ id: "l1", unitFamily: null })],
      units,
      noPrefs,
      legacyUnit
    );

    expect(cards[0].unitFamily).toBeNull();
    // L'agrégation ne dépend pas de l'étalon : elle convertit par famille
    // des unités SAISIES, l'étalon ne servira qu'à la saisie (bloc 5).
  });

  it("une ligne sans aucune quantité : aucune entrée, label vide, ligne conservée", () => {
    const cards = buildGenericCards(
      [makeRow({ id: "l1", quantity: 0 })],
      units,
      noPrefs,
      legacyUnit
    );

    expect(cards[0].quantityLabel).toBe("");
    expect(cards[0].lines).toHaveLength(1);
  });

  it("le label de chaque ligne porte son conditionnement : moderne avec équivalent, sinon legacy", () => {
    const cards = buildGenericCards(
      [
        makeRow({
          id: "l1",
          quantityValue: 2,
          quantityUnitId: "sachet",
          equivalentValue: 250,
          equivalentUnitId: "g",
        }),
        makeRow({ id: "l2", quantity: 3 }),
        makeRow({ id: "l3", quantityValue: 2, quantityUnitId: "kg" }),
      ],
      units,
      noPrefs,
      legacyUnit
    );

    const byId = new Map(cards[0].lines.map((l) => [l.id, l]));
    expect(byId.get("l1")?.quantityLabel).toBe("2 sachets (de 250 g)");
    expect(byId.get("l2")?.quantityLabel).toBe("3 unités");
    // Les unités de mesure ne prennent jamais le pluriel : « 2 kg », pas « 2 kgs ».
    expect(byId.get("l3")?.quantityLabel).toBe("2 kg");
  });
});

// ============================================
// Helpers du niveau 1 (round 3) — dérivation
// des installations et catégories à partir des
// cartes, pour la barre de filtres côté page
// (SSR) comme côté client (après fetch API).
// ============================================
describe("helpers de la vue niveau 1 — installations et catégories uniques", () => {
  const cards = buildGenericCards(
    [
      makeRow({
        id: "l1",
        installationId: "inst-1",
        installationName: "Cuisine",
      }),
      makeRow({
        id: "l2",
        installationId: "inst-2",
        installationName: "Cave",
      }),
      makeRow({
        id: "l3",
        installationId: "inst-1",
        installationName: "Cuisine",
      }),
      makeRow({
        id: "l4",
        directoryId: "gen-huile",
        directoryName: "Huile d'olive",
        categoryId: null,
        unitFamily: "volume",
      }),
    ],
    units,
    noPrefs,
    legacyUnit
  );

  it("uniqueInstallationsFromCards déduit les installations sans doublon, ordre de première apparition", () => {
    const installations = uniqueInstallationsFromCards(cards);
    expect(installations).toEqual([
      { id: "inst-1", name: "Cuisine" },
      { id: "inst-2", name: "Cave" },
    ]);
  });

  it("uniqueCategoriesFromCards déduit les catégories uniques et ignore les fiches sans catégorie", () => {
    const categories = uniqueCategoriesFromCards(cards);
    expect(categories).toEqual([{ id: "epicerie", name: "epicerie" }]);
  });

  it("sur un stock vide, les deux dérivations renvoient des listes vides", () => {
    expect(uniqueInstallationsFromCards([])).toEqual([]);
    expect(uniqueCategoriesFromCards([])).toEqual([]);
  });
});

// ============================================
// buildInstallationBreakdown — l'encadré « quantité
// par installation » de la fiche générique globale
// (niveau 2 de la pyramide, décision Alexis 04/10 :
// une ligne par installation : quantité dans
// l'installation, péremption la plus proche).
// ============================================
describe("buildInstallationBreakdown — la quantité par installation (niveau 2)", () => {
  const card = buildGenericCards(
    [
      // Cuisine : 500 g + 500 g modernes → 1000 g, deux dates, éditable.
      makeRow({
        id: "l1",
        installationId: "inst-1",
        installationName: "Cuisine",
        quantityValue: 500,
        quantityUnitId: "g",
        expiryDate: new Date("2026-10-10T00:00:00Z"),
      }),
      makeRow({
        id: "l2",
        installationId: "inst-1",
        installationName: "Cuisine",
        quantityValue: 500,
        quantityUnitId: "g",
        expiryDate: new Date("2026-11-01T00:00:00Z"),
      }),
      // Cave : legacy 2 unités, sans date, viewer.
      makeRow({
        id: "l3",
        installationId: "inst-2",
        installationName: "Cave",
        quantity: 2,
        hasEditPermission: false,
      }),
    ],
    units,
    noPrefs,
    legacyUnit
  )[0];

  it("une ligne par installation porteuse, dans l'ordre d'apparition de la fiche", () => {
    const breakdown = buildInstallationBreakdown(card, units, noPrefs, legacyUnit);
    expect(breakdown.map((b) => b.installationName)).toEqual(["Cuisine", "Cave"]);
  });

  it("l'agrégat local ne compte que les lignes de CETTE installation (jamais le global)", () => {
    const breakdown = buildInstallationBreakdown(card, units, noPrefs, legacyUnit);
    expect(breakdown[0].quantityLabel).toBe("1000 g");
    expect(breakdown[1].quantityLabel).toBe("2 unités");
  });

  it("respecte la préférence d'affichage par famille (§4.2) dans l'agrégat local", () => {
    const breakdown = buildInstallationBreakdown(card, units, { ...noPrefs, masse: "kg" } as DisplayPreferences, legacyUnit);
    expect(breakdown[0].quantityLabel).toBe("1 kg");
  });

  it("la péremption la plus proche de l'installation, null si aucune ligne datée", () => {
    const breakdown = buildInstallationBreakdown(card, units, noPrefs, legacyUnit);
    expect(breakdown[0].nearestExpiryDate?.getTime()).toBe(
      new Date("2026-10-10T00:00:00Z").getTime()
    );
    expect(breakdown[1].nearestExpiryDate).toBeNull();
  });

  it("compte les lignes et l'installation est éditable si une de ses lignes l'est", () => {
    const breakdown = buildInstallationBreakdown(card, units, noPrefs, legacyUnit);
    expect(breakdown[0].linesCount).toBe(2);
    expect(breakdown[0].hasEditPermission).toBe(true);
    expect(breakdown[1].linesCount).toBe(1);
    expect(breakdown[1].hasEditPermission).toBe(false);
  });

  it("sur une carte sans lignes, l'encadré est vide (défensif)", () => {
    expect(buildInstallationBreakdown(card, units, noPrefs, legacyUnit).length).toBe(2);
    expect(
      buildInstallationBreakdown({ ...card, lines: [] }, units, noPrefs, legacyUnit)
    ).toEqual([]);
  });
});
