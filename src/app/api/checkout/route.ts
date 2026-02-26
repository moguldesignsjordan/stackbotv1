// src/app/api/checkout/route.ts

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe, FEES, generateOrderId, generateTrackingPin } from '@/lib/stripe/stripe';
import { CartItem } from '@/lib/types/order';
import admin from '@/lib/firebase/admin';
import { SavedAddress } from '@/lib/types/address';

type FulfillmentType = 'delivery' | 'pickup';

interface CheckoutRequestBody {
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
    coordinates?: { lat: number; lng: number } | null;
  } | null;
  fulfillmentType?: FulfillmentType;
  notes?: string;
  saveAddress?: boolean;
  // ── Tip & saved card fields ──
  tipAmount?: number;
  tipPercent?: number | null;
  saveCard?: boolean;
  savedPaymentMethodId?: string | null;
  // ── Promo code field ──
  promoCodeId?: string | null;
}

interface VendorGroup {
  vendorId: string;
  vendorName: string;
  items: CartItem[];
  subtotal: number;
  orderId: string;
  trackingPin: string;
}

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

/**
 * Group cart items by vendor
 */
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

/**
 * Shape of the Stripe API response for a PromotionCode with expanded coupon.
 * Defined explicitly because some stripe-node SDK versions have incomplete
 * type definitions for PromotionCode.coupon.
 */
interface StripePromoCodeResponse {
  id: string;
  active: boolean;
  code: string;
  max_redemptions: number | null;
  times_redeemed: number;
  expires_at: number | null;
  coupon: {
    id: string;
    valid: boolean;
    percent_off: number | null;
    amount_off: number | null;
    currency: string | null;
    name: string | null;
  };
}

/**
 * Validates a Stripe promotion code server-side and returns discount details.
 * Returns null if invalid or any error occurs (fails open — no discount applied).
 */
async function validatePromoCode(
  promoCodeId: string,
  subtotal: number
): Promise<{
  discountAmount: number;
  metadata: Record<string, string>;
} | null> {
  try {
    // Cast to our explicit interface to avoid SDK type gaps
    const promoCodeObj = await stripe.promotionCodes.retrieve(promoCodeId, {
      expand: ['coupon'],
    }) as unknown as StripePromoCodeResponse;

    const coupon = promoCodeObj.coupon;

    if (!promoCodeObj.active || !coupon.valid) {
      console.warn('[Checkout] Promo code inactive or coupon invalid:', promoCodeId);
      return null;
    }

    // Check max redemptions
    if (
      promoCodeObj.max_redemptions &&
      promoCodeObj.times_redeemed >= promoCodeObj.max_redemptions
    ) {
      console.warn('[Checkout] Promo code max redemptions reached:', promoCodeId);
      return null;
    }

    // Check expiry
    if (promoCodeObj.expires_at && promoCodeObj.expires_at < Math.floor(Date.now() / 1000)) {
      console.warn('[Checkout] Promo code expired:', promoCodeId);
      return null;
    }

    let discountAmount = 0;

    if (coupon.percent_off) {
      discountAmount = Math.round(subtotal * coupon.percent_off) / 100;
    } else if (coupon.amount_off) {
      // Stripe stores amount_off in cents
      discountAmount = Math.min(coupon.amount_off / 100, subtotal);
    }

    discountAmount = Math.round(discountAmount * 100) / 100;

    if (discountAmount <= 0) return null;

    return {
      discountAmount,
      metadata: {
        promoCode: promoCodeObj.code || '',
        promoCodeId: promoCodeObj.id,
        couponId: coupon.id,
        discountAmount: String(discountAmount),
        discountType: coupon.percent_off ? 'percent' : 'fixed',
        discountValue: String(coupon.percent_off || (coupon.amount_off ? coupon.amount_off / 100 : 0)),
      },
    };
  } catch (err) {
    console.warn('[Checkout] Failed to validate promo code, proceeding without discount:', err);
    return null;
  }
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
    let body: CheckoutRequestBody;
    try {
      body = await request.json();
    } catch (err) {
      console.error('[Checkout] Failed to parse request body:', err);
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
    }

    const {
      items,
      customerInfo,
      deliveryAddress,
      fulfillmentType = 'delivery',
      notes,
      // ── Tip & card fields ──
      tipAmount: rawTipAmount = 0,
      tipPercent = null,
      saveCard = false,
      savedPaymentMethodId = null,
      // ── Promo code ──
      promoCodeId = null,
    } = body;

    // Validate fulfillment type
    const isPickup = fulfillmentType === 'pickup';
    console.log('[Checkout] Fulfillment type:', fulfillmentType);

    // ── Validate tip (max $999, must be non-negative) ──
    const validatedTip =
      typeof rawTipAmount === 'number' && rawTipAmount >= 0 && rawTipAmount <= 999
        ? Math.round(rawTipAmount * 100) / 100
        : 0;

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
        { error: 'Phone number is required for order coordination' },
        { status: 400 }
      );
    }

    // ========================================================================
    // Validate delivery address only for delivery orders
    // ========================================================================
    let validatedDeliveryAddress: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
      instructions: string;
      coordinates: { lat: number; lng: number } | null;
    } = {
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'Dominican Republic',
      instructions: '',
      coordinates: null,
    };

    if (!isPickup) {
      // Delivery requires address
      if (!deliveryAddress?.street?.trim() || !deliveryAddress?.city?.trim()) {
        console.log('[Checkout] Missing delivery address:', deliveryAddress);
        return NextResponse.json(
          { error: 'Delivery address is required' },
          { status: 400 }
        );
      }

      validatedDeliveryAddress = {
        street: deliveryAddress.street.trim(),
        city: deliveryAddress.city.trim(),
        state: deliveryAddress.state?.trim() || '',
        postalCode: deliveryAddress.postalCode?.trim() || '',
        country: deliveryAddress.country?.trim() || 'Dominican Republic',
        instructions: deliveryAddress.instructions?.trim() || '',
        coordinates: deliveryAddress.coordinates?.lat && deliveryAddress.coordinates?.lng
          ? { lat: deliveryAddress.coordinates.lat, lng: deliveryAddress.coordinates.lng }
          : null,
      };
    }

    // Save address to customer profile if it's new (only for delivery)
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
        const isFirst = existingAddresses.length === 0;
        const newAddress: SavedAddress = {
          id: `addr_${Date.now()}`,
          ...validatedDeliveryAddress,
          coordinates: validatedDeliveryAddress.coordinates ?? undefined,
          label: 'Home',
          isPinned: isFirst,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const saveData: Record<string, unknown> = {
          savedAddresses: [...existingAddresses, newAddress],
          updatedAt: admin.firestore.Timestamp.now(),
        };

        if (isFirst) {
          saveData.pinnedAddressId = newAddress.id;
          saveData.defaultAddress = validatedDeliveryAddress;
        }

        await customerRef.set(saveData, { merge: true });
      }
    }

    // ========================================================================
    // MULTI-VENDOR: Group items by vendor
    // ========================================================================
    const vendorGroups = groupByVendor(items);
    const vendorCount = vendorGroups.length;
    const isMultiVendor = vendorCount > 1;

    console.log(`[Checkout] ${vendorCount} vendor(s): ${vendorGroups.map(g => g.vendorName).join(', ')}`);

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const deliveryFee = isPickup ? 0 : (FEES.DELIVERY_FEE / 100) * vendorCount;
    const taxAmount = (subtotal + deliveryFee) * (FEES.TAX_PERCENT / 100);
    // ── Include validated tip in total ──
    const totalAmount = subtotal + deliveryFee + taxAmount + validatedTip;

    console.log('[Checkout] Order totals:', {
      subtotal,
      deliveryFee,
      vendorCount,
      taxAmount,
      tip: validatedTip,
      totalAmount,
      fulfillmentType,
    });

    // Use the first vendor group's orderId as the "primary" order reference
    const primaryOrderId = vendorGroups[0].orderId;

    // Create line items for Stripe (amounts in cents)
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    // Add product items grouped by vendor for clarity
    for (const group of vendorGroups) {
      for (const item of group.items) {
        lineItems.push({
          price_data: {
            currency: 'usd',
            product_data: {
              name: isMultiVendor ? `${item.name} (${group.vendorName})` : item.name,
              description: item.description || undefined,
              images: item.imageUrl ? [item.imageUrl] : undefined,
            },
            unit_amount: Math.round(item.price * 100),
          },
          quantity: item.quantity,
        });
      }
    }

    // Add delivery fee per vendor as line items (only for delivery)
    if (!isPickup) {
      for (const group of vendorGroups) {
        lineItems.push({
          price_data: {
            currency: 'usd',
            product_data: {
              name: isMultiVendor
                ? `Delivery Fee (${group.vendorName})`
                : 'Delivery Fee',
            },
            unit_amount: FEES.DELIVERY_FEE, // Already in cents
          },
          quantity: 1,
        });
      }
    }

    // Add tax as single line item
    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: {
          name: 'Tax (ITBIS 18%)',
        },
        unit_amount: Math.round(taxAmount * 100),
      },
      quantity: 1,
    });

    // ── Add tip as a Stripe line item ──
    if (validatedTip > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: isPickup
              ? 'Staff Tip / Propina para el Personal'
              : 'Driver Tip / Propina para el Conductor',
          },
          unit_amount: Math.round(validatedTip * 100),
        },
        quantity: 1,
      });
    }

    // ========================================================================
    // Store full checkout data in Firestore (avoids Stripe metadata size limits)
    // ========================================================================
    const tipRecipientType = isPickup ? 'staff' : 'driver';

    const checkoutData: Record<string, unknown> = {
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
        tip: validatedTip,
        total: totalAmount,
      },
      // ── Structured tip data ──
      tip: {
        amount: validatedTip,
        percent: tipPercent,
        recipientType: tipRecipientType,
      },
      // ── Discount placeholder (populated below if promo applied) ──
      discount: null,
      vendorCount,
      isMultiVendor,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('pending_checkouts').doc(primaryOrderId).set(checkoutData);
    console.log('[Checkout] Stored pending checkout data:', primaryOrderId);

    // Get or create Stripe customer
    let stripeCustomerId: string | undefined;
    const existingStripeId = customerDoc.exists ? customerDoc.data()?.stripeCustomerId : null;

    if (existingStripeId) {
      try {
        await stripe.customers.retrieve(existingStripeId);
        stripeCustomerId = existingStripeId;
        console.log('[Checkout] Using existing Stripe customer:', stripeCustomerId);
      } catch (err) {
        console.log('[Checkout] Stripe customer not found, creating new one. Old ID:', existingStripeId);
        stripeCustomerId = undefined;
      }
    }

    if (!stripeCustomerId) {
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

      await customerRef.set(
        {
          stripeCustomerId: stripeCustomer.id,
          updatedAt: admin.firestore.Timestamp.now(),
        },
        { merge: true }
      );
    }

    // Shared metadata for both flows
    const sharedMetadata: Record<string, string> = {
      checkoutDataId: primaryOrderId,
      customerId,
      primaryOrderId,
      vendorCount: String(vendorCount),
      isMultiVendor: String(isMultiVendor),
      fulfillmentType,
      total: totalAmount.toFixed(2),
      orderId: primaryOrderId,
      trackingPin: vendorGroups[0].trackingPin,
      vendorId: vendorGroups[0].vendorId,
      vendorName: vendorGroups[0].vendorName,
      customerName: validatedCustomerInfo.name,
      customerEmail: validatedCustomerInfo.email,
      customerPhone: validatedCustomerInfo.phone,
      // ── Tip in metadata ──
      tipAmount: validatedTip.toFixed(2),
      tipPercent: tipPercent !== null ? String(tipPercent) : '',
      tipRecipientType,
    };

    // ========================================================================
    // Saved card → charge via PaymentIntent (no redirect needed)
    // ========================================================================
    if (savedPaymentMethodId && stripeCustomerId) {
      console.log('[Checkout] Charging saved card:', savedPaymentMethodId);

      // Verify the payment method belongs to this customer
      const pm = await stripe.paymentMethods.retrieve(savedPaymentMethodId);
      if (pm.customer !== stripeCustomerId) {
        return NextResponse.json(
          { error: 'Invalid payment method' },
          { status: 400 }
        );
      }

      // ── Validate promo code server-side for saved-card flow ──
      let discountAmount = 0;
      let discountMetadata: Record<string, string> = {};

      if (promoCodeId && typeof promoCodeId === 'string') {
        const promoResult = await validatePromoCode(promoCodeId, subtotal);
        if (promoResult) {
          discountAmount = promoResult.discountAmount;
          discountMetadata = promoResult.metadata;
          console.log('[Checkout] Promo applied:', discountMetadata.promoCode, 'discount:', discountAmount);
        }
      }

      // Apply discount: subtract from total, enforce Stripe $0.50 minimum
      const discountedTotal = Math.max(totalAmount - discountAmount, 0.50);

      // Update pending checkout with discount info
      if (discountAmount > 0) {
        await db.collection('pending_checkouts').doc(primaryOrderId).update({
          discount: {
            promoCode: discountMetadata.promoCode || '',
            promoCodeId: discountMetadata.promoCodeId || '',
            couponId: discountMetadata.couponId || '',
            amount: discountAmount,
            type: discountMetadata.discountType || '',
            value: parseFloat(discountMetadata.discountValue || '0'),
          },
          'totals.discount': discountAmount,
          'totals.total': discountedTotal,
        });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(discountedTotal * 100),
        currency: 'usd',
        customer: stripeCustomerId,
        payment_method: savedPaymentMethodId,
        confirm: true,
        off_session: false,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never',
        },
        metadata: { ...sharedMetadata, ...discountMetadata },
      });

      // Update pending checkout with PaymentIntent reference
      await db.collection('pending_checkouts').doc(primaryOrderId).update({
        stripePaymentIntentId: paymentIntent.id,
      });

      console.log('[Checkout] PaymentIntent created:', paymentIntent.id, 'status:', paymentIntent.status);

      return NextResponse.json({
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        orderId: primaryOrderId,
        // If 3D Secure required, pass client_secret for frontend confirmation
        ...(paymentIntent.status === 'requires_action' && {
          clientSecret: paymentIntent.client_secret,
          requiresAction: true,
        }),
      });
    }

    // ========================================================================
    // Standard Checkout Session (new card — redirects to Stripe)
    // ========================================================================
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.stackbotglobal.com';

    console.log('[Checkout] Creating Stripe session for checkout:', primaryOrderId);

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: lineItems,
      // ── Stripe-native promo code support for redirect flow ──
      allow_promotion_codes: true,
      // ── Save card for future use if requested ──
      ...(saveCard && {
        payment_intent_data: {
          setup_future_usage: 'on_session',
        },
      }),
      success_url: `${baseUrl}/order-confirmation?session_id={CHECKOUT_SESSION_ID}&order_id=${primaryOrderId}`,
      cancel_url: `${baseUrl}/cart?cancelled=true`,
      metadata: sharedMetadata,
      shipping_address_collection: undefined,
      phone_number_collection: {
        enabled: false,
      },
      billing_address_collection: 'auto',
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 min expiry
    });

    console.log('[Checkout] Session created:', session.id);

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      orderId: primaryOrderId,
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