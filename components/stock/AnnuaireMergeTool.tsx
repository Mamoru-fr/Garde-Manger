"use client";

// ============================================
// L'OUTIL « FUSIONNER DEUX FICHES » (bloc 4, round 5)
// Le complément indispensable de la fusion R4 : la fiche
// niveau 2 est une FICHE DE STOCK (décision bloc 3) —
// un générique sans aucune ligne de stock est invisible
// au niveau 1 et 404 par GUID : le bouton « Fusionner »
// posé sur cette page (R4) ne pouvait donc jamais servir
// pour les doublons VIDES, précisément ceux qu'Alexis
// doit fusionner pendant la migration (leçon « Infusion
// detox » du 05/10).
//
// Cet outil vit sur la page /stock et couvre l'annuaire
// ENTIER, stock ou pas : modale en deux étapes —
//   étape 1 : rechercher la fiche à VIDER (la source) ;
//   étape 2 : la modale de fusion R4 (MergeGenericModal)
//             réutilisée telle quelle, la source posée.
// La doctrine fiche-de-stock reste intacte : aucune
// page d'annuaire n'est créée, on passe par la recherche.
//
// RÉUTILISATION (règle 1 de tour-de-main) :
// - la recherche = l'action existante searchProductsByName
//   (zéro nouvelle requête) ;
// - l'étape 2 = MergeGenericModal du R4, inchangé ;
// - les styles de la modale = ceux du ReassignVariantModal
//   (même geste de recherche, mêmes classes) ; seuls les
//   styles du bouton d'entrée sont neufs (il vit sur le
//   header brun, pas sur fond clair).
// ============================================

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Combine, Check } from "lucide-react";

import { Modal, Input, Button } from "@/components/shared";
import { searchProductsByName } from "@/lib/actions/DirectoryActions";
import type { SimplifiedDirectoryItem } from "@/lib/types/scanTypes";
import MergeGenericModal, {
  type MergeGenericsSummary,
} from "./MergeGenericModal";
import styles from "./AnnuaireMergeTool.module.css";
import modalStyles from "./ReassignVariantModal.module.css";

export default function AnnuaireMergeTool() {
  const router = useRouter();

  // Étape 1 : choisir la source (la fiche qu'on vide).
  const [isSourceOpen, setIsSourceOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SimplifiedDirectoryItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedSource, setSelectedSource] =
    useState<SimplifiedDirectoryItem | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Étape 2 : la modale de fusion R4, posée sur la source choisie.
  const [source, setSource] = useState<SimplifiedDirectoryItem | null>(null);
  const [isMergeOpen, setIsMergeOpen] = useState(false);

  // Réinitialiser l'étape 1 au moindre geste — la prochaine
  // ouverture repart propre.
  const handleCloseSource = () => {
    setQuery("");
    setResults([]);
    setSelectedSource(null);
    setSearchError(null);
    setIsSourceOpen(false);
  };

  // La recherche part dès 2 caractères, comme MergeGenericModal
  // et ReassignVariantModal — même porte, même règle.
  const handleSearch = async (value: string) => {
    setQuery(value);
    setSelectedSource(null);
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    try {
      const result = await searchProductsByName(trimmed, 10);
      if (result.success && result.data) {
        // Seules les fiches LOCALES peuvent être vidées (une fiche
        // OpenFoodFacts non résolue n'existe pas en base) ; ici on
        // cherche une SOURCE, donc rien à exclure — tout l'annuaire
        // est candidat, y compris les fiches sans aucune ligne de
        // stock (c'est tout l'intérêt de l'outil).
        const localItems = result.data.filter(
          (item) => item.barcode === "" && item.id
        );
        setResults(localItems);
        console.log(
          "[AnnuaireMergeTool] sources locales trouvées:",
          localItems.length,
          "pour «",
          trimmed,
          "»"
        );
      } else {
        setSearchError(result.error || "Erreur lors de la recherche");
        setResults([]);
      }
    } catch (e) {
      console.error("[AnnuaireMergeTool] Erreur de recherche:", e);
      setSearchError("Une erreur est survenue lors de la recherche");
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // La source est choisie : on bascule sur l'étape 2 (la modale
  // de fusion R4, qui cherchera la cible en excluant la source).
  const handleContinue = () => {
    if (!selectedSource) return;
    const chosen = selectedSource;
    handleCloseSource();
    setSource(chosen);
    setIsMergeOpen(true);
  };

  // Après la fusion : si des lignes de stock ont déménagé ou été
  // sommées, la cible en porte forcément → sa fiche niveau 2
  // existe, on y va. Sinon (source sans stock, cible peut-être
  // sans stock aussi) la fiche de la cible 404erait (doctrine
  // fiche-de-stock) → on reste sur /stock et on rafraîchit : la
  // carte de la cible y apparaît si elle a du stock, la source
  // en a disparu dans tous les cas.
  const handleMerged = (summary: MergeGenericsSummary) => {
    setIsMergeOpen(false);
    setSource(null);
    const stockLines = summary.movedStockLines + summary.summedStockLines;
    if (stockLines > 0) {
      console.log(
        "[AnnuaireMergeTool] fusion achevée → navigation vers la cible:",
        summary.targetDirectoryId
      );
      router.push(`/stock/${summary.targetDirectoryId}`);
    } else {
      console.log(
        "[AnnuaireMergeTool] fusion sans ligne de stock → on reste sur /stock"
      );
      router.refresh();
    }
  };

  return (
    <>
      <button
        type="button"
        className={styles.toolButton}
        onClick={() => setIsSourceOpen(true)}
      >
        <Combine size={16} />
        Fusionner deux fiches
      </button>

      {/* Étape 1 : choisir la fiche à vider (la source). */}
      <Modal
        isOpen={isSourceOpen}
        onClose={handleCloseSource}
        title="Fusionner deux fiches — 1/2 : la fiche à vider"
        size="md"
      >
        <div className={modalStyles.body}>
          <p className={modalStyles.help}>
            Recherchez la fiche à VIDER : tout ce qui vit dessous — lignes
            de stock, variantes, codes-barres — déménagera vers la fiche
            cible choisie à l'étape suivante, puis elle sera supprimée.
          </p>

          <Input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Ex. : Riz, Infusion detox…"
            leftIcon={<Search size={16} />}
            autoFocus
          />

          {isSearching && <p className={modalStyles.state}>Recherche…</p>}

          {searchError && <p className={modalStyles.error}>{searchError}</p>}

          {!isSearching &&
            !searchError &&
            query.trim().length >= 2 &&
            results.length === 0 && (
              <p className={modalStyles.state}>
                Aucune fiche locale trouvée pour cette recherche.
              </p>
            )}

          {results.length > 0 && (
            <ul className={modalStyles.resultList}>
              {results.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedSource(item)}
                    className={
                      selectedSource?.id === item.id
                        ? `${modalStyles.resultItem} ${modalStyles.resultItemSelected}`
                        : modalStyles.resultItem
                    }
                  >
                    {/* Nom + marque + description : distinguer les
                        homonymes (leçon « Infusion detox » du 04/10) */}
                    <span className={modalStyles.resultMain}>
                      <span className={modalStyles.resultName}>
                        {item.name}
                      </span>
                      {item.brand && (
                        <span className={modalStyles.resultBrand}>
                          {item.brand}
                        </span>
                      )}
                      {item.description && (
                        <span className={modalStyles.resultDescription}>
                          {item.description}
                        </span>
                      )}
                    </span>
                    {selectedSource?.id === item.id && (
                      <Check size={16} className={modalStyles.resultCheck} />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className={modalStyles.actions}>
            <Button
              variant="outline"
              onClick={handleCloseSource}
            >
              Annuler
            </Button>
            <Button
              variant="primary"
              onClick={handleContinue}
              disabled={!selectedSource}
              leftIcon={<Check size={16} />}
            >
              Continuer
            </Button>
          </div>
        </div>
      </Modal>

      {/* Étape 2 : la modale de fusion du R4, réutilisée telle
          quelle — la source posée, elle cherchera la cible. */}
      {source && (
        <MergeGenericModal
          isOpen={isMergeOpen}
          onClose={() => {
            setIsMergeOpen(false);
            setSource(null);
          }}
          sourceDirectoryId={source.id}
          sourceDirectoryName={source.name}
          onMerged={handleMerged}
        />
      )}
    </>
  );
}
