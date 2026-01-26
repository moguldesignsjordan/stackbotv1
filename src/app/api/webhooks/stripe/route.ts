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
      // CHECKOUT SESSION FLOW (legacy redirect flow)
      // ========================================================================
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(session, db);
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`Checkout session expired: ${session.id}`);
        break;
      }

      // ========================================================================
      // PAYMENT INTENT FLOW (in-app payments)
      // ========================================================================
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentSucceeded(paymentIntent, db);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`Payment failed: ${paymentIntent.id}`);
        // Optionally update any pending order status here
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
// HANDLE CHECKOUT SESSION COMPLETE (Legacy flow)
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
  if (!metadata?.orderId || !metadata?.customerId || !metadata?.vendorId) {
    console.error('Missing required metadata in session:', session.id);
    return;
  }

  // Check if order already exists (idempotency)
  const existingOrder = await db
    .collection('orders')
    .where('stripeSessionId', '==', session.id)
    .limit(1)
    .get();

  if (!existingOrder.empty) {
    console.log(`Order already exists for session: ${session.id}`);
    return;
  }

  await createOrderFromMetadata(metadata, db, {
    stripeSessionId: session.id,
    stripePaymentIntentId: session.payment_intent as string,
  });
}

// ============================================================================
// HANDLE PAYMENT INTENT SUCCEEDED (In-app payments)
// ============================================================================

async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent,
  db: admin.firestore.Firestore
) {
  const metadata = paymentIntent.metadata;
  
  // Check if this is an order payment (has orderId in metadata)
  if (!metadata?.orderId || !metadata?.customerId || !metadata?.vendorId) {
    console.log(`PaymentIntent ${paymentIntent.id} is not an order payment, skipping`);
    return;
  }

  // Check if order already exists (idempotency)
  const existingOrder = await db
    .collection('orders')
    .where('stripePaymentIntentId', '==', paymentIntent.id)
    .limit(1)
    .get();

  if (!existingOrder.empty) {
    console.log(`Order already exists for PaymentIntent: ${paymentIntent.id}`);
    return;
  }

  await createOrderFromMetadata(metadata, db, {
    stripePaymentIntentId: paymentIntent.id,
  });
}

// ============================================================================
// SHARED ORDER CREATION LOGIC
// ============================================================================

async function createOrderFromMetadata(
  metadata: Stripe.Metadata,
  db: admin.firestore.Firestore,
  stripeIds: {
    stripeSessionId?: string;
    stripePaymentIntentId?: string;
  }
) {
  // Parse metadata
  const items = JSON.parse(metadata.itemsJson || '[]');
  const fulfillmentType = (metadata.fulfillmentType || 'delivery') as 'delivery' | 'pickup';
  const isPickup = fulfillmentType === 'pickup';

  // Build customer info
  const customerInfo = {
    name: metadata.customerName || '',
    email: metadata.customerEmail || '',
    phone: metadata.customerPhone || '',
  };

  // Build delivery address (empty for pickup orders)
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

  // Create order document
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

  // Only include deliveryAddress for delivery orders
  if (!isPickup && deliveryAddress) {
    orderData.deliveryAddress = deliveryAddress;
  }

  console.log(`Creating order ${metadata.orderId} with fulfillmentType: ${fulfillmentType}`);

  // Batch write to all locations
  const batch = db.batch();

  // Main orders collection
  const orderRef = db.collection('orders').doc(metadata.orderId);
  batch.set(orderRef, orderData);

  // Vendor's orders subcollection
  const vendorOrderRef = db
    .collection('vendors')
    .doc(metadata.vendorId)
    .collection('orders')
    .doc(metadata.orderId);
  batch.set(vendorOrderRef, orderData);

  // Customer's orders subcollection
  const customerOrderRef = db
    .collection('customers')
    .doc(metadata.customerId)
    .collection('orders')
    .doc(metadata.orderId);
  batch.set(customerOrderRef, orderData);

  await batch.commit();

  console.log(`✅ Order ${metadata.orderId} created successfully (${fulfillmentType})`);

  // ============================================================================
  // CREATE NOTIFICATIONS
  // ============================================================================
  
  const totalAmount = parseFloat(metadata.total || '0');
  const itemCount = items.length;

  try {
    // 1. Notify VENDOR of new order
    const vendorNotification = {
      userId: metadata.vendorId,
      type: 'order_placed',
      title: 'New Order Received!',
      message: `Order #${metadata.orderId} - ${itemCount} item${itemCount > 1 ? 's' : ''} - $${totalAmount.toFixed(2)}`,
      orderId: metadata.orderId,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('notifications').add(vendorNotification);
    console.log(`📬 Vendor notification created for order ${metadata.orderId}`);

    // 2. Notify CUSTOMER of order confirmation
    const customerNotification = {
      userId: metadata.customerId,
      type: 'order_confirmed',
      title: 'Order Confirmed!',
      message: `Your order #${metadata.orderId} from ${metadata.vendorName} has been placed`,
      orderId: metadata.orderId,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('notifications').add(customerNotification);
    console.log(`📬 Customer notification created for order ${metadata.orderId}`);

  } catch (notifError) {
    // Log but don't fail the order creation
    console.error('Failed to create notifications:', notifError);
  }
}