// src/lib/types/notifications.ts

/**
 * All supported notification types in StackBot
 */
export type NotificationType =
  // Order lifecycle
  | 'order_placed'
  | 'order_confirmed'
  | 'order_preparing'
  | 'order_ready'
  | 'order_delivered'
  | 'order_cancelled'
  // Vendor lifecycle
  | 'vendor_application'
  | 'vendor_approved'
  | 'vendor_rejected'
  // Product lifecycle
  | 'product_approved'
  | 'product_rejected'
  // Reviews
  | 'new_review'
  // Payments
  | 'payment_received'
  | 'payment_failed'
  // System
  | 'system'
  | 'promo';

/**
 * Notification priority levels
 */
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

/**
 * Core notification interface
 */
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  priority: NotificationPriority;
  data: NotificationData;
  createdAt: Date;
  readAt?: Date;
  expiresAt?: Date;
}

/**
 * Flexible data payload for notifications
 */
export interface NotificationData {
  orderId?: string;
  vendorId?: string;
  productId?: string;
  customerId?: string;
  url?: string;
  amount?: number;
  rating?: number;
  status?: string;
  vendorName?: string;
  [key: string]: unknown;
}

/**
 * Params for creating a notification
 */
export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  data?: NotificationData;
  expiresAt?: Date;
}

/**
 * Push notification token stored in Firestore
 */
export interface PushToken {
  token: string;
  platform: 'web' | 'ios' | 'android';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User notification preferences
 */
export interface NotificationPreferences {
  pushEnabled: boolean;
  emailEnabled: boolean;
  orderUpdates: boolean;
  promotions: boolean;
  reviews: boolean;
}