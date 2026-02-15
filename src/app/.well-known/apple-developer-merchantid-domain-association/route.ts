// src/app/.well-known/apple-developer-merchantid-domain-association/route.ts
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/stripe';

/**
 * Serves the Apple Pay domain verification file.
 * Stripe provides this content when you register your domain.
 *
 * Steps:
 * 1. Go to Stripe Dashboard → Settings → Payment methods → Apple Pay → Add domain
 * 2. Enter: stackbotglobal.com
 * 3. Stripe will verify automatically via this route
 */
export async function GET() {
  try {
    // Fetch the verification file directly from Stripe's API
    const response = await fetch(
      'https://stripe.com/files/apple-pay/apple-developer-merchantid-domain-association'
    );
    const content = await response.text();

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch {
    // Fallback: return empty 200 so Stripe can retry
    return new NextResponse('', { status: 200 });
  }
}