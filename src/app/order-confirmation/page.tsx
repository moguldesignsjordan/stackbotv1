import { Suspense } from 'react';
import OrderConfirmationClient from './OrderConfirmationClient';

export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading order…</div>}>
      <OrderConfirmationClient />
    </Suspense>
  );
}
