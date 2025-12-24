// src/app/vendor/orders/[id]/page.tsx
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
  User,
  Loader2,
  AlertCircle,
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
  customerInfo: { name: string; email: string; phone: string };
  deliveryAddress: { street: string; city: string; postalCode: string; country: string; instructions?: string };
  trackingPin: string;
  notes?: string;
  createdAt: string;
}

const statusFlow = [
  { key: 'pending', label: 'Pending', nextAction: 'Confirm Order', nextStatus: 'confirmed' },
  { key: 'confirmed', label: 'Confirmed', nextAction: 'Start Preparing', nextStatus: 'preparing' },
  { key: 'preparing', label: 'Preparing', nextAction: 'Ready for Pickup', nextStatus: 'ready_for_pickup' },
  { key: 'ready_for_pickup', label: 'Ready', nextAction: 'Out for Delivery', nextStatus: 'out_for_delivery' },
  { key: 'out_for_delivery', label: 'Out for Delivery', nextAction: 'Mark Delivered', nextStatus: 'delivered' },
  { key: 'delivered', label: 'Delivered', nextAction: null, nextStatus: null },
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

  const orderId = params.id as string;

  const fetchOrder = async () => {
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
  };

  useEffect(() => {
    fetchOrder();
  }, [user, orderId]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#55529d]" />
      </div>
    );
  }

  if (!order) return null;

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
                {currentStatusInfo?.label}
              </span>
            </div>
            <p className="text-gray-500">{formatDate(order.createdAt)}</p>
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
                className="px-6 py-4 border-2 border-red-300 text-red-600 rounded-xl font-semibold hover:bg-red-50 transition-colors"
              >
                Cancel Order
              </button>
            )}
          </div>

          {/* Cancel Confirmation */}
          {showCancelConfirm && (
            <div className="mt-4 p-4 bg-red-50 rounded-xl border border-red-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-red-800">Cancel this order?</p>
                  <p className="text-sm text-red-600 mt-1">
                    This action cannot be undone. The customer will be notified.
                  </p>
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => updateStatus('cancelled')}
                      disabled={updating}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
                    >
                      {updating ? 'Cancelling...' : 'Yes, Cancel Order'}
                    </button>
                    <button
                      onClick={() => setShowCancelConfirm(false)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
                    >
                      No, Keep Order
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Order Items */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h2>
          <div className="divide-y divide-gray-100">
            {order.items.map((item, index) => (
              <div key={index} className="py-3 flex justify-between">
                <div>
                  <p className="font-medium text-gray-900">{item.name}</p>
                  <p className="text-sm text-gray-500">
                    ${item.price.toFixed(2)} × {item.quantity}
                  </p>
                </div>
                <p className="font-semibold text-gray-900">${item.subtotal.toFixed(2)}</p>
              </div>
            ))}
          </div>

          {/* Order Notes */}
          {order.notes && (
            <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="font-medium text-yellow-800 mb-1">Customer Note:</p>
              <p className="text-yellow-700">{order.notes}</p>
            </div>
          )}

          {/* Totals */}
          <div className="border-t border-gray-200 mt-4 pt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span>${order.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Delivery Fee</span>
              <span>${order.deliveryFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Service Fee</span>
              <span>${order.serviceFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tax</span>
              <span>${order.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-base pt-2 border-t">
              <span>Total</span>
              <span className="text-[#55529d]">${order.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Customer & Delivery Info */}
        <div className="space-y-6">
          {/* Customer */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-gray-400" />
                <span className="font-medium">{order.customerInfo.name}</span>
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

          {/* Delivery Address */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Delivery Address</h2>
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-gray-900">{order.deliveryAddress.street}</p>
                <p className="text-gray-600">
                  {order.deliveryAddress.city}, {order.deliveryAddress.postalCode}
                </p>
                <p className="text-gray-600">{order.deliveryAddress.country}</p>
                {order.deliveryAddress.instructions && (
                  <p className="text-sm text-gray-500 mt-2 italic">
                    "{order.deliveryAddress.instructions}"
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Tracking PIN */}
          <div className="bg-[#55529d] rounded-xl p-6 text-white">
            <h2 className="text-lg font-semibold mb-2">Delivery PIN</h2>
            <p className="font-mono text-4xl font-bold tracking-wider">
              {order.trackingPin}
            </p>
            <p className="text-sm text-white/70 mt-2">
              Driver must collect this PIN from customer upon delivery
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}