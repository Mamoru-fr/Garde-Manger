// ============================================
// TYPES POUR LA FONCTIONNALITÉ "MON STOCK"
// ============================================

import { objectInstallation, installations, objectDirectory, barcodeDirectory, shops, userInstallations } from "@/lib/db/schema";
import { InferSelectModel } from "drizzle-orm";

// ========== Types de base ==========

export type ObjectInstallationWithRelations = InferSelectModel<typeof objectInstallation>;
export type InstallationWithRelations = InferSelectModel<typeof installations>;
export type ObjectDirectoryWithRelations = InferSelectModel<typeof objectDirectory>;
export type BarcodeDirectoryWithRelations = InferSelectModel<typeof barcodeDirectory>;
export type ShopWithRelations = InferSelectModel<typeof shops>;
export type UserInstallationWithRelations = InferSelectModel<typeof userInstallations>;

// ========== Types pour les items du stock ==========

// Item du stock avec toutes les informations nécessaires
export interface StockItem {
  id: string; // objectInstallation.id
  installationId: string;
  installationName: string;
  objectDirectoryId: string;
  barcode: string;
  name: string;
  brand?: string | null;
  category?: string | null;
  description?: string | null;
  quantity: number;
  unit?: string | null;
  location?: string | null;
  purchaseDate?: Date | null;
  expiryDate?: Date | null;
  lotNumber?: string | null;
  price?: number | null; // En centimes (ex: 150 = 1.50€)
  notes?: string | null;
  nutriscore?: string | null; // "A", "B", "C", "D", "E"
  imageUrl?: string | null;
  shopId?: string | null;
  shopName?: string | null;
  isReadOnly?: boolean;
  hasEditPermission: boolean; // Calculé côté backend (owner/editor)
  createdAt: Date;
  updatedAt: Date;
}

// Item du stock avec calcul des jours jusqu'à péremption
export interface StockItemWithExpiryStatus extends StockItem {
  isExpired: boolean;
  daysUntilExpiry?: number | null;
  expiryStatus: 'normal' | 'warning' | 'urgent' | 'expired' | 'no_date';
}

// ========== Types pour les filtres ==========

export interface StockFilters {
  searchQuery?: string; // Recherche par nom, barcode, marque
  category?: string;
  installationId?: string; // Pour la page globale /stock (filtre par installation)
  location?: string;
  expiryStatus?: 'all' | 'warning' | 'urgent' | 'expired' | 'no_date' | 'normal';
  sortBy?: 'name' | 'quantity' | 'expiry_date' | 'purchase_date' | 'added_date';
  sortOrder?: 'asc' | 'desc';
}

// ========== Types pour les statistiques ==========

export interface StockStats {
  totalItems: number;
  totalQuantity: number;
  totalValue: number; // En centimes
  expiringSoonCount: number; // < 7 jours
  expiredCount: number;
  categoriesDistribution: Record<string, number>;
  installationsDistribution?: Record<string, number>; // Pour la vue globale
}

// ========== Types pour les réponses API ==========

export interface StockResponse {
  success: boolean;
  data?: StockItemWithExpiryStatus[];
  stats?: StockStats;
  error?: string;
  code?: string;
}

// ========== Types pour les actions ==========

export interface UpdateStockItemInput {
  quantity?: number;
  location?: string | null;
  purchaseDate?: Date | null;
  expiryDate?: Date | null;
  lotNumber?: string | null;
  price?: number | null;
  notes?: string | null;
  shopId?: string | null;
}

// ========== Constantes pour les statuts de péremption ==========

export const EXPIRY_STATUS_CONFIG = {
  normal: {
    thresholdDays: 7, // > 7 jours -> normal
    label: 'OK',
    colorClass: 'bg-green-100 text-green-800',
  },
  warning: {
    thresholdDays: 3, // 3-7 jours -> avertissement
    label: 'Bientôt périmé',
    colorClass: 'bg-orange-100 text-orange-800',
  },
  urgent: {
    thresholdDays: 0, // < 3 jours -> urgent
    label: 'À consommer vite',
    colorClass: 'bg-red-100 text-red-800',
  },
  expired: {
    thresholdDays: 0, // Date dans le passé -> périmé
    label: 'Périmé',
    colorClass: 'bg-gray-200 text-gray-800',
  },
  no_date: {
    label: 'Pas de date',
    colorClass: 'bg-gray-100 text-gray-500',
  },
} as const;

// ========== Types pour les rôles ==========

export type InstallationRole = 'owner' | 'editor' | 'viewer';

// Vérifie si l'utilisateur peut modifier un objet dans une installation
export function canEditStockItem(role: InstallationRole): boolean {
  return role === 'owner' || role === 'editor';
}
