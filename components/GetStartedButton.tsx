"use client";

import { useRouter } from "next/navigation";
import { useSession } from "@/context/SessionProvider";

/**
 * GetStartedButton - Bouton "Commencer" qui redirige intelligemment :
 * - Vers /installations si connecté (cookie Better Auth valide)
 * - Vers /connexion si déconnecté (cookie absent/expiré)
 */
export default function GetStartedButton() {
  const { user } = useSession();
  const router = useRouter();

  const handleClick = () => {
    if (user) {
      // ✅ Cookie valide → redirige vers installations
      router.push("/installations");
    } else {
      // ❌ Pas de cookie ou expiré → redirige vers connexion
      router.push("/connexion");
    }
  };

  return (
    <button
      onClick={handleClick}
      className="px-6 py-3 bg-[#FF8C42] text-white rounded-lg font-medium hover:bg-[#FF702A] transition-colors shadow-md"
    >
      Commencer
    </button>
  );
}
