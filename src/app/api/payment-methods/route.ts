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
    let customer;
    try {
      customer = await stripe.customers.retrieve(stripeCustomerId);
      if ('deleted' in customer && customer.deleted) {
        return NextResponse.json({ paymentMethods: [] });
      }
    } catch {
      return NextResponse.json({ paymentMethods: [] });
    }

    // List saved payment methods (cards only)
    const paymentMethods = await stripe.paymentMethods.list({
      customer: stripeCustomerId,
      type: 'card',
    });

    // Get default payment method
    const defaultPmId = customer.invoice_settings?.default_payment_method || null;

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
      return NextResponse.json({ error: 'paymentMethodId required' }, { status: 400 });
    }

    // Get Stripe customer ID from Firestore
    const db = admin.firestore();
    const customerDoc = await db.collection('customers').doc(uid).get();

    if (!customerDoc.exists) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const stripeCustomerId = customerDoc.data()?.stripeCustomerId;
    if (!stripeCustomerId) {
      return NextResponse.json({ error: 'No Stripe customer linked' }, { status: 400 });
    }

    // Verify the payment method belongs to this customer
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    if (paymentMethod.customer !== stripeCustomerId) {
      return NextResponse.json({ error: 'Invalid payment method' }, { status: 403 });
    }

    // Set as default payment method
    await stripe.customers.update(stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    console.log('[PaymentMethods] Set default:', paymentMethodId, 'for customer:', stripeCustomerId);

    return NextResponse.json({ success: true, defaultPaymentMethodId: paymentMethodId });
  } catch (error) {
    console.error('[PaymentMethods] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to set default payment method' },
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
      return NextResponse.json({ error: 'paymentMethodId required' }, { status: 400 });
    }

    // Get Stripe customer ID from Firestore
    const db = admin.firestore();
    const customerDoc = await db.collection('customers').doc(uid).get();

    if (!customerDoc.exists) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const stripeCustomerId = customerDoc.data()?.stripeCustomerId;
    if (!stripeCustomerId) {
      return NextResponse.json({ error: 'No Stripe customer linked' }, { status: 400 });
    }

    // Verify the payment method belongs to this customer
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    if (paymentMethod.customer !== stripeCustomerId) {
      return NextResponse.json({ error: 'Invalid payment method' }, { status: 403 });
    }

    // Detach the payment method from the customer
    await stripe.paymentMethods.detach(paymentMethodId);

    console.log('[PaymentMethods] Deleted:', paymentMethodId, 'for customer:', stripeCustomerId);

    return NextResponse.json({ success: true, deletedPaymentMethodId: paymentMethodId });
  } catch (error) {
    console.error('[PaymentMethods] DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete payment method' },
      { status: 500 }
    );
  }
}