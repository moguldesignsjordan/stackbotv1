// src/components/payments/CheckoutModal.tsx
'use client';

import { StripeProvider } from './StripeProvider';
import { PaymentSheet } from './PaymentSheet';

interface CheckoutModalProps {
  clientSecret: string;
  orderId: string;
  trackingPin: string;
  total: string;
  vendorName: string;
  onSuccess: (orderId: string, trackingPin: string) => void;
  onCancel: () => void;
  onError: (error: string) => void;
}

export function CheckoutModal({
  clientSecret,
  orderId,
  trackingPin,
  total,
  vendorName,
  onSuccess,
  onCancel,
  onError,
}: CheckoutModalProps) {
  return (
    <StripeProvider clientSecret={clientSecret}>
      <PaymentSheet
        orderId={orderId}
        trackingPin={trackingPin}
        total={total}
        vendorName={vendorName}
        onSuccess={onSuccess}
        onCancel={onCancel}
        onError={onError}
      />
    </StripeProvider>
  );
}