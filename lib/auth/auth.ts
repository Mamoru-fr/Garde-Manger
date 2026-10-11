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
    // Note : le rôle par défaut "user" est posé par la base
    // (lib/db/schema.ts — userRoleEnum .default("user")), pas par Better-Auth.
    // Les redirections post-login sont gérées par le callbackURL passé au
    // authClient (lib/auth/auth-client.ts) — il n'existe pas d'option serveur
    // signInCallbackUrl/signUpCallbackUrl dans Better-Auth.
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
    // Cache officiel Better-Auth (doc : optimizing for performance) : la session
    // voyage dans un cookie signé pendant 5 min → getSession ne tape plus en base
    // à chaque requête. C'est ce cache natif qui remplace l'ancien cache de module
    // de lib/utils/auth.ts (bug : valeur figée pour toute la vie du process).
    cookieCache: {
      enabled: true,
      maxAge: 300, // 5 minutes
    },
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

  // Note : le chemin /api/auth n'est PAS configurable ici — Better-Auth n'a pas
  // d'option "framework". C'est le handler monté dans app/api/auth/[...all]/route.ts
  // qui fait foi (toNextJsHandler), et le client (createAuthClient) le connaît
  // par défaut. L'ancien bloc `framework.nextjs.basePath` était ignoré par la lib.
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
