import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/utils/auth";
import { getInstallationById } from "@/lib/actions/InstallationActions";
import EditInstallationForm from "./EditInstallationForm";

// Page d'édition d'une installation - Server Component
export default async function EditInstallationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Désemballer la Promise pour obtenir l'ID
  const { id } = await params;

  // Vérification côté serveur de la session
  const session = await getCurrentSession();
  
  console.log("🔐 [SERVER /installations/[id]/edit] Vérification de la session:", {
    hasUser: !!session?.user,
    userEmail: session?.user?.email,
    installationId: id,
  });
  
  // Si pas de session, rediriger vers la page de connexion
  if (!session?.user) {
    console.log("❌ [SERVER] Pas de session valide, redirection vers /connexion");
    redirect("/connexion");
  }
  
  // Récupérer l'installation par son ID
  const result = await getInstallationById(id);
  
  if (!result.success || !result.data?.installation) {
    console.log("❌ [SERVER] Installation non trouvée:", { result, id });
    redirect("/installations");
  }
  
  const installation = result.data.installation;
  
  // Vérifier que l'utilisateur a le droit de modifier cette installation
  // On autorise les rôles 'owner' et 'editor'
  const userRole = installation.userRole?.toLowerCase() || "";
  console.log("🔐 [SERVER /installations/[id]/edit] Rôle de l'utilisateur:", userRole);
  
  if (!["owner", "editor"].includes(userRole)) {
    console.log("❌ [SERVER] Utilisateur non autorisé pour modifier cette installation (rôle:", userRole, ")");
    redirect("/installations");
  }

  // Afficher le formulaire d'édition
  return (
    <EditInstallationForm installation={installation} />
  );
}
