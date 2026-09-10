import { auth } from "@/lib/auth/auth";
import { getAuthHeaders } from "@/lib/utils/auth";
import { db } from "@/lib/db/drizzle";
import { shops } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export interface Shop {
  id: string;
  name: string;
}

// Action pour lister tous les magasins
export async function getShops(): Promise<Shop[]> {
  try {
    // Récupérer la session
    const headers = await getAuthHeaders();
    const session = await auth.api.getSession({ headers });

    if (!session?.user) {
      return [];
    }

    const shopsList = await db
      .select({
        id: shops.id,
        name: shops.name,
      })
      .from(shops)
      .orderBy(shops.name);

    return shopsList;
  } catch (error) {
    console.error("[ShopActions] Erreur lors de la récupération des magasins:", error);
    return [];
  }
}
