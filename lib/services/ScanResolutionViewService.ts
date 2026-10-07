// ============================================
// ScanResolutionViewService — Chantier 4:2 : barcode → variante → générique
// Service PUR : aucune importation DB (piège drizzle/Neon gravé au bloc 3 —
// ce module est importé par les tests Vitest). Les briques data vivent dans
// DirectoryService ; celles-ci préparent et façonnent leurs valeurs.
// ============================================

/**
 * Résumé de variante tel que transporté par le résultat d'un scan
 * (SimplifiedDirectoryItem.variant — champ additif, consommé par l'UI
// au round 2 du chantier 4:2).
 */
export interface ScanVariantSummary {
  id: string;
  brand: string | null; // null = sans marque (vrac)
  nutriscore: string | null; // normalisé majuscule (pattern VariantViewService)
  imageUrl: string | null;
  isReadOnly: boolean; // null → false
}

/**
 * Plan de création d'une fiche depuis OpenFoodFacts — Q2 Alexis (05/10) :
 * le GÉNÉRIQUE porte le nom COMPLET du produit, la marque vit uniquement
 * dans la VARIANTE. Les deux niveaux sont verrouillés (isReadOnly true).
 */
export interface OffCreationPlan {
  generic: {
    name: string;
    brand: null; // Q2 : la marque vit dans la variante, jamais sur le générique créé
    description: string | null;
    openFoodFactsId: string | null; // conservé sur le générique : lookup legacy (openFoodFactsId = barcode)
    isReadOnly: true;
  };
  variant: {
    brand: string | null;
    nutriscore: string | null;
    imageUrl: string | null;
    openFoodFactsId: string | null;
    isReadOnly: true;
  };
}

/** Normalise un Nutri-Score : majuscule, absent/blanc → null. */
export function normalizeNutriscore(value: string | null | undefined): string | null {
  if (!value || !value.trim()) return null;
  return value.trim().toUpperCase();
}

/** Normalise une marque : absent/blanc → null (vrac). */
export function normalizeBrandOrNull(value: string | null | undefined): string | null {
  if (!value || !value.trim()) return null;
  return value.trim();
}

/**
 * Construit le plan générique + variante pour une création OpenFoodFacts.
 * Décision Q2 : le générique garde le nom complet — pas de dé-marquage
 * (le regroupement par générique se fera par fusion manuelle, pas par
 * heuristique de nom).
 */
export function buildOffCreationPlan(off: {
  name: string;
  brand?: string | null;
  description?: string | null;
  nutriscore?: string | null;
  imageUrl?: string | null;
  openFoodFactsId?: string | null;
}): OffCreationPlan {
  const openFoodFactsId = off.openFoodFactsId ?? null;
  return {
    generic: {
      name: off.name,
      brand: null,
      description: off.description ?? null,
      openFoodFactsId,
      isReadOnly: true,
    },
    variant: {
      brand: normalizeBrandOrNull(off.brand),
      nutriscore: normalizeNutriscore(off.nutriscore),
      imageUrl: off.imageUrl ?? null,
      openFoodFactsId,
      isReadOnly: true,
    },
  };
}

/**
 * Résume une ligne de variante pour le scan. Sans variante (fiche legacy
 * née avant la chaîne 4:2) → null : le scan continue de fonctionner sur
 * le seul générique (repli, pas d'erreur).
 */
export function buildScanVariantSummary(row: {
  id: string;
  brand: string | null;
  nutriscore: string | null;
  imageUrl: string | null;
  isReadOnly: boolean | null;
} | null): ScanVariantSummary | null {
  if (!row) return null;
  return {
    id: row.id,
    brand: row.brand,
    nutriscore: normalizeNutriscore(row.nutriscore),
    imageUrl: row.imageUrl ?? null,
    isReadOnly: row.isReadOnly ?? false,
  };
}

/**
 * Applique la variante sur l'item de scan : à l'affichage, la marque et le
 * Nutri-Score de la VARIANTE priment sur ceux du générique (fiche marquée),
 * avec repli sur le générique quand la variante ne porte pas la valeur
 * (jamais d'écrasement par null). Sans variante : item inchangé,
 * champ variant absent.
 */
export function applyVariantToDirectoryItem<T extends {
  brand: string | null;
  nutriscore: string | null;
}>(
  item: T,
  variant: ScanVariantSummary | null,
): { item: T & { variant?: ScanVariantSummary } } {
  if (!variant) return { item: { ...item } };
  const nutriscore = variant.nutriscore ?? normalizeNutriscore(item.nutriscore);
  return {
    item: {
      ...item,
      brand: variant.brand ?? item.brand,
      nutriscore,
      variant,
    },
  };
}
