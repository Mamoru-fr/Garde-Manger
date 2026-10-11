import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Package, Calendar, Layers, MapPin } from "lucide-react";

import { getInstallationDirectoryCard } from "@/lib/actions/StockActions";
import {
  buildInstallationDetailRows,
  calculateDaysUntilExpiry,
  getExpiryStatus,
} from "@/lib/services/StockViewService";
import { auth } from "@/lib/auth/auth";
import { getAuthHeaders } from "@/lib/utils/auth";
import ExpiryBadge from "@/components/stock/ExpiryBadge";
import InstallationDirectoryLines from "@/components/stock/InstallationDirectoryLines";
import styles from "./InstallationStockDetail.module.css";

// ============================================
// FICHE GÉNÉRIQUE D'INSTALLATION (bloc 3, niveau 3 de la pyramide —
// décision Alexis 04/10) : la liste des sachets de CE générique dans
// CETTE installation — données complètes par ligne, édition via la
// page existante, suppression via la route API /api/stock (DELETE).
// L'agrégat en tête est l'agrégat LOCAL : le périmètre de la vue est
// réduit à cette installation (§3.3 : jamais une part du global).
//
// Une fiche de STOCK, comme les niveaux 1 et 2 : elle n'existe que
// portée par des lignes dans cette installation — sinon 404, sans
// distinction (fiche inconnue, hors périmètre ou épuisée : aucune
// fuite d'information).
// ============================================

// Formatages locaux au composant, comme le niveau 2.
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

export default async function InstallationDirectoryPage({
  params,
}: {
  params: Promise<{ id: string; directoryId: string }>;
}) {
  const { id: installationId, directoryId } = await params;

  // Récupérer la session
  const headers = await getAuthHeaders();
  const session = await auth.api.getSession({ headers });

  if (!session?.user) {
    redirect("/connexion");
  }

  // Charger la fiche générique d'installation (carte périmètre = cette
  // installation : ses lignes sont les sachets, déjà triés par la vue).
  const result = await getInstallationDirectoryCard(
    installationId,
    directoryId
  );

  if (!result.success || !result.card) {
    // Fiche inconnue, hors périmètre, ou sans ligne dans cette
    // installation : 404 assumé, comme les niveaux 1 et 2.
    notFound();
  }

  const card = result.card;

  // Le nom de l'installation : portée par chacune de ses lignes (la
  // carte existe, donc elle a au moins une ligne).
  const installationName = card.lines[0]?.installationName ?? "Installation";

  // Les sachets prêts à afficher (statuts de badge calculés dans le
  // service — la page reste muette sur les calculs).
  const rows = buildInstallationDetailRows(card);

  // Statut de péremption de la fiche = celui de sa ligne la plus proche
  // (les helpers purs du StockViewService, réutilisés — pas réinventés).
  const daysUntilExpiry = calculateDaysUntilExpiry(card.nearestExpiryDate);
  const expiryStatus = getExpiryStatus(daysUntilExpiry);

  console.log(
    "[InstallationDirectoryPage] fiche:",
    card.name,
    "- installation:",
    installationName,
    "-",
    rows.length,
    "entrée(s)"
  );

  return (
    <div className={styles.page}>
      {/* En-tête : le générique dans CETTE installation, son agrégat local */}
      <header className={styles.header}>
        <Link
          href={`/installations/${installationId}/stock`}
          className={styles.backLink}
        >
          <ArrowLeft size={18} />
          Stock de {installationName}
        </Link>

        <h1 className={styles.name}>{card.name || "Produit inconnu"}</h1>

        <div className={styles.quantityRow}>
          <span className={styles.quantity}>
            <Package size={18} />
            {card.quantityLabel || "Aucune quantité saisie"}
          </span>
          <span className={styles.linesCount}>
            <Layers size={14} />
            {card.lines.length} entrée{card.lines.length > 1 ? "s" : ""}
          </span>
        </div>

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

        {card.totalValue > 0 && (
          <div className={styles.value}>
            Valeur dans cette installation : {formatPrice(card.totalValue)}
          </div>
        )}
      </header>

      {/* La liste des sachets : édition/suppression par ligne */}
      <main className={styles.main}>
        <InstallationDirectoryLines
          installationId={installationId}
          installationName={installationName}
          cardName={card.name || "Produit inconnu"}
          rows={rows}
        />

        {/* Lien de retour vers la fiche globale (niveau 2) : la même
            fiche, toutes installations confondues. */}
        <Link href={`/stock/${directoryId}`} className={styles.globalLink}>
          <MapPin size={16} />
          Voir la fiche globale (toutes installations)
        </Link>
      </main>
    </div>
  );
}
