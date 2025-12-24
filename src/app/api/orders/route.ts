// src/app/api/orders/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import admin from '@/lib/firebase/admin';

// GET single order
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    const uid = decodedToken.uid;
    const role = decodedToken.role || 'customer';

    const db = admin.firestore();
    const orderDoc = await db.collection('orders').doc(id).get();

    if (!orderDoc.exists) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = orderDoc.data();

    // Check authorization
    if (role !== 'admin') {
      if (role === 'vendor' && order?.vendorId !== uid) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (role === 'customer' && order?.customerId !== uid) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return NextResponse.json({
      id: orderDoc.id,
      ...order,
      createdAt: order?.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: order?.updatedAt?.toDate?.()?.toISOString() || null,
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}

// PATCH - Update order status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    const uid = decodedToken.uid;
    const role = decodedToken.role || 'customer';

    // Only vendors and admins can update orders
    if (role !== 'vendor' && role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = admin.firestore();
    const orderRef = db.collection('orders').doc(id);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = orderDoc.data();

    // Vendors can only update their own orders
    if (role === 'vendor' && order?.vendorId !== uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { status } = body;

    // Validate status
    const validStatuses = [
      'pending',
      'confirmed',
      'preparing',
      'ready_for_pickup',
      'out_for_delivery',
      'delivered',
      'cancelled',
    ];

    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Update order
    const updateData: Record<string, unknown> = {
      status,
      updatedAt: admin.firestore.Timestamp.now(),
    };

    // Add timestamp for specific statuses
    if (status === 'confirmed') {
      updateData.confirmedAt = admin.firestore.Timestamp.now();
    } else if (status === 'delivered') {
      updateData.deliveredAt = admin.firestore.Timestamp.now();
    }

    await orderRef.update(updateData);

    // Also update vendor and customer subcollections
    const batch = db.batch();
    
    if (order?.vendorId) {
      const vendorOrderRef = db
        .collection('vendors')
        .doc(order.vendorId)
        .collection('orders')
        .doc(id);
      batch.update(vendorOrderRef, { status, updatedAt: admin.firestore.Timestamp.now() });
    }

    if (order?.customerId) {
      const customerOrderRef = db
        .collection('customers')
        .doc(order.customerId)
        .collection('orders')
        .doc(id);
      batch.update(customerOrderRef, { status, updatedAt: admin.firestore.Timestamp.now() });
    }

    await batch.commit();

    return NextResponse.json({ success: true, status });
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}