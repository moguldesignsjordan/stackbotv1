// src/lib/stripe/stripe.ts
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-12-15.clover',
  typescript: true,
});

// Fee configuration (in cents for Stripe)
export const FEES = {
  DELIVERY_FEE: 399, // $3.99
  SERVICE_FEE_PERCENT: 5, // 5%
  TAX_PERCENT: 18, // 18% ITBIS
};

// Generate human-readable order ID
export function generateOrderId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SB-${timestamp}${random}`;
}

// Generate 6-digit tracking PIN
export function generateTrackingPin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}