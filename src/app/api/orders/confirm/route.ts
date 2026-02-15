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
    let orderData: any = null;
    let docId: string | null = null;

    // 1. Try to find by Order ID (doc ID or orderId field)
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
        const snapshot = await db
          .collection('orders')
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

    // 2. Fallback: try Stripe Session ID
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

    if (!orderData || !docId) {
      console.log("--- DEBUG: No Order Found (Returning 404) ---");
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // 3. Build response with all fields needed for live tracking
    console.log("--- DEBUG: Success (Returning 200) ---");
    return NextResponse.json({
      order: {
        // Firestore document ID — critical for real-time onSnapshot listener
        docId,
        orderId: orderData.orderId || docId,
        status: orderData.status || 'pending',
        trackingPin: orderData.trackingPin || null,
        vendorName: orderData.vendorName || 'StackBot Vendor',
        vendorId: orderData.vendorId || null,
        vendorCoordinates: orderData.vendorCoordinates || null,
        total: orderData.totalAmount || orderData.total || 0,
        subtotal: orderData.subtotal || 0,
        tax: orderData.tax || 0,
        deliveryFee: orderData.deliveryFee || 0,
        fulfillmentType: orderData.fulfillmentType || orderData.deliveryMethod || 'delivery',
        driverId: orderData.driverId || null,
        driverName: orderData.driverName || null,
        driverLocation: orderData.driverLocation || null,
        customerInfo: {
          name: orderData.customerName || orderData.customer?.name || 'Customer',
          email: orderData.customerEmail || orderData.customer?.email || null,
        },
        deliveryAddress: orderData.deliveryAddress
          ? {
              ...orderData.deliveryAddress,
              // Ensure coordinates is always present (even if null)
              coordinates: orderData.deliveryAddress.coordinates || null,
            }
          : {
              street: 'Digital Delivery',
              city: 'Online',
              country: 'Global',
              coordinates: null,
            },
        items: orderData.items || [],
      },
    });
  } catch (error: any) {
    console.error('--- DEBUG: Server Error ---', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}