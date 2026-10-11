"use client";

// ============================================
// LES SACHETS D'UNE INSTALLATION (niveau 3 de la pyramide — bloc 3)
// Composant client car la suppression est une interaction : confirm,
// appel à l'entrée officielle (route API /api/stock DELETE — posée au
// round 3 pour servir le niveau 3), puis refresh. L'édition, elle,
// est un simple LIEN vers la page existante d'édition de la ligne
// (RÉUTILISATION — règle 1 de tour-de-main : zéro nouveau formulaire).
//
// Les calculs vivent dans StockViewService (buildInstallationDetailRows)
// : ce composant affiche, il ne calcule pas.
// ============================================

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Package,
  MapPin,
  Calendar,
  Euro,
  StickyNote,
  Edit,
  Trash2,
} from "lucide-react";
import type { InstallationDetailRow } from "@/lib/services/StockViewService";
import ExpiryBadge from "./ExpiryBadge";
import styles from "./InstallationDirectoryLines.module.css";

interface InstallationDirectoryLinesProps {
  installationId: string;
  installationName: string;
  cardName: string;
  rows: InstallationDetailRow[];
}

// Formatages locaux au composant, comme l'existant.
const formatDate = (date: Date | null): string => {
  if (!date) return "-";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
};

const formatPrice = (cents: number): string => {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
};

export default function InstallationDirectoryLines({
  installationId,
  installationName,
  cardName,
  rows,
}: InstallationDirectoryLinesProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async (row: InstallationDetailRow) => {
    if (
      !window.confirm(
        `Supprimer « ${row.quantityLabel} » de ${cardName} (${installationName}) ? Cette action est irréversible.`
      )
    ) {
      return;
    }
    setDeletingId(row.id);
    setError(null);
    try {
      // L'entrée officielle d'un composant client : la route API
      // /api/stock (DELETE), jamais le service directement.
      const response = await fetch("/api/stock", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          installationId,
          objectInstallationId: row.id,
        }),
      });
      const result = await response.json();

      if (result.success) {
        console.log(
          "[InstallationDirectoryLines] ligne supprimée:",
          row.id,
          "-",
          cardName
        );
        if (rows.length === 1) {
          // Dernière ligne supprimée : la fiche n'existe plus (fiche de
          // STOCK — le niveau 3 meurt avec sa dernière ligne). Retour
          // au stock de l'installation plutôt qu'un 404 au refresh.
          router.push(`/installations/${installationId}/stock`);
        } else {
          startTransition(() => router.refresh());
        }
      } else {
        setError(result.error || "Échec de la suppression");
      }
    } catch (e) {
      console.error(
        "[InstallationDirectoryLines] Erreur lors de la suppression:",
        e
      );
      setError("Une erreur est survenue lors de la suppression");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className={styles.linesCard}>
      <h2 className={styles.sectionTitle}>
        <Package size={16} />
        Les entrées dans {installationName}
      </h2>

      {error && <p className={styles.error}>{error}</p>}

      {rows.length === 0 ? (
        <p className={styles.empty}>Aucune entrée dans cette installation.</p>
      ) : (
        <ul className={styles.lineList}>
          {rows.map((row) => (
            <li key={row.id} className={styles.lineItem}>
              <div className={styles.lineInfo}>
                <span className={styles.quantity}>{row.quantityLabel}</span>
                <ExpiryBadge
                  expiryStatus={row.expiryStatus}
                  daysUntilExpiry={row.daysUntilExpiry}
                />
                {row.expiryDate && (
                  <span className={styles.meta}>
                    <Calendar size={14} />
                    {formatDate(row.expiryDate)}
                  </span>
                )}
                {row.location && (
                  <span className={styles.meta}>
                    <MapPin size={14} />
                    {row.location}
                  </span>
                )}
                {row.purchaseDate && (
                  <span className={styles.meta}>
                    <Calendar size={14} />
                    Acheté le {formatDate(row.purchaseDate)}
                  </span>
                )}
                {row.price != null && (
                  <span className={styles.meta}>
                    <Euro size={14} />
                    {formatPrice(row.price)}
                  </span>
                )}
                {row.note && (
                  <span className={styles.note}>
                    <StickyNote size={14} />
                    {row.note}
                  </span>
                )}
              </div>

              {row.hasEditPermission && (
                <div className={styles.actions}>
                  {/* Édition : la page existante de la ligne. */}
                  <Link
                    href={`/installations/${installationId}/objects/${row.id}/edit`}
                    className={styles.editLink}
                  >
                    <Edit size={16} />
                    Éditer
                  </Link>
                  <button
                    type="button"
                    className={styles.deleteButton}
                    onClick={() => handleDelete(row)}
                    disabled={isPending || deletingId === row.id}
                  >
                    <Trash2 size={16} />
                    {deletingId === row.id ? "Suppression…" : "Supprimer"}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
