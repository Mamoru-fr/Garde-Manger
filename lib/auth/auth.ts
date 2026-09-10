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

  // Sessions - Configuration adaptative pour PWA/Web
  // ⚠️ NOTE: maxAge et updateAge sont gérés dynamiquement par le middleware pour les PWAs
  //         En PWA: 1 an | En Web: 30 jours (géré par middleware.ts)
  session: {
    cookieName: "better-auth.session_token",
    // ✅ Durée par défaut (30 jours) - sera prolongée à 1 an pour les PWAs via middleware
    maxAge: 86400 * 30, // 30 jours
    updateAge: 86400 * 15, // ✅ 15 jours (rafraîchit le cookie toutes les 2 semaines)
    // ⭐ Configuration adaptée pour PWA et développement local ⭐
    cookieOptions: {
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production", // ✅ HTTPS uniquement en prod
      // Domaine uniquement en production (pour éviter les problèmes en local)
      domain: process.env.NEXT_VERCEL_URL
        ? new URL(process.env.NEXT_VERCEL_URL).hostname
        : undefined,
    },
  },

  // Plugins pour Next.js - Essentiel pour gérer les cookies
  plugins: [nextCookies()],
  
  // Configuration pour Next.js et Better-Auth
  framework: {
    nextjs: {
      basePath: "/api/auth",
    },
  },
  // ⭐ Configuration supplémentaire pour Vercel ⭐
  // URL de base pour les requêtes API (obligatoire en production)
  url: process.env.NEXT_BETTER_AUTH_URL || process.env.NEXT_PUBLIC_VERCEL_URL,
  // ✅ Préfixe conditionnel : __Secure- uniquement en production (HTTPS obligatoire)
  cookiePrefix: process.env.NODE_ENV === "production" ? "__Secure-" : "",
});

// Types pour les sessions
// Ces types seront utilisés dans l'application
// On utilise any pour l'instant car Better-Auth a une API complexe
export type Session = any;
export type User = any;
