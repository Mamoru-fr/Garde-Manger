// User Types

export type UserRole = 'admin' | 'driver' | 'customer';

export const VEHICLE_TYPE = [
  "sedan",
  "suv",
  "van",
  "motorbike",
  "luxury",
  "electrical"
] as const;

export type VehicleType = typeof VEHICLE_TYPE[number];

export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
  role?: string | null; // better-auth returns string, we validate it's a UserRole at runtime
  banned?: boolean | null;
  banReason?: string | null;
  banExpires?: Date | null;
  // Driver-specific fields
  vehicleType?: string | null; // better-auth returns string
  vehiclePlate?: string | null;
  vehicleModel?: string | null;
  vehicleColor?: string | null;
}

export interface CreateUserInput {
  name: string;
  email: string;
  role?: UserRole;
  image?: string;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  image?: string;
  role?: UserRole;
  vehicleType?: VehicleType;
  vehiclePlate?: string;
  vehicleModel?: string;
  vehicleColor?: string;
}

export interface BanUserInput {
  userId: string;
  reason: string;
  expiresAt?: Date;
}

export interface DriverInfo {
  vehicleType: VehicleType;
  vehiclePlate: string;
  vehicleModel: string;
  vehicleColor: string;
}

export interface UserWithStats extends User {
  totalRides: number;
  averageRating: number;
  totalEarnings: number;
}
