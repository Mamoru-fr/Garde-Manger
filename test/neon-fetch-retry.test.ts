// ============================================
// Test de la résilience fetch du client Neon
// (micro-round « option B » du 04/10 — Alexis :
// retry + fenêtre de temps élargie + session qui
// ne se masque plus en déconnexion fantôme).
// Écrit AVANT l'implémentation (TDD — règle 5).
//
// Fonctions PURES : le fetch réel est injecté,
// le sleep aussi — aucune DB, aucun réseau.
// ============================================

import { describe, it, expect } from "vitest";

import {
  createRetryFetch,
  isRetryableError,
  type FetchLike,
} from "../lib/db/neonFetch";
import { isNetworkError } from "../lib/utils/network-errors";

// ---- Fabriques d'erreurs réalistes (constatées dans la console du 04/10) ----

// TypeError: fetch failed, causé par undici ConnectTimeoutError
const fetchFailed = () => {
  const connectTimeout = new Error("Connect Timeout Error");
  (connectTimeout as any).name = "ConnectTimeoutError";
  (connectTimeout as any).code = "UND_ERR_CONNECT_TIMEOUT";
  const e = new TypeError("fetch failed");
  (e as any).cause = connectTimeout;
  return e;
};

const response = (status: number) => new Response("{}", { status });

// Sleep instantané injecté : les tests ne dorment jamais.
const noSleep = async () => {};

const countingFetch = (script: (call: number) => Promise<Response>) => {
  let calls = 0;
  const fn: FetchLike = (input, init) => {
    calls += 1;
    return script(calls);
  };
  return { fn, getCalls: () => calls };
};

// ============================================
// createRetryFetch — le retry du client Neon
// ============================================
describe("createRetryFetch — retry du fetch Neon", () => {
  it("succès au premier essai : un seul appel, aucune attente", async () => {
    const { fn, getCalls } = countingFetch(() => Promise.resolve(response(200)));
    const fetch = createRetryFetch(fn, { maxAttempts: 3, backoffMs: 750, sleep: noSleep });

    const res = await fetch("https://neon.test/sql");

    expect(res.status).toBe(200);
    expect(getCalls()).toBe(1);
  });

  it("un échec réseau puis un succès : une relance, puis succès", async () => {
    const { fn, getCalls } = countingFetch((call) =>
      call === 1 ? Promise.reject(fetchFailed()) : Promise.resolve(response(200))
    );
    const fetch = createRetryFetch(fn, { maxAttempts: 3, backoffMs: 750, sleep: noSleep });

    const res = await fetch("https://neon.test/sql");

    expect(res.status).toBe(200);
    expect(getCalls()).toBe(2);
  });

  it("épuisement des tentatives : la DERNIÈRE erreur est levée", async () => {
    const { fn, getCalls } = countingFetch(() => Promise.reject(fetchFailed()));
    const fetch = createRetryFetch(fn, { maxAttempts: 3, backoffMs: 750, sleep: noSleep });

    await expect(fetch("https://neon.test/sql")).rejects.toThrow("fetch failed");
    expect(getCalls()).toBe(3);
  });

  it("une erreur non réseau ne se relance PAS (une seule tentative)", async () => {
    const { fn, getCalls } = countingFetch(() =>
      Promise.reject(new Error("Erreur de programmation"))
    );
    const fetch = createRetryFetch(fn, { maxAttempts: 3, backoffMs: 750, sleep: noSleep });

    await expect(fetch("https://neon.test/sql")).rejects.toThrow("Erreur de programmation");
    expect(getCalls()).toBe(1);
  });

  it("les réponses 5xx se relancent, puis le succès passe", async () => {
    const { fn, getCalls } = countingFetch((call) =>
      Promise.resolve(call <= 2 ? response(503) : response(200))
    );
    const fetch = createRetryFetch(fn, { maxAttempts: 3, backoffMs: 750, sleep: noSleep });

    const res = await fetch("https://neon.test/sql");

    expect(res.status).toBe(200);
    expect(getCalls()).toBe(3);
  });

  it("5xx épuisé : la dernière réponse est rendue (le driver Neon la traduira)", async () => {
    const { fn, getCalls } = countingFetch(() => Promise.resolve(response(502)));
    const fetch = createRetryFetch(fn, { maxAttempts: 2, backoffMs: 750, sleep: noSleep });

    const res = await fetch("https://neon.test/sql");

    expect(res.status).toBe(502);
    expect(getCalls()).toBe(2);
  });

  it("un 4xx ne se relance pas — erreur métier, pas un blip", async () => {
    const { fn, getCalls } = countingFetch(() => Promise.resolve(response(401)));
    const fetch = createRetryFetch(fn, { maxAttempts: 3, backoffMs: 750, sleep: noSleep });

    const res = await fetch("https://neon.test/sql");

    expect(res.status).toBe(401);
    expect(getCalls()).toBe(1);
  });

  it("le backoff est respecté entre les tentatives", async () => {
    const sleeps: number[] = [];
    const sleep = async (ms: number) => { sleeps.push(ms); };
    const { fn } = countingFetch((call) =>
      call === 1 ? Promise.reject(fetchFailed()) : Promise.resolve(response(200))
    );
    const fetch = createRetryFetch(fn, { maxAttempts: 3, backoffMs: 750, sleep });

    await fetch("https://neon.test/sql");

    expect(sleeps).toEqual([750]);
  });

  it("un Request rejoué garde son corps à chaque tentative (clone avant consommation)", async () => {
    const bodies: string[] = [];
    // Le fetch réel lit le corps — simulons un driver qui lit req.text()
    const bodyReadingFetch: FetchLike = async (input) => {
      const req = input as Request;
      if (req.body) bodies.push(await req.text());
      if (bodies.length === 1) throw fetchFailed(); // 1re tentative : blip réseau
      return response(200);
    };
    const fetch = createRetryFetch(bodyReadingFetch, { maxAttempts: 3, backoffMs: 750, sleep: noSleep });

    const request = new Request("https://neon.test/sql", {
      method: "POST",
      body: "SELECT 1",
    });
    const res = await fetch(request);

    expect(res.status).toBe(200);
    expect(bodies).toEqual(["SELECT 1", "SELECT 1"]);
  });
});

// ============================================
// isRetryableError / isNetworkError — la classification
// ============================================
describe("isRetryableError — classification des échecs fetch", () => {
  it("TypeError fetch failed causé par ConnectTimeoutError : retentable", () => {
    expect(isRetryableError(fetchFailed())).toBe(true);
  });

  it("erreur TCP/DNS explicite (ECONNRESET, ETIMEDOUT, ENOTFOUND) : retentable", () => {
    const e = new Error("socket hang up");
    (e as any).code = "ECONNRESET";
    expect(isRetryableError(e)).toBe(true);
    const dns = new Error("getaddrinfo ENOTFOUND");
    (dns as any).code = "ENOTFOUND";
    expect(isRetryableError(dns)).toBe(true);
  });

  it("une erreur de programmation ordinaire : PAS retentable", () => {
    expect(isRetryableError(new Error("Erreur de programmation"))).toBe(false);
    expect(isRetryableError(null)).toBe(false);
  });
});

describe("isNetworkError — la distinction pour getCurrentSession", () => {
  it("remonte la chaîne des causes jusqu'à l'erreur réseau", () => {
    expect(isNetworkError(fetchFailed())).toBe(true);
  });

  it("une erreur enveloppée une fois de plus remonte aussi", () => {
    const wrapped = new Error("Failed query");
    (wrapped as any).cause = fetchFailed();
    expect(isNetworkError(wrapped)).toBe(true);
  });

  it("une erreur sans cause réseau n'est PAS une erreur réseau", () => {
    expect(isNetworkError(new Error("Erreur de programmation"))).toBe(false);
  });
});
