// ============================================
// StockViewService — la vue principale en fiches génériques (bloc 3)
// Modèle générique/poids — spec gravée le 03/10/2026 (.vibe/plans/spec-modele-generique-poids.md)
//
// Partie PURE de la construction de la vue : les lignes d'instance
// (une par sachet/ajout, `object_installation`), les unités et les
// préférences d'affichage arrivent en entrée telles que la requête les
// charge ; buildGenericCards groupe, agrège via QuantityService (§3.3)
// et formate (§4). Aucune DB ici — la logique de la spec reste testable
// en isolation (règle 5 de tour-de-main).
//
// Décisions du tech lead du 03/10 soir, gravées :
// - Q1a : une fiche par générique GLOBAL, toutes installations confondues ;
// - le détail de la fiche liste ses lignes d'instance (une par sachet),
//   chacune porte ses données locales (§6) : péremption, emplacement, prix ;
// - legacy : l'entier quantity devient N × legacyUnit (« unité » discret),
//   empilé à côté (§3.3.4) jusqu'à la bascule de la saisie au bloc 5.
// ============================================

import {
  AggregationResult,
  DisplayPreferences,
  QuantityEntry,
  QuantityUnit,
  UnitFamily,
  aggregateQuantities,
  formatAggregation,
} from "./QuantityService";

// --------------------------------------------
// Types d'entrée : une ligne d'instance (§6 — les données locales)
// --------------------------------------------

// Une ligne d'instance telle que la requête la ramène (une par sachet).
export interface StockLineInput {
  id: string;
  installationId: string;
  installationName: string;
  // Legacy (bloc 2) : entier, interprété comme N × legacyUnit.
  quantity: number;
  // Moderne (§3.2) : {valeur, unité} libres + équivalent optionnel.
  quantityValue: number | null;
  quantityUnitId: string | null;
  equivalentValue: number | null;
  equivalentUnitId: string | null;
  location: string | null;
  purchaseDate: Date | null;
  expiryDate: Date | null;
  price: number | null; // centimes
  note: string | null;
  shopId: string | null;
  addedDate: Date | null;
  hasEditPermission: boolean; // rôle de l'utilisateur dans l'installation
}

// Une ligne d'instance + les champs de la fiche générique (directory).
export interface StockRowInput extends StockLineInput {
  directoryId: string;
  directoryName: string;
  categoryId: string | null;
  // L'étalon du générique (§2.1) : la famille dans laquelle il se compte.
  // Null pour les fiches antérieures au bloc 2.
  unitFamily: UnitFamily | null;
}

// --------------------------------------------
// Types de sortie : la fiche générique affichable
// --------------------------------------------

// Une ligne d'instance enrichie pour l'affichage du détail de la fiche.
export interface StockLine extends StockLineInput {
  // Le conditionnement de CETTE ligne, formaté pour l'affichage :
  // « 2 sachets (de 250 g) » — « 3 unités » en legacy.
  quantityLabel: string;
}

// La carte générique de la vue principale (§2.1) : sans marque,
// elle porte l'empilement des quantités de toutes ses lignes,
// toutes installations confondues (Q1a).
export interface GenericStockCard {
  id: string; // = directoryId
  name: string;
  category: string | null;
  unitFamily: UnitFamily | null;
  // L'agrégat formaté (§3.3 + §4) : « 1500 g (dont 2 sachets de 250 g) + 1 sachet ».
  quantityLabel: string;
  // L'agrégat brut, pour le tri par quantité par famille (Q4).
  aggregation: AggregationResult;
  // Les lignes d'instance, triées : péremption croissante (sans-date à la fin), puis ancienneté.
  lines: StockLine[];
  // La péremption la plus proche de la fiche (null si aucune ligne datée).
  nearestExpiryDate: Date | null;
  // Les installations qui portent ce générique (ordre d'apparition).
  installations: { id: string; name: string }[];
  // Éditable si au moins une installation de la fiche l'est.
  hasEditPermission: boolean;
  // Valeur totale en centimes : legacy = prix unitaire × quantité,
  // moderne = prix payé de la ligne.
  totalValue: number;
}

// --------------------------------------------
// lineQuantityLabel — le conditionnement d'une ligne, formaté
// --------------------------------------------

// Le pluriel ne s'applique qu'aux unités discrètes (« 2 sachets »),
// jamais aux unités de mesure (« 2 kg », « 250 g » — pas de « kgs »).
function pluralFor(
  unitId: string,
  value: number,
  unitsById: Record<string, QuantityUnit>
): string {
  const unit = unitsById[unitId];
  if (unit && unit.conversionFactor !== null) {
    return "";
  }
  return value > 1 ? "s" : "";
}

function lineQuantityLabel(
  line: StockLineInput,
  unitsById: Record<string, QuantityUnit>,
  legacyUnit: QuantityUnit
): string {
  // Saisie moderne (§3.2) : {valeur, unité} + équivalent optionnel.
  if (line.quantityValue != null && line.quantityUnitId != null) {
    const unit = unitsById[line.quantityUnitId];
    const symbol = unit ? unit.symbol : line.quantityUnitId;
    let label = `${line.quantityValue} ${symbol}${pluralFor(line.quantityUnitId, line.quantityValue, unitsById)}`;
    if (line.equivalentValue != null && line.equivalentUnitId != null) {
      const eqUnit = unitsById[line.equivalentUnitId];
      const eqSymbol = eqUnit ? eqUnit.symbol : line.equivalentUnitId;
      label += ` (de ${line.equivalentValue} ${eqSymbol}${pluralFor(line.equivalentUnitId, line.equivalentValue, unitsById)})`;
    }
    return label;
  }

  // Legacy : l'entier se projette en unités discrètes (§3.3.4).
  return `${line.quantity} ${legacyUnit.symbol}${line.quantity > 1 ? "s" : ""}`;
}

// --------------------------------------------
// buildGenericCards — groupement par générique + agrégation + formatage
//
// Retour : une carte par générique, dans l'ordre de première apparition
// de ses lignes. Le tri final des cartes (péremption, quantité par
// famille sélectionnée — Q4) appartient à l'appelant.
// --------------------------------------------
export function buildGenericCards(
  rows: StockRowInput[],
  unitsById: Record<string, QuantityUnit>,
  preferences: DisplayPreferences,
  legacyUnit: QuantityUnit
): GenericStockCard[] {
  // Groupement par générique, ordre de première apparition préservé.
  const groups = new Map<string, StockRowInput[]>();
  for (const row of rows) {
    const group = groups.get(row.directoryId);
    if (group) {
      group.push(row);
    } else {
      groups.set(row.directoryId, [row]);
    }
  }

  const cards: GenericStockCard[] = [];

  for (const [directoryId, groupRows] of groups) {
    const first = groupRows[0];

    // Chaque ligne devient une entrée d'ajustement (§3.2) : la saisie
    // moderne si elle existe, sinon l'entier legacy en discret. La vérité
    // reste dans les saisies — l'agrégat ne se stocke jamais (§8).
    const entries: QuantityEntry[] = [];
    let totalValue = 0;
    const lines: StockLine[] = groupRows.map((row) => {
      if (row.quantityValue != null && row.quantityUnitId != null) {
        entries.push({
          value: row.quantityValue,
          unitId: row.quantityUnitId,
          equivalentValue: row.equivalentValue,
          equivalentUnitId: row.equivalentUnitId,
        });
        // Moderne : le prix payé de la ligne.
        totalValue += row.price ?? 0;
      } else if (row.quantity > 0) {
        entries.push({ value: row.quantity, unitId: legacyUnit.id });
        // Legacy : prix unitaire × quantité (sémantique de l'existant).
        totalValue += (row.price ?? 0) * row.quantity;
      }
      return {
        ...row,
        quantityLabel: lineQuantityLabel(row, unitsById, legacyUnit),
      };
    });

    // Agrégation pure (§3.3) puis affichage selon les préférences (§4).
    const aggregation = aggregateQuantities(entries, unitsById);
    const quantityLabel = formatAggregation(aggregation, unitsById, preferences);

    // Lignes du détail : péremption croissante, sans-date à la fin,
    // puis ancienneté d'ajout.
    const sortedLines = [...lines].sort((a, b) => {
      const ae = a.expiryDate ? a.expiryDate.getTime() : null;
      const be = b.expiryDate ? b.expiryDate.getTime() : null;
      if (ae !== be) {
        if (ae === null) return 1;
        if (be === null) return -1;
        return ae - be;
      }
      const aa = a.addedDate ? a.addedDate.getTime() : 0;
      const ab = b.addedDate ? b.addedDate.getTime() : 0;
      return aa - ab;
    });

    // La péremption de la fiche = celle de sa ligne la plus proche.
    // Les lignes datées étant triées devant, la première porte la réponse.
    const nearestExpiryDate = sortedLines[0]?.expiryDate ?? null;

    // Installations du générique, uniques, ordre de première apparition.
    const installations: { id: string; name: string }[] = [];
    const seen = new Set<string>();
    for (const row of groupRows) {
      if (!seen.has(row.installationId)) {
        seen.add(row.installationId);
        installations.push({ id: row.installationId, name: row.installationName });
      }
    }

    cards.push({
      id: directoryId,
      name: first.directoryName,
      category: first.categoryId,
      unitFamily: first.unitFamily,
      quantityLabel,
      aggregation,
      lines: sortedLines,
      nearestExpiryDate,
      installations,
      hasEditPermission: groupRows.some((row) => row.hasEditPermission),
      totalValue,
    });
  }

  return cards;
}
