import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth/auth";
import { getAuthHeaders } from "@/lib/utils/auth";
import { db } from "@/lib/db/drizzle";
import {
  objectInstallation,
  objectDirectory,
  userInstallations,
  installations,
  objectTypes,
  shops,
} from "@/lib/db/schema";
import { ObjectGlobalCard, ObjectInstanceTable } from "@/components/objects";
import { Plus, Search, Package } from "lucide-react";
import styles from "./Objects.module.css";
import { and, eq, inArray } from "drizzle-orm";

// Fonction pour formater une date
function formatDate(date: Date | null | undefined): string {
  if (!date) return "Non spécifiée";
  return new Date(date).toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function ObjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; type?: string }>;
}) {
  const { search: searchParam, type: typeParam } = await searchParams;

  // Vérifier la session utilisateur
  const headers = await getAuthHeaders();
  const session = await auth.api.getSession({ headers });

  if (!session?.user) {
    redirect("/connexion");
  }

  // Récupérer les installations de l'utilisateur
  const userInstallationsData = await db
    .select({
      installationId: userInstallations.installationId,
    })
    .from(userInstallations)
    .where(eq(userInstallations.userId, session.user.id));

  const installationIds = userInstallationsData.map((ui) => ui.installationId);

  if (!installationIds.length) {
    return (
      <main className={styles.container}>
        <div className={styles.emptyMessage}>
          <h2>Tu n'as pas encore d'installation</h2>
          <p>
            Commence par créer une installation pour ajouter des objets à ton garde-manger.
          </p>
          <Link href="/installations/new" className={`${styles.btn} ${styles.btnPrimary}`}>
            <Plus size={20} />
            Créer une installation
          </Link>
        </div>
      </main>
    );
  }

  // Récupérer tous les objets globaux présents dans les installations de l'utilisateur
  const objectsResult = await db
    .select({
      id: objectDirectory.id,
      name: objectDirectory.name,
      description: objectDirectory.description,
      nutriscore: objectDirectory.nutriscore,
      brand: objectDirectory.brand,
      openFoodFactsId: objectDirectory.openFoodFactsId,
      objectTypeId: objectDirectory.objectTypeId,
      objectTypeName: objectTypes.name,
      objectTypeIcon: objectTypes.icon,
    })
    .from(objectInstallation)
    .where(inArray(objectInstallation.installationId, installationIds))
    .innerJoin(
      objectDirectory,
      eq(objectDirectory.id, objectInstallation.objectDirectoryId)
    )
    .leftJoin(
      objectTypes,
      eq(objectTypes.id, objectDirectory.objectTypeId)
    )
    .groupBy(
      objectDirectory.id,
      objectDirectory.name,
      objectDirectory.description,
      objectDirectory.nutriscore,
      objectDirectory.brand,
      objectDirectory.openFoodFactsId,
      objectDirectory.objectTypeId,
      objectTypes.name,
      objectTypes.icon
    );

  // Pour chaque objet global, calculer la quantité totale et récupérer les métadonnées
  const objectsWithInfo = await Promise.all(
    objectsResult.map(async (obj) => {
      // Calculer la quantité totale de cet objet dans toutes les installations
      const totalQuantityResult = await db
        .select({ quantity: objectInstallation.quantity })
        .from(objectInstallation)
        .where(
          and(
            eq(objectInstallation.objectDirectoryId, obj.id),
            inArray(objectInstallation.installationId, installationIds)
          )
        );

      const totalQuantity = totalQuantityResult.reduce(
        (sum, item) => sum + item.quantity,
        0
      );

      // Récupérer l'URL de l'image depuis OpenFoodFacts si disponible
      let imageUrl: string | null = null;
      if (obj.openFoodFactsId) {
        try {
          // Essayons de récupérer l'image depuis OpenFoodFacts
          // Note: En pratique, il faudrait appeler l'API ou stocker l'URL en base
          // Pour l'instant, on génère une URL directe (que OpenFoodFacts utilise)
          imageUrl = `https://images.openfoodfacts.org/images/products/${obj.openFoodFactsId}/front_fr.240.jpg`;
          // Vérifier si l'image existe (optionnel, mais évite les erreurs 404)
          const response = await fetch(imageUrl, { method: "HEAD" });
          if (!response.ok) {
            imageUrl = null;
          }
        } catch {
          imageUrl = null;
        }
      }

      return {
        id: obj.id,
        name: obj.name,
        description: obj.description,
        nutriscore: obj.nutriscore || null,
        brand: obj.brand || null,
        imageUrl,
        objectType: obj.objectTypeName || null,
        objectTypeIcon: obj.objectTypeIcon,
        totalQuantity,
      };
    })
  );

  // Filtrer par recherche et type
  let filteredObjects = objectsWithInfo;

  if (searchParam) {
    const searchLower = searchParam.toLowerCase();
    filteredObjects = filteredObjects.filter(
      (obj) =>
        obj.name.toLowerCase().includes(searchLower) ||
        (obj.brand?.toLowerCase().includes(searchLower)) ||
        (obj.objectType?.toLowerCase().includes(searchLower))
    );
  }

  if (typeParam) {
    filteredObjects = filteredObjects.filter(
      (obj) => obj.objectType?.toLowerCase() === typeParam.toLowerCase()
    );
  }

  // Récupérer tous les types d'objets disponibles
  const allTypes = await db
    .select({ name: objectTypes.name })
    .from(objectTypes)
    .orderBy(objectTypes.name);

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1>Tous mes objets</h1>
          <p className={styles.headerDescription}>
            Gère tes produits dans toutes tes installations.
          </p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/objects/new" className={`${styles.btn} ${styles.btnPrimary}`}>
            <Plus size={20} />
            Ajouter un objet
          </Link>
          <Link href="/objects/scan" className={`${styles.btn} ${styles.btnSecondary}`}>
            <Search size={20} />
            Scanner un code-barres
          </Link>
        </div>
      </header>

      {/* Barre de recherche */}
      <div className={styles.searchContainer}>
        <input
          type="text"
          placeholder="Rechercher un objet..."
          defaultValue={searchParam || ""}
          className={styles.searchInput}
        />
      </div>

      {/* Filtres */}
      <div className={styles.filters}>
        <div className={styles.filterLabel}>
          <span>Filtrer par type:</span>
          <select
            defaultValue={typeParam || ""}
            className={styles.filterSelect}
          >
            <option value="">Tous les types</option>
            {allTypes.map((type) => (
              <option key={type.name} value={type.name}>
                {type.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Liste des objets */}
      {filteredObjects.length === 0 ? (
        <div className={styles.emptyMessage}>
          <h2>Aucun objet trouvé</h2>
          <p>
            {searchParam || typeParam
              ? "Aucun objet ne correspond à vos critères de recherche."
              : "Tu n'as pas encore d'objets dans tes installations."}
          </p>
          <Link href="/objects/new" className={`${styles.btn} ${styles.btnPrimary}`}>
            <Plus size={20} />
            Ajouter ton premier objet
          </Link>
        </div>
      ) : (
        <div className={styles.objectsGrid}>
          {filteredObjects.map((obj) => (
            <div key={obj.id} className={styles.cardContainer}>
              <ObjectGlobalCard
                id={obj.id}
                name={obj.name}
                imageUrl={obj.imageUrl}
                nutriscore={obj.nutriscore}
                brand={obj.brand}
                objectType={obj.objectType}
                totalQuantity={obj.totalQuantity}
                compact={false}
                showDetailsLink={true}
              />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
