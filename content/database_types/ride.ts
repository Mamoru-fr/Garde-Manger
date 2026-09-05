import { User } from './user';
import { Production } from './production';
import { Project } from './production';

// Ride Types

export type RideStatus = 'pending' | 'assigned' | 'completed' | 'cancelled';

export interface Ride {
  id: number;
  departure: string;
  destination: string;
  departureTime: Date;
  arrivalTime?: Date | null;
  distanceKm?: string | null;
  price: string;
  status: RideStatus;
  photoUrl?: string | null;
  createdAt: Date;
  driverId?: string | null;
  customerNotes?: string | null;
  production?: string | null;
  project?: string | null;
  waitingTime: number; // in minutes
  options: Option[];
}

export interface RideWithRelations extends Ride {
  driver?: User | null;
  customers: User[];
  selectedOptions: RideSelectedOption[];
  productionDetails?: Production | null;
  projectDetails?: Project | null;
}

export interface CreateRideInput {
  departure: string;
  destination: string;
  departureTime: Date;
  price: string;
  customerIds: string[];
  driverId?: string;
  customerNotes?: string;
  production?: string;
  project?: string;
  options?: Option[];
  photoUrl?: string;
}

export interface UpdateRideInput {
  departure?: string;
  destination?: string;
  departureTime?: Date;
  arrivalTime?: Date;
  distanceKm?: string;
  price?: string;
  status?: RideStatus;
  driverId?: string;
  customerNotes?: string;
  waitingTime?: number;
  options?: Option[];
}

export interface RideCustomer {
  id: number;
  rideId: number;
  customerId: string;
  createdAt: Date;
}

export const OPTIONS = [
  "vip",
  "baby_seat",
  "van",
  "luxury",
  "pet_friendly",
  "extra_luggage",
  "wheelchair_accessible",
  "motorbike"
] as const;

export type Option = typeof OPTIONS[number];

export interface RideOption {
  id: number;
  name: Option;
  description?: string | null;
  additionalPrice: string;
}

export interface RideSelectedOption {
  id: number;
  rideId: number;
  optionName: Option;
  price: string;
}

export interface AssignmentRequest {
  id: number;
  rideId: number;
  driverId: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: Date;
}

export interface AssignmentRequestWithRelations extends AssignmentRequest {
  ride: Ride;
  driver: User;
}

export interface CreateAssignmentRequestInput {
  rideId: number;
  driverId: string;
}

export interface RideFilters {
  status?: RideStatus;
  driverId?: string;
  customerId?: string;
  production?: string;
  project?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface RideStats {
  totalRides: number;
  completedRides: number;
  cancelledRides: number;
  totalRevenue: string;
  averageDistance: string;
  totalDistance: string;
}
