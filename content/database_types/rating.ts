import { User } from './user';
import { Ride } from './ride';

// Rating and Review Types

export interface Rating {
  id: number;
  rideId: number;
  customerId: string;
  rating: number; // 1-5
  comment?: string | null;
  createdAt: Date;
}

export interface RatingWithRelations extends Rating {
  customer: User;
  ride: Ride;
}

export interface CreateRatingInput {
  rideId: number;
  customerId: string;
  rating: number;
  comment?: string;
}

export interface UpdateRatingInput {
  rating?: number;
  comment?: string;
}

export interface RatingFilters {
  rideId?: number;
  customerId?: string;
  driverId?: string;
  minRating?: number;
  maxRating?: number;
  startDate?: Date;
  endDate?: Date;
}

export interface RatingStats {
  averageRating: number;
  totalRatings: number;
  fiveStars: number;
  fourStars: number;
  threeStars: number;
  twoStars: number;
  oneStars: number;
}

export interface DriverRatingsSummary {
  driverId: string;
  driverName: string;
  averageRating: number;
  totalRatings: number;
  recentRatings: Rating[];
}
