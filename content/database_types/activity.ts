import { User } from './user';

// Activity Log Types

export interface ActivityLog {
  id: number;
  userId: string;
  action: string;
  details?: string | null;
  createdAt: Date;
}

export interface ActivityLogWithUser extends ActivityLog {
  user: User;
}

export interface CreateActivityLogInput {
  userId: string;
  action: string;
  details?: string;
}

export type ActivityAction =
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'user.banned'
  | 'user.unbanned'
  | 'ride.created'
  | 'ride.updated'
  | 'ride.assigned'
  | 'ride.completed'
  | 'ride.cancelled'
  | 'invoice.created'
  | 'invoice.sent'
  | 'invoice.paid'
  | 'invoice.cancelled'
  | 'assignment.requested'
  | 'assignment.approved'
  | 'assignment.rejected'
  | 'rating.created'
  | 'rating.updated'
  | 'shift.created'
  | 'shift.updated'
  | 'shift.started'
  | 'shift.ended'
  | 'production.created'
  | 'production.updated'
  | 'project.created'
  | 'project.updated'
  | 'login.success'
  | 'login.failed'
  | 'logout';

export interface ActivityFilters {
  userId?: string;
  action?: ActivityAction | ActivityAction[];
  startDate?: Date;
  endDate?: Date;
}

export interface ActivitySummary {
  totalActivities: number;
  topActions: { action: string; count: number }[];
  activeUsers: number;
  activitiesByDay: { date: string; count: number }[];
}
