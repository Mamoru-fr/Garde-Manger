import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { getAuthHeaders } from "@/lib/utils/auth";
import { getObjectsInInstallation } from "@/lib/actions/ObjectActions";
import { checkInstallationAccess } from "@/lib/actions/InstallationActions";
import { InstallationRole } from "@/lib/types";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import EditObjectInstallationForm from "@/components/objects/EditObjectInstallationForm";

export default async function EditObjectInstallationPage({
  params,
}: {
  params: Promise<{ id: string; objectInstallationId: string }>;
}) {
  const { id: installationId, objectInstallationId } = await params;
  
  // Vérifier la session utilisateur
  const headers = await getAuthHeaders();
  const session = await auth.api.getSession({ headers });

  if (!session?.user) {
    redirect("/connexion");
  }

  // Vérifier l'accès à l'installation
  const accessResult = await checkInstallationAccess(installationId);
  if (!accessResult.success || !accessResult.data?.hasAccess) {
    redirect(`/installations/${installationId}?error=access_denied`);
  }

  const userRole = accessResult.data?.role as InstallationRole | string;

  // Vérifier que l'utilisateur a le droit de modifier (pas viewer)
  if (userRole === "viewer") {
    redirect(`/installations/${installationId}?error=cannot_edit`);
  }

  // Récupérer tous les objets de cette installation
  const objectsResult = await getObjectsInInstallation(installationId);
  
  if (!objectsResult.success || !objectsResult.data?.objects) {
    redirect(`/installations/${installationId}?error=objects_not_found`);
  }

  // Trouver l'objet spécifique par son ID
  const objectInstallation = objectsResult.data.objects.find(
    (obj) => obj.id === objectInstallationId
  );

  if (!objectInstallation) {
    redirect(`/installations/${installationId}?error=object_not_found`);
  }
  
  // Adapter l'objet pour correspondre au type ObjectInstallation attendu
  const adaptedObjectInstallation: any = {
    ...objectInstallation,
    // Ajouter les champs manquants pour le type ObjectInstallation
    installationId: installationId,
    addedDate: new Date(),
    updatedAt: new Date(),
    objectDirectory: {
      id: objectInstallation.objectDirectoryId,
      name: objectInstallation.name,
      brand: null,
    },
    note: null,
    shopId: null,
    shop: null,
    lotNumber: null,
    price: null,
    purchaseDate: null,
    createdBy: null,
  };

  return (
    <main className="container">
      <nav style={{ marginBottom: '1.5rem' }}>
        <Link href={`/installations/${installationId}`} className="btn btnSecondary">
          <ArrowLeft size={16} />
          Retour à {adaptedObjectInstallation?.objectDirectory?.name || objectInstallation?.name || 'l\'installation'}
        </Link>
      </nav>

      <EditObjectInstallationForm
        objectInstallation={adaptedObjectInstallation}
        installationId={installationId}
      />
    </main>
  );
}
