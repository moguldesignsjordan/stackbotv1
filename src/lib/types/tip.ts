// src/app/api/payment-methods/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/stripe';
import admin from '@/lib/firebase/admin';

/**
 * GET - List saved payment methods for authenticated customer
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    const uid = decodedToken.uid;

    // Get Stripe customer ID from Firestore
    const db = admin.firestore();
    const customerDoc = await db.collection('customers').doc(uid).get();

    if (!customerDoc.exists) {
      return NextResponse.json({ paymentMethods: [] });
    }

    const stripeCustomerId = customerDoc.data()?.stripeCustomerId;
    if (!stripeCustomerId) {
      return NextResponse.json({ paymentMethods: [] });
    }

    // Verify customer exists in Stripe
    try {
      await stripe.customers.retrieve(stripeCustomerId);
    } catch {
      return NextResponse.json({ paymentMethods: [] });
    }

    // List saved payment methods (cards only)
    const paymentMethods = await stripe.paymentMethods.list({
      customer: stripeCustomerId,
      type: 'card',
    });

    // Get default payment method
    const customer = await stripe.customers.retrieve(stripeCustomerId) as {
      invoice_settings?: { default_payment_method?: string | null };
      deleted?: boolean;
    };
    const defaultPmId = (!customer.deleted && customer.invoice_settings?.default_payment_method) || null;

    const cards = paymentMethods.data.map((pm) => ({
      id: pm.id,
      brand: pm.card?.brand || 'unknown',
      last4: pm.card?.last4 || '****',
      expMonth: pm.card?.exp_month || 0,
      expYear: pm.card?.exp_year || 0,
      funding: pm.card?.funding || 'unknown', // 'credit', 'debit', 'prepaid'
      isDefault: pm.id === defaultPmId,
    }));

    return NextResponse.json({ paymentMethods: cards });
  } catch (error) {
    console.error('[PaymentMethods] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment methods' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remove a saved payment method
 */
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    const uid = decodedToken.uid;

    const { paymentMethodId } = await request.json();
    if (!paymentMethodId) {
      return NextResponse.json({ error: 'Missing paymentMethodId' }, { status: 400 });
    }

    // Verify the payment method belongs to this customer
    const db = admin.firestore();
    const customerDoc = await db.collection('customers').doc(uid).get();
    const stripeCustomerId = customerDoc.data()?.stripeCustomerId;

    if (!stripeCustomerId) {
      return NextResponse.json({ error: 'No Stripe customer found' }, { status: 404 });
    }

    const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
    if (pm.customer !== stripeCustomerId) {
      return NextResponse.json({ error: 'Payment method not found' }, { status: 404 });
    }

    // Detach from customer
    await stripe.paymentMethods.detach(paymentMethodId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[PaymentMethods] DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to remove payment method' },
      { status: 500 }
    );
  }
}

/**
 * POST - Set a payment method as default
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    const uid = decodedToken.uid;

    const { paymentMethodId } = await request.json();
    if (!paymentMethodId) {
      return NextResponse.json({ error: 'Missing paymentMethodId' }, { status: 400 });
    }

    const db = admin.firestore();
    const customerDoc = await db.collection('customers').doc(uid).get();
    const stripeCustomerId = customerDoc.data()?.stripeCustomerId;

    if (!stripeCustomerId) {
      return NextResponse.json({ error: 'No Stripe customer found' }, { status: 404 });
    }

    // Verify ownership
    const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
    if (pm.customer !== stripeCustomerId) {
      return NextResponse.json({ error: 'Payment method not found' }, { status: 404 });
    }

    // Set as default
    await stripe.customers.update(stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[PaymentMethods] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to update default payment method' },
      { status: 500 }
    );
  }
}