// src/app/account/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { NotificationPanel } from '@/components/notifications';
import { 
  Package, 
  Clock, 
  CheckCircle, 
  Truck, 
  XCircle,
  ChevronRight,
  Loader2,
  ShoppingBag,
  Bell
} from 'lucide-react';

interface Order {
  id: string;
  orderId: string;
  vendorName: string;
  total: number;
  status: string;
  items: { name: string; quantity: number }[];
  createdAt: string;
}

const getStatusConfig = (language: 'en' | 'es'): Record<string, { label: string; color: string; icon: React.ElementType }> => ({
  pending: { 
    label: language === 'en' ? 'Pending' : 'Pendiente', 
    color: 'text-yellow-600 bg-yellow-50', 
    icon: Clock 
  },
  confirmed: { 
    label: language === 'en' ? 'Confirmed' : 'Confirmado', 
    color: 'text-blue-600 bg-blue-50', 
    icon: CheckCircle 
  },
  preparing: { 
    label: language === 'en' ? 'Preparing' : 'Preparando', 
    color: 'text-orange-600 bg-orange-50', 
    icon: Package 
  },
  ready_for_pickup: { 
    label: language === 'en' ? 'Ready' : 'Listo', 
    color: 'text-purple-600 bg-purple-50', 
    icon: Package 
  },
  out_for_delivery: { 
    label: language === 'en' ? 'On the way' : 'En camino', 
    color: 'text-indigo-600 bg-indigo-50', 
    icon: Truck 
  },
  delivered: { 
    label: language === 'en' ? 'Delivered' : 'Entregado', 
    color: 'text-green-600 bg-green-50', 
    icon: CheckCircle 
  },
  cancelled: { 
    label: language === 'en' ? 'Cancelled' : 'Cancelado', 
    color: 'text-red-600 bg-red-50', 
    icon: XCircle 
  },
});

export default function AccountOrdersPage() {
  const { user } = useAuth();
  const { language, formatCurrency } = useLanguage();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const statusConfig = getStatusConfig(language);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;

      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/orders?status=${filter}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setOrders(data.orders || []);
      } catch (error) {
        console.error('Failed to fetch orders:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user, filter]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === 'en' ? 'en-US' : 'es-DO', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
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

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          {language === 'en' ? 'My Orders' : 'Mis Pedidos'}
        </h2>
        
        {/* Filter */}
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#55529d] focus:border-transparent"
        >
          <option value="all">{language === 'en' ? 'All Orders' : 'Todos'}</option>
          <option value="pending">{language === 'en' ? 'Pending' : 'Pendiente'}</option>
          <option value="confirmed">{language === 'en' ? 'Confirmed' : 'Confirmado'}</option>
          <option value="preparing">{language === 'en' ? 'Preparing' : 'Preparando'}</option>
          <option value="out_for_delivery">{language === 'en' ? 'Out for Delivery' : 'En Camino'}</option>
          <option value="delivered">{language === 'en' ? 'Delivered' : 'Entregado'}</option>
          <option value="cancelled">{language === 'en' ? 'Cancelled' : 'Cancelado'}</option>
        </select>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Orders List - Takes 2 columns on large screens */}
        <div className="lg:col-span-2 space-y-4">
          {orders.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {language === 'en' ? 'No orders yet' : 'Sin pedidos aún'}
              </h3>
              <p className="text-gray-600 mb-6">
                {language === 'en' ? 'Start shopping to see your orders here' : 'Comienza a comprar para ver tus pedidos aquí'}
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 bg-[#55529d] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#444287] transition-colors"
              >
                {language === 'en' ? 'Browse Stores' : 'Ver Tiendas'}
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const status = statusConfig[order.status] || statusConfig.pending;
                const StatusIcon = status.icon;

                return (
                  <Link
                    key={order.id}
                    href={`/account/orders/${order.id}`}
                    className="block bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="p-4 sm:p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          {/* Order ID and Status */}
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="font-mono font-semibold text-[#55529d]">
                              {order.orderId}
                            </span>
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                              <StatusIcon className="w-3 h-3" />
                              {status.label}
                            </span>
                          </div>

                          {/* Vendor */}
                          <p className="font-medium text-gray-900 mb-1">
                            {order.vendorName}
                          </p>

                          {/* Items summary */}
                          <p className="text-sm text-gray-600">
                            {order.items.map((item) => `${item.quantity}x ${item.name}`).join(', ')}
                          </p>

                          {/* Date */}
                          <p className="text-xs text-gray-500 mt-2">
                            {formatDate(order.createdAt)}
                          </p>
                        </div>

                        {/* Total and Arrow */}
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-gray-900">
                            {formatCurrency(order.total)}
                          </span>
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Notifications Panel - Sidebar on large screens */}
        <div className="lg:col-span-1">
          <NotificationPanel
            title={language === 'en' ? 'Order Updates' : 'Actualizaciones'}
            maxItems={6}
            filterTypes={['order_', 'payment_']}
            viewAllLink="/notifications"
          />
        </div>
      </div>
    </div>
  );
}