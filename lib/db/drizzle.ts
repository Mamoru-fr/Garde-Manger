import { drizzle } from "drizzle-orm/neon-http";
import { neon, neonConfig } from "@neondatabase/serverless";
import * as schema from "./schema";
import { createRetryFetch } from "./neonFetch";

// Récupération de l'URL de la base de données (Neon)
const databaseUrl = process.env.DATABASE_URL!;

// La fenêtre de patience vers Neon, réglable sans toucher au code :
// NEON_FETCH_ATTEMPTS (nombre total de tentatives, défaut 3) et
// NEON_FETCH_BACKOFF_MS (attente entre tentatives, défaut 750).
// Fenêtre par défaut ≈ 31 s (3 × 10 s de timeout de connexion
// undici + 2 backoffs de 750 ms) au lieu de 10 s sèches : une
// micro-coupure wifi — constatée 3 fois en une heure le 04/10 —
// se traverse au lieu de couper la page (option B d'Alexis).
const neonFetchOptions = {
  maxAttempts:
    Number(process.env.NEON_FETCH_ATTEMPTS) > 0
      ? Number(process.env.NEON_FETCH_ATTEMPTS)
      : 3,
  backoffMs:
    Number(process.env.NEON_FETCH_BACKOFF_MS) > 0
      ? Number(process.env.NEON_FETCH_BACKOFF_MS)
      : 750,
};

// ⚠️ PIÈGE GRAVÉ (coûté une journée de « retry qui ne retry pas ») :
// l'option `fetch` de neon() N'EXISTE PLUS depuis
// @neondatabase/serverless 1.0 — elle date de la v0.x, et une option
// inconnue s'ignore EN SILENCE à l'exécution (le dev server ne
// type-checke pas : seul tsc l'aurait signalée). Le fetch
// personnalisé passe désormais par la config GLOBALE du driver :
// neonConfig.fetchFunction, lue à CHAQUE requête HTTP
// (index.js du driver : `await (fetchFunction ?? fetch)(…)`).
neonConfig.fetchFunction = createRetryFetch(fetch, neonFetchOptions);

// Créer une connexion Neon HTTP (compatible avec Server Actions).
// Le fetch résilient vient de neonConfig.fetchFunction ci-dessus :
// échecs réseau et 5xx rejoués avec backoff court (lib/db/neonFetch,
// testé — 15 cas TDD).
const sql = neon(databaseUrl);

// Initialisation de Drizzle ORM avec Neon HTTP
// Ce driver est optimisé pour les environnements serverless comme Next.js
export const db = drizzle(sql, {
  schema,
  logger: process.env.NODE_ENV === "development", // Affiche les requêtes SQL en mode dev
});

// Export du schema pour les migrations
export * from "./schema";

// Fonction utilitaire pour les scripts (ex: migrations)
// — même fetch résilient, hérité de la config globale.
export function getNeonClient() {
  return neon(databaseUrl);
}
