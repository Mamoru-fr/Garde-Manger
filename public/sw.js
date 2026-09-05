// Nom du cache
const CACHE_NAME = "garde-manger-v1";

// Liste des ressources à mettre en cache (précache)
const PRECACHE_ASSETS = [
  "/",
  "/manifest.webmanifest",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/apple-touch-icon.png",
  "/globals.css",
  "/offline",
];

// Liste des routes API à mettre en cache (avec stratégie Network-First)
const API_ROUTES = [
  "/api/*",
];

// Liste des routes à mettre en cache (avec stratégie Cache-First)
const CACHE_ROUTES = [
  "/installations",
  "/objects",
  "/dashboard",
];

// Écouteur pour l'installation du Service Worker
self.addEventListener("install", (event) => {
  console.log("[SW] Installation en cours...");
  
  // Pré-mettre en cache les ressources statiques
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("[SW] Mise en cache des ressources statiques...");
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        console.log("[SW] Ressources statiques mises en cache.");
        // Forcer l'activation immédiate pour éviter l'ordre "install -> activate"
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error("[SW] Erreur lors de la mise en cache:", error);
      })
  );
});

// Écouteur pour l'activation du Service Worker
self.addEventListener("activate", (event) => {
  console.log("[SW] Activation en cours...");
  
  // Supprimer les anciens caches
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log(`[SW] Suppression du cache obsolète: ${cacheName}`);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log("[SW] Service Worker activé.");
        // Prendre le contrôle des clients immédiatement
        return self.clients.claim();
      })
      .catch((error) => {
        console.error("[SW] Erreur lors de l'activation:", error);
      })
  );
});

// Écouteur pour la récupération des ressources
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignorer les requêtes non-GET
  if (request.method !== "GET") {
    return;
  }
  
  // Stratégie pour les API (Network-First)
  if (API_ROUTES.some((route) => url.pathname.startsWith(route))) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Mettre en cache la réponse seulement si la requête a réussi
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Si hors ligne, retourner une réponse mise en cache
          return caches.match(request).then((cachedResponse) => {
            return cachedResponse || caches.match("/offline");
          });
        })
    );
    return;
  }
  
  // Stratégie pour les routes à mettre en cache (Cache-First)
  if (CACHE_ROUTES.some((route) => url.pathname.startsWith(route))) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        // Si trouvée en cache, retourner la réponse mise en cache
        if (cachedResponse) {
          // Mettre à jour le cache en arrière-plan
          fetch(request).then((response) => {
            if (response.ok) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, response);
              });
            }
          });
          return cachedResponse;
        }
        // Sinon, faire une requête réseau
        return fetch(request).then((response) => {
          // Mettre en cache la réponse
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        });
      })
    );
    return;
  }
  
  // Stratégie par défaut (Cache-First pour les ressources statiques)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});

// Écouteur pour les messages (ex: notifications)
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === "SHOW_NOTIFICATION") {
    const { title, body, icon, data } = event.data.payload;
    
    // Vérifier si les notifications sont supportées
    if (self.registration && "showNotification" in self.registration) {
      self.registration.showNotification(title, {
        body,
        icon,
        data,
        vibrate: [200, 100, 200],
        badge: icon || "/icons/icon-192x192.png",
      });
    }
  }
});

// Écouteur pour les notifications push
self.addEventListener("push", (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  const { title, body, icon, url } = data;
  
  // Afficher la notification
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: icon || "/icons/icon-192x192.png",
      data: { url },
      vibrate: [200, 100, 200],
      badge: icon || "/icons/icon-192x192.png",
    })
  );
});

// Écouteur pour les clics sur les notifications
self.addEventListener("notificationclick", (event) => {
  const { notification, action } = event;
  
  // Fermer la notification
  notification.close();
  
  // Si une URL est définie dans les données, ouvrir cette page
  if (event.notification.data && event.notification.data.url) {
    const url = event.notification.data.url;
    
    // Trouver les clients ouverts (onglets du navigateur)
    event.waitUntil(
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
        // Si un client est déjà ouvert, le focus sur cette URL
        const client = clients.find((c) => c.url === url || c.url === "/");
        if (client) {
          client.navigate(url);
          client.focus();
        } else {
          // Sinon, ouvrir une nouvelle fenêtre
          if (self.clients && "openWindow" in self.clients) {
            self.clients.openWindow(url);
          }
        }
      })
    );
  }
});

// Écouteur pour les erreurs de récupération
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  
  event.respondWith(
    fetch(event.request).catch(() => {
      // Si hors ligne et pas de réponse en cache, retourner la page hors ligne
      return caches.match("/offline");
    })
  );
});
