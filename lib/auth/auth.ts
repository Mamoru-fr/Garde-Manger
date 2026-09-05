import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/drizzle";
import {
  users,
  sessions,
  accounts,
  verifications,
} from "../db/schema";

// Configuration de Better-Auth
// Note: Better-Auth v1.4.10 a une API différente pour la configuration
// Voir: https://better-auth.com/docs/configuration/database

export const auth = betterAuth({
  // Adaptateur pour Drizzle ORM avec Neon
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: users,
      account: accounts,
      session: sessions,
      verification: verifications,
    },
  }),

  // Authentification par email/mot de passe
  emailAndPassword: {
    enabled: true,
    // Définir un rôle par défaut pour les nouveaux utilisateurs
    defaultRole: "user",
  },

  // Vérification d'email
  emailVerification: {
    sendOnSignUp: true,
    expiresIn: 86400, // 24h
    // Fonction personnalisée pour envoyer l'email de vérification
    sendVerificationEmail: async ({ user, url }: { user: { email: string }; url: string }) => {
      console.log(
        `📧 [Better-Auth] Email de vérification à envoyer à ${user.email} : ${url}`
      );
      // TODO: Intégrer un service d'email (ex: Resend, Nodemailer)
      console.log(
        `⚠️ [Better-Auth] Aucun service d'email configuré. URL de vérification : ${url}`
      );
    },
  },

  // Réinitialisation du mot de passe
  passwordReset: {
    enabled: true,
    expiresIn: 3600, // 1h
    // Fonction personnalisée pour envoyer l'email de réinitialisation
    sendResetPasswordEmail: async ({ user, url }: { user: { email: string }; url: string }) => {
      console.log(
        `📧 [Better-Auth] Email de réinitialisation à envoyer à ${user.email} : ${url}`
      );
      // TODO: Intégrer un service d'email (ex: Resend, Nodemailer)
      console.log(
        `⚠️ [Better-Auth] Aucun service d'email configuré. URL de réinitialisation : ${url}`
      );
    },
  },

  // Sessions
  session: {
    cookieName: "garde-manger-session",
    maxAge: 86400 * 30, // 30 jours
    updateAge: 86400, // 1 jour
  },
});

// Types pour les sessions
// Ces types seront utilisés dans l'application
// On utilise any pour l'instant car Better-Auth a une API complexe
export type Session = any;
export type User = any;
