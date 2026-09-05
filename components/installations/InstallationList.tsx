"use client";

import { useEffect, useState } from "react";
import InstallationCard from "./InstallationCard";
import { getUserInstallations } from "@/lib/actions/InstallationActions";
import { Button } from "@/components/shared";
import Link from "next/link";
import { Home } from "lucide-react";
import styles from "./InstallationList.module.css";

// Props pour la liste des installations
export interface InstallationListProps {
  initialInstallations?: {
    id: string;
    name: string;
    description: string | null;
    role: string;
    owner: { id: string; name: string | null };
    objectCount: number;
  }[];
}

export default function InstallationList({ initialInstallations }: InstallationListProps) {
  const [installations, setInstallations] = useState(initialInstallations || []);
  const [isLoading, setIsLoading] = useState(!initialInstallations);
  const [error, setError] = useState<string | null>(null);

  // Charger les installations
  useEffect(() => {
    if (initialInstallations) return;
    
    const fetchInstallations = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await getUserInstallations();
        
        if (result.success && result.data) {
          setInstallations(result.data.installations);
        } else {
          setError(result.error || "Erreur lors du chargement");
        }
      } catch (err) {
        setError("Erreur lors du chargement des installations");
        console.error("[InstallationList] Erreur:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchInstallations();
  }, [initialInstallations]);

  // Renvoyer le contenu
  if (error) {
    return (
      <div className={styles.error}>
        <p>{error}</p>
        <Button onClick={() => window.location.reload()}>
          Réessayer
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <p>Chargement des installations...</p>
      </div>
    );
  }

  if (installations.length === 0) {
    return (
      <div className={styles.empty}>
        <Home size={48} className={styles.emptyIcon} />
        <h3>Tu n'as aucune installation</h3>
        <p>Commence par créer ta première installation pour gérer ton garde-manger.</p>
        <Link href="/installations/new">
          <Button variant="primary">Créer une installation</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.list}>
      {installations.map((installation) => (
        <InstallationCard
          key={installation.id}
          id={installation.id}
          name={installation.name}
          description={installation.description}
          role={installation.role}
          ownerName={installation.owner.name}
          objectCount={installation.objectCount}
          userCount={0} // TODO : Récupérer le nombre d'utilisateurs
        />
      ))}
    </div>
  );
}
