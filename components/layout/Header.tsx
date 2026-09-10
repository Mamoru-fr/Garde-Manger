import Link from "next/link";
import AuthButtons from "@/components/auth-buttons";

/**
 * Header - Composant de navigation principal
 * Affiche le logo et les boutons d'authentification
 */
export default function Header() {
  return (
    <header className="bg-[#FDF6E8] dark:bg-[#2E1A10] shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-[#2E1A10] dark:text-[#FDF6E8]">
              Garde-Manger
            </span>
          </Link>

          {/* Boutons d'authentification (conditionnés par la session) */}
          <AuthButtons />
        </div>
      </div>
    </header>
  );
}
