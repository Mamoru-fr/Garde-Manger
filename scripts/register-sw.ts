// Fonction pour enregistrer le Service Worker
// Doit être appelée côté client (dans un useEffect ou un script)

export function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return Promise.resolve(null);
  }

  const swUrl = `/sw.js`;

  // Vérifier si le Service Worker est déjà enregistré
  if (navigator.serviceWorker.controller) {
    console.log("[SW] Service Worker déjà actif.");
    // Retourner la registration active
    return navigator.serviceWorker.getRegistration(swUrl)
      .then(registration => registration || null);
  }

  // Enregistrer le Service Worker
  return navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      console.log("[SW] Enregistrement réussi:", registration.scope);
      
      // Écouter les mises à jour
      registration.addEventListener("updatefound", () => {
        console.log("[SW] Nouvelle version détectée.");
        
        const newWorker = registration.installing;
        if (!newWorker) return;
        
        // Attendre que le nouveau Worker soit prêt
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed") {
            console.log("[SW] Nouvelle version prête.");
            // Afficher une notification à l'utilisateur
            if (navigator.serviceWorker.controller) {
              const event = new CustomEvent("new-sw-version", {
                detail: { registration },
              });
              window.dispatchEvent(event);
            }
          }
        });
      });

      return registration;
    })
    .catch((error) => {
      console.error("[SW] Erreur d'enregistrement:", error);
      return null;
    });
}

// Fonction pour mettre à jour le Service Worker
export function updateServiceWorker(registration: ServiceWorkerRegistration) {
  if (!registration.waiting) {
    return Promise.resolve(false);
  }

  return new Promise<boolean>((resolve) => {
    // Envoyer un message au Worker pour qu'il passe à l'activation
    registration.waiting?.postMessage({ type: "SKIP_WAITING" });

    // Écouter les changements d'état
    registration.addEventListener("statechange", (event) => {
      const newWorker = registration.installing || registration.waiting;
      if (newWorker && newWorker.state === "activated") {
        console.log("[SW] Nouveau Service Worker activé.");
        resolve(true);
      }
    });

    // Timeout au cas où
    setTimeout(() => {
      resolve(false);
    }, 10000);
  });
}

// Fonction pour vérifier si une nouvelle version est disponible
export async function checkForUpdates() {
  if (!navigator.serviceWorker) {
    return false;
  }

  try {
    const response = await fetch("/sw.js", { headers: { "Cache-Control": "no-cache" } });
    if (!response.ok) {
      return false;
    }
    
    const newSwHash = await response.text().then((text) => {
      // Simple hash (pour la démo)
      let hash = 0;
      for (let i = 0; i < text.length; i++) {
        hash = (hash << 5) - hash + text.charCodeAt(i);
        hash |= 0; // Convertir en 32 bits
      }
      return hash.toString();
    });
    
    const currentRegistration = await navigator.serviceWorker.ready;
    const currentSwHash = localStorage.getItem("sw-hash");
    
    if (currentSwHash !== newSwHash) {
      localStorage.setItem("sw-hash", newSwHash);
      return true;
    }
    
    return false;
  } catch {
    return false;
  }
}
