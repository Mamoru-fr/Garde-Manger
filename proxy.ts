import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Proxy pour configurer les headers de permissions
 * Nécessaire pour l'accès à la caméra, microphone, et géolocalisation dans Next.js 16+
 * 
 * @see https://nextjs.org/docs/app/building-your-application/routing/middleware
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Permissions-Policy
 */
export default function proxy(request: NextRequest) {
  // Clone la réponse pour pouvoir modifier les headers
  const response = NextResponse.next();

  // Configurer le Permissions-Policy header
  // Cela permet à l'application d'accéder à :
  // - camera (pour le scanner de codes-barres)
  // - microphone (si besoin pour des fonctionnalités audio)
  // - geolocation (si besoin pour des fonctionnalités de localisation)
  response.headers.set(
    'Permissions-Policy',
    'camera=*, microphone=*, geolocation=*, fullscreen=*'
  );

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
