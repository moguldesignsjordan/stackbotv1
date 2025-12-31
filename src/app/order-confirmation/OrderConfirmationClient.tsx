'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';

export default function OrderConfirmationClient() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  return (
    <div className="max-w-xl mx-auto p-8 text-center">
      <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />

      <h1 className="text-2xl font-bold mb-2">
        Order Confirmed
      </h1>

      <p className="text-gray-600 mb-4">
        Thank you for your order!
      </p>

      {orderId && (
        <p className="font-mono text-sm text-gray-700 mb-6">
          Order ID: {orderId}
        </p>
      )}

      <Link
        href="/"
        className="inline-block mt-4 text-sb-primary font-semibold hover:underline"
      >
        Back to home
      </Link>
    </div>
  );
}
