"use client";

import Link from "next/link";
import { useSession } from "@/context/SessionProvider";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AuthButtons from "@/components/auth-buttons";
import styles from "./Home.module.css";

// Page d'accueil - côté client pour utiliser AuthButtons
export default function HomePage() {
  const { user } = useSession();
  const router = useRouter();

  // Rediriger vers /installations si connecté
  useEffect(() => {
    if (user) {
      console.log("✅ [CLIENT /] Utilisateur connecté, redirection vers /installations");
      router.push("/installations");
    }
  }, [user, router]);

  // Si pas connecté, afficher la page d'accueil
  if (user) return null; // En attente de redirection

  return (
    <main className={styles.container}>
      <div className={styles.hero}>
        <div className={styles.logoContainer}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>🥖</span>
            <h1 className={styles.title}>Garde-Manger</h1>
          </div>
        </div>
        
        <p className={styles.subtitle}>
          Gère ton garde-manger, tes placards et tes frigos en ligne.
        </p>
        
        <p className={styles.description}>
          Ajoute, scanne et organise tes produits facilement.<br />
          Partage tes installations avec ta famille ou tes amis.
        </p>
        
        <div className={styles.ctaContainer}>
          <AuthButtons />
        </div>
      </div>
      
      <div className={styles.features}>
        <div className={styles.feature}>
          <span className={styles.featureIcon}>📱</span>
          <h3>Simple et intuitive</h3>
          <p>Une interface conçue pour être facile à utiliser</p>
        </div>
        <div className={styles.feature}>
          <span className={styles.featureIcon}>📊</span>
          <h3>Gestion complète</h3>
          <p>Suis tes stocks, les dates de péremption et bien plus</p>
        </div>
        <div className={styles.feature}>
          <span className={styles.featureIcon}>🔄</span>
          <h3>Partage facile</h3>
          <p>Collabore avec tes proches sur les mêmes installations</p>
        </div>
        <div className={styles.feature}>
          <span className={styles.featureIcon}>📦</span>
          <h3>Scan de codes-barres</h3>
          <p>Ajoute des produits rapidement avec ton appareil photo</p>
        </div>
      </div>
      
      <footer className={styles.footer}>
        <p>© {new Date().getFullYear()} Garde-Manger</p>
        <p className={styles.footerSub}>Créé avec amour pour les amateurs de cuisine</p>
      </footer>
    </main>
  );
}

