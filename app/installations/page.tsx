import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth/auth";
import { getAuthHeaders } from "@/lib/utils/auth";
import { getUserInstallations } from "@/lib/actions/InstallationActions";
import { InstallationRole } from "@/lib/types";
import { Home, Plus, Package, Users } from "lucide-react";
import styles from "./Installations.module.css";

export default async function InstallationsPage() {
  // Vérifier la session utilisateur
  const headers = await getAuthHeaders();
  const session = await auth.api.getSession({ headers });

  if (!session?.user) {
    redirect("/connexion");
  }

  // Récupérer les installations de l'utilisateur
  const installationsResult = await getUserInstallations();

  if (!installationsResult.success) {
    console.error("Erreur lors de la récupération des installations:", installationsResult.error);
  }

  const installations = installationsResult.data?.installations || [];

  // Déterminer le badge de rôle
  const getRoleBadge = (role: InstallationRole) => {
    switch (role) {
      case "owner":
        return <span className={styles.roleBadgeOwner}>{role}</span>;
      case "editor":
        return <span className={styles.roleBadgeEditor}>{role}</span>;
      case "viewer":
        return <span className={styles.roleBadgeViewer}>{role}</span>;
      default:
        return <span className={styles.roleBadge}>{role}</span>;
    }
  };

  return (
    <main className={styles.container}>
      <div className={styles.header}>
        <h1>Mes Installations</h1>
        <Link href="/installations/new" className={`${styles.btn} ${styles.btnPrimary}`}>
          <Plus size={20} />
          Nouvelle Installation
        </Link>
      </div>

      {installations.length === 0 ? (
        <div className={styles.emptyMessage}>
          <h2>Tu n'as pas encore d'installation</h2>
          <p>
            Commence par créer une nouvelle installation pour gérer ton garde-manger, tes placards ou tes frigos.
            Une installation représente un espace de stockage où tu peux ajouter et gérer tes produits.
          </p>
          <Link href="/installations/new" className={`${styles.btn} ${styles.btnPrimary}`}>
            <Plus size={20} />
            Créer ma première installation
          </Link>
        </div>
      ) : (
        <div className={styles.installationsGrid}>
          {installations.map((installation) => (
            <article key={installation.id} className={styles.installationCard}>
              <div className={styles.installationHeader}>
                <h2 className={styles.installationName}>
                  <Link href={`/installations/${installation.id}`}>
                    {installation.name}
                  </Link>
                </h2>
                {getRoleBadge(installation.role as InstallationRole)}
              </div>

              {installation.description && (
                <p className={styles.installationDescription}>{installation.description}</p>
              )}

              <div className={styles.installationMeta}>
                <div className={styles.metaItem}>
                  <Package size={16} />
                  <span>
                    <span className={styles.objectsCount}>{installation.objectCount}</span> objets
                  </span>
                </div>
                <div className={styles.metaItem}>
                  <Users size={16} />
                  <span>Propriétaire: {installation.owner.name || "Inconnu"}</span>
                </div>
              </div>

              <div className={styles.actions}>
                <Link
                  href={`/installations/${installation.id}`}
                  className={styles.actionBtn}
                >
                  Voir
                </Link>
                {installation.role === "owner" && (
                  <Link
                    href={`/installations/${installation.id}/edit`}
                    className={styles.actionBtn}
                  >
                    Modifier
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
