"use client";

import { Home, Users, Package } from "lucide-react";
import Link from "next/link";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/shared";
import styles from "./InstallationCard.module.css";

// Props pour la carte d'installation
export interface InstallationCardProps {
  id: string;
  name: string;
  description?: string | null;
  role: string;
  ownerName?: string | null;
  objectCount?: number;
  userCount?: number;
  showActions?: boolean;
}

// Rôle en français
export function getRoleLabel(role: string): string {
  const roles: Record<string, string> = {
    owner: "Propriétaire",
    editor: "Éditeur",
    viewer: "Lecteur",
  };
  return roles[role] || role;
}

export default function InstallationCard({
  id,
  name,
  description,
  role,
  ownerName,
  objectCount = 0,
  userCount = 0,
  showActions = true,
}: InstallationCardProps) {
  return (
    <Card variant="default" shadow="sm" hoverable={true} className={styles.card}>
      <CardHeader className={styles.header}>
        <div className={styles.titleContainer}>
          <Home className={styles.titleIcon} size={24} />
          <div className={styles.titleText}>
            <h3 className={styles.name}>{name}</h3>
            {ownerName && (
              <p className={styles.owner}>Propriétaire: {ownerName}</p>
            )}
          </div>
        </div>
        <span className={`${styles.role} ${styles[role]}`}>
          {getRoleLabel(role)}
        </span>
      </CardHeader>

      <CardContent className={styles.content}>
        {description && (
          <p className={styles.description}>{description}</p>
        )}
        <div className={styles.stats}>
          <div className={styles.stat}>
            <Users size={16} className={styles.statIcon} />
            <span>{userCount} utilisateur{userCount > 1 ? "s" : ""}</span>
          </div>
          <div className={styles.stat}>
            <Package size={16} className={styles.statIcon} />
            <span>{objectCount} objet{objectCount > 1 ? "s" : ""}</span>
          </div>
        </div>
      </CardContent>

      {showActions && (
        <CardFooter className={styles.footer}>
          <Link
            href={`/installations/${id}`}
            className={`${styles.action} ${styles.view}`}
          >
            Voir les détails
          </Link>
        </CardFooter>
      )}
    </Card>
  );
}
