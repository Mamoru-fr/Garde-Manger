import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegistrar } from "@/components/layout/ServiceWorkerRegistrar";
import { ServerSessionProvider } from "@/lib/components/ServerSessionProvider";
import PWADetector from "@/components/pwa-detector";
import Header from "@/components/layout/Header";

// Police Inter (moderne et lisible)
const inter = Inter({ subsets: ["latin"] });

// Métadonnées pour la PWA
export const metadata: Metadata = {
  title: {
    default: "Garde-Manger | Gestion de stock",
    template: "%s | Garde-Manger",
  },
  description:
    "Gère ton garde-manger, tes placards et tes frigos en ligne. Ajoute, scanne et partage tes produits facilement.",
  keywords: [
    "garde-manger",
    "gestion",
    "stock",
    "alimentation",
    "inventaire",
    "codes-barres",
    "PWA",
  ],
  authors: [{ name: "Alexis SANTOS" }],
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "https://garde-manger.example.com",
    siteName: "Garde-Manger",
    title: "Garde-Manger | Gestion de stock",
    description:
      "Gère ton garde-manger, tes placards et tes frigos en ligne.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Garde-Manger | Gestion de stock",
    description:
      "Gère ton garde-manger, tes placards et tes frigos en ligne.",
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: [
      { url: "/icons/shortcut-icon.png", sizes: "128x128", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "Garde-Manger",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FDF6E8" },
    { media: "(prefers-color-scheme: dark)", color: "#2E1A10" },
  ],
};

// Root Layout
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <ServerSessionProvider>
          <Header />
          {children}
        </ServerSessionProvider>
        <ServiceWorkerRegistrar />
        <PWADetector />
      </body>
    </html>
  );
}
