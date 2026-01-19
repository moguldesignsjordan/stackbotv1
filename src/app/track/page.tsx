'use client';

import { useState } from 'react';
import { 
  Search, 
  Package, 
  CheckCircle, 
  Truck, 
  Store, 
  MapPin,
  Phone,
  ChefHat,
  XCircle,
  ArrowRight,
  RefreshCw,
  Loader2,
  ShoppingBag,
  Copy,
  Check
} from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  image?: string;
  notes?: string;
}

interface Order {
  id: string;
  orderId: string;
  trackingPin: string;
  vendorId: string;
  vendorName: string;
  vendorSlug?: string;
  vendorPhone?: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  tax: number;
  total: number;
  status: string;
  deliveryMethod: 'pickup' | 'delivery';
  deliveryAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  estimatedTime?: string;
  createdAt: string;
  confirmedAt?: string;
  preparingAt?: string;
  readyAt?: string;
  outForDeliveryAt?: string;
  deliveredAt?: string;
  pickedUpAt?: string;
  cancelledAt?: string;
}

// Status step keys for delivery orders
const deliveryStatusKeys = [
  { key: 'pending', labelKey: 'track.step.orderPlaced', icon: ShoppingBag },
  { key: 'confirmed', labelKey: 'track.step.confirmed', icon: CheckCircle },
  { key: 'preparing', labelKey: 'track.step.preparing', icon: ChefHat },
  { key: 'ready', labelKey: 'track.step.ready', icon: Package },
  { key: 'out_for_delivery', labelKey: 'track.step.onTheWay', icon: Truck },
  { key: 'delivered', labelKey: 'track.step.delivered', icon: CheckCircle },
];

// Status step keys for pickup orders
const pickupStatusKeys = [
  { key: 'pending', labelKey: 'track.step.orderPlaced', icon: ShoppingBag },
  { key: 'confirmed', labelKey: 'track.step.confirmed', icon: CheckCircle },
  { key: 'preparing', labelKey: 'track.step.preparing', icon: ChefHat },
  { key: 'ready', labelKey: 'track.step.readyForPickup', icon: Package },
  { key: 'picked_up', labelKey: 'track.step.pickedUp', icon: CheckCircle },
];

// Status message keys mapping
const statusMessageKeys: Record<string, { titleKey: string; descKey: string; color: string }> = {
  pending: {
    titleKey: 'track.status.pending.title',
    descKey: 'track.status.pending.description',
    color: 'text-yellow-600',
  },
  confirmed: {
    titleKey: 'track.status.confirmed.title',
    descKey: 'track.status.confirmed.description',
    color: 'text-blue-600',
  },
  preparing: {
    titleKey: 'track.status.preparing.title',
    descKey: 'track.status.preparing.description',
    color: 'text-orange-600',
  },
  ready: {
    titleKey: 'track.status.ready.title',
    descKey: 'track.status.ready.description',
    color: 'text-purple-600',
  },
  out_for_delivery: {
    titleKey: 'track.status.outForDelivery.title',
    descKey: 'track.status.outForDelivery.description',
    color: 'text-indigo-600',
  },
  delivered: {
    titleKey: 'track.status.delivered.title',
    descKey: 'track.status.delivered.description',
    color: 'text-green-600',
  },
  picked_up: {
    titleKey: 'track.status.pickedUp.title',
    descKey: 'track.status.pickedUp.description',
    color: 'text-green-600',
  },
  cancelled: {
    titleKey: 'track.status.cancelled.title',
    descKey: 'track.status.cancelled.description',
    color: 'text-red-600',
  },
};

// Fallback status messages (English defaults)
const statusMessages: Record<string, { title: string; description: string; color: string }> = {
  pending: {
    title: 'Order Received',
    description: 'Your order is waiting to be confirmed by the vendor.',
    color: 'text-yellow-600',
  },
  confirmed: {
    title: 'Order Confirmed',
    description: 'Great news! The vendor has accepted your order.',
    color: 'text-blue-600',
  },
  preparing: {
    title: 'Being Prepared',
    description: 'Your order is being prepared with care.',
    color: 'text-orange-600',
  },
  ready: {
    title: 'Ready!',
    description: 'Your order is ready and waiting.',
    color: 'text-purple-600',
  },
  out_for_delivery: {
    title: 'On the Way',
    description: 'Your order is out for delivery!',
    color: 'text-indigo-600',
  },
  delivered: {
    title: 'Delivered',
    description: 'Your order has been delivered. Enjoy!',
    color: 'text-green-600',
  },
  picked_up: {
    title: 'Picked Up',
    description: 'You have picked up your order. Enjoy!',
    color: 'text-green-600',
  },
  cancelled: {
    title: 'Cancelled',
    description: 'This order has been cancelled.',
    color: 'text-red-600',
  },
};

export default function TrackOrderPage() {
  const { t, formatCurrency } = useLanguage();
  const [orderId, setOrderId] = useState('');
  const [trackingPin, setTrackingPin] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleTrackOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!orderId.trim()) {
      setError('Please enter an order ID');
      return;
    }

    setLoading(true);
    setError('');
    setOrder(null);

    try {
      const res = await fetch(`/api/track-order?orderId=${encodeURIComponent(orderId.trim())}&pin=${encodeURIComponent(trackingPin.trim())}`);
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Order not found');
      }

      const data = await res.json();
      setOrder(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to find order');
    } finally {
      setLoading(false);
    }
  };

  const refreshOrder = async () => {
    if (!order) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/track-order?orderId=${encodeURIComponent(order.orderId)}&pin=${encodeURIComponent(trackingPin)}`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
      }
    } catch (err) {
      console.error('Failed to refresh:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyOrderId = () => {
    if (order?.orderId) {
      navigator.clipboard.writeText(order.orderId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24 safe-area-inset">
      {/* Header */}
      <div className="bg-white sticky top-0 z-10 pt-[65px]">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#55529d]/10 rounded-lg">
              <Package className="w-6 h-6 text-[#55529d]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Track Order</h1>
              <p className="text-sm text-gray-500">Enter your order details below</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Search Form */}
        {!order && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <form onSubmit={handleTrackOrder} className="space-y-4">
              <div>
                <label htmlFor="orderId" className="block text-sm font-medium text-gray-700 mb-2">
                  Order ID
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    id="orderId"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value.toUpperCase())}
                    placeholder="e.g. ORD-ABC123"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#55529d] focus:border-transparent text-gray-900 placeholder:text-gray-400"
                    autoComplete="off"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="trackingPin" className="block text-sm font-medium text-gray-700 mb-2">
                  Tracking PIN <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  id="trackingPin"
                  value={trackingPin}
                  onChange={(e) => setTrackingPin(e.target.value)}
                  placeholder="4-digit PIN"
                  maxLength={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#55529d] focus:border-transparent text-gray-900 placeholder:text-gray-400 tracking-widest text-center font-mono"
                />
                <p className="text-xs text-gray-500 mt-1.5">
                  Find this in your order confirmation email
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !orderId.trim()}
                className="w-full flex items-center justify-center gap-2 bg-[#55529d] text-white py-3.5 rounded-xl font-semibold hover:bg-[#444287] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    Track Order
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            {/* Help text */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-sm text-gray-600 text-center">
                Have an account?{' '}
                <Link href="/account" className="text-[#55529d] font-medium hover:underline">
                  Sign in to view all orders
                </Link>
              </p>
            </div>
          </div>
        )}

        {/* Order Found - Display Tracking */}
        {order && (
          <>
            {/* Order Header Card */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {/* Status Banner */}
              <div className={`px-6 py-4 ${
                order.status === 'cancelled' 
                  ? 'bg-red-50' 
                  : order.status === 'delivered' || order.status === 'picked_up'
                  ? 'bg-green-50'
                  : 'bg-[#55529d]/5'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${statusMessages[order.status]?.color || 'text-gray-600'}`}>
                      {statusMessages[order.status]?.title || 'Processing'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {statusMessages[order.status]?.description}
                    </p>
                  </div>
                  <button
                    onClick={refreshOrder}
                    disabled={loading}
                    className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                    title="Refresh status"
                  >
                    <RefreshCw className={`w-5 h-5 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {/* Order ID */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Order ID</p>
                    <p className="font-mono font-bold text-gray-900">{order.orderId}</p>
                  </div>
                  <button
                    onClick={copyOrderId}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Copy order ID"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </div>

                {/* Vendor & Fulfillment Type */}
                <div className="flex items-center justify-between py-3 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-900">{order.vendorName}</span>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    order.deliveryMethod === 'pickup'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {order.deliveryMethod === 'pickup' ? (
                      <>
                        <Store className="w-3 h-3" />
                        Pickup
                      </>
                    ) : (
                      <>
                        <Truck className="w-3 h-3" />
                        Delivery
                      </>
                    )}
                  </span>
                </div>

                {/* Total */}
                <div className="flex items-center justify-between py-3 border-t border-gray-100">
                  <span className="text-gray-500">Total</span>
                  <span className="text-xl font-bold text-[#55529d]">
                    {formatCurrency(order.total)}
                  </span>
                </div>
              </div>
            </div>

            {/* Status Timeline */}
            {order.status !== 'cancelled' && (
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="font-semibold text-gray-900 mb-6">{t('track.orderProgress') || 'Order Progress'}</h2>
                
                <StatusTimeline 
                  order={order}
                  steps={order.deliveryMethod === 'pickup' ? pickupStatusKeys : deliveryStatusKeys}
                  formatDate={formatDate}
                  t={t}
                />
              </div>
            )}

            {/* Cancelled State */}
            {order.status === 'cancelled' && (
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-red-100 rounded-full">
                    <XCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Order Cancelled</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      This order was cancelled{order.cancelledAt ? ` on ${formatDate(order.cancelledAt)}` : ''}.
                      If you have questions, please contact the vendor.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Delivery Address */}
            {order.deliveryMethod === 'delivery' && order.deliveryAddress && (
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Delivery Address</p>
                    <p className="text-gray-900">
                      {order.deliveryAddress.street}
                      {order.deliveryAddress.city && `, ${order.deliveryAddress.city}`}
                      {order.deliveryAddress.state && `, ${order.deliveryAddress.state}`}
                      {order.deliveryAddress.zip && ` ${order.deliveryAddress.zip}`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Order Items */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="font-semibold text-gray-900 mb-4">
                Order Items ({order.items.length})
              </h2>
              <div className="space-y-3">
                {order.items.map((item, index) => (
                  <div key={item.id || index} className="flex items-center gap-3">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-14 h-14 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Package className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{item.name}</p>
                      <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                      {item.notes && (
                        <p className="text-xs text-gray-400 truncate mt-0.5">Note: {item.notes}</p>
                      )}
                    </div>
                    <p className="font-medium text-gray-900">
                      {formatCurrency(item.price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Order Summary */}
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-2 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
                {order.deliveryFee > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>Delivery Fee</span>
                    <span>{formatCurrency(order.deliveryFee)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-500">
                  <span>Tax</span>
                  <span>{formatCurrency(order.tax)}</span>
                </div>
                <div className="flex justify-between font-semibold text-gray-900 pt-2 border-t">
                  <span>Total</span>
                  <span>{formatCurrency(order.total)}</span>
                </div>
              </div>
            </div>

            {/* Contact Vendor */}
            {order.vendorPhone && (
              <a
                href={`tel:${order.vendorPhone}`}
                className="flex items-center justify-center gap-2 bg-white rounded-2xl shadow-sm p-4 text-[#55529d] font-medium hover:bg-gray-50 transition-colors"
              >
                <Phone className="w-5 h-5" />
                Contact Vendor
              </a>
            )}

            {/* Track Another Order */}
            <button
              onClick={() => {
                setOrder(null);
                setOrderId('');
                setTrackingPin('');
                setError('');
              }}
              className="w-full text-center text-gray-500 hover:text-gray-700 py-3 text-sm font-medium"
            >
              Track a different order
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Status Timeline Component
function StatusTimeline({ 
  order, 
  steps,
  formatDate,
  t
}: { 
  order: Order; 
  steps: typeof deliveryStatusKeys;
  formatDate: (date?: string) => string;
  t: (key: string) => string;
}) {
  const currentIndex = steps.findIndex(step => step.key === order.status);
  
  // Map status keys to timestamp fields
  const timestampMap: Record<string, keyof Order> = {
    pending: 'createdAt',
    confirmed: 'confirmedAt',
    preparing: 'preparingAt',
    ready: 'readyAt',
    out_for_delivery: 'outForDeliveryAt',
    delivered: 'deliveredAt',
    picked_up: 'pickedUpAt',
  };

  return (
    <div className="relative">
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isPending = index > currentIndex;
        const StepIcon = step.icon;
        const timestamp = order[timestampMap[step.key]] as string | undefined;
        const label = t(step.labelKey) || step.labelKey.split('.').pop() || step.key;

        return (
          <div key={step.key} className="relative flex gap-4">
            {/* Vertical Line */}
            {index < steps.length - 1 && (
              <div 
                className={`absolute left-5 top-10 w-0.5 h-12 ${
                  isCompleted ? 'bg-green-500' : 'bg-gray-200'
                }`}
              />
            )}

            {/* Icon Circle */}
            <div 
              className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0 ${
                isCompleted 
                  ? 'bg-green-500 text-white' 
                  : isCurrent 
                  ? 'bg-[#55529d] text-white ring-4 ring-[#55529d]/20' 
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {isCompleted ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <StepIcon className="w-5 h-5" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pb-8">
              <p className={`font-medium ${
                isPending ? 'text-gray-400' : 'text-gray-900'
              }`}>
                {label}
              </p>
              {(isCompleted || isCurrent) && timestamp && (
                <p className="text-sm text-gray-500 mt-0.5">
                  {formatDate(timestamp)}
                </p>
              )}
              {isCurrent && !timestamp && (
                <p className="text-sm text-[#55529d] mt-0.5">
                  {t('track.inProgress') || 'In progress...'}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}