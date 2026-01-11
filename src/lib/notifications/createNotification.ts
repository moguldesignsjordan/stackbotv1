// src/lib/notifications/createNotification.ts
/**
 * Notification Creation Helpers (Server-Side with Admin SDK)
 * 
 * Use these functions in API routes and Cloud Functions to create notifications.
 * These use Firebase Admin SDK, not the client SDK.
 */

import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
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
  expiresAt?: Date;
}

/**
 * Create a notification (Admin SDK version for server-side)
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    const notification = {
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      read: false,
      priority: params.priority || 'normal',
      data: params.data || {},
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: params.expiresAt || null,
    };

    const docRef = await adminDb.collection('notifications').add(notification);
    console.log(`✅ Notification created: ${docRef.id} (type: ${params.type})`);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error creating notification:', error);
    throw error;
  }
}

/**
 * VENDOR NOTIFICATION HELPERS
 */

/**
 * Notify vendor of new order
 */
export async function notifyVendorNewOrder(params: {
  vendorId: string;
  orderId: string;
  customerName: string;
  totalAmount: number;
  itemCount: number;
}) {
  return createNotification({
    userId: params.vendorId,
    type: 'order_placed',
    title: 'New Order Received',
    message: `${params.customerName} placed an order for $${params.totalAmount.toFixed(2)} (${params.itemCount} item${params.itemCount !== 1 ? 's' : ''})`,
    priority: 'high',
    data: {
      orderId: params.orderId,
      vendorId: params.vendorId,
      customerId: params.customerName,
      url: `/vendor/orders/${params.orderId}`,
    },
  });
}

/**
 * Notify vendor when order is confirmed
 */
export async function notifyVendorOrderConfirmed(params: {
  vendorId: string;
  orderId: string;
  customerName: string;
}) {
  return createNotification({
    userId: params.vendorId,
    type: 'order_confirmed',
    title: 'Order Confirmed',
    message: `Order from ${params.customerName} has been confirmed and is ready for preparation`,
    priority: 'normal',
    data: {
      orderId: params.orderId,
      vendorId: params.vendorId,
      url: `/vendor/orders/${params.orderId}`,
    },
  });
}

/**
 * Notify vendor when order is completed/delivered
 */
export async function notifyVendorOrderCompleted(params: {
  vendorId: string;
  orderId: string;
  customerName: string;
  totalAmount: number;
}) {
  return createNotification({
    userId: params.vendorId,
    type: 'order_delivered',
    title: 'Order Completed',
    message: `Order from ${params.customerName} has been completed. Payment of $${params.totalAmount.toFixed(2)} has been processed`,
    priority: 'normal',
    data: {
      orderId: params.orderId,
      vendorId: params.vendorId,
      url: `/vendor/orders/${params.orderId}`,
    },
  });
}

/**
 * Notify vendor when order is cancelled
 */
export async function notifyVendorOrderCancelled(params: {
  vendorId: string;
  orderId: string;
  customerName: string;
  reason?: string;
}) {
  return createNotification({
    userId: params.vendorId,
    type: 'order_cancelled',
    title: 'Order Cancelled',
    message: `Order from ${params.customerName} has been cancelled${params.reason ? `: ${params.reason}` : ''}`,
    priority: 'normal',
    data: {
      orderId: params.orderId,
      vendorId: params.vendorId,
      url: `/vendor/orders/${params.orderId}`,
    },
  });
}

/**
 * Notify vendor of new review
 */
export async function notifyVendorNewReview(params: {
  vendorId: string;
  reviewerName: string;
  rating: number;
  comment: string;
}) {
  return createNotification({
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

/**
 * Notify vendor of low stock
 */
export async function notifyVendorLowStock(params: {
  vendorId: string;
  productId: string;
  productName: string;
  stockLevel: number;
}) {
  return createNotification({
    userId: params.vendorId,
    type: 'system',
    title: 'Low Stock Alert',
    message: `${params.productName} is running low on stock (${params.stockLevel} remaining)`,
    priority: 'normal',
    data: {
      vendorId: params.vendorId,
      productId: params.productId,
      stockLevel: params.stockLevel,
      url: `/vendor/products/${params.productId}`,
    },
  });
}

/**
 * Notify vendor when product is approved
 */
export async function notifyVendorProductApproved(params: {
  vendorId: string;
  productId: string;
  productName: string;
}) {
  return createNotification({
    userId: params.vendorId,
    type: 'product_approved',
    title: 'Product Approved',
    message: `Your product "${params.productName}" has been approved and is now live`,
    priority: 'normal',
    data: {
      vendorId: params.vendorId,
      productId: params.productId,
      url: `/vendor/products/${params.productId}`,
    },
  });
}

/**
 * Notify vendor when product is rejected
 */
export async function notifyVendorProductRejected(params: {
  vendorId: string;
  productId: string;
  productName: string;
  reason?: string;
}) {
  return createNotification({
    userId: params.vendorId,
    type: 'product_rejected',
    title: 'Product Rejected',
    message: `Your product "${params.productName}" was rejected${params.reason ? `: ${params.reason}` : ''}`,
    priority: 'normal',
    data: {
      vendorId: params.vendorId,
      productId: params.productId,
      url: `/vendor/products/${params.productId}`,
    },
  });
}

/**
 * Notify vendor of payment received
 */
export async function notifyVendorPaymentReceived(params: {
  vendorId: string;
  amount: number;
  period: string;
}) {
  return createNotification({
    userId: params.vendorId,
    type: 'payment_received',
    title: 'Payment Received',
    message: `Your ${params.period} payout of $${params.amount.toFixed(2)} has been processed`,
    priority: 'high',
    data: {
      vendorId: params.vendorId,
      amount: params.amount,
      url: `/vendor/payouts`,
    },
  });
}

/**
 * CUSTOMER NOTIFICATION HELPERS
 */

/**
 * Notify customer when order status changes
 */
export async function notifyCustomerOrderUpdate(params: {
  customerId: string;
  orderId: string;
  status: string;
  vendorName: string;
}) {
  const statusMessages: Record<string, { title: string; message: string; type: NotificationType }> = {
    confirmed: {
      title: 'Order Confirmed',
      message: `Your order from ${params.vendorName} has been confirmed`,
      type: 'order_confirmed',
    },
    preparing: {
      title: 'Order Being Prepared',
      message: `${params.vendorName} is preparing your order`,
      type: 'order_preparing',
    },
    ready: {
      title: 'Order Ready',
      message: `Your order from ${params.vendorName} is ready for pickup`,
      type: 'order_ready',
    },
    delivered: {
      title: 'Order Delivered',
      message: `Your order from ${params.vendorName} has been delivered`,
      type: 'order_delivered',
    },
    cancelled: {
      title: 'Order Cancelled',
      message: `Your order from ${params.vendorName} has been cancelled`,
      type: 'order_cancelled',
    },
  };

  const config = statusMessages[params.status] || {
    title: 'Order Updated',
    message: `Your order from ${params.vendorName} has been updated`,
    type: 'system' as NotificationType,
  };

  return createNotification({
    userId: params.customerId,
    type: config.type,
    title: config.title,
    message: config.message,
    priority: 'normal',
    data: {
      orderId: params.orderId,
      vendorName: params.vendorName,
      status: params.status,
      url: `/account/orders/${params.orderId}`,
    },
  });
}