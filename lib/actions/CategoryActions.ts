import { auth } from "@/lib/auth/auth";
import { getAuthHeaders } from "@/lib/utils/auth";
import { ObjectController } from "@/lib/controllers/ObjectController";

export interface Category {
  id: string;
  name: string;
}

// Action pour lister toutes les catégories.
// Round de fermeture (bloc 3) : la requête vit dans ObjectService,
// l'action orchestre la session et adapte la forme de retour.
export async function getCategories(): Promise<Category[]> {
  try {
    // Récupérer la session
    const headers = await getAuthHeaders();
    const session = await auth.api.getSession({ headers });

    if (!session?.user) {
      return [];
    }

    const result = await ObjectController.listCategories();
    if (!result.success || !result.data?.categories) {
      return [];
    }

    return result.data.categories as Category[];
  } catch (error) {
    console.error("[CategoryActions] Erreur lors de la récupération des catégories:", error);
    return [];
  }
}
