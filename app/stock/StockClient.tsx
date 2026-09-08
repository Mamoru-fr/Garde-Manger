"use client";

import { useState, useEffect, useCallback } from "react";
import { Warehouse, ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";
import { StockItemWithExpiryStatus } from "@/lib/types/stockTypes";
import type { StockFilters, StockStats } from "@/lib/types/stockTypes";
import StockList from "@/components/stock/StockList";
import StockFiltersComponent from "@/components/stock/StockFilters";
import StockStatsComponent from "@/components/stock/StockStats";
import StockDetailsModal from "@/components/stock/StockDetailsModal";
import StockEmptyState from "@/components/stock/StockEmptyState";
import styles from "./Stock.module.css";

interface StockClientProps {
  initialData?: {
    items: StockItemWithExpiryStatus[];
    stats: StockStats | null;
    installations: { id: string; name: string }[];
    categories: { id: string; name: string }[];
  };
  installationId?: string;
  installationName?: string;
}

export default function StockClient({
  initialData,
  installationId,
  installationName,
}: StockClientProps) {
  const [items, setItems] = useState<StockItemWithExpiryStatus[]>([]);
  const [stats, setStats] = useState<StockStats | null>(null);
  const [filters, setFilters] = useState<StockFilters>({
    sortBy: "expiry_date",
    sortOrder: "asc",
    ...(installationId ? { installationId } : {}),
  });
  const [isLoading, setIsLoading] = useState(!initialData);
  const [selectedItem, setSelectedItem] = useState<StockItemWithExpiryStatus | null>(null);
  const [installations, setInstallations] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Initialiser avec les données du serveur
  useEffect(() => {
    if (initialData) {
      setItems(initialData.items || []);
      setStats(initialData.stats || null);
      setInstallations(initialData.installations || []);
      setCategories(initialData.categories || []);
    }
  }, [initialData]);

  // Charger les données depuis le client
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

      const url = installationId
        ? `/api/stock?installationId=${installationId}&${params.toString()}`
        : `/api/stock?${params.toString()}`;

      const response = await fetch(url);
      const result = await response.json();

      if (!result.success) {
        setError(result.error || "Erreur lors du chargement du stock");
        setItems([]);
        setStats(null);
      } else {
        setItems(result.data || []);
        setStats(result.stats || null);

        // Extraire les installations et catégories uniques
        if (result.data) {
          const uniqueInstallations = result.data.reduce(
            (acc: { id: string; name: string }[], item: StockItemWithExpiryStatus) => {
              const exists = acc.some((i) => i.id === item.installationId);
              if (!exists && item.installationId && item.installationName) {
                acc.push({ id: item.installationId, name: item.installationName });
              }
              return acc;
            },
            []
          );
          setInstallations(uniqueInstallations);

          const uniqueCategories = result.data.reduce(
            (acc: { id: string; name: string }[], item: StockItemWithExpiryStatus) => {
              if (item.category && !acc.some((c) => c.id === item.category)) {
                acc.push({ id: item.category, name: item.category });
              }
              return acc;
            },
            []
          );
          setCategories(uniqueCategories);
        }
      }
    } catch (err) {
      setError("Erreur réseau lors du chargement du stock");
      console.error("[GlobalStockPage] Erreur:", err);
    } finally {
      setIsLoading(false);
    }
  }, [filters, installationId]);

  // Gestion des filtres
  const handleFilterChange = useCallback((newFilters: StockFilters) => {
    setFilters(newFilters);
  }, []);

  // Gestion de la modale
  const handleItemClick = useCallback((item: StockItemWithExpiryStatus) => {
    setSelectedItem(item);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedItem(null);
  }, []);

  // Rafraîchir après modification/suppression
  const handleRefresh = useCallback(() => {
    loadStock();
    setSelectedItem(null);
  }, [loadStock]);

  // Actions sur les items
  const handleSave = useCallback(
    async (updatedItem: StockItemWithExpiryStatus) => {
      if (!updatedItem.installationId || !updatedItem.id) return;

      try {
        const response = await fetch("/api/stock", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            installationId: updatedItem.installationId,
            objectInstallationId: updatedItem.id,
            updates: {
              quantity: updatedItem.quantity,
              location: updatedItem.location,
              purchaseDate: updatedItem.purchaseDate,
              expiryDate: updatedItem.expiryDate,
              lotNumber: updatedItem.lotNumber,
              price: updatedItem.price,
              notes: updatedItem.notes,
              shopId: updatedItem.shopId,
            },
          }),
        });

        const result = await response.json();

        if (result.success) {
          handleRefresh();
        } else {
          setError(result.error || "Erreur lors de la mise à jour");
        }
      } catch (err) {
        setError("Erreur lors de la mise à jour");
        console.error("[StockClient] Erreur save:", err);
      }
    },
    [handleRefresh]
  );

  const handleDelete = useCallback(
    async (item: StockItemWithExpiryStatus) => {
      if (!item.installationId || !item.id) return;

      try {
        const response = await fetch("/api/stock", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            installationId: item.installationId,
            objectInstallationId: item.id,
          }),
        });

        const result = await response.json();

        if (result.success) {
          handleRefresh();
        } else {
          setError(result.error || "Erreur lors de la suppression");
        }
      } catch (err) {
        setError("Erreur lors de la suppression");
        console.error("[StockClient] Erreur delete:", err);
      }
    },
    [handleRefresh]
  );

  return (
    <div className={styles.pageContainer}>
      {/* Header */}
      <header className={styles.header}>
        {installationId ? (
          <Link href={`/installations/${installationId}`} className={styles.backLink}>
            <ArrowLeft size={20} />
            Retour à l&apos;installation
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
              ? "Gestion des objets dans cette installation"
              : "Tous vos objets dans toutes vos installations"}
          </p>
        </div>
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

      {/* Statistiques */}
      <div style={{ padding: "2rem 0" }}>
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
            <button onClick={loadStock} className={styles.retryButton}>
              Réessayer
            </button>
          </div>
        ) : items.length === 0 ? (
          <StockEmptyState
            message={installationId ? `Le stock de cette installation est vide` : "Votre stock global est vide"}
            installationId={installationId}
          />
        ) : (
          <StockList
            items={items}
            onDetailsClick={handleItemClick}
          />
        )}
      </main>

      {/* Modale de détails */}
      {selectedItem && (
        <StockDetailsModal
          item={selectedItem}
          onClose={handleCloseModal}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
