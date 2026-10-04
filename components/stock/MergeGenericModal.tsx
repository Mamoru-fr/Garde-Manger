"use client";

// ============================================
// LA MODALE « FUSIONNER » (bloc 4, round 4)
// La fusion manuelle des doublons de génériques — spec 03/10 :
// Alexis seul réunit ce qui va ensemble, jamais de fusion
// automatique par nom.
//
// Le sens du geste (décision tech lead 05/10) : le bouton vit sur la
// page du générique qu'on VIDE (la source), cette modale choisit la
// CIBLE qui accueille tout. Tout ce qui vit sous la source — lignes
// de stock, variantes, codes-barres — déménage, puis la source est
// supprimée.
//
// RÉUTILISATION (règle 1 de tour-de-main) :
// - la recherche de génériques = l'action existante
//   searchProductsByName (annuaire local d'abord — la cible doit
//   EXISTER en base, un résultat OpenFoodFacts non résolu ne peut
//   rien accueillir) ;
// - la modale et les briques Input/Button = le shared du repo ;
// - les styles = ceux du ReassignVariantModal (même geste de
//   recherche, mêmes classes — le hotfix R4 y a ajouté la
//   description pour distinguer les homonymes).
//
// Le filtre des résultats : une fiche locale porte barcode === ""
// (marqueur posé par searchByNameLocal) ; on retire la source elle-
// même (se fusionner dans soi-même n'a pas de sens — le service le
// refuse de toute façon, ceinture et bretelles).
// ============================================

import { useState } from "react";
import { Search, Combine, Check } from "lucide-react";

import { Modal, Input, Button } from "@/components/shared";
import { searchProductsByName } from "@/lib/actions/DirectoryActions";
import { mergeGenerics } from "@/lib/actions/VariantActions";
import type { SimplifiedDirectoryItem } from "@/lib/types/scanTypes";
import styles from "./ReassignVariantModal.module.css";

// Le résumé de la fusion, remonté au parent pour naviguer vers la
// cible (la page de la source n'existe plus après le geste).
export interface MergeGenericsSummary {
  targetDirectoryId: string;
  targetName?: string;
  movedStockLines: number;
  summedStockLines: number;
  movedVariants: number;
  mergedVariants: number;
}

interface MergeGenericModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Le générique qu'on vide : retiré des résultats (cible ≠ source).
  sourceDirectoryId: string;
  // Son nom, pour le message d'avertissement honnête.
  sourceDirectoryName: string;
  // Appelé après une fusion réussie (le parent navigue vers la cible).
  onMerged: (summary: MergeGenericsSummary) => void;
}

export default function MergeGenericModal({
  isOpen,
  onClose,
  sourceDirectoryId,
  sourceDirectoryName,
  onMerged,
}: MergeGenericModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SimplifiedDirectoryItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selected, setSelected] = useState<SimplifiedDirectoryItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Réinitialiser au moindre geste — la modale se ferme, la
  // prochaine ouverture repart propre.
  const handleClose = () => {
    setQuery("");
    setResults([]);
    setSelected(null);
    setError(null);
    onClose();
  };

  // La recherche part dès 2 caractères, comme AddObjectClient et
  // ReassignVariantModal — même porte, même règle.
  const handleSearch = async (value: string) => {
    setQuery(value);
    setSelected(null);
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    setError(null);
    try {
      const result = await searchProductsByName(trimmed, 10);
      if (result.success && result.data) {
        // Seules les fiches LOCALES peuvent accueillir une fusion ;
        // la source elle-même est retirée (cible ≠ source).
        const localTargets = result.data.filter(
          (item) =>
            item.barcode === "" &&
            item.id &&
            item.id !== sourceDirectoryId
        );
        setResults(localTargets);
        console.log(
          "[MergeGenericModal] cibles locales trouvées:",
          localTargets.length,
          "pour «",
          trimmed,
          "»"
        );
      } else {
        setError(result.error || "Erreur lors de la recherche");
        setResults([]);
      }
    } catch (e) {
      console.error("[MergeGenericModal] Erreur de recherche:", e);
      setError("Une erreur est survenue lors de la recherche");
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleMerge = async () => {
    if (!selected) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const result = await mergeGenerics(sourceDirectoryId, selected.id);
      if (result.success && result.data) {
        console.log(
          "[MergeGenericModal] fusion réussie:",
          sourceDirectoryName,
          "→",
          selected.name,
          "(stock:",
          result.data.movedStockLines + result.data.summedStockLines,
          "lignes, variantes:",
          result.data.movedVariants + result.data.mergedVariants,
          ")"
        );
        const summary: MergeGenericsSummary = {
          targetDirectoryId: result.data.targetDirectoryId,
          movedStockLines: result.data.movedStockLines,
          summedStockLines: result.data.summedStockLines,
          movedVariants: result.data.movedVariants,
          mergedVariants: result.data.mergedVariants,
          targetName: selected.name,
        };
        // handleClose reset la modale ET appelle onClose (parent) ;
        // onMerged ensuite, avec le résumé capturé AVANT le reset.
        handleClose();
        onMerged(summary);
      } else {
        setError(result.error || "Échec de la fusion");
      }
    } catch (e) {
      console.error("[MergeGenericModal] Erreur de fusion:", e);
      setError("Une erreur est survenue lors de la fusion");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Fusionner ce générique"
      size="md"
    >
      <div className={styles.body}>
        <p className={styles.help}>
          Tout ce qui vit sous « {sourceDirectoryName} » — lignes de
          stock, variantes, codes-barres — déménagera vers le générique
          choisi, puis « {sourceDirectoryName} » sera supprimé.
        </p>

        <Input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Ex. : Riz, Huile d'olive…"
          leftIcon={<Search size={16} />}
          autoFocus
        />

        {isSearching && <p className={styles.state}>Recherche…</p>}

        {error && <p className={styles.error}>{error}</p>}

        {!isSearching && !error && query.trim().length >= 2 && results.length === 0 && (
          <p className={styles.state}>
            Aucun autre générique trouvé pour cette recherche.
          </p>
        )}

        {results.length > 0 && (
          <ul className={styles.resultList}>
            {results.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setSelected(item)}
                  className={
                    selected?.id === item.id
                      ? `${styles.resultItem} ${styles.resultItemSelected}`
                      : styles.resultItem
                  }
                >
                  {/* Nom + marque + description : distinguer les
                      homonymes (leçon « Infusion detox » du 04/10) */}
                  <span className={styles.resultMain}>
                    <span className={styles.resultName}>{item.name}</span>
                    {item.brand && (
                      <span className={styles.resultBrand}>{item.brand}</span>
                    )}
                    {item.description && (
                      <span className={styles.resultDescription}>
                        {item.description}
                      </span>
                    )}
                  </span>
                  {selected?.id === item.id && (
                    <Check size={16} className={styles.resultCheck} />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}

        {selected && (
          <p className={styles.help}>
            « {sourceDirectoryName} » sera vidé dans « {selected.name} » —
            les lignes nues seront sommées, les lignes informées (avec
            péremption, lot…) resteront distinctes.
          </p>
        )}

        <div className={styles.actions}>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button
            variant="primary"
            onClick={handleMerge}
            disabled={!selected || isSubmitting}
            isLoading={isSubmitting}
            leftIcon={<Combine size={16} />}
          >
            Fusionner
          </Button>
        </div>
      </div>
    </Modal>
  );
}
