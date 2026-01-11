// src/app/api/test/notification/route.ts
// ⚠️ DELETE THIS FILE BEFORE PRODUCTION - Testing only!

import { NextRequest, NextResponse } from 'next/server';
import admin from '@/lib/firebase/admin';

export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { userId, type = 'order_placed' } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const db = admin.firestore();

    // Create test notification
    const notification = {
      userId,
      type,
      title: type === 'order_placed' 
        ? 'New Order Received! 🎉' 
        : 'Order Status Updated',
      message: type === 'order_placed'
        ? 'Test Customer placed an order for $25.99 (2 items)'
        : 'Your order is being prepared',
      read: false,
      priority: 'high',
      data: {
        orderId: 'TEST-' + Date.now(),
        vendorId: userId,
        url: '/vendor/orders',
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('notifications').add(notification);

    return NextResponse.json({
      success: true,
      notificationId: docRef.id,
      message: 'Test notification created!',
    });
  } catch (error) {
    console.error('Test notification error:', error);
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
  }
}

// GET - List recent notifications for a user
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  const userId = request.nextUrl.searchParams.get('userId');
  
  if (!userId) {
    return NextResponse.json({ error: 'userId query param required' }, { status: 400 });
  }

  try {
    const db = admin.firestore();
    const snapshot = await db
      .collection('notifications')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ notifications, count: notifications.length });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}