// src/app/order-confirmation/page.tsx
'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function OrderConfirmationRedirect() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (sessionId) {
      // Redirect to the actual success page with the session_id
      router.replace(`/checkout/success?session_id=${sessionId}`);
    } else {
      // If no session_id, redirect to homepage
      router.replace('/');
    }
  }, [sessionId, router]);

  // Show a simple loader while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="w-8 h-8 animate-spin text-[#55529d]" />
    </div>
  );
}
