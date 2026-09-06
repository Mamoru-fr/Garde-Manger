import {
  SignUpInput,
  SignInInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from "@/lib/validations/auth";
import {
  signupService,
  signinService,
  signoutService,
  forgotPasswordService,
  resetPasswordService,
  verifyEmailService,
  resendVerificationEmailService,
  getSessionService,
} from "@/lib/services/AuthService";
import { ActionResponse, ErrorCodes } from "@/lib/types";

// ================
// CONTRÔLEUR D'AUTHENTIFICATION
// ================

// Contrôleur pour l'inscription
export class AuthController {
  static async signup(data: SignUpInput): Promise<ActionResponse<{ userId: string }>> {
    // Validation supplémentaire (défense en profondeur)
    if (!data.email || data.email.length > 255) {
      return {
        success: false,
        error: "Email invalide",
        code: ErrorCodes.VALIDATION_ERROR,
      };
    }

    if (!data.password || data.password.length < 8) {
      return {
        success: false,
        error: "Le mot de passe doit contenir au moins 8 caractères",
        code: ErrorCodes.VALIDATION_ERROR,
      };
    }

    // Appel au service
    return signupService(data);
  }

  // Contrôleur pour la connexion
  static async signin(data: SignInInput): Promise<ActionResponse<{ userId: string }>> {
    console.log("🟡 [CONTROLLER] Début de AuthController.signin()");
    console.log("🟡 [CONTROLLER] Data:", { email: data.email, password: "***" });
    
    // Validation supplémentaire
    if (!data.email || data.email.length > 255) {
      console.log("❌ [CONTROLLER] Email invalide");
      return {
        success: false,
        error: "Email invalide",
        code: ErrorCodes.VALIDATION_ERROR,
      };
    }

    if (!data.password) {
      console.log("❌ [CONTROLLER] Mot de passe manque");
      return {
        success: false,
        error: "Mot de passe requis",
        code: ErrorCodes.VALIDATION_ERROR,
      };
    }

    console.log("🟡 [CONTROLLER] Validation OK, appel de signinService()");
    // Appel au service
    const result = await signinService(data);
    console.log("🟡 [CONTROLLER] Résultat de signinService():", result);
    return result;
  }

  // Contrôleur pour la déconnexion
  static async signout(): Promise<ActionResponse<void>> {
    return signoutService();
  }

  // Contrôleur pour la demande de réinitialisation du mot de passe
  static async forgotPassword(data: ForgotPasswordInput): Promise<ActionResponse<void>> {
    // Validation supplémentaire
    if (!data.email || data.email.length > 255) {
      return {
        success: false,
        error: "Email invalide",
        code: ErrorCodes.VALIDATION_ERROR,
      };
    }

    return forgotPasswordService(data);
  }

  // Contrôleur pour la réinitialisation du mot de passe
  static async resetPassword(data: ResetPasswordInput): Promise<ActionResponse<void>> {
    // Validation supplémentaire
    if (!data.token || data.token.length < 1) {
      return {
        success: false,
        error: "Token invalide",
        code: ErrorCodes.VALIDATION_ERROR,
      };
    }

    if (!data.password || data.password.length < 8) {
      return {
        success: false,
        error: "Le mot de passe doit contenir au moins 8 caractères",
        code: ErrorCodes.VALIDATION_ERROR,
      };
    }

    return resetPasswordService(data);
  }

  // Contrôleur pour la vérification de l'email
  static async verifyEmail(data: VerifyEmailInput): Promise<ActionResponse<void>> {
    // Validation supplémentaire
    if (!data.token || data.token.length < 1) {
      return {
        success: false,
        error: "Token invalide",
        code: ErrorCodes.VALIDATION_ERROR,
      };
    }

    return verifyEmailService(data);
  }

  // Contrôleur pour renvoyer un email de vérification
  static async resendVerificationEmail(email: string): Promise<ActionResponse<void>> {
    // Validation supplémentaire
    if (!email || email.length > 255) {
      return {
        success: false,
        error: "Email invalide",
        code: ErrorCodes.VALIDATION_ERROR,
      };
    }

    return resendVerificationEmailService(email);
  }

  // Contrôleur pour obtenir la session
  static async getSession() {
    return getSessionService();
  }
}
