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
  Trash2,
  Plus,
  Minus,
  ArrowRightLeft
} from "lucide-react";
import Image from "next/image";
import { StockItemWithExpiryStatus } from "@/lib/types/stockTypes";
import { adjustObjectQuantityByInstallationId, addObjectToInstallation, removeObjectFromInstallation } from "@/lib/actions/ObjectActions";
import NutriscoreBadge from "@/components/objects/NutriscoreBadge";
import ExpiryBadge from "./ExpiryBadge";
import styles from "./StockDetailsModal.module.css";

interface InstallationInfo {
  id: string;
  name: string;
}

interface StockDetailsModalProps {
  item: StockItemWithExpiryStatus;
  onClose: () => void;
  onSave?: (updatedItem: StockItemWithExpiryStatus) => void;
  onDelete?: (item: StockItemWithExpiryStatus) => void;
  onMove?: (fromInstallationId: string, toInstallationId: string, quantity: number) => Promise<boolean>;
  onRefresh?: () => Promise<void> | void; // Fonction pour rafraîchir les données
  installations?: InstallationInfo[];
  currentInstallationId?: string;
}

export default function StockDetailsModal({
  item,
  onClose,
  onSave,
  onDelete,
  onMove,
  onRefresh,
  installations = [],
  currentInstallationId,
}: StockDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [isAdjustingQuantity, setIsAdjustingQuantity] = useState(false);
  const [localQuantity, setLocalQuantity] = useState(item.quantity);
  const [localItem, setLocalItem] = useState(item);
  const [formData, setFormData] = useState({
    location: item.location || "",
    expiryDate: item.expiryDate ? formatDateForInput(item.expiryDate) : "",
    purchaseDate: item.purchaseDate ? formatDateForInput(item.purchaseDate) : "",
    lotNumber: item.lotNumber || "",
    price: item.price !== null && item.price !== undefined ? (item.price / 100).toString() : "",
    notes: item.notes || "",
  });
  // Trouver la première installation différente de l'actuelle pour l'initialiser
  const firstOtherInstallation = installations.find(inst => inst.id !== item.installationId);
  
  const [moveData, setMoveData] = useState({
    selectedInstallationId: firstOtherInstallation?.id || "",
    quantityToMove: 1,
  });
  const [quantityAdjustment, setQuantityAdjustment] = useState(0);
  const [quantityInput, setQuantityInput] = useState(1);

  // Vérifier si on peut éditer
  const canEdit = item.hasEditPermission && !item.isReadOnly;
  
  // Vérifier si on peut gérer le stock (ajouter/retirer/déplacer)
  const canManageStock = item.hasEditPermission && !item.isReadOnly && item.installationId && item.id;
  
  // Logs de débogage
  useEffect(() => {
    console.log('[DEBUG StockDetailsModal] canManageStock:', Boolean(canManageStock), 'isEditing:', isEditing, 'onMove:', !!onMove, 'installations.length:', installations.length);
    console.log('[DEBUG StockDetailsModal] item.hasEditPermission:', item.hasEditPermission, 'item.isReadOnly:', item.isReadOnly, 'item.id:', item.id, 'item.installationId:', item.installationId, 'item.quantity:', item.quantity, 'localQuantity:', localQuantity);
    console.log('[DEBUG StockDetailsModal] moveData:', moveData);
    console.log('[DEBUG StockDetailsModal] Section sera affichée ?', canManageStock && !isEditing);
  }, [item, installations, onMove, canManageStock, isEditing, localQuantity, moveData]);

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
  }, [setFormData]);

  // Mettre à jour le prix (convertir en float)
  const handlePriceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Remplacer la virgule par un point pour la conversion
    const numericValue = value.replace(',', '.');
    setFormData(prev => ({ ...prev, [name]: numericValue }));
  }, [setFormData]);

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

  // Handler pour modifier la valeur de l'input de quantité
  const handleQuantityInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 1;
    setQuantityInput(Math.abs(value));
  }, [setQuantityInput]);

  // Handler pour modifier l'input avec les boutons +/- 
  const handleQuantityInputIncrement = useCallback(() => {
    setQuantityInput(prev => Math.max(1, prev + 1));
  }, [setQuantityInput]);

  const handleQuantityInputDecrement = useCallback(() => {
    setQuantityInput(prev => Math.max(1, prev - 1));
  }, [setQuantityInput]);

  // Handler pour appliquer l'ajustement de quantité
  const handleApplyQuantityAdjustment = useCallback(async (adjustment: number) => {
    if (!canManageStock || !item.id || Math.abs(adjustment) === 0) return;
    
    const oldQuantity = localQuantity;
    const newQuantity = oldQuantity + adjustment;
    
    // Optimiste : mettre à jour l'UI immédiatement
    setLocalQuantity(newQuantity);
    setLocalItem(prev => ({ ...prev, quantity: newQuantity }));
    
    setIsAdjustingQuantity(true);
    
    try {
      const result = await adjustObjectQuantityByInstallationId(item.id, adjustment);
      
      if (result.success) {
        // Mettre à jour avec la valeur réelle du serveur
        const serverQuantity = result.data?.newQuantity || newQuantity;
        setLocalQuantity(serverQuantity);
        setLocalItem(prev => ({ ...prev, quantity: serverQuantity }));
        
        // Réinitialiser l'input après succès
        setQuantityInput(1);
        
        // Notifier le parent si besoin
        if (onSave) {
          const updatedItem = {
            ...item,
            quantity: serverQuantity,
          };
          onSave(updatedItem);
        }
        
        // Rafraîchir la liste des objets du parent
        if (onRefresh) {
          await onRefresh();
        }
      } else {
        // Revertir les changements en cas d'erreur
        setLocalQuantity(oldQuantity);
        setLocalItem(prev => ({ ...prev, quantity: oldQuantity }));
        alert(result.error || "Erreur lors de l'ajustement de la quantité");
      }
    } catch (error) {
      console.error("Erreur lors de l'ajustement de la quantité:", error);
      // Revertir les changements en cas d'erreur
      setLocalQuantity(oldQuantity);
      setLocalItem(prev => ({ ...prev, quantity: oldQuantity }));
      alert("Une erreur est survenue");
    } finally {
      setIsAdjustingQuantity(false);
    }
  }, [canManageStock, item, localQuantity, onSave]);

  // Handler pour déplacer un objet vers une autre installation
  const handleMoveToInstallation = useCallback(async () => {
    if (!canManageStock || !onMove || !moveData.selectedInstallationId || moveData.quantityToMove <= 0) return;
    
    if (!window.confirm(`Êtes-vous sûr de vouloir déplacer ${moveData.quantityToMove} unité(s) de "${item.name}" vers "${installations.find(i => i.id === moveData.selectedInstallationId)?.name || moveData.selectedInstallationId}" ?`)) {
      return;
    }
    
    setIsMoving(true);
    
    try {
      const success = await onMove(
        item.installationId || "",
        moveData.selectedInstallationId,
        moveData.quantityToMove
      );
      
      if (success) {
        // Mettre à jour la quantité locale : soustraire la quantité déplacée
        const newLocalQuantity = localQuantity - moveData.quantityToMove;
        setLocalQuantity(newLocalQuantity);
        setLocalItem(prev => ({ ...prev, quantity: newLocalQuantity }));
        
        // Notifier le parent
        if (onSave) {
          const updatedItem = {
            ...item,
            quantity: newLocalQuantity,
          };
          onSave(updatedItem);
        }
        
        // Rafraîchir la liste des objets du parent
        if (onRefresh) {
          await onRefresh();
        }
        
        // Si on a déplacé toute la quantité, fermer la modale
        if (newLocalQuantity <= 0) {
          onClose();
        }
      }
    } catch (error) {
      console.error("Erreur lors du déplacement:", error);
      alert("Une erreur est survenue lors du déplacement");
    } finally {
      setIsMoving(false);
    }
  }, [canManageStock, item, installations, moveData, localQuantity, onMove, onSave, onClose]);

  // Handler pour changer la quantité à déplacer
  const handleMoveQuantityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 1;
    setMoveData(prev => ({ ...prev, quantityToMove: Math.max(1, Math.min(value, localQuantity)) }));
  }, [localQuantity, setMoveData]);

  // Handler pour changer l'installation cible
  const handleInstallationChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setMoveData(prev => ({ ...prev, selectedInstallationId: e.target.value }));
  }, [setMoveData]);

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
                      {localQuantity} {item.unit && `x ${item.unit}`}
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

        {/* Section de gestion du stock */}
        {canManageStock && !isEditing && (
          <div className={styles.stockManagementSection}>
            <h3 className={styles.sectionTitle}>
              <Package size={16} /> Gestion du stock
            </h3>

            {/* Ajustement de quantité */}
            <div className={styles.quantityAdjustment}>
              <span className={styles.quantityLabel}>Quantité actuelle: {localQuantity}</span>
              <span className={styles.adjustTitle}>Ajuster la quantité</span>
              
              {/* Contrôles pour choisir la quantité à ajouter/retirer */}
              <div className={styles.quantityControls}>
                <button 
                  onClick={handleQuantityInputDecrement}
                  disabled={isAdjustingQuantity || quantityInput <= 1}
                  className={styles.quantityAdjustButton}
                  title="Diminuer la quantité"
                >
                  <Minus size={16} />
                </button>
                
                {/* Input pour quantité personnalisée */}
                <div className={styles.quantityInputGroup}>
                  <input
                    type="number"
                    value={quantityInput}
                    onChange={handleQuantityInputChange}
                    min="1"
                    className={styles.quantityInputField}
                    disabled={isAdjustingQuantity}
                    title="Quantité à ajouter ou retirer"
                  />
                </div>
                
                <button 
                  onClick={handleQuantityInputIncrement}
                  disabled={isAdjustingQuantity}
                  className={styles.quantityAdjustButton}
                  title="Augmenter la quantité"
                >
                  <Plus size={16} />
                </button>
              </div>
              
              {/* Boutons pour appliquer l'ajustement */}
              <div className={styles.quantityActionButtons}>
                <button
                  onClick={() => handleApplyQuantityAdjustment(-quantityInput)}
                  disabled={isAdjustingQuantity || localQuantity - quantityInput < 0}
                  className={styles.removeButton}
                >
                  <Minus size={14} /> Retirer {quantityInput}
                </button>
                <button
                  onClick={() => handleApplyQuantityAdjustment(quantityInput)}
                  disabled={isAdjustingQuantity}
                  className={styles.addButton}
                >
                  <Plus size={14} /> Ajouter {quantityInput}
                </button>
              </div>
            </div>

            {/* Déplacement vers une autre installation */}
            {onMove && (
              <div className={styles.moveSection}>
                <h4 className={styles.moveTitle}>
                  <ArrowRightLeft size={16} /> Déplacer vers une autre installation
                </h4>
                <div className={styles.moveControls}>
                  <select
                    value={moveData.selectedInstallationId}
                    onChange={handleInstallationChange}
                    className={styles.installationSelect}
                    disabled={isMoving || installations.length <= 1}
                  >
                    {installations
                      .filter(inst => inst.id !== item.installationId)
                      .map(inst => (
                        <option key={inst.id} value={inst.id}>
                          {inst.name}
                        </option>
                      ))}
                  </select>
                  <input
                    type="number"
                    value={moveData.quantityToMove}
                    onChange={handleMoveQuantityChange}
                    min="1"
                    max={localQuantity}
                    className={styles.moveQuantityInput}
                    disabled={isMoving}
                  />
                  <button
                    onClick={handleMoveToInstallation}
                    disabled={isMoving || !moveData.selectedInstallationId || moveData.selectedInstallationId === item.installationId}
                    className={styles.moveButton}
                  >
                    {isMoving ? (
                      <span className={styles.spinnerSmall} />
                    ) : (
                      <>
                        <ArrowRightLeft size={14} /> Déplacer
                      </>
                    )}
                  </button>
                </div>
                <p className={styles.moveHint}>
                  Déplacez {moveData.quantityToMove} unité(s) vers l'installation sélectionnée
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
