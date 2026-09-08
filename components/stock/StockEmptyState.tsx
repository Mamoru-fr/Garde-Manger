"use client";

import { Package, Barcode } from "lucide-react";
import Link from "next/link";
import styles from "./StockEmptyState.module.css";

interface StockEmptyStateProps {
  installationId?: string;
  message?: string;
}

export default function StockEmptyState({
  installationId,
  message = "Votre stock est vide"
}: StockEmptyStateProps) {
  return (
    <div className={styles.emptyContainer}>
      <div className={styles.emptyIcon}>
        <Package size={64} />
      </div>
      
      <h3 className={styles.emptyTitle}>{message}</h3>
      
      <p className={styles.emptyDescription}>
        {installationId 
          ? `Ajoutez des objets à cette installation en scannant des codes-barres.`
          : `Ajoutez des objets à vos installations en scannant des codes-barres.`}
      </p>
      
      {installationId && (
        <Link 
          href={`/installations/${installationId}/objects/scan`}
          className={styles.scanButton}
        >
          <Barcode size={18} />
          Scanner un nouvel objet
        </Link>
      )}
    </div>
  );
}
