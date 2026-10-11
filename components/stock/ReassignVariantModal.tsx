"use client";

// ============================================
// LA MODALE « RÉAFFILIER » (bloc 4, round 3 — Q3a)
// Modèle générique/poids — spec §2.2 : une variante
// peut être déplacée vers un autre générique. C'est
// le geste de la FUSION MANUELLE des doublons
// (décision Alexis 03/10 : pas de fusion automatique
// par nom — lui seul réunit ce qui va ensemble).
//
// RÉUTILISATION (règle 1 de tour-de-main) :
// - la recherche de génériques = l'action existante
//   searchProductsByName (annuaire local d'abord — la
//   cible doit EXISTER en base, un résultat OpenFoodFacts
//   non résolu ne peut pas recevoir une variante) ;
// - la modale et les briques Input/Button = le shared
//   du repo, pas une modale refaite.
//
// Le filtre des résultats : une fiche locale porte
// barcode === "" (marqueur posé par searchByNameLocal —
// « la fiche locale est identifiée par son id ») ;
// on retire le générique courant (réaffilier vers
// lui-même n'a pas de sens — et le service est idempotent
// de toute façon, ceinture et bretelles).
// ============================================

import { useState } from "react";
import { Search, ArrowLeftRight, Check } from "lucide-react";

import { Modal, Input, Button } from "@/components/shared";
import { searchProductsByName } from "@/lib/actions/DirectoryActions";
import { reassignVariantToGeneric } from "@/lib/actions/VariantActions";
import type { VariantLine } from "@/lib/services/VariantViewService";
import type { SimplifiedDirectoryItem } from "@/lib/types/scanTypes";
import styles from "./ReassignVariantModal.module.css";

interface ReassignVariantModalProps {
  isOpen: boolean;
  onClose: () => void;
  // La variante à déplacer (une ligne de la section repliable).
  variant: VariantLine | null;
  // Le générique actuel : retiré des résultats (destination ≠ origine).
  currentDirectoryId: string;
  // Appelé après un déplacement réussi (la section recharge).
  // Le NOM de la cible voyage avec l'id (hotfix R4 : le bandeau de
  // succès nomme la destination — « déplacé vers un autre générique »
  // muette a coûté une fausse piste « ça n'a pas marché » le 04/10).
  onReassigned: (newGenericDirectoryId: string, newGenericName?: string) => void;
}

export default function ReassignVariantModal({
  isOpen,
  onClose,
  variant,
  currentDirectoryId,
  onReassigned,
}: ReassignVariantModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SimplifiedDirectoryItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Réinitialiser au moindre déplacement réussi — la modale
  // se ferme, le prochain ouverture repart propre.
  const handleClose = () => {
    setQuery("");
    setResults([]);
    setSelectedId(null);
    setError(null);
    onClose();
  };

  // La recherche part dès 2 caractères, comme AddObjectClient
  // (« Par nom ») — même porte, même règle.
  const handleSearch = async (value: string) => {
    setQuery(value);
    setSelectedId(null);
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
        // Seules les fiches LOCALES peuvent recevoir une variante :
        // barcode === "" est le marqueur de la fiche d'annuaire ;
        // on retire le générique courant (destination ≠ origine).
        const localTargets = result.data.filter(
          (item) =>
            item.barcode === "" &&
            item.id &&
            item.id !== currentDirectoryId
        );
        setResults(localTargets);
        console.log(
          "[ReassignVariantModal] cibles locales trouvées:",
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
      console.error("[ReassignVariantModal] Erreur de recherche:", e);
      setError("Une erreur est survenue lors de la recherche");
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleReassign = async () => {
    if (!variant || !selectedId) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const result = await reassignVariantToGeneric(variant.id, selectedId);
      if (result.success && result.data) {
        console.log(
          "[ReassignVariantModal] variante réaffiliée:",
          variant.brandLabel,
          "→",
          result.data.genericDirectoryId
        );
        const newDirectoryId = result.data.genericDirectoryId;
        // Le nom de la cible est capturé AVANT handleClose (qui reset
        // results) — le bandeau du parent nomme la destination exacte.
        const selectedName = results.find((item) => item.id === selectedId)?.name;
        // handleClose reset la modale ET appelle onClose (parent) ;
        // onReassigned ensuite — le parent lit encore le label dans
        // la closure de son rendu courant (reassignTarget non-null
        // au moment de l'appel), le message de succès reste exact.
        handleClose();
        onReassigned(newDirectoryId, selectedName);
      } else {
        setError(result.error || "Échec de la réaffiliation");
      }
    } catch (e) {
      console.error("[ReassignVariantModal] Erreur de réaffiliation:", e);
      setError("Une erreur est survenue lors de la réaffiliation");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!variant) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Réaffilier « ${variant.brandLabel} »`}
      size="md"
    >
      <div className={styles.body}>
        <p className={styles.help}>
          Rechercher le générique qui doit accueillir cette marque. Le
          déplacement sert aussi à fusionner des doublons — le générique
          actuel est exclu des résultats.
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
                  onClick={() => setSelectedId(item.id)}
                  className={
                    selectedId === item.id
                      ? `${styles.resultItem} ${styles.resultItemSelected}`
                      : styles.resultItem
                  }
                >
                  {/* Nom + marque + description (hotfix R4 : distinguer
                      les homonymes — deux « Infusion detox » ne doivent
                      plus se ressembler à l'écran) */}
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
                  {selectedId === item.id && (
                    <Check size={16} className={styles.resultCheck} />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className={styles.actions}>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button
            variant="primary"
            onClick={handleReassign}
            disabled={!selectedId || isSubmitting}
            isLoading={isSubmitting}
            leftIcon={<ArrowLeftRight size={16} />}
          >
            Réaffilier
          </Button>
        </div>
      </div>
    </Modal>
  );
}
