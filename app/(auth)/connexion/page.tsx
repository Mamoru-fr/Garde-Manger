import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/utils/auth";
import SignInForm from "./SignInForm";

// Désactiver le prerendering car cette page utilise des headers dynamiques
export const dynamic = 'force-dynamic';

// Page de connexion - côté serveur pour vérifier la session
export default async function SignInPage() {
  // Vérifier si l'utilisateur est déjà connecté
  const session = await getCurrentSession();

  console.log("🔐 [SERVER /connexion] Vérification de la session:", {
    hasUser: !!session?.user,
    userEmail: session?.user?.email
  });

  // Si déjà connecté, rediriger vers /installations
  if (session?.user) {
    console.log("✅ [SERVER /connexion] Utilisateur déjà connecté, redirection vers /installations");
    redirect("/installations");
  }

  // Sinon, afficher le formulaire de connexion
  return <SignInForm />;
}
