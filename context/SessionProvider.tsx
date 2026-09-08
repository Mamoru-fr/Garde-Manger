"use client";

import { createContext, useContext, ReactNode } from "react";

// Type pour la session
interface SessionUser {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

interface Session {
  user: SessionUser | null;
}

interface SessionProviderProps {
  children: ReactNode;
  initialSession: Session;
}

// Contexte de session
const SessionContext = createContext<Session>({ user: null });

// Hook pour utiliser la session
export function useSession() {
  return useContext(SessionContext);
}

// Provider de session - version simplifiée sans dépendance à Better-Auth côté client
export function SessionProvider({ children, initialSession }: SessionProviderProps) {
  return (
    <SessionContext.Provider value={initialSession}>
      {children}
    </SessionContext.Provider>
  );
}
