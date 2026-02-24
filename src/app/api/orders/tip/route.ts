// src/app/api/orders/tip/route.ts
// ═══════════════════════════════════════════════════════════════════════════════
// POST-CHECKOUT TIP API
// Charges a tip as a separate Stripe PaymentIntent using the payment method
// from the original order. Updates Firestore order document with tip data.
//
// POST /api/orders/tip
// Body: { orderId: string, tipAmount: number, tipPercent: number | null }
// Auth: Bearer token (customer must own the order)
//
// ROLLBACK: Delete this file entirely.
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import admin from '@/lib/firebase/admin';

// ── Stripe ──────────────────────────────────────────────────────────────────
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10' as Stripe.LatestApiVersion,
});

// ── Request body type ───────────────────────────────────────────────────────
interface TipRequestBody {
  orderId: string;          // Firestore document ID or orderId field
  tipAmount: number;        // Dollar amount (e.g. 3.50)
  tipPercent: number | null;
}

export async function POST(request: NextRequest) {
  try {
    // ── 1. Authenticate ─────────────────────────────────────────────────────
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken: admin.auth.DecodedIdToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch {
      return NextResponse.json(
        { error: 'Session expired' },
        { status: 401 }
      );
    }

    const customerId = decodedToken.uid;

    // ── 2. Parse & validate body ────────────────────────────────────────────
    let body: TipRequestBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
    }

    const { orderId, tipAmount, tipPercent } = body;

    if (!orderId || typeof orderId !== 'string') {
      return NextResponse.json(
        { error: 'Missing orderId' },
        { status: 400 }
      );
    }

    if (typeof tipAmount !== 'number' || tipAmount <= 0 || tipAmount > 999) {
      return NextResponse.json(
        { error: 'Invalid tip amount (must be $0.01 – $999)' },
        { status: 400 }
      );
    }

    // Round to 2 decimal places
    const validatedTip = Math.round(tipAmount * 100) / 100;

    console.log('[Tip] Processing tip:', { orderId, validatedTip, tipPercent, customerId });

    const db = admin.firestore();

    // ── 3. Find the order ───────────────────────────────────────────────────
    // Try by document ID first, then by orderId field
    let orderDoc = await db.collection('orders').doc(orderId).get();

    if (!orderDoc.exists) {
      // Try by orderId field
      const snapshot = await db
        .collection('orders')
        .where('orderId', '==', orderId)
        .where('customerId', '==', customerId)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        );
      }

      orderDoc = snapshot.docs[0];
    }

    const orderData = orderDoc.data();
    if (!orderData) {
      return NextResponse.json(
        { error: 'Order data missing' },
        { status: 404 }
      );
    }

    // ── 4. Verify ownership ─────────────────────────────────────────────────
    if (orderData.customerId !== customerId) {
      return NextResponse.json(
        { error: 'Unauthorized – you do not own this order' },
        { status: 403 }
      );
    }

    // ── 5. Check if tip already exists ──────────────────────────────────────
    if (orderData.tip?.amount > 0 && orderData.tip?.stripeTipPaymentIntentId) {
      return NextResponse.json(
        { error: 'Tip already added to this order' },
        { status: 409 }
      );
    }

    // ── 6. Get Stripe customer & payment method ─────────────────────────────
    const customerRef = db.collection('customers').doc(customerId);
    const customerDoc = await customerRef.get();
    const stripeCustomerId = customerDoc.exists
      ? customerDoc.data()?.stripeCustomerId
      : null;

    if (!stripeCustomerId) {
      console.error('[Tip] No Stripe customer ID for:', customerId);
      return NextResponse.json(
        { error: 'Payment method not available. Please contact support.' },
        { status: 400 }
      );
    }

    // Get payment method from the original transaction
    let paymentMethodId: string | null = null;

    // Try from the original PaymentIntent
    const originalPiId =
      orderData.stripePaymentIntentId || orderData.paymentIntentId;

    if (originalPiId) {
      try {
        const originalPi = await stripe.paymentIntents.retrieve(originalPiId);
        if (originalPi.payment_method && typeof originalPi.payment_method === 'string') {
          paymentMethodId = originalPi.payment_method;
        }
      } catch (err) {
        console.warn('[Tip] Could not retrieve original PaymentIntent:', err);
      }
    }

    // Fallback: try from Stripe Checkout Session
    if (!paymentMethodId && orderData.stripeSessionId) {
      try {
        const session = await stripe.checkout.sessions.retrieve(orderData.stripeSessionId, {
          expand: ['payment_intent'],
        });
        const pi = session.payment_intent as Stripe.PaymentIntent;
        if (pi?.payment_method && typeof pi.payment_method === 'string') {
          paymentMethodId = pi.payment_method;
        }
      } catch (err) {
        console.warn('[Tip] Could not retrieve session PaymentIntent:', err);
      }
    }

    // Fallback: use customer's most recent saved payment method
    if (!paymentMethodId) {
      try {
        const paymentMethods = await stripe.paymentMethods.list({
          customer: stripeCustomerId,
          type: 'card',
          limit: 1,
        });
        if (paymentMethods.data.length > 0) {
          paymentMethodId = paymentMethods.data[0].id;
        }
      } catch (err) {
        console.warn('[Tip] Could not list payment methods:', err);
      }
    }

    if (!paymentMethodId) {
      console.error('[Tip] No payment method found for customer:', customerId);
      return NextResponse.json(
        { error: 'No payment method found. Tip could not be charged.' },
        { status: 400 }
      );
    }

    console.log('[Tip] Using payment method:', paymentMethodId, 'customer:', stripeCustomerId);

    // ── 7. Create Stripe PaymentIntent for the tip ──────────────────────────
    const isPickup = orderData.fulfillmentType === 'pickup';
    const tipRecipientType = isPickup ? 'staff' : 'driver';

    const tipPaymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(validatedTip * 100), // cents
      currency: 'usd',
      customer: stripeCustomerId,
      payment_method: paymentMethodId,
      confirm: true,
      off_session: false,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',
      },
      description: `Tip for StackBot Order #${orderData.orderId || orderId}`,
      metadata: {
        type: 'tip',
        orderId: orderData.orderId || orderId,
        orderDocId: orderDoc.id,
        customerId,
        tipAmount: validatedTip.toFixed(2),
        tipPercent: tipPercent !== null ? String(tipPercent) : '',
        tipRecipientType,
      },
    });

    console.log(
      '[Tip] PaymentIntent created:',
      tipPaymentIntent.id,
      'status:',
      tipPaymentIntent.status
    );

    // Handle requires_action (3DS) — rare for tips on known cards
    if (tipPaymentIntent.status === 'requires_action') {
      return NextResponse.json(
        {
          error: 'Additional authentication required for tip. Please try a smaller amount.',
          requiresAction: true,
          clientSecret: tipPaymentIntent.client_secret,
        },
        { status: 402 }
      );
    }

    if (
      tipPaymentIntent.status !== 'succeeded' &&
      tipPaymentIntent.status !== 'processing'
    ) {
      return NextResponse.json(
        { error: 'Tip payment failed. Please try again.' },
        { status: 400 }
      );
    }

    // ── 8. Update Firestore order with tip data ─────────────────────────────
    const tipData = {
      tip: {
        amount: validatedTip,
        percent: tipPercent,
        recipientType: tipRecipientType,
        stripeTipPaymentIntentId: tipPaymentIntent.id,
        addedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
    };

    await db.collection('orders').doc(orderDoc.id).update(tipData);

    console.log('[Tip] Order updated with tip data:', orderDoc.id);

    // ── 9. Return success ───────────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      tipAmount: validatedTip,
      tipPercent,
      paymentIntentId: tipPaymentIntent.id,
      status: tipPaymentIntent.status,
    });
  } catch (error) {
    console.error('[Tip] Error:', error);

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: `Payment error: ${error.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to process tip. Please try again.' },
      { status: 500 }
    );
  }
}