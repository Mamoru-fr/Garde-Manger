import { auth } from "@/lib/auth/auth";
import { getInstallationById } from "@/lib/actions/InstallationActions";
import { getCategories } from "@/lib/actions/CategoryActions";
import { getShops } from "@/lib/actions/ShopActions";
import AddObjectClient from "./AddObjectClient";

export default async function AddObjectPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Non autoris\u001e");
  }

  // R\u001ecup\u001erer l'installation pour le titre
  const installation = await getInstallationById(params.id);
  if (!installation) {
    throw new Error("Installation non trouv\u001ee");
  }

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
