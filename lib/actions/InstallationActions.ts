"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { getAuthHeaders } from "@/lib/utils/auth";
import { InstallationController } from "@/lib/controllers/InstallationController";
import {
  CreateInstallationSchema,
  UpdateInstallationSchema,
  AddUserToInstallationSchema,
  DeleteInstallationSchema,
  RemoveUserFromInstallationSchema,
} from "@/lib/validations/installation";
import { ActionResponse, ErrorCodes } from "@/lib/types";

// ================
// SERVER ACTIONS POUR LES INSTALLATIONS
// ================

// Action pour créer une nouvelle installation
export async function createInstallation(
  prevState: ActionResponse<{ installationId: string }> | null,
  formData: FormData
): Promise<ActionResponse<{ installationId: string }>> {
  // Récupérer la session utilisateur
  const headers = await getAuthHeaders();
  const session = await auth.api.getSession({ headers });
  
  if (!session?.user) {
    return {
      success: false,
      error: "Tu dois être connecté pour créer une installation",
      code: ErrorCodes.UNAUTHORIZED,
    };
  }

  // Validation des entrées avec Zod
  const name = formData.get("name") as string;
  const description = formData.get("description") as string | null;

  const validation = CreateInstallationSchema.safeParse({
    name,
    description,
  });

  if (!validation.success) {
    return {
      success: false,
      error: validation.error.flatten().fieldErrors
        ? Object.values(validation.error.flatten().fieldErrors)[0][0]
        : "Données invalides",
      code: ErrorCodes.VALIDATION_ERROR,
      details: validation.error.format(),
    };
  }

  // Appel au contrôleur
  const result = await InstallationController.create(
    validation.data,
    session.user.id
  );

  if (!result.success || !result.data) {
    return result;
  }

  // Rediriger vers la page de l'installation
  redirect(`/installations/${result.data.installationId}`);
}

// Action pour obtenir les installations de l'utilisateur
export async function getUserInstallations(): Promise<ActionResponse<{
  installations: {
    id: string;
    name: string;
    description: string | null;
    role: string;
    owner: { id: string; name: string | null };
    objectCount: number;
  }[];
}>> {
  // Récupérer la session utilisateur
  // nextCookies plugin gère automatiquement les cookies
  const headers = await getAuthHeaders();
  const session = await auth.api.getSession({ headers });
  
  if (!session?.user) {
    return {
      success: false,
      error: "Tu dois être connecté pour voir tes installations",
      code: ErrorCodes.UNAUTHORIZED,
    };
  }

  // Appel au contrôleur
  const result = await InstallationController.getUserInstallations(
    session.user.id
  );

  return result;
}

// Action pour obtenir une installation par ID
export async function getInstallationById(
  installationId: string
): Promise<ActionResponse<{
  installation: {
    id: string;
    name: string;
    description: string | null;
    ownerId: string;
    owner: { id: string; name: string | null };
    createdAt: Date;
    updatedAt: Date;
    userRole: string;
    users: { id: string; name: string | null; email: string; role: string }[];
    objectCount: number;
  };
}>> {
  // Récupérer la session utilisateur
  const headers = await getAuthHeaders();
  const session = await auth.api.getSession({ headers });
  
  if (!session?.user) {
    return {
      success: false,
      error: "Tu dois être connecté pour voir cette installation",
      code: ErrorCodes.UNAUTHORIZED,
    };
  }

  // Appel au contrôleur
  const result = await InstallationController.getById(
    installationId,
    session.user.id
  );

  return result;
}

// Action pour récupérer les objets d'une installation
// Retourne la liste des objets avec leurs métadonnées (nom, marque, etc.)
export async function getInstallationObjects(
  installationId: string,
  cacheBuster?: string
): Promise<ActionResponse<{
  objects: Array<{
    id: string;
    objectDirectoryId: string;
    name: string;
    brand?: string | null;
    category?: string | null;
    description?: string | null;
    nutriscore?: string | null;
    imageUrl?: string | null;
    quantity: number;
    location?: string | null;
    expiryDate?: Date | null;
    openFoodFactsId?: string | null;
    isReadOnly?: boolean;
  }>;
}>> {
  try {
    // Vérifier la session utilisateur
    const headers = await getAuthHeaders();
    const session = await auth.api.getSession({ headers });

    if (!session?.user) {
      return {
        success: false,
        error: "Tu dois être connecté pour voir les objets de cette installation",
        code: ErrorCodes.UNAUTHORIZED,
      };
    }

    // Vérifier l'accès à l'installation
    const accessResult = await checkInstallationAccess(installationId);
    if (!accessResult.success || !accessResult.data?.hasAccess) {
      return {
        success: false,
        error: "Accès refusé à cette installation",
        code: ErrorCodes.INSTALLATION_ACCESS_DENIED,
      };
    }

    // Récupérer les objets de l'installation avec les métadonnées de l'annuaire
    const result = await InstallationController.getInstallationObjects(installationId);

    if (!result.success) {
      return result;
    }

    return result;
  } catch (error) {
    console.error("[InstallationActions] Erreur dans getInstallationObjects:", error);
    return {
      success: false,
      error: "Erreur lors de la récupération des objets",
      code: ErrorCodes.INTERNAL_ERROR,
    };
  }
}

// Action pour mettre à jour une installation
export async function updateInstallation(
  prevState: ActionResponse<{ installationId: string }> | null,
  formData: FormData
): Promise<ActionResponse<{ installationId: string }>> {
  // Récupérer la session utilisateur
  const headers = await getAuthHeaders();
  const session = await auth.api.getSession({ headers });
  
  if (!session?.user) {
    return {
      success: false,
      error: "Tu dois être connecté pour modifier une installation",
      code: ErrorCodes.UNAUTHORIZED,
    };
  }

  const installationId = formData.get("installationId") as string;
  const name = formData.get("name") as string | undefined;
  const description = formData.get("description") as string | undefined;

  const validation = UpdateInstallationSchema.safeParse({
    name,
    description,
  });

  if (!validation.success) {
    return {
      success: false,
      error: validation.error.flatten().fieldErrors
        ? Object.values(validation.error.flatten().fieldErrors)[0][0]
        : "Données invalides",
      code: ErrorCodes.VALIDATION_ERROR,
      details: validation.error.format(),
    };
  }

  // Appel au contrôleur
  const result = await InstallationController.update(
    validation.data,
    installationId,
    session.user.id
  );

  if (!result.success || !result.data) {
    return result;
  }

  // Rediriger vers la page de l'installation
  redirect(`/installations/${result.data.installationId}`);
}

// Action pour supprimer une installation
export async function deleteInstallation(
  prevState: ActionResponse<{ installationId: string }> | null,
  formData: FormData
): Promise<ActionResponse<{ installationId: string }>> {
  // Récupérer la session utilisateur
  const headers = await getAuthHeaders();
  const session = await auth.api.getSession({ headers });
  
  if (!session?.user) {
    return {
      success: false,
      error: "Tu dois être connecté pour supprimer une installation",
      code: ErrorCodes.UNAUTHORIZED,
    };
  }

  const id = formData.get("id") as string;

  const validation = DeleteInstallationSchema.safeParse({ id });

  if (!validation.success) {
    return {
      success: false,
      error: validation.error.flatten().fieldErrors
        ? Object.values(validation.error.flatten().fieldErrors)[0][0]
        : "Données invalides",
      code: ErrorCodes.VALIDATION_ERROR,
      details: validation.error.format(),
    };
  }

  // Appel au contrôleur
  const result = await InstallationController.delete(
    validation.data,
    session.user.id
  );

  if (!result.success) {
    return result;
  }

  // Rediriger vers la liste des installations
  redirect("/installations");
}

// Action pour ajouter un utilisateur à une installation
export async function addUserToInstallation(
  prevState: ActionResponse<{ userInstallationId: string }> | null,
  formData: FormData
): Promise<ActionResponse<{ userInstallationId: string }>> {
  // Récupérer la session utilisateur
  const headers = await getAuthHeaders();
  const session = await auth.api.getSession({ headers });
  
  if (!session?.user) {
    return {
      success: false,
      error: "Tu dois être connecté pour ajouter des utilisateurs",
      code: ErrorCodes.UNAUTHORIZED,
    };
  }

  const installationId = formData.get("installationId") as string;
  const userId = formData.get("userId") as string;
  const role = formData.get("role") as string;

  const validation = AddUserToInstallationSchema.safeParse({
    installationId,
    userId,
    role,
  });

  if (!validation.success) {
    return {
      success: false,
      error: validation.error.flatten().fieldErrors
        ? Object.values(validation.error.flatten().fieldErrors)[0][0]
        : "Données invalides",
      code: ErrorCodes.VALIDATION_ERROR,
      details: validation.error.format(),
    };
  }

  // Appel au contrôleur
  const result = await InstallationController.addUser(
    validation.data,
    session.user.id
  );

  return result;
}

// Action pour supprimer un utilisateur d'une installation
export async function removeUserFromInstallation(
  prevState: ActionResponse<{ userInstallationId: string }> | null,
  formData: FormData
): Promise<ActionResponse<{ userInstallationId: string }>> {
  // Récupérer la session utilisateur
  const headers = await getAuthHeaders();
  const session = await auth.api.getSession({ headers });
  
  if (!session?.user) {
    return {
      success: false,
      error: "Tu dois être connecté pour supprimer des utilisateurs",
      code: ErrorCodes.UNAUTHORIZED,
    };
  }

  const installationId = formData.get("installationId") as string;
  const userId = formData.get("userId") as string;

  const validation = RemoveUserFromInstallationSchema.safeParse({
    installationId,
    userId,
  });

  if (!validation.success) {
    return {
      success: false,
      error: validation.error.flatten().fieldErrors
        ? Object.values(validation.error.flatten().fieldErrors)[0][0]
        : "Données invalides",
      code: ErrorCodes.VALIDATION_ERROR,
      details: validation.error.format(),
    };
  }

  // Appel au contrôleur
  const result = await InstallationController.removeUser(
    validation.data,
    session.user.id
  );

  return result;
}

// Action pour vérifier l'accès à une installation
export async function checkInstallationAccess(
  installationId: string
): Promise<ActionResponse<{ hasAccess: boolean; role: string }>> {
  // Récupérer la session utilisateur
  const headers = await getAuthHeaders();
  const session = await auth.api.getSession({ headers });
  
  if (!session?.user) {
    return {
      success: false,
      error: "Tu dois être connecté pour vérifier l'accès",
      code: ErrorCodes.UNAUTHORIZED,
    };
  }

  // Appel au contrôleur
  const result = await InstallationController.checkAccess(
    session.user.id,
    installationId
  );

  return result;
}

// ================
// FONCTIONS SIMPLIFIÉES POUR LE MODAL DE GESTION DES MEMBRES
// ================

// Ajouter un membre à une installation (version simplifiée pour le modal)
export async function addMemberToInstallation(
  installationId: string,
  userEmail: string,
  role: string
): Promise<ActionResponse<{ userInstallationId: string }>> {
  // Récupérer la session utilisateur
  const headers = await getAuthHeaders();
  const session = await auth.api.getSession({ headers });

  if (!session?.user) {
    return {
      success: false,
      error: "Tu dois être connecté pour ajouter des membres",
      code: ErrorCodes.UNAUTHORIZED,
    };
  }

  // Appel au contrôleur avec l'email
  const result = await InstallationController.addMemberByEmail(
    installationId,
    session.user.id,
    userEmail,
    role
  );

  return result;
}

// Supprimer un membre d'une installation (version simplifiée pour le modal)
export async function removeMemberFromInstallation(
  installationId: string,
  userId: string
): Promise<ActionResponse<{ userInstallationId: string }>> {
  // Récupérer la session utilisateur
  const headers = await getAuthHeaders();
  const session = await auth.api.getSession({ headers });

  if (!session?.user) {
    return {
      success: false,
      error: "Tu dois être connecté pour supprimer des membres",
      code: ErrorCodes.UNAUTHORIZED,
    };
  }

  // Appel au contrôleur
  const result = await InstallationController.removeMember(
    installationId,
    session.user.id,
    userId
  );

  return result;
}
