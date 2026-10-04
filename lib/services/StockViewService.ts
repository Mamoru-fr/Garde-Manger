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

// --------------------------------------------
// Helpers du niveau 1 (round 3) — dérivation de
// la barre de filtres depuis les cartes : les
// pages serveur et le client (après fetch) en ont
// tous deux besoin, la logique vit ici, une fois.
// --------------------------------------------

// Les installations qui portent au moins une fiche, sans doublon,
// ordre de première apparition.
export function uniqueInstallationsFromCards(
  cards: GenericStockCard[]
): { id: string; name: string }[] {
  const acc: { id: string; name: string }[] = [];
  for (const card of cards) {
    for (const installation of card.installations) {
      if (!acc.some((i) => i.id === installation.id)) {
        acc.push({ id: installation.id, name: installation.name });
      }
    }
  }
  return acc;
}

// Les catégories portées par au moins une fiche, sans doublon —
// les fiches sans catégorie ne produisent pas d'option vide.
export function uniqueCategoriesFromCards(
  cards: GenericStockCard[]
): { id: string; name: string }[] {
  const acc: { id: string; name: string }[] = [];
  for (const card of cards) {
    if (card.category && !acc.some((c) => c.id === card.category)) {
      acc.push({ id: card.category, name: card.category });
    }
  }
  return acc;
}

// --------------------------------------------
// Niveau 2 de la pyramide (décision Alexis 04/10) — l'encadré
// « quantité par installation » de la fiche générique globale :
// une ligne par installation porteuse, quantité dans l'installation,
// péremption la plus proche de l'installation.
//
// Pur, comme tout ce fichier : la carte arrive construite par
// buildGenericCards, on n'y redit que ce que la fiche globale ne
// dit pas — le détail PAR installation. Le piège de l'agrégat
// s'applique ici aussi : la quantité d'une installation ne se
// déduit JAMAIS du global, elle se calcule sur SES lignes seules.
// --------------------------------------------

// Une ligne de l'encadré « quantité par installation ».
export interface InstallationBreakdownEntry {
  installationId: string;
  installationName: string;
  // L'agrégat local formaté (§3.3 + §4) : les saisies de cette
  // installation uniquement — jamais une part du global.
  quantityLabel: string;
  // La péremption la plus proche PARMI les lignes de l'installation.
  nearestExpiryDate: Date | null;
  linesCount: number;
  // L'installation est éditable si une de ses lignes l'est.
  hasEditPermission: boolean;
}

export function buildInstallationBreakdown(
  card: GenericStockCard,
  unitsById: Record<string, QuantityUnit>,
  preferences: DisplayPreferences,
  legacyUnit: QuantityUnit
): InstallationBreakdownEntry[] {
  const entries: InstallationBreakdownEntry[] = [];

  // Ordre de première apparition de la fiche (card.installations).
  for (const installation of card.installations) {
    const lines = card.lines.filter(
      (line) => line.installationId === installation.id
    );
    if (lines.length === 0) {
      continue; // défensif : une installation porteuse a toujours des lignes
    }

    // Les entrées d'ajustement de CETTE installation (§3.2) : la saisie
    // moderne si elle existe, sinon l'entier legacy projeté en discret
    // (§3.3.4) — la même règle que buildGenericCards, zéro divergence.
    const quantityEntries: QuantityEntry[] = [];
    for (const line of lines) {
      if (line.quantityValue != null && line.quantityUnitId != null) {
        quantityEntries.push({
          value: line.quantityValue,
          unitId: line.quantityUnitId,
          equivalentValue: line.equivalentValue,
          equivalentUnitId: line.equivalentUnitId,
        });
      } else if (line.quantity > 0) {
        quantityEntries.push({ value: line.quantity, unitId: legacyUnit.id });
      }
    }

    const aggregation = aggregateQuantities(quantityEntries, unitsById);
    const quantityLabel = formatAggregation(aggregation, unitsById, preferences);

    // La péremption de l'installation = la plus proche de SES lignes
    // (card.lines est triée péremption croissante, sans-date en fin —
    // la première ligne datée de l'installation porte la réponse).
    let nearestExpiryDate: Date | null = null;
    for (const line of lines) {
      if (line.expiryDate) {
        nearestExpiryDate = line.expiryDate;
        break;
      }
    }

    entries.push({
      installationId: installation.id,
      installationName: installation.name,
      quantityLabel,
      nearestExpiryDate,
      linesCount: lines.length,
      hasEditPermission: lines.some((line) => line.hasEditPermission),
    });
  }

  return entries;
}

// --------------------------------------------
// buildInstallationDetailRows — les sachets d'une installation
// (niveau 3 de la pyramide — décision Alexis 04/10)
//
// Pur, comme tout ce fichier : la carte arrive déjà construite par
// buildGenericCards dans un périmètre réduit à CETTE installation,
// ses lignes sont donc exactement les sachets à lister. On relit
// chaque ligne et on calcule par ligne ce que l'affichage réclame :
// le statut du badge de péremption. On ne re-trie PAS — l'ordre de
// la vue (péremption croissante, sans-date en fin, puis ancienneté)
// fait foi. Le label de conditionnement est RECOPIÉ, jamais
// recalculé : la vue l'a déjà formaté avec les mêmes unités (§4).
// --------------------------------------------

// Une ligne du détail : un sachet de l'installation, prêt à afficher.
export interface InstallationDetailRow {
  // = objectInstallationId : l'identité de la ligne pour éditer/supprimer.
  id: string;
  // Le conditionnement formaté par la vue : « 2 sachets (de 250 g) ».
  quantityLabel: string;
  location: string | null;
  purchaseDate: Date | null;
  expiryDate: Date | null;
  price: number | null; // centimes
  note: string | null;
  addedDate: Date | null;
  // Pour l'ExpiryBadge — calculé ici, la page reste muette.
  daysUntilExpiry: number | null;
  expiryStatus: ExpiryStatus;
  // PAR LIGNE : le rôle de l'utilisateur dans l'installation porteuse.
  hasEditPermission: boolean;
}

export function buildInstallationDetailRows(
  card: GenericStockCard
): InstallationDetailRow[] {
  return card.lines.map((line) => {
    const daysUntilExpiry = calculateDaysUntilExpiry(line.expiryDate);
    return {
      id: line.id,
      quantityLabel: line.quantityLabel,
      location: line.location,
      purchaseDate: line.purchaseDate,
      expiryDate: line.expiryDate,
      price: line.price,
      note: line.note,
      addedDate: line.addedDate,
      daysUntilExpiry,
      expiryStatus: getExpiryStatus(daysUntilExpiry),
      hasEditPermission: line.hasEditPermission,
    };
  });
}

// --------------------------------------------
// Helpers de péremption — calculs de vue, purs.
// (Déplacés depuis StockActions le 03/10 : les calculs de vue de stock
// vivent dans le service, les actions délèguent — règle des couches.)
// --------------------------------------------

// Calcule les jours restants jusqu'à la date de péremption.
export function calculateDaysUntilExpiry(expiryDate: Date | null): number | null {
  if (!expiryDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);

  const diffTime = expiry.getTime() - today.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

// Statut de péremption selon les jours restants (seuils de l'existant).
export type ExpiryStatus = "normal" | "warning" | "urgent" | "expired" | "no_date";

export function getExpiryStatus(daysUntilExpiry: number | null): ExpiryStatus {
  if (daysUntilExpiry === null) return "no_date";
  if (daysUntilExpiry < 0) return "expired";
  if (daysUntilExpiry <= 3) return "urgent";
  if (daysUntilExpiry <= 7) return "warning";
  return "normal";
}
