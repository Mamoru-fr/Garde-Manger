// ============================================
// neonFetch — le fetch résilient du client Neon
// (micro-round « option B » du 04/10 — Alexis :
// retry + fenêtre de temps élargie)
//
// Le driver Neon HTTP envoie CHAQUE requête SQL par un fetch
// HTTPS. En local, une micro-coupure wifi coûtait 10 s de gel
// (timeout de connexion undici) puis une erreur — et comme
// chaque render commence par la requête de session, c'est
// toute la page qui plantait sur un blip de 5 secondes.
//
// Ce wrapper ajoute de la patience au lieu d'exiger de la
// stabilité : les échecs de connectivité (et les 5xx du
// serveur) sont rejoués avec un backoff court. Fenêtre
// par défaut : 3 tentatives × 10 s + 2 × 750 ms ≈ 31 s
// au lieu de 10 s — le temps qu'une box se réveille.
//
// Pur : le fetch réel est injecté, le sleep aussi — testable
// en isolation, aucun import DB (le piège du client Neon au
// chargement du module ne s'applique pas ici).
// ============================================

import { isNetworkError } from "@/lib/utils/network-errors";

// La signature du fetch global — celles de Node comme du driver Neon.
export type FetchLike = typeof fetch;

export interface RetryFetchOptions {
  // Nombre TOTAL de tentatives (1 = aucun retry — fenêtre de 10 s).
  maxAttempts?: number;
  // Attente entre les tentatives, en millisecondes.
  backoffMs?: number;
  // Le sleep, injectable pour les tests (jamais de vraie attente en vitest).
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Une erreur mérite-t-elle une relance ? Seulement si elle est
 * réseau (isNetworkError remonte la chaîne des causes) — une
 * erreur de programmation rejouée trois fois reste une erreur
 * de programmation, et on ne paie pas 30 s pour la découvrir.
 */
export function isRetryableError(error: unknown): boolean {
  return isNetworkError(error);
}

/**
 * Fabrique un fetch avec retry pour le client Neon HTTP
 * (`neon(url, { fetch })`). Un échec réseau ou un 5xx se rejoue ;
 * un 4xx (erreur métier) et une erreur de code passent direct.
 * Sur un 5xx épuisé, la DERNIÈRE réponse est rendue telle quelle :
 * c'est le driver Neon qui la traduira en erreur métier — le
 * wrapper ne se prend pas pour la couche service.
 */
export function createRetryFetch(
  fetchImpl: FetchLike = fetch,
  options: RetryFetchOptions = {}
): FetchLike {
  const maxAttempts = options.maxAttempts ?? 3;
  const backoffMs = options.backoffMs ?? 750;
  const sleep = options.sleep ?? defaultSleep;

  return async function retryFetch(input, init) {
    // Un Request ne se rejoue pas : son corps se consomme.
    // On clone AVANT la première tentative pour garder une
    // copie vierge à rejouer — sans ça, la relance partirait
    // avec un body vide et le driver échouerait autrement.
    let pristineRequest: Request | null = null;
    if (typeof Request !== "undefined" && input instanceof Request && input.body) {
      try {
        pristineRequest = input.clone();
      } catch {
        // Clone impossible (body déjà consommé) : pas de retry du body,
        // le premier essai reste la vérité.
        pristineRequest = null;
      }
    }

    let lastResponse: Response | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      // Toute tentative après la première rejoue la copie vierge.
      const requestInput =
        pristineRequest && attempt > 1 ? pristineRequest.clone() : input;

      try {
        const response = await fetchImpl(requestInput, init);

        if (response.status >= 500 && attempt < maxAttempts) {
          lastResponse = response;
          await sleep(backoffMs);
          continue;
        }
        return response;
      } catch (error) {
        if (!isRetryableError(error) || attempt >= maxAttempts) {
          throw error;
        }
        await sleep(backoffMs);
      }
    }

    // Tentatives épuisées sur des 5xx : la dernière réponse, telle
    // quelle — le driver Neon la traduit (NeonDbError côté app).
    if (lastResponse) {
      return lastResponse;
    }
    // Inatteignable en pratique (la boucle either return ou throw),
    // mais une fonction prometteuse doit tenir sa promesse.
    throw new Error("[neonFetch] tentatives épuisées sans erreur ni réponse");
  };
}
