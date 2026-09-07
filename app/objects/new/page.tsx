import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { getAuthHeaders } from "@/lib/utils/auth";

export default async function NewObjectPage() {
  const headers = await getAuthHeaders();
  const session = await auth.api.getSession({ headers });

  if (!session?.user) {
    redirect("/connexion");
  }

  // Rediriger vers la page de scan pour ajouter un objet
  // car le scan permet de créer des objets directement
  redirect("/installations");
}
