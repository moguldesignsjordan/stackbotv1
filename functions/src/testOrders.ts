import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

interface CreateTestOrderRequest {
  vendorId: string;
  customerId?: string;
  driverId?: string;
  status?: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';
  amount?: number;
  items?: number;
}

export const createTestOrder = functions.https.onCall(async (data: CreateTestOrderRequest, context) => {
  // Only admins can create test orders
  if (!context.auth?.token?.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can create test orders');
  }

  const {
    vendorId,
    customerId,
    driverId,
    status = 'pending',
    amount = 500,
    items = 2
  } = data;

  const db = admin.firestore();

  // Verify vendor exists
  const vendorDoc = await db.collection('vendors').doc(vendorId).get();
  if (!vendorDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Vendor not found');
  }

  // Use provided customer or create test customer reference
  const testCustomerId = customerId || 'test-customer-' + Date.now();
  
  // Build test order
  const testOrder = {
    vendorId,
    vendorName: vendorDoc.data()?.businessName || 'Test Vendor',
    customerId: testCustomerId,
    customerName: 'Test Customer',
    customerEmail: 'test@stackbot.com',
    customerPhone: '809-555-0100',
    
    items: Array.from({ length: items }, (_, i) => ({
      id: `test-item-${i + 1}`,
      name: `Test Item ${i + 1}`,
      quantity: 1,
      price: amount / items,
      total: amount / items
    })),
    
    subtotal: amount,
    deliveryFee: 100,
    tax: amount * 0.18, // 18% ITBIS
    total: amount + 100 + (amount * 0.18),
    
    deliveryAddress: {
      street: 'Calle Principal #123',
      city: 'Sosúa',
      province: 'Puerto Plata',
      coordinates: {
        lat: 19.7521,
        lng: -70.5132
      }
    },
    
    status,
    driverId: driverId || null,
    driverName: driverId ? 'Test Driver' : null,
    
    paymentMethod: 'card',
    paymentStatus: 'paid',
    stripePaymentIntentId: 'test_pi_' + Date.now(),
    
    notes: '🧪 TEST ORDER - Auto-generated for testing',
    isTest: true,
    
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    
    estimatedDeliveryTime: new Date(Date.now() + 30 * 60 * 1000), // 30 min from now
  };

  const orderRef = await db.collection('orders').add(testOrder);

  return {
    orderId: orderRef.id,
    order: testOrder,
    message: 'Test order created successfully'
  };
});


export const updateOrderStatus = functions.https.onCall(async (data: {
  orderId: string;
  status: string;
  driverId?: string;
}, context) => {
  // Only admins and drivers can update order status
  if (!context.auth?.token?.admin && !context.auth?.token?.driver) {
    throw new functions.https.HttpsError('permission-denied', 'Unauthorized');
  }

  const { orderId, status, driverId } = data;
  const db = admin.firestore();

  const updateData: any = {
    status,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  if (driverId) {
    const driverDoc = await db.collection('drivers').doc(driverId).get();
    updateData.driverId = driverId;
    updateData.driverName = driverDoc.data()?.name || 'Unknown Driver';
  }

  // Add timestamps for specific status changes
  if (status === 'confirmed') {
    updateData.confirmedAt = admin.firestore.FieldValue.serverTimestamp();
  } else if (status === 'out_for_delivery') {
    updateData.outForDeliveryAt = admin.firestore.FieldValue.serverTimestamp();
  } else if (status === 'delivered') {
    updateData.deliveredAt = admin.firestore.FieldValue.serverTimestamp();
  }

  await db.collection('orders').doc(orderId).update(updateData);

  return { success: true, orderId, status };
});


export const deleteTestOrders = functions.https.onCall(async (data, context) => {
  if (!context.auth?.token?.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can delete test orders');
  }

  const db = admin.firestore();
  const testOrdersSnapshot = await db.collection('orders')
    .where('isTest', '==', true)
    .limit(100)
    .get();

  const batch = db.batch();
  testOrdersSnapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });

  await batch.commit();

  return {
    deleted: testOrdersSnapshot.size,
    message: `Deleted ${testOrdersSnapshot.size} test orders`
  };
});