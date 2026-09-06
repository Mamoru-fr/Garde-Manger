import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "../db/drizzle";
import {
  user,
  session,
  account,
  verification,
} from "../db/schema";
import {
  sendVerificationEmail,
  sendResetPasswordEmail,
} from "../utils/email";

// Configuration de Better-Auth
// Note: Better-Auth v1.4.10 a une API différente pour la configuration
// Voir: https://better-auth.com/docs/configuration/database

export const auth = betterAuth({
  // Adaptateur pour Drizzle ORM avec Neon
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: user,
      account: account,
      session: session,
      verification: verification,
    },
  }),

  // Authentification par email/mot de passe
  emailAndPassword: {
    enabled: true,
    // Définir un rôle par défaut pour les nouveaux utilisateurs
    defaultRole: "user",
    // Rediriger vers /installations après connexion réussie
    signInCallbackUrl: "/installations",
    signUpCallbackUrl: "/installations",
  },

  // Vérification d'email
  emailVerification: {
    sendOnSignUp: true,
    expiresIn: 86400, // 24h
    // Fonction personnalisée pour envoyer l'email de vérification
    sendVerificationEmail: async ({ user, url }: { user: { email: string; name?: string }; url: string }) => {
      console.log(
        `📧 [Better-Auth] Envoi de l'email de vérification à ${user.email}`
      );
      await sendVerificationEmail({ user, url });
    },
  },

  // Réinitialisation du mot de passe
  passwordReset: {
    enabled: true,
    expiresIn: 3600, // 1h
    // Fonction personnalisée pour envoyer l'email de réinitialisation
    sendResetPasswordEmail: async ({ user, url }: { user: { email: string; name?: string }; url: string }) => {
      console.log(
        `📧 [Better-Auth] Envoi de l'email de réinitialisation à ${user.email}`
      );
      await sendResetPasswordEmail({ user, url });
    },
  },

  // Sessions
  session: {
    cookieName: "better-auth.session_token", // Utiliser le nom par défaut de Better-Auth
    maxAge: 86400 * 30, // 30 jours
    updateAge: 86400, // 1 jour
    cookieOptions: {
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      domain: process.env.NODE_ENV === "production" ? ".garde-manger.app" : undefined,
    },
  },

  // Plugins pour Next.js - Essentiel pour gérer les cookies
  plugins: [nextCookies()],
  
  // Configuration pour Next.js
  framework: {
    nextjs: {
      // Utiliser l'URL dynamique plutôt que statique
      basePath: process.env.BASE_PATH,
    },
  },
});

// Types pour les sessions
// Ces types seront utilisés dans l'application
// On utilise any pour l'instant car Better-Auth a une API complexe
export type Session = any;
export type User = any;
