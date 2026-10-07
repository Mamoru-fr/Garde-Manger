import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Lock, Package, Calendar, ExternalLink } from "lucide-react";

import { getVariantCard } from "@/lib/actions/VariantActions";
import VariantImage from "@/components/stock/VariantImage";
import { auth } from "@/lib/auth/auth";
import { getAuthHeaders } from "@/lib/utils/auth";
import styles from "./VariantDetail.module.css";

// ============================================
// FICHE DÉTAIL VARIANTE (bloc 4, round 2 — Q2b)
// Modèle générique/poids — spec §2.2 : une fiche
// détail est de l'INFORMATION PRODUIT (marque,
// Nutri-Score, image, OFF, nutriments), jamais une
// fiche de stock — aucune quantité ici, la quantité
// vit sur la fiche générique (niveau 2).
//
// Fondation posée ce round (décision Alexis 04/10) :
// la page existe, porte tout ce que la carte sait,
// et sera enrichie plus tard (nutriments formatés,
// rattachement scan 4:2…).
//
// Une référence GLOBALE : elle existe même si aucun
// stock ne la porte — pas de 404 « hors périmètre »
// ici, seulement « variante inconnue ».
// ============================================

// Pastille Nutri-Score aux couleurs officielles (A→E).
const NUTRISCORE_COLORS: Record<string, string> = {
  A: "#038141",
  B: "#85bb2f",
  C: "#fecb02",
  D: "#ee8100",
  E: "#e63e08",
};

// Formatage local au composant, comme l'existant. La carte
// porte des chaînes ISO (le JSON du client ne transporte pas
// de Date — sérialisées par le VariantViewService).
const formatDate = (iso: string | null): string => {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
};

// Les nutriments sont un JSONB à structure OFF flexible (spec §8) :
// la fondation les liste tels quels, clé → valeur, sans supposer
// un schéma. L'enrichissement (libellés FR, unités, tri) viendra
// avec l'affichage complet.
const formatNutrientValue = (value: unknown): string => {
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }
  return String(value);
};

export default async function VariantDetailPage({
  params,
}: {
  params: Promise<{ directoryId: string; variantId: string }>;
}) {
  const { directoryId, variantId } = await params;

  // Récupérer la session
  const headers = await getAuthHeaders();
  const session = await auth.api.getSession({ headers });

  if (!session?.user) {
    redirect("/connexion");
  }

  // Charger la fiche détail variante (carte du VariantViewService).
  const result = await getVariantCard(variantId);

  if (!result.success || !result.data) {
    // Variante inconnue : 404 sans indice (référence globale,
    // mais un id qui n'existe pas en base reste une page morte).
    notFound();
  }

  const card = result.data.card;

  // Garde défensive : la jointure parent est normalement toujours
  // là (FK cascade), le builder pur garde le cas orphelin — on
  // redirige vers le générique réel de la carte plutôt que mentir.
  if (!card.generic || card.generic.id !== directoryId) {
    if (card.generic) {
      redirect(`/stock/${card.generic.id}/variantes/${variantId}`);
    }
    // Orphelin réel (improbable) : pas de fil d'Ariane possible.
    redirect("/stock");
  }

  console.log(
    "[VariantDetailPage] fiche variante:",
    card.brandLabel,
    "-",
    card.generic?.name
  );

  const nutrients = card.nutrients
    ? Object.entries(card.nutrients)
    : [];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        {/* Le fil d'Ariane suit la pyramide : générique ← stock */}
        <Link
          href={`/stock/${card.generic.id}`}
          className={styles.backLink}
        >
          <ArrowLeft size={18} />
          {card.generic.name || "Produit"}
        </Link>

        <h1 className={styles.name}>{card.brandLabel}</h1>

        <div className={styles.metaRow}>
          <span className={styles.parent}>
            <Package size={14} />
            {card.generic.name}
          </span>

          {card.nutriscore ? (
            <span
              className={styles.nutriscoreBadge}
              style={{
                background: NUTRISCORE_COLORS[card.nutriscore] ?? "#7a6a58",
              }}
            >
              {card.nutriscore}
            </span>
          ) : (
            <span className={styles.noNutriscore}>Pas de Nutri-Score</span>
          )}

          {card.isReadOnly && (
            <span className={styles.readOnly}>
              <Lock size={12} />
              Fiche OpenFoodFacts (lecture seule)
            </span>
          )}
        </div>

        {/* Handler onError interdit en Server Component (fonction prop
            non sérialisable) — il vit dans VariantImage, composant client
            (pattern ObjectGlobalCard). */}
        {card.imageUrl && (
          <VariantImage
            src={card.imageUrl}
            alt={`Photo de ${card.brandLabel}`}
            className={styles.productImage}
          />
        )}
      </header>

      <main className={styles.main}>
        {/* Les nutriments (spec §8 — structure OFF flexible) */}
        <section className={styles.detailCard}>
          <h2 className={styles.sectionTitle}>Nutriments (pour 100 g)</h2>

          {nutrients.length === 0 ? (
            <p className={styles.empty}>Aucune donnée nutritionnelle.</p>
          ) : (
            <ul className={styles.nutrientList}>
              {nutrients.map(([key, value]) => (
                <li key={key} className={styles.nutrientItem}>
                  <span className={styles.nutrientKey}>{key}</span>
                  <span className={styles.nutrientValue}>
                    {formatNutrientValue(value)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* La carte d'identité de la référence */}
        <section className={styles.detailCard}>
          <h2 className={styles.sectionTitle}>Référence</h2>
          <ul className={styles.referenceList}>
            <li className={styles.referenceItem}>
              <span className={styles.referenceKey}>Marque</span>
              <span className={styles.referenceValue}>
                {card.hasBrand ? card.brand : "Sans marque"}
              </span>
            </li>
            <li className={styles.referenceItem}>
              <span className={styles.referenceKey}>Produit générique</span>
              <span className={styles.referenceValue}>
                {card.generic.name}
              </span>
            </li>
            {card.openFoodFactsId && (
              <li className={styles.referenceItem}>
                <span className={styles.referenceKey}>OpenFoodFacts</span>
                <span className={styles.referenceValue}>
                  {card.openFoodFactsId}
                </span>
              </li>
            )}
            <li className={styles.referenceItem}>
              <span className={styles.referenceKey}>Créée le</span>
              <span className={styles.referenceValue}>
                <Calendar size={12} className={styles.calendarIcon} />
                {formatDate(card.createdAt)}
              </span>
            </li>
            <li className={styles.referenceItem}>
              <span className={styles.referenceKey}>Mise à jour</span>
              <span className={styles.referenceValue}>
                <Calendar size={12} className={styles.calendarIcon} />
                {formatDate(card.updatedAt)}
              </span>
            </li>
          </ul>

          {card.openFoodFactsId && (
            <a
              href={`https://fr.openfoodfacts.org/produit/${card.openFoodFactsId}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.offLink}
            >
              Voir sur OpenFoodFacts
              <ExternalLink size={14} />
            </a>
          )}
        </section>
      </main>
    </div>
  );
}
