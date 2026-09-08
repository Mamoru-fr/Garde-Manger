import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db/drizzle";
import { getAuthHeaders } from "@/lib/utils/auth";
import {
  SignUpInput,
  SignInInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from "@/lib/validations/auth";
import { ActionResponse, ErrorCodes } from "@/lib/types";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// ================
// SERVICES D'AUTHENTIFICATION
// ================

// Inscription d'un nouvel utilisateur
export async function signupService(input: SignUpInput): Promise<ActionResponse<{ userId: string }>> {
  try {
    // Vérifier si l'email existe déjà
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);

    if (existingUser.length > 0) {
      return {
        success: false,
        error: "Un utilisateur avec cet email existe déjà",
        code: ErrorCodes.EMAIL_ALREADY_EXISTS,
      };
    }

    // Créer l'utilisateur via Better-Auth - Il faut passer les headers pour que nextCookies() fonctionne
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
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.message || "Erreur lors de l'inscription",
        code: ErrorCodes.INTERNAL_ERROR,
        details: errorData,
      };
    }

    // Récupérer l'utilisateur créé
    const user = await response.json();

    return {
      success: true,
      data: { userId: user.id },
    };
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
  console.log("🟠 [SERVICE] Début de signinService()");
  console.log("🟠 [SERVICE] Input:", { email: input.email, password: "***" });
  
  try {
    console.log("🟠 [SERVICE] Appel de auth.api.signInEmail()");
    // ✅ 1. Appel à Better-Auth pour la connexion
    const response = await auth.api.signInEmail({
      body: {
        email: input.email,
        password: input.password,
      },
      headers: await getAuthHeaders(),
      asResponse: true,
    });
    console.log("🟠 [SERVICE] Réponse de signInEmail:", {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.log("❌ [SERVICE] Erreur de Better-Auth:", errorData);
      return {
        success: false,
        error: errorData.message || "Email ou mot de passe incorrect",
        code: ErrorCodes.UNAUTHORIZED,
        details: errorData,
      };
    }

    console.log("🟠 [SERVICE] Connexion réussie, vérification de la session...");
    
    // ✅ 2. Vérifier que Better-Auth a bien créé la session
    const session = await auth.api.getSession({ headers: await getAuthHeaders() });
    
    if (!session?.user) {
      console.log("❌ [SERVICE] Session non créée par Better-Auth");
      return {
        success: false,
        error: "Session non créée",
        code: ErrorCodes.INTERNAL_ERROR,
      };
    }

    console.log("🟠 [SERVICE] Session vérifiée, utilisateur trouvé:", { id: session.user.id, email: session.user.email });
    
    // ✅ 3. Récupérer l'userId depuis la session Better-Auth
    // (plus besoin de requête DB supplémentaire)
    return {
      success: true,
      data: { userId: session.user.id },
    };
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
    // Il faut passer les headers pour que nextCookies() fonctionne
    await auth.api.signOut({ headers: await getAuthHeaders() });
    return {
      success: true,
    };
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
    await auth.api.requestPasswordReset({ body: { email: input.email } });

    return {
      success: true,
    };
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

    return {
      success: true,
    };
  } catch (error) {
    console.error("[AuthService] Erreur lors de la réinitialisation du mot de passe:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de la réinitialisation du mot de passe",
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

    return {
      success: true,
    };
  } catch (error) {
    console.error("[AuthService] Erreur lors de la vérification de l'email:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de la vérification de l'email",
      code: ErrorCodes.INTERNAL_ERROR,
      details: error,
    };
  }
}

// Renvoyer un email de vérification
export async function resendVerificationEmailService(email: string): Promise<ActionResponse<void>> {
  try {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user.length) {
      return {
        success: false,
        error: "Utilisateur non trouvé",
        code: ErrorCodes.USER_NOT_FOUND,
      };
    }

    // Better-Auth ne fournit pas de méthode directe pour renvoyer l'email,
    // mais on peut utiliser le plugin sendVerificationEmail via une action personnalisée
    // Ici, on simule l'envoi (à adapter selon Better-Auth)
    console.log(`[AuthService] Renvoyer un email de vérification à ${email}`);

    return {
      success: true,
    };
  } catch (error) {
    console.error("[AuthService] Erreur lors de l'envoi de l'email de vérification:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de l'envoi de l'email de vérification",
      code: ErrorCodes.INTERNAL_ERROR,
      details: error,
    };
  }
}

// Obtenir la session utilisateur
export async function getSessionService() {
  try {
    // Il faut passer les headers pour que nextCookies() fonctionne
    const session = await auth.api.getSession({ headers: await getAuthHeaders() });
    return {
      success: true,
      session,
    };
  } catch (error) {
    console.error("[AuthService] Erreur lors de la récupération de la session:", error);
    return {
      success: false,
      error: "Erreur lors de la récupération de la session",
      code: ErrorCodes.INTERNAL_ERROR,
      details: error,
    };
  }
}
