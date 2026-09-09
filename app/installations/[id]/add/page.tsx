import { getInstallationById } from "@/lib/actions/InstallationActions";
import { getCategories } from "@/lib/actions/CategoryActions";
import { getShops } from "@/lib/actions/ShopActions";
import AddObjectClient from "./AddObjectClient";
import { notFound } from "next/navigation";

interface AddObjectPageProps {
  params: { id: string };
}

export default async function AddObjectPage({ params }: AddObjectPageProps) {
  const installationId = params.id;

  if (!installationId) {
    console.error("Erreur: ID installation manquant");
    notFound();
  }

  // Recuperer l'installation pour le titre
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

  // Charger les categories et magasins pour les selects
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
