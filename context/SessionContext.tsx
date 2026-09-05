"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import type { User, Session } from "@/lib/auth/auth";

// Type pour le contexte de session
export interface SessionContextType {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  fetchSession: () => Promise<void>;
  signOut: () => Promise<void>;
}

// Contexte par défaut
const SessionContext = createContext<SessionContextType | undefined>(undefined);

// Hook pour utiliser le contexte
export const useSession = (): SessionContextType => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession doit être utilisé dans un SessionProvider");
  }
  return context;
};

// Props pour le fournisseur
export interface SessionProviderProps {
  children: ReactNode;
  initialSession: Session | null;
}

// Fournisseur de session
export function SessionProvider({
  children,
  initialSession,
}: SessionProviderProps) {
  const [user, setUser] = useState<User | null>(initialSession?.user || null);
  const [session, setSession] = useState<Session | null>(initialSession);
  const [isLoading, setIsLoading] = useState<boolean>(!initialSession);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Récupérer la session
  const fetchSession = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const currentSession = await auth.api.getSession();
      setSession(currentSession);
      setUser(currentSession?.user || null);
    } catch (err) {
      console.error("Erreur lors de la récupération de la session:", err);
      setError("Erreur lors de la récupération de la session");
      setUser(null);
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Déconnexion
  const signOut = async () => {
    try {
      await auth.api.signOut();
      setUser(null);
      setSession(null);
      router.push("/");
    } catch (err) {
      console.error("Erreur lors de la déconnexion:", err);
      setError("Erreur lors de la déconnexion");
    }
  };

  // Vérifier la session au chargement
  useEffect(() => {
    if (!initialSession) {
      fetchSession();
    }
  }, [initialSession]);

  const value: SessionContextType = {
    user,
    session,
    isAuthenticated: !!user,
    isLoading,
    error,
    fetchSession,
    signOut,
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}
