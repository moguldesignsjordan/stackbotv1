// Fix: Import 'db' instead of 'adminDb' because that is what your admin.ts exports
import { db as adminDb } from '@/lib/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { NotificationType, NotificationPriority } from '@/lib/types/notifications';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  data?: Record<string, any>;
  expiresAt?: Date;
}

/**
 * Creates a notification in Firestore using the Admin SDK
 * Safe to use in API routes and Webhooks
 */
export async function createNotification({
  userId,
  type,
  title,
  message,
  priority = 'normal',
  data = {},
  expiresAt
}: CreateNotificationParams) {
  try {
    const notificationData: any = {
      userId,
      type,
      title,
      message,
      priority,
      data,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    };

    if (expiresAt) {
      notificationData.expiresAt = Timestamp.fromDate(expiresAt);
    }

    // Add to global notifications collection
    await adminDb.collection('notifications').add(notificationData);
    
    // Also add to user's private notification subcollection for easier querying
    // (This redundancy helps with security rules and query performance)
    if (type.startsWith('vendor_')) {
        await adminDb.collection('vendors').doc(userId).collection('notifications').add(notificationData);
    } else {
        await adminDb.collection('users').doc(userId).collection('notifications').add(notificationData);
    }

    return true;
  } catch (error) {
    console.error('Error creating notification:', error);
    return false;
  }
}
