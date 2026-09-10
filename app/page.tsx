import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentSession } from "@/lib/utils/auth";
import styles from "./Home.module.css";
import GetStartedButton from "@/components/GetStartedButton";

// Page d'accueil - côté serveur pour la vérification de la session
export default async function HomePage() {
  // Vérifier la session côté serveur
  const session = await getCurrentSession();
  
  console.log("🔐 [SERVER /] Vérification de la session:", {
    hasUser: !!session?.user,
    userEmail: session?.user?.email
  });
  
  // Si l'utilisateur est connecté, rediriger vers /installations
  if (session?.user) {
    console.log("✅ [SERVER /] Utilisateur connecté, redirection vers /installations");
    redirect("/installations");
  }
  
  // Sinon, afficher la page d'accueil pour les utilisateurs non connectés
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
          <GetStartedButton />
          <Link
            href="/inscription"
            className={styles.ctaSecondary}
          >
            Créer un compte
          </Link>
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

