"use client";

import { useState } from "react";
import Image from "next/image";
import { Package, MapPin, Calendar, Euro, Edit, Trash2, Eye } from "lucide-react";
import { StockItemWithExpiryStatus } from "@/lib/types/stockTypes";
import ExpiryBadge from "./ExpiryBadge";
import NutriscoreBadge from "@/components/objects/NutriscoreBadge";
import styles from "./StockItemRow.module.css";

interface StockItemRowProps {
  item: StockItemWithExpiryStatus;
  onDetailsClick: (item: StockItemWithExpiryStatus) => void;
  onEdit?: (item: StockItemWithExpiryStatus) => void;
  onDelete?: (item: StockItemWithExpiryStatus) => void;
}

export default function StockItemRow({
  item,
  onDetailsClick,
  onEdit,
  onDelete,
}: StockItemRowProps) {
  const [imageError, setImageError] = useState(false);

  // Formater le prix en euros
  const formatPrice = (cents: number | null | undefined): string => {
    if (!cents) return "-";
    return (cents / 100).toLocaleString('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Formater la date
  const formatDate = (date: Date | null | undefined): string => {
    if (!date) return "-";
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: '2-digit',
    }).format(date);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <tr className={styles.row}>
      {/* Image + Nom + Marque */}
      <td className={styles.cell}>
        <div className={styles.itemInfo}>
          <div className={styles.imageContainer}>
            {!imageError && item.imageUrl ? (
              <Image
                src={item.imageUrl}
                alt={item.name || 'Objet'}
                width={40}
                height={40}
                className={styles.image}
                onError={handleImageError}
              />
            ) : (
              <div className={styles.imagePlaceholder}>
                <Package size={24} />
              </div>
            )}
          </div>
          <div className={styles.textInfo}>
            <div className={styles.nameRow}>
              <span className={styles.name}>{item.name || 'Objet inconnu'}</span>
              {item.nutriscore && (
                <span className={styles.nutriscore}>
                  <NutriscoreBadge score={item.nutriscore} size="small" />
                </span>
              )}
            </div>
            <div className={styles.details}>
              {item.brand && <span className={styles.brand}>{item.brand}</span>}
              {item.barcode && <span className={styles.barcode}>{item.barcode}</span>}
            </div>
          </div>
        </div>
      </td>

      {/* Catégorie */}
      <td className={styles.cell}>
        {item.category || '-'}
      </td>

      {/* Quantité */}
      <td className={styles.cell}>
        <span className={styles.quantity}>
          {item.quantity} {item.unit && `x ${item.unit}`}
        </span>
      </td>

      {/* Emplacement */}
      <td className={styles.cell}>
        <span className={styles.location}>
          <MapPin size={14} /> {item.location || '-'}
        </span>
      </td>

      {/* Date de péremption */}
      <td className={styles.cell}>
        <div className={styles.expiryCell}>
          {item.expiryDate && formatDate(item.expiryDate)}
          <ExpiryBadge 
            expiryStatus={item.expiryStatus} 
            daysUntilExpiry={item.daysUntilExpiry}
          />
        </div>
      </td>

      {/* Prix */}
      <td className={styles.cell}>
        {item.price ? formatPrice(item.price) : '-'}
      </td>

      {/* Installation (uniquement dans la vue globale) */}
      {item.installationName && (
        <td className={styles.cell}>
          <span className={styles.installationLabel}>{item.installationName}</span>
        </td>
      )}

      {/* Actions */}
      <td className={styles.cell}>
        <div className={styles.actions}>
          <button 
            onClick={() => onDetailsClick(item)}
            className={styles.actionButton}
            title="Voir les détails"
          >
            <Eye size={16} />
          </button>
          
          {onEdit && item.hasEditPermission && !item.isReadOnly && (
            <button 
              onClick={() => onEdit && onEdit(item)}
              className={styles.actionButton}
              title="Modifier"
            >
              <Edit size={16} />
            </button>
          )}
          
          {onDelete && item.hasEditPermission && !item.isReadOnly && (
            <button 
              onClick={() => onDelete && onDelete(item)}
              className={styles.actionButton}
              title="Supprimer"
              style={{ color: 'var(--color-danger, #ef4444)' }}
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
