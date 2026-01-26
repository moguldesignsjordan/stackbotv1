// src/components/payments/PaymentSheet.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { X, Loader2, Lock, CreditCard, CheckCircle2, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/lib/context/LanguageContext';

interface PaymentSheetProps {
  orderId: string;
  trackingPin: string;
  total: string;
  vendorName: string;
  onSuccess: (orderId: string, trackingPin: string) => void;
  onCancel: () => void;
  onError: (error: string) => void;
}

type PaymentStatus = 'idle' | 'processing' | 'succeeded' | 'failed';

export function PaymentSheet({
  orderId,
  trackingPin,
  total,
  vendorName,
  onSuccess,
  onCancel,
  onError,
}: PaymentSheetProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { t, language } = useLanguage();
  
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Handle PaymentElement ready state
  useEffect(() => {
    if (elements) {
      const paymentElement = elements.getElement('payment');
      if (paymentElement) {
        paymentElement.on('ready', () => setIsReady(true));
      }
    }
  }, [elements]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setStatus('processing');
    setErrorMessage(null);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/order-confirmation?order_id=${orderId}`,
        },
        redirect: 'if_required',
      });

      if (error) {
        // Show error to customer
        setStatus('failed');
        setErrorMessage(error.message || 'Payment failed. Please try again.');
        onError(error.message || 'Payment failed');
      } else if (paymentIntent) {
        if (paymentIntent.status === 'succeeded') {
          setStatus('succeeded');
          // Small delay to show success state
          setTimeout(() => {
            onSuccess(orderId, trackingPin);
          }, 1500);
        } else if (paymentIntent.status === 'requires_action') {
          // 3D Secure or other authentication - handled by Stripe
          setStatus('processing');
        } else {
          setStatus('failed');
          setErrorMessage('Payment could not be processed. Please try again.');
        }
      }
    } catch (err) {
      setStatus('failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setErrorMessage(message);
      onError(message);
    }
  };

  const isProcessing = status === 'processing';
  const isSucceeded = status === 'succeeded';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={!isProcessing && !isSucceeded ? onCancel : undefined}
      />
      
      {/* Sheet */}
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#55529d]/10 rounded-xl">
              <CreditCard className="w-5 h-5 text-[#55529d]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {language === 'es' ? 'Completar Pago' : 'Complete Payment'}
              </h2>
              <p className="text-sm text-gray-500">{vendorName}</p>
            </div>
          </div>
          
          {!isProcessing && !isSucceeded && (
            <button
              onClick={onCancel}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          )}
        </div>

        {/* Success State */}
        {isSucceeded ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {language === 'es' ? '¡Pago Exitoso!' : 'Payment Successful!'}
            </h3>
            <p className="text-gray-600">
              {language === 'es' 
                ? 'Redirigiendo a confirmación...' 
                : 'Redirecting to confirmation...'}
            </p>
          </div>
        ) : (
          <>
            {/* Order Summary */}
            <div className="p-4 bg-gray-50 border-b border-gray-100">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">
                  {language === 'es' ? 'Total a Pagar' : 'Total Amount'}
                </span>
                <span className="text-2xl font-bold text-gray-900">
                  ${total}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {language === 'es' ? 'Orden' : 'Order'} #{orderId}
              </p>
            </div>

            {/* Payment Form */}
            <form onSubmit={handleSubmit} className="p-4">
              {/* Error Message */}
              {errorMessage && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{errorMessage}</p>
                </div>
              )}

              {/* Loading state before PaymentElement is ready */}
              {!isReady && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-[#55529d] animate-spin" />
                </div>
              )}

              {/* Payment Element */}
              <div className={!isReady ? 'hidden' : ''}>
                <PaymentElement
                  options={{
                    layout: 'tabs',
                    paymentMethodOrder: ['card', 'apple_pay', 'google_pay'],
                    defaultValues: {
                      billingDetails: {
                        name: '',
                      },
                    },
                  }}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!stripe || !elements || isProcessing || !isReady}
                className="w-full mt-6 py-4 px-6 bg-[#55529d] text-white font-semibold rounded-xl 
                         hover:bg-[#444287] disabled:opacity-50 disabled:cursor-not-allowed 
                         transition-all duration-200 flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {language === 'es' ? 'Procesando...' : 'Processing...'}
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    {language === 'es' ? `Pagar $${total}` : `Pay $${total}`}
                  </>
                )}
              </button>

              {/* Security Badge */}
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
                <Lock className="w-3 h-3" />
                <span>
                  {language === 'es' 
                    ? 'Pago seguro con Stripe' 
                    : 'Secured by Stripe'}
                </span>
              </div>
            </form>
          </>
        )}

        {/* Safe area padding for mobile */}
        <div className="h-safe-area-inset-bottom" />
      </div>

      {/* Animation styles */}
      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}