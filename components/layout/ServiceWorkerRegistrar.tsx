"use client";

import { useEffect, useState } from "react";
import { registerServiceWorker } from "@/scripts/register-sw";
import styles from "./ServiceWorkerRegistrar.module.css";

export function ServiceWorkerRegistrar() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    // Enregistrer le Service Worker
    registerServiceWorker().then((reg) => {
      if (reg) {
        setRegistration(reg);
      }
    });
  }, []);

  // Écouter les mises à jour du Service Worker
  useEffect(() => {
    if (!registration) return;

    const handleUpdate = (event: CustomEvent<{ registration: ServiceWorkerRegistration }>) => {
      console.log("[SW] Nouvelle version disponible.");
      setShowNotification(true);
    };

    window.addEventListener("new-sw-version" as never, handleUpdate);
    return () => {
      window.removeEventListener("new-sw-version" as never, handleUpdate);
    };
  }, [registration]);

  // Fonction pour raffraîchir la page (pour appliquer la mise à jour)
  const handleRefresh = () => {
    if (registration && registration.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
      window.location.reload();
    }
  };

  return (
    <>
      {/* Notification de mise à jour */}
      <div
        className={`${styles.notification} ${showNotification ? styles.show : ''}`}
      >
        <p className={styles.message}>
          Une nouvelle version est disponible.
        </p>
        <button
          onClick={handleRefresh}
          className={styles.refreshButton}
        >
          Rafraîchir
        </button>
      </div>
    </>
  );
}
