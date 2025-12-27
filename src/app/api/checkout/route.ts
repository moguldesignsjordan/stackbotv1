// src/app/api/checkout/route.ts

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe, FEES, generateOrderId, generateTrackingPin } from '@/lib/stripe/stripe';
import { CheckoutSessionRequest, CartItem } from '@/lib/types/order';
import admin from '@/lib/firebase/admin';
import { SavedAddress } from '@/lib/types/address';

export async function POST(request: NextRequest) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
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
      console.error('Token verification failed:', err);
      return NextResponse.json(
        { error: 'Session expired - Please sign in again' },
        { status: 401 }
      );
    }

    const customerId = decodedToken.uid;
    const customerEmail = decodedToken.email;

    // Parse request body
    const body: CheckoutSessionRequest = await request.json();
    const { items, customerInfo, deliveryAddress, notes, saveAddress } = body;

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

    // Validate required customer info
    const validatedCustomerInfo = {
      name: customerInfo?.name?.trim() || decodedToken.name || 'Customer',
      email: customerInfo?.email?.trim() || customerEmail || '',
      phone: customerInfo?.phone?.trim() || '',
    };

    if (!validatedCustomerInfo.email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!validatedCustomerInfo.phone) {
      return NextResponse.json(
        { error: 'Phone number is required for delivery coordination' },
        { status: 400 }
      );
    }

    // Validate delivery address
    if (!deliveryAddress?.street?.trim() || !deliveryAddress?.city?.trim()) {
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
          phone: validatedCustomerInfo.phone, // Also save phone
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

    // Calculate order totals
    const subtotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const deliveryFee = FEES.DELIVERY_FEE;
    const serviceFee = subtotal * FEES.SERVICE_FEE_PERCENT;
    const taxAmount = (subtotal + deliveryFee + serviceFee) * FEES.TAX_RATE;
    const totalAmount = subtotal + deliveryFee + serviceFee + taxAmount;

    // Generate order ID and tracking PIN
    const orderId = generateOrderId();
    const trackingPin = generateTrackingPin();

    // Create line items for Stripe
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map(
      (item) => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.name,
            description: item.description || undefined,
            images: item.imageUrl ? [item.imageUrl] : undefined,
          },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      })
    );

    // Add fees as line items
    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: {
          name: 'Delivery Fee',
        },
        unit_amount: Math.round(deliveryFee * 100),
      },
      quantity: 1,
    });

    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: {
          name: 'Service Fee',
        },
        unit_amount: Math.round(serviceFee * 100),
      },
      quantity: 1,
    });

    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: {
          name: 'Tax (ITBIS)',
        },
        unit_amount: Math.round(taxAmount * 100),
      },
      quantity: 1,
    });

    // Get or create Stripe customer
    let stripeCustomerId: string | undefined;
    if (customerDoc.exists && customerDoc.data()?.stripeCustomerId) {
      stripeCustomerId = customerDoc.data()?.stripeCustomerId;
    } else {
      // Create Stripe customer
      const stripeCustomer = await stripe.customers.create({
        email: validatedCustomerInfo.email,
        name: validatedCustomerInfo.name,
        phone: validatedCustomerInfo.phone,
        metadata: {
          firebaseUid: customerId,
        },
      });
      stripeCustomerId = stripeCustomer.id;

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
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
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
        subtotal: subtotal.toString(),
        deliveryFee: deliveryFee.toString(),
        serviceFee: serviceFee.toString(),
        tax: taxAmount.toString(),
        total: totalAmount.toString(),
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

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      orderId,
    });
  } catch (error) {
    console.error('Checkout error:', error);
    
    if (error instanceof Stripe.errors.StripeError) {
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