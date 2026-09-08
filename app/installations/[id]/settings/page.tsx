import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { getAuthHeaders } from "@/lib/utils/auth";
import { getInstallationById, checkInstallationAccess } from "@/lib/actions/InstallationActions";
import { InstallationRole } from "@/lib/types";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, Settings as SettingsIcon } from "lucide-react";
import DeleteInstallationButton from "@/components/installations/DeleteInstallationButton";

export default async function InstallationSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  
  const headers = await getAuthHeaders();
  const session = await auth.api.getSession({ headers });

  if (!session?.user) {
    redirect("/connexion");
  }

  // Verifier l'acces a l'installation
  const accessResult = await checkInstallationAccess(id);
  if (!accessResult.success || !accessResult.data?.hasAccess) {
    redirect("/installations?error=access_denied");
  }

  // Recuperer les details de l'installation
  const installationResult = await getInstallationById(id);
  if (!installationResult.success || !installationResult.data?.installation) {
    redirect("/installations?error=not_found");
  }

  const installation = installationResult.data.installation;
  const userRole = installation.userRole as InstallationRole;

  // Fonction pour formater la date
  function formatDate(date: Date | null | undefined): string {
    if (!date) return "Non specifiee";
    return new Date(date).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // Si l'utilisateur n'a pas le droit de modifier les parametres (owner seulement)
  if (userRole !== 'owner') {
    return (
      <main className="container">
        <nav style={{ marginBottom: '1rem' }}>
          <Link href={`/installations/${id}`} className="btn btnSecondary">
            <ArrowLeft size={16} /> Retour a {installation.name}
          </Link>
        </nav>
        
        <h1 style={{ marginBottom: '1.5rem' }}>Parametres de l'installation: {installation.name}</h1>
        <p>Tu n'as pas la permission de modifier les parametres de cette installation.</p>
        <p>Seul le proprio ({installation.owner?.name || 'Inconnu'}) peut acceder a ces parametres.</p>
      </main>
    );
  }

  return (
    <main className="container">
      <nav style={{ marginBottom: '1rem' }}>
        <Link href={`/installations/${id}`} className="btn btnSecondary">
          <ArrowLeft size={16} /> Retour a {installation.name}
        </Link>
      </nav>
      
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <SettingsIcon size={24} />
          Parametres de l'installation
        </h1>

        {/* Section : Informations techniques */}
        <section style={{ 
          background: 'var(--card-bg, #fff)', 
          borderRadius: '8px', 
          padding: '1.5rem', 
          marginBottom: '1.5rem',
          border: '1px solid var(--border-color, #e2e8f0)'
        }}>
          <h2 style={{ marginBottom: '1rem', fontSize: '1.1rem', color: 'var(--text-secondary, #64748b)' }}>
            Informations techniques
          </h2>
          
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary, #64748b)' }}>ID de l'installation</span>
              <code style={{ background: 'var(--bg-secondary, #f1f5f9)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                {installation.id}
              </code>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary, #64748b)' }}>Cree le</span>
              <span>{formatDate(installation.createdAt)}</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary, #64748b)' }}>Modifiee le</span>
              <span>{formatDate(installation.updatedAt)}</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary, #64748b)' }}>Proprietaire</span>
              <span>{installation.owner?.name || 'Inconnu'}</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary, #64748b)' }}>Nombre d'objets</span>
              <span>{installation.objectCount}</span>
            </div>
          </div>
        </section>

        {/* Section : Actions dangereuses */}
        <section style={{ 
          background: 'var(--bg-secondary, #f1f5f9)', 
          borderRadius: '8px', 
          padding: '1.5rem', 
          border: '1px solid var(--danger-color, #ef4444)'
        }}>
          <h2 style={{ 
            marginBottom: '1rem', 
            fontSize: '1.1rem', 
            color: 'var(--danger-color, #ef4444)',
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem'
          }}>
            <AlertTriangle size={18} />
            Zone dangereuse
          </h2>
          
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              background: 'var(--danger-bg, #fee2e2)',
              padding: '1rem',
              borderRadius: '6px'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--danger-color, #ef4444)' }}>
                  Supprimer l'installation
                </h3>
                <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary, #64748b)', fontSize: '0.9rem' }}>
                  Cette action est irreversible. Tous les objets et les parametres seront supprimés.
                </p>
              </div>
              
              <DeleteInstallationButton 
                installationId={installation.id}
                installationName={installation.name}
              />
            </div>
          </div>
        </section>

        {/* Section : Liens rapides */}
        <section style={{ 
          background: 'var(--card-bg, #fff)', 
          borderRadius: '8px', 
          padding: '1.5rem', 
          border: '1px solid var(--border-color, #e2e8f0)'
        }}>
          <h2 style={{ marginBottom: '1rem', fontSize: '1.1rem', color: 'var(--text-secondary, #64748b)' }}>
            Liens rapides
          </h2>
          
          <div style={{ display: 'grid', gap: '1rem' }}>
            <Link 
              href={`/installations/${id}/edit`}
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '1rem',
                background: 'var(--bg-secondary, #f1f5f9)',
                borderRadius: '6px',
                textDecoration: 'none',
                color: 'var(--text-primary, #1e293b)'
              }}
            >
              <span>Modifier l'installation</span>
              <span>&rarr;</span>
            </Link>
            
            <Link 
              href={`/installations/${id}`}
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '1rem',
                background: 'var(--bg-secondary, #f1f5f9)',
                borderRadius: '6px',
                textDecoration: 'none',
                color: 'var(--text-primary, #1e293b)'
              }}
            >
              <span>Gerer les membres</span>
              <span>&rarr;</span>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
