// src/app/checkout/success/page.tsx
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { 
  CheckCircle, 
  Package, 
  MapPin, 
  Copy, 
  Check, 
  Loader2, 
  ArrowRight,
  ShoppingBag,
  Calendar,
  CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

// Detailed Order Interface based on your system's structure
interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface OrderDetails {
  orderId: string;
  trackingPin: string;
  vendorName: string;
  total: number;
  subtotal?: number;
  tax?: number;
  deliveryFee?: number;
  status: string;
  items: OrderItem[];
  customerInfo?: {
    email: string;
    name: string;
  };
  deliveryAddress?: {
    street: string;
    city: string;
    country: string;
  };
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { clearCart } = useCart();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (!sessionId) {
      router.push('/');
      return;
    }

    const initPage = async () => {
      try {
        // 1. Clear the cart immediately
        clearCart();

        // 2. Fetch full order details using the confirm endpoint
        // This endpoint typically returns the full order object including items
        const response = await fetch('/api/orders/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });

        if (!response.ok) {
          throw new Error('Failed to retrieve order details');
        }

        const data = await response.json();
        setOrder(data.order);
      } catch (err) {
        console.error('Error fetching order:', err);
        // Fallback or error state - though we still show success if we can't load details
        setError('Order confirmed, but details could not be loaded.');
      } finally {
        setLoading(false);
      }
    };

    initPage();
  }, [sessionId, clearCart, router]);

  const copyTrackingPin = () => {
    if (order?.trackingPin) {
      navigator.clipboard.writeText(order.trackingPin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#55529d]" />
        <p className="text-gray-500 font-medium">Finalizing your order...</p>
      </div>
    );
  }

  // If we have no order data but payment succeeded (rare edge case)
  if (!order && error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Received</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={() => router.push('/')}>Return Home</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Success Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Order Confirmed!</h1>
          <p className="text-lg text-gray-600 mt-2">
            Thank you for your purchase, {order?.customerInfo?.name?.split(' ')[0]}.
          </p>
          <p className="text-sm text-gray-500">
            A confirmation email has been sent to {order?.customerInfo?.email}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: Actions & Tracking (Larger width) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Delivery/PIN Card */}
            <Card className="border-t-4 border-t-[#55529d]">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Order #{order?.orderId}</h2>
                  <p className="text-gray-500 text-sm flex items-center gap-1 mt-1">
                    <ShoppingBag className="w-4 h-4" />
                    Sold by {order?.vendorName}
                  </p>
                </div>
                <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium border border-green-200">
                  Payment Successful
                </div>
              </div>

              {/* PIN Section */}
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                  <div className="text-center sm:text-left">
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Secure Delivery PIN</p>
                    <p className="text-xs text-gray-400 mt-1">Share this with your driver upon delivery</p>
                  </div>
                  <div className="flex items-center gap-3 bg-white p-2 pr-4 rounded-lg border border-gray-200 shadow-sm">
                    <div className="bg-[#55529d]/10 p-2 rounded-md">
                      <MapPin className="w-5 h-5 text-[#55529d]" />
                    </div>
                    <span className="font-mono text-2xl font-bold text-gray-900 tracking-widest">
                      {order?.trackingPin || '****'}
                    </span>
                    <button
                      onClick={copyTrackingPin}
                      className="ml-2 p-2 hover:bg-gray-100 rounded-full transition-colors"
                      title="Copy PIN"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Delivery Info */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    Delivery Address
                  </h3>
                  <div className="text-sm text-gray-600 pl-6">
                    {order?.deliveryAddress ? (
                      <>
                        <p>{order.deliveryAddress.street}</p>
                        <p>{order.deliveryAddress.city}, {order.deliveryAddress.country}</p>
                      </>
                    ) : (
                      <p className="italic text-gray-400">Standard Delivery</p>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    Estimated Time
                  </h3>
                  <div className="text-sm text-gray-600 pl-6">
                    <p>30 - 45 Minutes</p>
                    <p className="text-xs text-gray-400">Depends on traffic & preparation</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link href="/account/orders" className="w-full">
                <Button className="w-full justify-center py-6" size="lg">
                  <Package className="w-5 h-5 mr-2" />
                  Track Order
                </Button>
              </Link>
              <Link href="/" className="w-full">
                <Button variant="secondary" className="w-full justify-center py-6" size="lg">
                  Continue Shopping
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>

          {/* RIGHT COLUMN: Order Summary/Receipt */}
          <div className="lg:col-span-5">
            <Card className="bg-gray-50/50 sticky top-8" padding="lg">
              <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-gray-400" />
                Order Summary
              </h3>

              {/* Items List */}
              <div className="space-y-4 mb-6">
                {order?.items?.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start text-sm">
                    <div className="flex gap-3">
                      <span className="font-medium text-gray-500 w-6 tabular-nums">
                        {item.quantity}x
                      </span>
                      <span className="text-gray-700 font-medium line-clamp-2">
                        {item.name}
                      </span>
                    </div>
                    <span className="text-gray-900 font-semibold whitespace-nowrap ml-4">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Totals Divider */}
              <div className="border-t border-gray-200 my-4"></div>

              {/* Breakdown */}
              <div className="space-y-2 text-sm">
                {order?.subtotal && (
                  <div className="flex justify-between text-gray-500">
                    <span>Subtotal</span>
                    <span>${order.subtotal.toFixed(2)}</span>
                  </div>
                )}
                {order?.deliveryFee !== undefined && (
                  <div className="flex justify-between text-gray-500">
                    <span>Delivery Fee</span>
                    <span>${order.deliveryFee.toFixed(2)}</span>
                  </div>
                )}
                {order?.tax !== undefined && (
                  <div className="flex justify-between text-gray-500">
                    <span>Tax</span>
                    <span>${order.tax.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center text-base font-bold text-gray-900 pt-2 mt-2 border-t border-gray-200">
                  <span>Total Paid</span>
                  <span className="text-xl text-[#55529d]">
                    ${order?.total ? order.total.toFixed(2) : '0.00'}
                  </span>
                </div>
              </div>
            </Card>
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