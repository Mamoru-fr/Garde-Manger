import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { getAuthHeaders } from "@/lib/utils/auth";
import {
  getInstallationGenericStock,
  getUserGenericStock,
  updateStockItem,
  deleteStockItem,
} from "@/lib/actions/StockActions";
import type { GenericStockFilters } from "@/lib/services/StockQueryService";
import type { UnitFamily } from "@/lib/services/QuantityService";

// Endpoint pour récupérer les fiches génériques du stock (bloc 3, niveau 1)
export async function GET(request: NextRequest) {
  try {
    const headers = await getAuthHeaders();
    const session = await auth.api.getSession({ headers });

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Non autorisé", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // Récupérer les filtres de l'URL
    const { searchParams } = new URL(request.url);
    const filters: GenericStockFilters = {
      searchQuery: searchParams.get("searchQuery") || undefined,
      category: searchParams.get("category") || undefined,
      installationId: searchParams.get("installationId") || undefined,
      location: searchParams.get("location") || undefined,
      expiryStatus: searchParams.get("expiryStatus") as any || undefined,
      sortBy: searchParams.get("sortBy") as any || "expiry_date",
      sortOrder: searchParams.get("sortOrder") as any || "asc",
      // Q4 : famille d'unités du tri par quantité.
      quantityFamily: (searchParams.get("quantityFamily") as UnitFamily) || null,
    };

    // Déterminer si on veut le stock global ou d'une installation spécifique
    const installationId = searchParams.get("installationId");

    const result = installationId
      ? await getInstallationGenericStock(installationId, filters)
      : await getUserGenericStock(filters);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Stock API GET] Erreur:", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

// Endpoint pour mettre à jour un objet du stock
export async function PUT(request: NextRequest) {
  try {
    const headers = await getAuthHeaders();
    const session = await auth.api.getSession({ headers });

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Non autorisé", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { installationId, objectInstallationId, updates } = body;

    if (!installationId || !objectInstallationId || !updates) {
      return NextResponse.json(
        { success: false, error: "Paramètres manquants", code: "BAD_REQUEST" },
        { status: 400 }
      );
    }

    const result = await updateStockItem(installationId, objectInstallationId, updates);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[Stock API PUT] Erreur:", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

// Endpoint pour supprimer un objet du stock
export async function DELETE(request: NextRequest) {
  try {
    const headers = await getAuthHeaders();
    const session = await auth.api.getSession({ headers });

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Non autorisé", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { installationId, objectInstallationId } = body;

    if (!installationId || !objectInstallationId) {
      return NextResponse.json(
        { success: false, error: "Paramètres manquants", code: "BAD_REQUEST" },
        { status: 400 }
      );
    }

    const result = await deleteStockItem(installationId, objectInstallationId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[Stock API DELETE] Erreur:", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
