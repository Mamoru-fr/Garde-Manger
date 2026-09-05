import { z } from "zod";

// ================
// SCHÉMAS POUR LES INSTALLATIONS
// ================

// Schéma pour la création d'une installation
export const CreateInstallationSchema = z.object({
  name: z
    .string()
    .min(1, "Le nom est requis")
    .max(100, "Le nom ne peut pas dépasser 100 caractères"),
  description: z
    .string()
    .max(500, "La description ne peut pas dépasser 500 caractères")
    .optional(),
});

// Schéma pour la mise à jour d'une installation
export const UpdateInstallationSchema = z.object({
  name: z
    .string()
    .min(1, "Le nom est requis")
    .max(100, "Le nom ne peut pas dépasser 100 caractères")
    .optional(),
  description: z
    .string()
    .max(500, "La description ne peut pas dépasser 500 caractères")
    .optional(),
});

// Schéma pour ajouter un utilisateur à une installation
export const AddUserToInstallationSchema = z.object({
  installationId: z.string().min(1, "L'ID de l'installation est requis"),
  userId: z.string().min(1, "L'ID utilisateur est requis"),
  role: z.enum(["owner", "editor", "viewer"]).catch("viewer"),
});

// Schéma pour les IDs
const IdSchema = z.object({
  id: z.string().min(1, "L'ID est requis"),
});

// Schéma pour supprimer une installation
export const DeleteInstallationSchema = IdSchema;

// Schéma pour supprimer un utilisateur d'une installation
export const RemoveUserFromInstallationSchema = z.object({
  installationId: z.string().min(1, "L'ID de l'installation est requis"),
  userId: z.string().min(1, "L'ID utilisateur est requis"),
});

// ================
// TYPES
// ================

// Type pour la création d'une installation
export type CreateInstallationInput = z.infer<typeof CreateInstallationSchema>;

// Type pour la mise à jour d'une installation
export type UpdateInstallationInput = z.infer<typeof UpdateInstallationSchema>;

// Type pour ajouter un utilisateur à une installation
export type AddUserToInstallationInput = z.infer<typeof AddUserToInstallationSchema>;

// Type pour supprimer une installation
export type DeleteInstallationInput = z.infer<typeof DeleteInstallationSchema>;

// Type pour supprimer un utilisateur d'une installation
export type RemoveUserFromInstallationInput = z.infer<
  typeof RemoveUserFromInstallationSchema
>;
