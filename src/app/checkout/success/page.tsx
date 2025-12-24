// src/app/checkout/success/page.tsx
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { CheckCircle, Package, Clock, MapPin, Copy, Check, Loader2 } from 'lucide-react';

interface OrderDetails {
  orderId: string;
  trackingPin: string;
  vendorName: string;
  total: string;
  status: string;
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { clearCart } = useCart();
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (!sessionId) {
      router.push('/');
      return;
    }

    // Clear cart on successful payment
    clearCart();

    // Fetch order details from session
    const fetchOrderDetails = async () => {
      try {
        const response = await fetch(`/api/checkout/session?session_id=${sessionId}`);
        if (response.ok) {
          const data = await response.json();
          setOrderDetails(data);
        }
      } catch (error) {
        console.error('Failed to fetch order details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [sessionId, clearCart, router]);

  const copyTrackingPin = () => {
    if (orderDetails?.trackingPin) {
      navigator.clipboard.writeText(orderDetails.trackingPin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#55529d]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        {/* Success Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Order Confirmed!
          </h1>
          <p className="text-gray-600 mb-6">
            Thank you for your order. We&apos;ve sent a confirmation to your email.
          </p>

          {/* Order Details */}
          {orderDetails && (
            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Order ID</span>
                <span className="font-mono font-semibold text-[#55529d]">
                  {orderDetails.orderId}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Vendor</span>
                <span className="font-medium text-gray-900">
                  {orderDetails.vendorName}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Total</span>
                <span className="font-bold text-gray-900">
                  ${orderDetails.total}
                </span>
              </div>

              {/* Tracking PIN */}
              <div className="border-t border-gray-200 pt-3">
                <p className="text-sm text-gray-500 mb-2">Delivery PIN</p>
                <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3">
                  <span className="font-mono text-2xl font-bold text-[#55529d] tracking-wider">
                    {orderDetails.trackingPin}
                  </span>
                  <button
                    onClick={copyTrackingPin}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    aria-label="Copy PIN"
                  >
                    {copied ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : (
                      <Copy className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Share this PIN with the delivery driver to confirm receipt
                </p>
              </div>
            </div>
          )}

          {/* Status Timeline */}
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mb-6">
            <Clock className="w-4 h-4" />
            <span>Estimated delivery: 30-45 minutes</span>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Link
              href="/orders"
              className="w-full inline-flex items-center justify-center gap-2 bg-[#55529d] text-white py-3 px-4 rounded-lg font-medium hover:bg-[#444287] transition-colors"
            >
              <Package className="w-5 h-5" />
              Track Order
            </Link>
            
            <Link
              href="/"
              className="w-full inline-flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        </div>

        {/* Delivery Info */}
        <div className="mt-6 bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-[#55529d] flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-gray-900">Delivery Updates</h3>
              <p className="text-sm text-gray-600 mt-1">
                You&apos;ll receive SMS and email notifications as your order progresses.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
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