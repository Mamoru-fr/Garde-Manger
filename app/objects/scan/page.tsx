import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { getAuthHeaders } from "@/lib/utils/auth";
import { getUserInstallations } from "@/lib/actions/InstallationActions";
import Link from "next/link";

export default async function ScanObjectPage() {
  const headers = await getAuthHeaders();
  const session = await auth.api.getSession({ headers });

  if (!session?.user) {
    redirect("/connexion");
  }

  // Récupérer les installations de l'utilisateur
  const installationsResult = await getUserInstallations();
  const installations = installationsResult.success ? installationsResult.data?.installations || [] : [];

  if (installations.length === 0) {
    return (
      <main className="container">
        <h1>Scanner un code-barres</h1>
        <p>Tu dois d'abord créer une installation pour scanner des objets.</p>
        <Link href="/installations/new" className="btn btnPrimary">
          Créer une installation
        </Link>
      </main>
    );
  }

  // Rediriger vers la page de scan de la première installation
  const firstInstallation = installations[0];
  redirect(`/installations/${firstInstallation.id}/objects/scan`);
}
