"use client";

// ============================================
// LE BOUTON « FUSIONNER » (bloc 4, round 4)
// Le point d'entrée de la fusion manuelle des doublons, monté sur
// la fiche générique niveau 2 (la page de la SOURCE qu'on vide).
//
// Outil pensé pour le dev d'abord (tech lead 05/10) : dédoublonner
// l'annuaire pendant la migration générique — son intérêt en prod
// se jugera sur pièce. Le masquer plus tard = une ligne de diff.
//
// Après une fusion réussie, la page de la source n'existe plus :
// on navigue vers la fiche de la cible (qui a TOUT reçu) — le
// déplacement EST le retour utilisateur.
// ============================================

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Combine } from "lucide-react";

import MergeGenericModal, {
  type MergeGenericsSummary,
} from "./MergeGenericModal";
import styles from "./MergeGenericButton.module.css";

interface MergeGenericButtonProps {
  // Le générique affiché par la page = la SOURCE de la fusion.
  directoryId: string;
  // Son nom, pour l'avertissement honnête de la modale.
  directoryName?: string | null;
}

export default function MergeGenericButton({
  directoryId,
  directoryName,
}: MergeGenericButtonProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleMerged = (summary: MergeGenericsSummary) => {
    console.log(
      "[MergeGenericButton] fusion achevée → navigation vers la cible:",
      summary.targetDirectoryId
    );
    // La page de la source est morte (404) : la cible montre le
    // résultat — stock et variantes regroupés.
    router.push(`/stock/${summary.targetDirectoryId}`);
  };

  return (
    <>
      <button
        type="button"
        className={styles.button}
        onClick={() => setIsModalOpen(true)}
      >
        <Combine size={16} />
        Fusionner
      </button>

      <MergeGenericModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        sourceDirectoryId={directoryId}
        sourceDirectoryName={directoryName || "ce générique"}
        onMerged={handleMerged}
      />
    </>
  );
}
