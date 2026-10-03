"use server";

import { redirect } from "next/navigation";
import type { ZodError } from "zod";
import {
  SignUpSchema,
  SignInSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  VerifyEmailSchema,
} from "@/lib/validations/auth";
import { AuthController } from "@/lib/controllers/AuthController";
import { ActionResponse, ErrorCodes } from "@/lib/types";
import { auth } from "@/lib/auth/auth";
import { getAuthHeaders } from "@/lib/utils/auth";

// ============================================
// ACTIONS D'AUTHENTIFICATION (couche Action de la chaîne ACS)
// ============================================
// Rôle de l'action : recevoir l'appel du formulaire et faire la BRÈVE
// vérification — validation Zod des entrées. La vérification poussée vit
// dans le contrôleur (AuthController), l'appel à Better-Auth dans le
// service (AuthService). C'est Better-Auth qui fait tout le travail de
// connexion (session, cookies via le plugin nextCookies) — la chaîne
// sert à le protéger des mauvaises entrées et des sabotages.
//
// Corrections apportées à l'ancienne version : suppression des logs de
// debug emoji, suppression du encodeURIComponent qui déformait les
// messages d'erreur, forgotPassword ne redirige plus vers une page
// inexistante (le formulaire affiche le succès), nouveau
// resendVerificationEmail réellement branché (ancien TODO factice).

/** Premier message d'erreur de validation Zod (champ par champ) */
function firstValidationError(error: ZodError): string {
  const fieldErrors = error.flatten().fieldErrors;
  return fieldErrors && Object.keys(fieldErrors).length > 0
    ? (Object.values(fieldErrors)[0] as string[])[0]
    : "Données invalides";
}

// Action pour l'inscription
export async function signup(
  prevState: ActionResponse<{ userId: string }> | null,
  formData: FormData
): Promise<ActionResponse<{ userId: string }>> {
  // Brève vérification : validation Zod des entrées
  const validation = SignUpSchema.safeParse({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    name: formData.get("name") as string,
  });

  if (!validation.success) {
    return {
      success: false,
      error: firstValidationError(validation.error),
      code: ErrorCodes.VALIDATION_ERROR,
      details: validation.error.format(),
    };
  }

  // Vérification poussée (contrôleur) puis appel Better-Auth (service)
  const result = await AuthController.signup(validation.data);
  if (!result.success) {
    return result;
  }

  // Brève vérification finale : la session est bien là
  const session = await auth.api.getSession({ headers: await getAuthHeaders() });
  if (!session?.user) {
    return { success: false, error: "Session non créée", code: ErrorCodes.INTERNAL_ERROR };
  }

  redirect("/installations");
}

// Action pour la connexion
export async function signin(
  prevState: ActionResponse<{ userId: string }> | null,
  formData: FormData
): Promise<ActionResponse<{ userId: string }>> {
  // Brève vérification : validation Zod des entrées
  const validation = SignInSchema.safeParse({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  });

  if (!validation.success) {
    return {
      success: false,
      error: firstValidationError(validation.error),
      code: ErrorCodes.VALIDATION_ERROR,
      details: validation.error.format(),
    };
  }

  // Vérification poussée (contrôleur) puis appel Better-Auth (service)
  const result = await AuthController.signin(validation.data);
  if (!result.success) {
    return result;
  }

  // Brève vérification finale : la session est bien là
  const session = await auth.api.getSession({ headers: await getAuthHeaders() });
  if (!session?.user) {
    return { success: false, error: "Session non créée", code: ErrorCodes.INTERNAL_ERROR };
  }

  redirect("/installations");
}

// Action pour la déconnexion
export async function signout(): Promise<ActionResponse<void>> {
  const result = await AuthController.signout();
  if (!result.success) {
    return result;
  }

  redirect("/");
}

// Action pour la demande de réinitialisation du mot de passe
export async function forgotPassword(
  prevState: ActionResponse<void> | null,
  formData: FormData
): Promise<ActionResponse<void>> {
  // Brève vérification : validation Zod des entrées
  const validation = ForgotPasswordSchema.safeParse({
    email: formData.get("email") as string,
  });

  if (!validation.success) {
    return {
      success: false,
      error: firstValidationError(validation.error),
      code: ErrorCodes.VALIDATION_ERROR,
      details: validation.error.format(),
    };
  }

  // Vérification poussée (contrôleur) puis appel Better-Auth (service).
  // Pas de redirect : le formulaire affiche l'écran de succès (l'ancienne
  // version redirigeait vers /forgot-password/confirm, une page inexistante).
  return AuthController.forgotPassword(validation.data);
}

// Action pour la réinitialisation du mot de passe
export async function resetPassword(
  prevState: ActionResponse<void> | null,
  formData: FormData
): Promise<ActionResponse<void>> {
  // Brève vérification : validation Zod des entrées
  const validation = ResetPasswordSchema.safeParse({
    token: formData.get("token") as string,
    password: formData.get("password") as string,
    confirmPassword: formData.get("confirmPassword") as string,
  });

  if (!validation.success) {
    return {
      success: false,
      error: firstValidationError(validation.error),
      code: ErrorCodes.VALIDATION_ERROR,
      details: validation.error.format(),
    };
  }

  // Vérification poussée (contrôleur) puis appel Better-Auth (service)
  const result = await AuthController.resetPassword(validation.data);
  if (!result.success) {
    return result;
  }

  redirect("/connexion?reset=success");
}

// Action pour la vérification de l'email
export async function verifyEmail(
  prevState: ActionResponse<void> | null,
  formData: FormData
): Promise<ActionResponse<void>> {
  // Brève vérification : validation Zod des entrées
  const validation = VerifyEmailSchema.safeParse({
    token: formData.get("token") as string,
  });

  if (!validation.success) {
    return {
      success: false,
      error: firstValidationError(validation.error),
      code: ErrorCodes.VALIDATION_ERROR,
      details: validation.error.format(),
    };
  }

  // Vérification poussée (contrôleur) puis appel Better-Auth (service)
  const result = await AuthController.verifyEmail(validation.data);
  if (!result.success) {
    return result;
  }

  redirect("/connexion?verified=success");
}

// Action pour renvoyer l'email de vérification
export async function resendVerificationEmail(
  prevState: ActionResponse<void> | null,
  formData: FormData
): Promise<ActionResponse<void>> {
  // Brève vérification : validation Zod des entrées
  const validation = ForgotPasswordSchema.safeParse({
    email: formData.get("email") as string,
  });

  if (!validation.success) {
    return {
      success: false,
      error: firstValidationError(validation.error),
      code: ErrorCodes.VALIDATION_ERROR,
      details: validation.error.format(),
    };
  }

  // Vérification poussée (contrôleur) puis appel Better-Auth (service)
  return AuthController.resendVerificationEmail(validation.data.email);
}
