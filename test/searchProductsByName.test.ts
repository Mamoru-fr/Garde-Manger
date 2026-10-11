// ============================================
// Test de l'action searchProductsByName (recherche manuelle par nom)
// Écrit AVANT l'implémentation (TDD-first) — règle 5 de tour-de-main.
// L'action est testée en isolation : session, service annuaire local
// et service OpenFoodFacts sont simulés (aucun accès DB ni réseau).
// ============================================

import { describe, it, expect, vi, beforeEach } from "vitest";

// Simulation des dépendances serveur.
// Le mock du service doit fournir toutes les exportations que l'action importe.
vi.mock("../lib/utils/auth", () => ({
  getCurrentSession: vi.fn(),
}));

vi.mock("../lib/services/DirectoryService", () => ({
  searchInDirectory: vi.fn(),
  searchByName: vi.fn(),
  searchByNameLocal: vi.fn(),
  isValidBarcode: vi.fn(),
  cleanBarcode: vi.fn(),
}));

import { getCurrentSession } from "../lib/utils/auth";
import { searchByNameLocal, searchByName } from "../lib/services/DirectoryService";
import { searchProductsByName } from "../lib/actions/DirectoryActions";
import { SimplifiedDirectoryItem } from "../lib/types/scanTypes";

const mockGetCurrentSession = vi.mocked(getCurrentSession);
const mockSearchByNameLocal = vi.mocked(searchByNameLocal);
const mockSearchByName = vi.mocked(searchByName);

// Fabrique d'un résultat d'annuaire local
const localItem = (id: string, name: string, brand?: string): SimplifiedDirectoryItem => ({
  id,
  name,
  barcode: "",
  brand: brand ?? null,
});

// Fabrique d'un résultat OpenFoodFacts
const offItem = (code: string, name: string, brand?: string): SimplifiedDirectoryItem => ({
  id: code,
  barcode: code,
  name,
  brand: brand ?? null,
});

beforeEach(() => {
  vi.clearAllMocks();
  // Session simulée connectée — seule la présence de user compte pour l'action
  mockGetCurrentSession.mockResolvedValue({ user: { id: "user-test" } } as never);
});

describe("searchProductsByName — validation des entrées", () => {
  it("refuse une requête trop courte sans interroger les services", async () => {
    const result = await searchProductsByName("a");

    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
    expect(result.code).toBe("VALIDATION_ERROR");
    expect(mockSearchByNameLocal).not.toHaveBeenCalled();
    expect(mockSearchByName).not.toHaveBeenCalled();
  });

  it("refuse une limite hors bornes", async () => {
    const tropPetit = await searchProductsByName("pain", 0);
    const tropGrand = await searchProductsByName("pain", 50);

    expect(tropPetit.code).toBe("VALIDATION_ERROR");
    expect(tropGrand.code).toBe("VALIDATION_ERROR");
    expect(mockSearchByNameLocal).not.toHaveBeenCalled();
  });
});

describe("searchProductsByName — accès", () => {
  it("refuse l'appel sans session", async () => {
    mockGetCurrentSession.mockResolvedValue(null as never);

    const result = await searchProductsByName("pain");

    expect(result.success).toBe(false);
    expect(result.code).toBe("UNAUTHORIZED");
    expect(mockSearchByNameLocal).not.toHaveBeenCalled();
    expect(mockSearchByName).not.toHaveBeenCalled();
  });
});

describe("searchProductsByName — stratégie locale d'abord, OFF en repli", () => {
  it("renvoie les résultats locaux sans appeler OpenFoodFacts", async () => {
    const locaux = [localItem("uuid-1", "Pain complet", "Boulangerie")];
    mockSearchByNameLocal.mockResolvedValue(locaux);

    const result = await searchProductsByName("pain");

    expect(result.success).toBe(true);
    expect(result.data).toEqual(locaux);
    expect(mockSearchByNameLocal).toHaveBeenCalledWith("pain", 10);
    expect(mockSearchByName).not.toHaveBeenCalled();
  });

  it("bascule sur OpenFoodFacts quand la recherche locale ne renvoie rien", async () => {
    mockSearchByNameLocal.mockResolvedValue([]);
    const off = [offItem("3017620422003", "Pain de mie", "Barilla")];
    mockSearchByName.mockResolvedValue(off);

    const result = await searchProductsByName("pain de mie");

    expect(result.success).toBe(true);
    expect(result.data).toEqual(off);
    expect(mockSearchByName).toHaveBeenCalledWith("pain de mie", 10);
  });

  it("utilise la limite par défaut de 10", async () => {
    mockSearchByNameLocal.mockResolvedValue([]);

    await searchProductsByName("lait");

    expect(mockSearchByNameLocal).toHaveBeenCalledWith("lait", 10);
  });
});
