"use client";

import Link from "next/link";
import { Package, MapPin, Calendar, ShoppingBag, Trash2, Edit } from "lucide-react";
import styles from "./ObjectInstanceTable.module.css";

// Props pour une instance
export interface ObjectInstanceData {
  id: string;
  installationId: string;
  installationName: string;
  quantity: number;
  location?: string | null;
  purchaseDate?: Date | null;
  expiryDate?: Date | null;
  shopId?: string | null;
  shopName?: string | null;
  lotNumber?: string | null;
  price?: number | null;
  note?: string | null;
}

// Props du composant
export interface ObjectInstanceTableProps {
  instances: ObjectInstanceData[];
  onEdit?: (instanceId: string) => void;
  onDelete?: (instanceId: string) => void;
  showShop?: boolean;
  showPrice?: boolean;
  showActions?: boolean;
}

// Formater une date en string lisible
function formatDate(date: Date | null | undefined): string {
  if (!date) return "Non spécifiée";
  return new Date(date).toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Obtenir la classe CSS pour l'état de péremption
function getExpiryClass(expiryDate: Date | null | undefined): string {
  if (!expiryDate) return styles.date;
  
  const now = new Date();
  const expiry = new Date(expiryDate);
  const daysDiff = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (expiry < now) return styles.expiryExpired;
  if (daysDiff <= 7) return styles.expirySoon;
  return styles.expiryNormal;
}

// Formater un prix en euros (centimes → €)
function formatPrice(price: number | null | undefined): string {
  if (!price) return "Non spécifié";
  return `${(price / 100).toFixed(2)} €`;
}

export default function ObjectInstanceTable({
  instances,
  onEdit,
  onDelete,
  showShop = true,
  showActions = true,
}: ObjectInstanceTableProps) {
  if (instances.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyMessage}>
          <p>Aucune instance trouvée pour cet objet.</p>
          <p>Ajoutez cet objet à vos installations pour commencer à le suivre.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <table className={styles.table}>
        <thead className={styles.thead}>
          <tr>
            <th className={styles.th}>
              <span className={styles.thIcon}>
                <Package size={14} />
                Installation
              </span>
            </th>
            <th className={styles.th}>
              <span className={styles.thIcon}>
                <span>Qty</span>
              </span>
            </th>
            {showShop && (
              <th className={styles.th}>
                <span className={styles.thIcon}>
                  <ShoppingBag size={14} />
                  Magasin
                </span>
              </th>
            )}
            <th className={styles.th}>
              <span className={styles.thIcon}>
                <MapPin size={14} />
                Emplacement
              </span>
            </th>
            <th className={styles.th}>
              <span className={styles.thIcon}>
                <Calendar size={14} />
                Achat
              </span>
            </th>
            <th className={styles.th}>
              <span className={styles.thIcon}>
                <Calendar size={14} />
                Péremption
              </span>
            </th>
            {showActions && <th className={styles.th}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {instances.map((instance) => (
            <tr key={instance.id} className={styles.tr}>
              <td className={`${styles.td} ${styles.installation}`}>
                {instance.installationName}
              </td>
              <td className={`${styles.td} ${styles.numeric}`}>
                <span className={styles.quantityBadge}>{instance.quantity}</span>
              </td>
              {showShop && (
                <td className={`${styles.td} ${styles.shop}`}>
                  {instance.shopName || "Non spécifié"}
                </td>
              )}
              <td className={styles.td}>
                {instance.location ? (
                  <span className={styles.locationBadge}>{instance.location}</span>
                ) : (
                  "Non spécifié"
                )}
              </td>
              <td className={`${styles.td} ${styles.date}`}>
                {formatDate(instance.purchaseDate)}
              </td>
              <td className={`${styles.td} ${getExpiryClass(instance.expiryDate)}`}>
                {formatDate(instance.expiryDate)}
              </td>
              {showActions && (
                <td className={`${styles.td} ${styles.actions}`}>
                  {onEdit && (
                    <button
                      className={styles.actionBtn}
                      onClick={() => onEdit(instance.id)}
                    >
                      <Edit size={14} />
                      Modifier
                    </button>
                  )}
                  {onDelete && (
                    <button
                      className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                      onClick={() => onDelete(instance.id)}
                    >
                      <Trash2 size={14} />
                      Supprimer
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
