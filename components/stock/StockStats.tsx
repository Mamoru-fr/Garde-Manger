"use client";

import { AlertTriangle, Package, Calendar, Euro } from "lucide-react";
import { StockStats as StockStatsType } from "@/lib/types/stockTypes";
import styles from "./StockStats.module.css";

interface StockStatsProps {
  stats: StockStatsType;
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
      {/* Total items */}
      <div className={styles.statCard}>
        <div className={styles.statIcon}>
          <Package size={20} />
        </div>
        <div className={styles.statContent}>
          <span className={styles.statValue}>{stats.totalItems}</span>
          <span className={styles.statLabel}>
            {stats.totalItems <= 1 ? "Objet" : "Objets"}
          </span>
        </div>
      </div>

      {/* Total quantité */}
      <div className={styles.statCard}>
        <div className={styles.statIcon}>
          <Package size={20} />
        </div>
        <div className={styles.statContent}>
          <span className={styles.statValue}>{stats.totalQuantity}</span>
          <span className={styles.statLabel}>Quantité totale</span>
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

      {/* Péremptions proches */}
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
