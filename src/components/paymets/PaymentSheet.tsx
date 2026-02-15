// src/components/paymets/PaymentSheet.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { X, Loader2, Lock, CreditCard, CheckCircle2, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

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
  const { language } = useLanguage();

  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const isProcessing = status === 'processing';
  const isSucceeded = status === 'succeeded';

  // Handle PaymentElement ready state
  useEffect(() => {
    if (elements) {
      const paymentElement = elements.getElement('payment');
      if (paymentElement) {
        paymentElement.on('ready', () => setIsReady(true));
      }
    }
  }, [elements]);

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setStatus('processing');
    setErrorMessage(null);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/success?order_id=${orderId}`,
        },
        redirect: 'if_required',
      });

      if (error) {
        setStatus('failed');
        setErrorMessage(error.message || 'Payment failed. Please try again.');
        onError(error.message || 'Payment failed');
      } else if (paymentIntent) {
        if (paymentIntent.status === 'succeeded') {
          setStatus('succeeded');
          setTimeout(() => {
            onSuccess(orderId, trackingPin);
          }, 1500);
        } else if (paymentIntent.status === 'requires_action') {
          setStatus('processing');
        } else {
          setStatus('failed');
          setErrorMessage('Payment could not be processed. Please try again.');
        }
      }
    } catch (err) {
      setStatus('failed');
      const message = err instanceof Error ? err.message : 'Payment failed';
      setErrorMessage(message);
      onError(message);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={!isProcessing && !isSucceeded ? onCancel : undefined}
      />

      {/* Sheet — full width on mobile, centered card on desktop */}
      <div className="relative w-full sm:max-w-md sm:mx-4 bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl animate-slide-up max-h-[92vh] sm:max-h-[85vh] flex flex-col">
        {/* ============================================================
            SUCCESS STATE
        ============================================================ */}
        {isSucceeded ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">
              {language === 'es' ? '¡Pago Exitoso!' : 'Payment Successful!'}
            </h3>
            <p className="text-gray-500 text-sm">
              {language === 'es' ? 'Redirigiendo...' : 'Redirecting...'}
            </p>
          </div>
        ) : (
          <>
            {/* Header — fixed at top of sheet */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#55529d]/10 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-[#55529d]" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">
                    {language === 'es' ? 'Completar Pago' : 'Complete Payment'}
                  </h2>
                  <p className="text-xs text-gray-500">{vendorName}</p>
                </div>
              </div>
              <button
                onClick={onCancel}
                disabled={isProcessing}
                className="p-2 -mr-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable content area */}
            <div className="flex-1 overflow-y-auto overscroll-contain min-h-0">
              {/* Order Summary */}
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {language === 'es' ? 'Total a Pagar' : 'Total Amount'}
                  </span>
                  <span className="text-2xl font-bold text-gray-900">${total}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {language === 'es' ? 'Orden' : 'Order'} #{orderId}
                </p>
              </div>

              {/* Payment Form */}
              <form onSubmit={handleSubmit} id="payment-form" className="p-4 space-y-4">
                {/* Error Message */}
                {errorMessage && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-red-700">{errorMessage}</p>
                      {status === 'failed' && (
                        <button
                          type="button"
                          onClick={() => {
                            setStatus('idle');
                            setErrorMessage(null);
                          }}
                          className="text-sm text-red-600 font-medium underline mt-1"
                        >
                          {language === 'es' ? 'Intentar de nuevo' : 'Try again'}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Loading state before PaymentElement is ready */}
                {!isReady && (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-[#55529d] animate-spin" />
                  </div>
                )}

                {/* Payment Element — Apple Pay + Google Pay + Card (no Amazon Pay) */}
                <div className={!isReady ? 'hidden' : ''}>
                  <PaymentElement
                    options={{
                      layout: 'tabs',
                      paymentMethodOrder: ['apple_pay', 'google_pay', 'card'],
                      wallets: {
                        applePay: 'auto',
                        googlePay: 'auto',
                      },
                      defaultValues: {
                        billingDetails: {
                          name: '',
                        },
                      },
                    }}
                  />
                </div>
              </form>
            </div>

            {/* Footer — pinned at bottom with Pay button */}
            <div className="shrink-0 border-t border-gray-100 p-4 bg-white pb-safe">
              <button
                type="submit"
                form="payment-form"
                disabled={!stripe || !elements || isProcessing || !isReady}
                className="w-full py-4 px-6 bg-[#55529d] text-white font-semibold rounded-xl hover:bg-[#444287] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
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
              <div className="mt-3 flex items-center justify-center gap-2 text-xs text-gray-400">
                <Lock className="w-3 h-3" />
                <span>{language === 'es' ? 'Pago seguro con Stripe' : 'Secured by Stripe'}</span>
              </div>
            </div>
          </>
        )}
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
        .pb-safe {
          padding-bottom: max(1rem, env(safe-area-inset-bottom));
        }
      `}</style>
    </div>
  );
}