import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth/auth";
import { getAuthHeaders } from "@/lib/utils/auth";
import { getInstallationById, checkInstallationAccess } from "@/lib/actions/InstallationActions";
import { InstallationRole } from "@/lib/types";
import { ArrowLeft, Package, Users, Calendar, MapPin, Settings, Plus, Trash2, Edit } from "lucide-react";
import styles from "./InstallationDetails.module.css";

// Fonction pour obtenir la classe CSS du badge de rôle
function getRoleBadgeClass(role: InstallationRole): string {
  switch (role) {
    case "owner":
      return styles.userRoleOwner;
    case "editor":
      return styles.userRoleEditor;
    case "viewer":
      return styles.userRoleViewer;
    default:
      return styles.userRoleViewer;
  }
}

// Fonction pour obtenir la classe CSS du badge de rôle dans l'en-tête
function getHeaderRoleBadgeClass(role: InstallationRole): string {
  switch (role) {
    case "owner":
      return styles.roleBadgeOwner;
    case "editor":
      return styles.roleBadgeEditor;
    case "viewer":
      return styles.roleBadgeViewer;
    default:
      return styles.roleBadgeViewer;
  }
}

// Fonction pour formater la date
function formatDate(date: Date | null | undefined): string {
  if (!date) return "Non spécifiée";
  return new Date(date).toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Fonction pour obtenir l'état de péremption
function getExpiryStatus(expiryDate: Date | null | undefined): { class: string; text: string } {
  if (!expiryDate) return { class: "", text: "Non spécifiée" };
  
  const now = new Date();
  const expiry = new Date(expiryDate);
  const daysDiff = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (expiry < now) {
    return { class: styles.expiryExpired, text: `Périmé (${daysDiff} jours)` };
  } else if (daysDiff <= 7) {
    return { class: styles.expirySoon, text: `Bientôt périmé (${daysDiff} jours)` };
  } else if (daysDiff <= 30) {
    return { class: styles.expirySoon, text: `Périme dans ${daysDiff} jours` };
  } else {
    return { class: styles.expiryNormal, text: `Valable jusqu'au ${formatDate(expiry)}` };
  }
}

export default async function InstallationDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  
  // Vérifier la session utilisateur
  const headers = await getAuthHeaders();
  const session = await auth.api.getSession({ headers });

  if (!session?.user) {
    redirect("/connexion");
  }

  // Vérifier l'accès à l'installation
  const accessResult = await checkInstallationAccess(id);
  
  if (!accessResult.success || !accessResult.data?.hasAccess) {
    redirect("/installations?error=access_denied");
  }

  // Récupérer les détails de l'installation
  const installationResult = await getInstallationById(id);
  
  if (!installationResult.success) {
    redirect("/installations?error=not_found");
  }

  const installation = installationResult.data?.installation;
  const userRole = installation?.userRole as InstallationRole;

  // Calculer le nombre d'objets périmés ou proches de l'être
  const objects = []; // À remplacer par les vrais objets quand on aura le service
  
  return (
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
            {userRole === "owner" && (
              <Link
                href={`/installations/${id}/edit`}
                className={`${styles.btn} ${styles.btnSecondary}`}
              >
                <Edit size={16} />
                Modifier
              </Link>
            )}
            {userRole === "owner" && (
              <Link
                href={`/installations/${id}/settings`}
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
            {installation?.users?.map((user) => (
              <div key={user.id} className={styles.userCard}>
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
              <Link
                href={`/installations/${id}/objects/add`}
                className={`${styles.btn} ${styles.btnPrimary}`}
              >
                <Plus size={16} />
                Ajouter un objet
              </Link>
            )}
            {userRole !== "viewer" && (
              <Link
                href={`/installations/${id}/objects/scan`}
                className={`${styles.btn} ${styles.btnSecondary}`}
              >
                Scanner un code-barres
              </Link>
            )}
          </div>
        </div>
        
        {installation?.objectCount === 0 ? (
          <div className={styles.emptyState}>
            <h3>Aucun objet dans cette installation</h3>
            <p>
              Commencez à ajouter des objets pour gérer votre stock.
              Vous pouvez ajouter des objets manuellement ou scanner leurs codes-barres.
            </p>
            {userRole !== "viewer" && (
              <div className={styles.objectsActions} style={{ marginTop: "1rem" }}>
                <Link
                  href={`/installations/${id}/objects/add`}
                  className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSmall}`}
                >
                  <Plus size={14} />
                  Ajouter maintenant
                </Link>
              </div>
            )}
          </div>
        ) : (
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
                    Aucun objet trouvé
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
