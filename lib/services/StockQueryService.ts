// ============================================
// StockQueryService — la vue générique du stock côté données (bloc 3)
// Modèle générique/poids — spec gravée le 03/10/2026 (.vibe/plans/spec-modele-generique-poids.md)
//
// Ce service charge ce que la vue réclame (lignes d'instance, unités,
// préférences d'affichage), puis délègue la construction des cartes
// génériques à StockViewService (partie pure, testée — règle 5).
// La séparation en deux fichiers garde la partie pure testable sans
// charger la DB (lib/db/drizzle crée son client Neon au chargement).
//
// Décisions du tech lead du 03/10 soir :
// - Q1a : une carte par générique GLOBAL, toutes installations confondues ;
// - Q3 : le bandeau compte les génériques et les lignes, plus de total
//   de quantité inter-familles ;
// - Q4 : au tri par quantité, une famille d'unités est sélectionnée —
//   les cartes des autres familles sont MASQUÉES, le tri se fait sur la
//   valeur en base de la famille.
// ============================================

import { and, eq, gte, inArray, isNull, like, lte } from "drizzle-orm";

import { db } from "@/lib/db/drizzle";
import {
  installations,
  objectDirectory,
  objectInstallation,
  units as unitsTable,
  userDisplayPreferences,
  userInstallations,
} from "@/lib/db/schema";

import {
  buildGenericCards,
  buildInstallationBreakdown,
  calculateDaysUntilExpiry,
  getExpiryStatus,
} from "./StockViewService";
import type {
  ExpiryStatus,
  GenericStockCard,
  InstallationBreakdownEntry,
  StockRowInput,
} from "./StockViewService";
// Les types de la spec vivent dans QuantityService, la source de vérité
// (StockViewService les importe sans les ré-exporter).
import type {
  DisplayPreferences,
  QuantityUnit,
  UnitFamily,
} from "./QuantityService";

// --------------------------------------------
// Types publics de la vue générique
// --------------------------------------------

// Les filtres acceptés par la vue (l'UI du round suivant les enverra).
export interface GenericStockFilters {
  searchQuery?: string; // recherche sur le NOM du générique (§2.1)
  category?: string;
  // Niveau 2 de la pyramide : une seule fiche générique par son id.
  directoryId?: string;
  // Périmètre : null = toutes les installations accessibles (vue globale),
  // un id = le stock d'une seule installation (vue installation).
  installationId?: string | null;
  location?: string;
  expiryStatus?: "all" | "warning" | "urgent" | "expired" | "no_date" | "normal";
  sortBy?: "name" | "quantity" | "expiry_date" | "added_date";
  sortOrder?: "asc" | "desc";
  // Q4 : famille d'unités sélectionnée pour le tri par quantité.
  quantityFamily?: UnitFamily | null;
}

// Le bandeau de stats, décision Q3 : totalItems compte les GÉNÉRIQUES,
// totalLines les lignes d'instance ; plus aucun total de quantité
// inter-familles (aucun total honnête n'existe entre grammes et litres).
export interface GenericStockStats {
  totalItems: number;
  totalLines: number;
  totalValue: number; // centimes
  expiringSoonCount: number; // lignes à moins de 7 jours
  expiredCount: number; // lignes expirées
  categoriesDistribution: Record<string, number>;
  installationsDistribution: Record<string, number>;
}

// Le contexte de construction de la vue : ce dont les couches amont
// (l'encadré « quantité par installation » du niveau 2) ont besoin pour
// recalculer UN SOUS-ENSEMBLE avec les mêmes règles — les unités, les
// préférences, l'unité legacy. Jamais recalculé : chargé une fois ici.
export interface StockViewContext {
  unitsById: Record<string, QuantityUnit>;
  preferences: DisplayPreferences;
  legacyUnit: QuantityUnit;
}

// Résultat interne du service : ok, ou un code d'erreur discriminé.
export type GenericStockView =
  | { ok: true; cards: GenericStockCard[]; stats: GenericStockStats; context: StockViewContext }
  | { ok: false; code: "NO_INSTALLATION" | "INSTALLATION_ACCESS_DENIED" };

// La fiche générique globale (niveau 2) : la carte unique + son
// encadré « quantité par installation ».
export type GenericDirectoryDetail =
  | {
      ok: true;
      card: GenericStockCard;
      breakdown: InstallationBreakdownEntry[];
    }
  | { ok: false; code: "NO_INSTALLATION" | "INSTALLATION_ACCESS_DENIED" | "NOT_FOUND" };

// Format de retour des actions (orchestration de session en plus).
export interface GenericStockActionResult {
  success: boolean;
  cards?: GenericStockCard[];
  stats?: GenericStockStats;
  error?: string;
  code?: string;
}

// Format de retour de l'action du niveau 2 (fiche générique globale).
export interface GenericDirectoryDetailResult {
  success: boolean;
  card?: GenericStockCard;
  breakdown?: InstallationBreakdownEntry[];
  error?: string;
  code?: string;
}

// --------------------------------------------
// getExpiryFilter — conditions Drizzle du filtre de statut de péremption.
// (Déplacé depuis StockActions le 03/10 : la requête de la vue vit ici.)
// --------------------------------------------
export function getExpiryFilter(
  expiryStatus: "warning" | "urgent" | "expired" | "normal" | "no_date"
): any[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  switch (expiryStatus) {
    case "expired":
      return [lte(objectInstallation.expiryDate, today)];
    case "urgent": {
      const urgentDate = new Date(today);
      urgentDate.setDate(urgentDate.getDate() + 3);
      return [
        and(
          gte(objectInstallation.expiryDate, today),
          lte(objectInstallation.expiryDate, urgentDate)
        ),
      ];
    }
    case "warning": {
      const warningStart = new Date(today);
      warningStart.setDate(warningStart.getDate() + 3);
      const warningEnd = new Date(today);
      warningEnd.setDate(warningEnd.getDate() + 7);
      return [
        and(
          gte(objectInstallation.expiryDate, warningStart),
          lte(objectInstallation.expiryDate, warningEnd)
        ),
      ];
    }
    case "normal": {
      const normalDate = new Date(today);
      normalDate.setDate(normalDate.getDate() + 7);
      return [gte(objectInstallation.expiryDate, normalDate)];
    }
    case "no_date":
      return [isNull(objectInstallation.expiryDate)];
    default:
      return [];
  }
}

// --------------------------------------------
// getGenericStockView — charge, groupe, agrège, trie, compte.
// --------------------------------------------
export async function getGenericStockView(
  userId: string,
  filters: GenericStockFilters = {}
): Promise<GenericStockView> {
  // 1. Les unités du seed (§3.1) : le map de conversion + l'unité
  //    « unité » vers laquelle l'entier legacy se projette (§3.3.4).
  const unitRows = await db.select().from(unitsTable);
  const unitsById: Record<string, QuantityUnit> = {};
  for (const unit of unitRows) {
    if (unit.family !== null) {
      unitsById[unit.id] = {
        id: unit.id,
        symbol: unit.symbol,
        family: unit.family,
        conversionFactor: unit.conversionFactor,
        isBase: unit.isBase ?? false,
      };
    }
  }

  const legacyRow = unitRows.find((u) => u.name === "unité");
  let legacyUnit: QuantityUnit;
  if (legacyRow && legacyRow.family === "discrete") {
    legacyUnit = unitsById[legacyRow.id];
  } else {
    // Défensif : seed absent ou altéré — le legacy s'affiche quand même,
    // sur une unité virtuelle discrète (et on le dit dans les logs).
    console.warn(
      "[StockQueryService] unité « unité » absente du seed — projection legacy sur une unité virtuelle"
    );
    legacyUnit = {
      id: "unite-legacy-virtuelle",
      symbol: "unité",
      family: "discrete",
      conversionFactor: null,
      isBase: false,
    };
    unitsById[legacyUnit.id] = legacyUnit;
  }

  // 2. Les préférences d'affichage de l'utilisateur (§4.2), par famille.
  const prefRows = await db
    .select()
    .from(userDisplayPreferences)
    .where(eq(userDisplayPreferences.userId, userId));
  const preferences: DisplayPreferences = {};
  for (const pref of prefRows) {
    preferences[pref.family] = pref.unitId;
  }

  // Le contexte de la vue, chargé une fois : le niveau 2 (fiche générique
  // globale) s'en sert pour recalculer l'encadré « quantité par
  // installation » avec les mêmes unités et préférences.
  const context: StockViewContext = { unitsById, preferences, legacyUnit };

  // 3. Les installations accessibles et les rôles (permissions).
  const memberships = await db.query.userInstallations.findMany({
    where: eq(userInstallations.userId, userId),
    with: { installation: true },
  });
  if (!memberships.length) {
    return { ok: true, cards: [], stats: emptyGenericStats(), context };
  }

  // Le rôle est nullable en base (default "viewer") : le map l'accepte,
  // le repli "viewer" se fait à la lecture.
  const roles = new Map<string, string | null>();
  for (const membership of memberships) {
    roles.set(membership.installationId, membership.role);
  }

  // Périmètre : une installation précise (vue installation) ou toutes.
  if (
    filters.installationId &&
    !memberships.some((m) => m.installationId === filters.installationId)
  ) {
    return { ok: false, code: "INSTALLATION_ACCESS_DENIED" };
  }
  const installationIds = filters.installationId
    ? [filters.installationId]
    : memberships.map((m) => m.installationId);

  // 4. Les lignes d'instance (une par sachet/ajout), jointes à leur
  //    fiche générique et à leur installation.
  //
  //    Piège évité : les filtres par LIGNE (emplacement, statut de
  //    péremption) ne filtrent jamais les lignes chargées — sinon
  //    l'agrégat de la carte serait calculé sur un sous-ensemble et
  //    le label mentirait (§3.3 : la vérité = toutes les saisies du
  //    générique dans le périmètre). Ils sélectionnent les GÉNÉRIQUES
  //    concernés, puis on charge toutes leurs lignes.
  // NB : périmètre et listes = inArray, jamais `sql`... = ANY(...)`` :
  // avec le driver Neon HTTP, un array interpolé dans sql`` éclate en
  // params séparés ($1, $2...) et Postgres rejette ANY (($1, $2))
  // (22P02 / 42809 — constaté le 04/10 sur /stock et /installations/[id]/stock).
  const directoryFilters = and(
    inArray(objectInstallation.installationId, installationIds),
    ...(filters.directoryId
      ? [eq(objectDirectory.id, filters.directoryId)]
      : []),
    ...(filters.searchQuery
      ? [like(objectDirectory.name, `%${filters.searchQuery}%`)]
      : []),
    ...(filters.category
      ? [eq(objectDirectory.categoryId, filters.category)]
      : []),
    ...(filters.location
      ? [eq(objectInstallation.location, filters.location)]
      : []),
    ...(filters.expiryStatus && filters.expiryStatus !== "all"
      ? getExpiryFilter(filters.expiryStatus)
      : [])
  );

  const lineSelect = {
    id: objectInstallation.id,
    installationId: objectInstallation.installationId,
    installationName: installations.name,
    quantity: objectInstallation.quantity,
    quantityValue: objectInstallation.quantityValue,
    quantityUnitId: objectInstallation.quantityUnitId,
    equivalentValue: objectInstallation.equivalentValue,
    equivalentUnitId: objectInstallation.equivalentUnitId,
    location: objectInstallation.location,
    purchaseDate: objectInstallation.purchaseDate,
    expiryDate: objectInstallation.expiryDate,
    price: objectInstallation.price,
    note: objectInstallation.note,
    shopId: objectInstallation.shopId,
    addedDate: objectInstallation.addedDate,
    directoryId: objectDirectory.id,
    directoryName: objectDirectory.name,
    categoryId: objectDirectory.categoryId,
    unitFamily: objectDirectory.unitFamily,
  };

  const fromLines = () =>
    db
      .select(lineSelect)
      .from(objectInstallation)
      .leftJoin(
        objectDirectory,
        eq(objectInstallation.objectDirectoryId, objectDirectory.id)
      )
      .leftJoin(
        installations,
        eq(objectInstallation.installationId, installations.id)
      );

  const hasLineFilters = Boolean(
    filters.location ||
      (filters.expiryStatus && filters.expiryStatus !== "all")
  );

  let rows;
  if (hasLineFilters || filters.searchQuery || filters.category) {
    // 4a. Les génériques qui ont au moins une ligne qui passe les filtres.
    const matchingDirectories = await db
      .selectDistinct({ directoryId: objectInstallation.objectDirectoryId })
      .from(objectInstallation)
      .leftJoin(
        objectDirectory,
        eq(objectInstallation.objectDirectoryId, objectDirectory.id)
      )
      .where(directoryFilters);

    if (!matchingDirectories.length) {
      return { ok: true, cards: [], stats: emptyGenericStats(), context };
    }
    const directoryIds = matchingDirectories.map((row) => row.directoryId);

    // 4b. Toutes les lignes de ces génériques dans le périmètre —
    //     agrégat complet, jamais partiel.
    rows = await fromLines().where(
      and(
        inArray(objectInstallation.installationId, installationIds),
        inArray(objectInstallation.objectDirectoryId, directoryIds)
      )
    );
  } else {
    // Aucun filtre : toutes les lignes du périmètre.
    rows = await fromLines().where(directoryFilters);
  }

  // 5. Mapping vers les entrées du builder + comptages par ligne (Q3).
  let expiringSoonCount = 0;
  let expiredCount = 0;
  const stockRows: StockRowInput[] = rows.flatMap((row) => {
    // Ligne orpheline sans fiche générique — FK notNull en base, donc
    // défensif seulement : on ignore plutôt que de mentir sur la fiche.
    if (!row.directoryId || !row.directoryName) {
      return [];
    }
    const days = calculateDaysUntilExpiry(row.expiryDate);
    const status: ExpiryStatus = getExpiryStatus(days);
    if (status === "warning" || status === "urgent") {
      expiringSoonCount += 1;
    }
    if (status === "expired") {
      expiredCount += 1;
    }

    const role = roles.get(row.installationId) ?? "viewer";
    return [
      {
        ...row,
        directoryId: row.directoryId,
        directoryName: row.directoryName,
        installationName: row.installationName ?? "Installation inconnue",
        hasEditPermission: role === "owner" || role === "editor",
      },
    ];
  });

  // 6. Construction des cartes génériques (partie pure, testée).
  const cards = buildGenericCards(stockRows, unitsById, preferences, legacyUnit);

  // 7. Tri + filtre Q4 : au tri par quantité dans une famille sélectionnée,
  //    les cartes des autres familles sont masquées (décision Alexis).
  const quantityFamily = filters.quantityFamily ?? null;
  let visibleCards = cards;
  if (filters.sortBy === "quantity" && quantityFamily) {
    // Famille figée non-nullable : le filtre et le tri parlent de la même.
    const family: UnitFamily = quantityFamily;
    visibleCards = cards.filter(
      (card) => card.aggregation.totals[family] != null
    );
  }

  const direction = filters.sortOrder === "desc" ? -1 : 1;
  const sortedCards = [...visibleCards].sort((a, b) => {
    switch (filters.sortBy) {
      case "name":
        return direction * a.name.localeCompare(b.name, "fr");
      case "quantity": {
        // Sans famille sélectionnée, pas de tri honnête inter-familles :
        // on garde l'ordre d'apparition (l'UI enverra toujours une famille).
        if (!quantityFamily) {
          return 0;
        }
        const family: UnitFamily = quantityFamily;
        const av = a.aggregation.totals[family] ?? null;
        const bv = b.aggregation.totals[family] ?? null;
        if (av === null && bv === null) return 0;
        if (av === null) return 1;
        if (bv === null) return -1;
        return direction * (av - bv);
      }
      case "added_date": {
        // Le plus récent ajout de la fiche.
        const latest = (card: GenericStockCard) =>
          Math.max(...card.lines.map((l) => l.addedDate?.getTime() ?? 0), 0);
        return direction * (latest(a) - latest(b));
      }
      case "expiry_date":
      default: {
        // Défaut : péremption la plus proche, sans-date toujours en fin.
        const at = a.nearestExpiryDate ? a.nearestExpiryDate.getTime() : null;
        const bt = b.nearestExpiryDate ? b.nearestExpiryDate.getTime() : null;
        if (at === null && bt === null) return 0;
        if (at === null) return 1;
        if (bt === null) return -1;
        return direction * (at - bt);
      }
    }
  });

  // 8. Les stats du bandeau (Q3) : sur ce qui est affiché.
  const stats: GenericStockStats = {
    totalItems: sortedCards.length,
    totalLines: sortedCards.reduce((sum, card) => sum + card.lines.length, 0),
    totalValue: sortedCards.reduce((sum, card) => sum + card.totalValue, 0),
    expiringSoonCount,
    expiredCount,
    categoriesDistribution: {},
    installationsDistribution: {},
  };
  for (const card of sortedCards) {
    if (card.category) {
      stats.categoriesDistribution[card.category] =
        (stats.categoriesDistribution[card.category] ?? 0) + 1;
    }
  }
  for (const card of sortedCards) {
    for (const installation of card.installations) {
      stats.installationsDistribution[installation.id] =
        (stats.installationsDistribution[installation.id] ?? 0) + 1;
    }
  }

  return { ok: true, cards: sortedCards, stats, context };
}

// --------------------------------------------
// getGenericDirectoryDetail — la fiche générique globale (niveau 2
// de la pyramide) : la carte du générique dans TOUT le périmètre
// de l'utilisateur + l'encadré « quantité par installation ».
//
// Réutilisation, pas refonte : le filtre directoryId de la vue
// existante sélectionne les lignes du générique, le builder pur
// fait la carte, le breakdown pur fait l'encadré. Une seule
// vérité par calcul, jamais deux.
// --------------------------------------------
export async function getGenericDirectoryDetail(
  userId: string,
  directoryId: string
): Promise<GenericDirectoryDetail> {
  const view = await getGenericStockView(userId, { directoryId });
  if (!view.ok) {
    // NO_INSTALLATION ou INSTALLATION_ACCESS_DENIED : le périmètre
    // lui-même est en cause, pas la fiche.
    return { ok: false, code: view.code };
  }

  const card = view.cards.find((c) => c.id === directoryId) ?? null;
  if (!card) {
    // Fiche inconnue, ou connue mais sans aucune ligne dans le
    // périmètre de l'utilisateur : niveau 2 = fiche de STOCK, elle
    // n'existe que portée par des lignes.
    return { ok: false, code: "NOT_FOUND" };
  }

  // L'encadré : mêmes unités, mêmes préférences, même legacy (§4.2).
  const breakdown = buildInstallationBreakdown(
    card,
    view.context.unitsById,
    view.context.preferences,
    view.context.legacyUnit
  );

  return { ok: true, card, breakdown };
}

// Le bandeau vide (aucune installation ou stock vide).
function emptyGenericStats(): GenericStockStats {
  return {
    totalItems: 0,
    totalLines: 0,
    totalValue: 0,
    expiringSoonCount: 0,
    expiredCount: 0,
    categoriesDistribution: {},
    installationsDistribution: {},
  };
}
