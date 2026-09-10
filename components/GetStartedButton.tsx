import Link from "next/link";
import styles from "@/app/Home.module.css";

/**
 * GetStartedButton - Bouton "Commencer" pour les utilisateurs non connectés.
 * 
 * Note: La page / redirige déjà automatiquement les utilisateurs connectés vers /installations.
 * Donc ce bouton ne s'affiche que pour les non-connectés et mène toujours vers /connexion.
 */
export default function GetStartedButton() {
  return (
    <Link href="/connexion" className={styles.ctaPrimary}>
      Commencer
    </Link>
  );
}
