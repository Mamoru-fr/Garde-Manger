"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/auth-client";

// Déconnexion via le client officiel Better-Auth : authClient.signOut()
// appelle /api/auth/sign-out, qui supprime le cookie de session dans la
// réponse HTTP. L'ancienne version passait par une server action — même
// piège que le login : pas de pose de cookie possible depuis un RSC.

export default function SignOutPage() {
  const router = useRouter();

  useEffect(() => {
    const signOutAndRedirect = async () => {
      await authClient.signOut();
      router.replace("/");
    };
    signOutAndRedirect();
  }, [router]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <p className="text-muted">Déconnexion en cours...</p>
    </div>
  );
}
