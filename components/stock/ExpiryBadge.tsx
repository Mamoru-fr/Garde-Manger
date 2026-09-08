"use client";

import { EXPIRY_STATUS_CONFIG } from "@/lib/types/stockTypes";
import styles from "./ExpiryBadge.module.css";

interface ExpiryBadgeProps {
  expiryStatus: 'normal' | 'warning' | 'urgent' | 'expired' | 'no_date';
  daysUntilExpiry?: number | null;
  showDays?: boolean;
}

export default function ExpiryBadge({
  expiryStatus,
  daysUntilExpiry,
  showDays = true,
}: ExpiryBadgeProps) {
  const config = EXPIRY_STATUS_CONFIG[expiryStatus];
  
  // Calculer le label à afficher
  let label: string = config.label;
  if (showDays && daysUntilExpiry !== null && daysUntilExpiry !== undefined) {
    if (expiryStatus !== 'no_date' && expiryStatus !== 'expired') {
      label = daysUntilExpiry === 0 
        ? "À consommer aujourd'hui" 
        : `${daysUntilExpiry} jour${daysUntilExpiry > 1 ? 's' : ''}`;
    }
    
    if (expiryStatus === 'expired') {
      const daysExpired = Math.abs(daysUntilExpiry);
      label = `Périmé depuis ${daysExpired} jour${daysExpired > 1 ? 's' : ''}`;
    }
  }

  return (
    <span 
      className={`${styles.expiryBadge} ${styles[expiryStatus]}`}
      title={config.label}
    >
      {label}
    </span>
  );
}
