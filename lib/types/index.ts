// ================
// TYPES GLOBAUX
// ================

// Réponse standard pour les Server Actions
export interface ActionResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: ErrorCode;
  details?: unknown;
}

// Codes d'erreur
export const ErrorCodes = {
  // Erreurs génériques
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  
  // Erreurs spécifiques à l'application
  USER_NOT_FOUND: "USER_NOT_FOUND",
  EMAIL_ALREADY_EXISTS: "EMAIL_ALREADY_EXISTS",
  INSTALLATION_NOT_FOUND: "INSTALLATION_NOT_FOUND",
  INSTALLATION_ACCESS_DENIED: "INSTALLATION_ACCESS_DENIED",
  OBJECT_NOT_FOUND: "OBJECT_NOT_FOUND",
  OBJECT_ALREADY_EXISTS: "OBJECT_ALREADY_EXISTS",
  BARCODE_ALREADY_EXISTS: "BARCODE_ALREADY_EXISTS",
  INVALID_BARCODE: "INVALID_BARCODE",
  EXPIRY_DATE_IN_PAST: "EXPIRY_DATE_IN_PAST",
  QUANTITY_INVALID: "QUANTITY_INVALID",
  OBJECT_TYPE_NOT_FOUND: "OBJECT_TYPE_NOT_FOUND",
  SHOP_NOT_FOUND: "SHOP_NOT_FOUND",
  OPEN_FOOD_FACTS_ERROR: "OPEN_FOOD_FACTS_ERROR",
  OBJECT_INSTANCE_NOT_FOUND: "OBJECT_INSTANCE_NOT_FOUND",
} as const;

// Type pour les codes d'erreur
export type ErrorCode = keyof typeof ErrorCodes;

// ================
// TYPES POUR L'AUTHENTIFICATION
// ================

// Rôles globaux
export type UserRole = "admin" | "user";

// Rôles dans une installation
export type InstallationRole = "owner" | "editor" | "viewer";

// Session utilisateur (étendue)
export interface UserSession {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role: UserRole;
  emailVerified: boolean;
}

// Contexte de session avec les installations
export interface SessionWithInstallations extends UserSession {
  installations: {
    id: string;
    name: string;
    role: InstallationRole;
  }[];
}

// ================
// TYPES POUR LES INSTALLATIONS
// ================

// Installation
export interface Installation {
  id: string;
  name: string;
  description?: string | null;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Installation avec le propriétaire
export interface InstallationWithOwner extends Installation {
  owner: UserSession;
}

// Utilisateur dans une installation
export interface UserInInstallation {
  userId: string;
  installationId: string;
  role: InstallationRole;
  joinedAt: Date;
  user: UserSession;
}

// ================
// TYPES POUR LES OBJETS
// ================

// Catégorie
export interface Category {
  id: string;
  name: string;
  description?: string | null;
  type: string;
  createdAt?: Date | null;
}

// Unité
export interface Unit {
  id: string;
  name: string;
  symbol: string;
  type: string;
  createdAt?: Date | null;
}

// Type d'objet (Fruit, Légume, Viande, etc.)
export interface ObjectType {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  parentTypeId?: string | null;
  parent?: ObjectType | null;
  children?: ObjectType[];
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

// Magasin (Carrefour, Lidl, etc.)
export interface Shop {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  createdAt: Date;
}

// Objet de l'annuaire
export interface ObjectDirectory {
  id: string;
  name: string;
  description?: string | null;
  categoryId?: string | null;
  unitId?: string | null;
  objectTypeId?: string | null;  // Nouveau: Lien vers le type d'objet
  objectType?: ObjectType | null;  // Nouveau
  defaultQuantity: number;
  nutriscore?: string | null;  // Nouveau: A, B, C, D, E
  brand?: string | null;  // Nouveau: Marque
  openFoodFactsId?: string | null;  // Nouveau: ID OpenFoodFacts
  createdAt: Date;
  updatedAt: Date;
  category?: Category;
  unit?: Unit;
}

// Code-barres
export interface BarcodeDirectory {
  id: string;
  objectDirectoryId: string;
  barcode: string;
  barcodeType: string;
  createdAt: Date;
  objectDirectory?: ObjectDirectory;
}

// Objet dans une installation
export interface ObjectInstallation {
  id: string;
  installationId: string;
  objectDirectoryId: string;
  quantity: number;
  location?: string | null;
  purchaseDate?: Date | null;  // Nouveau: Date d'achat
  expiryDate?: Date | null;
  shopId?: string | null;  // Nouveau: Magasin
  shop?: Shop | null;  // Nouveau
  lotNumber?: string | null;  // Nouveau: Numéro de lot
  price?: number | null;  // Nouveau: Prix en centimes
  note?: string | null;  // Nouveau: Notes
  addedDate: Date;
  updatedAt: Date;
  createdBy?: string | null;
  objectDirectory?: ObjectDirectory;
  installation?: Installation;
}

// Historique des modifications
export interface ObjectHistory {
  id: string;
  objectInstallationId: string;
  oldQuantity?: number | null;
  newQuantity?: number | null;
  action: string;
  userId?: string | null;
  timestamp: Date;
  objectInstallation?: ObjectInstallation;
  user?: UserSession;
}

// ================
// TYPES POUR LES FORMULAIRES
// ================

// Création d'une installation
export interface CreateInstallationInput {
  name: string;
  description?: string;
}

// Mise à jour d'une installation
export interface UpdateInstallationInput {
  name?: string;
  description?: string;
}

// Ajout d'un utilisateur à une installation
export interface AddUserToInstallationInput {
  userId: string;
  installationId: string;
  role: InstallationRole;
}

// Création d'un objet dans l'annuaire
export interface CreateObjectDirectoryInput {
  name: string;
  description?: string;
  categoryId?: string;
  unitId?: string;
  defaultQuantity?: number;
}

// Ajout d'un code-barres à un objet
export interface AddBarcodeInput {
  objectDirectoryId: string;
  barcode: string;
  barcodeType?: string;
}

// Ajout d'un objet à une installation
export interface AddObjectToInstallationInput {
  installationId: string;
  objectDirectoryId: string;
  quantity: number;
  location?: string;
  expiryDate?: Date;
}

// Mise à jour de la quantité d'un objet
export interface UpdateObjectQuantityInput {
  objectInstallationId: string;
  newQuantity: number;
  action: "increase" | "decrease" | "set";
}

// ================
// TYPES POUR LES NOUVEAUX SERVICES (OBJETS GLOBAUX)
// ================

// Objet global avec ses instances
export interface GlobalObjectWithInstances {
  id: string;
  name: string;
  description?: string | null;
  categoryId?: string | null;
  unitId?: string | null;
  objectTypeId?: string | null;
  nutriscore?: string | null;
  brand?: string | null;
  openFoodFactsId?: string | null;
  defaultQuantity?: number | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
  category?: Category | null;
  unit?: Unit | null;
  objectType?: ObjectType | null;
  totalQuantity: number;  // Somme de toutes les quantités dans les installations de l'utilisateur
  instances: ObjectInstance[];  // Liste des instances de cet objet
}

// Instance d'un objet dans une installation (pour la vue globale)
export interface ObjectInstance {
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

// Données nutritionnelles depuis OpenFoodFacts
export interface NutritionalData {
  nutriscore: string;  // A, B, C, D, E
  productName: string;
  brand: string;
  ingredients: string[];
  allergens: string;
  imageUrl: string;
  servingSize?: string;
  nutrients?: {
    energyKcal?: number;
    proteins?: number;
    carbohydrates?: number;
    fat?: number;
    sugar?: number;
    salt?: number;
  };
}

// ================
// TYPES POUR LA PWA
// ================

// Notification pour la PWA
export interface PWANotification {
  title: string;
  body: string;
  icon?: string;
  data?: {
    url?: string;
    installationId?: string;
    objectId?: string;
  };
}

// ================
// TYPES POUR LE SCAN DE CODES-BARRES
// ================

// Résultat du scan
export interface BarcodeScanResult {
  barcode: string;
  object?: ObjectDirectory | null;
  foundInInstallations?: {
    installationId: string;
    installationName: string;
    quantity: number;
  }[];
}
