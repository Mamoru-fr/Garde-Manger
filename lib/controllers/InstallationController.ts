import { db } from "@/lib/db/drizzle";
import { installations, userInstallations, users } from "@/lib/db/schema";
import { ActionResponse, ErrorCodes } from "@/lib/types";
import {
  CreateInstallationInput,
  UpdateInstallationInput,
  AddUserToInstallationInput,
  DeleteInstallationInput,
  RemoveUserFromInstallationInput,
} from "@/lib/validations/installation";
import {
  createInstallationService,
  getUserInstallationsService,
  getInstallationByIdService,
  updateInstallationService,
  deleteInstallationService,
  addUserToInstallationService,
  removeUserFromInstallationService,
  checkInstallationAccessService,
} from "@/lib/services/InstallationService";
import { eq } from "drizzle-orm";

// ================
// CONTRÔLEUR POUR LES INSTALLATIONS
// ================

export class InstallationController {
  // Créer une nouvelle installation
  static async create(
    input: CreateInstallationInput,
    ownerId: string
  ): Promise<ActionResponse<{ installationId: string }>> {
    // Validation supplémentaire
    if (!input.name || input.name.trim() === "") {
      return {
        success: false,
        error: "Le nom est requis",
        code: ErrorCodes.VALIDATION_ERROR,
      };
    }

    if (input.name.length > 100) {
      return {
        success: false,
        error: "Le nom ne peut pas dépasser 100 caractères",
        code: ErrorCodes.VALIDATION_ERROR,
      };
    }

    if (input.description && input.description.length > 500) {
      return {
        success: false,
        error: "La description ne peut pas dépasser 500 caractères",
        code: ErrorCodes.VALIDATION_ERROR,
      };
    }

    // Vérifier que l'utilisateur existe
    const userExists = await db
      .select()
      .from(users)
      .where(eq(users.id, ownerId))
      .limit(1);

    if (!userExists.length) {
      return {
        success: false,
        error: "Utilisateur non trouvé",
        code: ErrorCodes.USER_NOT_FOUND,
      };
    }

    // Appel au service
    return createInstallationService(input, ownerId);
  }

  // Obtenir toutes les installations de l'utilisateur
  static async getUserInstallations(
    userId: string
  ): Promise<ActionResponse<{
    installations: {
      id: string;
      name: string;
      description: string | null;
      role: string;
      owner: { id: string; name: string | null };
      objectCount: number;
    }[];
  }>> {
    // Validation supplémentaire
    if (!userId || userId.trim() === "") {
      return {
        success: false,
        error: "ID utilisateur requis",
        code: ErrorCodes.VALIDATION_ERROR,
      };
    }

    // Vérifier que l'utilisateur existe
    const userExists = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!userExists.length) {
      return {
        success: false,
        error: "Utilisateur non trouvé",
        code: ErrorCodes.USER_NOT_FOUND,
      };
    }

    // Appel au service
    return getUserInstallationsService(userId);
  }

  // Obtenir une installation par ID
  static async getById(
    installationId: string,
    currentUserId: string
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
    // Validation supplémentaire
    if (!installationId || installationId.trim() === "") {
      return {
        success: false,
        error: "ID installation requis",
        code: ErrorCodes.VALIDATION_ERROR,
      };
    }

    // Obtenir l'installation
    const installationResult = await getInstallationByIdService(installationId);

    if (!installationResult.success) {
      return installationResult as any;
    }

    // Obtenir le rôle de l'utilisateur dans cette installation
    const accessResult = await checkInstallationAccessService(
      currentUserId,
      installationId
    );

    if (!accessResult.success) {
      return {
        success: false,
        error: accessResult.error,
        code: accessResult.code,
      };
    }

    return {
      ...installationResult,
      data: {
        installation: {
          ...installationResult.data!.installation,
          userRole: accessResult.data!.role,
        },
      },
    } as ActionResponse<{
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
    }>;
  }

  // Mettre à jour une installation
  static async update(
    input: UpdateInstallationInput,
    installationId: string,
    currentUserId: string
  ): Promise<ActionResponse<{ installationId: string }>> {
    // Validation supplémentaire
    if (!installationId || installationId.trim() === "") {
      return {
        success: false,
        error: "ID installation requis",
        code: ErrorCodes.VALIDATION_ERROR,
      };
    }

    if (input.name && input.name.trim() === "") {
      return {
        success: false,
        error: "Le nom ne peut pas être vide",
        code: ErrorCodes.VALIDATION_ERROR,
      };
    }

    if (input.name && input.name.length > 100) {
      return {
        success: false,
        error: "Le nom ne peut pas dépasser 100 caractères",
        code: ErrorCodes.VALIDATION_ERROR,
      };
    }

    if (input.description && input.description.length > 500) {
      return {
        success: false,
        error: "La description ne peut pas dépasser 500 caractères",
        code: ErrorCodes.VALIDATION_ERROR,
      };
    }

    // Vérifier que l'utilisateur a accès à l'installation
    const accessResult = await checkInstallationAccessService(
      currentUserId,
      installationId
    );

    if (!accessResult.success) {
      return {
        success: false,
        error: accessResult.error,
        code: accessResult.code,
      };
    }

    // Vérifier que l'utilisateur est owner ou editor
    if (!accessResult.data || !["owner", "editor"].includes(accessResult.data.role)) {
      return {
        success: false,
        error: "Accès refusé. Tu n'as pas les droits pour modifier cette installation",
        code: ErrorCodes.INSTALLATION_ACCESS_DENIED,
      };
    }

    // Appel au service
    return updateInstallationService(input, installationId);
  }

  // Supprimer une installation
  static async delete(
    input: DeleteInstallationInput,
    currentUserId: string
  ): Promise<ActionResponse<{ installationId: string }>> {
    // Validation supplémentaire
    if (!input.id || input.id.trim() === "") {
      return {
        success: false,
        error: "ID installation requis",
        code: ErrorCodes.VALIDATION_ERROR,
      };
    }

    // Vérifier que l'utilisateur a accès à l'installation
    const accessResult = await checkInstallationAccessService(
      currentUserId,
      input.id
    );

    if (!accessResult.success) {
      return {
        success: false,
        error: accessResult.error,
        code: accessResult.code,
      };
    }

    // Vérifier que l'utilisateur est owner
    if (!accessResult.data || accessResult.data.role !== "owner") {
      return {
        success: false,
        error: "Seul le propriétaire peut supprimer cette installation",
        code: ErrorCodes.INSTALLATION_ACCESS_DENIED,
      };
    }

    // Appel au service
    return deleteInstallationService(input);
  }

  // Ajouter un utilisateur à une installation
  static async addUser(
    input: AddUserToInstallationInput,
    currentUserId: string
  ): Promise<ActionResponse<{ userInstallationId: string }>> {
    // Validation supplémentaire
    if (!input.installationId || input.installationId.trim() === "") {
      return {
        success: false,
        error: "ID installation requis",
        code: ErrorCodes.VALIDATION_ERROR,
      };
    }

    if (!input.userId || input.userId.trim() === "") {
      return {
        success: false,
        error: "ID utilisateur requis",
        code: ErrorCodes.VALIDATION_ERROR,
      };
    }

    // Vérifier que l'utilisateur a accès à l'installation
    const accessResult = await checkInstallationAccessService(
      currentUserId,
      input.installationId
    );

    if (!accessResult.success) {
      return {
        success: false,
        error: accessResult.error,
        code: accessResult.code,
      };
    }

    // Vérifier que l'utilisateur est owner ou editor
    if (!accessResult.data || !["owner", "editor"].includes(accessResult.data.role)) {
      return {
        success: false,
        error: "Accès refusé. Tu n'as pas les droits pour ajouter des utilisateurs",
        code: ErrorCodes.INSTALLATION_ACCESS_DENIED,
      };
    }

    // Appel au service
    return addUserToInstallationService(input);
  }

  // Supprimer un utilisateur d'une installation
  static async removeUser(
    input: RemoveUserFromInstallationInput,
    currentUserId: string
  ): Promise<ActionResponse<{ userInstallationId: string }>> {
    // Validation supplémentaire
    if (!input.installationId || input.installationId.trim() === "") {
      return {
        success: false,
        error: "ID installation requis",
        code: ErrorCodes.VALIDATION_ERROR,
      };
    }

    if (!input.userId || input.userId.trim() === "") {
      return {
        success: false,
        error: "ID utilisateur requis",
        code: ErrorCodes.VALIDATION_ERROR,
      };
    }

    // Vérifier que l'utilisateur ne se supprime pas lui-même
    if (input.userId === currentUserId) {
      return {
        success: false,
        error: "Tu ne peux pas te supprimer toi-même de cette installation",
        code: ErrorCodes.FORBIDDEN,
      };
    }

    // Vérifier que l'utilisateur a accès à l'installation
    const accessResult = await checkInstallationAccessService(
      currentUserId,
      input.installationId
    );

    if (!accessResult.success) {
      return {
        success: false,
        error: accessResult.error,
        code: accessResult.code,
      };
    }

    // Vérifier que l'utilisateur est owner
    if (!accessResult.data || accessResult.data.role !== "owner") {
      return {
        success: false,
        error: "Seul le propriétaire peut supprimer des utilisateurs",
        code: ErrorCodes.INSTALLATION_ACCESS_DENIED,
      };
    }

    // Appel au service
    return removeUserFromInstallationService(input);
  }

  // Vérifier l'accès à une installation
  static async checkAccess(
    userId: string,
    installationId: string
  ): Promise<ActionResponse<{ hasAccess: boolean; role: string }>> {
    // Validation supplémentaire
    if (!userId || userId.trim() === "") {
      return {
        success: false,
        error: "ID utilisateur requis",
        code: ErrorCodes.VALIDATION_ERROR,
      };
    }

    if (!installationId || installationId.trim() === "") {
      return {
        success: false,
        error: "ID installation requis",
        code: ErrorCodes.VALIDATION_ERROR,
      };
    }

    // Appel au service
    return checkInstallationAccessService(userId, installationId);
  }
}
