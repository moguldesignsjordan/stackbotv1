// src/app/api/checkout/route.ts

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe, FEES, generateOrderId, generateTrackingPin } from '@/lib/stripe/stripe';
import { CheckoutSessionRequest, CartItem } from '@/lib/types/order';
import admin from '@/lib/firebase/admin';

export async function POST(request: NextRequest) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];

    // Verify Firebase token
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch (err) {
      console.error('Token verification failed:', err);
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    const customerId = decodedToken.uid;
    const customerEmail = decodedToken.email;

    // Parse request body
    const body: CheckoutSessionRequest = await request.json();
    const { items, customerInfo, deliveryAddress, notes } = body;

    // Validate items
    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'Cart is empty' },
        { status: 400 }
      );
    }

    // Validate all items are from same vendor
    const vendorId = items[0].vendorId;
    const vendorName = items[0].vendorName;
    if (!items.every((item) => item.vendorId === vendorId)) {
      return NextResponse.json(
        { error: 'All items must be from the same vendor' },
        { status: 400 }
      );
    }

    // Validate required customer info (only email required)
    const validatedCustomerInfo = {
      name: customerInfo?.name || decodedToken.name || 'Customer',
      email: customerInfo?.email || customerEmail || '',
      phone: customerInfo?.phone || '',
    };

    if (!validatedCustomerInfo.email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Set defaults for delivery address
    const validatedDeliveryAddress = {
      street: deliveryAddress?.street || '',
      city: deliveryAddress?.city || '',
      state: deliveryAddress?.state || '',
      postalCode: deliveryAddress?.postalCode || '',
      country: deliveryAddress?.country || 'Dominican Republic',
      instructions: deliveryAddress?.instructions || '',
    };

    // Use cart items directly (trust client prices for now)
    const verifiedItems: CartItem[] = items.map((item) => ({
      ...item,
      price: item.price || 0,
    }));

    // Calculate totals (in cents for Stripe)
    const subtotalCents = verifiedItems.reduce(
      (sum, item) => sum + Math.round(item.price * 100) * item.quantity,
      0
    );
    const serviceFeeCents = Math.round(subtotalCents * (FEES.SERVICE_FEE_PERCENT / 100));
    const taxCents = Math.round((subtotalCents + serviceFeeCents) * (FEES.TAX_PERCENT / 100));
    const deliveryFeeCents = FEES.DELIVERY_FEE;
    const totalCents = subtotalCents + serviceFeeCents + taxCents + deliveryFeeCents;

    // Generate order identifiers
    const orderId = generateOrderId();
    const trackingPin = generateTrackingPin();

    // Create Stripe line items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = verifiedItems.map(
      (item) => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.name,
            images: item.image ? [item.image] : undefined,
          },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      })
    );

    // Add fees as line items
    lineItems.push(
      {
        price_data: {
          currency: 'usd',
          product_data: { name: 'Delivery Fee' },
          unit_amount: deliveryFeeCents,
        },
        quantity: 1,
      },
      {
        price_data: {
          currency: 'usd',
          product_data: { name: 'Service Fee' },
          unit_amount: serviceFeeCents,
        },
        quantity: 1,
      },
      {
        price_data: {
          currency: 'usd',
          product_data: { name: 'Tax (ITBIS 18%)' },
          unit_amount: taxCents,
        },
        quantity: 1,
      }
    );

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: validatedCustomerInfo.email,
      client_reference_id: customerId,
      line_items: lineItems,
      metadata: {
        orderId,
        customerId,
        vendorId,
        vendorName,
        trackingPin,
        subtotal: (subtotalCents / 100).toFixed(2),
        deliveryFee: (deliveryFeeCents / 100).toFixed(2),
        serviceFee: (serviceFeeCents / 100).toFixed(2),
        tax: (taxCents / 100).toFixed(2),
        total: (totalCents / 100).toFixed(2),
        items: JSON.stringify(
          verifiedItems.map((item) => ({
            productId: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          }))
        ),
        customerInfo: JSON.stringify(validatedCustomerInfo),
        deliveryAddress: JSON.stringify(validatedDeliveryAddress),
        notes: notes || '',
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/cancel`,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Checkout session error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}