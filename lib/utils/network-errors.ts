// ============================================
// network-errors — la classification des erreurs réseau
// (micro-round « option B » du 04/10)
//
// Pourquoi ce fichier : un ConnectTimeoutError de Neon, enveloppé
// par Better-Auth dans une APIError INTERNAL_SERVER_ERROR, ne se
// reconnaît pas à son type — il se reconnaît en remontant la
// chaîne des `cause`. La distinction porte un enjeu honnête :
// « pas de session » et « session illisible car la DB est
// injoignable » ne sont pas le même état. Traiter l'un pour
// l'autre déconnecte l'utilisateur par simple micro-coupure
// réseau (constaté le 04/10, trois fois dans l'heure).
//
// Pur : aucun import, aucune DB, aucun réseau.
// ============================================

/**
 * Vrai si l'erreur (ou l'une de ses causes, en remontant la chaîne)
 * est un échec de CONNECTIVITÉ vers un service distant : TCP, DNS,
 * TLS, timeout de connexion undici. Faux pour tout le reste —
 * en particulier les erreurs de programmation, qui ne doivent
 * jamais être silencieusement reclassées « réseau ».
 */
export function isNetworkError(error: unknown): boolean {
  let current: unknown = error;
  // Profondeur bornée : une cause circulaire ne doit pas boucler.
  for (let depth = 0; depth < 8 && current; depth++) {
    if (typeof current !== "object" && !(current instanceof Error)) {
      return false;
    }
    const candidate = current as Record<string, unknown>;
    const code = candidate.code;
    const name = typeof candidate.name === "string" ? candidate.name : "";
    const message = typeof candidate.message === "string" ? candidate.message : "";

    // undici : ConnectTimeoutError, erreurs de socket.
    if (code === "UND_ERR_CONNECT_TIMEOUT" || code === "UND_ERR_SOCKET") {
      return true;
    }
    if (name === "ConnectTimeoutError") {
      return true;
    }
    // TCP / DNS côté Node.
    if (
      code === "ECONNRESET" ||
      code === "ECONNREFUSED" ||
      code === "ETIMEDOUT" ||
      code === "ENOTFOUND" ||
      code === "EAI_AGAIN"
    ) {
      return true;
    }
    // L'enveloppe TypeError: fetch failed (undici) — le message fait foi,
    // le type seul ne suffit pas : un TypeError de code utilisateur existe.
    if (name === "TypeError" && /fetch failed/i.test(message)) {
      return true;
    }

    current = candidate.cause;
  }
  return false;
}
