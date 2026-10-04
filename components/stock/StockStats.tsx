"use client";

// ============================================
// StockStats — le bandeau de la vue générique
// (bloc 3, décision Q3) : totalItems compte les
// FICHES GÉNÉRIQUES, totalLines les lignes
// d'instance (une par sachet/ajout). Plus aucun
// total de quantité inter-familles — aucun total
// honnête n'existe entre grammes et litres.
// ============================================

import { AlertTriangle, Package, Euro, Layers } from "lucide-react";
// Type importé de la couche data : import type uniquement,
// le module charge la DB et le type seul s'efface à la compilation.
import type { GenericStockStats } from "@/lib/services/StockQueryService";
import styles from "./StockStats.module.css";

interface StockStatsProps {
  stats: GenericStockStats;
  installationId?: string;
}

export default function StockStats({ stats, installationId }: StockStatsProps) {
  // Formater le prix en euros
  const formatPrice = (cents: number): string => {
    return (cents / 100).toLocaleString('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className={styles.statsContainer}>
      {/* Total des fiches génériques */}
      <div className={styles.statCard}>
        <div className={styles.statIcon}>
          <Package size={20} />
        </div>
        <div className={styles.statContent}>
          <span className={styles.statValue}>{stats.totalItems}</span>
          <span className={styles.statLabel}>
            {stats.totalItems <= 1 ? "Produit" : "Produits"}
          </span>
        </div>
      </div>

      {/* Total des lignes d'instance (une par sachet/ajout) */}
      <div className={styles.statCard}>
        <div className={styles.statIcon}>
          <Layers size={20} />
        </div>
        <div className={styles.statContent}>
          <span className={styles.statValue}>{stats.totalLines}</span>
          <span className={styles.statLabel}>
            {stats.totalLines <= 1 ? "Entrée" : "Entrées"}
          </span>
        </div>
      </div>

      {/* Valeur totale */}
      {stats.totalValue > 0 && (
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Euro size={20} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{formatPrice(stats.totalValue)}</span>
            <span className={styles.statLabel}>Valeur estimée</span>
          </div>
        </div>
      )}

      {/* Péremptions proches (comptées par ligne — Q3) */}
      <div className={styles.statCard}>
        <div className={styles.statIcon}>
          <AlertTriangle size={20} />
        </div>
        <div className={styles.statContent}>
          <span className={styles.statValue}>
            {stats.expiringSoonCount + stats.expiredCount}
          </span>
          <span className={styles.statLabel}>
            {stats.expiredCount > 0
              ? `Périmés (${stats.expiredCount})`
              : "À surveiller"}
          </span>
        </div>
      </div>
    </div>
  );
}
