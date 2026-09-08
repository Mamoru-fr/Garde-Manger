"use client";

import { useState } from "react";
import Image from "next/image";
import { Package, MapPin, Calendar, Euro, Barcode, Edit, Trash2 } from "lucide-react";
import { StockItemWithExpiryStatus } from "@/lib/types/stockTypes";
import ExpiryBadge from "./ExpiryBadge";
import NutriscoreBadge from "@/components/objects/NutriscoreBadge";
import styles from "./StockItemCard.module.css";

interface StockItemCardProps {
  item: StockItemWithExpiryStatus;
  onDetailsClick: (item: StockItemWithExpiryStatus) => void;
  onEdit?: (item: StockItemWithExpiryStatus) => void;
  onDelete?: (item: StockItemWithExpiryStatus) => void;
}

export default function StockItemCard({
  item,
  onDetailsClick,
  onEdit,
  onDelete,
}: StockItemCardProps) {
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
      year: 'numeric',
    }).format(date);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <div className={styles.card}>
      {/* Image */}
      <div className={styles.imageContainer}>
        {!imageError && item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.name || 'Objet'}
            fill
            className={styles.image}
            onError={handleImageError}
            sizes="(max-width: 768px) 100vw, 200px"
          />
        ) : (
          <div className={styles.imagePlaceholder}>
            <Package size={32} />
          </div>
        )}
      </div>

      {/* Contenu principal */}
      <div className={styles.content}>
        {/* En-tête avec nom et nutriscore */}
        <div className={styles.header}>
          <h3 className={styles.name}>{item.name || 'Objet inconnu'}</h3>
          {item.nutriscore && (
            <div className={styles.nutriscoreContainer}>
              <NutriscoreBadge score={item.nutriscore} size="small" />
            </div>
          )}
        </div>

        {/* Marque et code-barres */}
        <div className={styles.detailsRow}>
          {item.brand && (
            <span className={styles.brand}>
              <strong>Marque:</strong> {item.brand}
            </span>
          )}
          {item.barcode && (
            <span className={styles.barcode}>
              <Barcode size={12} /> {item.barcode}
            </span>
          )}
        </div>

        {/* Quantité et emplacement */}
        <div className={styles.detailsRow}>
          <span className={styles.quantity}>
            <Package size={14} />
            {item.quantity} {item.unit && `x ${item.unit}`}
          </span>
          {item.location && (
            <span className={styles.location}>
              <MapPin size={14} /> {item.location}
            </span>
          )}
        </div>

        {/* Prix */}
        {item.price && (
          <div className={styles.price}>
            <Euro size={14} />
            {formatPrice(item.price)} / unité
          </div>
        )}

        {/* Date de péremption */}
        <div className={styles.expiryRow}>
          {item.expiryDate && (
            <span className={styles.expiryDate}>
              <Calendar size={14} />
              {formatDate(item.expiryDate)}
            </span>
          )}
          <ExpiryBadge 
            expiryStatus={item.expiryStatus} 
            daysUntilExpiry={item.daysUntilExpiry}
          />
        </div>

        {/* Installation (uniquement dans la vue globale) */}
        {item.installationName && (
          <div className={styles.installation}>
            <span className={styles.installationLabel}>{item.installationName}</span>
          </div>
        )}
      </div>

      {/* Pied avec actions */}
      <div className={styles.footer}>
        <button 
          onClick={() => onDetailsClick(item)}
          className={styles.detailsButton}
        >
          Voir les détails
        </button>
        
        <div className={styles.actions}>
          {onEdit && item.hasEditPermission && !item.isReadOnly && (
            <button 
              onClick={() => onEdit(item)}
              className={styles.actionButton}
              title="Modifier"
            >
              <Edit size={16} />
            </button>
          )}
          {onDelete && item.hasEditPermission && !item.isReadOnly && (
            <button 
              onClick={() => onDelete(item)}
              className={styles.actionButton}
              title="Supprimer"
              style={{ color: 'var(--color-danger, #ef4444)' }}
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
