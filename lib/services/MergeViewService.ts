// ============================================
// MergeViewService — fusion manuelle des génériques (bloc 4, round 4)
// Modèle générique/poids — la fusion de doublons prévue par la spec
// du 03/10 : Alexis seul réunit ce qui va ensemble (pas de fusion
// automatique par nom).
//
// Partie PURE de la fusion : les lignes de stock et variantes
// arrivent en entrée telles que la requête les charge (MergeQueryService),
// le service décide du plan (sommation ou déménagement, collision de
// variantes). Aucune DB ici — testable en isolation (règle 5).
//
// Décisions du tech lead gravées (04/10 soir → 05/10) :
// - ligne « nue » = la quantité et son conditionnement, RIEN d'autre ;
// - deux lignes nues ne somment que si leurs conditionnements
//   concordent (tous les deux sans, ou mêmes valeurs + mêmes unités) ;
// - une ligne informée déménage telle quelle — en base on garde les
//   lignes distinctes, l'UI les regroupe sous la carte générique ;
// - collision de variantes : même marque (insensible casse, vrac
//   inclus) → fusion champ par champ (on ne perd rien) ; marques
//   différentes → les deux restent.
// ============================================

// --------------------------------------------
// Types d'entrée : une ligne de stock telle que la requête la charge
// --------------------------------------------

// Ligne brute de stock (colonnes utiles de object_installation).
// Les dates arrivent en Date (ou null) — seul le null compte ici :
// une date présente, c'est une information complémentaire.
export interface StockLineRaw {
  id: string;
  installationId: string;
  quantity: number;
  location: string | null;
  purchaseDate: unknown;
  expiryDate: unknown;
  shopId: string | null;
  lotNumber: string | null;
  price: number | null;
  note: string | null;
  // Le conditionnement (spec §3.2) fait partie de la ligne nue.
  quantityValue: number | null;
  quantityUnitId: string | null;
  equivalentValue: number | null;
  equivalentUnitId: string | null;
}

// Variante brute de la fusion (colonnes de product_variants).
export interface VariantMergeRaw {
  id: string;
  brand: string | null; // null = vrac (« Sans marque »)
  nutriscore: string | null;
  imageUrl: string | null;
  openFoodFactsId: string | null;
  nutrients: unknown; // JSONB, structure OFF flexible (§8)
  isReadOnly: boolean | null; // default SQL → null possible
}

// Une décision de la variante en collision.
export interface VariantMergeDecision {
  shouldMerge: boolean;
  keptVariantId?: string; // la variante de la CIBLE (elle garde son id)
  removedVariantId?: string; // la variante de la SOURCE (retirée)
  // Champs fusionnés champ par champ : on garde la valeur non-nulle
  // de chaque côté — rien ne se perd.
  mergedFields?: {
    brand: string | null;
    nutriscore: string | null;
    imageUrl: string | null;
    openFoodFactsId: string | null;
    nutrients: unknown;
    isReadOnly: boolean;
  };
}

// Une décision de ligne de stock.
export interface StockLineMove {
  sourceLineId: string;
  installationId: string;
  action: "sum" | "move";
  // Pour « sum » : la ligne cible (de la même installation) et sa
  // nouvelle quantité CUMULÉE (plusieurs sources peuvent viser la
  // même ligne cible — l'ordre du plan est déterministe).
  targetLineId?: string;
  newQuantity?: number;
}

// --------------------------------------------
// Normalisations locales
// --------------------------------------------

// Marque normalisée pour la comparaison : trim + minuscules,
// vrac (null) → chaîne vide (deux vrac = même « Sans marque »).
export function normalizeVariantBrand(brand: string | null): string {
  return (brand ?? "").trim().toLowerCase();
}

// --------------------------------------------
// hasComplementaryInfo — la définition de la ligne « nue »
// --------------------------------------------

// True = ligne INFORMÉE. Une ligne « nue » porte sa quantité et son
// conditionnement, RIEN d'autre (définition tech lead 05/10) :
// date d'achat, péremption, magasin, lot, prix, note, emplacement.
export function hasComplementaryInfo(line: StockLineRaw): boolean {
  return (
    line.location !== null ||
    line.purchaseDate !== null ||
    line.expiryDate !== null ||
    line.shopId !== null ||
    line.lotNumber !== null ||
    line.price !== null ||
    line.note !== null
  );
}

// --------------------------------------------
// packagingMatches — concordance des conditionnements
// --------------------------------------------

// Deux lignes nues ne somment que si leurs conditionnements
// concordent : tous les deux sans conditionnement, ou les quatre
// champs identiques (valeur + unité de quantité, valeur + unité
// d'équivalent). Sinon on résumerait des pommes et des poires.
export function packagingMatches(a: StockLineRaw, b: StockLineRaw): boolean {
  const aHas =
    a.quantityValue !== null ||
    a.quantityUnitId !== null ||
    a.equivalentValue !== null ||
    a.equivalentUnitId !== null;
  const bHas =
    b.quantityValue !== null ||
    b.quantityUnitId !== null ||
    b.equivalentValue !== null ||
    b.equivalentUnitId !== null;

  if (!aHas && !bHas) return true; // deux lignes sans conditionnement
  if (aHas !== bHas) return false; // une conditionnée, une non

  return (
    a.quantityValue === b.quantityValue &&
    a.quantityUnitId === b.quantityUnitId &&
    a.equivalentValue === b.equivalentValue &&
    a.equivalentUnitId === b.equivalentUnitId
  );
}

// --------------------------------------------
// planStockLineMoves — le plan de déménagement du stock
// --------------------------------------------

// Pour chaque ligne source : sommer sur une ligne cible nue concordante
// de la même installation (quantité cumulée), sinon déménager telle
// quelle (elle reste une ligne distincte, regroupée sous la carte
// générique en UI). L'ordre des sources est respecté — le plan est
// déterministe.
export function planStockLineMoves(
  sourceLines: StockLineRaw[],
  targetLines: StockLineRaw[]
): StockLineMove[] {
  // Cumul par ligne cible : plusieurs sources peuvent viser la même
  // ligne nue — la deuxième doit voir le résultat de la première.
  const accumulated = new Map<string, number>(); // targetLineId → quantité
  for (const target of targetLines) {
    accumulated.set(target.id, target.quantity);
  }

  const moves: StockLineMove[] = [];

  for (const source of sourceLines) {
    // Une ligne informée ne se somme JAMAIS : ses infos (péremption,
    // lot…) lui appartiennent — elle déménage telle quelle.
    if (hasComplementaryInfo(source)) {
      moves.push({
        sourceLineId: source.id,
        installationId: source.installationId,
        action: "move",
      });
      continue;
    }

    // Ligne nue : chercher une cible nue concordante dans la même
    // installation (la première — le flux d'ajout existant somme déjà
    // les lignes, il ne devrait y en avoir qu'une).
    const candidate = targetLines.find(
      (target) =>
        target.installationId === source.installationId &&
        !hasComplementaryInfo(target) &&
        packagingMatches(source, target)
    );

    if (candidate) {
      const newQuantity =
        (accumulated.get(candidate.id) ?? candidate.quantity) + source.quantity;
      accumulated.set(candidate.id, newQuantity);
      moves.push({
        sourceLineId: source.id,
        installationId: source.installationId,
        action: "sum",
        targetLineId: candidate.id,
        newQuantity,
      });
    } else {
      moves.push({
        sourceLineId: source.id,
        installationId: source.installationId,
        action: "move",
      });
    }
  }

  return moves;
}

// --------------------------------------------
// decideVariantMerge — collision de variantes
// --------------------------------------------

// Même marque normalisée (vrac inclus) → fusion champ par champ : la
// cible garde son id, la source est retirée, chaque champ garde la
// valeur non-nulle d'un côté comme de l'autre — rien ne se perd.
// Marques différentes ou pas de cible → pas de fusion : la variante
// source déménage simplement (l'appelant déplace genericDirectoryId).
export function decideVariantMerge(
  source: VariantMergeRaw | null,
  target: VariantMergeRaw | null
): VariantMergeDecision {
  if (!source || !target) {
    return { shouldMerge: false };
  }

  if (normalizeVariantBrand(source.brand) !== normalizeVariantBrand(target.brand)) {
    return { shouldMerge: false };
  }

  return {
    shouldMerge: true,
    keptVariantId: target.id,
    removedVariantId: source.id,
    mergedFields: {
      brand: target.brand ?? source.brand,
      nutriscore: target.nutriscore ?? source.nutriscore,
      imageUrl: target.imageUrl ?? source.imageUrl,
      openFoodFactsId: target.openFoodFactsId ?? source.openFoodFactsId,
      nutrients: target.nutrients ?? source.nutrients,
      isReadOnly: (target.isReadOnly ?? false) || (source.isReadOnly ?? false),
    },
  };
}
