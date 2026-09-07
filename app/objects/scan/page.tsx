import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { getAuthHeaders } from "@/lib/utils/auth";

export default async function ScanObjectPage() {
  const headers = await getAuthHeaders();
  const session = await auth.api.getSession({ headers });

  if (!session?.user) {
    redirect("/connexion");
  }

  // Rediriger vers la page de scan d'une installation
  // Pour l'instant, rediriger vers installations
  redirect("/installations");
}
