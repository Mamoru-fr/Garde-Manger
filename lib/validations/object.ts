import { z } from "zod";

// ================
// SCHÉMAS POUR LES OBJETS
// ================

// Schéma pour la création d'un objet dans l'annuaire
export const CreateObjectDirectorySchema = z.object({
  name: z
    .string()
    .min(1, "Le nom est requis")
    .max(100, "Le nom ne peut pas dépasser 100 caractères"),
  description: z
    .string()
    .max(500, "La description ne peut pas dépasser 500 caractères")
    .optional(),
  categoryId: z.string().min(1, "L'ID de la catégorie est requis").optional(),
  unitId: z.string().min(1, "L'ID de l'unité est requis").optional(),
  defaultQuantity: z
    .number()
    .int("La quantité doit être un nombre entier")
    .positive("La quantité doit être positive")
    .default(1),
});

// Schéma pour la mise à jour d'un objet dans l'annuaire
export const UpdateObjectDirectorySchema = z.object({
  name: z
    .string()
    .min(1, "Le nom est requis")
    .max(100, "Le nom ne peut pas dépasser 100 caractères")
    .optional(),
  description: z
    .string()
    .max(500, "La description ne peut pas dépasser 500 caractères")
    .optional(),
  categoryId: z.string().min(1, "L'ID de la catégorie est requis").optional(),
  unitId: z.string().min(1, "L'ID de l'unité est requis").optional(),
  defaultQuantity: z
    .number()
    .int("La quantité doit être un nombre entier")
    .positive("La quantité doit être positive")
    .optional(),
});

// Schéma pour ajouter un code-barres à un objet
export const AddBarcodeSchema = z.object({
  objectDirectoryId: z.string().min(1, "L'ID de l'objet est requis"),
  barcode: z
    .string()
    .min(1, "Le code-barres est requis")
    .refine((value) => /^[\w\d\s\-]+$/.test(value), {
      message: "Le code-barres contient des caractères invalides",
    }),
  barcodeType: z
    .enum(["EAN13", "EAN8", "UPC", "QR_CODE", "CODE128", "CODE39", "OTHER"])
    .default("EAN13"),
});

// Schéma pour ajouter un objet à une installation
export const AddObjectToInstallationSchema = z.object({
  installationId: z.string().min(1, "L'ID de l'installation est requis"),
  objectDirectoryId: z.string().min(1, "L'ID de l'objet est requis"),
  quantity: z
    .number()
    .int("La quantité doit être un nombre entier")
    .positive("La quantité doit être positive"),
  location: z
    .string()
    .max(100, "L'emplacement ne peut pas dépasser 100 caractères")
    .optional(),
  expiryDate: z
    .string()
    .refine((value) => {
      const date = new Date(value);
      return !isNaN(date.getTime());
    }, {
      message: "La date d'expiration est invalide",
    })
    .transform((value) => new Date(value))
    .optional(),
});

// Schéma pour mettre à jour la quantité d'un objet
export const UpdateObjectQuantitySchema = z.object({
  objectInstallationId: z.string().min(1, "L'ID de l'objet dans l'installation est requis"),
  newQuantity: z
    .number()
    .int("La quantité doit être un nombre entier")
    .nonnegative("La quantité doit être positive ou nulle"),
  action: z.enum(["increase", "decrease", "set"]).default("set"),
});

// Schéma pour déplacer un objet
export const MoveObjectSchema = z.object({
  objectInstallationId: z.string().min(1, "L'ID de l'objet dans l'installation est requis"),
  newInstallationId: z.string().min(1, "L'ID de la nouvelle installation est requis"),
  newLocation: z
    .string()
    .max(100, "L'emplacement ne peut pas dépasser 100 caractères")
    .optional(),
});

// Schéma pour supprimer un objet d'une installation
export const RemoveObjectFromInstallationSchema = z.object({
  objectInstallationId: z.string().min(1, "L'ID de l'objet dans l'installation est requis"),
});

// Schéma pour supprimer un code-barres
export const RemoveBarcodeSchema = z.object({
  id: z.string().min(1, "L'ID du code-barres est requis"),
});

// Schéma pour les IDs
export const ObjectDirectoryIdSchema = z.object({
  id: z.string().min(1, "L'ID est requis"),
});

// Schéma pour la recherche d'objets
export const SearchObjectsSchema = z.object({
  query: z.string().max(100, "La requête ne peut pas dépasser 100 caractères").optional(),
  categoryId: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

// ================
// TYPES
// ================

// Types pour la création / mise à jour d'un objet dans l'annuaire
export type CreateObjectDirectoryInput = z.infer<typeof CreateObjectDirectorySchema>;
export type UpdateObjectDirectoryInput = z.infer<typeof UpdateObjectDirectorySchema>;

// Types pour les codes-barres
export type AddBarcodeInput = z.infer<typeof AddBarcodeSchema>;
export type RemoveBarcodeInput = z.infer<typeof RemoveBarcodeSchema>;

// Types pour les objets dans une installation
export type AddObjectToInstallationInput = z.infer<typeof AddObjectToInstallationSchema>;
export type UpdateObjectQuantityInput = z.infer<typeof UpdateObjectQuantitySchema>;
export type MoveObjectInput = z.infer<typeof MoveObjectSchema>;
export type RemoveObjectFromInstallationInput = z.infer<
  typeof RemoveObjectFromInstallationSchema
>;

// Types pour les recherches
export type SearchObjectsInput = z.infer<typeof SearchObjectsSchema>;
