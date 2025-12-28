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
    const { status, notes } = body;

    const updateData: Record<string, any> = {
      updatedAt: admin.firestore.Timestamp.now(),
    };

    if (status) {
      updateData.status = status;
      
      // Add timestamps for status changes
      if (status === 'confirmed') {
        updateData.confirmedAt = admin.firestore.Timestamp.now();
      } else if (status === 'delivered') {
        updateData.deliveredAt = admin.firestore.Timestamp.now();
      } else if (status === 'cancelled') {
        updateData.cancelledAt = admin.firestore.Timestamp.now();
      }
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    await orderRef.update(updateData);

    return NextResponse.json({ 
      success: true, 
      orderId: id,
      status: status || order?.status,
    });
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}