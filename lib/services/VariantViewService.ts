// ============================================
// VariantViewService — les variantes (marques) d'un générique (bloc 4)
// Modèle générique/poids — spec gravée le 03/10/2026 (.vibe/plans/spec-modele-generique-poids.md §2.2)
//
// Partie PURE de la vue variantes : les lignes arrivent en entrée telles
// que la requête les charge (product_variants, brand null = vrac,
// nutriments JSONB structure OFF flexible — §8). Aucune DB ici —
// la logique reste testable en isolation (règle 5 de tour-de-main).
//
// Décisions du tech lead du 04/10 soir, gravées :
// - Q2b : la fiche détail variante a sa PAGE dédiée — fondation au bloc 4,
//   enrichie plus tard (nutriments déjà portés, affichage à venir) ;
// - Q3a : chaque ligne de variante portera un bouton « réaffilier » (R3) —
//   la ligne expose donc déjà isReadOnly pour verrouiller l'UI si besoin ;
// - Q4b : le scan (barcode → variante) est reporté au chantier 4:2.
// ============================================

// --------------------------------------------
// Types d'entrée : une ligne de variante telle que la requête la ramène
// --------------------------------------------

// Ligne brute de la liste (colonnes de la table product_variants).
export interface VariantRawLine {
  id: string;
  brand: string | null; // null = vrac (« Sans marque »)
  nutriscore: string | null;
  imageUrl: string | null;
  openFoodFactsId: string | null;
  isReadOnly: boolean | null; // default SQL → null possible
}

// Ligne de la liste prête à afficher.
export interface VariantLine {
  id: string;
  brand: string | null;
  brandLabel: string; // brand ou « Sans marque »
  hasBrand: boolean;
  nutriscore: string | null; // normalisé en MAJUSCULE
  imageUrl: string | null;
  openFoodFactsId: string | null;
  isReadOnly: boolean; // null → false
}

// Variante brute de la fiche détail (+ jointure parent + horodatages).
export interface VariantRawDetails extends VariantRawLine {
  nutrients: unknown; // JSONB, structure OFF flexible (§8)
  createdAt: unknown;
  updatedAt: unknown;
  generic: { id: string; name: string } | null; // innerJoin, garde orphelin
}

// Fiche détail prête à sérialiser vers le client (aucune Date ne sort).
export interface VariantDetails extends VariantLine {
  nutrients: Record<string, unknown> | null;
  createdAt: string | null; // ISO
  updatedAt: string | null; // ISO
  generic: { id: string; name: string } | null;
}

// --------------------------------------------
// Normalisations locales
// --------------------------------------------

// Nutri-Score : normalisé en MAJUSCULE, null reste null.
function normalizeNutriscore(nutriscore: string | null): string | null {
  return nutriscore === null ? null : nutriscore.toUpperCase();
}

// Un horodatage SQL arrive en Date ou déjà sérialisé en ISO par le
// transport ; tout le reste (undefined, nombre…) retombe à null.
function serializeDate(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return null;
}

function buildLine(raw: VariantRawLine): VariantLine {
  const hasBrand = raw.brand !== null;
  return {
    id: raw.id,
    brand: raw.brand,
    brandLabel: hasBrand ? (raw.brand as string) : "Sans marque",
    hasBrand,
    nutriscore: normalizeNutriscore(raw.nutriscore),
    imageUrl: raw.imageUrl,
    openFoodFactsId: raw.openFoodFactsId,
    isReadOnly: raw.isReadOnly === null ? false : raw.isReadOnly,
  };
}

// --------------------------------------------
// buildVariantLines — la liste des marques d'un générique (Q1a)
// --------------------------------------------

// Tri : marques alphabétiques insensible à la casse (fr), le vrac
// (« Sans marque ») TOUJOURS en fin de liste.
export function buildVariantLines(variants: VariantRawLine[]): VariantLine[] {
  return variants
    .map(buildLine)
    .sort((a, b) => {
      if (a.hasBrand !== b.hasBrand) return a.hasBrand ? -1 : 1;
      return a.brandLabel.localeCompare(b.brandLabel, "fr", {
        sensitivity: "base",
      });
    });
}

// --------------------------------------------
// buildVariantDetails — la fiche détail (Q2b : fondation)
// --------------------------------------------

export function buildVariantDetails(variant: VariantRawDetails): VariantDetails {
  const line = buildLine(variant);
  // JSONB : un objet non-null passe tel quel (structure OFF flexible §8),
  // tout le reste retombe à null.
  const nutrients =
    variant.nutrients !== null && typeof variant.nutrients === "object"
      ? (variant.nutrients as Record<string, unknown>)
      : null;
  return {
    ...line,
    nutrients,
    createdAt: serializeDate(variant.createdAt),
    updatedAt: serializeDate(variant.updatedAt),
    generic: variant.generic === null ? null : variant.generic,
  };
}
