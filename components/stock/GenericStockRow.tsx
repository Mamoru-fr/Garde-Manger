"use client";

// ============================================
// GenericStockRow — une fiche générique dans la
// table desktop de la vue principale (bloc 3,
// niveau 1 de la pyramide). Même contenu que
// GenericStockCard, en ligne : nom sans marque,
// agrégat, péremption la plus proche, installations.
// ============================================

import Link from "next/link";
import { Eye } from "lucide-react";
import type { GenericStockCard } from "@/lib/services/StockViewService";
import {
  calculateDaysUntilExpiry,
  getExpiryStatus,
} from "@/lib/services/StockViewService";
import ExpiryBadge from "./ExpiryBadge";
import styles from "./StockItemRow.module.css";

interface GenericStockRowProps {
  card: GenericStockCard;
  href: string;
  // Vue globale : colonne des installations porteuses.
  showInstallation?: boolean;
}

const formatDate = (date: Date | null): string => {
  if (!date) return "-";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  }).format(date);
};

export default function GenericStockRow({
  card,
  href,
  showInstallation = false,
}: GenericStockRowProps) {
  const daysUntilExpiry = calculateDaysUntilExpiry(card.nearestExpiryDate);
  const expiryStatus = getExpiryStatus(daysUntilExpiry);

  return (
    <tr className={styles.row}>
      {/* Produit générique : le nom seul, sans marque ni nutriscore */}
      <td className={styles.cell}>
        <span className={styles.name}>{card.name || "Produit inconnu"}</span>
      </td>

      {/* Catégorie */}
      <td className={styles.cell}>{card.category || "-"}</td>

      {/* Quantité agrégée (§3.3 + §4) */}
      <td className={styles.cell}>
        <span className={styles.quantity}>{card.quantityLabel || "-"}</span>
      </td>

      {/* Péremption la plus proche */}
      <td className={styles.cell}>
        <div className={styles.expiryCell}>
          {card.nearestExpiryDate ? formatDate(card.nearestExpiryDate) : "-"}
          <ExpiryBadge
            expiryStatus={expiryStatus}
            daysUntilExpiry={daysUntilExpiry}
          />
        </div>
      </td>

      {/* Installations porteuses (vue globale uniquement) */}
      {showInstallation && (
        <td className={styles.cell}>
          <span className={styles.installationLabel}>
            {card.installations.map((i) => i.name).join(", ")}
          </span>
        </td>
      )}

      {/* Navigation vers la fiche générique */}
      <td className={styles.cell}>
        <div className={styles.actions}>
          <Link
            href={href}
            className={styles.actionButton}
            title="Voir la fiche générique"
          >
            <Eye size={16} />
          </Link>
        </div>
      </td>
    </tr>
  );
}
