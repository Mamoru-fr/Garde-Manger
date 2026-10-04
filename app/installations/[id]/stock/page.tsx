import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { getAuthHeaders } from "@/lib/utils/auth";
import { getInstallationGenericStock } from "@/lib/actions/StockActions";
import { uniqueCategoriesFromCards } from "@/lib/services/StockViewService";
import { db } from "@/lib/db/drizzle";
import { installations, userInstallations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import StockClient from "@/app/stock/StockClient";

// ============================================
// Page du stock d'une installation (bloc 3,
// niveau 1 dans le périmètre d'une installation).
// Les fiches génériques y sont portées par les
// mêmes lignes — le clic y mène au niveau 3.
// ============================================

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

  // Charger les fiches génériques du stock de cette installation
  const initialDataResult = await getInstallationGenericStock(installationId, {
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
        installations: [], // vue installation : pas de filtre par installation
        categories: uniqueCategoriesFromCards(cards),
      }}
      installationId={installationId}
      installationName={installation.name}
    />
  );
}
