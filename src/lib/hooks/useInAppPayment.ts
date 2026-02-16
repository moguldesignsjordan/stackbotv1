// src/hooks/useInAppPayment.ts
'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { CartItem } from '@/lib/types/order';

type FulfillmentType = 'delivery' | 'pickup';

interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
}

interface DeliveryAddress {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  instructions: string;
  coordinates?: { lat: number; lng: number } | null; // FIX: Pass through delivery coordinates
}

interface PaymentIntentData {
  clientSecret: string;
  paymentIntentId: string;
  orderId: string;
  trackingPin: string;
  total: string;
}

interface UseInAppPaymentOptions {
  onSuccess?: (orderId: string, trackingPin: string) => void;
  onError?: (error: string) => void;
}

export function useInAppPayment(options: UseInAppPaymentOptions = {}) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentIntentData | null>(null);
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const [vendorName, setVendorName] = useState<string>('');

  const createPaymentIntent = useCallback(async (params: {
    items: CartItem[];
    customerInfo: CustomerInfo;
    deliveryAddress: DeliveryAddress | null;
    fulfillmentType: FulfillmentType;
    notes?: string;
    saveAddress?: boolean;
    vendorName: string;
  }) => {
    if (!user) {
      setError('Please sign in to continue');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = await user.getIdToken();

      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: params.items,
          customerInfo: params.customerInfo,
          deliveryAddress: params.deliveryAddress,
          fulfillmentType: params.fulfillmentType,
          notes: params.notes,
          saveAddress: params.saveAddress,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment');
      }

      const paymentIntent: PaymentIntentData = {
        clientSecret: data.clientSecret,
        paymentIntentId: data.paymentIntentId,
        orderId: data.orderId,
        trackingPin: data.trackingPin,
        total: data.total,
      };

      setPaymentData(paymentIntent);
      setVendorName(params.vendorName);
      setShowPaymentSheet(true);

      return paymentIntent;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment failed';
      setError(message);
      options.onError?.(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user, options]);

  const handlePaymentSuccess = useCallback((orderId: string, trackingPin: string) => {
    setShowPaymentSheet(false);
    setPaymentData(null);
    options.onSuccess?.(orderId, trackingPin);
  }, [options]);

  const handlePaymentCancel = useCallback(() => {
    setShowPaymentSheet(false);
    // Note: PaymentIntent is still valid if user wants to retry
  }, []);

  const handlePaymentError = useCallback((error: string) => {
    setError(error);
    options.onError?.(error);
  }, [options]);

  const reset = useCallback(() => {
    setPaymentData(null);
    setShowPaymentSheet(false);
    setError(null);
    setVendorName('');
  }, []);

  return {
    // State
    isLoading,
    error,
    paymentData,
    showPaymentSheet,
    vendorName,
    
    // Actions
    createPaymentIntent,
    handlePaymentSuccess,
    handlePaymentCancel,
    handlePaymentError,
    reset,
  };
}