// src/app/api/orders/confirm/route.ts
import { NextRequest, NextResponse } from 'next/server';
import admin from '@/lib/firebase/admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, orderId } = body;

    console.log("--- DEBUG: API Request Received ---");
    console.log("Input Session ID:", sessionId);
    console.log("Input Order ID:", orderId);

    if (!sessionId && !orderId) {
      console.log("Error: Missing both IDs");
      return NextResponse.json({ error: 'Missing order reference' }, { status: 400 });
    }

    const db = admin.firestore();
    let orderData = null;
    let docId = null;

    // 1. Try to find by Order ID
    if (orderId) {
      console.log(`Attempting search by Doc ID: ${orderId}`);
      const docRef = db.collection('orders').doc(orderId);
      const doc = await docRef.get();
      
      if (doc.exists) {
        console.log("Found by Doc ID!");
        orderData = doc.data();
        docId = doc.id;
      } else {
        console.log("Not found by Doc ID. Trying 'orderId' field query...");
        // Fallback: Try assuming orderId is a custom field
        const snapshot = await db.collection('orders')
          .where('orderId', '==', orderId)
          .limit(1)
          .get();
        
        if (!snapshot.empty) {
          console.log("Found by 'orderId' field!");
          orderData = snapshot.docs[0].data();
          docId = snapshot.docs[0].id;
        } else {
            console.log("Failed to find by 'orderId' field.");
        }
      }
    }

    // 2. If not found, try Stripe Session
    if (!orderData && sessionId) {
      console.log(`Attempting search by Session ID: ${sessionId}`);
      const snapshot = await db
        .collection('orders')
        .where('stripeSessionId', '==', sessionId)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        console.log("Found by Stripe Session ID!");
        const doc = snapshot.docs[0];
        orderData = doc.data();
        docId = doc.id;
      } else {
        console.log("Failed to find by Stripe Session ID.");
      }
    }

    if (!orderData) {
      console.log("--- DEBUG: No Order Found (Returning 404) ---");
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // 3. Return Data
    console.log("--- DEBUG: Success (Returning 200) ---");
    return NextResponse.json({
      order: {
        orderId: orderData.orderId || docId,
        status: orderData.status || 'pending',
        trackingPin: orderData.trackingPin || null, 
        vendorName: orderData.vendorName || 'StackBot Vendor',
        total: orderData.totalAmount || orderData.total || 0,
        subtotal: orderData.subtotal || 0,
        tax: orderData.tax || 0,
        deliveryFee: orderData.deliveryFee || 0,
        customerInfo: {
          name: orderData.customerName || orderData.customer?.name || 'Customer',
          email: orderData.customerEmail || orderData.customer?.email,
        },
        deliveryAddress: orderData.deliveryAddress || {
            street: 'Digital Delivery',
            city: 'Online',
            country: 'Global'
        },
        items: orderData.items || [],
      }
    });

  } catch (error: any) {
    console.error('--- DEBUG: Server Error ---', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}