import { auth } from "@/lib/auth/auth";
import { getAuthHeaders } from "@/lib/utils/auth";
import { getInstallationById } from "@/lib/actions/InstallationActions";
import { getCategories } from "@/lib/actions/CategoryActions";
import { getShops } from "@/lib/actions/ShopActions";
import AddObjectClient from "./AddObjectClient";
import { redirect } from "next/navigation";

export default async function AddObjectPage({ params }: { params: { id: string } }) {
  // Recuperer la session
  const headers = await getAuthHeaders();
  const session = await auth.api.getSession({ headers });
  
  if (!session?.user) {
    redirect("/login");
  }

  // Recuperer l'installation pour le titre
  const installationResult = await getInstallationById(params.id);
  
  // Verifier la structure de la reponse
  if (!installationResult?.success) {
    console.error("Erreur lors de la recuperation de l'installation:", installationResult?.error);
    throw new Error("Installation non trouvee : " + (installationResult?.error || "ID invalide"));
  }
  
  const installation = installationResult.data?.installation;
  
  if (!installation) {
    console.error("Installation introuvable dans la reponse:", installationResult);
    throw new Error("Installation non trouvee : donnees manquantes");
  }

  // Charger les categories et magasins pour les selects
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
