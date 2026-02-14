// src/app/api/create-payment-intent/route.ts

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe, FEES, generateOrderId, generateTrackingPin } from '@/lib/stripe/stripe';
import { CartItem } from '@/lib/types/order';
import admin from '@/lib/firebase/admin';
import { SavedAddress } from '@/lib/types/address';

type FulfillmentType = 'delivery' | 'pickup';

interface CreatePaymentIntentBody {
  items: CartItem[];
  customerInfo: {
    name?: string;
    email?: string;
    phone?: string;
  };
  deliveryAddress?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    instructions?: string;
  } | null;
  fulfillmentType?: FulfillmentType;
  notes?: string;
  saveAddress?: boolean;
}

interface VendorGroup {
  vendorId: string;
  vendorName: string;
  items: CartItem[];
  subtotal: number;
  orderId: string;
  trackingPin: string;
}

function validateCartItem(item: CartItem, index: number): string | null {
  if (!item.productId) return `Item ${index + 1}: Missing productId`;
  if (!item.vendorId) return `Item ${index + 1}: Missing vendorId`;
  if (!item.vendorName) return `Item ${index + 1}: Missing vendorName`;
  if (!item.name) return `Item ${index + 1}: Missing name`;
  if (typeof item.price !== 'number' || item.price < 0) return `Item ${index + 1}: Invalid price`;
  if (typeof item.quantity !== 'number' || item.quantity < 1) return `Item ${index + 1}: Invalid quantity`;
  return null;
}

function groupByVendor(items: CartItem[]): VendorGroup[] {
  const groups: Record<string, VendorGroup> = {};

  for (const item of items) {
    if (!groups[item.vendorId]) {
      groups[item.vendorId] = {
        vendorId: item.vendorId,
        vendorName: item.vendorName,
        items: [],
        subtotal: 0,
        orderId: generateOrderId(),
        trackingPin: generateTrackingPin(),
      };
    }
    groups[item.vendorId].items.push(item);
    groups[item.vendorId].subtotal += item.price * item.quantity;
  }

  return Object.values(groups);
}

export async function POST(request: NextRequest) {
  try {
    // ========================================================================
    // Auth
    // ========================================================================
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in to checkout' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];

    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch (err) {
      console.error('[PaymentIntent] Token verification failed:', err);
      return NextResponse.json(
        { error: 'Session expired - Please sign in again' },
        { status: 401 }
      );
    }

    const customerId = decodedToken.uid;
    const customerEmail = decodedToken.email;

    // ========================================================================
    // Parse & validate body
    // ========================================================================
    let body: CreatePaymentIntentBody;
    try {
      body = await request.json();
    } catch (err) {
      return NextResponse.json({ error: 'Invalid request format' }, { status: 400 });
    }

    const { items, customerInfo, deliveryAddress, fulfillmentType = 'delivery', notes } = body;
    const isPickup = fulfillmentType === 'pickup';

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    for (let i = 0; i < items.length; i++) {
      const validationError = validateCartItem(items[i], i);
      if (validationError) {
        return NextResponse.json(
          { error: 'Cart contains invalid items. Please clear your cart and try again.' },
          { status: 400 }
        );
      }
    }

    // Validate customer info
    const validatedCustomerInfo = {
      name: customerInfo?.name?.trim() || decodedToken.name || 'Customer',
      email: customerInfo?.email?.trim() || customerEmail || '',
      phone: customerInfo?.phone?.trim() || '',
    };

    if (!validatedCustomerInfo.email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!validatedCustomerInfo.phone) {
      return NextResponse.json(
        { error: 'Phone number is required for order coordination' },
        { status: 400 }
      );
    }

    // Validate delivery address
    let validatedDeliveryAddress = {
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'Dominican Republic',
      instructions: '',
    };

    if (!isPickup) {
      if (!deliveryAddress?.street?.trim() || !deliveryAddress?.city?.trim()) {
        return NextResponse.json({ error: 'Delivery address is required' }, { status: 400 });
      }

      validatedDeliveryAddress = {
        street: deliveryAddress.street.trim(),
        city: deliveryAddress.city.trim(),
        state: deliveryAddress.state?.trim() || '',
        postalCode: deliveryAddress.postalCode?.trim() || '',
        country: deliveryAddress.country?.trim() || 'Dominican Republic',
        instructions: deliveryAddress.instructions?.trim() || '',
      };
    }

    // ========================================================================
    // Save address if new
    // ========================================================================
    const db = admin.firestore();
    const customerRef = db.collection('customers').doc(customerId);
    const customerDoc = await customerRef.get();

    if (!isPickup && validatedDeliveryAddress.street) {
      const existingAddresses: SavedAddress[] = customerDoc.exists
        ? customerDoc.data()?.savedAddresses || []
        : [];

      const addressExists = existingAddresses.some(
        (addr) =>
          addr.street.toLowerCase() === validatedDeliveryAddress.street.toLowerCase() &&
          addr.city.toLowerCase() === validatedDeliveryAddress.city.toLowerCase()
      );

      if (!addressExists) {
        const newAddress: SavedAddress = {
          id: `addr_${Date.now()}`,
          ...validatedDeliveryAddress,
          label: 'Home',
          isDefault: existingAddresses.length === 0,
          createdAt: new Date().toISOString(),
        };

        await customerRef.set(
          {
            savedAddresses: [...existingAddresses, newAddress],
            updatedAt: admin.firestore.Timestamp.now(),
          },
          { merge: true }
        );
      }
    }

    // ========================================================================
    // Multi-vendor grouping & totals
    // ========================================================================
    const vendorGroups = groupByVendor(items);
    const vendorCount = vendorGroups.length;
    const isMultiVendor = vendorCount > 1;

    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const deliveryFee = isPickup ? 0 : (FEES.DELIVERY_FEE / 100) * vendorCount;
    const taxAmount = (subtotal + deliveryFee) * (FEES.TAX_PERCENT / 100);
    const totalAmount = subtotal + deliveryFee + taxAmount;

    const primaryOrderId = vendorGroups[0].orderId;
    const primaryTrackingPin = vendorGroups[0].trackingPin;
    const primaryVendorName = vendorGroups.map((g) => g.vendorName).join(', ');

    console.log('[PaymentIntent] Creating for', vendorCount, 'vendor(s), total:', totalAmount.toFixed(2));

    // ========================================================================
    // Store full checkout data in Firestore (same as checkout route)
    // ========================================================================
    const checkoutData = {
      customerId,
      customerInfo: validatedCustomerInfo,
      fulfillmentType,
      deliveryAddress: isPickup ? null : validatedDeliveryAddress,
      notes: notes || '',
      vendorGroups: vendorGroups.map((group) => ({
        vendorId: group.vendorId,
        vendorName: group.vendorName,
        orderId: group.orderId,
        trackingPin: group.trackingPin,
        subtotal: group.subtotal,
        items: group.items.map((item) => ({
          productId: item.productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          vendorId: item.vendorId,
          vendorName: item.vendorName,
          notes: (item as CartItem & { notes?: string }).notes || '',
        })),
      })),
      totals: {
        subtotal,
        deliveryFee,
        deliveryFeePerVendor: FEES.DELIVERY_FEE / 100,
        serviceFee: 0,
        tax: taxAmount,
        total: totalAmount,
      },
      vendorCount,
      isMultiVendor,
      paymentFlow: 'payment_intent', // Flag to distinguish from checkout session flow
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('pending_checkouts').doc(primaryOrderId).set(checkoutData);
    console.log('[PaymentIntent] Stored pending checkout:', primaryOrderId);

    // ========================================================================
    // Get or create Stripe customer
    // ========================================================================
    let stripeCustomerId: string | undefined;
    const existingStripeId = customerDoc.exists ? customerDoc.data()?.stripeCustomerId : null;

    if (existingStripeId) {
      try {
        await stripe.customers.retrieve(existingStripeId);
        stripeCustomerId = existingStripeId;
      } catch (err) {
        console.log('[PaymentIntent] Stripe customer not found, creating new');
        stripeCustomerId = undefined;
      }
    }

    if (!stripeCustomerId) {
      const stripeCustomer = await stripe.customers.create({
        email: validatedCustomerInfo.email,
        name: validatedCustomerInfo.name,
        phone: validatedCustomerInfo.phone,
        metadata: { firebaseUid: customerId },
      });
      stripeCustomerId = stripeCustomer.id;

      await customerRef.set(
        {
          stripeCustomerId: stripeCustomer.id,
          updatedAt: admin.firestore.Timestamp.now(),
        },
        { merge: true }
      );
    }

    // ========================================================================
    // Create PaymentIntent (NOT a Checkout Session)
    // ========================================================================
    const amountInCents = Math.round(totalAmount * 100);

    // Build description for the payment
    const description = isMultiVendor
      ? `StackBot Order (${vendorCount} vendors: ${primaryVendorName})`
      : `StackBot Order from ${primaryVendorName}`;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      customer: stripeCustomerId,
      description,
      metadata: {
        // Reference to full checkout data in Firestore
        checkoutDataId: primaryOrderId,
        // Basic info for logging / quick access
        customerId,
        primaryOrderId,
        vendorCount: String(vendorCount),
        isMultiVendor: String(isMultiVendor),
        fulfillmentType,
        total: totalAmount.toFixed(2),
        // Keep single-vendor fields for backward compat with webhook
        orderId: primaryOrderId,
        trackingPin: primaryTrackingPin,
        vendorId: vendorGroups[0].vendorId,
        vendorName: vendorGroups[0].vendorName,
        customerName: validatedCustomerInfo.name,
        customerEmail: validatedCustomerInfo.email,
        customerPhone: validatedCustomerInfo.phone,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    console.log('[PaymentIntent] Created:', paymentIntent.id, 'for order:', primaryOrderId);

    // ========================================================================
    // Return clientSecret to the frontend
    // ========================================================================
    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      orderId: primaryOrderId,
      trackingPin: primaryTrackingPin,
      total: totalAmount.toFixed(2),
      vendorName: primaryVendorName,
      vendorCount,
    });
  } catch (error) {
    console.error('[PaymentIntent] Error:', error);

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: `Payment error: ${error.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create payment. Please try again.' },
      { status: 500 }
    );
  }
}