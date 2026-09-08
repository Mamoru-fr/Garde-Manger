import { auth } from "@/lib/auth/auth";
import { getAuthHeaders } from "@/lib/utils/auth";
import { getInstallationById } from "@/lib/actions/InstallationActions";
import { getCategories } from "@/lib/actions/CategoryActions";
import { getShops } from "@/lib/actions/ShopActions";
import AddObjectClient from "./AddObjectClient";
import { redirect } from "next/navigation";

export default async function AddObjectPage({ params }: { params: { id: string } }) {
  // R\u001ecup\u001erer la session
  const headers = await getAuthHeaders();
  const session = await auth.api.getSession({ headers });
  
  if (!session?.user) {
    redirect("/login");
  }

  // R\u001ecup\u001erer l'installation pour le titre
  const installationResult = await getInstallationById(params.id);
  if (!installationResult.success || !installationResult.data?.installation) {
    throw new Error("Installation non trouv\u001ee");
  }
  
  const installation = installationResult.data.installation;

  // Charger les cat\u001egories et magasins pour les selects
  const [categories, shops] = await Promise.all([
    getCategories(),
    getShops(),
  ]);

  return (
    <main>
      <AddObjectClient
        installationId={params.id}
        installationName={installation.name}
        categories={categories || []}
        shops={shops || []}
      />
    </main>
  );
}
