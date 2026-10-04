"use client";

// ============================================
// StockClient — la vue principale du stock en
// fiches génériques (bloc 3, niveau 1 de la
// pyramide approuvée par Alexis).
//
// Niveau 1 : les cartes génériques, toutes
// installations (vue globale) ou dans une
// installation (vue installation). Le clic
// navigue vers la fiche générique (niveaux 2-3)
// — plus de modale d'édition ici : l'édition
// et la suppression vivent au niveau 3.
// ============================================

import { useState, useCallback, type ReactNode } from "react";
import { Warehouse, ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";
import type { GenericStockCard } from "@/lib/services/StockViewService";
import {
  uniqueInstallationsFromCards,
  uniqueCategoriesFromCards,
} from "@/lib/services/StockViewService";
// Types de la couche data : import type uniquement (le module
// charge la DB — le type s'efface à la compilation).
import type {
  GenericStockFilters,
  GenericStockStats,
} from "@/lib/services/StockQueryService";
import StockList from "@/components/stock/StockList";
import StockFiltersComponent from "@/components/stock/StockFilters";
import StockStatsComponent from "@/components/stock/StockStats";
import StockEmptyState from "@/components/stock/StockEmptyState";
import styles from "./Stock.module.css";

interface StockClientProps {
  initialData?: {
    cards: GenericStockCard[];
    stats: GenericStockStats | null;
    installations: { id: string; name: string }[];
    categories: { id: string; name: string }[];
  };
  installationId?: string;
  installationName?: string;
  forceCardView?: boolean; // Force l'affichage en cartes (ex: pour la page /stock)
  // Emplacement réservé dans le header (ex: l'outil « Fusionner deux
  // fiches » du bloc 4 R5, monté par la page /stock seule).
  headerExtra?: ReactNode;
}

// --------------------------------------------
// Relève des dates reçues du JSON de l'API :
// le fetch renvoie des chaînes ISO, les types
// de la vue exigent des Date. Sans relève, le
// badge de péremption calcule sur n'importe
// quoi et ment silencieusement.
// --------------------------------------------
function reviveDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === "string") return new Date(value);
  return null;
}

function reviveCard(raw: unknown): GenericStockCard {
  const card = raw as GenericStockCard;
  return {
    ...card,
    nearestExpiryDate: reviveDate(card.nearestExpiryDate),
    lines: (card.lines ?? []).map((line) => ({
      ...line,
      purchaseDate: reviveDate(line.purchaseDate),
      expiryDate: reviveDate(line.expiryDate),
      addedDate: reviveDate(line.addedDate),
    })),
  };
}

export default function StockClient({
  initialData,
  installationId,
  installationName,
  forceCardView = false,
  headerExtra,
}: StockClientProps) {
  const [cards, setCards] = useState<GenericStockCard[]>(initialData?.cards || []);
  const [stats, setStats] = useState<GenericStockStats | null>(initialData?.stats || null);
  const [filters, setFilters] = useState<GenericStockFilters>({
    sortBy: "expiry_date",
    sortOrder: "asc",
  });
  const [isLoading, setIsLoading] = useState(!initialData);
  const [installations, setInstallations] = useState<{ id: string; name: string }[]>(initialData?.installations || []);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(initialData?.categories || []);
  const [error, setError] = useState<string | null>(null);

  // Synchroniser l'état quand initialData change (pattern officiel React
  // « ajuster l'état pendant le rendu » — remplace l'effet qui posait
  // setState-in-effect au React Compiler, et supprime le flash du 1er rendu)
  const [prevInitialData, setPrevInitialData] = useState(initialData);
  if (initialData !== prevInitialData) {
    setPrevInitialData(initialData);
    setCards(initialData?.cards || []);
    setStats(initialData?.stats || null);
    setInstallations(initialData?.installations || []);
    setCategories(initialData?.categories || []);
  }

  // Charger les fiches génériques depuis le client
  const loadStock = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Construire l'URL avec les filtres
      const params = new URLSearchParams();
      if (filters.searchQuery) params.set("searchQuery", filters.searchQuery);
      if (filters.category) params.set("category", filters.category);
      if (filters.installationId) params.set("installationId", filters.installationId);
      if (filters.location) params.set("location", filters.location);
      if (filters.expiryStatus && filters.expiryStatus !== "all") {
        params.set("expiryStatus", filters.expiryStatus);
      }
      if (filters.sortBy) params.set("sortBy", filters.sortBy);
      if (filters.sortOrder) params.set("sortOrder", filters.sortOrder);
      if (filters.quantityFamily) params.set("quantityFamily", filters.quantityFamily);

      const url = installationId
        ? `/api/stock?installationId=${installationId}&${params.toString()}`
        : `/api/stock?${params.toString()}`;

      const response = await fetch(url);
      const result = await response.json();

      if (!result.success) {
        setError(result.error || "Erreur lors du chargement du stock");
        setCards([]);
        setStats(null);
      } else {
        // Les dates ISO du JSON redeviennent des Date (voir reviveCard).
        const loadedCards: GenericStockCard[] = (result.cards || []).map(reviveCard);
        setCards(loadedCards);
        setStats(result.stats || null);
        setInstallations(uniqueInstallationsFromCards(loadedCards));
        setCategories(uniqueCategoriesFromCards(loadedCards));
        console.log(`[StockClient] ${loadedCards.length} fiche(s) générique(s) chargée(s)`);
      }
    } catch (err) {
      setError("Erreur réseau lors du chargement du stock");
      console.error("[GlobalStockPage] Erreur:", err);
    } finally {
      setIsLoading(false);
    }
  }, [filters, installationId]);

  // Gestion des filtres
  const handleFilterChange = useCallback((newFilters: GenericStockFilters) => {
    setFilters(newFilters);
  }, []);

  // Rafraîchir (bouton Réessayer)
  const handleRefresh = useCallback(() => {
    loadStock();
  }, [loadStock]);

  // Le clic sur une carte navigue vers sa fiche générique :
  // niveaux 2-3 de la pyramide (routes posées au round 3,
  // pages construites aux rounds suivants).
  const getCardHref = useCallback(
    (card: GenericStockCard) =>
      installationId
        ? `/installations/${installationId}/stock/${card.id}`
        : `/stock/${card.id}`,
    [installationId]
  );

  return (
    <div className={styles.pageContainer}>
      {/* Header */}
      <header className={styles.header}>
        {installationId ? (
          <Link href={`/installations/${installationId}`} className={styles.backLink}>
            <ArrowLeft size={20} />
            Retour à l'installation
          </Link>
        ) : (
          <Link href="/installations" className={styles.backLink}>
            <ArrowLeft size={20} />
            Mes installations
          </Link>
        )}
        <div className={styles.headerContent}>
          <h1 className={styles.title}>
            <Warehouse size={24} />
            {installationId
              ? `Stock de ${installationName || "l'installation"}`
              : "Mon Stock Global"}
          </h1>
          <p className={styles.subtitle}>
            {installationId
              ? "Vos produits dans cette installation"
              : "Tous vos produits dans toutes vos installations"}
          </p>
        </div>
        {headerExtra}
        {installationId && (
          <Link
            href={`/installations/${installationId}/objects/scan`}
            className={styles.scannerButton}
          >
            <Plus size={18} />
            Scanner un objet
          </Link>
        )}
      </header>

      {/* Statistiques (Q3 : génériques + lignes) */}
      <div style={{ padding: "2rem 0 0 0" }}>
        {stats && <StockStatsComponent stats={stats} />}
      </div>

      {/* Filtres */}
      <div>
        <StockFiltersComponent
          initialFilters={filters}
          onFilterChange={handleFilterChange}
          installations={installations}
          categories={categories}
        />
      </div>

      {/* Liste ou état vide */}
      <main className={styles.mainContent}>
        {isLoading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner} />
            <p>Chargement du stock...</p>
          </div>
        ) : error ? (
          <div className={styles.errorContainer}>
            <p className={styles.errorMessage}>{error}</p>
            <button onClick={handleRefresh} className={styles.retryButton}>
              Réessayer
            </button>
          </div>
        ) : cards.length === 0 ? (
          <StockEmptyState
            message={installationId ? `Le stock de cette installation est vide` : "Votre stock global est vide"}
            installationId={installationId}
          />
        ) : (
          <StockList
            cards={cards}
            getCardHref={getCardHref}
            showInstallation={!installationId}
            forceCardView={forceCardView}
            emptyMessage={installationId ? "Le stock de cette installation est vide" : "Votre stock global est vide"}
            installationId={installationId}
          />
        )}
      </main>
    </div>
  );
}
