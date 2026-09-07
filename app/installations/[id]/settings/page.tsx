import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { getAuthHeaders } from "@/lib/utils/auth";
import { getInstallationById, checkInstallationAccess } from "@/lib/actions/InstallationActions";
import { InstallationRole } from "@/lib/types";
import EditInstallationForm from "@/components/installations/EditInstallationForm";
import Link from "next/link";

export default async function InstallationSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  
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

  // Si l'utilisateur n'a pas le droit de modifier, message approprié
  if (userRole !== 'owner' && userRole !== 'editor') {
    return (
      <main className="container">
        <h1>Paramètres de l'installation: {installation.name}</h1>
        <p>Tu n'as pas la permission de modifier les paramètres de cette installation.</p>
        <Link href={`/installations/${id}`} className="btn btnSecondary">
          Retour aux détails
        </Link>
      </main>
    );
  }

  return (
    <main className="container">
      <h1>Paramètres de l'installation: {installation.name}</h1>
      <p className="subtitle">Modifie les informations de base de ton installation.</p>
      
      <EditInstallationForm installation={installation} />
      
      <div className="mt-6">
        <Link href={`/installations/${id}`} className="btn btnSecondary">
          Retour aux détails
        </Link>
      </div>
    </main>
  );
}
