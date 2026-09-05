import { redirect } from "next/navigation";
import { signout } from "@/lib/actions/AuthActions";

export default async function SignOutPage() {
  // Déconnecter l'utilisateur
  const result = await signout();
  
  // Rediriger vers la page d'accueil
  redirect("/");
}
