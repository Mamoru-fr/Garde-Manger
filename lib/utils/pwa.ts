/**
 * Utility to detect if the request comes from a PWA (Progressive Web App)
 */

import type { NextRequest } from "next/server";

/**
 * Check if the current request comes from a PWA (Standalone mode)
 * Uses User-Agent and headers to detect PWA context
 */
export const isPWARequest = (request: NextRequest): boolean => {
  const userAgent = request.headers.get("user-agent")?.toLowerCase() || "";
  const accept = request.headers.get("accept") || "";
  
  // 🔍 Détection via User-Agent (PWA en mode standalone)
  const isStandalone = 
    userAgent.includes("pwa") ||
    userAgent.includes("standalone") ||
    userAgent.includes("capacitor") || // Pour Capacitor (Cordova-like)
    userAgent.includes("webview");   // Pour les WebViews (PWA Android/iOS)

  // 🔍 Détection via headers (certains frameworks ajoutent des headers spécifiques)
  const hasPWAHeader = request.headers.has("x-pwa-request");
  
  // 🔍 Détection via l'acceptation de Service Worker
  const acceptsServiceWorker = accept.includes("application/serviceworker+script");

  return isStandalone || hasPWAHeader || acceptsServiceWorker;
};

/**
 * Check if the current environment is a PWA (client-side)
 * Should be called from client components
 */
export const isPWA = (): boolean => {
  if (typeof window === "undefined") return false;
  
  // 🔍 Standard PWA detection (Standalone mode)
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
  
  // 🔍 iOS specific detection (navigator.standalone is non-standard but supported in iOS Safari)
  const isIOSStandalone = (window.navigator as { standalone?: boolean }).standalone;
  
  // 🔍 Check if Service Worker is registered (indirect PWA detection)
  const hasServiceWorker = "serviceWorker" in window.navigator;
  
  return isStandalone || isIOSStandalone || hasServiceWorker;
};

/**
 * Cookie configuration based on PWA status
 * Returns appropriate maxAge for session cookie
 */
export const getSessionMaxAge = (isPWA: boolean): number => {
  // ✅ 30 jours pour les navigateurs classiques
  if (!isPWA) return 86400 * 30; // 30 days in seconds
  
  // ✅ 1 an pour les PWAs (longue persistance)
  return 86400 * 365; // 1 year in seconds
};

/**
 * Cookie configuration based on PWA status
 * Returns appropriate updateAge for session cookie (half of maxAge)
 */
export const getSessionUpdateAge = (isPWA: boolean): number => {
  const maxAge = getSessionMaxAge(isPWA);
  return Math.floor(maxAge / 2); // Refresh at halfway point
};
