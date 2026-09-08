"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  X, 
  Package, 
  MapPin, 
  Calendar, 
  Euro, 
  Hash, 
  StickyNote,
  Clock,
  Check,
  Barcode,
  Trash2
} from "lucide-react";
import Image from "next/image";
import { StockItemWithExpiryStatus } from "@/lib/types/stockTypes";
import NutriscoreBadge from "@/components/objects/NutriscoreBadge";
import ExpiryBadge from "./ExpiryBadge";
import styles from "./StockDetailsModal.module.css";

interface StockDetailsModalProps {
  item: StockItemWithExpiryStatus;
  onClose: () => void;
  onSave?: (updatedItem: StockItemWithExpiryStatus) => void;
  onDelete?: (item: StockItemWithExpiryStatus) => void;
}

export default function StockDetailsModal({
  item,
  onClose,
  onSave,
  onDelete,
}: StockDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    location: item.location || "",
    expiryDate: item.expiryDate ? formatDateForInput(item.expiryDate) : "",
    purchaseDate: item.purchaseDate ? formatDateForInput(item.purchaseDate) : "",
    lotNumber: item.lotNumber || "",
    price: item.price !== null && item.price !== undefined ? (item.price / 100).toString() : "",
    notes: item.notes || "",
  });

  // Vérifier si on peut éditer
  const canEdit = item.hasEditPermission && !item.isReadOnly;

  // Formater la date pour l'input type="date"
  function formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  // Formater le prix pour l'affichage
  const formatPrice = (cents: number | null | undefined): string => {
    if (!cents) return "-";
    return (cents / 100).toLocaleString('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Formater la date pour l'affichage
  const formatDate = (date: Date | null | undefined): string => {
    if (!date) return "-";
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  };

  // Mettre à jour les données du formulaire
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  // Mettre à jour le prix (convertir en float)
  const handlePriceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Remplacer la virgule par un point pour la conversion
    const numericValue = value.replace(',', '.');
    setFormData(prev => ({ ...prev, [name]: numericValue }));
  }, []);

  // Basculer entre mode édition et affichage
  const toggleEditing = useCallback(() => {
    if (!canEdit) return;
    
    if (isEditing) {
      // Retour au mode affichage -> réinitialiser le formulaire
      setFormData({
        location: item.location || "",
        expiryDate: item.expiryDate ? formatDateForInput(item.expiryDate) : "",
        purchaseDate: item.purchaseDate ? formatDateForInput(item.purchaseDate) : "",
        lotNumber: item.lotNumber || "",
        price: item.price !== null && item.price !== undefined ? (item.price / 100).toString() : "",
        notes: item.notes || "",
      });
    }
    
    setIsEditing(!isEditing);
  }, [isEditing, canEdit, item]);

  // Sauvegarder les modifications
  const handleSave = useCallback(async () => {
    if (!canEdit || !onSave) return;
    
    setIsLoading(true);
    
    try {
      // Convertir les données du formulaire
      const updatedItem = {
        ...item,
        location: formData.location.trim() || null,
        expiryDate: formData.expiryDate ? new Date(formData.expiryDate) : null,
        purchaseDate: formData.purchaseDate ? new Date(formData.purchaseDate) : null,
        lotNumber: formData.lotNumber.trim() || null,
        price: formData.price ? Math.round(parseFloat(formData.price) * 100) : null,
        notes: formData.notes.trim() || null,
      };
      
      await onSave(updatedItem);
      setIsEditing(false);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
    } finally {
      setIsLoading(false);
    }
  }, [canEdit, onSave, item, formData]);

  // Handler pour la suppression
  const handleDelete = useCallback(() => {
    if (!canEdit || !onDelete) return;
    
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer "${item.name}" ? Cette action est irréversible.`)) {
      onDelete(item);
    }
  }, [canEdit, onDelete, item]);

  // Fusionner la classe CSS en fonction de l'état
  const getExpiryStatusClass = useCallback(() => {
    switch (item.expiryStatus) {
      case 'expired':
        return styles.expired;
      case 'urgent':
        return styles.urgent;
      case 'warning':
        return styles.warning;
      case 'no_date':
        return styles.noDate;
      default:
        return '';
    }
  }, [item.expiryStatus]);

  return (
    <div 
      className={styles.modalOverlay}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="stock-details-title"
    >
      <div className={`${styles.modalContent} ${getExpiryStatusClass()}`}>
        <div className={styles.modalHeader}>
          <div className={styles.headerContent}>
            <h2 id="stock-details-title" className={styles.title}>
              {isEditing ? "Modifier l'objet" : item.name || "Objet inconnu"}
            </h2>
            
            {/* Badges */}
            <div className={styles.badges}>
              {item.nutriscore && (
                <NutriscoreBadge score={item.nutriscore} size="small" />
              )}
              {item.expiryDate && (
                <ExpiryBadge 
                  expiryStatus={item.expiryStatus} 
                  daysUntilExpiry={item.daysUntilExpiry}
                />
              )}
            </div>
          </div>
          
          <button onClick={onClose} className={styles.closeButton}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.modalBody}>
          {/* Section Image + Infos principales */}
          <div className={styles.mainSection}>
            {/* Image */}
            <div className={styles.imageSection}>
              {item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt={item.name || 'Objet'}
                  width={120}
                  height={120}
                  className={styles.image}
                  unoptimized
                />
              ) : (
                <div className={styles.imagePlaceholder}>
                  <Package size={48} />
                </div>
              )}
            </div>

            {/* Infos principales */}
            <div className={styles.infoSection}>
              <table className={styles.infoTable}>
                <tbody>
                  <tr>
                    <td className={styles.infoLabel}><Barcode size={16} /> Code-barres</td>
                    <td className={styles.infoValue}>{item.barcode || '-'}</td>
                  </tr>
                  <tr>
                    <td className={styles.infoLabel}><Package size={16} /> Quantité</td>
                    <td className={styles.infoValue}>
                      {item.quantity} {item.unit && `x ${item.unit}`}
                    </td>
                  </tr>
                  <tr>
                    <td className={styles.infoLabel}><strong>Marque</strong></td>
                    <td className={styles.infoValue}>{item.brand || '-'}</td>
                  </tr>
                  <tr>
                    <td className={styles.infoLabel}><strong>Catégorie</strong></td>
                    <td className={styles.infoValue}>{item.category || '-'}</td>
                  </tr>
                  <tr>
                    <td className={styles.infoLabel}><strong>Installation</strong></td>
                    <td className={styles.infoValue}>{item.installationName || '-'}</td>
                  </tr>
                  <tr>
                    <td className={styles.infoLabel}><strong>Prix</strong></td>
                    <td className={styles.infoValue}>
                      {item.price ? formatPrice(item.price) : '-'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section champs modifiables */}
          {canEdit && (
            <div className={styles.editableSection}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>
                  {isEditing ? "Modifier les informations" : "Informations supplémentaires"}
                </h3>
                
                {isEditing ? (
                  <div className={styles.sectionActions}>
                    <button 
                      onClick={handleSave} 
                      disabled={isLoading}
                      className={styles.saveButton}
                    >
                      {isLoading ? <span className={styles.spinnerSmall} /> : <>
                        <Check size={14} /> Enregistrer
                      </>}
                    </button>
                    <button 
                      onClick={toggleEditing} 
                      disabled={isLoading}
                      className={styles.cancelButton}
                    >
                      Annuler
                    </button>
                  </div>
                ) : (
                  <button onClick={toggleEditing} className={styles.editButton}>
                    <Hash size={14} /> Modifier
                  </button>
                )}
              </div>

              <div className={styles.fieldsGrid}>
                {/* Emplacement */}
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>
                    <MapPin size={16} /> Emplacement
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      placeholder="Ex: Frigo, Étagère 1..."
                      className={styles.fieldInput}
                      list="commonLocations"
                    />
                  ) : (
                    <span className={styles.fieldValue}>{item.location || '-'}</span>
                  )}
                  {isEditing && (
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
                  )}
                </div>

                {/* Date d'achat */}
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>
                    <Clock size={16} /> Date d'achat
                  </label>
                  {isEditing ? (
                    <input
                      type="date"
                      name="purchaseDate"
                      value={formData.purchaseDate}
                      onChange={handleChange}
                      className={styles.fieldInput}
                    />
                  ) : (
                    <span className={styles.fieldValue}>{formatDate(item.purchaseDate)}</span>
                  )}
                </div>

                {/* Date de péremption */}
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>
                    <Calendar size={16} /> Date de péremption
                  </label>
                  {isEditing ? (
                    <input
                      type="date"
                      name="expiryDate"
                      value={formData.expiryDate}
                      onChange={handleChange}
                      className={styles.fieldInput}
                      min={formData.purchaseDate}
                    />
                  ) : (
                    <span className={styles.fieldValue}>{formatDate(item.expiryDate)}</span>
                  )}
                </div>

                {/* Numéro de lot */}
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>
                    <Hash size={16} /> N° de lot
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="lotNumber"
                      value={formData.lotNumber}
                      onChange={handleChange}
                      placeholder="Ex: LOT2024001"
                      className={styles.fieldInput}
                    />
                  ) : (
                    <span className={styles.fieldValue}>{item.lotNumber || '-'}</span>
                  )}
                </div>

                {/* Prix */}
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>
                    <Euro size={16} /> Prix (€)
                  </label>
                  {isEditing ? (
                    <div className={styles.priceInput}>
                      <input
                        type="text"
                        name="price"
                        value={formData.price}
                        onChange={handlePriceChange}
                        placeholder="Ex: 2.99"
                        inputMode="decimal"
                        className={styles.fieldInput}
                      />
                    </div>
                  ) : (
                    <span className={styles.fieldValue}>
                      {item.price ? formatPrice(item.price) : '-'}
                    </span>
                  )}
                </div>

                {/* Notes */}
                <div className={styles.fieldGroupFull}>
                  <label className={styles.fieldLabel}>
                    <StickyNote size={16} /> Notes
                  </label>
                  {isEditing ? (
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      placeholder="Ex: Acheté en promo, à consommer rapidement..."
                      className={styles.fieldTextarea}
                      rows={3}
                    />
                  ) : (
                    <span className={styles.fieldValue}>{item.notes || '-'}</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Section métadonnées uniquement en affichage */}
          <div className={styles.metaSection}>
            <h3 className={styles.sectionTitle}>Informations globales</h3>
            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>ID:</span>
                <span className={styles.metaValue}>{item.id}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Objet global ID:</span>
                <span className={styles.metaValue}>{item.objectDirectoryId}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Ajouté le:</span>
                <span className={styles.metaValue}>{formatDate(item.createdAt)}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Dernière MAJ:</span>
                <span className={styles.metaValue}>{formatDate(item.updatedAt)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bouton pour supprimer */}
        {canEdit && !isEditing && onDelete && (
          <div className={styles.modalFooter}>
            <button onClick={handleDelete} className={styles.deleteButton}>
              <Trash2 size={16} />
              Supprimer cet objet
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
