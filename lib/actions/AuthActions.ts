"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SignUpSchema,
  SignInSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  VerifyEmailSchema,
} from "@/lib/validations/auth";
import { AuthController } from "@/lib/controllers/AuthController";
import { ActionResponse, ErrorCodes } from "@/lib/types";

// ================
// SERVER ACTIONS D'AUTHENTIFICATION
// ================

// Action pour l'inscription
export async function signup(
  prevState: ActionResponse<{ userId: string }> | null,
  formData: FormData
): Promise<ActionResponse<{ userId: string }>> {
  // Validation des entrées avec Zod
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;

  const validation = SignUpSchema.safeParse({
    email,
    password,
    name,
  });

  if (!validation.success) {
    return {
      success: false,
      error: validation.error.flatten().fieldErrors
        ? Object.values(validation.error.flatten().fieldErrors)[0][0]
        : "Données invalides",
      code: ErrorCodes.VALIDATION_ERROR,
      details: validation.error.format(),
    };
  }

  // Appel au contrôleur
  const result = await AuthController.signup(validation.data);

  if (!result.success) {
    return result;
  }

  // Rediriger vers la page de vérification de l'email
  redirect(`/verification-email?email=${encodeURIComponent(validation.data.email)}`);
}

// Action pour la connexion
export async function signin(
  prevState: ActionResponse<{ userId: string }> | null,
  formData: FormData
): Promise<ActionResponse<{ userId: string }>> {
  // Validation des entrées avec Zod
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const validation = SignInSchema.safeParse({
    email,
    password,
  });

  if (!validation.success) {
    return {
      success: false,
      error: validation.error.flatten().fieldErrors
        ? Object.values(validation.error.flatten().fieldErrors)[0][0]
        : "Données invalides",
      code: ErrorCodes.VALIDATION_ERROR,
      details: validation.error.format(),
    };
  }

  // Appel au contrôleur
  const result = await AuthController.signin(validation.data);

  if (!result.success) {
    return {
      ...result,
      // Rediriger avec l'erreur pour l'afficher dans l'URL
      error: encodeURIComponent(result.error || "Erreur de connexion"),
    };
  }

  // Rediriger vers la page d'accueil (sera redirigé vers /installations)
  redirect("/");
}

// Action pour la déconnexion
export async function signout(): Promise<ActionResponse<void>> {
  // Appel au contrôleur
  const result = await AuthController.signout();

  if (!result.success) {
    return result;
  }

  // Rediriger vers la page d'accueil
  redirect("/");
}

// Action pour la demande de réinitialisation du mot de passe
export async function forgotPassword(
  prevState: ActionResponse<void> | null,
  formData: FormData
): Promise<ActionResponse<void>> {
  // Validation des entrées avec Zod
  const email = formData.get("email") as string;

  const validation = ForgotPasswordSchema.safeParse({
    email,
  });

  if (!validation.success) {
    return {
      success: false,
      error: validation.error.flatten().fieldErrors
        ? Object.values(validation.error.flatten().fieldErrors)[0][0]
        : "Données invalides",
      code: ErrorCodes.VALIDATION_ERROR,
      details: validation.error.format(),
    };
  }

  // Appel au contrôleur
  const result = await AuthController.forgotPassword(validation.data);

  if (!result.success) {
    return result;
  }

  // Rediriger vers la page de confirmation
  redirect(`/forgot-password/confirm?email=${encodeURIComponent(validation.data.email)}`);
}

// Action pour la réinitialisation du mot de passe
export async function resetPassword(
  prevState: ActionResponse<void> | null,
  formData: FormData
): Promise<ActionResponse<void>> {
  // Validation des entrées avec Zod
  const token = formData.get("token") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  const validation = ResetPasswordSchema.safeParse({
    token,
    password,
    confirmPassword,
  });

  if (!validation.success) {
    return {
      success: false,
      error: validation.error.flatten().fieldErrors
        ? Object.values(validation.error.flatten().fieldErrors)[0][0]
        : "Données invalides",
      code: ErrorCodes.VALIDATION_ERROR,
      details: validation.error.format(),
    };
  }

  // Appel au contrôleur
  const result = await AuthController.resetPassword(validation.data);

  if (!result.success) {
    return result;
  }

  // Rediriger vers la page de connexion
  redirect("/connexion?reset=success");
}

// Action pour la vérification de l'email
export async function verifyEmail(
  prevState: ActionResponse<void> | null,
  formData: FormData
): Promise<ActionResponse<void>> {
  // Validation des entrées avec Zod
  const token = formData.get("token") as string;

  const validation = VerifyEmailSchema.safeParse({
    token,
  });

  if (!validation.success) {
    return {
      success: false,
      error: validation.error.flatten().fieldErrors
        ? Object.values(validation.error.flatten().fieldErrors)[0][0]
        : "Données invalides",
      code: ErrorCodes.VALIDATION_ERROR,
      details: validation.error.format(),
    };
  }

  // Appel au contrôleur
  const result = await AuthController.verifyEmail(validation.data);

  if (!result.success) {
    return result;
  }

  // Rediriger vers la page de connexion
  redirect("/connexion?verified=success");
}

// Action pour obtenir la session (utilisée dans les pages protégées)
export async function getSession() {
  const result = await AuthController.getSession();
  return result;
}

// Action pour obtenir les infos utilisateur (utilisée dans les composants)
export async function getSessionUser() {
  const result = await AuthController.getSession();
  return result;
}
