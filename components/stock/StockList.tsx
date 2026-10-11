"use client";

// ============================================
// StockList — le rendu de la vue principale
// (bloc 3, niveau 1) : la grille de cartes
// génériques (mobile / forceCardView) ou la table
// desktop. Le clic navigue vers la fiche générique
// (niveaux 2-3 de la pyramide) — le href est
// calculé par le parent selon la vue.
// ============================================

import { useEffect, useState } from "react";
import type { GenericStockCard } from "@/lib/services/StockViewService";
import GenericStockCardComponent from "./GenericStockCard";
import GenericStockRow from "./GenericStockRow";
import StockEmptyState from "./StockEmptyState";
import styles from "./StockList.module.css";

interface StockListProps {
  cards: GenericStockCard[];
  getCardHref: (card: GenericStockCard) => string;
  // Vue globale : colonne/badge des installations porteuses.
  showInstallation?: boolean;
  isLoading?: boolean;
  forceCardView?: boolean; // Force l'affichage en cartes (ex: pour la page /stock)
  emptyMessage: string;
  installationId?: string;
}

export default function StockList({
  cards,
  getCardHref,
  showInstallation = false,
  isLoading = false,
  forceCardView = false,
  emptyMessage,
  installationId,
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
  if (!cards.length) {
    return (
      <StockEmptyState
        installationId={installationId}
        message={emptyMessage}
      />
    );
  }

  // Mobile OU forceCardView : affichage en cartes génériques
  if (isMobile || forceCardView) {
    return (
      <div className={styles.listContainer}>
        <div className={styles.grid}>
          {cards.map((card) => (
            <GenericStockCardComponent
              key={card.id}
              card={card}
              href={getCardHref(card)}
              showInstallation={showInstallation}
            />
          ))}
        </div>
      </div>
    );
  }

  // Desktop : affichage en table de fiches génériques
  return (
    <div className={styles.listContainer}>
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr className={styles.headerRow}>
              <th className={styles.headerCell}>Produit</th>
              <th className={styles.headerCell}>Catégorie</th>
              <th className={styles.headerCell}>Quantité</th>
              <th className={styles.headerCell}>Péremption</th>
              {showInstallation && (
                <th className={styles.headerCell}>Installation</th>
              )}
              <th className={styles.headerCell}>
                <span className={styles.actionsHeader}>Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {cards.map((card) => (
              <GenericStockRow
                key={card.id}
                card={card}
                href={getCardHref(card)}
                showInstallation={showInstallation}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
