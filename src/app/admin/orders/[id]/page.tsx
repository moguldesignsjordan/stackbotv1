// src/app/admin/orders/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import {
  ArrowLeft,
  Package,
  User,
  MapPin,
  Phone,
  Mail,
  Store,
  Calendar,
  DollarSign,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  ChevronRight,
} from 'lucide-react';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  image?: string;
  images?: string[];
}

interface CustomerInfo {
  name: string;
  email: string;
  phone?: string;
}

interface DeliveryAddress {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

interface Order {
  id: string;
  orderId: string;
  vendorId: string;
  vendorName: string;
  vendorSlug?: string;
  customerId: string;
  customerInfo: CustomerInfo;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  tax: number;
  total: number;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  deliveryMethod: 'pickup' | 'delivery';
  deliveryAddress?: DeliveryAddress;
  specialInstructions?: string;
  createdAt: string;
  updatedAt: string;
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  pending: { 
    label: 'Pending', 
    color: 'text-yellow-700', 
    bgColor: 'bg-yellow-100',
    icon: Clock
  },
  confirmed: { 
    label: 'Confirmed', 
    color: 'text-blue-700', 
    bgColor: 'bg-blue-100',
    icon: CheckCircle
  },
  preparing: { 
    label: 'Preparing', 
    color: 'text-orange-700', 
    bgColor: 'bg-orange-100',
    icon: Package
  },
  ready_for_pickup: { 
    label: 'Ready for Pickup', 
    color: 'text-purple-700', 
    bgColor: 'bg-purple-100',
    icon: Package
  },
  out_for_delivery: { 
    label: 'Out for Delivery', 
    color: 'text-indigo-700', 
    bgColor: 'bg-indigo-100',
    icon: Truck
  },
  delivered: { 
    label: 'Delivered', 
    color: 'text-green-700', 
    bgColor: 'bg-green-100',
    icon: CheckCircle
  },
  cancelled: { 
    label: 'Cancelled', 
    color: 'text-red-700', 
    bgColor: 'bg-red-100',
    icon: XCircle
  },
};

const statusFlow = ['pending', 'confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery', 'delivered'];

export default function AdminOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const orderId = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = async () => {
    if (!user) return;

    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch order');
      }

      const data = await res.json();
      setOrder(data);
    } catch (err) {
      console.error('Error fetching order:', err);
      setError('Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (newStatus: string) => {
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

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update status');
      }

      const data = await res.json();
      setOrder({ ...order, status: newStatus, updatedAt: new Date().toISOString() });
    } catch (err) {
      console.error('Error updating status:', err);
      alert(err instanceof Error ? err.message : 'Failed to update order status');
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [user, orderId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getNextStatus = (currentStatus: string): string | null => {
    if (currentStatus === 'cancelled' || currentStatus === 'delivered') return null;
    const currentIndex = statusFlow.indexOf(currentStatus);
    if (currentIndex === -1 || currentIndex === statusFlow.length - 1) return null;
    return statusFlow[currentIndex + 1];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#55529d]" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="py-12 text-center">
        <p className="text-red-600 mb-4">{error || 'Order not found'}</p>
        <Link href="/admin/orders" className="text-[#55529d] hover:underline">
          ← Back to Orders
        </Link>
      </div>
    );
  }

  const status = statusConfig[order.status] || statusConfig.pending;
  const StatusIcon = status.icon;
  const nextStatus = getNextStatus(order.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/orders"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Order Details</h1>
            <p className="text-sm text-gray-500 mt-1">
              Order ID: <span className="font-mono font-semibold text-[#55529d]">{order.orderId}</span>
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl ${status.bgColor}`}>
          <StatusIcon className={`w-5 h-5 ${status.color}`} />
          <span className={`font-semibold ${status.color}`}>{status.label}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h2>
            <div className="space-y-4">
              {order.items.map((item, index) => {
                const imageUrl = item.images?.[0] || item.image;
                
                return (
                  <div key={`${item.id}-${index}`} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                        <Package className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{item.name}</h3>
                      <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">${item.price.toFixed(2)}</p>
                      <p className="text-sm text-gray-500">each</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Order Summary */}
            <div className="mt-6 pt-6 border-t space-y-2">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>${order.subtotal.toFixed(2)}</span>
              </div>
              {order.deliveryFee > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Delivery Fee</span>
                  <span>${order.deliveryFee.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>Tax</span>
                <span>${order.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t">
                <span>Total</span>
                <span>${order.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Delivery Info */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {order.deliveryMethod === 'delivery' ? 'Delivery' : 'Pickup'} Information
            </h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                {order.deliveryMethod === 'delivery' ? (
                  <Truck className="w-5 h-5 text-gray-400 mt-0.5" />
                ) : (
                  <Store className="w-5 h-5 text-gray-400 mt-0.5" />
                )}
                <div>
                  <p className="font-medium text-gray-900">
                    {order.deliveryMethod === 'delivery' ? 'Delivery Address' : 'Pickup Location'}
                  </p>
                  {order.deliveryMethod === 'delivery' && order.deliveryAddress ? (
                    <div className="text-sm text-gray-600 mt-1">
                      {order.deliveryAddress.street && <p>{order.deliveryAddress.street}</p>}
                      <p>
                        {order.deliveryAddress.city}
                        {order.deliveryAddress.state && `, ${order.deliveryAddress.state}`}
                        {order.deliveryAddress.zip && ` ${order.deliveryAddress.zip}`}
                      </p>
                      {order.deliveryAddress.country && <p>{order.deliveryAddress.country}</p>}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600 mt-1">{order.vendorName}</p>
                  )}
                </div>
              </div>

              {order.specialInstructions && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Special Instructions</p>
                    <p className="text-sm text-gray-600 mt-1">{order.specialInstructions}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Actions */}
          {nextStatus && order.status !== 'cancelled' && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Update Status</h2>
              <button
                onClick={() => updateOrderStatus(nextStatus)}
                disabled={updating}
                className="w-full bg-[#55529d] text-white py-3 rounded-lg hover:bg-[#444287] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
              >
                {updating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <ChevronRight className="w-4 h-4" />
                    Move to {statusConfig[nextStatus]?.label}
                  </>
                )}
              </button>

              {order.status !== 'cancelled' && (
                <button
                  onClick={() => updateOrderStatus('cancelled')}
                  disabled={updating}
                  className="w-full mt-3 bg-red-100 text-red-700 py-3 rounded-lg hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  Cancel Order
                </button>
              )}
            </div>
          )}

          {/* Vendor Info */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Vendor</h2>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Store className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{order.vendorName}</p>
                {order.vendorSlug && (
                  <Link
                    href={`/vendors/${order.vendorSlug}`}
                    className="text-sm text-[#55529d] hover:underline"
                  >
                    View Storefront →
                  </Link>
                )}
              </div>
            </div>
            <Link
              href={`/admin/vendors/${order.vendorId}`}
              className="block w-full text-center py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium"
            >
              View Vendor Details
            </Link>
          </div>

          {/* Customer Info */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <User className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="font-medium text-gray-900">{order.customerInfo.name}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium text-gray-900">{order.customerInfo.email}</p>
                </div>
              </div>
              {order.customerInfo.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="font-medium text-gray-900">{order.customerInfo.phone}</p>
                  </div>
                </div>
              )}
            </div>
            <Link
              href={`/admin/customers/${order.customerId}`}
              className="block w-full text-center py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium mt-4"
            >
              View Customer Profile
            </Link>
          </div>

          {/* Payment Info */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <DollarSign className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Method</p>
                  <p className="font-medium text-gray-900 capitalize">{order.paymentMethod}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className="font-medium text-gray-900 capitalize">{order.paymentStatus}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Placed</p>
                  <p className="font-medium text-gray-900 text-sm">{formatDate(order.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Last Updated</p>
                  <p className="font-medium text-gray-900 text-sm">{formatDate(order.updatedAt)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}