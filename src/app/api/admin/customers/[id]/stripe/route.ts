// src/app/api/admin/customers/[id]/stripe/route.ts

import { NextRequest, NextResponse } from 'next/server';
import admin from '@/lib/firebase/admin';
import { stripe } from '@/lib/stripe/stripe';

// POST - Create Stripe customer
export async function POST(
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

    if (decodedToken.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = admin.firestore();
    const customerRef = db.collection('customers').doc(id);
    const customerDoc = await customerRef.get();

    if (!customerDoc.exists) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const customerData = customerDoc.data();

    // Check if already has Stripe customer
    if (customerData?.stripeCustomerId) {
      return NextResponse.json({ 
        error: 'Customer already has Stripe account',
        stripeCustomerId: customerData.stripeCustomerId 
      }, { status: 400 });
    }

    // Create Stripe customer
    const stripeCustomer = await stripe.customers.create({
      email: customerData?.email,
      name: customerData?.displayName,
      phone: customerData?.phone,
      metadata: {
        firebaseUid: id,
      },
    });

    // Update Firestore with Stripe customer ID
    await customerRef.update({
      stripeCustomerId: stripeCustomer.id,
      updatedAt: admin.firestore.Timestamp.now(),
    });

    return NextResponse.json({
      success: true,
      stripeCustomerId: stripeCustomer.id,
    });
  } catch (error) {
    console.error('Error creating Stripe customer:', error);
    return NextResponse.json({ error: 'Failed to create Stripe customer' }, { status: 500 });
  }
}

// DELETE - Remove payment method
export async function DELETE(
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

    if (decodedToken.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const paymentMethodId = searchParams.get('paymentMethodId');

    if (!paymentMethodId) {
      return NextResponse.json({ error: 'Payment method ID required' }, { status: 400 });
    }

    // Detach payment method
    await stripe.paymentMethods.detach(paymentMethodId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing payment method:', error);
    return NextResponse.json({ error: 'Failed to remove payment method' }, { status: 500 });
  }
}