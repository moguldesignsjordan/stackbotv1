// src/app/api/promo/validate/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/stripe';

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
    metadata: Record<string, string>;
  };
}

/**
 * POST /api/promo/validate
 *
 * Validates a Stripe promotion code and returns discount details.
 * Used by the PaymentIntent (saved-card) flow to apply discounts server-side,
 * and by the cart UI to show discount previews before checkout.
 *
 * Body: { promoCode: string, subtotal?: number }
 * Returns: { valid, promoCodeId, couponId, percentOff, amountOff, discountAmount, name }
 */
export async function POST(request: NextRequest) {
  try {
    const { promoCode, subtotal } = await request.json();

    if (!promoCode || typeof promoCode !== 'string') {
      return NextResponse.json(
        { valid: false, error: 'Promotion code is required' },
        { status: 400 }
      );
    }

    const trimmedCode = promoCode.trim().toUpperCase();

    if (trimmedCode.length < 2 || trimmedCode.length > 50) {
      return NextResponse.json(
        { valid: false, error: 'Invalid promotion code' },
        { status: 400 }
      );
    }

    // Look up active promotion codes matching the user's input
    const promoCodes = await stripe.promotionCodes.list({
      code: trimmedCode,
      active: true,
      limit: 1,
      expand: ['data.coupon'],
    });

    if (promoCodes.data.length === 0) {
      return NextResponse.json(
        { valid: false, error: 'Invalid or expired promotion code' },
        { status: 404 }
      );
    }

    // Cast to our explicit interface to avoid SDK type gaps
    const promoCodeObj = promoCodes.data[0] as unknown as StripePromoCodeResponse;
    const coupon = promoCodeObj.coupon;

    // Check if coupon is still valid
    if (!coupon.valid) {
      return NextResponse.json(
        { valid: false, error: 'This promotion has expired' },
        { status: 410 }
      );
    }

    // Check max redemptions on the promo code itself
    if (
      promoCodeObj.max_redemptions &&
      promoCodeObj.times_redeemed >= promoCodeObj.max_redemptions
    ) {
      return NextResponse.json(
        { valid: false, error: 'This promotion code has reached its usage limit' },
        { status: 410 }
      );
    }

    // Check expiry
    if (promoCodeObj.expires_at && promoCodeObj.expires_at < Math.floor(Date.now() / 1000)) {
      return NextResponse.json(
        { valid: false, error: 'This promotion code has expired' },
        { status: 410 }
      );
    }

    // Check minimum amount restriction (set via coupon metadata in Stripe Dashboard)
    if (coupon.metadata?.min_subtotal && subtotal) {
      const minSubtotal = parseFloat(coupon.metadata.min_subtotal);
      if (subtotal < minSubtotal) {
        return NextResponse.json(
          {
            valid: false,
            error: `Minimum order of $${minSubtotal.toFixed(2)} required for this promotion`,
          },
          { status: 400 }
        );
      }
    }

    // Calculate discount amount if subtotal provided
    let discountAmount = 0;
    if (subtotal && subtotal > 0) {
      if (coupon.percent_off) {
        discountAmount = Math.round((subtotal * coupon.percent_off) / 100 * 100) / 100;
      } else if (coupon.amount_off) {
        // Stripe stores amount_off in cents
        discountAmount = Math.min(coupon.amount_off / 100, subtotal);
      }
    }

    return NextResponse.json({
      valid: true,
      promoCodeId: promoCodeObj.id,
      couponId: coupon.id,
      code: trimmedCode,
      name: coupon.name || trimmedCode,
      percentOff: coupon.percent_off || null,
      amountOff: coupon.amount_off ? coupon.amount_off / 100 : null, // Convert cents to dollars
      discountAmount,
      currency: coupon.currency || 'usd',
    });
  } catch (error) {
    console.error('[Promo Validate] Error:', error);
    return NextResponse.json(
      { valid: false, error: 'Failed to validate promotion code' },
      { status: 500 }
    );
  }
}