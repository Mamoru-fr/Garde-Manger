import { auth } from "@/lib/auth/auth";
import { getAuthHeaders } from "@/lib/utils/auth";
import {
  SignUpInput,
  SignInInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from "@/lib/validations/auth";
import { ActionResponse, ErrorCodes } from "@/lib/types";
import { getAuthErrorMessage } from "@/lib/utils/auth-errors";

// ============================================
// SERVICES D'AUTHENTIFICATION (couche Service de la chaîne ACS)
// ============================================
// Rôle du service : faire l'appel à Better-Auth — c'est lui qui s'occupe
// de TOUT ce qui est lié à la connexion (création de session, cookies via
// le plugin nextCookies, vérification email, reset). Le service traduit
// juste les erreurs de la lib en messages FR (lib/utils/auth-errors.ts).
//
// Corrections apportées à l'ancienne version : suppression des logs de
// debug emoji ; suppression de la re-vérification de session après
// signInEmail (Better-Auth la renvoie déjà — la brève vérification vit
// dans l'action) ; suppression du SELECT d'existence d'utilisateur avant
// l'inscription (Better-Auth le fait et renvoie une erreur qu'on traduit) ;
// redirectTo passé à requestPasswordReset pour que le lien de l'email
// pointe vers /mot-de-passe/reset.

// Erreur Better-Auth renvoyée par ses endpoints
interface BetterAuthError {
  code?: string;
  message?: string;
}

// Inscription d'un nouvel utilisateur
export async function signupService(input: SignUpInput): Promise<ActionResponse<{ userId: string }>> {
  try {
    const response = await auth.api.signUpEmail({
      body: {
        email: input.email,
        password: input.password,
        name: input.name,
      },
      headers: await getAuthHeaders(),
      asResponse: true,
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => null)) as BetterAuthError | null;
      return {
        success: false,
        error: getAuthErrorMessage({
          status: response.status,
          code: errorData?.code,
          message: errorData?.message,
        }),
        code: ErrorCodes.INTERNAL_ERROR,
      };
    }

    // signUpEmail renvoie { user, session } : Better-Auth a déjà tout fait
    const data = (await response.json()) as { user: { id: string } };
    return { success: true, data: { userId: data.user.id } };
  } catch (error) {
    console.error("[AuthService] Erreur lors de l'inscription:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de l'inscription",
      code: ErrorCodes.INTERNAL_ERROR,
      details: error,
    };
  }
}

// Connexion d'un utilisateur
export async function signinService(input: SignInInput): Promise<ActionResponse<{ userId: string }>> {
  try {
    const response = await auth.api.signInEmail({
      body: {
        email: input.email,
        password: input.password,
      },
      headers: await getAuthHeaders(),
      asResponse: true,
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => null)) as BetterAuthError | null;
      return {
        success: false,
        error: getAuthErrorMessage({
          status: response.status,
          code: errorData?.code,
          message: errorData?.message,
        }),
        code: ErrorCodes.UNAUTHORIZED,
      };
    }

    // signInEmail renvoie { user, session } : la session est déjà créée
    // et le cookie déjà posé par Better-Auth (plugin nextCookies)
    const data = (await response.json()) as { user: { id: string } };
    return { success: true, data: { userId: data.user.id } };
  } catch (error) {
    console.error("[AuthService] Erreur lors de la connexion:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de la connexion",
      code: ErrorCodes.INTERNAL_ERROR,
      details: error instanceof Error ? error.message : error,
    };
  }
}

// Déconnexion d'un utilisateur
export async function signoutService(): Promise<ActionResponse<void>> {
  try {
    await auth.api.signOut({ headers: await getAuthHeaders() });
    return { success: true };
  } catch (error) {
    console.error("[AuthService] Erreur lors de la déconnexion:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de la déconnexion",
      code: ErrorCodes.INTERNAL_ERROR,
      details: error,
    };
  }
}

// Demande de réinitialisation du mot de passe
export async function forgotPasswordService(input: ForgotPasswordInput): Promise<ActionResponse<void>> {
  try {
    // redirectTo : c'est là que Better-Auth envoie l'utilisateur quand il
    // clique sur le lien de l'email — la page /mot-de-passe/reset lit le
    // token passé dans l'URL
    await auth.api.requestPasswordReset({
      body: { email: input.email, redirectTo: "/mot-de-passe/reset" },
      headers: await getAuthHeaders(),
    });

    return { success: true };
  } catch (error) {
    console.error("[AuthService] Erreur lors de la demande de réinitialisation:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de la demande de réinitialisation",
      code: ErrorCodes.INTERNAL_ERROR,
      details: error,
    };
  }
}

// Réinitialisation du mot de passe
export async function resetPasswordService(input: ResetPasswordInput): Promise<ActionResponse<void>> {
  try {
    await auth.api.resetPassword({
      body: {
        token: input.token,
        newPassword: input.password,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("[AuthService] Erreur lors de la réinitialisation du mot de passe:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de la réinitialisation",
      code: ErrorCodes.INTERNAL_ERROR,
      details: error,
    };
  }
}

// Vérification de l'email
export async function verifyEmailService(input: VerifyEmailInput): Promise<ActionResponse<void>> {
  try {
    await auth.api.verifyEmail({
      query: {
        token: input.token,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("[AuthService] Erreur lors de la vérification de l'email:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de la vérification",
      code: ErrorCodes.INTERNAL_ERROR,
      details: error,
    };
  }
}

// Renvoyer un email de vérification
export async function resendVerificationEmailService(input: {
  email: string;
}): Promise<ActionResponse<void>> {
  try {
    await auth.api.sendVerificationEmail({
      body: { email: input.email, callbackURL: "/connexion" },
      headers: await getAuthHeaders(),
    });

    return { success: true };
  } catch (error) {
    console.error("[AuthService] Erreur lors de l'envoi de l'email de vérification:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de l'envoi de l'email",
      code: ErrorCodes.INTERNAL_ERROR,
      details: error,
    };
  }
}
