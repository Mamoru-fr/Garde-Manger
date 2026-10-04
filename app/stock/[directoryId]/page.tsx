import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Package,
  Calendar,
  Layers,
  MapPin,
  ChevronRight,
} from "lucide-react";

import { getGenericDirectoryCard } from "@/lib/actions/StockActions";
import {
  calculateDaysUntilExpiry,
  getExpiryStatus,
} from "@/lib/services/StockViewService";
import { auth } from "@/lib/auth/auth";
import { getAuthHeaders } from "@/lib/utils/auth";
import ExpiryBadge from "@/components/stock/ExpiryBadge";
import DirectoryVariantsSection from "@/components/stock/DirectoryVariantsSection";
import styles from "./StockDetail.module.css";

// ============================================
// Fiche générique globale (bloc 3, niveau 2 de
// la pyramide — décision Alexis 04/10) : l'agrégat
// de TOUT le périmètre de l'utilisateur en tête,
// l'encadré « quantité par installation » dessous,
// chaque ligne pointe vers le niveau 3 (la liste des
// sachets de ce générique dans cette installation).
//
// Une fiche de STOCK, pas d'annuaire : elle n'existe
// que portée par des lignes dans le périmètre —
// sinon 404, sans distinction (fiche inconnue ou
// simplement épuisée : même réponse, pas d'indice).
// ============================================

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

export default async function GenericDirectoryPage({
  params,
}: {
  params: Promise<{ directoryId: string }>;
}) {
  const { directoryId } = await params;

  // Récupérer la session
  const headers = await getAuthHeaders();
  const session = await auth.api.getSession({ headers });

  if (!session?.user) {
    redirect("/connexion");
  }

  // Charger la fiche générique globale (carte + encadré par installation).
  const result = await getGenericDirectoryCard(directoryId);

  if (!result.success || !result.card) {
    // Fiche inconnue, hors périmètre, ou sans aucune ligne — le niveau 2
    // est une fiche de stock : 404 assumé, comme au niveau 1 avant lui.
    notFound();
  }

  const card = result.card;
  const breakdown = result.breakdown ?? [];

  // Statut de péremption de la fiche = celui de sa ligne la plus proche
  // (calculs purs du StockViewService, réutilisés — pas réinventés).
  const daysUntilExpiry = calculateDaysUntilExpiry(card.nearestExpiryDate);
  const expiryStatus = getExpiryStatus(daysUntilExpiry);

  console.log(
    "[StockDirectoryPage] fiche:",
    card.name,
    "-",
    breakdown.length,
    "installation(s)"
  );

  return (
    <div className={styles.page}>
      {/* En-tête : le générique, son agrégat global, sa péremption */}
      <header className={styles.header}>
        <Link href="/stock" className={styles.backLink}>
          <ArrowLeft size={18} />
          Mon stock
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
            Valeur totale : {formatPrice(card.totalValue)}
          </div>
        )}
      </header>

      {/* L'encadré « quantité par installation » (décision pyramide) */}
      <main className={styles.main}>
        <section className={styles.breakdownCard}>
          <h2 className={styles.sectionTitle}>
            <MapPin size={16} />
            Quantité par installation
          </h2>

          {breakdown.length === 0 ? (
            <p className={styles.empty}>
              Aucune installation ne porte ce générique.
            </p>
          ) : (
            <ul className={styles.installationList}>
              {breakdown.map((entry) => (
                <li
                  key={entry.installationId}
                  className={styles.installationItem}
                >
                  <div className={styles.installationInfo}>
                    <span className={styles.installationName}>
                      {entry.installationName}
                    </span>
                    <span className={styles.installationQuantity}>
                      {entry.quantityLabel || "Quantité non saisie"}
                    </span>
                    <span className={styles.installationMeta}>
                      {entry.nearestExpiryDate
                        ? `Péremption : ${formatDate(entry.nearestExpiryDate)}`
                        : "Pas de péremption"}
                      {" · "}
                      {entry.linesCount} entrée{entry.linesCount > 1 ? "s" : ""}
                    </span>
                  </div>
                  {/* Niveau 3 : la liste des sachets dans cette installation.
                      Route construite au round suivant — lien honnête
                      vers demain, comme les cartes du niveau 1 hier. */}
                  <Link
                    href={`/installations/${entry.installationId}/stock/${card.id}`}
                    className={styles.installationLink}
                  >
                    Voir les entrées
                    <ChevronRight size={16} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* La section repliable « voir les différents X » (bloc 4, Q1a) :
            les marques du générique, chargées à la demande, chaque ligne
            pointe vers sa fiche détail dédiée (Q2b). Le bouton
            « réaffilier » de Q3a viendra au round 3. */}
        <DirectoryVariantsSection
          directoryId={directoryId}
          directoryName={card.name}
        />
      </main>
    </div>
  );
}
