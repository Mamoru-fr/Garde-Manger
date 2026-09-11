import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { getAuthHeaders } from "@/lib/utils/auth";
import { getInstallationById, getInstallationObjects, checkInstallationAccess, getUserInstallations } from "@/lib/actions/InstallationActions";
import { InstallationRole } from "@/lib/types";
import InstallationDetailsClient from "./InstallationDetailsClient";



export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

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

  // ✅ Récupérer les objets de l'installation
  const objectsResult = await getInstallationObjects(id);
  const objects = objectsResult.success ? objectsResult.data?.objects || [] : [];

  // Récupérer toutes les installations de l'utilisateur pour le déplacement
  const installationsResult = await getUserInstallations();
  const userInstallations = installationsResult.success ? installationsResult.data?.installations || [] : [];

  const installation = installationResult.data.installation;
  const userRole = installation.userRole as InstallationRole;

  // Rendre le Client Component avec les données
  return (
    <InstallationDetailsClient
      installation={installation}
      userRole={userRole}
      sessionUserId={session.user.id}
      installationId={id}
      objects={objects} // ✅ Passer les objets réels
      userInstallations={userInstallations} // Passer les installations pour le déplacement
    />
  );
}


