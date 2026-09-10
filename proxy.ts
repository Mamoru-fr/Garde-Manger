import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isPWARequest, getSessionMaxAge } from './lib/utils/pwa';

// 🔧 Nom du cookie de session Better Auth (doit correspondre à ta config)
const BETTER_AUTH_SESSION_COOKIE = "better-auth.session_token";
const BETTER_AUTH_SECURE_COOKIE = "__Secure-better-auth.session_token";

/**
 * Proxy pour configurer les headers de permissions et gérer les sessions PWA
 * Nécessaire pour :
 * - l'accès à la caméra, microphone, et géolocalisation dans Next.js 16+
 * - la gestion des cookies de session longue durée pour les PWAs
 * 
 * @see https://nextjs.org/docs/app/building-your-application/routing/middleware
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Permissions-Policy
 */
export default function proxy(request: NextRequest) {
  // Clone la réponse pour pouvoir modifier les headers
  const response = NextResponse.next();

  // 🔍 1. Détection PWA (via headers OU cookie client)
  const isPWA = isPWARequest(request) || 
               request.cookies.has("x-pwa-detected");

  // ✅ 2. Si c'est une PWA ET qu'on a un cookie de session Better Auth, on le prolonge
  if (isPWA) {
    // 🔍 Vérifie les deux noms de cookie possibles (avec/sans préfixe __Secure-)
    const sessionCookie = request.cookies.get(BETTER_AUTH_SESSION_COOKIE) ||
                         request.cookies.get(BETTER_AUTH_SECURE_COOKIE);
    
    if (sessionCookie) {
      // 🔧 Durée prolongée pour les PWAs (1 an)
      const maxAge = getSessionMaxAge(true);
      
      // 🔧 Utilise le même nom de cookie que celui trouvé
      const sessionCookieName = sessionCookie.name;
      
      response.cookies.set({
        name: sessionCookieName,
        value: sessionCookie.value,
        maxAge: maxAge,
        path: "/",
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: "lax",
      });
      
      // ⚠️ Header pour débogage
      response.headers.set("x-pwa-session-extended", "true");
    }
  }

  // Configurer le Permissions-Policy header
  // Cela permet à l'application d'accéder à :
  // - camera (pour le scanner de codes-barres)
  // - microphone (si besoin pour des fonctionnalités audio)
  // - geolocation (si besoin pour des fonctionnalités de localisation)
  response.headers.set(
    'Permissions-Policy',
    'camera=*, microphone=*, geolocation=*, fullscreen=*'
  );

  // Configurer les headers CORS pour Vercel
  // Nécessaire pour éviter les erreurs "Fetch API cannot load... due to access control checks"
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  response.headers.set('Access-Control-Allow-Credentials', 'true');

  // Configurer le Content-Security-Policy pour plus de sécurité
  // Permet l'accès à la caméra et le chargement des ressources nécessaires
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: blob:; " +
    "connect-src 'self'; " +
    "media-src 'self' blob:; " +
    "frame-src 'self'"
  );

  // Configurer le X-Content-Type-Options pour éviter les MIME sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Configurer le X-Frame-Options pour éviter le clickjacking
  response.headers.set('X-Frame-Options', 'DENY');

  return response;
}

// Appliquer le proxy à toutes les routes
export const config = {
  matcher: '/:path*',
};
