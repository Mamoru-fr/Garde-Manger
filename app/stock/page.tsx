import { redirect } from "next/navigation";
import { Warehouse } from "lucide-react";
import { getUserStock } from "@/lib/actions/StockActions";
import { auth } from "@/lib/auth/auth";
import { getAuthHeaders } from "@/lib/utils/auth";
import StockClient from "./StockClient";

export default async function GlobalStockPage() {
  // Récupérer la session
  const headers = await getAuthHeaders();
  const session = await auth.api.getSession({ headers });

  if (!session?.user) {
    redirect("/login");
  }

  // Charger les données initiales du stock
  const initialDataResult = await getUserStock({
    sortBy: "expiry_date",
    sortOrder: "asc",
  });

  // Formater les données pour le client
  const initialData = initialDataResult.success
    ? {
        items: initialDataResult.data || [],
        stats: initialDataResult.stats || null,
        installations: initialDataResult.data
          ? initialDataResult.data.reduce(
              (acc: { id: string; name: string }[], item: any) => {
                const exists = acc.some((i) => i.id === item.installationId);
                if (!exists && item.installationId && item.installationName) {
                  acc.push({ id: item.installationId, name: item.installationName });
                }
                return acc;
              },
              []
            )
          : [],
        categories: initialDataResult.data
          ? initialDataResult.data.reduce(
              (acc: { id: string; name: string }[], item: any) => {
                if (item.category && !acc.some((c) => c.id === item.category)) {
                  acc.push({ id: item.category, name: item.category });
                }
                return acc;
              },
              []
            )
          : [],
      }
    : {
        items: [],
        stats: null,
        installations: [],
        categories: [],
      };

  return <StockClient initialData={initialData} />;
}
