"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Filter, X, ChevronDown, Calendar, MapPin, Tag, SortAsc, SortDesc } from "lucide-react";
import { StockFilters as StockFiltersType } from "@/lib/types/stockTypes";
import styles from "./StockFilters.module.css";

interface StockFiltersProps {
  installations?: Array<{ id: string; name: string }>;
  categories?: Array<{ id: string; name: string }>;
  locations?: string[];
  initialFilters?: StockFiltersType;
  onFilterChange: (filters: StockFiltersType) => void;
}

export default function StockFilters({
  installations = [],
  categories = [],
  locations = [],
  initialFilters = {},
  onFilterChange,
}: StockFiltersProps) {
  const [filters, setFilters] = useState<StockFiltersType>(initialFilters);
  const [isExpanded, setIsExpanded] = useState(false);

  // Appliquer les changements de filtres avec un léger délai pour éviter trop de raffraîchissements
  useEffect(() => {
    const timer = setTimeout(() => {
      onFilterChange(filters);
    }, 300);
    return () => clearTimeout(timer);
  }, [filters, onFilterChange]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, searchQuery: e.target.value }));
  }, []);

  const handleCategoryChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, category: e.target.value || undefined }));
  }, []);

  const handleInstallationChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters(prev => ({ 
      ...prev, 
      installationId: e.target.value || undefined 
    }));
  }, []);

  const handleLocationChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, location: e.target.value || undefined }));
  }, []);

  const handleExpiryStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters(prev => ({ 
      ...prev, 
      expiryStatus: e.target.value as 'all' | 'warning' | 'urgent' | 'expired' | 'no_date' | 'normal' 
    }));
  }, []);

  const handleSortChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, sortBy: e.target.value as 'name' | 'quantity' | 'expiry_date' | 'purchase_date' | 'added_date' }));
  }, []);

  const handleSortOrderChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, sortOrder: e.target.value as 'asc' | 'desc' }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({});
  }, []);

  const activeFiltersCount = Object.values(filters).filter(
    (value) => value !== undefined && value !== '' && value !== 'all'
  ).length;

  return (
    <div className={styles.filtersContainer}>
      <div className={styles.filtersHeader}>
        <button 
          type="button" 
          onClick={() => setIsExpanded(!isExpanded)}
          className={styles.expandButton}
        >
          <Filter size={18} />
          Filtres
          {activeFiltersCount > 0 && (
            <span className={styles.activeFiltersCount}>{activeFiltersCount}</span>
          )}
          <ChevronDown 
            size={16} 
            className={`${styles.chevron} ${isExpanded ? styles.chevronRotated : ''}`}
          />
        </button>
        
        {activeFiltersCount > 0 && (
          <button 
            type="button" 
            onClick={resetFilters}
            className={styles.resetButton}
            title="Réinitialiser les filtres"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {isExpanded && (
        <div className={styles.filtersContent}>
          {/* Recherche */}
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>
              <Search size={16} />
              Recherche
            </label>
            <div className={styles.inputWrapper}>
              <Search size={16} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Nom, code-barres, marque..."
                value={filters.searchQuery || ''}
                onChange={handleSearchChange}
                className={styles.searchInput}
              />
            </div>
          </div>

          {/* Filtres en grille */}
          <div className={styles.filtersGrid}>
            {/* Installation (uniquement pour la vue globale) */}
            {installations.length > 0 && (
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>
                  <Tag size={16} />
                  Installation
                </label>
                <select
                  value={filters.installationId || ''}
                  onChange={handleInstallationChange}
                  className={styles.selectInput}
                >
                  <option value="">Toutes les installations</option>
                  {installations.map(installation => (
                    <option key={installation.id} value={installation.id}>
                      {installation.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Catégorie */}
            {categories.length > 0 && (
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>
                  <Tag size={16} />
                  Catégorie
                </label>
                <select
                  value={filters.category || ''}
                  onChange={handleCategoryChange}
                  className={styles.selectInput}
                >
                  <option value="">Toutes les catégories</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Emplacement */}
            {locations.length > 0 && (
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>
                  <MapPin size={16} />
                  Emplacement
                </label>
                <select
                  value={filters.location || ''}
                  onChange={handleLocationChange}
                  className={styles.selectInput}
                >
                  <option value="">Tous les emplacements</option>
                  {[...new Set(locations)].map(location => (
                    <option key={location} value={location}>
                      {location || 'Non spécifié'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Statut de péremption */}
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>
                <Calendar size={16} />
                Péremption
              </label>
              <select
                value={filters.expiryStatus || 'all'}
                onChange={handleExpiryStatusChange}
                className={styles.selectInput}
              >
                <option value="all">Tous les statuts</option>
                <option value="normal">OK (plus de 7 jours)</option>
                <option value="warning">Bientôt périmé (3-7 jours)</option>
                <option value="urgent">À consommer vite (moins de 3 jours)</option>
                <option value="expired">Périmé</option>
                <option value="no_date">Pas de date</option>
              </select>
            </div>
          </div>

          {/* Tri */}
          <div className={styles.sortGroup}>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>
                <SortAsc size={16} />
                Trier par
              </label>
              <select
                value={filters.sortBy || 'name'}
                onChange={handleSortChange}
                className={styles.selectInput}
              >
                <option value="name">Nom</option>
                <option value="quantity">Quantité</option>
                <option value="expiry_date">Date de péremption</option>
                <option value="purchase_date">Date d'achat</option>
                <option value="added_date">Date d'ajout</option>
              </select>
            </div>
            
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>
                <SortDesc size={16} />
                Ordre
              </label>
              <select
                value={filters.sortOrder || 'asc'}
                onChange={handleSortOrderChange}
                className={styles.selectInput}
              >
                <option value="asc">Croissant</option>
                <option value="desc">Décroissant</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
