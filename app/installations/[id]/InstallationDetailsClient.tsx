"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Package, Users, Calendar, MapPin, Settings, Plus, Trash2, Edit, RefreshCw } from "lucide-react";
import { InstallationRole } from "@/lib/types";
import styles from "./InstallationDetails.module.css";
import MembersModal from "./MembersModal";

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

// Types pour les fonctions utilitaires
interface InstallationDetailsClientProps {
  installation: Installation;
  userRole: InstallationRole;
  sessionUserId: string;
  installationId: string;
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
}: InstallationDetailsClientProps) {
  const router = useRouter();
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const objects = []; // À remplacer par les vrais objets quand on aura le service

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
              {/* Bouton Rafraîchir (pour tous les rôles) */}
              <button
                onClick={() => router.refresh()}
                className={`${styles.btn} ${styles.btnSecondary}`}
                title="Rafraîchir la liste des objets"
              >
                <RefreshCw size={16} />
                Rafraîchir
              </button>
              
              {userRole !== "viewer" && (
                <Link
                  href={`/installations/${installationId}/objects/add`}
                  className={`${styles.btn} ${styles.btnPrimary}`}
                >
                  <Plus size={16} />
                  Ajouter un objet
                </Link>
              )}
              {userRole !== "viewer" && (
                <Link
                  href={`/installations/${installationId}/objects/scan`}
                  className={`${styles.btn} ${styles.btnSecondary}`}
                >
                  Scanner un code-barres
                </Link>
              )}
            </div>
          </div>
          
          {/* ✅ Toujours afficher le tableau (même vide) pour éviter les problèmes de rendu */}
          <table className={styles.tableContainer}>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Quantité</th>
                <th>Emplacement</th>
                <th>Péremption</th>
                <th className={styles.tableActions}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* Here we would display the actual objects */}
              {objects.length === 0 && (
                <tr>
                  <td colSpan={5} className={styles.emptyState}>
                    {installation?.objectCount === 0
                      ? "Aucun objet dans cette installation"
                      : "Chargement des objets..."
                    }
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          
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
                    href={`/installations/${installationId}/objects/add`}
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
    </>
  );
}