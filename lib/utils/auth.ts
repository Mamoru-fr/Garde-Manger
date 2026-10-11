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
import { isNetworkError } from "@/lib/utils/network-errors";

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
 *
 * Une erreur n'est PAS une absence de session. L'ancien comportement
 * (tout catch → null) faisait pire que mentir : une micro-coupure
 * réseau vers Neon (ConnectTimeoutError — constaté 3 fois le 04/10)
 * transformait « DB injoignable » en « non connecté », et déconnectait
 * l'utilisateur en silence. Désormais l'erreur remonte : la page
 * montrera une vraie erreur serveur plutôt qu'un mensonge d'état.
 */
export async function getCurrentSession() {
  try {
    return await auth.api.getSession({ headers: await headers() });
  } catch (error) {
    if (isNetworkError(error)) {
      console.error(
        "❌ [Auth] DB injoignable pendant la lecture de session (micro-coupure réseau ?) :",
        error
      );
    } else {
      console.error(
        "❌ [Auth] Erreur lors de la récupération de la session :",
        error
      );
    }
    throw error;
  }
}
