// src/app/api/track-order/route.ts

import { NextRequest, NextResponse } from 'next/server';
import admin from '@/lib/firebase/admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    const pin = searchParams.get('pin');

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    const db = admin.firestore();
    
    // Search by orderId field (the human-readable order ID like "ORD-ABC123")
    let orderDoc;
    let orderData;

    // First, try to find by orderId field
    const querySnapshot = await db
      .collection('orders')
      .where('orderId', '==', orderId.trim().toUpperCase())
      .limit(1)
      .get();

    if (!querySnapshot.empty) {
      orderDoc = querySnapshot.docs[0];
      orderData = orderDoc.data();
    } else {
      // Fallback: try finding by document ID
      const docRef = await db.collection('orders').doc(orderId.trim()).get();
      if (docRef.exists) {
        orderDoc = docRef;
        orderData = docRef.data();
      }
    }

    if (!orderDoc || !orderData) {
      return NextResponse.json(
        { error: 'Order not found. Please check your order ID and try again.' },
        { status: 404 }
      );
    }

    // If tracking PIN exists on order, verify it
    if (orderData.trackingPin && pin) {
      if (orderData.trackingPin !== pin.trim()) {
        return NextResponse.json(
          { error: 'Invalid tracking PIN' },
          { status: 403 }
        );
      }
    }

    // Get vendor info for phone number (if needed)
    let vendorPhone = null;
    if (orderData.vendorId) {
      try {
        const vendorDoc = await db.collection('vendors').doc(orderData.vendorId).get();
        if (vendorDoc.exists) {
          const vendorData = vendorDoc.data();
          vendorPhone = vendorData?.phone || vendorData?.contactPhone || null;
        }
      } catch (err) {
        console.error('Error fetching vendor:', err);
      }
    }

    // Format timestamps
    const formatTimestamp = (timestamp: admin.firestore.Timestamp | null | undefined) => {
      if (!timestamp) return null;
      return timestamp.toDate?.()?.toISOString() || null;
    };

    // Return limited order data for public tracking (no sensitive info)
    const publicOrderData = {
      id: orderDoc.id,
      orderId: orderData.orderId,
      trackingPin: orderData.trackingPin || null,
      vendorId: orderData.vendorId,
      vendorName: orderData.vendorName,
      vendorSlug: orderData.vendorSlug || null,
      vendorPhone,
      items: (orderData.items || []).map((item: Record<string, unknown>) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        image: item.image || (Array.isArray(item.images) ? item.images[0] : null) || null,
        notes: item.notes || null,
      })),
      subtotal: orderData.subtotal || 0,
      deliveryFee: orderData.deliveryFee || 0,
      tax: orderData.tax || 0,
      total: orderData.total || 0,
      status: orderData.status,
      deliveryMethod: orderData.deliveryMethod || 'delivery',
      deliveryAddress: orderData.deliveryMethod === 'delivery' 
        ? {
            street: orderData.deliveryAddress?.street || orderData.shippingAddress?.street,
            city: orderData.deliveryAddress?.city || orderData.shippingAddress?.city,
            state: orderData.deliveryAddress?.state || orderData.shippingAddress?.state,
            zip: orderData.deliveryAddress?.zip || orderData.shippingAddress?.zip,
          }
        : null,
      estimatedTime: orderData.estimatedTime || null,
      // Timestamps
      createdAt: formatTimestamp(orderData.createdAt),
      confirmedAt: formatTimestamp(orderData.confirmedAt),
      preparingAt: formatTimestamp(orderData.preparingAt),
      readyAt: formatTimestamp(orderData.readyAt),
      outForDeliveryAt: formatTimestamp(orderData.outForDeliveryAt),
      deliveredAt: formatTimestamp(orderData.deliveredAt),
      pickedUpAt: formatTimestamp(orderData.pickedUpAt),
      cancelledAt: formatTimestamp(orderData.cancelledAt),
    };

    return NextResponse.json(publicOrderData);
  } catch (error) {
    console.error('Error tracking order:', error);
    return NextResponse.json(
      { error: 'Failed to track order. Please try again.' },
      { status: 500 }
    );
  }
}