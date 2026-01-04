// src/app/vendor/orders/[id]/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
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
  User,
  Loader2,
  AlertCircle,
  Store,
  Copy,
  Check,
} from 'lucide-react';

interface OrderDetail {
  id: string;
  orderId: string;
  vendorName: string;
  items: { productId: string; name: string; price: number; quantity: number; subtotal: number }[];
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  tax: number;
  total: number;
  status: string;
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
  notes?: string;
  createdAt: string;
}

// Status flow for delivery orders
const deliveryStatusFlow = [
  { key: 'pending', label: 'Pending', nextAction: 'Confirm Order', nextStatus: 'confirmed' },
  { key: 'confirmed', label: 'Confirmed', nextAction: 'Start Preparing', nextStatus: 'preparing' },
  { key: 'preparing', label: 'Preparing', nextAction: 'Ready for Pickup', nextStatus: 'ready_for_pickup' },
  { key: 'ready_for_pickup', label: 'Ready', nextAction: 'Out for Delivery', nextStatus: 'out_for_delivery' },
  { key: 'out_for_delivery', label: 'Out for Delivery', nextAction: 'Mark Delivered', nextStatus: 'delivered' },
  { key: 'delivered', label: 'Delivered', nextAction: null, nextStatus: null },
  { key: 'cancelled', label: 'Cancelled', nextAction: null, nextStatus: null },
];

// Status flow for pickup orders (no delivery step)
const pickupStatusFlow = [
  { key: 'pending', label: 'Pending', nextAction: 'Confirm Order', nextStatus: 'confirmed' },
  { key: 'confirmed', label: 'Confirmed', nextAction: 'Start Preparing', nextStatus: 'preparing' },
  { key: 'preparing', label: 'Preparing', nextAction: 'Ready for Pickup', nextStatus: 'ready_for_pickup' },
  { key: 'ready_for_pickup', label: 'Ready for Pickup', nextAction: 'Customer Picked Up', nextStatus: 'delivered' },
  { key: 'delivered', label: 'Picked Up', nextAction: null, nextStatus: null },
  { key: 'cancelled', label: 'Cancelled', nextAction: null, nextStatus: null },
];

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  preparing: 'bg-orange-100 text-orange-800',
  ready_for_pickup: 'bg-purple-100 text-purple-800',
  out_for_delivery: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function VendorOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [copied, setCopied] = useState(false);

  const orderId = params.id as string;

  const fetchOrder = useCallback(async () => {
    if (!user || !orderId) return;

    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        router.push('/vendor/orders');
        return;
      }

      const data = await res.json();
      setOrder(data);
    } catch (error) {
      console.error('Failed to fetch order:', error);
    } finally {
      setLoading(false);
    }
  }, [user, orderId, router]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const updateStatus = async (newStatus: string) => {
    if (!user || !order) return;

    setUpdating(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setOrder({ ...order, status: newStatus });
        setShowCancelConfirm(false);
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const copyPin = () => {
    if (order?.trackingPin) {
      navigator.clipboard.writeText(order.trackingPin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#55529d]" />
      </div>
    );
  }

  if (!order) return null;

  // Determine if this is a pickup order
  const isPickup = order.fulfillmentType === 'pickup' || (!order.deliveryAddress && order.deliveryFee === 0);
  
  // Use appropriate status flow
  const statusFlow = isPickup ? pickupStatusFlow : deliveryStatusFlow;
  const currentStatusInfo = statusFlow.find((s) => s.key === order.status);
  const canUpdateStatus = currentStatusInfo?.nextStatus !== null;
  const isCompleted = ['delivered', 'cancelled'].includes(order.status);

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        href="/vendor/orders"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Orders
      </Link>

      {/* Order Header */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{order.orderId}</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusColors[order.status]}`}>
                {currentStatusInfo?.label || order.status}
              </span>
            </div>
            <p className="text-gray-500">{formatDate(order.createdAt)}</p>
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
                    Customer Pickup
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
            <p className="text-3xl font-bold text-[#55529d]">${order.total.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {!isCompleted && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Update Order Status</h2>
          
          <div className="flex flex-wrap gap-3">
            {canUpdateStatus && currentStatusInfo?.nextAction && (
              <button
                onClick={() => updateStatus(currentStatusInfo.nextStatus!)}
                disabled={updating}
                className="flex-1 min-w-[200px] bg-[#55529d] text-white py-4 px-6 rounded-xl font-semibold hover:bg-[#444287] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {updating ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    {currentStatusInfo.nextAction}
                  </>
                )}
              </button>
            )}

            {order.status !== 'cancelled' && order.status !== 'delivered' && (
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="px-6 py-4 border border-red-200 text-red-600 rounded-xl font-semibold hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
              >
                <XCircle className="w-5 h-5" />
                Cancel Order
              </button>
            )}
          </div>

          {/* Cancel Confirmation */}
          {showCancelConfirm && (
            <div className="mt-4 p-4 bg-red-50 rounded-xl border border-red-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-red-800 font-medium">Cancel this order?</p>
                  <p className="text-red-600 text-sm mt-1">
                    This action cannot be undone. The customer will be notified.
                  </p>
                  <div className="flex gap-3 mt-3">
                    <button
                      onClick={() => updateStatus('cancelled')}
                      disabled={updating}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
                    >
                      {updating ? 'Cancelling...' : 'Yes, Cancel Order'}
                    </button>
                    <button
                      onClick={() => setShowCancelConfirm(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-white"
                    >
                      No, Keep It
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Status Progress */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Progress</h2>
        
        <div className="flex items-center justify-between">
          {statusFlow
            .filter((s) => s.key !== 'cancelled')
            .map((step, index, filteredSteps) => {
              const stepIndex = statusFlow.findIndex((s) => s.key === step.key);
              const currentIndex = statusFlow.findIndex((s) => s.key === order.status);
              const isActive = stepIndex <= currentIndex && order.status !== 'cancelled';
              const isCurrent = step.key === order.status;
              const isLast = index === filteredSteps.length - 1;

              return (
                <div key={step.key} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isActive
                          ? isCurrent
                            ? 'bg-[#55529d] text-white'
                            : 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-400'
                      }`}
                    >
                      {isActive && !isCurrent ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <span className="text-sm font-bold">{index + 1}</span>
                      )}
                    </div>
                    <span className={`text-xs mt-2 text-center max-w-[80px] ${
                      isActive ? 'text-gray-900 font-medium' : 'text-gray-400'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                  {!isLast && (
                    <div className={`flex-1 h-1 mx-2 ${
                      stepIndex < currentIndex ? 'bg-green-500' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              );
            })}
        </div>

        {order.status === 'cancelled' && (
          <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center gap-2 text-red-700">
              <XCircle className="w-5 h-5" />
              <span className="font-medium">This order has been cancelled</span>
            </div>
          </div>
        )}
      </div>

      {/* Order Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Items */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h2>
          
          <div className="divide-y divide-gray-100">
            {order.items.map((item, index) => (
              <div key={index} className="py-3 flex justify-between">
                <div>
                  <p className="font-medium text-gray-900">{item.name}</p>
                  <p className="text-sm text-gray-500">Qty: {item.quantity} × ${item.price.toFixed(2)}</p>
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
            <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm font-medium text-yellow-800">Customer Notes:</p>
              <p className="text-sm text-yellow-700 mt-1">{order.notes}</p>
            </div>
          )}
        </div>

        {/* Customer Info & Address/Pickup */}
        <div className="space-y-6">
          {/* Customer Info */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h2>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-gray-400" />
                <span className="text-gray-900">{order.customerInfo.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gray-400" />
                <a href={`tel:${order.customerInfo.phone}`} className="text-[#55529d] hover:underline">
                  {order.customerInfo.phone}
                </a>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-400" />
                <a href={`mailto:${order.customerInfo.email}`} className="text-[#55529d] hover:underline">
                  {order.customerInfo.email}
                </a>
              </div>
            </div>
          </div>

          {/* Delivery Address OR Pickup Notice */}
          {isPickup ? (
            <div className="bg-purple-50 rounded-xl shadow-sm p-6 border border-purple-200">
              <h2 className="text-lg font-semibold text-purple-900 mb-4 flex items-center gap-2">
                <Store className="w-5 h-5" />
                Pickup Order
              </h2>
              <p className="text-purple-700">
                Customer will pick up this order from your location.
              </p>
              <p className="text-sm text-purple-600 mt-2">
                Verify the customer&apos;s Delivery PIN before handing over the order.
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
          ) : (
            <div className="bg-gray-50 rounded-xl shadow-sm p-6 border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-700 mb-2">No Delivery Address</h2>
              <p className="text-gray-500 text-sm">
                This order does not have a delivery address on file.
              </p>
            </div>
          )}

          {/* Tracking PIN */}
          <div className="bg-[#55529d] rounded-xl p-6 text-white">
            <h2 className="text-lg font-semibold mb-2">
              {isPickup ? 'Pickup Verification PIN' : 'Delivery PIN'}
            </h2>
            <div className="flex items-center gap-3">
              <p className="font-mono text-4xl font-bold tracking-wider">
                {order.trackingPin}
              </p>
              <button
                onClick={copyPin}
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
                ? 'Ask customer for this PIN before handing over the order'
                : 'Driver must collect this PIN from customer upon delivery'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}