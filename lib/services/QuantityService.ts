// ============================================
// QuantityService — conversion, agrégation et affichage des quantités
// Modèle générique/poids — spec gravée le 03/10/2026 (.vibe/plans/spec-modele-generique-poids.md)
//
// Service de fonctions PURES : aucun import DB, aucun réseau. Les unités
// sont passées en entrée telles que le seed les fournit (§3.1), pour que
// la logique de la spec soit testable en isolation (règle 5 de
// tour-de-main). Les services métier qui agrègent des fiches réelles
// chargent les unités de la base et les passent ici.
//
// La vérité reste dans les données saisies : l'agrégation est un calcul
// pur à l'affichage, jamais stockée (§1 de la spec).
// ============================================

// --- Types de la spec ---

// Familles d'unités (§3.1) : masse (base g), volume (base ml),
// discrete (aucune conversion), autre (filet).
export type UnitFamily = "masse" | "volume" | "discrete" | "autre";

// Une unité telle qu'elle vit dans la table `units` après le seed.
export interface QuantityUnit {
  id: string;
  symbol: string;
  family: UnitFamily;
  // Facteur vers l'unité de base de la famille (1 kg = 1000 g).
  // null pour les familles sans conversion (discrete, autre).
  conversionFactor: number | null;
  isBase: boolean;
}

// Une saisie d'ajustement de quantité sur la fiche générique (§3.2) :
// {valeur, unité} libres — « 1 kg », « 750 g », « 2 sachets » —
// avec équivalent optionnel pour les discrets (« 2 sachets de 250 g »).
export interface QuantityEntry {
  value: number;
  unitId: string;
  // Équivalent d'UNE unité discrète (ex. un sachet de 250 g).
  // Présent = le discret rentre dans le total de la famille (§3.3.3).
  equivalentValue?: number | null;
  equivalentUnitId?: string | null;
}

// Un discret intégré au total via son équivalent — retenu pour
// l'affichage « (dont 2 sachets de 250 g) ».
export interface ContributingDiscrete {
  value: number;
  unitId: string;
  equivalentValue: number;
  equivalentUnitId: string;
}

export interface AggregationResult {
  // Totaux par famille convertible, dans l'unité de base
  // (masse en grammes, volume en millilitres).
  totals: Partial<Record<UnitFamily, number>>;
  // Discrets intégrés au total via équivalent connu.
  contributingDiscretes: ContributingDiscrete[];
  // Discrets sans équivalent connu : empilés à côté, jamais dans le total.
  leftovers: { value: number; unitId: string }[];
}

// Préférences d'affichage de l'utilisateur, par famille (§4.2) :
// family → id de l'unité choisie.
export type DisplayPreferences = Partial<Record<UnitFamily, string>>;

// Seuil de lisibilité (§4.1) : une unité n'est proposée au sélecteur
// que si la quantité convertie l'atteint. Réglable sans migration.
export const READABILITY_THRESHOLD = 0.1;

// ============================================
// convertToBase — convertit une valeur vers l'unité de base
// de sa famille. Retourne null si l'unité n'est pas convertible.
// ============================================
export function convertToBase(value: number, unit: QuantityUnit): number | null {
  if (unit.conversionFactor === null) {
    return null;
  }
  return value * unit.conversionFactor;
}

// ============================================
// aggregateQuantities — la règle d'agrégation complète (§3.3)
//
// 1. Chaque quantité est convertie vers l'unité de base de sa famille.
// 2. Tout ce qui est convertible s'additionne dans la base.
// 3. Un discret avec équivalent connu rentre dans le total (composition retenue).
// 4. Un discret sans équivalent s'empile à côté (le moins d'unités possible).
// ============================================
export function aggregateQuantities(
  entries: QuantityEntry[],
  unitsById: Record<string, QuantityUnit>
): AggregationResult {
  const result: AggregationResult = {
    totals: {},
    contributingDiscretes: [],
    leftovers: [],
  };

  for (const entry of entries) {
    const unit = unitsById[entry.unitId];
    if (!unit || !Number.isFinite(entry.value)) {
      continue;
    }

    // Convertible → empilement direct dans l'unité de base (règle 1 et 2).
    const base = convertToBase(entry.value, unit);
    if (base !== null) {
      result.totals[unit.family] = (result.totals[unit.family] ?? 0) + base;
      continue;
    }

    // Discret avec équivalent connu → rentre dans le total de la famille
    // de son équivalent, composition retenue pour les parenthèses (règle 3).
    if (
      entry.equivalentValue != null &&
      entry.equivalentUnitId != null
    ) {
      const equivalentUnit = unitsById[entry.equivalentUnitId];
      const equivalentBase =
        equivalentUnit && equivalentUnit.conversionFactor !== null
          ? entry.equivalentValue * equivalentUnit.conversionFactor
          : null;
      if (equivalentBase !== null && equivalentUnit) {
        result.totals[equivalentUnit.family] =
          (result.totals[equivalentUnit.family] ?? 0) + equivalentBase * entry.value;
        result.contributingDiscretes.push({
          value: entry.value,
          unitId: entry.unitId,
          equivalentValue: entry.equivalentValue,
          equivalentUnitId: entry.equivalentUnitId,
        });
        continue;
      }
    }

    // Discret sans équivalent connu → empilé à côté (règle 4).
    result.leftovers.push({ value: entry.value, unitId: entry.unitId });
  }

  return result;
}

// ============================================
// selectableUnitsFor — seuil de lisibilité (§4.1)
//
// Parmi les unités convertibles de la famille, ne propose que celles
// dont la quantité convertie atteint le seuil : 500 g → g, kg, mg
// proposés, jamais la tonne ; une demi-tonne réelle → tonne proposée.
// Tri par facteur croissant (l'unité la plus fine d'abord).
// ============================================
export function selectableUnitsFor(
  totalInBase: number,
  familyUnits: QuantityUnit[]
): QuantityUnit[] {
  return familyUnits
    .filter((unit) => unit.conversionFactor !== null)
    .filter((unit) => totalInBase / (unit.conversionFactor as number) >= READABILITY_THRESHOLD)
    .sort((a, b) => (a.conversionFactor as number) - (b.conversionFactor as number));
}

// ============================================
// formatQuantity — formate une valeur (déjà en base de famille)
// dans l'unité demandée, à la française : virgule décimale,
// pas de zéro traînant, entiers sans décimales.
// ============================================
export function formatQuantity(valueInBase: number, unit: QuantityUnit): string {
  const factor = unit.conversionFactor ?? 1;
  const converted = valueInBase / factor;
  // Arrondi à 3 décimales, puis affichage propre (0,5 / 5,75 / 1500).
  const rounded = Math.round(converted * 1000) / 1000;
  const text = Number.isInteger(rounded)
    ? String(rounded)
    : String(rounded).replace(".", ",").replace(/,0+$/, "");
  return `${text} ${unit.symbol}`;
}

// ============================================
// formatAggregation — l'affichage complet de la fiche générique
//
// - Une seule quantité par famille convertible, dans l'unité préférée
//   de l'utilisateur (repli sur l'unité de base si la préférence ne
//   passe pas le seuil).
// - La composition des discrets intégrés entre parenthèses :
//   « 500 g (dont 2 sachets de 250 g) ».
// - Les discrets sans équivalent empilés après, un segment par unité,
//   compressés au maximum : « 1500 g + 2 sachets ».
// ============================================
export function formatAggregation(
  result: AggregationResult,
  unitsById: Record<string, QuantityUnit>,
  preferences: DisplayPreferences
): string {
  const segments: string[] = [];

  // Familles convertibles, dans l'ordre stable de la spec (masse puis volume).
  const convertibleFamilies: UnitFamily[] = ["masse", "volume"];

  for (const family of convertibleFamilies) {
    const total = result.totals[family];
    if (!total) {
      continue;
    }

    // Unité d'affichage : la préférence de l'utilisateur si elle passe
    // le seuil, sinon l'unité de base de la famille.
    const familyUnits = Object.values(unitsById).filter((u) => u.family === family);
    const selectable = selectableUnitsFor(total, familyUnits);
    const preferred = preferences[family]
      ? selectable.find((u) => u.id === preferences[family])
      : undefined;
    const displayUnit =
      preferred ?? familyUnits.find((u) => u.isBase) ?? familyUnits[0];
    if (!displayUnit) {
      continue;
    }

    let segment = formatQuantity(total, displayUnit);

    // Composition des discrets intégrés au total de cette famille.
    const contributing = result.contributingDiscretes.filter((c) => {
      const equivalentUnit = unitsById[c.equivalentUnitId];
      return equivalentUnit && equivalentUnit.family === family;
    });
    if (contributing.length > 0) {
      const composition = contributing
        .map((c) => {
          const discreteUnit = unitsById[c.unitId];
          const equivalentUnit = unitsById[c.equivalentUnitId];
          const discreteLabel = `${c.value} ${discreteUnit ? discreteUnit.symbol : ""}${c.value > 1 ? "s" : ""}`;
          return equivalentUnit
            ? `${discreteLabel} de ${formatQuantity(c.equivalentValue, equivalentUnit)}`
            : discreteLabel;
        })
        .join(" et ");
      segment += ` (dont ${composition})`;
    }

    segments.push(segment);
  }

  // Discrets sans équivalent : un segment par unité, compressés
  // (somme des valeurs d'une même unité).
  const leftoverTotals = new Map<string, number>();
  for (const leftover of result.leftovers) {
    leftoverTotals.set(leftover.unitId, (leftoverTotals.get(leftover.unitId) ?? 0) + leftover.value);
  }
  for (const [unitId, value] of leftoverTotals) {
    const unit = unitsById[unitId];
    segments.push(`${value} ${unit ? unit.symbol : unitId}${value > 1 ? "s" : ""}`);
  }

  return segments.join(" + ");
}
