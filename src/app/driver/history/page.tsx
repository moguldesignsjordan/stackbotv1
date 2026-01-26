// src/app/driver/history/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase/config';
import { ArrowLeft, Package, Clock, DollarSign, MapPin, Store, CheckCircle, Loader2, Globe } from 'lucide-react';
import { DeliveryOrder } from '@/lib/types/driver';

const translations = {
  es: {
    title: 'Historial de Entregas',
    back: 'Volver',
    all: 'Todas',
    today: 'Hoy',
    thisWeek: 'Esta Semana',
    thisMonth: 'Este Mes',
    totalDeliveries: 'Total Entregas',
    completed: 'Completadas',
    totalEarnings: 'Ganancias Totales',
    noDeliveries: 'Sin entregas',
    noDeliveriesDesc: 'Tu historial de entregas aparecerá aquí',
    deliveredTo: 'Entregado a',
    pickedUpFrom: 'Recogido de',
    deliveryFee: 'Tarifa',
    duration: 'Duración',
    mins: 'min',
    loading: 'Cargando historial...',
  },
  en: {
    title: 'Delivery History',
    back: 'Back',
    all: 'All',
    today: 'Today',
    thisWeek: 'This Week',
    thisMonth: 'This Month',
    totalDeliveries: 'Total Deliveries',
    completed: 'Completed',
    totalEarnings: 'Total Earnings',
    noDeliveries: 'No deliveries',
    noDeliveriesDesc: 'Your delivery history will appear here',
    deliveredTo: 'Delivered to',
    pickedUpFrom: 'Picked up from',
    deliveryFee: 'Fee',
    duration: 'Duration',
    mins: 'min',
    loading: 'Loading history...',
  },
};

type Language = 'es' | 'en';
type FilterType = 'all' | 'today' | 'week' | 'month';

export default function DriverHistoryPage() {
  const router = useRouter();
  const [language, setLanguage] = useState<Language>('es');
  const [deliveries, setDeliveries] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');

  const t = translations[language];
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    const savedLang = localStorage.getItem('stackbot-driver-lang') as Language;
    if (savedLang && (savedLang === 'es' || savedLang === 'en')) {
      setLanguage(savedLang);
    }
  }, []);

  const toggleLanguage = () => {
    const newLang = language === 'es' ? 'en' : 'es';
    setLanguage(newLang);
    localStorage.setItem('stackbot-driver-lang', newLang);
  };

  useEffect(() => {
    if (!userId) return;

    const fetchHistory = async () => {
      setLoading(true);
      try {
        const historyQuery = query(
          collection(db, 'orders'),
          where('driverId', '==', userId),
          where('status', '==', 'delivered'),
          orderBy('deliveredAt', 'desc')
        );
        const snapshot = await getDocs(historyQuery);
        const orders: DeliveryOrder[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          orders.push({
            id: doc.id,
            orderId: data.orderId || doc.id,
            status: data.status,
            deliveryStatus: data.deliveryStatus,
            vendorId: data.vendorId,
            vendorName: data.vendorName,
            vendorAddress: data.vendorAddress,
            customerId: data.customerId,
            customerName: data.customerInfo?.name || 'Cliente',
            deliveryAddress: data.deliveryAddress || {},
            deliveryFee: data.deliveryFee || 0,
            total: data.total || 0,
            claimedAt: data.claimedAt,
            deliveredAt: data.deliveredAt,
            createdAt: data.createdAt,
          } as DeliveryOrder);
        });
        setDeliveries(orders);
      } catch (err) {
        console.error('Error fetching history:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [userId]);

  const filteredDeliveries = deliveries.filter((delivery) => {
    if (filter === 'all') return true;
    const deliveredAt = delivery.deliveredAt instanceof Timestamp ? delivery.deliveredAt.toDate() : new Date(delivery.deliveredAt as unknown as string);
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    switch (filter) {
      case 'today': return deliveredAt >= startOfDay;
      case 'week': return deliveredAt >= startOfWeek;
      case 'month': return deliveredAt >= startOfMonth;
      default: return true;
    }
  });

  const totalEarnings = filteredDeliveries.reduce((sum, d) => sum + (d.deliveryFee || 0), 0);

  const formatDate = (timestamp: unknown): string => {
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp as string);
    return date.toLocaleDateString(language === 'es' ? 'es-DO' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const calculateDuration = (claimedAt: unknown, deliveredAt: unknown): number | null => {
    if (!claimedAt || !deliveredAt) return null;
    const start = claimedAt instanceof Timestamp ? claimedAt.toDate() : new Date(claimedAt as string);
    const end = deliveredAt instanceof Timestamp ? deliveredAt.toDate() : new Date(deliveredAt as string);
    return Math.round((end.getTime() - start.getTime()) / 60000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto" />
          <p className="text-gray-400 mt-2">{t.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="sticky top-0 z-40 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 safe-top">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => router.push('/driver')} className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold text-white">{t.title}</h1>
          <button onClick={toggleLanguage} className="p-2 -mr-2 text-gray-400 hover:text-white transition-colors">
            <Globe className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="pb-8">
        <div className="px-4 py-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-800/50 rounded-xl p-4 text-center">
              <Package className="w-6 h-6 text-purple-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{filteredDeliveries.length}</p>
              <p className="text-xs text-gray-500">{t.totalDeliveries}</p>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-4 text-center">
              <CheckCircle className="w-6 h-6 text-blue-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{filteredDeliveries.length}</p>
              <p className="text-xs text-gray-500">{t.completed}</p>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-4 text-center">
              <DollarSign className="w-6 h-6 text-amber-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-purple-400">${totalEarnings.toFixed(2)}</p>
              <p className="text-xs text-gray-500">{t.totalEarnings}</p>
            </div>
          </div>
        </div>

        <div className="px-4 mb-4">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {[
              { key: 'all', label: t.all },
              { key: 'today', label: t.today },
              { key: 'week', label: t.thisWeek },
              { key: 'month', label: t.thisMonth },
            ].map((item) => (
              <button key={item.key} onClick={() => setFilter(item.key as FilterType)} className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${filter === item.key ? 'bg-purple-600 text-white' : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700'}`}>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4">
          {filteredDeliveries.length === 0 ? (
            <div className="bg-gray-800/30 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-gray-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-300 mb-1">{t.noDeliveries}</h3>
              <p className="text-sm text-gray-500">{t.noDeliveriesDesc}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDeliveries.map((delivery) => {
                const duration = calculateDuration(delivery.claimedAt, delivery.deliveredAt);
                return (
                  <div key={delivery.id} className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-white">{delivery.vendorName}</p>
                          <p className="text-xs text-gray-500">{formatDate(delivery.deliveredAt)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-purple-400">+${delivery.deliveryFee?.toFixed(2)}</p>
                        {duration && <p className="text-xs text-gray-500">{duration} {t.mins}</p>}
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-400">
                        <Store className="w-4 h-4 text-blue-400" />
                        <span className="truncate">{delivery.vendorAddress || delivery.vendorName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <MapPin className="w-4 h-4 text-red-400" />
                        <span className="truncate">{delivery.deliveryAddress?.street}, {delivery.deliveryAddress?.city}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}