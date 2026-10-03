"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Package, Users, Calendar, MapPin, Settings, Plus, Trash2, Edit, RefreshCw, Warehouse } from "lucide-react";
import { InstallationRole } from "@/lib/types";
import { StockItemWithExpiryStatus } from "@/lib/types/stockTypes";
import { adjustObjectQuantityByInstallationId, addObjectToInstallationSimple, removeObjectFromInstallation } from "@/lib/actions/ObjectActions";
import { getInstallationObjects } from "@/lib/actions/InstallationActions";
import styles from "./InstallationDetails.module.css";
import MembersModal from "./MembersModal";
import StockItemCard from "@/components/stock/StockItemCard";
import StockDetailsModal from "@/components/stock/StockDetailsModal";
import stockCardStyles from "@/components/stock/StockItemCard.module.css";

// Types pour les props
interface Installation {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  owner: { id: string; name: string | null };
  createdAt: Date;
  updatedAt: Date;
  userRole: InstallationRole | string;
  users: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  }[];
  objectCount: number;
}

// Types pour les objets
interface InstallationObject {
  id: string;
  objectDirectoryId: string;
  name: string;
  brand?: string | null;
  category?: string | null;
  description?: string | null;
  nutriscore?: string | null;
  imageUrl?: string | null;
  quantity: number;
  location?: string | null;
  expiryDate?: Date | null;
  openFoodFactsId?: string | null;
  isReadOnly?: boolean;
}

// Types pour les installations
interface InstallationInfo {
  id: string;
  name: string;
}

// Types pour les fonctions utilitaires
interface InstallationDetailsClientProps {
  installation: Installation;
  userRole: InstallationRole;
  sessionUserId: string;
  installationId: string;
  objects: InstallationObject[]; // ✅ Nouveauté : liste des objets
  userInstallations?: InstallationInfo[]; // Installations de l'utilisateur pour le déplacement
}

// Fonctions utilitaires (reproduites côté client)
function getRoleBadgeClass(role: string): string {
  switch (role) {
    case "owner":
      return "userRoleOwner";
    case "editor":
      return "userRoleEditor";
    case "viewer":
      return "userRoleViewer";
    default:
      return "userRoleViewer";
  }
}

function getHeaderRoleBadgeClass(role: string): string {
  switch (role) {
    case "owner":
      return "roleBadgeOwner";
    case "editor":
      return "roleBadgeEditor";
    case "viewer":
      return "roleBadgeViewer";
    default:
      return "roleBadgeViewer";
  }
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return "Non spécifiée";
  return new Date(date).toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Composant principal

export default function InstallationDetailsClient({
  installation,
  userRole,
  sessionUserId,
  installationId,
  objects: initialObjects, // ✅ Récupéré depuis le Server Component
  userInstallations = [], // Installations de l'utilisateur pour le déplacement
}: InstallationDetailsClientProps) {
  const router = useRouter();
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockItemWithExpiryStatus | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [objects, setObjects] = useState<InstallationObject[]>(initialObjects);
  // Horodatage figé au montage : les calculs d'expiration du rendu restent
  // purs (React Compiler). L'ancien Date.now()/new Date() dans le JSX
  // invalidait le rendu à chaque frame.
  const [renderTime] = useState(() => Date.now());
  const [isRefreshingObjects, setIsRefreshingObjects] = useState(false);

  // Fonction pour recharger les objets de l'installation via Server Action
  const refreshObjects = useCallback(async () => {
    setIsRefreshingObjects(true);
    
    try {
      // CACHE BUSTER: Passer un timestamp comme second paramètre
      // Next.js va traiter chaque appel avec un paramètre différent comme unique
      const cacheBuster = Date.now().toString();
      const result = await getInstallationObjects(installationId, cacheBuster);
      
      if (result.success && result.data?.objects) {
        setObjects(result.data.objects);
      } else {
        console.error("Erreur lors du chargement des objets:", result.error);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des objets:", error);
    } finally {
      setIsRefreshingObjects(false);
    }
  }, [installationId]);

  const handleItemClick = useCallback((item: StockItemWithExpiryStatus) => {
    setSelectedItem(item);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedItem(null);
  }, []);

  // Fonction pour déplacer un objet vers une autre installation
  const handleMoveObject = useCallback(async (
    fromInstallationId: string,
    toInstallationId: string,
    quantity: number
  ): Promise<boolean> => {
    if (!selectedItem || fromInstallationId !== installationId) return false;
    
    setIsMoving(true);
    
    try {
      // Si la quantité à déplacer est égale à la quantité totale, on supprime de l'installation actuelle
      if (quantity === selectedItem.quantity) {
        await removeObjectFromInstallation(selectedItem.id);
      } else {
        await adjustObjectQuantityByInstallationId(selectedItem.id, -quantity);
      }
      
      // Ajouter la quantité à la nouvelle installation
      await addObjectToInstallationSimple(
        toInstallationId,
        selectedItem.objectDirectoryId,
        quantity,
        selectedItem.location || undefined,
        selectedItem.expiryDate || undefined
      );
      
      // Rafraîchir uniquement la liste des objets (sans recharger toute la page)
      await refreshObjects();
      return true;
    } catch (error) {
      console.error('Erreur lors du déplacement:', error);
      alert('Erreur lors du déplacement de l\'objet');
      return false;
    } finally {
      setIsMoving(false);
    }
  }, [selectedItem, installationId, router]);

  return (
    <>
      <main className={styles.container}>
        <nav className={styles.breadcrumbs}>
          <Link href="/installations" className={styles.btnSecondary}>
            <ArrowLeft size={16} />
            Retour aux installations
          </Link>
        </nav>

        <header className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.headerLeft}>
              <h1 className={styles.headerTitle}>
                {installation?.name}
                <span className={`${styles.roleBadge} ${getHeaderRoleBadgeClass(userRole)}`}>
                  {userRole}
                </span>
              </h1>
              {installation?.description && (
                <p className={styles.headerDescription}>{installation.description}</p>
              )}
            </div>
            
            <div className={styles.headerActions}>
              {/* Bouton vers le stock */}
              <Link
                href={`/installations/${installationId}/stock`}
                className={`${styles.btn} ${styles.btnStock}`}
              >
                <Warehouse size={16} />
                Voir le stock
              </Link>
              
              {/* ✅ Bouton Rafraîchir DEPLACÉ ICI (toujours visible en haut) */}
              <button
                onClick={refreshObjects}
                className={`${styles.btn} ${styles.btnSecondary}`}
                title="Rafraîchir la liste des objets"
                disabled={isRefreshingObjects}
              >
                <RefreshCw size={16} className={isRefreshingObjects ? styles.refreshing : ''} />
                {isRefreshingObjects ? 'Rafraîchissement...' : 'Rafraîchir'}
              </button>
              
              {userRole !== "viewer" && (
                <Link
                  href={`/installations/${installationId}/edit`}
                  className={`${styles.btn} ${styles.btnSecondary}`}
                >
                  <Edit size={16} />
                  Modifier
                </Link>
              )}
              {userRole === "owner" && (
                <button
                  onClick={() => setIsMembersModalOpen(true)}
                  className={`${styles.btn} ${styles.btnSecondary}`}
                >
                  <Users size={16} />
                  Gérer les membres
                </button>
              )}
              {userRole === "owner" && (
                <Link
                  href={`/installations/${installationId}/settings`}
                  className={`${styles.btn} ${styles.btnSecondary}`}
                >
                  <Settings size={16} />
                  Paramètres
                </Link>
              )}
            </div>
          </div>
        </header>

        {/* Informations générales */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Informations générales</h2>
          
          <div className={styles.infoGrid}>
            <div className={styles.infoCard}>
              <div className={styles.infoCardHeader}>
                <Users size={18} />
                <span>Propriétaire</span>
              </div>
              <div className={styles.infoCardValue}>
                {installation?.owner?.name || "Inconnu"}
              </div>
            </div>
            
            <div className={styles.infoCard}>
              <div className={styles.infoCardHeader}>
                <Package size={18} />
                <span>Nombre d'objets</span>
              </div>
              <div className={styles.infoCardValue}>
                {installation?.objectCount || 0}
              </div>
            </div>
            
            <div className={styles.infoCard}>
              <div className={styles.infoCardHeader}>
                <Calendar size={18} />
                <span>Date de création</span>
              </div>
              <div className={styles.infoCardValue}>
                {formatDate(installation?.createdAt)}
              </div>
            </div>
            
            <div className={styles.infoCard}>
              <div className={styles.infoCardHeader}>
                <Settings size={18} />
                <span>Date de modification</span>
              </div>
              <div className={styles.infoCardValue}>
                {formatDate(installation?.updatedAt)}
              </div>
            </div>
          </div>
        </section>

        {/* Utilisateurs */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Utilisateurs</h2>
            <p className={styles.sectionSubtitle}>
              {installation?.users?.length || 0} utilisateur(s) ont accès à cette installation
            </p>
          </div>
          
          {installation?.users?.length === 0 ? (
            <div className={styles.emptyState}>
              <h3>Aucun utilisateur partagé</h3>
              <p>Cette installation n'est accessible qu'à toi pour le moment.</p>
            </div>
          ) : (
            <div className={styles.usersList}>
              {installation?.users?.map((user, index) => (
                <div key={index} className={styles.userCard}>
                  <div className={styles.userInfo}>
                    <div>
                      <div>{user.name || "Utilisateur inconnu"}</div>
                      {user.email && <div className={styles.userEmail}>{user.email}</div>}
                    </div>
                  </div>
                  <span className={`${styles.userRoleBadge} ${getRoleBadgeClass(user.role as InstallationRole)}`}>
                    {user.role}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Objets */}
        <section className={styles.section}>
          <div className={styles.objectsHeader}>
            <h2 className={styles.sectionTitle}>Objets dans cette installation</h2>
            <div className={styles.objectsActions}>
              {userRole !== "viewer" && (
                <>
                  <Link
                    href={`/installations/${installationId}/add`}
                    className={`${styles.btn} ${styles.btnPrimary}`}
                  >
                    <Plus size={16} />
                    Ajouter un objet
                  </Link>
                  <Link
                    href={`/installations/${installationId}/objects/scan`}
                    className={`${styles.btn} ${styles.btnSecondary}`}
                  >
                    Scanner un code-barres
                  </Link>
                </>
              )}
            </div>
          </div>
          
          {/* Affichage en cartes pour chaque objet */}
          <div className={styles.objectsGrid}>
            {objects.length === 0 ? (
              <div className={stockCardStyles.emptyState}>
                {installation?.objectCount === 0
                  ? "Aucun objet dans cette installation"
                  : "Aucun objet trouvé"
                }
              </div>
            ) : (
              objects.map((obj) => (
                // Converter obj en StockItemWithExpiryStatus pour StockItemCard
                <StockItemCard
                  key={obj.id}
                  item={{
                    id: obj.id,
                    objectDirectoryId: obj.objectDirectoryId,
                    barcode: "", // ✅ Ajouté (non disponible dans InstallationObject)
                    name: obj.name,
                    brand: obj.brand || undefined,
                    category: obj.category || undefined,
                    description: obj.description || undefined,
                    quantity: obj.quantity,
                    unit: undefined,
                    location: obj.location || undefined,
                    purchaseDate: null,
                    expiryDate: obj.expiryDate || null,
                    lotNumber: undefined,
                    price: null,
                    notes: undefined,
                    nutriscore: obj.nutriscore || undefined,
                    imageUrl: obj.imageUrl || undefined,
                    shopId: undefined,
                    shopName: undefined,
                    installationId: installationId,
                    installationName: installation?.name || "",
                    isReadOnly: false, // ✅ Forcé à false pour permettre la gestion de stock dans l'installation
                    hasEditPermission: userRole !== "viewer", // ✅ Ajouté (basé sur le rôle)
                    isExpired: obj.expiryDate ? new Date(obj.expiryDate) < new Date(renderTime) : false,
                    expiryStatus: obj.expiryDate ? (
                      new Date(obj.expiryDate) < new Date(renderTime) ? "expired" : 
                      new Date(obj.expiryDate) <= new Date(renderTime + 30 * 24 * 60 * 60 * 1000) ? "warning" : "normal"
                    ) : "no_date",
                    daysUntilExpiry: obj.expiryDate ? Math.floor((new Date(obj.expiryDate).getTime() - renderTime) / (1000 * 60 * 60 * 24)) : null,
                    createdAt: new Date(renderTime), // ✅ Ajouté (valeur par défaut)
                    updatedAt: new Date(renderTime), // ✅ Ajouté (valeur par défaut)
                  }}
                  onDetailsClick={handleItemClick}
                />
              ))
            )}
          </div>
          
          {/* Afficher lemptyState UNIQUEMENT si objectCount === 0 ET objects.length === 0 */}
          {installation?.objectCount === 0 && objects.length === 0 && (
            <div className={styles.emptyState} style={{ marginTop: "1rem" }}>
              <h3>Aucun objet dans cette installation</h3>
              <p>
                Commencez à ajouter des objets pour gérer votre stock.
                Vous pouvez ajouter des objets manuellement ou scanner leurs codes-barres.
              </p>
              {userRole !== "viewer" && (
                <div className={styles.objectsActions}>
                  <Link
                    href={`/installations/${installationId}/add`}
                    className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSmall}`}
                  >
                    <Plus size={14} />
                    Ajouter maintenant
                  </Link>
                </div>
              )}
            </div>
          )}
        </section>
      </main>
      
      {/* Modal pour gérer les membres */}
      {isMembersModalOpen && (
        <MembersModal
          installationId={installationId}
          members={installation?.users?.map((user) => ({
            user: { id: user.id, email: user.email, name: user.name || undefined },
            role: user.role,
          })) || []}
          currentUserId={sessionUserId}
          onClose={() => setIsMembersModalOpen(false)}
        />
      )}

      {/* Modal pour afficher les détails d'un objet */}
      {selectedItem && (
        <StockDetailsModal
          item={selectedItem}
          onClose={handleCloseModal}
          onSave={refreshObjects}
          onMove={handleMoveObject}
          onRefresh={refreshObjects}
          installations={userInstallations}
          currentInstallationId={installationId}
        />
      )}
    </>
  );
}