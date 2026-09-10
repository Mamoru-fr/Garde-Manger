import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/utils/auth";
import styles from "@/app/Home.module.css";

/**
 * GetStartedButton - Bouton "Commencer" qui redirige intelligemment :
 * - Vers /installations si connecté (cookie Better Auth valide)
 * - Vers /connexion si déconnecté (cookie absent/expiré)
 * 
 * Utilise getCurrentSession() côté serveur pour éviter les problèmes de sync client/serveur.
 */
export default async function GetStartedButton() {
  const session = await getCurrentSession();
  const isConnected = !!session?.user;

  console.log("🔐 [GetStartedButton - SERVER] Session remise à jour:", {
    hasUser: isConnected,
    userEmail: session?.user?.email,
  });

  // Redirige directement si connecté (pour éviter d'afficher le bouton)
  if (isConnected) {
    console.log("✅ [GetStartedButton - SERVER] Cookie valide → redirection vers /installations");
    redirect("/installations");
  }

  console.log("❌ [GetStartedButton - SERVER] Pas de cookie → affichage du bouton vers /connexion");

  return (
    <Link href="/connexion" className={styles.ctaPrimary}>
      Commencer
    </Link>
  );
}
