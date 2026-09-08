"use client";

import { useState, useCallback } from "react";
import { Check, X, Barcode as BarcodeIcon, Plus, Minus, Package, Clock, Lock } from "lucide-react";
import { addScannedObject } from "@/lib/actions/ObjectActions";
import { SimplifiedDirectoryItem } from "@/lib/types/scanTypes";
import styles from "./Scan.module.css";

interface NewObjectModalProps {
  barcode: string;
  installationId: string;
  onClose: () => void;
  onSuccess: () => void;
  directoryItem?: SimplifiedDirectoryItem | null; // ✅ Objet existant à éditer (si présent)
}

// Catégories par défaut
const DEFAULT_CATEGORIES = [
  { value: "", label: "-- Sélectionner une catégorie --" },
  { value: "Alimentation", label: "Alimentation" },
  { value: "Boissons", label: "Boissons" },
  { value: "Fruits et légumes", label: "Fruits et légumes" },
  { value: "Viandes et poissons", label: "Viandes et poissons" },
  { value: "Produits laitiers", label: "Produits laitiers" },
  { value: "Épicerie sucrée", label: "Épicerie sucrée" },
  { value: "Épicerie salée", label: "Épicerie salée" },
  { value: "Conserves", label: "Conserves" },
  { value: "Surgelés", label: "Surgelés" },
  { value: "Produits ménagers", label: "Produits ménagers" },
  { value: "Hygiène", label: "Hygiène" },
  { value: "Autre", label: "Autre" },
];

// Unités par défaut
const DEFAULT_UNITS = [
  { value: "", label: "-- Sélectionner --" },
  { value: "unité", label: "Unité" },
  { value: "kg", label: "Kilogramme" },
  { value: "g", label: "Gramme" },
  { value: "L", label: "Litre" },
  { value: "mL", label: "Millilitre" },
  { value: "boîte", label: "Boîte" },
  { value: "sachet", label: "Sachet" },
  { value: "bouteille", label: "Bouteille" },
  { value: "pot", label: "Pot" },
];

// Formulaire par défaut
interface NewObjectForm {
  name: string;
  category: string;
  description: string;
  brand: string;
  quantity: number;
  unit: string;
  location: string;
  expiryDate: string;
  notes: string;
}

export default function NewObjectModal({
  barcode,
  installationId,
  onClose,
  onSuccess,
  directoryItem,
}: NewObjectModalProps) {
  const isReadOnly = directoryItem?.isReadOnly || false; // ✅ Vérifier si verrouillé
  
  // ✅ Pré-remplir le formulaire si directoryItem est présent
  const [formData, setFormData] = useState<NewObjectForm>({
    name: directoryItem?.name || "",
    category: directoryItem?.category || "",
    description: directoryItem?.description || "",
    brand: directoryItem?.brand || "",
    quantity: 1,
    unit: "unité",
    location: "",
    expiryDate: "",
    notes: "",
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Gestion des changements de formulaire
  const handleStringChange = useCallback((field: keyof NewObjectForm, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Réinitialiser l'erreur quand l'utilisateur corrige
    if (error && field === "name" && value.trim()) {
      setError(null);
    }
  }, [error]);

  const handleNumberChange = useCallback((field: 'quantity', value: number) => {
    if (value >= 1 && value <= 1000) {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  }, []);

  // Gestion de la quantité
  const handleQuantityChange = useCallback((delta: number) => {
    handleNumberChange('quantity', formData.quantity + delta);
  }, [formData.quantity, handleNumberChange]);

  // Soumission du formulaire
  const handleSubmit = useCallback(async () => {
    // Validation
    if (!formData.name.trim()) {
      setError("Le nom est obligatoire");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Convertir la date d'expiration si elle est fournie
      let expiryDate: Date | undefined;
      if (formData.expiryDate) {
        expiryDate = new Date(formData.expiryDate);
        // Vérifier que la date est valide
        if (isNaN(expiryDate.getTime())) {
          expiryDate = undefined;
        }
      }

      const result = await addScannedObject(
        installationId,
        barcode,
        formData.quantity,
        {
          name: formData.name,
          category: formData.category || undefined,
          description: formData.description || undefined,
          brand: formData.brand || undefined,
        }
      );

      if (!result.success) {
        throw new Error(result.error || "Erreur lors de l'ajout");
      }

      onSuccess();
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [barcode, installationId, formData, onSuccess, onClose]);

  // Validation du formulaire
  const isFormValid = formData.name.trim();

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* En-tête */}
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            <Package size={20} />
            {directoryItem ? "Modifier l'objet" : "Nouvel objet"}
          </h2>
          <button onClick={onClose} className={styles.modalClose} aria-label="Fermer">
            <X size={20} />
          </button>
        </div>

        {/* Message pour les objets verrouillés */}
        {isReadOnly && (
          <div className={styles.readOnlyHeader}>
            <Lock size={16} />
            <span>Les informations de cet objet proviennent d'OpenFoodFacts et ne peuvent pas être modifiées.</span>
          </div>
        )}

        {/* Contenu */}
        <div className={styles.modalBody}>
          {/* Code-barres scanné */}
          <div className={styles.scannedBarcode}>
            <BarcodeIcon size={16} />
            <span>
              Code-barres: <strong>{barcode}</strong>
            </span>
          </div>

          {/* Grille du formulaire */}
          <div className={styles.formGrid}>
            {/* Nom (requis) */}
            <div className={styles.formGroup}>
              <label htmlFor="name">
                Nom *
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => handleStringChange("name", e.target.value)}
                placeholder="Ex: Lait demi-écrémé"
                className={styles.formInput}
                autoFocus
                aria-required="true"
                disabled={isReadOnly} // ✅ Désactivé si verrouillé
              />
            </div>

            {/* Marque */}
            <div className={styles.formGroup}>
              <label htmlFor="brand">Marque</label>
              <input
                type="text"
                id="brand"
                value={formData.brand}
                onChange={(e) => handleStringChange("brand", e.target.value)}
                placeholder="Ex: Carrefour, Nestlé"
                className={styles.formInput}
                disabled={isReadOnly} // ✅ Désactivé si verrouillé
              />
            </div>

            {/* Catégorie */}
            <div className={styles.formGroup}>
              <label htmlFor="category">Catégorie</label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => handleStringChange("category", e.target.value)}
                className={styles.formSelect}
                disabled={isReadOnly} // ✅ Désactivé si verrouillé
              >
                {DEFAULT_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Unité */}
            <div className={styles.formGroup}>
              <label htmlFor="unit">Unité</label>
              <select
                id="unit"
                value={formData.unit}
                onChange={(e) => handleStringChange("unit", e.target.value)}
                className={styles.formSelect}
              >
                {DEFAULT_UNITS.map((unit) => (
                  <option key={unit.value} value={unit.value}>
                    {unit.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Quantité avec sélecteur inline */}
            <div className={styles.formGroup}>
              <label htmlFor="quantity">Quantité</label>
              <div className={styles.quantitySelectorInline}>
                <button
                  type="button"
                  onClick={() => handleQuantityChange(-1)}
                  disabled={formData.quantity <= 1}
                  className={styles.quantityButtonSmall}
                  aria-label="Diminuer"
                >
                  <Minus size={14} />
                </button>
                <input
                  type="number"
                  id="quantity"
                  value={formData.quantity}
                  onChange={(e) => handleNumberChange('quantity', parseInt(e.target.value) || 1)}
                  min="1"
                  max="1000"
                  className={styles.quantityInput}
                  aria-label="Quantité"
                />
                <button
                  type="button"
                  onClick={() => handleQuantityChange(1)}
                  disabled={formData.quantity >= 1000}
                  className={styles.quantityButtonSmall}
                  aria-label="Augmenter"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Emplacement */}
            <div className={styles.formGroup}>
              <label htmlFor="location">Emplacement</label>
              <input
                type="text"
                id="location"
                value={formData.location}
                onChange={(e) => handleStringChange("location", e.target.value)}
                placeholder="Ex: Frigo, Étagère A, Placard"
                className={styles.formInput}
              />
            </div>

            {/* Date de péremption */}
            <div className={styles.formGroup}>
              <label htmlFor="expiryDate">
                <Clock size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                Date de péremption
              </label>
              <input
                type="date"
                id="expiryDate"
                value={formData.expiryDate}
                onChange={(e) => handleStringChange("expiryDate", e.target.value)}
                className={styles.formInput}
              />
            </div>

            {/* Description (pleine largeur) */}
            <div className={styles.formGroupFull}>
              <label htmlFor="description">Description (optionnelle)</label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleStringChange("description", e.target.value)}
                placeholder="Ex: Lait UHT, 1L, demi-écrémé"
                className={styles.formTextarea}
                rows={2}
                disabled={isReadOnly} // ✅ Désactivé si verrouillé
              />
            </div>

            {/* Notes (pleine largeur) */}
            <div className={styles.formGroupFull}>
              <label htmlFor="notes">Notes (optionnelles)</label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleStringChange("notes", e.target.value)}
                placeholder="Ex: A consommer rapidement, Offert par Jean"
                className={styles.formTextarea}
                rows={2}
              />
            </div>
          </div>

          {/* Erreur */}
          {error && (
            <div className={styles.foundStatusNotFound}>
              <X size={16} />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Pied de modal */}
        <div className={styles.modalFooter}>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className={`${styles.actionButton} ${styles.secondaryButton}`}
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isProcessing || !isFormValid}
            className={`${styles.actionButton} ${styles.primaryButton}`}
          >
            <Check size={16} />
            {isProcessing ? "Ajout en cours..." : `Ajouter à l'installation`}
          </button>
        </div>
      </div>
    </div>
  );
}
