// src/components/orders/OrderConfirmationClient.tsx
'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { LiveDeliveryMap } from '@/components/tracking/LiveDeliveryMap';
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
  CreditCard,
  Store,
  Navigation,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

// ─── Types ────────────────────────────────────────────────────────────────────
interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  /** Firestore document ID */
  docId: string;
  orderId: string;
  trackingPin?: string;
  vendorName?: string;
  vendorId?: string;
  vendorCoordinates?: { lat: number; lng: number };
  total: number;
  subtotal?: number;
  tax?: number;
  deliveryFee?: number;
  status?: string;
  driverId?: string;
  driverName?: string;
  driverLocation?: { lat: number; lng: number };
  customerInfo?: {
    name?: string;
    email?: string;
  };
  deliveryAddress?: {
    street: string;
    city: string;
    country: string;
    coordinates?: { lat: number; lng: number };
  };
  items: OrderItem[];
  fulfillmentType?: string;
}

// Statuses where the live map is most useful
const LIVE_MAP_STATUSES = [
  'confirmed',
  'preparing',
  'ready',
  'claimed',
  'out_for_delivery',
];

export default function OrderConfirmationClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session_id');
  const orderIdParam = searchParams.get('order_id');

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Track whether we've started the real-time listener
  const realtimeStarted = useRef(false);

  // ── Step 1: Fetch order details from confirm endpoint ───────────────────
  useEffect(() => {
    if (!sessionId && !orderIdParam) {
      setError('Missing order reference');
      setLoading(false);
      return;
    }

    async function fetchOrder() {
      try {
        const res = await fetch('/api/orders/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, orderId: orderIdParam }),
        });

        if (!res.ok) throw new Error('Failed to load order');

        const data = await res.json();
        setOrder(data.order);
      } catch (err) {
        console.error(err);
        if (orderIdParam) {
          setError('Order confirmed, but details could not be loaded.');
        } else {
          setError('Unable to load order details');
        }
      } finally {
        setLoading(false);
      }
    }

    fetchOrder();
  }, [sessionId, orderIdParam]);

  // ── Step 2: Once we have the order docId, subscribe to real-time updates ─
  useEffect(() => {
    if (!order?.docId || realtimeStarted.current) return;
    realtimeStarted.current = true;

    const unsubscribe = onSnapshot(
      doc(db, 'orders', order.docId),
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();

        // Merge real-time fields into existing order state
        setOrder((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            status: data.status || prev.status,
            driverId: data.driverId || prev.driverId,
            driverName: data.driverName || prev.driverName,
            driverLocation: data.driverLocation || prev.driverLocation,
            vendorCoordinates: data.vendorCoordinates || prev.vendorCoordinates,
            deliveryAddress: {
              ...prev.deliveryAddress,
              ...data.deliveryAddress,
            } as Order['deliveryAddress'],
          };
        });
      },
      (err) => {
        console.error('Real-time order listener error:', err);
      }
    );

    return () => unsubscribe();
  }, [order?.docId]);

  // ── Copy PIN helper ─────────────────────────────────────────────────────
  const copyTrackingPin = () => {
    if (order?.trackingPin) {
      navigator.clipboard.writeText(order.trackingPin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ── Loading state ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#55529d]" />
        <p className="text-gray-500 font-medium">Finalizing your order...</p>
      </div>
    );
  }

  // ── Error state (no order data) ─────────────────────────────────────────
  if (error && !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={() => router.push('/')} className="w-full">
            Return Home
          </Button>
        </Card>
      </div>
    );
  }

  // ── Derived state ───────────────────────────────────────────────────────
  const isPickup = order?.fulfillmentType === 'pickup';
  const showLiveMap =
    !isPickup &&
    order?.docId &&
    LIVE_MAP_STATUSES.includes(order?.status || '');
  const hasDriver = !!order?.driverId;
  const isDelivered = order?.status === 'delivered';

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 pb-24">
      <div className="max-w-6xl mx-auto">
        {/* ── Success Header ────────────────────────────────────────────── */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4 shadow-sm">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Order Confirmed!</h1>
          <p className="text-lg text-gray-600 mt-2">
            Thank you for your purchase
            {order?.customerInfo?.name ? `, ${order.customerInfo.name.split(' ')[0]}` : ''}.
          </p>
          {order?.customerInfo?.email && (
            <p className="text-sm text-gray-500 mt-1">
              A confirmation email has been sent to {order.customerInfo.email}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          {/* ── LEFT COLUMN ─────────────────────────────────────────────── */}
          <div className="lg:col-span-7 space-y-6">
            {/* ══ LIVE MAP ══════════════════════════════════════════════ */}
            {showLiveMap && order?.docId && (
              <LiveDeliveryMap
                orderDocId={order.docId}
                vendorCoordinates={order.vendorCoordinates}
                deliveryCoordinates={order.deliveryAddress?.coordinates}
                vendorName={order.vendorName}
                initialStatus={order.status}
                compact
              />
            )}

            {/* ══ Full-page tracking CTA (when driver assigned) ════════ */}
            {hasDriver && !isDelivered && order?.docId && (
              <Link
                href={`/track/${order.docId}`}
                className="flex items-center justify-between gap-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white rounded-2xl p-4 shadow-lg transition-all active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <Navigation className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Open Full Tracking</p>
                    <p className="text-xs text-emerald-100">
                      {order.status === 'out_for_delivery'
                        ? `${order.driverName || 'Driver'} is on the way`
                        : `${order.driverName || 'Driver'} is picking up your order`}
                    </p>
                  </div>
                </div>
                <ExternalLink className="w-5 h-5 text-emerald-100" />
              </Link>
            )}

            {/* ══ Order & PIN Card ═══════════════════════════════════════ */}
            <Card className="border-t-4 border-t-[#55529d] overflow-hidden">
              <div className="p-5 sm:p-6">
                {/* Order ID + vendor */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      Order #{order?.orderId}
                    </h2>
                    {order?.vendorName && (
                      <p className="text-gray-500 text-sm flex items-center gap-1 mt-1">
                        <Store className="w-4 h-4" />
                        Sold by{' '}
                        <span className="font-medium text-[#55529d]">
                          {order.vendorName}
                        </span>
                      </p>
                    )}
                  </div>
                  <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium border border-green-200 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Paid Successfully
                  </div>
                </div>

                {/* PIN Section */}
                {order?.trackingPin && (
                  <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 mb-6">
                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                      <div className="text-center sm:text-left">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                          Secure Delivery PIN
                        </p>
                        <p className="text-sm text-gray-600">
                          Share this with your driver upon delivery
                        </p>
                      </div>
                      <div className="flex items-center gap-3 bg-white p-2 pr-4 rounded-lg border border-gray-200 shadow-sm">
                        <div className="bg-[#55529d]/10 p-2 rounded-md">
                          <MapPin className="w-5 h-5 text-[#55529d]" />
                        </div>
                        <span className="font-mono text-3xl font-bold text-gray-900 tracking-widest">
                          {order.trackingPin}
                        </span>
                        <button
                          onClick={copyTrackingPin}
                          className="ml-2 p-2 hover:bg-gray-100 rounded-full transition-colors active:scale-95"
                          title="Copy PIN"
                        >
                          {copied ? (
                            <Check className="w-5 h-5 text-green-600" />
                          ) : (
                            <Copy className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Delivery Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      Delivery Address
                    </h3>
                    <div className="text-sm text-gray-600 pl-6 border-l-2 border-gray-100">
                      {order?.deliveryAddress ? (
                        <>
                          <p className="font-medium text-gray-900">
                            {order.deliveryAddress.street}
                          </p>
                          <p>
                            {order.deliveryAddress.city}, {order.deliveryAddress.country}
                          </p>
                        </>
                      ) : (
                        <p className="italic text-gray-400">
                          {isPickup ? 'Pickup Order' : 'Digital / Standard Delivery'}
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      Estimated Time
                    </h3>
                    <div className="text-sm text-gray-600 pl-6 border-l-2 border-gray-100">
                      <p className="font-medium text-gray-900">30 – 45 Minutes</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Depends on traffic &amp; preparation
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* ══ Action Buttons ════════════════════════════════════════ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link
                href={order?.docId ? `/account/orders/${order.docId}` : '/account/orders'}
                className="w-full"
              >
                <Button className="w-full justify-center py-6 text-base" size="lg">
                  <Package className="w-5 h-5 mr-2" />
                  View Order Details
                </Button>
              </Link>
              <Link href="/" className="w-full">
                <Button
                  variant="secondary"
                  className="w-full justify-center py-6 text-base"
                  size="lg"
                >
                  Continue Shopping
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>

          {/* ── RIGHT COLUMN: Receipt ───────────────────────────────────── */}
          <div className="lg:col-span-5">
            <Card
              className="bg-gray-50/50 sticky top-8 h-fit border-gray-200"
              padding="lg"
            >
              <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2 pb-4 border-b border-gray-200">
                <CreditCard className="w-5 h-5 text-gray-500" />
                Receipt Summary
              </h3>

              {/* Items */}
              <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto pr-2">
                {order?.items?.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-start text-sm"
                  >
                    <div className="flex gap-3">
                      <span className="font-medium text-gray-500 w-6 tabular-nums pt-0.5">
                        {item.quantity}x
                      </span>
                      <span className="text-gray-700 font-medium">
                        {item.name}
                      </span>
                    </div>
                    <span className="text-gray-900 font-semibold whitespace-nowrap ml-4">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-3 text-sm border-t border-gray-200 pt-4">
                {order?.subtotal !== undefined && (
                  <div className="flex justify-between text-gray-500">
                    <span>Subtotal</span>
                    <span>${order.subtotal.toFixed(2)}</span>
                  </div>
                )}
                {order?.deliveryFee !== undefined && order.deliveryFee > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>Delivery Fee</span>
                    <span>${order.deliveryFee.toFixed(2)}</span>
                  </div>
                )}
                {order?.tax !== undefined && order.tax > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>Tax</span>
                    <span>${order.tax.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-base font-bold text-gray-900 pt-4 border-t border-dashed border-gray-300 mt-4">
                  <span>Total Paid</span>
                  <span className="text-2xl text-[#55529d]">
                    ${order?.total?.toFixed(2) || '0.00'}
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