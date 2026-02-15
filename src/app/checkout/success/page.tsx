// src/app/checkout/success/page.tsx
'use client';

import { useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import { Loader2 } from 'lucide-react';
import OrderConfirmationClient from '@/components/orders/OrderConfirmationClient';

/**
 * Unified checkout success page.
 * Handles BOTH payment flows:
 *  - Stripe Checkout redirect → ?session_id=cs_xxx
 *  - In-app PaymentIntent    → ?order_id=SB-xxx
 *
 * Clears the cart once on mount (idempotent via ref guard).
 * Renders OrderConfirmationClient which handles fetching, real-time updates, and live map.
 */
function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { clearCart } = useCart();
  const cartCleared = useRef(false);

  const sessionId = searchParams.get('session_id');
  const orderId = searchParams.get('order_id');

  // Must have at least one identifier
  const hasRef = !!(sessionId || orderId);

  // Clear cart once on successful checkout
  useEffect(() => {
    if (!hasRef) {
      router.push('/');
      return;
    }

    if (!cartCleared.current) {
      cartCleared.current = true;
      clearCart();
    }
  }, [hasRef, clearCart, router]);

  // If no reference, redirect (handled above)
  if (!hasRef) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#55529d]" />
      </div>
    );
  }

  return <OrderConfirmationClient />;
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#55529d]" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}