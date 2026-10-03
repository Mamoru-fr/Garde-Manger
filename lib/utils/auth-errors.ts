// ============================================
// Messages d'erreur FR pour les erreurs Better-Auth
// ============================================
// Fonction pure — testée par test/auth-errors.test.ts (TDD-first).
//
// Codes et statuts documentés par Better-Auth :
// - 401 + INVALID_EMAIL_OR_PASSWORD : identifiants incorrects
//   (cf. doc Client : https://better-auth.com/docs/concepts/client — gestion des codes)
// - 403 : email non vérifié (doc Email & Password : onError ctx.error.status === 403)
// - USER_EXISTS / USER_ALREADY_EXISTS : inscription avec un email déjà pris
//
// Le défaut retombe sur le message serveur (souvent en anglais, mais informatif),
// sinon sur un message générique — on n'invente jamais plus que la preuve.

interface AuthErrorInput {
  /** Statut HTTP renvoyé par Better-Auth (401, 403, 409…) */
  status?: number;
  /** Code d'erreur Better-Auth (ex: INVALID_EMAIL_OR_PASSWORD) */
  code?: string | null;
  /** Message serveur brut (fallback d'affichage) */
  message?: string | null;
}

export function getAuthErrorMessage(error: AuthErrorInput): string {
  const status = error.status ?? 0;
  const code = error.code ?? '';

  if (status === 401 || code === 'INVALID_EMAIL_OR_PASSWORD') {
    return 'Email ou mot de passe incorrect.';
  }

  if (status === 403) {
    return "Ton adresse email n'est pas encore vérifiée. Regarde ta boîte de réception (et tes spams).";
  }

  if (code === 'USER_EXISTS' || code === 'USER_ALREADY_EXISTS' || status === 409) {
    return 'Un compte existe déjà avec cet email.';
  }

  return error.message?.trim() || 'Une erreur est survenue. Réessaie dans un instant.';
}
