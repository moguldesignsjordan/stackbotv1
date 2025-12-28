// src/app/api/checkout/route.ts

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe, FEES, generateOrderId, generateTrackingPin } from '@/lib/stripe/stripe';
import { CheckoutSessionRequest, CartItem } from '@/lib/types/order';
import admin from '@/lib/firebase/admin';
import { SavedAddress } from '@/lib/types/address';

/**
 * Validates a cart item has all required fields
 */
function validateCartItem(item: CartItem, index: number): string | null {
  if (!item.productId) return `Item ${index + 1}: Missing productId`;
  if (!item.vendorId) return `Item ${index + 1}: Missing vendorId`;
  if (!item.vendorName) return `Item ${index + 1}: Missing vendorName`;
  if (!item.name) return `Item ${index + 1}: Missing name`;
  if (typeof item.price !== 'number' || item.price < 0) return `Item ${index + 1}: Invalid price`;
  if (typeof item.quantity !== 'number' || item.quantity < 1) return `Item ${index + 1}: Invalid quantity`;
  return null;
}

export async function POST(request: NextRequest) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('[Checkout] Missing Authorization header');
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in to checkout' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];

    // Verify Firebase token
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch (err) {
      console.error('[Checkout] Token verification failed:', err);
      return NextResponse.json(
        { error: 'Session expired - Please sign in again' },
        { status: 401 }
      );
    }

    const customerId = decodedToken.uid;
    const customerEmail = decodedToken.email;

    // Parse request body
    let body: CheckoutSessionRequest;
    try {
      body = await request.json();
    } catch (err) {
      console.error('[Checkout] Failed to parse request body:', err);
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
    }

    const { items, customerInfo, deliveryAddress, notes, saveAddress } = body;

    // Validate items array exists
    if (!items || !Array.isArray(items)) {
      console.log('[Checkout] Items is not an array:', typeof items);
      return NextResponse.json(
        { error: 'Invalid cart data - please refresh and try again' },
        { status: 400 }
      );
    }

    if (items.length === 0) {
      console.log('[Checkout] Cart is empty');
      return NextResponse.json(
        { error: 'Cart is empty' },
        { status: 400 }
      );
    }

    // Validate each cart item
    for (let i = 0; i < items.length; i++) {
      const validationError = validateCartItem(items[i], i);
      if (validationError) {
        console.error('[Checkout] Cart item validation failed:', validationError, items[i]);
        return NextResponse.json(
          { error: 'Cart contains invalid items. Please clear your cart and try again.' },
          { status: 400 }
        );
      }
    }

    // Validate all items are from same vendor
    const vendorId = items[0].vendorId;
    const vendorName = items[0].vendorName;

    if (!vendorId || !vendorName) {
      console.error('[Checkout] First item missing vendor info:', items[0]);
      return NextResponse.json(
        { error: 'Cart data is corrupted. Please clear your cart and try again.' },
        { status: 400 }
      );
    }

    if (!items.every((item) => item.vendorId === vendorId)) {
      console.log('[Checkout] Items from multiple vendors');
      return NextResponse.json(
        { error: 'All items must be from the same vendor' },
        { status: 400 }
      );
    }

    // Validate required customer info
    const validatedCustomerInfo = {
      name: customerInfo?.name?.trim() || decodedToken.name || 'Customer',
      email: customerInfo?.email?.trim() || customerEmail || '',
      phone: customerInfo?.phone?.trim() || '',
    };

    if (!validatedCustomerInfo.email) {
      console.log('[Checkout] Missing email');
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!validatedCustomerInfo.phone) {
      console.log('[Checkout] Missing phone');
      return NextResponse.json(
        { error: 'Phone number is required for delivery coordination' },
        { status: 400 }
      );
    }

    // Validate delivery address
    if (!deliveryAddress?.street?.trim() || !deliveryAddress?.city?.trim()) {
      console.log('[Checkout] Missing delivery address:', deliveryAddress);
      return NextResponse.json(
        { error: 'Delivery address is required' },
        { status: 400 }
      );
    }

    // Set defaults for delivery address
    const validatedDeliveryAddress = {
      street: deliveryAddress.street.trim(),
      city: deliveryAddress.city.trim(),
      state: deliveryAddress.state?.trim() || '',
      postalCode: deliveryAddress.postalCode?.trim() || '',
      country: deliveryAddress.country?.trim() || 'Dominican Republic',
      instructions: deliveryAddress.instructions?.trim() || '',
    };

    // Save address to customer profile if it's new
    const db = admin.firestore();
    const customerRef = db.collection('customers').doc(customerId);
    const customerDoc = await customerRef.get();

    // Check if this is a new address (not already saved)
    const existingAddresses: SavedAddress[] = customerDoc.exists
      ? customerDoc.data()?.savedAddresses || []
      : [];

    const addressExists = existingAddresses.some(
      (addr) =>
        addr.street.toLowerCase() === validatedDeliveryAddress.street.toLowerCase() &&
        addr.city.toLowerCase() === validatedDeliveryAddress.city.toLowerCase()
    );

    // If address doesn't exist and customer has no addresses, save it
    if (!addressExists && existingAddresses.length === 0) {
      const newAddress: SavedAddress = {
        id: `addr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        label: 'Home',
        street: validatedDeliveryAddress.street,
        city: validatedDeliveryAddress.city,
        state: validatedDeliveryAddress.state,
        postalCode: validatedDeliveryAddress.postalCode,
        country: validatedDeliveryAddress.country,
        instructions: validatedDeliveryAddress.instructions,
        isPinned: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await customerRef.set(
        {
          savedAddresses: [newAddress],
          pinnedAddressId: newAddress.id,
          defaultAddress: validatedDeliveryAddress,
          phone: validatedCustomerInfo.phone,
          updatedAt: admin.firestore.Timestamp.now(),
        },
        { merge: true }
      );
    } else if (!customerDoc.exists || !customerDoc.data()?.phone) {
      // Save phone if not already saved
      await customerRef.set(
        {
          phone: validatedCustomerInfo.phone,
          updatedAt: admin.firestore.Timestamp.now(),
        },
        { merge: true }
      );
    }

    // Calculate order totals (all in dollars)
    // Note: FEES.DELIVERY_FEE is in cents, FEES.TAX_PERCENT is a whole number (18 for 18%)
    const subtotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const deliveryFee = FEES.DELIVERY_FEE / 100; // Convert cents to dollars (399 -> 3.99)
    const taxAmount = (subtotal + deliveryFee) * (FEES.TAX_PERCENT / 100); // Convert 18 to 0.18
    const totalAmount = subtotal + deliveryFee + taxAmount;

    // Generate order ID and tracking PIN
    const orderId = generateOrderId();
    const trackingPin = generateTrackingPin();

    // Create line items for Stripe (amounts in cents)
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map(
      (item) => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.name,
            description: item.description || undefined,
            images: item.imageUrl ? [item.imageUrl] : undefined,
          },
          unit_amount: Math.round(item.price * 100), // Convert dollars to cents
        },
        quantity: item.quantity,
      })
    );

    // Add delivery fee as line item
    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: {
          name: 'Delivery Fee',
        },
        unit_amount: FEES.DELIVERY_FEE, // Already in cents
      },
      quantity: 1,
    });

    // Add tax as line item
    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: {
          name: 'Tax (ITBIS 18%)',
        },
        unit_amount: Math.round(taxAmount * 100), // Convert dollars to cents
      },
      quantity: 1,
    });

    // Get or create Stripe customer
    let stripeCustomerId: string | undefined;
    const existingStripeId = customerDoc.exists ? customerDoc.data()?.stripeCustomerId : null;

    if (existingStripeId) {
      // Verify the customer exists in current Stripe mode (test vs live)
      try {
        await stripe.customers.retrieve(existingStripeId);
        stripeCustomerId = existingStripeId;
        console.log('[Checkout] Using existing Stripe customer:', stripeCustomerId);
      } catch (err) {
        // Customer doesn't exist (likely test/live mode mismatch) - create new one
        console.log('[Checkout] Stripe customer not found, creating new one. Old ID:', existingStripeId);
        stripeCustomerId = undefined;
      }
    }

    if (!stripeCustomerId) {
      // Create new Stripe customer
      const stripeCustomer = await stripe.customers.create({
        email: validatedCustomerInfo.email,
        name: validatedCustomerInfo.name,
        phone: validatedCustomerInfo.phone,
        metadata: {
          firebaseUid: customerId,
        },
      });
      stripeCustomerId = stripeCustomer.id;
      console.log('[Checkout] Created new Stripe customer:', stripeCustomerId);

      // Save Stripe customer ID to Firestore
      await customerRef.set(
        {
          stripeCustomerId: stripeCustomer.id,
          updatedAt: admin.firestore.Timestamp.now(),
        },
        { merge: true }
      );
    }

    // Create Stripe Checkout Session
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.stackbotglobal.com';

    console.log('[Checkout] Creating Stripe session for order:', orderId);

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: lineItems,
      success_url: `${baseUrl}/order-confirmation?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`,
      cancel_url: `${baseUrl}/cart?cancelled=true`,
      metadata: {
        orderId,
        trackingPin,
        customerId,
        vendorId,
        vendorName,
        customerName: validatedCustomerInfo.name,
        customerEmail: validatedCustomerInfo.email,
        customerPhone: validatedCustomerInfo.phone,
        deliveryStreet: validatedDeliveryAddress.street,
        deliveryCity: validatedDeliveryAddress.city,
        deliveryState: validatedDeliveryAddress.state,
        deliveryPostalCode: validatedDeliveryAddress.postalCode,
        deliveryCountry: validatedDeliveryAddress.country,
        deliveryInstructions: validatedDeliveryAddress.instructions,
        notes: notes || '',
        subtotal: subtotal.toFixed(2),
        deliveryFee: deliveryFee.toFixed(2),
        serviceFee: '0.00', // Removed service fee
        tax: taxAmount.toFixed(2),
        total: totalAmount.toFixed(2),
        itemsJson: JSON.stringify(
          items.map((item) => ({
            productId: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          }))
        ),
      },
      shipping_address_collection: undefined, // We're using our own address form
      phone_number_collection: {
        enabled: false, // We already collected phone
      },
      billing_address_collection: 'auto',
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 min expiry
    });

    console.log('[Checkout] Session created:', session.id);

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      orderId,
    });
  } catch (error) {
    console.error('[Checkout] Error:', error);

    if (error instanceof Stripe.errors.StripeError) {
      console.error('[Checkout] Stripe error:', error.type, error.message);
      return NextResponse.json(
        { error: `Payment error: ${error.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create checkout session. Please try again.' },
      { status: 500 }
    );
  }
}