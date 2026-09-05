import { z } from "zod";

// ================
// SCHÉMAS D'AUTHENTIFICATION
// ================

// Schéma pour l'inscription
export const SignUpSchema = z.object({
  email: z
    .string()
    .min(1, "L'email est requis")
    .email("Adresse email invalide"),
  password: z
    .string()
    .min(1, "Le mot de passe est requis")
    .min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  name: z.string().min(1, "Le nom est requis").max(100, "Le nom ne peut pas dépasser 100 caractères"),
});

// Schéma pour la connexion
export const SignInSchema = z.object({
  email: z
    .string()
    .min(1, "L'email est requis")
    .email("Adresse email invalide"),
  password: z
    .string()
    .min(1, "Le mot de passe est requis"),
});

// Schéma pour la réinitialisation du mot de passe (demande)
export const ForgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "L'email est requis")
    .email("Adresse email invalide"),
});

// Schéma pour la réinitialisation du mot de passe (confirmation)
export const ResetPasswordSchema = z.object({
  token: z.string().min(1, "Le token est requis"),
  password: z
    .string()
    .min(1, "Le mot de passe est requis")
    .min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  confirmPassword: z.string().min(1, "La confirmation du mot de passe est requise"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

// Schéma pour la vérification de l'email
export const VerifyEmailSchema = z.object({
  token: z.string().min(1, "Le token est requis"),
});

// ================
// TYPES
// ================

// Types pour l'inscription
export type SignUpInput = z.infer<typeof SignUpSchema>;

// Types pour la connexion
export type SignInInput = z.infer<typeof SignInSchema>;

// Types pour la réinitialisation du mot de passe
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;

// Types pour la vérification de l'email
export type VerifyEmailInput = z.infer<typeof VerifyEmailSchema>;
