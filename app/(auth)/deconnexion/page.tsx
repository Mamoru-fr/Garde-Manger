import { redirect } from "next/navigation";
import { signout } from "@/lib/actions/AuthActions";

// Déconnexion via la chaîne ACS :
// action → contrôleur → service → Better-Auth (signOut).
// C'est Better-Auth qui supprime la session et le cookie (plugin nextCookies).

export default async function SignOutPage() {
  // Déconnecter l'utilisateur
  const result = await signout();

  if (!result.success) {
    redirect("/connexion?error=" + encodeURIComponent(result.error || "Erreur de déconnexion"));
  }

  // Rediriger vers la page d'accueil
  redirect("/");
}
