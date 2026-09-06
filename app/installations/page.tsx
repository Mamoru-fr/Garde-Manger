import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/utils/auth";
import { getUserInstallations } from "@/lib/actions/InstallationActions";
import InstallationsClient from "./InstallationsClient";

// Page d'installations - Server Component avec vérification de session

export default async function InstallationsPage() {
  // Vérification côté serveur de la session
  const session = await getCurrentSession();
  
  console.log("🔐 [SERVER] Vérification de la session pour /installations:", {
    hasUser: !!session?.user,
    userEmail: session?.user?.email
  });
  
  // Si pas de session, rediriger vers la page de connexion
  if (!session?.user) {
    console.log("❌ [SERVER] Pas de session valide, redirection vers /connexion");
    redirect("/connexion");
  }
  
  // Récupérer les installations de l'utilisateur
  const result = await getUserInstallations();
  const installations = result.success ? 
    result.data?.installations?.map(inst => ({
      ...inst,
      description: inst.description ?? undefined,
      owner: inst.owner ? { ...inst.owner, name: inst.owner.name ?? undefined } : inst.owner,
      role: inst.role as "owner" | "editor" | "viewer"
    })) || [] : [];

  // Afficher la page avec les installations
  return (
    <InstallationsClient installations={installations} session={session} />
  );
}
