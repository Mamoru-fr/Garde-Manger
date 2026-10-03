// ============================================
// Handler HTTP officiel de Better-Auth (doc : integrations/next)
// ============================================
// Toutes les routes /api/auth/* (sign-in, sign-up, session, verify-email,
// reset-password, sign-out…) passent par ce catch-all.
//
// ⚠️ Sans ce handler, aucune de ces routes n'existe côté Next : c'est LUI qui
// pose le cookie de session dans la réponse HTTP. La connexion via server action
// (ancienne chaîne AuthActions → AuthController → AuthService) ne posait jamais
// le cookie — les RSC ne peuvent pas définir de cookies — d'où la boucle
// /connexion → /installations → /connexion.

import { auth } from "@/lib/auth/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
