// src/app/account/orders/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import {
  ArrowLeft,
  Package,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  MapPin,
  Phone,
  Mail,
  Copy,
  Check,
  Loader2,
  Store,
  Navigation,
  Radio,
} from 'lucide-react';

interface OrderDetail {
  id: string;
  orderId: string;
  vendorName: string;
  vendorId: string;
  items: { productId: string; name: string; price: number; quantity: number; subtotal: number }[];
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  tax: number;
  total: number;
  status: string;
  paymentStatus: string;
  fulfillmentType?: 'delivery' | 'pickup';
  customerInfo: { name: string; email: string; phone: string };
  deliveryAddress?: { 
    street: string; 
    city: string; 
    state?: string;
    postalCode: string; 
    country: string; 
    instructions?: string 
  } | null;
  trackingPin: string;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  notes?: string;
  createdAt: string;
  confirmedAt?: string;
  deliveredAt?: string;
}

// Status steps for delivery orders
const deliveryStatusSteps = [
  { key: 'pending', label: 'Order Placed', icon: Clock },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
  { key: 'preparing', label: 'Preparing', icon: Package },
  { key: 'ready_for_pickup', label: 'Ready', icon: Package },
  { key: 'out_for_delivery', label: 'On the Way', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle },
];

// Status steps for pickup orders (no delivery step)
const pickupStatusSteps = [
  { key: 'pending', label: 'Order Placed', icon: Clock },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
  { key: 'preparing', label: 'Preparing', icon: Package },
  { key: 'ready_for_pickup', label: 'Ready for Pickup', icon: Store },
  { key: 'delivered', label: 'Picked Up', icon: CheckCircle },
];

const getStatusIndex = (status: string, steps: typeof deliveryStatusSteps) => {
  if (status === 'cancelled') return -1;
  // Map 'ready' to 'ready_for_pickup' and 'claimed' to 'out_for_delivery' for the progress bar
  const mappedStatus =
    status === 'ready' ? 'ready_for_pickup' :
    status === 'claimed' ? 'out_for_delivery' :
    status;
  const index = steps.findIndex((s) => s.key === mappedStatus);
  return index >= 0 ? index : 0;
};

// Statuses where live tracking should be shown for delivery orders
const TRACKABLE_STATUSES = [
  'confirmed',
  'preparing',
  'ready',
  'ready_for_pickup',
  'claimed',
  'out_for_delivery',
];

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const orderId = params.id as string;

  useEffect(() => {
    const fetchOrder = async () => {
      if (!user || !orderId) return;

      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/orders/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          router.push('/account');
          return;
        }

        const data = await res.json();
        setOrder(data);
      } catch (error) {
        console.error('Failed to fetch order:', error);
        router.push('/account');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [user, orderId, router]);

  const copyTrackingPin = () => {
    if (order?.trackingPin) {
      navigator.clipboard.writeText(order.trackingPin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#55529d]" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Order not found</p>
      </div>
    );
  }

  // Determine if this is a pickup order
  const isPickup = order.fulfillmentType === 'pickup' || (!order.deliveryAddress && order.deliveryFee === 0);
  
  // Use appropriate status steps
  const statusSteps = isPickup ? pickupStatusSteps : deliveryStatusSteps;
  const currentStatusIndex = getStatusIndex(order.status, statusSteps);
  const isCancelled = order.status === 'cancelled';
  const isDelivered = order.status === 'delivered';

  // Show live tracking button for delivery orders in trackable statuses
  const showLiveTracking = !isPickup && !isCancelled && !isDelivered && TRACKABLE_STATUSES.includes(order.status);

  // Show driver info when a driver has been assigned
  const showDriverInfo = !isPickup && order.driverId && ['claimed', 'out_for_delivery'].includes(order.status);

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Header */}
      <div className="bg-white sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link
            href="/account"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Order Header */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{order.orderId}</h1>
              <p className="text-gray-500 text-sm mt-1">{formatDate(order.createdAt)}</p>
              {/* Fulfillment Type Badge */}
              <div className="mt-2">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                  isPickup 
                    ? 'bg-purple-100 text-purple-700' 
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {isPickup ? (
                    <>
                      <Store className="w-3 h-3" />
                      Pickup Order
                    </>
                  ) : (
                    <>
                      <Truck className="w-3 h-3" />
                      Delivery
                    </>
                  )}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-2xl font-bold text-[#55529d]">${order.total.toFixed(2)}</p>
            </div>
          </div>

          {/* Vendor Info */}
          <Link 
            href={`/store/${order.vendorId}`}
            className="inline-flex items-center gap-2 text-[#55529d] hover:underline"
          >
            <Store className="w-4 h-4" />
            {order.vendorName}
          </Link>
        </div>

        {/* ══════════════════════════════════════════════════════════
            LIVE TRACKING BANNER — Phase 3+4
            Shows for delivery orders in active statuses.
            Links to /track/[orderId] which has the live map.
        ══════════════════════════════════════════════════════════ */}
        {showLiveTracking && (
          <Link
            href={`/track/${orderId}`}
            className="block bg-gradient-to-r from-[#55529d] to-[#6d6abf] rounded-2xl p-5 text-white shadow-lg hover:shadow-xl transition-shadow active:scale-[0.99]"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <div className="relative">
                  <Navigation className="w-6 h-6" />
                  {/* Pulsing dot for live indicator */}
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white/30 animate-pulse" />
                </div>
              </div>
              <div className="flex-1">
                <p className="font-bold text-lg">Track Your Order Live</p>
                <p className="text-sm text-white/80 mt-0.5">
                  {order.driverId
                    ? 'See your driver on the map in real-time'
                    : 'Follow your order status live'}
                </p>
              </div>
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <Radio className="w-4 h-4" />
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* ══════════════════════════════════════════════════════════
            DRIVER INFO CARD — Shows when driver is assigned
        ══════════════════════════════════════════════════════════ */}
        {showDriverInfo && (
          <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-emerald-100 rounded-full flex items-center justify-center">
                  <Truck className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    {order.driverName || 'Driver assigned'}
                  </p>
                  <p className="text-sm text-emerald-700">
                    {order.status === 'out_for_delivery'
                      ? 'On the way to you'
                      : 'Heading to pick up your order'}
                  </p>
                </div>
              </div>
              {order.driverPhone && (
                <a
                  href={`tel:${order.driverPhone}`}
                  className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center hover:bg-emerald-200 transition-colors"
                >
                  <Phone className="w-4 h-4 text-emerald-700" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Status Progress */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Order Status</h2>

          {isCancelled ? (
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-3 text-red-700">
                <XCircle className="w-6 h-6" />
                <div>
                  <p className="font-semibold">Order Cancelled</p>
                  <p className="text-sm text-red-600 mt-1">
                    This order has been cancelled. If you have questions, please contact support.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative">
              {/* Progress Line */}
              <div className="absolute top-5 left-5 right-5 h-1 bg-gray-200 -z-10">
                <div
                  className="h-full bg-[#55529d] transition-all duration-500"
                  style={{
                    width: `${(currentStatusIndex / (statusSteps.length - 1)) * 100}%`,
                  }}
                />
              </div>

              {/* Status Steps */}
              <div className="flex justify-between">
                {statusSteps.map((step, index) => {
                  const isCompleted = index <= currentStatusIndex;
                  const isCurrent = index === currentStatusIndex;
                  const StepIcon = step.icon;

                  return (
                    <div key={step.key} className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                          isCompleted
                            ? isCurrent
                              ? 'bg-[#55529d] text-white'
                              : 'bg-green-500 text-white'
                            : 'bg-gray-200 text-gray-400'
                        }`}
                      >
                        <StepIcon className="w-5 h-5" />
                      </div>
                      <span
                        className={`text-xs mt-2 text-center max-w-[70px] ${
                          isCompleted ? 'text-gray-900 font-medium' : 'text-gray-400'
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Tracking PIN */}
        <div className="bg-[#55529d] rounded-xl p-6 text-white">
          <h2 className="text-lg font-semibold mb-2">
            {isPickup ? 'Pickup PIN' : 'Delivery PIN'}
          </h2>
          <div className="flex items-center justify-between">
            <span className="font-mono text-3xl font-bold tracking-wider">
              {order.trackingPin}
            </span>
            <button
              onClick={copyTrackingPin}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Copy PIN"
            >
              {copied ? (
                <Check className="w-5 h-5 text-green-300" />
              ) : (
                <Copy className="w-5 h-5" />
              )}
            </button>
          </div>
          <p className="text-sm text-white/70 mt-2">
            {isPickup 
              ? 'Show this PIN when picking up your order'
              : 'Provide this PIN to your delivery driver'
            }
          </p>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h2>

          <div className="divide-y divide-gray-100">
            {order.items.map((item, index) => (
              <div key={index} className="py-3 flex justify-between">
                <div>
                  <p className="font-medium text-gray-900">{item.name}</p>
                  <p className="text-sm text-gray-500">
                    {item.quantity} × ${item.price.toFixed(2)}
                  </p>
                </div>
                <p className="font-semibold text-gray-900">${item.subtotal.toFixed(2)}</p>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-200 mt-4 pt-4 space-y-2">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>${order.subtotal.toFixed(2)}</span>
            </div>
            {!isPickup && order.deliveryFee > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Delivery Fee</span>
                <span>${order.deliveryFee.toFixed(2)}</span>
              </div>
            )}
            {order.serviceFee > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Service Fee</span>
                <span>${order.serviceFee.toFixed(2)}</span>
              </div>
            )}
            {order.tax > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Tax</span>
                <span>${order.tax.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t">
              <span>Total</span>
              <span>${order.total.toFixed(2)}</span>
            </div>
          </div>

          {order.notes && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700">Your Notes:</p>
              <p className="text-sm text-gray-600 mt-1">{order.notes}</p>
            </div>
          )}
        </div>

        {/* Delivery Address OR Pickup Info */}
        {isPickup ? (
          <div className="bg-purple-50 rounded-xl shadow-sm p-6 border border-purple-200">
            <h2 className="text-lg font-semibold text-purple-900 mb-3 flex items-center gap-2">
              <Store className="w-5 h-5" />
              Pickup Location
            </h2>
            <p className="text-purple-800 font-medium">{order.vendorName}</p>
            <p className="text-sm text-purple-600 mt-2">
              Visit the store to pick up your order. Remember to bring your Pickup PIN!
            </p>
          </div>
        ) : order.deliveryAddress ? (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Delivery Address</h2>
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-gray-900">{order.deliveryAddress.street}</p>
                <p className="text-gray-600">
                  {order.deliveryAddress.city}
                  {order.deliveryAddress.state && `, ${order.deliveryAddress.state}`}
                  {order.deliveryAddress.postalCode && ` ${order.deliveryAddress.postalCode}`}
                </p>
                <p className="text-gray-600">{order.deliveryAddress.country}</p>
                {order.deliveryAddress.instructions && (
                  <p className="text-sm text-gray-500 mt-2 italic">
                    &quot;{order.deliveryAddress.instructions}&quot;
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {/* Contact Info */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-400" />
              <span className="text-gray-700">{order.customerInfo.email}</span>
            </div>
            {order.customerInfo.phone && (
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gray-400" />
                <span className="text-gray-700">{order.customerInfo.phone}</span>
              </div>
            )}
          </div>
        </div>

        {/* Need Help */}
        <div className="bg-gray-100 rounded-xl p-6 text-center">
          <p className="text-gray-600 mb-3">Need help with your order?</p>
          <Link
            href={`https://wa.me/?text=Hi, I need help with order ${order.orderId}`}
            target="_blank"
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
          >
            <Phone className="w-4 h-4" />
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}