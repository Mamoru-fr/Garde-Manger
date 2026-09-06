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
  getInstallationObjectsService, // ✅ Ajout de la nouvelle fonction
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

  // Obtenir les objets d'une installation avec leurs métadonnées
  static async getInstallationObjects(
    installationId: string
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
    // Vérification de l'installation
    if (!installationId || installationId.trim() === "") {
      return {
        success: false,
        error: "ID installation requis",
        code: ErrorCodes.VALIDATION_ERROR,
      };
    }

    // Appel au service
    const result = await getInstallationObjectsService(installationId);
    return result;
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

  // Ajouter un membre à une installation via son email
  static async addMemberByEmail(
    installationId: string,
    requesterId: string,
    userEmail: string,
    role: string
  ): Promise<ActionResponse<{ userInstallationId: string }>> {
    // Validation
    if (!installationId || !userEmail || !role) {
      return {
        success: false,
        error: "Toutes les données sont requises",
        code: ErrorCodes.VALIDATION_ERROR,
      };
    }

    // Vérifier que le demandeur est le propriétaire de l'installation
    const installation = await db
      .select()
      .from(installations)
      .where(eq(installations.id, installationId))
      .limit(1);

    if (!installation.length) {
      return {
        success: false,
        error: "Installation non trouvée",
        code: ErrorCodes.NOT_FOUND,
      };
    }

    // Vérifier que le demandeur est bien le propriétaire
    if (installation[0].ownerId !== requesterId) {
      return {
        success: false,
        error: "Seul le propriétaire peut ajouter des membres",
        code: ErrorCodes.UNAUTHORIZED,
      };
    }

    // Trouver l'utilisateur par email
    const targetUser = await db
      .select()
      .from(users)
      .where(eq(users.email, userEmail))
      .limit(1);

    if (!targetUser.length) {
      return {
        success: false,
        error: "Utilisateur non trouvé",
        code: ErrorCodes.NOT_FOUND,
      };
    }

    // Vérifier que l'utilisateur n'est pas déjà membre de cette installation
    const existingMember = await db
      .select()
      .from(userInstallations)
      .where(
        eq(userInstallations.installationId, installationId) &&
        eq(userInstallations.userId, targetUser[0].id)
      )
      .limit(1);

    if (existingMember.length) {
      return {
        success: false,
        error: "Cet utilisateur est déjà membre de cette installation",
        code: ErrorCodes.CONFLICT,
      };
    }

    // Ajouter le membre
    return addUserToInstallationService({
      installationId,
      userId: targetUser[0].id,
      role: role as "owner" | "editor" | "viewer",
    });
  }

  // Supprimer un membre d'une installation
  static async removeMember(
    installationId: string,
    requesterId: string,
    userId: string
  ): Promise<ActionResponse<{ userInstallationId: string }>> {
    // Validation
    if (!installationId || !userId) {
      return {
        success: false,
        error: "ID installation et utilisateur requis",
        code: ErrorCodes.VALIDATION_ERROR,
      };
    }

    // Vérifier que le demandeur est le propriétaire de l'installation
    const installation = await db
      .select()
      .from(installations)
      .where(eq(installations.id, installationId))
      .limit(1);

    if (!installation.length) {
      return {
        success: false,
        error: "Installation non trouvée",
        code: ErrorCodes.NOT_FOUND,
      };
    }

    // Vérifier que le demandeur est bien le propriétaire
    if (installation[0].ownerId !== requesterId) {
      return {
        success: false,
        error: "Seul le propriétaire peut supprimer des membres",
        code: ErrorCodes.UNAUTHORIZED,
      };
    }

    // Vérifier que le membre existe
    const member = await db
      .select()
      .from(userInstallations)
      .where(
        eq(userInstallations.installationId, installationId) &&
        eq(userInstallations.userId, userId)
      )
      .limit(1);

    if (!member.length) {
      return {
        success: false,
        error: "Membre non trouvé dans cette installation",
        code: ErrorCodes.NOT_FOUND,
      };
    }

    // Supprimer le membre
    return removeUserFromInstallationService(
      { installationId, userId }
    );
  }
}
