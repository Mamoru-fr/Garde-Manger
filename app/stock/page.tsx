import { redirect } from "next/navigation";
import { getUserGenericStock } from "@/lib/actions/StockActions";
import {
  uniqueInstallationsFromCards,
  uniqueCategoriesFromCards,
} from "@/lib/services/StockViewService";
import { auth } from "@/lib/auth/auth";
import { getAuthHeaders } from "@/lib/utils/auth";
import StockClient from "./StockClient";

// ============================================
// Page du stock global (bloc 3, niveau 1) :
// les fiches génériques toutes installations
// confondues (Q1a). Pas de troncature à 5 —
// les cartes agrégées sont la vue complète.
// ============================================

export default async function GlobalStockPage() {
  // Récupérer la session
  const headers = await getAuthHeaders();
  const session = await auth.api.getSession({ headers });

  if (!session?.user) {
    redirect("/connexion");
  }

  // Charger les fiches génériques du stock global (tri par défaut : péremption)
  const initialDataResult = await getUserGenericStock({
    sortBy: "expiry_date",
    sortOrder: "asc",
  });

  const cards = initialDataResult.success ? initialDataResult.cards ?? [] : [];
  const stats = initialDataResult.success ? initialDataResult.stats ?? null : null;

  return (
    <StockClient
      initialData={{
        cards,
        stats,
        installations: uniqueInstallationsFromCards(cards),
        categories: uniqueCategoriesFromCards(cards),
      }}
      forceCardView
    />
  );
}
