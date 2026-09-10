"use client";

import { useRouter } from "next/navigation";
import { useSession } from "@/context/SessionProvider";
import styles from "@/app/Home.module.css";

/**
 * GetStartedButton - Bouton "Commencer" qui redirige intelligemment :
 * - Vers /installations si connecté (cookie Better Auth valide)
 * - Vers /connexion si déconnecté (cookie absent/expiré)
 */
export default function GetStartedButton() {
  const { user } = useSession();
  const router = useRouter();

  const handleClick = () => {
    console.log("🔐 [GetStartedButton] Clic sur le bouton. État de la session:", {
      hasUser: !!user,
      userEmail: user?.email,
    });

    if (user) {
      console.log("✅ [GetStartedButton] Cookie valide → redirection vers /installations");
      router.push("/installations");
    } else {
      console.log("❌ [GetStartedButton] Pas de cookie ou expiré → redirection vers /connexion");
      router.push("/connexion");
    }
  };

  console.log("🔄 [GetStartedButton] Rendering. Session active:", !!user);

  return (
    <button onClick={handleClick} className={styles.ctaPrimary}>
      Commencer
    </button>
  );
}
