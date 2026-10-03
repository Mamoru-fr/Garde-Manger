import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/utils/auth";
import SignInForm from "./SignInForm";

// Désactiver le prerendering car cette page utilise des headers dynamiques
export const dynamic = 'force-dynamic';

// Page de connexion - côté serveur pour vérifier la session
export default async function SignInPage() {
  // Vérifier si l'utilisateur est déjà connecté
  const session = await getCurrentSession();

  // Si déjà connecté, rediriger vers /installations
  if (session?.user) {
    redirect("/installations");
  }

  // Sinon, afficher le formulaire de connexion
  return <SignInForm />;
}
