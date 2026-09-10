"use client";

import Link from "next/link";
import { useSession } from "@/context/SessionProvider";

/**
 * AuthButtons - Composant qui affiche des boutons en fonction de l'état de connexion
 * Utilise le hook useSession() pour être réactif aux changements de session.
 */
export default function AuthButtons() {
  const { user } = useSession();
  const isConnected = !!user;

  return (
    <div className="flex gap-2">
      {isConnected ? (
        <>
          {/* Bouton Déconnexion (visible si connecté) */}
          <Link
            href="/deconnexion"
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
          >
            Se déconnecter
          </Link>

          {/* Bouton Profil (visible si connecté) */}
          <Link
            href="/profil"
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            Mon profil
          </Link>
        </>
      ) : (
        <>
          {/* Bouton Connexion (visible si déconnecté) */}
          <Link
            href="/connexion"
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
          >
            Se connecter
          </Link>

          {/* Bouton Inscription (visible si déconnecté) */}
          <Link
            href="/inscription"
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
          >
            S&apos;inscrire
          </Link>
        </>
      )}
    </div>
  );
}
