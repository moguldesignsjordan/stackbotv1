// src/app/api/orders/confirm/route.ts
import { NextRequest, NextResponse } from 'next/server';
import admin from '@/lib/firebase/admin';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, orderId } = await request.json();

    if (!sessionId && !orderId) {
      return NextResponse.json({ error: 'Missing order reference' }, { status: 400 });
    }

    const db = admin.firestore();
    let orderData = null;
    let docId = null;

    // 1. Try to find by Order ID first
    if (orderId) {
      const docRef = db.collection('orders').doc(orderId);
      const doc = await docRef.get();
      if (doc.exists) {
        orderData = doc.data();
        docId = doc.id;
      }
    }

    // 2. If not found by ID, try finding by Stripe Session ID
    if (!orderData && sessionId) {
      const snapshot = await db
        .collection('orders')
        .where('stripeSessionId', '==', sessionId)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        orderData = doc.data();
        docId = doc.id;
      }
    }

    if (!orderData) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // 3. Return the data your frontend expects
    return NextResponse.json({
      order: {
        orderId: orderData.orderId || docId,
        total: orderData.totalAmount || orderData.total || 0,
        customerInfo: {
          name: orderData.customerName || orderData.customer?.name || 'Customer',
          email: orderData.customerEmail || orderData.customer?.email,
        },
        items: orderData.items || [],
      }
    });

  } catch (error) {
    console.error('Error fetching confirmation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}