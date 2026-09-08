import { redirect } from "next/navigation";
import { getInstallationById, checkInstallationAccess } from "@/lib/actions/InstallationActions";
import { getCurrentSession } from "@/lib/utils/auth";
import ScanClient from "./ScanClient";

// Page serveur pour le scan - Vérifie les permissions
export default async function ScanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Vérifier la session utilisateur
  const session = await getCurrentSession();

  if (!session?.user) {
    redirect("/connexion");
  }

  // Vérifier l'accès à l'installation
  const accessResult = await checkInstallationAccess(id);

  if (!accessResult.success || !accessResult.data?.hasAccess) {
    redirect("/installations?error=access_denied");
  }

  const installationResult = await getInstallationById(id);

  if (!installationResult.success || !installationResult.data?.installation) {
    redirect("/installations?error=not_found");
  }

  const installation = installationResult.data.installation;
  const userRole = installation.userRole?.toLowerCase() || "";

  // Seuls les owner et editor peuvent scanner
  if (!["owner", "editor"].includes(userRole)) {
    redirect("/installations");
  }

  return (
    <ScanClient
      installationId={id}
      installationName={installation.name}
    />
  );
}
