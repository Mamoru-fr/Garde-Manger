import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/utils/auth";
import { getInstallationById } from "@/lib/actions/InstallationActions";
import EditInstallationForm from "@/components/installations/EditInstallationForm";

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
  
  if (!session?.user) {
    redirect("/connexion");
  }
  
  // Récupérer l'installation par son ID
  const result = await getInstallationById(id);
  
  if (!result.success || !result.data?.installation) {
    redirect("/installations");
  }

  const installation = result.data.installation;

  // Vérifier que l'utilisateur a le droit de modifier cette installation
  // (Logique simplifiée - à améliorer)
  const hasEditPermission = installation.ownerId === session.user.id || 
                            installation.userRole === 'owner' || 
                            installation.userRole === 'editor';

  if (!hasEditPermission) {
    redirect("/installations");
  }
  
  return <EditInstallationForm installation={installation} />;
}
