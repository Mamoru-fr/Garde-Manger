// ============================================
// Client Better-Auth officiel pour les composants React (doc : concepts/client)
// ============================================
// À utiliser dans les formulaires clients :
// - authClient.signIn.email({ email, password, callbackURL })
// - authClient.signUp.email({ name, email, password, callbackURL })
// - authClient.forgetPassword({ email, redirectTo })
// - authClient.resetPassword({ newPassword, token })
// - authClient.verifyEmail({ query: { token } })
// - authClient.sendVerificationEmail({ email, callbackURL })
// - authClient.signOut()
//
// Le basePath par défaut (/api/auth) correspond au handler monté dans
// app/api/auth/[...all]/route.ts — rien à configurer.

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();
