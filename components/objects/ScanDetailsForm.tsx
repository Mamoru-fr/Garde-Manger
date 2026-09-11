"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Package,
  Calendar,
  MapPin,
  Hash,
  Euro,
  StickyNote,
  Plus,
  X,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { addScannedObject, adjustObjectQuantity } from "@/lib/actions/ObjectActions";
import { SimplifiedDirectoryItem } from "@/lib/types/scanTypes";
import NutriscoreBadge from "@/components/objects/NutriscoreBadge";
import styles from "./ScanDetailsForm.module.css";

interface ScanDetailsFormProps {
  installationId: string;
  directoryItem: SimplifiedDirectoryItem | null;
  barcode: string;
  currentQuantity?: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ScanDetailsForm({
  installationId,
  directoryItem,
  barcode,
  currentQuantity = 0,
  onClose,
  onSuccess,
}: ScanDetailsFormProps) {
  const router = useRouter();

  // Valeurs par défaut intelligentes
  const today = new Date().toISOString().split("T")[0];

  // État du formulaire
  const [formData, setFormData] = useState({
    quantity: currentQuantity > 0 ? currentQuantity + 1 : 1,
    location: localStorage.getItem("lastLocation") || "",
    purchaseDate: today,
    expiryDate: "",
    lotNumber: "",
    price: "",
    notes: "",
    // Champs pour l'objet
    name: directoryItem?.name || "",
    brand: directoryItem?.brand || "",
    category: directoryItem?.category || "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sauvegarder le dernier emplacement utilisé
  useEffect(() => {
    if (formData.location) {
      localStorage.setItem("lastLocation", formData.location);
    }
  }, [formData.location]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === "number" ? (value === "" ? "" : parseInt(value)) : value,
    }));
  }, []);

  const handleDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const submitData = new FormData();
      
      // Champs obligatoires
      submitData.append("installationId", installationId);
      submitData.append("barcode", barcode);
      submitData.append("quantity", formData.quantity.toString());

      // Champs optionnels
      if (formData.location?.trim()) {
        submitData.append("location", formData.location.trim());
      }
      if (formData.purchaseDate) {
        submitData.append("purchaseDate", formData.purchaseDate);
      }
      if (formData.expiryDate) {
        submitData.append("expiryDate", formData.expiryDate);
      }
      if (formData.lotNumber?.trim()) {
        submitData.append("lotNumber", formData.lotNumber.trim());
      }
      if (formData.price?.toString()) {
        submitData.append("price", formData.price.toString());
      }
      if (formData.notes?.trim()) {
        submitData.append("notes", formData.notes.trim());
      }

      // Appeler l'action appropriée
      const isUpdate = currentQuantity > 0;
      const result = isUpdate
        ? await adjustObjectQuantity(installationId, barcode, formData.quantity)
        : await addScannedObject(
            installationId,
            barcode,
            formData.quantity,
            {
              name: formData.name || undefined,
              category: formData.category || undefined,
              description: directoryItem?.description || undefined,
              brand: formData.brand || undefined,
              expiryDate: formData.expiryDate ? new Date(formData.expiryDate) : undefined,
              location: formData.location?.trim() || undefined,
            }
          );

      if (!result.success) {
        setError(result.error || "Erreur lors de l'ajout de l'objet");
        setIsSubmitting(false);
        return;
      }

      // Succès
      onSuccess();
    } catch (err) {
      setError("Une erreur inattendue est survenue. Veuillez réessayer.");
      setIsSubmitting(false);
    }
  };

  // Calculer les jours jusqu'à péremption
  const getDaysUntilExpiry = useCallback(() => {
    if (!formData.expiryDate) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normaliser à minuit
    
    const expiry = new Date(formData.expiryDate + "T00:00:00");
    const diff = expiry.getTime() - today.getTime();
    
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }, [formData.expiryDate]);

  const daysUntilExpiry = getDaysUntilExpiry();

  // Est-ce que la date de péremption est dans le passé ?
  const isExpiryInPast = daysUntilExpiry !== null && daysUntilExpiry < 0;

  // Vérifier si l'objet existe déjà dans l'installation
  const alreadyExists = currentQuantity > 0;

  // Prix formaté pour l'affichage
  const displayPrice = formData.price 
    ? new Intl.NumberFormat("fr-FR", { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      }).format(Number(formData.price))
    : "";

  return (
    <div 
      className={styles.modalOverlay} 
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="scan-details-title"
    >
      <div className={styles.modalContent}>
        {/* En-tête avec infos produit */}
        <div className={styles.productHeader}>
          <div className={styles.productImageContainer}>
            {directoryItem?.imageUrl ? (
              <img
                src={directoryItem.imageUrl}
                alt={directoryItem.name || "Produit"}
                className={styles.productImage}
              />
            ) : (
              <div className={styles.productPlaceholder}>
                <Package size={48} />
              </div>
            )}
          </div>
          
          <div className={styles.productInfo}>
            {directoryItem?.isReadOnly ? (
              // Affichage en lecture seule pour les objets OpenFoodFacts
              <>
                <div className={styles.productNameRow}>
                  <h2 id="scan-details-title" className={styles.productName}>
                    {directoryItem?.name || "Objet inconnu"}
                  </h2>
                  {directoryItem?.nutriscore && (
                    <NutriscoreBadge score={directoryItem.nutriscore} size="small" />
                  )}
                </div>
                
                {directoryItem?.brand && (
                  <p className={styles.productBrand}>
                    <strong>Marque:</strong> {directoryItem.brand}
                  </p>
                )}
                {directoryItem?.category && (
                  <p className={styles.productCategory}>
                    <strong>Catégorie:</strong> {directoryItem.category}
                  </p>
                )}
                {directoryItem?.openFoodFactsId && (
                  <p className={styles.productOFF}>
                    <a 
                      href={`https://world.openfoodfacts.org/product/${directoryItem.openFoodFactsId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.offLink}
                    >
                      Voir sur OpenFoodFacts
                    </a>
                  </p>
                )}
              </>
            ) : (
              // Champs éditables pour les objets modifiables
              <div style={{ width: '100%' }}>
                <div className={styles.productNameRow}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <label htmlFor="name" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted, #94a3b8)', marginBottom: '0.25rem' }}>
                      Nom *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className={styles.formInput}
                      placeholder="Nom du produit"
                      required
                      style={{ width: '100%', marginBottom: '0.5rem' }}
                    />
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <div>
                    <label htmlFor="brand" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted, #94a3b8)', marginBottom: '0.25rem' }}>
                      Marque
                    </label>
                    <input
                      type="text"
                      id="brand"
                      name="brand"
                      value={formData.brand}
                      onChange={handleChange}
                      className={styles.formInput}
                      placeholder="Marque"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="category" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted, #94a3b8)', marginBottom: '0.25rem' }}>
                      Catégorie
                    </label>
                    <select
                      id="category"
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      className={styles.formInput}
                      style={{ appearance: 'none', WebkitAppearance: 'none' }}
                    >
                      <option value="">Sélectionnez une catégorie</option>
                      <option value="Produits alimentaires">Produits alimentaires</option>
                      <option value="Boissons">Boissons</option>
                      <option value="Produits d'hygiène">Produits d'hygiène</option>
                      <option value="Produits ménagers">Produits ménagers</option>
                      <option value="Bricolage">Bricolage</option>
                      <option value="Autre">Autre</option>
                    </select>
                  </div>
                </div>
                
                {directoryItem?.openFoodFactsId && (
                  <p className={styles.productOFF}>
                    <a 
                      href={`https://world.openfoodfacts.org/product/${directoryItem.openFoodFactsId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.offLink}
                    >
                      Voir sur OpenFoodFacts
                    </a>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Message de statut */}
        <div className={styles.statusMessage}>
          {alreadyExists ? (
            <>
              <span className={styles.statusIcon}>📦</span>
              <span>Cet objet existe déjà dans votre installation (quantité actuelle: {currentQuantity})</span>
            </>
          ) : (
            <>
              <span className={styles.statusIcon}>✨</span>
              <span>Nouvel objet à ajouter</span>
            </>
          )}
          <span className={styles.barcodeInfo}>Code: <code>{barcode}</code></span>
        </div>
        
        {/* Message d'édition */}
        {!directoryItem?.isReadOnly && (
          <div style={{
            textAlign: 'center',
            padding: '0.75rem 1.5rem',
            background: 'var(--bg-secondary, #f8fafc)',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '8px',
            margin: '0 1.5rem 1rem',
            color: 'var(--text-secondary, #64748b)',
            fontSize: '0.875rem'
          }}>
            ✏️ Personnalisez le nom, la marque et la catégorie ci-dessus
          </div>
        )}

        {/* Erreur */}
        {error && (
          <div className={styles.errorMessage}>
            <AlertTriangle size={18} />
            {error}
          </div>
        )}

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className={styles.form}>
          <fieldset className={styles.formSection}>
            <legend className={styles.formSectionTitle}>Informations principales</legend>
            
            <div className={styles.formGrid}>
              {/* Quantité */}
              <div className={styles.formGroup}>
                <label htmlFor="quantity" className={styles.formLabel}>
                  <Package size={16} />
                  Quantité à ajouter
                </label>
                <input
                  type="number"
                  id="quantity"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  min="1"
                  className={styles.formInput}
                  required
                />
                {alreadyExists && (
                  <p className={styles.formHint}>
                    Total après ajout: {currentQuantity + formData.quantity}
                  </p>
                )}
              </div>

              {/* Emplacement */}
              <div className={styles.formGroup}>
                <label htmlFor="location" className={styles.formLabel}>
                  <MapPin size={16} />
                  Emplacement
                </label>
                <div className={styles.inputWithDatalist}>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className={styles.formInput}
                    placeholder="Ex: Frigo, Congélateur..."
                    list="commonLocations"
                  />
                  <datalist id="commonLocations">
                    <option value="Frigo" />
                    <option value="Congélateur" />
                    <option value="Placard cuisine" />
                    <option value="Garage" />
                    <option value="Cave" />
                    <option value="Armoire" />
                    <option value="Étagère" />
                    <option value="Comptoir" />
                  </datalist>
                </div>
              </div>
            </div>
          </fieldset>

          <fieldset className={styles.formSection}>
            <legend className={styles.formSectionTitle}>Dates</legend>
            
            <div className={styles.formGrid}>
              {/* Date d'achat */}
              <div className={styles.formGroup}>
                <label htmlFor="purchaseDate" className={styles.formLabel}>
                  <Calendar size={16} />
                  Date d'achat
                </label>
                <input
                  type="date"
                  id="purchaseDate"
                  name="purchaseDate"
                  value={formData.purchaseDate}
                  onChange={handleDateChange}
                  className={styles.formInput}
                  max={today}
                />
              </div>

              {/* Date de péremption */}
              <div className={styles.formGroup}>
                <label htmlFor="expiryDate" className={styles.formLabel}>
                  <Clock size={16} />
                  Date de péremption
                  {daysUntilExpiry !== null && (
                    <span 
                      className={`${styles.daysBadge} ${isExpiryInPast ? styles.daysExpiresSoon : ""}`}
                    >
                      {daysUntilExpiry > 0 
                        ? `${daysUntilExpiry} jour${daysUntilExpiry > 1 ? "s" : ""}`
                        : "Périmé"}
                    </span>
                  )}
                </label>
                <input
                  type="date"
                  id="expiryDate"
                  name="expiryDate"
                  value={formData.expiryDate}
                  onChange={handleDateChange}
                  className={styles.formInput}
                  min={formData.purchaseDate}
                />
              </div>
            </div>
          </fieldset>

          <fieldset className={styles.formSection}>
            <legend className={styles.formSectionTitle}>Informations supplémentaires</legend>
            
            <div className={styles.formGrid}>
              {/* Numéro de lot */}
              <div className={styles.formGroup}>
                <label htmlFor="lotNumber" className={styles.formLabel}>
                  <Hash size={16} />
                  Numéro de lot
                </label>
                <input
                  type="text"
                  id="lotNumber"
                  name="lotNumber"
                  value={formData.lotNumber}
                  onChange={handleChange}
                  className={styles.formInput}
                  placeholder="Ex: LOT2024001"
                />
              </div>

              {/* Prix */}
              <div className={styles.formGroup}>
                <label htmlFor="price" className={styles.formLabel}>
                  <Euro size={16} />
                  Prix d'achat (€)
                </label>
                <div className={styles.priceInputWrapper}>
                  <input
                    type="text"
                    id="price"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    inputMode="decimal"
                    className={styles.formInput}
                    placeholder="Ex: 2,99"
                  />
                  {displayPrice && (
                    <span className={styles.priceDisplay}>{displayPrice} €</span>
                  )}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className={styles.formGroupFull}>
              <label htmlFor="notes" className={styles.formLabel}>
                <StickyNote size={16} />
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                className={styles.formTextarea}
                rows={3}
                placeholder="Ex: Acheté en promo, ouvert déjà, à consommer rapidement..."
              />
            </div>
          </fieldset>

          {/* Boutons d'action */}
          <div className={styles.formActions}>
            <button 
              type="button" 
              onClick={onClose} 
              className={styles.cancelButton}
              disabled={isSubmitting}
            >
              <X size={16} />
              Annuler
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className={styles.spinner}></span>
                  {alreadyExists ? "Mise à jour..." : "Ajout..."}
                </>
              ) : (
                <>
                  <Plus size={16} />
                  {alreadyExists ? "Mettre à jour" : "Ajouter à l'installation"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
