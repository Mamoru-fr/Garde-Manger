"use client";

import { useEffect, useState } from "react";
import { StockItemWithExpiryStatus } from "@/lib/types/stockTypes";
import StockItemCard from "./StockItemCard";
import StockItemRow from "./StockItemRow";
import StockEmptyState from "./StockEmptyState";
import styles from "./StockList.module.css";

interface StockListProps {
  items: StockItemWithExpiryStatus[];
  installationId?: string;
  isLoading?: boolean;
  onDetailsClick: (item: StockItemWithExpiryStatus) => void;
  onEdit?: (item: StockItemWithExpiryStatus) => void;
  onDelete?: (item: StockItemWithExpiryStatus) => void;
  forceCardView?: boolean; // Force l'affichage en cartes (ex: pour la page /stock)
}

export default function StockList({
  items,
  installationId,
  isLoading = false,
  onDetailsClick,
  onEdit,
  onDelete,
  forceCardView = false,
}: StockListProps) {
  const [isMobile, setIsMobile] = useState(false);

  // Détecter si l'appareil est mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Si chargement
  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p>Chargement du stock...</p>
      </div>
    );
  }

  // Si vide
  if (!items.length) {
    return (
      <StockEmptyState 
        installationId={installationId}
        message="Votre stock est vide" 
      />
    );
  }

  //Mobile OU forceCardView : affichage en cartes
  if (isMobile || forceCardView) {
    return (
      <div className={styles.listContainer}>
        <div className={styles.grid}>
          {items.map(item => (
            <StockItemCard
              key={item.id}
              item={item}
              onDetailsClick={onDetailsClick}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      </div>
    );
  }

  // Desktop : affichage en tableau
  return (
    <div className={styles.listContainer}>
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr className={styles.headerRow}>
              <th className={styles.headerCell}>Objet</th>
              <th className={styles.headerCell}>Catégorie</th>
              <th className={styles.headerCell}>Quantité</th>
              <th className={styles.headerCell}>Emplacement</th>
              <th className={styles.headerCell}>Péremption</th>
              <th className={styles.headerCell}>Prix</th>
              {installationId === undefined && (
                <th className={styles.headerCell}>Installation</th>
              )}
              <th className={styles.headerCell}>
                <span className={styles.actionsHeader}>Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <StockItemRow
                key={item.id}
                item={item}
                onDetailsClick={onDetailsClick}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
