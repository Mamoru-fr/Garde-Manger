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
} from "@/lib/services/AuthService";
import { ActionResponse, ErrorCodes } from "@/lib/types";

// ============================================
// CONTRÔLEUR D'AUTHENTIFICATION (couche Contrôleur de la chaîne ACS)
// ============================================
// Rôle du contrôleur : la VÉRIFICATION POUSSÉE. Rien n'est transmis au
// service (donc à Better-Auth) qui ne corresponde pas à ce qui est
// attendu : formats, longueurs, normalisation. C'est la défense en
// profondeur entre le monde extérieur et la lib de connexion.

/** Un email valide au format minimal : local@domaine.tld */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_MAX_LENGTH = 255;
const PASSWORD_MIN_LENGTH = 8; // minimum Better-Auth
const PASSWORD_MAX_LENGTH = 128; // maximum par défaut Better-Auth
const TOKEN_MAX_LENGTH = 255;

/** Vérification poussée d'un email : présent, normalisé, longueur, format */
function checkEmail(rawEmail: string): ActionResponse<never> | { email: string } {
  const email = rawEmail.trim().toLowerCase();

  if (!email || email.length > EMAIL_MAX_LENGTH) {
    return { success: false, error: "Email invalide", code: ErrorCodes.VALIDATION_ERROR };
  }
  if (!EMAIL_REGEX.test(email)) {
    return { success: false, error: "Adresse email invalide", code: ErrorCodes.VALIDATION_ERROR };
  }

  return { email };
}

/** Vérification poussée d'un mot de passe : présent, bornes Better-Auth */
function checkPassword(password: string): ActionResponse<never> | null {
  if (!password) {
    return { success: false, error: "Mot de passe requis", code: ErrorCodes.VALIDATION_ERROR };
  }
  if (
    password.length < PASSWORD_MIN_LENGTH ||
    password.length > PASSWORD_MAX_LENGTH
  ) {
    return {
      success: false,
      error: `Le mot de passe doit contenir entre ${PASSWORD_MIN_LENGTH} et ${PASSWORD_MAX_LENGTH} caractères`,
      code: ErrorCodes.VALIDATION_ERROR,
    };
  }
  return null;
}

/** Vérification poussée d'un token : présent et borné */
function checkToken(token: string): ActionResponse<never> | null {
  if (!token || token.length < 1 || token.length > TOKEN_MAX_LENGTH) {
    return { success: false, error: "Token invalide", code: ErrorCodes.VALIDATION_ERROR };
  }
  return null;
}

export class AuthController {
  // Contrôleur pour l'inscription
  static async signup(data: SignUpInput): Promise<ActionResponse<{ userId: string }>> {
    const emailCheck = checkEmail(data.email);
    if (!("email" in emailCheck)) {
      return emailCheck;
    }

    const passwordCheck = checkPassword(data.password);
    if (passwordCheck) {
      return passwordCheck;
    }

    const name = data.name.trim();
    if (!name || name.length > 100) {
      return {
        success: false,
        error: "Le nom est requis (100 caractères maximum)",
        code: ErrorCodes.VALIDATION_ERROR,
      };
    }

    // Appel au service (Better-Auth fait l'inscription et la session)
    return signupService({
      email: emailCheck.email,
      name,
      password: data.password,
    });
  }

  // Contrôleur pour la connexion
  static async signin(data: SignInInput): Promise<ActionResponse<{ userId: string }>> {
    console.log("🟡 [CONTROLLER] Début de AuthController.signin()");
    console.log("🟡 [CONTROLLER] Data:", { email: data.email, password: "***" });

    const emailCheck = checkEmail(data.email);
    if (!("email" in emailCheck)) {
      console.log("❌ [CONTROLLER] Email invalide");
      return emailCheck;
    }

    const passwordCheck = checkPassword(data.password);
    if (passwordCheck) {
      console.log("❌ [CONTROLLER] Mot de passe invalide");
      return passwordCheck;
    }

    console.log("🟡 [CONTROLLER] Validation OK, appel de signinService()");
    const result = await signinService({ email: emailCheck.email, password: data.password });
    console.log("🟡 [CONTROLLER] Résultat de signinService():", result);
    return result;
  }

  // Contrôleur pour la déconnexion
  static async signout(): Promise<ActionResponse<void>> {
    return signoutService();
  }

  // Contrôleur pour la demande de réinitialisation du mot de passe
  static async forgotPassword(data: ForgotPasswordInput): Promise<ActionResponse<void>> {
    const emailCheck = checkEmail(data.email);
    if (!("email" in emailCheck)) {
      return emailCheck;
    }

    return forgotPasswordService({ email: emailCheck.email });
  }

  // Contrôleur pour la réinitialisation du mot de passe
  static async resetPassword(data: ResetPasswordInput): Promise<ActionResponse<void>> {
    const tokenCheck = checkToken(data.token);
    if (tokenCheck) {
      return tokenCheck;
    }

    const passwordCheck = checkPassword(data.password);
    if (passwordCheck) {
      return passwordCheck;
    }

    return resetPasswordService({
      token: data.token.trim(),
      password: data.password,
      confirmPassword: data.confirmPassword,
    });
  }

  // Contrôleur pour la vérification de l'email
  static async verifyEmail(data: VerifyEmailInput): Promise<ActionResponse<void>> {
    const tokenCheck = checkToken(data.token);
    if (tokenCheck) {
      return tokenCheck;
    }

    return verifyEmailService({ token: data.token.trim() });
  }

  // Contrôleur pour renvoyer un email de vérification
  static async resendVerificationEmail(email: string): Promise<ActionResponse<void>> {
    const emailCheck = checkEmail(email);
    if (!("email" in emailCheck)) {
      return emailCheck;
    }

    return resendVerificationEmailService({ email: emailCheck.email });
  }
}
