// src/app/api/orders/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import admin from '@/lib/firebase/admin';

// GET - Fetch single order
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

    // Check access permissions
    if (role === 'customer' && order?.customerId !== uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (role === 'vendor' && order?.vendorId !== uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({
      ...order,
      id: orderDoc.id,
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
    const previousStatus = order?.status;

    const updateData: Record<string, unknown> = {
      updatedAt: admin.firestore.Timestamp.now(),
    };

    if (status) {
      updateData.status = status;
      
      // Add timestamps for status changes
      const timestampMap: Record<string, string> = {
        confirmed: 'confirmedAt',
        preparing: 'preparingAt',
        ready: 'readyAt',
        out_for_delivery: 'outForDeliveryAt',
        delivered: 'deliveredAt',
        picked_up: 'pickedUpAt',
        cancelled: 'cancelledAt',
      };

      if (timestampMap[status]) {
        updateData[timestampMap[status]] = admin.firestore.Timestamp.now();
      }
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    // Update main order
    await orderRef.update(updateData);

    // Also update vendor and customer subcollections
    const batch = db.batch();
    
    if (order?.vendorId) {
      const vendorOrderRef = db
        .collection('vendors')
        .doc(order.vendorId)
        .collection('orders')
        .doc(id);
      batch.update(vendorOrderRef, updateData);
    }

    if (order?.customerId) {
      const customerOrderRef = db
        .collection('customers')
        .doc(order.customerId)
        .collection('orders')
        .doc(id);
      batch.update(customerOrderRef, updateData);
    }

    await batch.commit();

    // ========================================================================
    // CREATE NOTIFICATION FOR CUSTOMER ON STATUS CHANGE
    // ========================================================================
    if (status && status !== previousStatus && order?.customerId) {
      try {
        const statusMessages: Record<string, { title: string; message: string; type: string }> = {
          confirmed: {
            title: 'Order Confirmed ✓',
            message: `Your order from ${order.vendorName} has been confirmed and will be prepared shortly`,
            type: 'order_confirmed',
          },
          preparing: {
            title: 'Order Being Prepared 👨‍🍳',
            message: `${order.vendorName} is now preparing your order`,
            type: 'order_preparing',
          },
          ready: {
            title: 'Order Ready! 📦',
            message: `Your order from ${order.vendorName} is ready for pickup`,
            type: 'order_ready',
          },
          out_for_delivery: {
            title: 'Out for Delivery 🚗',
            message: `Your order from ${order.vendorName} is on its way!`,
            type: 'order_delivering',
          },
          delivered: {
            title: 'Order Delivered! ✅',
            message: `Your order from ${order.vendorName} has been delivered. Enjoy!`,
            type: 'order_delivered',
          },
          picked_up: {
            title: 'Order Picked Up ✅',
            message: `You've picked up your order from ${order.vendorName}. Enjoy!`,
            type: 'order_delivered',
          },
          cancelled: {
            title: 'Order Cancelled',
            message: `Your order from ${order.vendorName} has been cancelled`,
            type: 'order_cancelled',
          },
        };

        const statusInfo = statusMessages[status];
        if (statusInfo) {
          const customerNotification = {
            userId: order.customerId,
            type: statusInfo.type,
            title: statusInfo.title,
            message: statusInfo.message,
            read: false,
            priority: status === 'cancelled' ? 'high' : 'normal',
            data: {
              orderId: id,
              orderNumber: order.orderId,
              vendorId: order.vendorId,
              vendorName: order.vendorName,
              status,
              previousStatus,
              url: `/account/orders/${id}`,
            },
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          };

          await db.collection('notifications').add(customerNotification);
          console.log(`✅ Customer notification created for status change: ${status}`);
        }
      } catch (notifError) {
        console.error('❌ Error creating status notification:', notifError);
        // Don't fail the status update if notification fails
      }
    }

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