// src/app/api/webhooks/stripe/route.ts

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe/stripe';
import admin from '@/lib/firebase/admin';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Webhook signature verification failed:', message);
    return NextResponse.json(
      { error: `Webhook Error: ${message}` },
      { status: 400 }
    );
  }

  const db = admin.firestore();

  try {
    switch (event.type) {
      // ========================================================================
      // CHECKOUT SESSION FLOW (redirect flow — web browser)
      // ========================================================================
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(session, db);
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`Checkout session expired: ${session.id}`);
        const expiredCheckoutId = session.metadata?.checkoutDataId;
        if (expiredCheckoutId) {
          try {
            await db.collection('pending_checkouts').doc(expiredCheckoutId).delete();
            console.log(`Cleaned up pending checkout: ${expiredCheckoutId}`);
          } catch (cleanupErr) {
            console.error('Failed to clean up pending checkout:', cleanupErr);
          }
        }
        break;
      }

      // ========================================================================
      // PAYMENT INTENT FLOW (in-app payments — mobile / Capacitor)
      // ========================================================================
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentSucceeded(paymentIntent, db);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`Payment failed: ${paymentIntent.id}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

// ============================================================================
// HANDLE CHECKOUT SESSION COMPLETE
// ============================================================================

async function handleCheckoutComplete(
  session: Stripe.Checkout.Session,
  db: admin.firestore.Firestore
) {
  if (session.payment_status !== 'paid') {
    console.log(`Session ${session.id} not paid, status: ${session.payment_status}`);
    return;
  }

  const metadata = session.metadata;
  if (!metadata) {
    console.error('Missing metadata in session:', session.id);
    return;
  }

  // New multi-vendor flow (has checkoutDataId)
  if (metadata.checkoutDataId) {
    await handleMultiVendorCheckout(
      metadata,
      db,
      { stripeSessionId: session.id, stripePaymentIntentId: session.payment_intent as string }
    );
  } else {
    // Legacy single-vendor flow
    if (!metadata.orderId || !metadata.customerId || !metadata.vendorId) {
      console.error('Missing required metadata in session:', session.id);
      return;
    }

    const existingOrder = await db
      .collection('orders')
      .where('stripeSessionId', '==', session.id)
      .limit(1)
      .get();

    if (!existingOrder.empty) {
      console.log(`Order already exists for session: ${session.id}`);
      return;
    }

    await createOrderFromLegacyMetadata(metadata, db, {
      stripeSessionId: session.id,
      stripePaymentIntentId: session.payment_intent as string,
    });
  }
}

// ============================================================================
// HANDLE PAYMENT INTENT SUCCEEDED (in-app payments)
// ============================================================================

async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent,
  db: admin.firestore.Firestore
) {
  const metadata = paymentIntent.metadata;

  if (!metadata) {
    console.log(`PaymentIntent ${paymentIntent.id} has no metadata, skipping`);
    return;
  }

  // New multi-vendor flow (has checkoutDataId from pending_checkouts)
  if (metadata.checkoutDataId) {
    const existingOrder = await db
      .collection('orders')
      .where('stripePaymentIntentId', '==', paymentIntent.id)
      .limit(1)
      .get();

    if (!existingOrder.empty) {
      console.log(`Orders already exist for PaymentIntent: ${paymentIntent.id}`);
      return;
    }

    await handleMultiVendorCheckout(
      metadata,
      db,
      { stripePaymentIntentId: paymentIntent.id }
    );
    return;
  }

  // Legacy single-vendor flow (metadata contains itemsJson, vendorId, etc.)
  if (!metadata.orderId || !metadata.customerId || !metadata.vendorId) {
    console.log(`PaymentIntent ${paymentIntent.id} is not an order payment, skipping`);
    return;
  }

  const existingOrder = await db
    .collection('orders')
    .where('stripePaymentIntentId', '==', paymentIntent.id)
    .limit(1)
    .get();

  if (!existingOrder.empty) {
    console.log(`Order already exists for PaymentIntent: ${paymentIntent.id}`);
    return;
  }

  await createOrderFromLegacyMetadata(metadata, db, {
    stripePaymentIntentId: paymentIntent.id,
  });
}

// ============================================================================
// MULTI-VENDOR CHECKOUT HANDLER (shared by session + payment_intent)
// ============================================================================

async function handleMultiVendorCheckout(
  metadata: Stripe.Metadata,
  db: admin.firestore.Firestore,
  stripeIds: {
    stripeSessionId?: string;
    stripePaymentIntentId?: string;
  }
) {
  const checkoutDataId = metadata.checkoutDataId;

  const checkoutDoc = await db.collection('pending_checkouts').doc(checkoutDataId).get();

  if (!checkoutDoc.exists) {
    console.error(`Pending checkout not found: ${checkoutDataId}. Attempting legacy fallback.`);
    if (metadata.orderId && metadata.customerId && metadata.vendorId && metadata.itemsJson) {
      await createOrderFromLegacyMetadata(metadata, db, stripeIds);
    } else {
      console.error('Cannot process order - no checkout data and no legacy metadata');
    }
    return;
  }

  const checkoutData = checkoutDoc.data()!;
  const {
    customerId,
    customerInfo,
    fulfillmentType,
    deliveryAddress,
    notes,
    vendorGroups,
    totals,
  } = checkoutData;

  const isPickup = fulfillmentType === 'pickup';

  console.log(`[Webhook] Processing multi-vendor checkout: ${checkoutDataId}, ${vendorGroups.length} vendor(s)`);

  const batch = db.batch();
  const createdOrderIds: string[] = [];

  // Pre-fetch all vendor coordinates in parallel for live tracking
  const vendorInfoMap: Record<string, { coordinates: { lat: number; lng: number } | null; phone: string | null; address: string | null }> = {};
  await Promise.all(
    vendorGroups.map(async (g: { vendorId: string }) => {
      try {
        const vDoc = await db.collection('vendors').doc(g.vendorId).get();
        if (vDoc.exists) {
          const vData = vDoc.data();
          vendorInfoMap[g.vendorId] = {
            coordinates: vData?.coordinates?.lat && vData?.coordinates?.lng
              ? { lat: vData.coordinates.lat, lng: vData.coordinates.lng }
              : null,
            phone: vData?.phone || null,
            address: vData?.address || null,
          };
        }
      } catch (err) {
        console.error(`[Webhook] Failed to fetch vendor ${g.vendorId} info:`, err);
      }
    })
  );

  for (const group of vendorGroups) {
    const {
      vendorId,
      vendorName,
      orderId,
      trackingPin,
      subtotal: vendorSubtotal,
      items,
    } = group;

    const vendorInfo = vendorInfoMap[vendorId];
    const perVendorDeliveryFee = isPickup ? 0 : totals.deliveryFeePerVendor;
    const perVendorTax = (vendorSubtotal + perVendorDeliveryFee) * 0.18;
    const perVendorTotal = vendorSubtotal + perVendorDeliveryFee + perVendorTax;

    const orderData: Record<string, unknown> = {
      orderId,
      customerId,
      vendorId,
      vendorName,
      fulfillmentType,
      items: items.map((item: { productId: string; name: string; price: number; quantity: number; notes?: string }) => ({
        productId: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        subtotal: item.price * item.quantity,
        notes: item.notes || '',
      })),
      subtotal: vendorSubtotal,
      deliveryFee: perVendorDeliveryFee,
      serviceFee: 0,
      tax: perVendorTax,
      total: perVendorTotal,
      status: 'pending',
      paymentStatus: 'paid',
      paymentMethod: 'stripe',
      customerInfo,
      trackingPin,
      notes: notes || null,
      isMultiVendorOrder: vendorGroups.length > 1,
      checkoutDataId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      ...stripeIds,
    };

    // Attach vendor location data for live tracking
    if (vendorInfo?.coordinates) orderData.vendorCoordinates = vendorInfo.coordinates;
    if (vendorInfo?.phone) orderData.vendorPhone = vendorInfo.phone;
    if (vendorInfo?.address) orderData.vendorAddress = vendorInfo.address;

    if (!isPickup && deliveryAddress) {
      orderData.deliveryAddress = deliveryAddress;
    }

    console.log(`[Webhook] Creating order ${orderId} for vendor ${vendorName} ($${perVendorTotal.toFixed(2)})`);

    const orderRef = db.collection('orders').doc(orderId);
    batch.set(orderRef, orderData);

    const vendorOrderRef = db.collection('vendors').doc(vendorId).collection('orders').doc(orderId);
    batch.set(vendorOrderRef, orderData);

    const customerOrderRef = db.collection('customers').doc(customerId).collection('orders').doc(orderId);
    batch.set(customerOrderRef, orderData);

    createdOrderIds.push(orderId);
  }

  await batch.commit();
  console.log(`✅ Created ${createdOrderIds.length} order(s): ${createdOrderIds.join(', ')}`);

  for (const group of vendorGroups) {
    try {
      await createOrderNotifications(
        db,
        group.orderId,
        group.vendorId,
        group.vendorName,
        customerId,
        group.items.length,
        group.subtotal
      );
    } catch (notifError) {
      console.error(`Failed to create notifications for order ${group.orderId}:`, notifError);
    }
  }

  try {
    await db.collection('pending_checkouts').doc(checkoutDataId).delete();
    console.log(`🧹 Cleaned up pending checkout: ${checkoutDataId}`);
  } catch (cleanupErr) {
    console.error('Failed to clean up pending checkout:', cleanupErr);
  }
}

// ============================================================================
// LEGACY ORDER CREATION (single-vendor metadata flow)
// ============================================================================

async function createOrderFromLegacyMetadata(
  metadata: Stripe.Metadata,
  db: admin.firestore.Firestore,
  stripeIds: {
    stripeSessionId?: string;
    stripePaymentIntentId?: string;
  }
) {
  const items = JSON.parse(metadata.itemsJson || '[]');
  const fulfillmentType = (metadata.fulfillmentType || 'delivery') as 'delivery' | 'pickup';
  const isPickup = fulfillmentType === 'pickup';

  const customerInfo = {
    name: metadata.customerName || '',
    email: metadata.customerEmail || '',
    phone: metadata.customerPhone || '',
  };

  const deliveryAddress = isPickup
    ? null
    : {
        street: metadata.deliveryStreet || '',
        city: metadata.deliveryCity || '',
        state: metadata.deliveryState || '',
        postalCode: metadata.deliveryPostalCode || '',
        country: metadata.deliveryCountry || 'Dominican Republic',
        instructions: metadata.deliveryInstructions || '',
      };

  const orderData: Record<string, unknown> = {
    orderId: metadata.orderId,
    customerId: metadata.customerId,
    vendorId: metadata.vendorId,
    vendorName: metadata.vendorName,
    fulfillmentType,
    items: items.map((item: { productId: string; name: string; price: number; quantity: number; notes?: string }) => ({
      productId: item.productId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      subtotal: item.price * item.quantity,
      notes: item.notes || '',
    })),
    subtotal: parseFloat(metadata.subtotal || '0'),
    deliveryFee: parseFloat(metadata.deliveryFee || '0'),
    serviceFee: parseFloat(metadata.serviceFee || '0'),
    tax: parseFloat(metadata.tax || '0'),
    total: parseFloat(metadata.total || '0'),
    status: 'pending',
    paymentStatus: 'paid',
    paymentMethod: 'stripe',
    customerInfo,
    trackingPin: metadata.trackingPin,
    notes: metadata.notes || null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    ...stripeIds,
  };

  if (!isPickup && deliveryAddress) {
    orderData.deliveryAddress = deliveryAddress;
  }

  // Fetch vendor coordinates for live tracking map
  try {
    const vendorDoc = await db.collection('vendors').doc(metadata.vendorId).get();
    if (vendorDoc.exists) {
      const vData = vendorDoc.data();
      if (vData?.coordinates?.lat && vData?.coordinates?.lng) {
        orderData.vendorCoordinates = { lat: vData.coordinates.lat, lng: vData.coordinates.lng };
      }
      if (vData?.phone) orderData.vendorPhone = vData.phone;
      if (vData?.address) orderData.vendorAddress = vData.address;
    }
  } catch (err) {
    console.error(`[Webhook] Failed to fetch vendor coordinates:`, err);
  }

  console.log(`Creating legacy order ${metadata.orderId} with fulfillmentType: ${fulfillmentType}`);

  const batch = db.batch();

  batch.set(db.collection('orders').doc(metadata.orderId), orderData);
  batch.set(db.collection('vendors').doc(metadata.vendorId).collection('orders').doc(metadata.orderId), orderData);
  batch.set(db.collection('customers').doc(metadata.customerId).collection('orders').doc(metadata.orderId), orderData);

  await batch.commit();
  console.log(`✅ Order ${metadata.orderId} created successfully (${fulfillmentType})`);

  try {
    await createOrderNotifications(
      db,
      metadata.orderId,
      metadata.vendorId,
      metadata.vendorName || 'Vendor',
      metadata.customerId,
      items.length,
      parseFloat(metadata.total || '0')
    );
  } catch (notifError) {
    console.error('Failed to create notifications:', notifError);
  }
}

// ============================================================================
// SHARED NOTIFICATION HELPER
// ============================================================================

async function createOrderNotifications(
  db: admin.firestore.Firestore,
  orderId: string,
  vendorId: string,
  vendorName: string,
  customerId: string,
  itemCount: number,
  totalAmount: number
) {
  const vendorNotification = {
    userId: vendorId,
    type: 'order_placed',
    title: 'New Order Received!',
    message: `Order #${orderId} - ${itemCount} item${itemCount > 1 ? 's' : ''} - $${totalAmount.toFixed(2)}`,
    orderId,
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.collection('notifications').add(vendorNotification);
  console.log(`📬 Vendor notification created for order ${orderId}`);

  const customerNotification = {
    userId: customerId,
    type: 'order_confirmed',
    title: 'Order Confirmed!',
    message: `Your order #${orderId} from ${vendorName} has been placed`,
    orderId,
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.collection('notifications').add(customerNotification);
  console.log(`📬 Customer notification created for order ${orderId}`);
}