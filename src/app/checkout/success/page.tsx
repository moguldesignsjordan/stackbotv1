// src/app/checkout/success/page.tsx
'use client';

import { useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import { Loader2 } from 'lucide-react';
import OrderConfirmationClient from '@/components/orders/OrderConfirmationClient';

/**
 * Checkout success page.
 * - Clears the cart once on mount (idempotent via ref guard).
 * - Redirects to home if no session_id is present.
 * - Renders the shared OrderConfirmationClient which handles:
 *   • Initial order fetch via /api/orders/confirm
 *   • Real-time Firestore listener for status, driver location, etc.
 *   • Embedded LiveDeliveryMap with live driver tracking
 */
function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { clearCart } = useCart();
  const cartCleared = useRef(false);

  const sessionId = searchParams.get('session_id');

  // Clear cart once on successful checkout
  useEffect(() => {
    if (!sessionId) {
      router.push('/');
      return;
    }

    if (!cartCleared.current) {
      cartCleared.current = true;
      clearCart();
    }
  }, [sessionId, clearCart, router]);

  // If no session_id, don't render anything (redirect above handles it)
  if (!sessionId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#55529d]" />
      </div>
    );
  }

  // Render the shared confirmation client which handles everything else
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