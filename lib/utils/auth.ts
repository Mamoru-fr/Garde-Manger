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

/**
 * Obtenir la session utilisateur actuelle pour les Server Components
 * Utilise le cache de React (portée : UNE requête HTTP) pour éviter les
 * requêtes SQL en double dans une même requête.
 *
 * ⚠️ Ne JAMAIS remplacer par une variable au niveau du module : elle vivrait
 * pour toute la durée du process serveur et empoisonnerait toutes les
 * requêtes suivantes (premier appel anonyme = session null en cache pour
 * tout le monde, jusqu'au redémarrage du serveur).
 */
export const getCurrentSession = cache(async () => {
  try {
    // On utilise les headers de la requête pour que nextCookies() puisse accéder aux cookies
    const h = await headers();
    return await auth.api.getSession({ headers: h });
  } catch (error) {
    console.warn("⚠️ [Auth] Erreur lors de la récupération de la session:", error);
    return null;
  }
});

// Fonction pour obtenir les headers de la requête actuelle
export async function getAuthHeaders() {
  return await headers();
}
