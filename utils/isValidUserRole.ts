import {SessionWithUser, UserRole} from "@/content/database_types";

export function isValidUserRole(role: string): role is UserRole {
  return ['admin', 'driver', 'customer'].includes(role);
}

export function getValidatedRole(session: SessionWithUser | null): UserRole | null {
    if (!session?.user?.role) return null;
    return isValidUserRole(session.user.role) ? session.user.role : null;
}