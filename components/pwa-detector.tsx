"use client";

import { useEffect } from "react";
import { isPWA } from "@/lib/utils/pwa";

/**
 * PWADetector - Composant qui détecte si l'application est installée en PWA
 * et stocke cette information dans un cookie pour que le serveur puisse l'utiliser.
 * 
 * Ce composant doit être inclus dans le layout racine ou une page qui se charge tôt.
 */
export default function PWADetector() {
  useEffect(() => {
    // 🔍 1. On vérifie si c'est une PWA
    const isPWAMode = isPWA();

    // 🔍 2. Si c'est déjà marqué dans un cookie, on ne fait rien
    if (document.cookie.includes("x-pwa-detected=true")) {
      return;
    }

    // ✅ 3. Si on est en PWA, on définit un cookie permanent
    if (isPWAMode) {
      const expires = new Date();
      // 🔧 Cookie valable 1 an
      expires.setDate(expires.getDate() + 365);
      
      document.cookie = `
        x-pwa-detected=true;
        expires=${expires.toUTCString()};
        path=/;
        SameSite=Lax;
        ${process.env.NODE_ENV === "production" ? "Secure;" : ""}
      `.replace(/\s+/g, " ").trim();

      console.log("📱 [PWA] Détecté en mode PWA. Cookie x-pwa-detected défini.");
    }
  }, []);

  // 🎯 Ce composant ne rend rien
  return null;
}
