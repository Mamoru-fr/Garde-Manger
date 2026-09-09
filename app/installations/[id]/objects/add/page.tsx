import { auth } from "@/lib/auth/auth";
import { getAuthHeaders } from "@/lib/utils/auth";
import { getInstallationById } from "@/lib/actions/InstallationActions";
import { getCategories } from "@/lib/actions/CategoryActions";
import { getShops } from "@/lib/actions/ShopActions";
import AddObjectClient from "./AddObjectClient";
import { redirect, notFound } from "next/navigation";

export default async function AddObjectPage({ params }: { params: { id: string } }) {
  const installationId = params.id;

  if (!installationId) {
    console.error("Erreur: ID installation manquant");
    notFound();
  }

  const headers = await getAuthHeaders();
  const session = await auth.api.getSession({ headers });

  if (!session?.user) {
    redirect("/login");
  }

  const installationResult = await getInstallationById(installationId);

  if (!installationResult?.success) {
    console.error("Erreur lors de la recuperation de l installation:", installationResult?.error);
    notFound();
  }

  const installation = installationResult.data?.installation;

  if (!installation) {
    console.error("Installation introuvable dans la reponse:", installationResult);
    notFound();
  }

  const [categories, shops] = await Promise.all([
    getCategories(),
    getShops(),
  ]);

  return (
    <main>
      <AddObjectClient
        installationId={installationId}
        installationName={installation.name}
        categories={categories || []}
        shops={shops || []}
      />
    </main>
  );
}
