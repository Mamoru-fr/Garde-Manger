import { db } from "@/lib/db/drizzle";
import {
  installations as installationsTable,
  userInstallations,
  users,
  objectInstallation,
} from "@/lib/db/schema";
import { ActionResponse, ErrorCodes } from "@/lib/types";
import {
  CreateInstallationInput,
  UpdateInstallationInput,
  AddUserToInstallationInput,
  DeleteInstallationInput,
  RemoveUserFromInstallationInput,
} from "@/lib/validations/installation";
import { eq, and, inArray, count } from "drizzle-orm";
import { randomUUID } from "crypto";

// ================
// SERVICES POUR LES INSTALLATIONS
// ================

// Créer une nouvelle installation
export async function createInstallationService(
  input: CreateInstallationInput,
  ownerId: string
): Promise<ActionResponse<{ installationId: string }>> {
  try {
    const id = randomUUID();

    const newInstallation = await db
      .insert(installationsTable)
      .values({
        id,
        name: input.name,
        description: input.description,
        ownerId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    if (!newInstallation.length) {
      return {
        success: false,
        error: "Échec de la création de l'installation",
        code: ErrorCodes.INTERNAL_ERROR,
      };
    }

    await db.insert(userInstallations).values({
      userId: ownerId,
      installationId: id,
      role: "owner",
      joinedAt: new Date(),
    });

    return {
      success: true,
      data: { installationId: id },
    };
  } catch (error) {
    console.error("[InstallationService] Erreur lors de la création:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de la création",
      code: ErrorCodes.INTERNAL_ERROR,
      details: error,
    };
  }
}

// Obtenir toutes les installations de l'utilisateur
export async function getUserInstallationsService(
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
  try {
    const userInstallationsData = await db
      .select({
        userInstallationId: userInstallations.installationId,
        role: userInstallations.role,
        installationId: installationsTable.id,
        installationName: installationsTable.name,
        installationDescription: installationsTable.description,
        installationOwnerId: installationsTable.ownerId,
        installationCreatedAt: installationsTable.createdAt,
        installationUpdatedAt: installationsTable.updatedAt,
      })
      .from(userInstallations)
      .where(eq(userInstallations.userId, userId))
      .leftJoin(
        installationsTable,
        eq(installationsTable.id, userInstallations.installationId)
      ) as Array<{
      userInstallationId: string;
      role: string;
      installationId: string;
      installationName: string;
      installationDescription: string | null;
      installationOwnerId: string;
      installationCreatedAt: Date;
      installationUpdatedAt: Date;
    }>;

    if (!userInstallationsData.length) {
      return { success: true, data: { installations: [] } };
    }

    const ownerIds = userInstallationsData.map(
      (item) => item.installationOwnerId
    );
    const owners = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(inArray(users.id, ownerIds));

    const installationIds = userInstallationsData.map(
      (item) => item.installationId
    );
    const objectCounts = await db
      .select({
        installationId: objectInstallation.installationId,
        count: count(),
      })
      .from(objectInstallation)
      .where(inArray(objectInstallation.installationId, installationIds))
      .groupBy(objectInstallation.installationId);

    const installations = userInstallationsData.map((item) => {
      const owner = owners.find((o) => o.id === item.installationOwnerId);
      const objectCountData = objectCounts.find(
        (oc) => oc.installationId === item.installationId
      );

      return {
        id: item.installationId,
        name: item.installationName,
        description: item.installationDescription,
        role: item.role,
        owner: { id: owner?.id || "", name: owner?.name || "" },
        objectCount: objectCountData?.count || 0,
      };
    });

    return { success: true, data: { installations } };
  } catch (error) {
    console.error("[InstallationService] Erreur:", error);
    return {
      success: false,
      error: "Erreur lors de la récupération des installations",
      code: ErrorCodes.INTERNAL_ERROR,
      details: error,
    };
  }
}

// Obtenir une installation par ID
export async function getInstallationByIdService(
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
    users: { id: string; name: string | null; email: string; role: string }[];
    objectCount: number;
  };
}>> {
  try {
    const installationData = await db
      .select({
        id: installationsTable.id,
        name: installationsTable.name,
        description: installationsTable.description,
        ownerId: installationsTable.ownerId,
        createdAt: installationsTable.createdAt,
        updatedAt: installationsTable.updatedAt,
      })
      .from(installationsTable)
      .where(eq(installationsTable.id, installationId))
      .limit(1);

    if (!installationData.length) {
      return {
        success: false,
        error: "Installation non trouvée",
        code: ErrorCodes.INSTALLATION_NOT_FOUND,
      };
    }

    const installation = installationData[0];

    const owner = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.id, installation.ownerId))
      .limit(1);

    const objectCountData = await db
      .select({ count: count() })
      .from(objectInstallation)
      .where(eq(objectInstallation.installationId, installationId))
      .limit(1);

    const usersInInstallation = await db
      .select({
        userId: userInstallations.userId,
        role: userInstallations.role,
        user: users,
      })
      .from(userInstallations)
      .where(eq(userInstallations.installationId, installationId))
      .leftJoin(users, eq(users.id, userInstallations.userId));

    const usersList = usersInInstallation.map((item) => ({
      id: item.userId,
      name: item.user?.name || "",
      email: item.user?.email || "",
      role: item.role,
    }));

    return {
      success: true,
      data: {
        installation: {
          id: installation.id,
          name: installation.name,
          description: installation.description,
          ownerId: installation.ownerId,
          owner: { id: owner[0]?.id || "", name: owner[0]?.name || "" },
          createdAt: installation.createdAt || new Date(),
          updatedAt: installation.updatedAt || new Date(),
          users: usersList as Array<{ id: string; name: string | null; email: string; role: string }>,
          objectCount: objectCountData[0]?.count || 0,
        },
      },
    };
  } catch (error) {
    console.error("[InstallationService] Erreur:", error);
    return {
      success: false,
      error: "Erreur lors de la récupération de l'installation",
      code: ErrorCodes.INTERNAL_ERROR,
      details: error,
    };
  }
}

// Mettre à jour une installation
export async function updateInstallationService(
  input: UpdateInstallationInput,
  installationId: string
): Promise<ActionResponse<{ installationId: string }>> {
  try {
    const existingInstallation = await db
      .select()
      .from(installationsTable)
      .where(eq(installationsTable.id, installationId))
      .limit(1);

    if (!existingInstallation.length) {
      return {
        success: false,
        error: "Installation non trouvée",
        code: ErrorCodes.INSTALLATION_NOT_FOUND,
      };
    }

    await db
      .update(installationsTable)
      .set({
        ...(input.name && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        updatedAt: new Date(),
      })
      .where(eq(installationsTable.id, installationId));

    return { success: true, data: { installationId } };
  } catch (error) {
    console.error("[InstallationService] Erreur:", error);
    return {
      success: false,
      error: "Erreur lors de la mise à jour",
      code: ErrorCodes.INTERNAL_ERROR,
      details: error,
    };
  }
}

// Supprimer une installation
export async function deleteInstallationService(
  input: DeleteInstallationInput
): Promise<ActionResponse<{ installationId: string }>> {
  try {
    const existingInstallation = await db
      .select()
      .from(installationsTable)
      .where(eq(installationsTable.id, input.id))
      .limit(1);

    if (!existingInstallation.length) {
      return {
        success: false,
        error: "Installation non trouvée",
        code: ErrorCodes.INSTALLATION_NOT_FOUND,
      };
    }

    await db
      .delete(installationsTable)
      .where(eq(installationsTable.id, input.id));

    return { success: true, data: { installationId: input.id } };
  } catch (error) {
    console.error("[InstallationService] Erreur:", error);
    return {
      success: false,
      error: "Erreur lors de la suppression",
      code: ErrorCodes.INTERNAL_ERROR,
      details: error,
    };
  }
}

// Ajouter un utilisateur à une installation
export async function addUserToInstallationService(
  input: AddUserToInstallationInput
): Promise<ActionResponse<{ userInstallationId: string }>> {
  try {
    const existingInstallation = await db
      .select()
      .from(installationsTable)
      .where(eq(installationsTable.id, input.installationId))
      .limit(1);

    if (!existingInstallation.length) {
      return {
        success: false,
        error: "Installation non trouvée",
        code: ErrorCodes.INSTALLATION_NOT_FOUND,
      };
    }

    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, input.userId))
      .limit(1);

    if (!existingUser.length) {
      return {
        success: false,
        error: "Utilisateur non trouvé",
        code: ErrorCodes.USER_NOT_FOUND,
      };
    }

    const existingUserInstallation = await db
      .select()
      .from(userInstallations)
      .where(
        and(
          eq(userInstallations.installationId, input.installationId),
          eq(userInstallations.userId, input.userId)
        )
      )
      .limit(1);

    if (existingUserInstallation.length) {
      return {
        success: false,
        error: "L'utilisateur est déjà dans cette installation",
        code: ErrorCodes.INTERNAL_ERROR,
      };
    }

    await db.insert(userInstallations).values({
      userId: input.userId,
      installationId: input.installationId,
      role: input.role,
      joinedAt: new Date(),
    });

    return { success: true, data: { userInstallationId: randomUUID() } };
  } catch (error) {
    console.error("[InstallationService] Erreur:", error);
    return {
      success: false,
      error: "Erreur lors de l'ajout de l'utilisateur",
      code: ErrorCodes.INTERNAL_ERROR,
      details: error,
    };
  }
}

// Supprimer un utilisateur d'une installation
export async function removeUserFromInstallationService(
  input: RemoveUserFromInstallationInput
): Promise<ActionResponse<{ userInstallationId: string }>> {
  try {
    const existingUserInstallation = await db
      .select()
      .from(userInstallations)
      .where(
        and(
          eq(userInstallations.installationId, input.installationId),
          eq(userInstallations.userId, input.userId)
        )
      )
      .limit(1);

    if (!existingUserInstallation.length) {
      return {
        success: false,
        error: "L'utilisateur n'est pas dans cette installation",
        code: ErrorCodes.NOT_FOUND,
      };
    }

    await db
      .delete(userInstallations)
      .where(
        and(
          eq(userInstallations.installationId, input.installationId),
          eq(userInstallations.userId, input.userId)
        )
      );

    return { success: true, data: { userInstallationId: existingUserInstallation[0].userId } };
  } catch (error) {
    console.error("[InstallationService] Erreur:", error);
    return {
      success: false,
      error: "Erreur lors de la suppression de l'utilisateur",
      code: ErrorCodes.INTERNAL_ERROR,
      details: error,
    };
  }
}

// Vérifier l'accès à une installation
export async function checkInstallationAccessService(
  userId: string,
  installationId: string
): Promise<ActionResponse<{ hasAccess: boolean; role: string }>> {
  try {
    const userInstallation = await db
      .select({ role: userInstallations.role })
      .from(userInstallations)
      .where(
        and(
          eq(userInstallations.userId, userId),
          eq(userInstallations.installationId, installationId)
        )
      )
      .limit(1);

    if (!userInstallation.length) {
      return { success: true, data: { hasAccess: false, role: "" } };
    }

    return { success: true, data: { hasAccess: true, role: userInstallation[0]?.role || "viewer" } };
  } catch (error) {
    console.error("[InstallationService] Erreur:", error);
    return {
      success: false,
      error: "Erreur lors de la vérification d'accès",
      code: ErrorCodes.INTERNAL_ERROR,
      details: error,
    };
  }
}
