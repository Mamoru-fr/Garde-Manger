import { redirect } from "next/navigation";
import { getUserInstallations } from "@/lib/actions/InstallationActions";
import InstallationsClient from "./InstallationsClient";
import { getCurrentSession } from "@/lib/utils/auth";

// Page installations - Server Component avec vérification de session
// ⭐ FORCER LE RENDU DYNAMIQUE car on utilise headers() pour la session ⭐
export const dynamic = 'force-dynamic';

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

  // Afficher la page avec les installations et la session
  // Adapter la session au format attendu par InstallationsClient
  const adaptedSession = {
    user: session?.user ? {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    } : null,
  };

  return (
    <InstallationsClient installations={installations} session={adaptedSession} />
  );
}
