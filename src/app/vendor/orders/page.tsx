// src/app/vendor/orders/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import {
  Package,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  ChevronRight,
  Loader2,
  RefreshCw,
  Bell,
} from 'lucide-react';

interface Order {
  id: string;
  orderId: string;
  customerInfo: { name: string; phone: string };
  total: number;
  status: string;
  items: { name: string; quantity: number }[];
  createdAt: string;
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  pending: { label: 'New Order', color: 'text-yellow-700', bgColor: 'bg-yellow-100', icon: Bell },
  confirmed: { label: 'Confirmed', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: CheckCircle },
  preparing: { label: 'Preparing', color: 'text-orange-700', bgColor: 'bg-orange-100', icon: Package },
  ready_for_pickup: { label: 'Ready', color: 'text-purple-700', bgColor: 'bg-purple-100', icon: Package },
  out_for_delivery: { label: 'Out for Delivery', color: 'text-indigo-700', bgColor: 'bg-indigo-100', icon: Truck },
  delivered: { label: 'Delivered', color: 'text-green-700', bgColor: 'bg-green-100', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'text-red-700', bgColor: 'bg-red-100', icon: XCircle },
};

const tabs = [
  { key: 'active', label: 'Active Orders' },
  { key: 'completed', label: 'Completed' },
  { key: 'all', label: 'All Orders' },
];

export default function VendorOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('active');

  const fetchOrders = useCallback(async (showRefresh = false) => {
    if (!user) return;

    if (showRefresh) setRefreshing(true);

    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/orders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchOrders();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => fetchOrders(), 30000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const filteredOrders = orders.filter((order) => {
    if (activeTab === 'active') {
      return !['delivered', 'cancelled'].includes(order.status);
    }
    if (activeTab === 'completed') {
      return ['delivered', 'cancelled'].includes(order.status);
    }
    return true;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const newOrdersCount = orders.filter((o) => o.status === 'pending').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#55529d]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          {newOrdersCount > 0 && (
            <p className="text-sm text-orange-600 font-medium">
              {newOrdersCount} new order{newOrdersCount > 1 ? 's' : ''} waiting
            </p>
          )}
        </div>

        <button
          onClick={() => fetchOrders(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-[#55529d] text-[#55529d]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {tab.key === 'active' && newOrdersCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-orange-500 text-white text-xs rounded-full">
                {newOrdersCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders</h3>
          <p className="text-gray-600">
            {activeTab === 'active'
              ? 'No active orders right now'
              : 'No orders to show'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const status = statusConfig[order.status] || statusConfig.pending;
            const StatusIcon = status.icon;
            const isNew = order.status === 'pending';

            return (
              <Link
                key={order.id}
                href={`/vendor/orders/${order.id}`}
                className={`block bg-white rounded-xl shadow-sm hover:shadow-md transition-all ${
                  isNew ? 'ring-2 ring-orange-400' : ''
                }`}
              >
                <div className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Order ID and Status */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="font-mono font-bold text-[#55529d]">
                          {order.orderId}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${status.bgColor} ${status.color}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </span>
                        {isNew && (
                          <span className="px-2 py-1 bg-orange-500 text-white text-xs font-bold rounded animate-pulse">
                            NEW
                          </span>
                        )}
                      </div>

                      {/* Customer */}
                      <p className="font-medium text-gray-900">
                        {order.customerInfo.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {order.customerInfo.phone}
                      </p>

                      {/* Items summary */}
                      <p className="text-sm text-gray-600 mt-2">
                        {order.items.map((item) => `${item.quantity}x ${item.name}`).join(', ')}
                      </p>
                    </div>

                    {/* Right side */}
                    <div className="text-right flex flex-col items-end">
                      <span className="font-bold text-lg text-gray-900">
                        ${order.total.toFixed(2)}
                      </span>
                      <span className="text-xs text-gray-500 mt-1">
                        {formatDate(order.createdAt)}
                      </span>
                      <ChevronRight className="w-5 h-5 text-gray-400 mt-2" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}