"use client";

// ============================================
// GenericStockCard — la carte d'une fiche générique
// de la vue principale (bloc 3, niveau 1 de la pyramide).
//
// Sans marque, sans nutriscore, sans image : la fiche
// générique est un nom, un empilement de quantités (§3.3),
// une péremption la plus proche et ses installations
// porteuses. Les détails vivent aux niveaux 2-3.
//
// Clic = navigation vers la fiche générique (décision
// pyramide du 04/10) : le href est fourni par le parent
// selon la vue (globale → /stock/[directoryId],
// installation → /installations/[id]/stock/[directoryId]).
// ============================================

import Link from "next/link";
import { Package, Calendar, ChevronRight, Layers } from "lucide-react";
import type { GenericStockCard } from "@/lib/services/StockViewService";
import {
  calculateDaysUntilExpiry,
  getExpiryStatus,
} from "@/lib/services/StockViewService";
import ExpiryBadge from "./ExpiryBadge";
import styles from "./StockItemCard.module.css";

interface GenericStockCardProps {
  card: GenericStockCard;
  href: string;
  // Vue globale : liste des installations porteuses de la fiche.
  showInstallation?: boolean;
}

// Formatage de date — local au composant, comme l'existant.
const formatDate = (date: Date | null): string => {
  if (!date) return "-";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
};

export default function GenericStockCard({
  card,
  href,
  showInstallation = false,
}: GenericStockCardProps) {
  // Statut de péremption de la fiche = celui de sa ligne la plus proche
  // (calculs purs du StockViewService, réutilisés — pas réinventés).
  const daysUntilExpiry = calculateDaysUntilExpiry(card.nearestExpiryDate);
  const expiryStatus = getExpiryStatus(daysUntilExpiry);

  console.log("[GenericStockCard] rendu:", card.name, card.quantityLabel);

  return (
    <div className={styles.card}>
      {/* Contenu principal */}
      <div className={styles.content}>
        {/* En-tête : le nom du générique, sans marque ni nutriscore */}
        <div className={styles.header}>
          <h3 className={styles.name}>{card.name || "Produit inconnu"}</h3>
        </div>

        {/* Quantité agrégée (§3.3 + §4) : « 1500 g (dont 2 sachets de 250 g) » */}
        {card.quantityLabel && (
          <div className={styles.detailsRow}>
            <span className={styles.quantity}>
              <Package size={14} />
              {card.quantityLabel}
            </span>
          </div>
        )}

        {/* Péremption la plus proche de la fiche */}
        <div className={styles.expiryRow}>
          {card.nearestExpiryDate && (
            <span className={styles.expiryDate}>
              <Calendar size={14} />
              {formatDate(card.nearestExpiryDate)}
            </span>
          )}
          <ExpiryBadge
            expiryStatus={expiryStatus}
            daysUntilExpiry={daysUntilExpiry}
          />
        </div>

        {/* Installations porteuses (vue globale uniquement) */}
        {showInstallation && card.installations.length > 0 && (
          <div className={styles.installation}>
            <span className={styles.installationLabel}>
              {card.installations.map((i) => i.name).join(", ")}
            </span>
          </div>
        )}
      </div>

      {/* Pied : navigation + nombre de lignes d'instance */}
      <div className={styles.footer}>
        <Link href={href} className={styles.detailsButton}>
          Voir la fiche
          <ChevronRight size={16} />
        </Link>
        <span className={styles.actions}>
          <Layers size={14} />
          {card.lines.length} entrée{card.lines.length > 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}
