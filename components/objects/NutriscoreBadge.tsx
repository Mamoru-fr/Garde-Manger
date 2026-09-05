"use client";

import styles from "./NutriscoreBadge.module.css";

// Props du composant
export interface NutriscoreBadgeProps {
  score: string;  // A, B, C, D, E, ou "unknown"
  size?: "small" | "medium" | "large";
  showLabel?: boolean;
  showTooltip?: boolean;
}

// Mapping des labels pour le Nutriscore
const nutriscoreLabels: Record<string, string> = {
  A: "Excellent",
  B: "Bon",
  C: "Moyen",
  D: "Mauvais",
  E: "Très mauvais",
  unknown: "Inconnu",
};

// Mapping des descriptions pour le tooltip
const nutriscoreDescriptions: Record<string, string> = {
  A: "Produit de qualité nutritionnelle excellente",
  B: "Produit de bonne qualité nutritionnelle",
  C: "Produit de qualité nutritionnelle moyenne",
  D: "Produit de qualité nutritionnelle mauvaise",
  E: "Produit de très mauvaise qualité nutritionnelle",
  unknown: "Nutriscore non disponible",
};

// Normaliser le score (passer en majuscule et gérer les valeurs invalides)
function normalizeScore(score: string): string {
  const normalized = score?.toUpperCase()?.trim();
  return ["A", "B", "C", "D", "E"].includes(normalized) ? normalized : "unknown";
}

// Obtenir la classe CSS en fonction du score
function getScoreClass(score: string): string {
  switch (normalizeScore(score)) {
    case "A":
      return styles.nutriscoreA;
    case "B":
      return styles.nutriscoreB;
    case "C":
      return styles.nutriscoreC;
    case "D":
      return styles.nutriscoreD;
    case "E":
      return styles.nutriscoreE;
    default:
      return styles.nutriscoreUnknown;
  }
}

// Obtenir la taille CSS en fonction de la prop size
function getSizeClass(size?: string): string {
  switch (size) {
    case "small":
      return styles.small;
    case "large":
      return styles.large;
    default:
      return "";
  }
}

export default function NutriscoreBadge({
  score,
  size = "medium",
  showLabel = false,
  showTooltip = true,
}: NutriscoreBadgeProps) {
  const normalizedScore = normalizeScore(score);
  const scoreClass = getScoreClass(normalizedScore);
  const sizeClass = getSizeClass(size);
  const tooltipText = showTooltip ? nutriscoreDescriptions[normalizedScore] : undefined;

  return (
    <span className={showTooltip ? styles.tooltip : ""} data-tooltip={tooltipText}>
      {showLabel ? (
        <span className={styles.withLabel}>
          <span className={`${styles.badge} ${scoreClass} ${sizeClass}`}>
            {normalizedScore}
          </span>
          <span className={styles.label}>{nutriscoreLabels[normalizedScore]}</span>
        </span>
      ) : (
        <span className={`${styles.badge} ${scoreClass} ${sizeClass}`}>
          {normalizedScore}
        </span>
      )}
    </span>
  );
}
