// src/app/driver/history/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase/config';
import {
  ArrowLeft,
  Package,
  MapPin,
  Clock,
  DollarSign,
  CheckCircle,
  XCircle,
  Calendar,
  ChevronRight,
  Loader2,
  Store,
  Filter,
} from 'lucide-react';

interface DeliveryHistoryItem {
  id: string;
  orderId: string;
  vendorName: string;
  customerName: string;
  deliveryAddress: {
    street: string;
    city: string;
  };
  deliveryFee: number;
  total: number;
  status: string;
  claimedAt?: Timestamp;
  deliveredAt?: Timestamp;
  createdAt: Timestamp;
}

export default function DriverHistoryPage() {
  const router = useRouter();
  const [deliveries, setDeliveries] = useState<DeliveryHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  const userId = auth.currentUser?.uid;

  useEffect(() => {
    if (!userId) return;

    // Calculate date filters
    let dateFilter: Date | null = null;
    const now = new Date();
    
    if (filter === 'today') {
      dateFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (filter === 'week') {
      dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (filter === 'month') {
      dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    let deliveriesQuery = query(
      collection(db, 'orders'),
      where('driverId', '==', userId),
      where('status', 'in', ['delivered', 'cancelled']),
      orderBy('deliveredAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      deliveriesQuery,
      (snapshot) => {
        const items: DeliveryHistoryItem[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          
          // Apply date filter client-side if needed
          if (dateFilter) {
            const deliveredAt = data.deliveredAt?.toDate?.();
            if (deliveredAt && deliveredAt < dateFilter) return;
          }

          items.push({
            id: doc.id,
            orderId: data.orderId || doc.id,
            vendorName: data.vendorName,
            customerName: data.customerInfo?.name || 'Customer',
            deliveryAddress: data.deliveryAddress || {},
            deliveryFee: data.deliveryFee || 0,
            total: data.total || 0,
            status: data.status,
            claimedAt: data.claimedAt,
            deliveredAt: data.deliveredAt,
            createdAt: data.createdAt,
          });
        });
        setDeliveries(items);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching history:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, filter]);

  const formatDate = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getDeliveryDuration = (claimed?: Timestamp, delivered?: Timestamp) => {
    if (!claimed || !delivered) return null;
    const diff = delivered.toDate().getTime() - claimed.toDate().getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} min`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  // Calculate stats
  const stats = {
    total: deliveries.length,
    completed: deliveries.filter((d) => d.status === 'delivered').length,
    totalEarnings: deliveries
      .filter((d) => d.status === 'delivered')
      .reduce((sum, d) => sum + (d.deliveryFee || 0), 0),
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gray-800 border-b border-gray-700 safe-top">
        <div className="px-4 py-3 pt-12 lg:pt-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/driver')}
              className="p-2 -ml-2 text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold">Delivery History</h1>
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="px-4 py-4 grid grid-cols-3 gap-3">
        <div className="bg-gray-800 rounded-xl p-3 text-center border border-gray-700">
          <p className="text-2xl font-bold text-white">{stats.total}</p>
          <p className="text-xs text-gray-400">Total</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-3 text-center border border-gray-700">
          <p className="text-2xl font-bold text-emerald-400">{stats.completed}</p>
          <p className="text-xs text-gray-400">Completed</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-3 text-center border border-gray-700">
          <p className="text-2xl font-bold text-emerald-400">
            ${stats.totalEarnings.toFixed(2)}
          </p>
          <p className="text-xs text-gray-400">Earned</p>
        </div>
      </div>

      {/* Filter */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {[
            { value: 'all', label: 'All Time' },
            { value: 'today', label: 'Today' },
            { value: 'week', label: 'This Week' },
            { value: 'month', label: 'This Month' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value as typeof filter)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                filter === option.value
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-800 text-gray-400 border border-gray-700'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Deliveries List */}
      <div className="px-4 pb-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
          </div>
        ) : deliveries.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No deliveries found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {deliveries.map((delivery) => (
              <div
                key={delivery.id}
                className="bg-gray-800 rounded-xl border border-gray-700 p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        delivery.status === 'delivered'
                          ? 'bg-emerald-500/20'
                          : 'bg-red-500/20'
                      }`}
                    >
                      {delivery.status === 'delivered' ? (
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium text-white">
                        {delivery.vendorName}
                      </h3>
                      <p className="text-sm text-gray-400">
                        #{delivery.orderId.slice(-6)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-400 font-semibold">
                      +${delivery.deliveryFee?.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">
                      ${delivery.total?.toFixed(2)} order
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-400">
                    <MapPin className="w-4 h-4" />
                    <span className="truncate">
                      {delivery.deliveryAddress?.street},{' '}
                      {delivery.deliveryAddress?.city}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatDate(delivery.deliveredAt || delivery.createdAt)}
                    </span>
                    {getDeliveryDuration(
                      delivery.claimedAt,
                      delivery.deliveredAt
                    ) && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {getDeliveryDuration(
                          delivery.claimedAt,
                          delivery.deliveredAt
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}