// src/lib/notifications/createNotificationClient.ts
/**
 * Notification Creation Helpers (Client-Side)
 * 
 * Use these functions in client components where you can't use admin SDK.
 * These use the regular Firebase client SDK.
 */

import { db } from '@/lib/firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import type { NotificationType, NotificationPriority } from '@/lib/types/notifications';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  data?: {
    orderId?: string;
    vendorId?: string;
    productId?: string;
    customerId?: string;
    url?: string;
    [key: string]: unknown;
  };
}

/**
 * Create a notification (Client SDK version)
 */
export async function createNotificationClient(params: CreateNotificationParams) {
  try {
    const notification = {
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      read: false,
      priority: params.priority || 'normal',
      data: params.data || {},
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'notifications'), notification);
    console.log(`✅ Notification created: ${docRef.id} (type: ${params.type})`);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error creating notification:', error);
    throw error;
  }
}

/**
 * Notify vendor of new review (Client-side)
 */
export async function notifyVendorNewReviewClient(params: {
  vendorId: string;
  reviewerName: string;
  rating: number;
  comment: string;
}) {
  return createNotificationClient({
    userId: params.vendorId,
    type: 'new_review',
    title: `New ${params.rating}-Star Review`,
    message: `${params.reviewerName} left a review: "${params.comment.substring(0, 100)}${params.comment.length > 100 ? '...' : ''}"`,
    priority: 'normal',
    data: {
      vendorId: params.vendorId,
      rating: params.rating,
      url: `/vendor/reviews`,
    },
  });
}