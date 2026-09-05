import { User } from './user';

// Notification Types

export interface Notification {
  id: number;
  userId: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

export interface NotificationWithUser extends Notification {
  user: User;
}

export interface CreateNotificationInput {
  userId: string;
  message: string;
}

export interface NotificationPreferences {
  id: number;
  userId: string;
  email: boolean;
  push: boolean;
  createdAt: Date;
}

export interface UpdateNotificationPreferencesInput {
  email?: boolean;
  push?: boolean;
}

export interface NotificationFilters {
  userId?: string;
  isRead?: boolean;
  startDate?: Date;
  endDate?: Date;
}

export type NotificationType = 
  | 'ride_assigned'
  | 'ride_completed'
  | 'ride_cancelled'
  | 'invoice_sent'
  | 'invoice_overdue'
  | 'payment_received'
  | 'assignment_request'
  | 'assignment_approved'
  | 'assignment_rejected'
  | 'new_rating'
  | 'account_banned'
  | 'shift_reminder';

export interface NotificationTemplate {
  type: NotificationType;
  title: string;
  message: string;
  channel: ('email' | 'push' | 'in-app')[];
}

export interface SendNotificationInput {
  userIds: string[];
  type: NotificationType;
  data?: Record<string, any>;
}
