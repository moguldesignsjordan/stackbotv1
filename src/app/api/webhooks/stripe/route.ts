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

  // Parse metadata
  const items = JSON.parse(metadata.items || '[]');
  const customerInfo = JSON.parse(metadata.customerInfo || '{}');
  const deliveryAddress = JSON.parse(metadata.deliveryAddress || '{}');

  // Create order document
  const orderData = {
    orderId: metadata.orderId,
    customerId: metadata.customerId,
    vendorId: metadata.vendorId,
    vendorName: metadata.vendorName,
    items: items.map((item: { productId: string; name: string; price: number; quantity: number }) => ({
      productId: item.productId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      subtotal: item.price * item.quantity,
    })),
    subtotal: parseFloat(metadata.subtotal),
    deliveryFee: parseFloat(metadata.deliveryFee),
    serviceFee: parseFloat(metadata.serviceFee),
    tax: parseFloat(metadata.tax),
    total: parseFloat(metadata.total),
    status: 'pending',
    paymentStatus: 'paid',
    paymentMethod: 'stripe',
    stripeSessionId: session.id,
    stripePaymentIntentId: session.payment_intent as string,
    customerInfo,
    deliveryAddress,
    trackingPin: metadata.trackingPin,
    notes: metadata.notes || null,
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now(),
  };

  // Use batch write for atomicity
  const batch = db.batch();

  // Create main order document
  const orderRef = db.collection('orders').doc();
  batch.set(orderRef, orderData);

  // Create order reference in vendor's orders subcollection
  const vendorOrderRef = db
    .collection('vendors')
    .doc(metadata.vendorId)
    .collection('orders')
    .doc(orderRef.id);
  batch.set(vendorOrderRef, {
    orderId: metadata.orderId,
    orderRef: orderRef.id,
    customerId: metadata.customerId,
    total: parseFloat(metadata.total),
    status: 'pending',
    createdAt: admin.firestore.Timestamp.now(),
  });

  // Create order reference in customer's orders
  const customerOrderRef = db
    .collection('customers')
    .doc(metadata.customerId)
    .collection('orders')
    .doc(orderRef.id);
  batch.set(customerOrderRef, {
    orderId: metadata.orderId,
    orderRef: orderRef.id,
    vendorId: metadata.vendorId,
    vendorName: metadata.vendorName,
    total: parseFloat(metadata.total),
    status: 'pending',
    createdAt: admin.firestore.Timestamp.now(),
  });

  // Update vendor stats
  const vendorRef = db.collection('vendors').doc(metadata.vendorId);
  batch.update(vendorRef, {
    totalOrders: admin.firestore.FieldValue.increment(1),
    totalRevenue: admin.firestore.FieldValue.increment(parseFloat(metadata.subtotal)),
    updatedAt: admin.firestore.Timestamp.now(),
  });

  await batch.commit();

  console.log(`Order created successfully: ${metadata.orderId}`);
}