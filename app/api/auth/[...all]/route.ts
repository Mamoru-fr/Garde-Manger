// ============================================
// Handler HTTP officiel de Better-Auth (doc : integrations/next)
// ============================================
// Toutes les routes /api/auth/* passent par ce catch-all. Indispensable
// pour les liens cliqués depuis les emails — vérification d'email et
// reset de mot de passe (GET navigateur) — qui étaient en 404 avant ce
// handler, et pour tous les endpoints standards Better-Auth.
//
// La connexion des formulaires, elle, passe par la chaîne ACS
// (actions → contrôleurs → services) : le service appelle auth.api
// (signInEmail, signUpEmail…) et le plugin nextCookies() pose les
// cookies dans la server action.

import { auth } from "@/lib/auth/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
