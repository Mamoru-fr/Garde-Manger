"use client";

import { useState, useCallback } from "react";
import { Check, Minus, Plus, X } from "lucide-react";
import { adjustObjectQuantity, addScannedObject } from "@/lib/actions/ObjectActions";
import { SimplifiedDirectoryItem } from "@/lib/types/scanTypes";
import styles from "./Scan.module.css";

interface ScanResultModalProps {
  item: SimplifiedDirectoryItem;
  barcode: string;
  installationId: string;
  currentQuantity: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ScanResultModal({
  item,
  barcode,
  installationId,
  currentQuantity,
  onClose,
  onSuccess,
}: ScanResultModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Gestion de la quantité
  const increment = useCallback(() => {
    setQuantity((q) => Math.min(q + 1, 100));
  }, []);

  const decrement = useCallback(() => {
    setQuantity((q) => Math.max(q - 1, 1));
  }, []);

  // Gérer l'ajout de quantité
  const handleAdd = useCallback(async () => {
    setIsProcessing(true);
    setError(null);

    try {
      // Si l'objet existe déjà dans l'installation
      if (currentQuantity > 0) {
        const result = await adjustObjectQuantity(
          installationId,
          barcode,
          quantity // Ajouter quantité
        );

        if (!result.success) {
          throw new Error(result.error || "Erreur lors de l'ajout");
        }
      } else {
        // Créer un nouvel objet dans l'installation
        const result = await addScannedObject(
          installationId,
          barcode,
          quantity,
          {
            name: item.name,
            category: item.category || undefined,
            description: item.description || undefined,
            brand: item.brand || undefined,
            // imageUrl sera gérée séparément
          }
        );

        if (!result.success) {
          throw new Error(result.error || "Erreur lors de l'ajout");
        }
      }

      onSuccess();
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [installationId, barcode, currentQuantity, quantity, item, onSuccess, onClose]);

  // Gérer le retrait de quantité
  const handleRemove = useCallback(async () => {
    if (currentQuantity <= 0) {
      setError("Cet objet n'est pas dans cette installation");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const result = await adjustObjectQuantity(
        installationId,
        barcode,
        -quantity // Soustraire quantité
      );

      if (!result.success) {
        throw new Error(result.error || "Erreur lors du retrait");
      }

      onSuccess();
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [installationId, barcode, currentQuantity, quantity, onSuccess, onClose]);

  // Déterminer le statut de l'objet
  const getStatusMessage = () => {
    if (currentQuantity > 0) {
      return (
        <div className={styles.foundStatusFound}>
          <Check size={16} />
          <span>
           Déjà {currentQuantity} unité{currentQuantity > 1 ? "s" : ""} dans cette installation
          </span>
        </div>
      );
    }
    return (
      <div className={styles.foundStatusFound}>
        <Check size={16} />
        <span>Objet trouvé dans l'annuaire</span>
      </div>
    );
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* En-tête */}
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            <Check size={20} />
            Objet trouvé
          </h2>
          <button onClick={onClose} className={styles.modalClose} aria-label="Fermer">
            <X size={20} />
          </button>
        </div>

        {/* Contenu */}
        <div className={styles.modalBody}>
          {/* Image du produit */}
          {item.imageUrl && (
            <div className={styles.productImageContainer}>
              <img
                src={item.imageUrl}
                alt={item.name}
                className={styles.productImage}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
          )}

          {/* Informations du produit */}
          <div className={styles.productInfo}>
            <h3 className={styles.productName}>{item.name}</h3>
            {item.brand && <p className={styles.productBrand}>Marque: {item.brand}</p>}
            {item.category && <p className={styles.productCategory}>Catégorie: {item.category}</p>}
            {item.description && (
              <p className={styles.productDescription}>{item.description}</p>
            )}
          </div>

          {/* Statut */}
          {getStatusMessage()}
          
          {/* Message pour les objets verrouillés */}
          {item.isReadOnly && (
            <div className={styles.readOnlyNotice}>
              <span>✅ Informations issues d.OpenFoodFacts (non modifiables)</span>
            </div>
          )}

          {/* Quantité actuelle */}
          {currentQuantity > 0 && (
            <div className={styles.quantityInfo}>
              <span>Quantité actuelle:</span>
              <span>{currentQuantity} unité{currentQuantity > 1 ? "s" : ""}</span>
            </div>
          )}

          {/* Sélecteur de quantité */}
          <div className={styles.quantitySelector}>
            <span className={styles.selectorLabel}>
              {currentQuantity > 0 ? "Quantité à ajouter/retirer" : "Quantité à ajouter"}
            </span>
            <div className={styles.quantityControls}>
              <button
                onClick={decrement}
                disabled={quantity <= 1}
                className={styles.quantityButton}
                aria-label="Diminuer"
              >
                <Minus size={16} />
              </button>
              <span className={styles.quantityDisplay}>{quantity}</span>
              <button
                onClick={increment}
                disabled={quantity >= 100}
                className={styles.quantityButton}
                aria-label="Augmenter"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Erreur */}
          {error && (
            <div className={styles.foundStatus} style={{ background: "rgba(220, 38, 38, 0.1)", color: "#dc2626", borderColor: "rgba(220, 38, 38, 0.3)" }}>
              <X size={16} />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Pied de modal */}
        <div className={styles.modalFooter}>
          {currentQuantity > 0 ? (
            <>
              {/* Bouton Retirer */}
              <button
                onClick={handleRemove}
                disabled={isProcessing}
                className={`${styles.actionButton} ${styles.dangerButton}`}
                aria-label={`Retirer ${quantity} unité${quantity > 1 ? "s" : ""}`}
              >
                <Minus size={16} />
                Retirer {quantity} unité{quantity > 1 ? "s" : ""}
              </button>

              {/* Bouton Ajouter */}
              <button
                onClick={handleAdd}
                disabled={isProcessing}
                className={`${styles.actionButton} ${styles.primaryButton}`}
                aria-label={`Ajouter ${quantity} unité${quantity > 1 ? "s" : ""}`}
              >
                <Plus size={16} />
                Ajouter {quantity} unité{quantity > 1 ? "s" : ""}
              </button>
            </>
          ) : (
            /* Bouton plein pour ajouter */
            <button
              onClick={handleAdd}
              disabled={isProcessing}
              className={`${styles.actionButton} ${styles.primaryButtonFull}`}
              aria-label={`Ajouter ${quantity} unité${quantity > 1 ? "s" : ""} à l'installation`}
            >
              <Plus size={16} />
              Ajouter {quantity} unité{quantity > 1 ? "s" : ""} à l'installation
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
