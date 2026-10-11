import { getCurrentSession } from "@/lib/utils/auth";
import { SessionProvider } from "@/context/SessionProvider";

// Wrapper côté serveur pour le SessionProvider
// Ce composant récupère la session côté serveur et la passe au client
export async function ServerSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Récupérer la session côté serveur
  const session = await getCurrentSession();

  // Convertir la session en format compatible avec le client
  const initialSession = {
    user: session?.user
      ? {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
        }
      : null,
  };

  // Passer la session initiale au SessionProvider client
  return (
    <SessionProvider initialSession={initialSession}>
      {children}
    </SessionProvider>
  );
}
