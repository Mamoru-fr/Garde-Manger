"use client";

import Link from "next/link";
import { Package, ArrowRight } from "lucide-react";
import NutriscoreBadge from "./NutriscoreBadge";
import styles from "./ObjectGlobalCard.module.css";

// Props du composant
export interface ObjectGlobalCardProps {
  id: string;  // ID de l'objet global (objectDirectory.id)
  name: string;
  imageUrl?: string | null;  // URL de l'image (via OpenFoodFacts)
  nutriscore?: string | null;
  brand?: string | null;
  objectType?: string | null;  // Ex: "Fruit", "Légume"
  totalQuantity: number;
  compact?: boolean;  // Version compacte pour les listes
  showDetailsLink?: boolean;  // Afficher le lien vers les détails
}

// Emoji par défaut selon le type d'objet (si pas d'image)
const typeToEmoji: Record<string, string> = {
  fruit: "🍎",
  legume: "🥦",
  viande: "🥩",
  poisson: "🐟",
  boisson: "🧃",
  epicerie: "🥫",
  surgelé: "❄️",
  frais: "🧀",
  conserve: "🥫",
  menage: "🧹",
  hygiene: "🧴",
  autre: "📦",
};

// Obtenir l'emoji par défaut en fonction du type
function getEmojiForType(objectType?: string | null): string {
  if (!objectType) return "📦";
  const lowerType = objectType.toLowerCase();
  return typeToEmoji[lowerType] || "📦";
}

export default function ObjectGlobalCard({
  id,
  name,
  imageUrl,
  nutriscore,
  brand,
  objectType,
  totalQuantity,
  compact = false,
  showDetailsLink = true,
}: ObjectGlobalCardProps) {
  const emoji = getEmojiForType(objectType);
  const displayImageUrl = imageUrl || null;

  return (
    <article className={`${styles.card} ${compact ? styles.compact : styles.horizontal}`}>
      {/* Image ou emoji */}
      <div className={styles.imageContainer}>
        {displayImageUrl ? (
          <img
            src={displayImageUrl}
            alt={name}
            className={styles.image}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = "none";
            }}
          />
        ) : (
          <span className={styles.placeholder}>{emoji}</span>
        )}
      </div>

      {/* Informations */}
      <div className={styles.infoContainer}>
        <h3 className={styles.title}>{name}</h3>

        {/* Sous-titre (marque + type) */}
        <div className={styles.subtitle}>
          {brand && <span className={styles.brandBadge}>{brand}</span>}
          {objectType && <span className={styles.typeBadge}>{objectType}</span>}
        </div>

        {/* Quantité totale + Nutriscore */}
        <div className={styles.metaContainer}>
          <span className={styles.quantity}>
            <span className={styles.quantityLabel}>Total:</span>
            <span className={styles.quantityValue}>{totalQuantity}</span>
          </span>
          {nutriscore && <NutriscoreBadge score={nutriscore} size="small" showTooltip />}
        </div>

        {/* Actions */}
        {showDetailsLink && (
          <div className={styles.actions}>
            <Link href={`/objects/${id}`} className={styles.detailsLink}>
              Voir les détails
              <ArrowRight size={16} className={styles.arrowIcon} />
            </Link>
          </div>
        )}
      </div>
    </article>
  );
}
