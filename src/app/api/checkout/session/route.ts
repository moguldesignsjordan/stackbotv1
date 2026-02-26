// src/app/api/checkout/session/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/stripe';

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json(
      { error: 'Session ID is required' },
      { status: 400 }
    );
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['total_details.breakdown'],
    });

    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Payment not completed' },
        { status: 400 }
      );
    }

    const metadata = session.metadata;

    // Extract discount info from Stripe session
    let discount = null;
    if (
      session.total_details?.amount_discount &&
      session.total_details.amount_discount > 0
    ) {
      const breakdown = session.total_details?.breakdown;
      const discountEntry = breakdown?.discounts?.[0];

      discount = {
        amount: session.total_details.amount_discount / 100, // cents → dollars
        promoCode: metadata?.promoCode || '',
        couponName: discountEntry?.discount?.coupon?.name || '',
      };
    }

    return NextResponse.json({
      orderId: metadata?.orderId || 'N/A',
      trackingPin: metadata?.trackingPin || 'N/A',
      vendorName: metadata?.vendorName || 'N/A',
      total: metadata?.total || '0.00',
      status: 'confirmed',
      discount,
    });
  } catch (error) {
    console.error('Session retrieval error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve session' },
      { status: 500 }
    );
  }
}