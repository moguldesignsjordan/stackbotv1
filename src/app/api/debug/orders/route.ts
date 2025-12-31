// src/app/api/debug/orders/route.ts
// TEMPORARY DEBUG ENDPOINT - Remove in production

import { NextRequest, NextResponse } from 'next/server';
import admin from '@/lib/firebase/admin';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Only admin can access debug endpoint
    if (decodedToken.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const db = admin.firestore();
    
    // Get recent orders
    const ordersSnap = await db.collection('orders')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

 const orders: any[] = ordersSnap.docs.map(doc => ({
  id: doc.id,
  ...doc.data(),
  createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
}));


    // Get orders count
    const countSnap = await db.collection('orders').count().get();
    const totalOrders = countSnap.data().count;

    // Check for common issues
    const issues: string[] = [];

    // Check if STRIPE_WEBHOOK_SECRET is set
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      issues.push('STRIPE_WEBHOOK_SECRET is not set in environment variables');
    }

    // Check if STRIPE_SECRET_KEY is set
    if (!process.env.STRIPE_SECRET_KEY) {
      issues.push('STRIPE_SECRET_KEY is not set in environment variables');
    }

    // Check for orders with missing data
    for (const order of orders) {
      if (!order.items || order.items.length === 0) {
        issues.push(`Order ${order.orderId || order.id} has no items`);
      }
      if (!order.customerInfo?.name) {
        issues.push(`Order ${order.orderId || order.id} missing customerInfo`);
      }
    }

    return NextResponse.json({
      success: true,
      totalOrders,
      recentOrders: orders,
      issues,
      environment: {
        hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
        hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
        nodeEnv: process.env.NODE_ENV,
      },
      tip: 'If totalOrders is 0 after placing an order, check Stripe Dashboard > Webhooks to see if events are being delivered',
    });
  } catch (error) {
    console.error('[Debug] Error:', error);
    return NextResponse.json({
      error: 'Debug check failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}