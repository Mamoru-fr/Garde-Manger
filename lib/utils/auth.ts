// Utilitaire pour obtenir la session Better-Auth
// UNIQUEMENT POUR LES SERVER COMPONENTS
// Ce fichier ne doit JAMAIS être importé dans un Client Component

import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { cache } from "react";

// Vérification pour empêcher l'utilisation côté client
if (typeof window !== "undefined") {
  throw new Error(
    "❌ [Auth] Ce module (lib/utils/auth.ts) ne peut être utilisé que côté serveur. " +
    "Utilisez un Server Component ou déplacez cette logique dans un api route."
  );
}

// Stocker la session en cache pour éviter les requêtes SQL en double
let cachedSession: Promise<any> | null = null;

/**
 * Obtenir la session utilisateur actuelle pour les Server Components
 * Utilise un cache pour éviter les requêtes SQL en double dans une même requête HTTP
 */
export async function getCurrentSession() {
  // Créer la promesse une seule fois
  if (!cachedSession) {
    cachedSession = (async () => {
      try {
        // On utilise les headers de la requête pour que nextCookies() puisse accéder aux cookies
        const h = await headers();
        return await auth.api.getSession({ headers: h });
      } catch (error) {
        console.warn("⚠️ [Auth] Erreur lors de la récupération de la session:", error);
        return null;
      }
    })();
  }
  
  // Attendre le résultat
  try {
    return await cachedSession;
  } catch (error) {
    console.warn("⚠️ [Auth] Erreur lors de la récupération de la session:", error);
    return null;
  }
}

// Fonction pour obtenir les headers de la requête actuelle
export async function getAuthHeaders() {
  return await headers();
}

// Réinitialiser le cache (utile pour les tests ou lorsque la session change)
export function resetSessionCache(): void {
  cachedSession = null;
}
