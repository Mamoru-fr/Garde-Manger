import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

// Récupération de l'URL de la base de données (Neon)
const databaseUrl = process.env.DATABASE_URL!;

// Créer une connexion Neon HTTP (compatible avec Server Actions)
// Configuration simplifiée pour Next.js
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
export function getNeonClient() {
  return neon(databaseUrl);
}
