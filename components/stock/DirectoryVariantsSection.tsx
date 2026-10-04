"use client";

// ============================================
// LA SECTION « VOIR LES DIFFÉRENTS X » (bloc 4, rounds 2-3)
// Modèle générique/poids — spec §2.2 (Q1a : section repliable
// sur la page niveau 2, décision Alexis 04/10)
//
// Composant client car le repliement est une interaction. Le
// chargement est FAINÉANT : rien ne part en base tant que la
// section n'est pas ouverte une première fois — la fiche de
// stock reste le repas principal, les marques sont le dessert.
// Après le premier dépliage, le résultat est gardé en état :
// replier/re déplier ne re-charge rien.
//
// Ce composant affiche, il ne calcule pas : le tri (marques
// alphabétiques, vrac en fin) et les étiquettes viennent du
// VariantViewService (pur, testé — règle 5 de tour-de-main).
//
// Décisions gravées :
// - Q2b : chaque ligne est un LIEN vers la page fiche détail
//   dédiée (fondation posée au round 2) ;
// - Q3a (round 3) : le bouton « réaffilier » sur chaque ligne
//   ouvre la modale de choix de générique (ReassignVariantModal)
//   — le geste de la fusion manuelle des doublons d'Alexis ;
//   un déplacement réussi RECHARGE la liste : la variante
//   déménagée quitte ce générique, sa disparition EST le
//   feedback (plus un bandeau de succès discret).
// ============================================

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, Tags, Loader2, ArrowLeftRight } from "lucide-react";

import { getDirectoryVariants } from "@/lib/actions/VariantActions";
import type { VariantLine } from "@/lib/services/VariantViewService";
import ReassignVariantModal from "./ReassignVariantModal";
import styles from "./DirectoryVariantsSection.module.css";

interface DirectoryVariantsSectionProps {
  directoryId: string;
  directoryName: string;
}

// Pastille Nutri-Score aux couleurs officielles (A→E).
// Le service a déjà normalisé la lettre en majuscule.
const NUTRISCORE_COLORS: Record<string, string> = {
  A: "#038141",
  B: "#85bb2f",
  C: "#fecb02",
  D: "#ee8100",
  E: "#e63e08",
};

export default function DirectoryVariantsSection({
  directoryId,
  directoryName,
}: DirectoryVariantsSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [variants, setVariants] = useState<VariantLine[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Q3a : la variante dont on demande la réaffiliation + le
  // bandeau de succès après un déménagement.
  const [reassignTarget, setReassignTarget] = useState<VariantLine | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Le chargement de la liste — partagé par le premier dépliage
  // et le rechargement après réaffiliation (une vérité, deux portes).
  const loadVariants = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getDirectoryVariants(directoryId);
      if (result.success && result.data) {
        setVariants(result.data.variants);
        console.log(
          "[DirectoryVariantsSection] variantes chargées:",
          result.data.variants.length,
          "-",
          directoryName
        );
      } else {
        setError(result.error || "Impossible de charger les marques");
      }
    } catch (e) {
      console.error(
        "[DirectoryVariantsSection] Erreur lors du chargement:",
        e
      );
      setError("Une erreur est survenue lors du chargement");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async () => {
    // Replier : simple, sans rechargement au retour.
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    setIsOpen(true);

    // Fainéant : ne charge qu'au PREMIER dépliage (et garde le
    // résultat — les repliages suivants sont gratuits).
    if (variants !== null || isLoading) {
      return;
    }

    await loadVariants();
  };

  // Q3a : ouvrir la modale pour cette ligne.
  const handleOpenReassign = (variant: VariantLine) => {
    setReassignTarget(variant);
    setSuccessMessage(null);
    setIsModalOpen(true);
  };

  // Le déménagement a réussi : la modale s'est refermée, on
  // recharge la liste (la variante a quitté ce générique) et
  // on le dit — la disparition seule serait muette. Le bandeau
  // NOMME la destination (hotfix R4) : « un autre générique » muet
  // a coûté une fausse piste le 04/10.
  const handleReassigned = async (
    _newDirectoryId: string,
    newGenericName?: string
  ) => {
    const movedLabel = reassignTarget ? reassignTarget.brandLabel : null;
    setIsModalOpen(false);
    setReassignTarget(null);
    setSuccessMessage(
      movedLabel
        ? newGenericName
          ? `« ${movedLabel} » a été déplacé vers « ${newGenericName} ».`
          : `« ${movedLabel} » a été déplacé vers un autre générique.`
        : "Variante déplacée vers un autre générique."
    );
    await loadVariants();
  };

  return (
    <section className={styles.variantsCard}>
      {/* Le bouton repliable — le libellé de la spec (Q1a) */}
      <button
        type="button"
        onClick={handleToggle}
        className={styles.toggle}
        aria-expanded={isOpen}
      >
        <Tags size={16} className={styles.toggleIcon} />
        <span>
          Voir les différents {directoryName || "produits"}
        </span>
        {isOpen ? (
          <ChevronDown size={18} className={styles.chevron} />
        ) : (
          <ChevronRight size={18} className={styles.chevron} />
        )}
      </button>

      {isOpen && (
        <div className={styles.content}>
          {successMessage && (
            <p className={styles.success}>{successMessage}</p>
          )}

          {isLoading && (
            <p className={styles.state}>
              <Loader2 size={16} className={styles.spinner} />
              Chargement des marques…
            </p>
          )}

          {error && <p className={styles.error}>{error}</p>}

          {!isLoading && !error && variants !== null && variants.length === 0 && (
            <p className={styles.state}>
              Aucune marque enregistrée pour ce générique.
            </p>
          )}

          {!isLoading && !error && variants !== null && variants.length > 0 && (
            <ul className={styles.variantList}>
              {variants.map((variant) => (
                <li key={variant.id} className={styles.variantItem}>
                  {/* Q2b : la marque EST le lien vers la fiche détail. */}
                  <Link
                    href={`/stock/${directoryId}/variantes/${variant.id}`}
                    className={styles.variantLink}
                  >
                    <span className={styles.variantBrand}>
                      {variant.brandLabel}
                    </span>
                    <span className={styles.variantMeta}>
                      {variant.nutriscore ? (
                        <span
                          className={styles.nutriscoreBadge}
                          style={{
                            background:
                              NUTRISCORE_COLORS[variant.nutriscore] ??
                              "#7a6a58",
                          }}
                        >
                          {variant.nutriscore}
                        </span>
                      ) : (
                        <span className={styles.noNutriscore}>
                          Pas de Nutri-Score
                        </span>
                      )}
                    </span>
                  </Link>
                  {/* Q3a : le bouton « réaffilier » — la fusion
                      manuelle des doublons d'Alexis. */}
                  <button
                    type="button"
                    onClick={() => handleOpenReassign(variant)}
                    className={styles.reassignButton}
                    title={`Réaffilier « ${variant.brandLabel} » vers un autre générique`}
                  >
                    <ArrowLeftRight size={14} />
                    <span>Réaffilier</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* La modale de choix de générique (Q3a) — rendue à la
          demande, fermée par défaut. */}
      <ReassignVariantModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setReassignTarget(null);
        }}
        variant={reassignTarget}
        currentDirectoryId={directoryId}
        onReassigned={handleReassigned}
      />
    </section>
  );
}
