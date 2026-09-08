import { auth } from "@/lib/auth/auth";
import { getAuthHeaders } from "@/lib/utils/auth";
import { db } from "@/lib/db/drizzle";
import { categories } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export interface Category {
  id: string;
  name: string;
}

// Action pour lister toutes les catégories
export async function getCategories(): Promise<Category[]> {
  try {
    // Récupérer la session
    const headers = await getAuthHeaders();
    const session = await auth.api.getSession({ headers });

    if (!session?.user) {
      return [];
    }

    const categoriesList = await db
      .select({
        id: categories.id,
        name: categories.name,
      })
      .from(categories)
      .orderBy(categories.name);

    return categoriesList;
  } catch (error) {
    console.error("[CategoryActions] Erreur lors de la récupération des catégories:", error);
    return [];
  }
}
