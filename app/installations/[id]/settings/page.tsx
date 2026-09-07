import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { getAuthHeaders } from "@/lib/utils/auth";
import { getInstallationById, checkInstallationAccess } from "@/lib/actions/InstallationActions";
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

  // Page de base avec liens vers les fonctionnalités existantes
  return (
    <main className="container">
      <h1>Paramètres de l'installation: {installation.name}</h1>
      <p className="subtitle">Gérez les paramètres de votre installation.</p>
      
      <div style={{ marginTop: '2rem' }}>
        <h2>Paramètres disponibles:</h2>
        <ul>
          <li>
            <Link href={`/installations/${id}/edit`}>
              Modifier les informations de l'installation
            </Link>
          </li>
          <li>
            <Link href={`/installations/${id}`}>
              Voir les détails de l'installation
            </Link>
          </li>
          <li>
            <Link href={`/installations/${id}/objects/scan`}>
              Scanner un code-barres
            </Link>
          </li>
        </ul>
      </div>
      
      <div style={{ marginTop: '2rem' }}>
        <Link href="/installations" className="back-link">
          Retour à la liste des installations
        </Link>
      </div>
    </main>
  );
}
