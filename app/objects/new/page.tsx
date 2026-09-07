import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { getAuthHeaders } from "@/lib/utils/auth";
import { getUserInstallations } from "@/lib/actions/InstallationActions";
import Link from "next/link";

export default async function NewObjectPage() {
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
        <h1>Ajouter un nouvel objet</h1>
        <p>Tu dois d'abord créer une installation pour ajouter des objets.</p>
        <Link href="/installations/new" className="btn btnPrimary">
          Créer une installation
        </Link>
      </main>
    );
  }

  // Pour l'instant, rediriger vers la première installation pour scanner
  // Plus tard: créer un vrai formulaire pour objets globaux
  const firstInstallation = installations[0];
  redirect(`/installations/${firstInstallation.id}/objects/scan`);
}
