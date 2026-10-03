// ============================================
// Accès à la session Better-Auth côté serveur
// ============================================
// UNIQUEMENT POUR LES SERVER COMPONENTS, server actions et route handlers.
// Ce fichier ne doit JAMAIS être importé dans un Client Component —
// côté client, c'est lib/auth/auth-client.ts (authClient).
//
// Pas de cache maison ici : le cache officiel de Better-Auth
// (session.cookieCache, cf. lib/auth/auth.ts) fait ce travail correctement.
// L'ancien cache de module empoisonnait le process entier : la première
// requête sans session figeait un `null` pour toutes les suivantes, même
// après un login réussi en base.

import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";

// Vérification pour empêcher l'utilisation côté client
if (typeof window !== "undefined") {
  throw new Error(
    "❌ [Auth] Ce module (lib/utils/auth.ts) ne peut être utilisé que côté serveur. " +
    "Utilise un Server Component, une server action ou une api route — " +
    "ou lib/auth/auth-client.ts côté client."
  );
}

/**
 * Les headers de la requête courante — nécessaires à Better-Auth pour
 * lire les cookies de session (doc : auth.api.getSession({ headers })).
 */
export async function getAuthHeaders() {
  return await headers();
}

/**
 * La session Better-Auth de la requête courante, sans détour.
 * Retourne null si non connecté (la session expire, l'utilisateur se
 * déconnecte… à chaque requête on relit la vérité, plus de valeur figée).
 */
export async function getCurrentSession() {
  try {
    return await auth.api.getSession({ headers: await headers() });
  } catch (error) {
    console.warn("⚠️ [Auth] Erreur lors de la récupération de la session:", error);
    return null;
  }
}
