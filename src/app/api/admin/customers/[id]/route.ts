// src/app/api/admin/customers/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import admin from '@/lib/firebase/admin';
import { stripe } from '@/lib/stripe/stripe';

// GET single customer with Stripe data
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

    if (decodedToken.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = admin.firestore();
    const customerDoc = await db.collection('customers').doc(id).get();

    if (!customerDoc.exists) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const customerData = customerDoc.data();
    
    // Get Stripe customer data if exists
    let stripeData = null;
    let paymentMethods: any[] = [];
    
    if (customerData?.stripeCustomerId) {
      try {
        // Get Stripe customer
        const stripeCustomer = await stripe.customers.retrieve(customerData.stripeCustomerId);
        
        if (!('deleted' in stripeCustomer)) {
          stripeData = {
            id: stripeCustomer.id,
            email: stripeCustomer.email,
            name: stripeCustomer.name,
            created: stripeCustomer.created,
            balance: stripeCustomer.balance,
            currency: stripeCustomer.currency,
          };

          // Get payment methods
          const methods = await stripe.paymentMethods.list({
            customer: customerData.stripeCustomerId,
            type: 'card',
          });
          
          paymentMethods = methods.data.map(pm => ({
            id: pm.id,
            brand: pm.card?.brand,
            last4: pm.card?.last4,
            expMonth: pm.card?.exp_month,
            expYear: pm.card?.exp_year,
            isDefault: pm.id === stripeCustomer.invoice_settings?.default_payment_method,
          }));
        }
      } catch (err) {
        console.error('Error fetching Stripe data:', err);
      }
    }

    // Get customer orders
    const ordersSnapshot = await db.collection('orders')
      .where('customerId', '==', id)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    const orders = ordersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
    }));

    // Calculate stats
    const totalOrders = ordersSnapshot.size;
    const totalSpent = orders.reduce((sum: number, order: any) => sum + (order.total || 0), 0);

    return NextResponse.json({
      customer: {
        id: customerDoc.id,
        ...customerData,
        createdAt: customerData?.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: customerData?.updatedAt?.toDate?.()?.toISOString() || null,
      },
      stripe: stripeData,
      paymentMethods,
      orders,
      stats: {
        totalOrders,
        totalSpent,
      }
    });
  } catch (error) {
    console.error('Error fetching customer:', error);
    return NextResponse.json({ error: 'Failed to fetch customer' }, { status: 500 });
  }
}

// PATCH - Update customer
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

    if (decodedToken.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { displayName, phone, email, defaultAddress, status } = body;

    const db = admin.firestore();
    const customerRef = db.collection('customers').doc(id);
    const customerDoc = await customerRef.get();

    if (!customerDoc.exists) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const updateData: Record<string, any> = {
      updatedAt: admin.firestore.Timestamp.now(),
    };

    if (displayName !== undefined) updateData.displayName = displayName;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (defaultAddress !== undefined) updateData.defaultAddress = defaultAddress;
    if (status !== undefined) updateData.status = status;

    await customerRef.update(updateData);

    // Update Stripe customer if exists
    const customerData = customerDoc.data();
    if (customerData?.stripeCustomerId) {
      try {
        await stripe.customers.update(customerData.stripeCustomerId, {
          name: displayName || customerData.displayName,
          email: email || customerData.email,
          phone: phone || customerData.phone,
        });
      } catch (err) {
        console.error('Error updating Stripe customer:', err);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating customer:', error);
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 });
  }
}

// DELETE - Delete customer
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

    const db = admin.firestore();
    const customerRef = db.collection('customers').doc(id);
    const customerDoc = await customerRef.get();

    if (!customerDoc.exists) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Soft delete - just mark as deleted
    await customerRef.update({
      status: 'deleted',
      deletedAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting customer:', error);
    return NextResponse.json({ error: 'Failed to delete customer' }, { status: 500 });
  }
}