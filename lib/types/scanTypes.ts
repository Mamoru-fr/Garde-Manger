// ============================================
// TYPES POUR LA FONCTIONNALITÉ DE SCAN
// ============================================

import type { ScanVariantSummary } from "@/lib/services/ScanResolutionViewService";
import { ObjectDirectory } from "./index";

// ========== Énumérations ==========

// Statut du scan
export type ScanStatus = 'idle' | 'scanning' | 'processing' | 'found' | 'not_found' | 'error';

// Action possible après scan
export type ScanAction = 'add' | 'remove' | 'cancel';

// ========== Interfaces Principales ==========

// Résultat brut du scan de code-barres
export interface RawScanResult {
  barcode: string;
  timestamp: Date;
}

// Réponse de l'API annuaire (ex: OpenFoodFacts)
export interface DirectoryApiResponse {
  code: string;
  status: number;
  status_verb: string;
  product: DirectoryProduct;
}

// Produit tel que retourné par OpenFoodFacts
export interface DirectoryProduct {
  _id?: string;
  _keywords?: string[];
  allergens?: string;
  allergens_from_ingredients?: string;
  allergens_from_user?: string;
  aroma?: string;
  bars?: string;
  brands?: string;
  brands_tags?: string[];
  categories?: string;
  categories_tags?: string[];
  city?: string;
  code?: string;
  countries?: string;
  countries_tags?: string[];
  created_t?: number;
  creator?: string;
  data_quality_bugs_tags?: any[];
  data_quality_completeness?: number;
  data_quality_info_tags?: string[];
  data_quality_tags?: string[];
  data_sources?: string;
  data_sources_tags?: string[];
  debug_param_sent?: string;
  ecoscore_data?: any;
  ecoscore_grade?: string;
  ecoscore_score?: number;
  ecoscore_tags?: string[];
  editors_tags?: string[];
  embryonic_tags?: string[];
  energy_100g?: number;
  energy_from_fat_100g?: number;
  energy_from_fat_serving?: number;
  energy_serving?: number;
  fat_100g?: number;
  fat_serving?: number;
  fat_unit?: string;
  fat_value?: number;
  food_groups?: string;
  food_groups_tags?: string[];
  generic_name?: string;
  id: string; // Product ID
  image_front_small_url?: string;
  image_front_thumb_url?: string;
  image_front_url?: string;
  image_ingredients_small_url?: string;
  image_ingredients_thumb_url?: string;
  image_ingredients_url?: string;
  image_nutrition_small_url?: string;
  image_nutrition_thumb_url?: string;
  image_nutrition_url?: string;
  image_small_url?: string;
  image_thumb_url?: string;
  image_url?: string;
  ingredients_from_or_more?: string;
  ingredients_from_or_more_tags?: string[];
  ingredients_from_palm_oil?: string;
  ingredients_from_palm_oil_tags?: string[];
  ingredients_n_tags?: number;
  ingredients_tags?: string[];
  ingredients_text?: string;
  ingredients_that_may_be_from_palm_oil_n?: number;
  ingredients_that_may_be_from_palm_oil_tags?: string[];
  languages?: string;
  languages_codes?: any;
  languages_hierarchy?: string[];
  languages_tags?: string[];
  last_check?: string;
  last_check_t?: number;
  last_check_user_id?: string;
  last_modified_t?: number;
  manufacturer_tags?: string[];
  nutriment_levels?: any;
  nutriment_levels_tags?: string[];
  nutriscore_data?: any;
  nutriscore_grade?: string; // A, B, C, D, E
  nutriscore_score?: number;
  nutritional_data_per?: string;
  nutritional_data_type?: string;
  origin?: string;
  origin_tags?: string[];
  packaging?: string;
  packaging_tags?: string[];
  purchase_places?: string;
  purchase_places_tags?: string[];
  quantities?: string[];
  quantity?: string;
  serving_size?: string;
  stores?: string;
  stores_tags?: string[];
  traces?: string;
  traces_from_ingredients?: string;
  traces_from_user?: string;
  traces_tags?: string[];
  product_name?: string; // Nom du produit
  product_name_fr?: string;
  product_quantity?: number;
  score?: string;
  selected_images?: any;
  shops?: string;
  states?: string;
  states_tags?: string[];
  url?: string;
}

// Produit simplifié pour notre application
export interface SimplifiedDirectoryItem {
  id: string;
  name: string;
  barcode: string;
  brand?: string | null;
  category?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  quantity?: string | null; // Ex: "1L", "500g"
  nutriscore?: string | null; // A, B, C, D, E
  ingredients?: string | null;
  allergens?: string | null;
  // Champs supplémentaires utiles
  productName?: string; // Nom complet du produit
  openFoodFactsId?: string; // ID dans OpenFoodFacts
  isReadOnly?: boolean; // ✅ true si l'objet vient d'OpenFoodFacts (non modifiable)
  // Chantier 4:2 : la variante identifiée par le code-barres (§5 :
  // barcode → variante → générique). Absente = fiche legacy → repli générique.
  variant?: ScanVariantSummary | null;
}

// Résultat complet du scan avec l'annuaire
export interface CompleteScanResult {
  status: ScanStatus;
  rawBarcode: string;
  directoryItem?: SimplifiedDirectoryItem | null;
  foundInDirectory: boolean;
  foundInInstallation: boolean;
  currentQuantity: number; // Quantité actuelle dans l'installation ciblée
  installationsWithThisObject?: Array<{
    installationId: string;
    installationName: string;
    quantity: number;
  }>;
  error?: string;
  timestamp: Date;
}

// Props pour les composants de scan
export interface ScanClientProps {
  installationId: string;
  installationName: string;
  onScanComplete?: (result: CompleteScanResult) => void;
  onClose?: () => void;
}

// Props pour le modal de résultat
export interface ScanResultModalProps {
  item: SimplifiedDirectoryItem;
  barcode: string;
  installationId: string;
  currentQuantity: number;
  onClose: () => void;
  onSuccess: () => void;
}

// Props pour le modal de nouvel objet
export interface NewObjectModalProps {
  barcode: string;
  installationId: string;
  onClose: () => void;
  onSuccess: () => void;
}

// Données pour la création d'un nouvel objet depuis le scan
export interface NewObjectFromScanInput {
  barcode: string;
  name: string;
  category?: string;
  description?: string;
  brand?: string;
  quantity: number;
  unit?: string; // "kg", "L", "unité", etc.
  nutriscore?: string;
  imageUrl?: string;
  expiryDate?: Date;
  location?: string;
  notes?: string;
}

// Résultat de l'action après scan (ajout retire)
export interface ScanActionResult {
  success: boolean;
  action: ScanAction;
  barcode: string;
  previousQuantity?: number;
  newQuantity?: number;
  objectId?: string;
  timestamp: Date;
  error?: string;
}

// Configuration du scanner
export interface ScannerConfig {
  enabled: boolean;
  facingMode: 'user' | 'environment'; // Caméra avant/arrière
  torchOn: boolean; // Lampe torche activée
  zoom: number; // Niveau de zoom (0.1 - 5.0)
  resolution?: {
    width?: number;
    height?: number;
  };
}

// État du scanner dans le composant
export interface ScannerState {
  isActive: boolean;
  isLoading: boolean;
  lastScanned: string | null;
  error: string | null;
}
