import { User } from './user';
import { Production, Project } from './production';

// Shift Planning Types

export type ShiftStatus = 'planned' | 'active' | 'completed' | 'cancelled';

export interface ShiftPlanning {
  id: number;
  driverId: string;
  startTime: Date;
  endTime: Date;
  status: ShiftStatus;
  productionId?: string | null;
  projectId?: string | null;
}

export interface ShiftPlanningWithRelations extends ShiftPlanning {
  driver: User;
  production?: Production | null;
  project?: Project | null;
}

export interface CreateShiftInput {
  driverId: string;
  startTime: Date;
  endTime: Date;
  productionId?: string;
  projectId?: string;
}

export interface UpdateShiftInput {
  startTime?: Date;
  endTime?: Date;
  status?: ShiftStatus;
  productionId?: string;
  projectId?: string;
}

export interface ShiftFilters {
  driverId?: string;
  status?: ShiftStatus;
  productionId?: string;
  projectId?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface ShiftConflict {
  shift: ShiftPlanning;
  conflictingShift: ShiftPlanning;
  reason: string;
}

export interface DriverAvailability {
  driverId: string;
  date: Date;
  availableSlots: TimeSlot[];
  bookedSlots: TimeSlot[];
}

export interface TimeSlot {
  start: Date;
  end: Date;
}

export interface ShiftStatistics {
  totalShifts: number;
  completedShifts: number;
  activeShifts: number;
  totalHours: number;
  averageShiftDuration: number;
}
