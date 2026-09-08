import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { getAuthHeaders } from "@/lib/utils/auth";
import { getInstallationStock } from "@/lib/actions/StockActions";
import { db } from "@/lib/db/drizzle";
import { installations, userInstallations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import StockClient from "@/app/stock/StockClient";

export default async function InstallationStockPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const installationId = resolvedParams.id;

  // Récupérer la session
  const headers = await getAuthHeaders();
  const session = await auth.api.getSession({ headers });

  if (!session?.user) {
    redirect("/login");
  }

  // Vérifier que l'utilisateur a accès à cette installation
  const [installation, userInstallation] = await Promise.all([
    db.query.installations.findFirst({
      where: eq(installations.id, installationId),
    }),
    db.query.userInstallations.findFirst({
      where: and(
        eq(userInstallations.userId, session.user.id),
        eq(userInstallations.installationId, installationId)
      ),
    }),
  ]);

  if (!installation || !userInstallation) {
    redirect("/installations");
  }

  // Charger les données initiales du stock pour cette installation
  const initialDataResult = await getInstallationStock(installationId, {
    sortBy: "expiry_date",
    sortOrder: "asc",
  });

  // Formater les données pour le client
  const initialData = initialDataResult.success
    ? {
        items: initialDataResult.data || [],
        stats: initialDataResult.stats || null,
        installations: [],
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

  return (
    <StockClient
      initialData={initialData}
      installationId={installationId}
      installationName={installation.name}
    />
  );
}
