"use client";

import Link from "next/link";
import { useSession } from "@/context/SessionProvider";
import { signout } from "@/lib/actions/AuthActions";
import { useRouter } from "next/navigation";
import styles from "./AuthButtons.module.css";

/**
 * AuthButtons - Composant qui affiche des boutons en fonction de l'état de connexion
 * Utilise le hook useSession() pour être réactif aux changements de session.
 * Déconnexion via la chaîne ACS (action signout) — Better-Auth supprime la
 * session et le cookie.
 */
export default function AuthButtons() {
  const { user } = useSession();
  const isConnected = !!user;
  const router = useRouter();

  console.log("🔄 [AuthButtons] Rendering. Session active:", isConnected, {
    userEmail: user?.email,
  });

  const handleLogout = async () => {
    console.log("🔐 [AuthButtons] Clic sur Se déconnecter. Début de la déconnexion...");
    try {
      await signout();
      console.log("✅ [AuthButtons] Déconnexion réussie. Redirection vers /");
      router.push("/");
    } catch (error) {
      console.error("❌ [AuthButtons] Échec de la déconnexion:", error);
    }
  };

  return (
    <div className={styles.authButtonsContainer}>
      {isConnected ? (
        <>
          {/* Bouton Déconnexion (visible si connecté) - Appelle signout() et redirige vers / */}
          <button
            onClick={handleLogout}
            className={styles.authButtonLogout}
          >
            Se déconnecter
          </button>

          {/* Bouton Profil (visible si connecté) */}
          <Link href="/profil" className={styles.authButtonSecondary}>
            Mon profil
          </Link>
        </>
      ) : (
        <>
          {/* Bouton Connexion (visible si déconnecté) */}
          <Link href="/connexion" className={styles.authButtonPrimary}>
            Se connecter
          </Link>

          {/* Bouton Inscription (visible si déconnecté) */}
          <Link href="/inscription" className={styles.authButtonSecondary}>
            S'inscrire
          </Link>
        </>
      )}
    </div>
  );
}
