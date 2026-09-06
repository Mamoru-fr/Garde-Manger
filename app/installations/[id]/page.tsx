import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { getAuthHeaders } from "@/lib/utils/auth";
import { getInstallationById, checkInstallationAccess } from "@/lib/actions/InstallationActions";
import { InstallationRole } from "@/lib/types";
import InstallationDetailsClient from "./InstallationDetailsClient";



export default async function InstallationDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  
  // Vérifier la session utilisateur
  const headers = await getAuthHeaders();
  const session = await auth.api.getSession({ headers });

  if (!session?.user) {
    redirect("/connexion");
  }

  // Vérifier l'accès à l'installation
  const accessResult = await checkInstallationAccess(id);
  
  if (!accessResult.success || !accessResult.data?.hasAccess) {
    redirect("/installations?error=access_denied");
  }

  // Récupérer les détails de l'installation
  const installationResult = await getInstallationById(id);
  
  if (!installationResult.success || !installationResult.data?.installation) {
    redirect("/installations?error=not_found");
  }

  const installation = installationResult.data.installation;
  const userRole = installation.userRole as InstallationRole;

  // Rendre le Client Component avec les données
  return (
    <InstallationDetailsClient
      installation={installation}
      userRole={userRole}
      sessionUserId={session.user.id}
      installationId={id}
    />
  );
}


