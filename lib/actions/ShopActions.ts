import { auth } from "@/lib/auth/auth";
import { getAuthHeaders } from "@/lib/utils/auth";
import { ObjectController } from "@/lib/controllers/ObjectController";

export interface Shop {
  id: string;
  name: string;
}

// Action pour lister tous les magasins.
// Round de fermeture (bloc 3) : la requête vit dans ObjectService
// (listShopsService, existante), l'action orchestre la session et
// adapte la forme de retour ({ id, name } pour les formulaires).
export async function getShops(): Promise<Shop[]> {
  try {
    // Récupérer la session
    const headers = await getAuthHeaders();
    const session = await auth.api.getSession({ headers });

    if (!session?.user) {
      return [];
    }

    const result = await ObjectController.listShops();
    if (!result.success || !result.data?.shops) {
      return [];
    }

    return (result.data.shops as { id: string; name: string }[]).map((shop) => ({
      id: shop.id,
      name: shop.name,
    }));
  } catch (error) {
    console.error("[ShopActions] Erreur lors de la récupération des magasins:", error);
    return [];
  }
}
