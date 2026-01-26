// src/app/driver/dashboard/page.tsx
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
  doc,
  updateDoc,
  setDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase/config';
import {
  Package,
  MapPin,
  Clock,
  DollarSign,
  Navigation,
  Store,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle,
  Zap,
} from 'lucide-react';

interface AvailableOrder {
  id: string;
  orderId: string;
  vendorId: string;
  vendorName: string;
  vendorAddress: string;
  customerAddress: string;
  deliveryFee: number;
  estimatedDistance?: number;
  estimatedTime?: number;
  itemCount: number;
  createdAt: Timestamp;
  priority?: 'normal' | 'high';
}

interface DriverStats {
  todayDeliveries: number;
  todayEarnings: number;
  weekDeliveries: number;
  weekEarnings: number;
  rating: number;
  totalDeliveries: number;
}

const translations = {
  es: {
    greeting: '¡Hola',
    youAreOnline: 'Estás en línea',
    youAreOffline: 'Estás desconectado',
    goOnline: 'Conectarse',
    goOffline: 'Desconectarse',
    today: 'Hoy',
    thisWeek: 'Esta Semana',
    deliveries: 'Entregas',
    availableOrders: 'Pedidos Disponibles',
    noOrdersAvailable: 'No hay pedidos disponibles',
    noOrdersDesc: 'Nuevos pedidos aparecerán aquí cuando estén listos',
    pickup: 'Recoger en',
    deliverTo: 'Entregar en',
    items: 'artículos',
    item: 'artículo',
    accept: 'Aceptar',
    accepting: 'Aceptando...',
    fee: 'Tarifa',
    mins: 'min',
    km: 'km',
    highPriority: 'Prioridad Alta',
    activeDelivery: 'Entrega Activa',
    viewDelivery: 'Ver Entrega',
    tipTitle: '💡 Consejo',
    tipOffline: 'Conéctate para empezar a recibir pedidos',
    tipOnline: 'Los pedidos más cercanos aparecen primero',
  },
  en: {
    greeting: 'Hello',
    youAreOnline: "You're online",
    youAreOffline: "You're offline",
    goOnline: 'Go Online',
    goOffline: 'Go Offline',
    today: 'Today',
    thisWeek: 'This Week',
    deliveries: 'Deliveries',
    availableOrders: 'Available Orders',
    noOrdersAvailable: 'No orders available',
    noOrdersDesc: 'New orders will appear here when ready',
    pickup: 'Pickup at',
    deliverTo: 'Deliver to',
    items: 'items',
    item: 'item',
    accept: 'Accept',
    accepting: 'Accepting...',
    fee: 'Fee',
    mins: 'min',
    km: 'km',
    highPriority: 'High Priority',
    activeDelivery: 'Active Delivery',
    viewDelivery: 'View Delivery',
    tipTitle: '💡 Tip',
    tipOffline: 'Go online to start receiving orders',
    tipOnline: 'Closest orders appear first',
  },
};

type Language = 'es' | 'en';

export default function DriverDashboardPage() {
  const router = useRouter();
  const [language, setLanguage] = useState<Language>('es');
  const [driverName, setDriverName] = useState('');
  const [driverStatus, setDriverStatus] = useState<'online' | 'offline' | 'busy'>('offline');
  const [availableOrders, setAvailableOrders] = useState<AvailableOrder[]>([]);
  const [stats, setStats] = useState<DriverStats | null>(null);
  const [activeDeliveryId, setActiveDeliveryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [acceptingOrderId, setAcceptingOrderId] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const t = translations[language];
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    const savedLang = localStorage.getItem('stackbot-driver-lang') as Language;
    if (savedLang && (savedLang === 'es' || savedLang === 'en')) {
      setLanguage(savedLang);
    }
  }, []);

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = onSnapshot(doc(db, 'drivers', userId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setDriverName(data.name || '');
        setDriverStatus(data.status || 'offline');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = onSnapshot(doc(db, 'driver_stats', userId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setStats({
          todayDeliveries: data.todayDeliveries || 0,
          todayEarnings: data.todayEarnings || 0,
          weekDeliveries: data.weekDeliveries || 0,
          weekEarnings: data.weekEarnings || 0,
          rating: data.rating || 5.0,
          totalDeliveries: data.totalDeliveries || 0,
        });
      }
    });

    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = onSnapshot(doc(db, 'driver_active_deliveries', userId), (docSnap) => {
      if (docSnap.exists()) {
        setActiveDeliveryId(docSnap.data().orderId);
      } else {
        setActiveDeliveryId(null);
      }
    });

    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    if (!userId || driverStatus !== 'online') {
      setAvailableOrders([]);
      return;
    }

    const q = query(
      collection(db, 'delivery_queue'),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'asc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          orderId: data.orderId,
          vendorId: data.vendorId,
          vendorName: data.vendorName || 'Unknown Vendor',
          vendorAddress: data.vendorAddress || '',
          customerAddress: data.customerAddress || '',
          deliveryFee: data.deliveryFee || 0,
          estimatedDistance: data.estimatedDistance,
          estimatedTime: data.estimatedTime,
          itemCount: data.itemCount || 1,
          createdAt: data.createdAt,
          priority: data.priority || 'normal',
        } as AvailableOrder;
      });
      setAvailableOrders(orders);
    });

    return () => unsubscribe();
  }, [userId, driverStatus]);

  const toggleStatus = async () => {
    if (!userId) return;

    setStatusLoading(true);
    try {
      const newStatus = driverStatus === 'online' ? 'offline' : 'online';
      await updateDoc(doc(db, 'drivers', userId), {
        status: newStatus,
        lastStatusChange: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setStatusLoading(false);
    }
  };

  const acceptOrder = async (order: AvailableOrder) => {
    if (!userId || acceptingOrderId) return;

    setAcceptingOrderId(order.id);
    try {
      await updateDoc(doc(db, 'delivery_queue', order.id), {
        status: 'assigned',
        driverId: userId,
        assignedAt: serverTimestamp(),
      });

      await setDoc(doc(db, 'driver_active_deliveries', userId), {
        orderId: order.orderId,
        queueId: order.id,
        vendorId: order.vendorId,
        vendorName: order.vendorName,
        vendorAddress: order.vendorAddress,
        customerAddress: order.customerAddress,
        deliveryFee: order.deliveryFee,
        itemCount: order.itemCount,
        status: 'heading_to_pickup',
        acceptedAt: serverTimestamp(),
      });

      await updateDoc(doc(db, 'drivers', userId), {
        status: 'busy',
      });

      router.push('/driver/delivery');
    } catch (error) {
      console.error('Error accepting order:', error);
    } finally {
      setAcceptingOrderId(null);
    }
  };

  const formatCurrency = (amount: number) => `RD$${amount.toLocaleString()}`;

  const getTimeAgo = (timestamp: Timestamp) => {
    if (!timestamp) return '';
    const now = Date.now();
    const time = timestamp.toMillis();
    const diff = Math.floor((now - time) / 1000 / 60);
    if (diff < 1) return language === 'es' ? 'Ahora' : 'Now';
    if (diff < 60) return `${diff} min`;
    return `${Math.floor(diff / 60)}h`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#55529d]" />
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {t.greeting}, {driverName?.split(' ')[0] || 'Driver'}! 👋
          </h1>
          <p className={`text-sm font-medium ${driverStatus === 'online' ? 'text-green-600' : 'text-gray-500'}`}>
            {driverStatus === 'online' ? t.youAreOnline : t.youAreOffline}
          </p>
        </div>
        
        <button
          onClick={toggleStatus}
          disabled={statusLoading || driverStatus === 'busy'}
          className={`px-4 py-2 rounded-xl font-semibold transition-colors flex items-center gap-2 ${
            driverStatus === 'online'
              ? 'bg-red-100 text-red-700 hover:bg-red-200'
              : 'bg-green-500 text-white hover:bg-green-600'
          } ${(statusLoading || driverStatus === 'busy') && 'opacity-50 cursor-not-allowed'}`}
        >
          {statusLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          {driverStatus === 'online' ? t.goOffline : t.goOnline}
        </button>
      </div>

      {activeDeliveryId && (
        <Link
          href="/driver/delivery"
          className="block bg-gradient-to-r from-[#55529d] to-[#6d6abf] rounded-2xl p-4 text-white"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold">{t.activeDelivery}</p>
                <p className="text-sm text-white/80">{t.viewDelivery}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5" />
          </div>
        </Link>
      )}

      {stats && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-xs text-gray-500 font-medium mb-2">{t.today}</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-gray-900">{stats.todayDeliveries}</span>
              <span className="text-sm text-gray-500">{t.deliveries.toLowerCase()}</span>
            </div>
            <p className="text-sm font-semibold text-green-600 mt-1">
              {formatCurrency(stats.todayEarnings)}
            </p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-xs text-gray-500 font-medium mb-2">{t.thisWeek}</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-gray-900">{stats.weekDeliveries}</span>
              <span className="text-sm text-gray-500">{t.deliveries.toLowerCase()}</span>
            </div>
            <p className="text-sm font-semibold text-green-600 mt-1">
              {formatCurrency(stats.weekEarnings)}
            </p>
          </div>
        </div>
      )}

      {driverStatus === 'offline' && !activeDeliveryId && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">{t.tipTitle}</p>
            <p className="text-sm text-amber-700">{t.tipOffline}</p>
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-900">{t.availableOrders}</h2>
          {driverStatus === 'online' && availableOrders.length > 0 && (
            <span className="text-xs text-gray-500">{t.tipOnline}</span>
          )}
        </div>

        {driverStatus !== 'online' ? (
          <div className="bg-gray-50 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-600 font-medium">{t.noOrdersAvailable}</p>
            <p className="text-sm text-gray-500 mt-1">{t.tipOffline}</p>
          </div>
        ) : availableOrders.length === 0 ? (
          <div className="bg-gray-50 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-600 font-medium">{t.noOrdersAvailable}</p>
            <p className="text-sm text-gray-500 mt-1">{t.noOrdersDesc}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {availableOrders.map((order) => (
              <div key={order.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Store className="w-4 h-4 text-gray-400" />
                      <span className="font-semibold text-gray-900">{order.vendorName}</span>
                    </div>
                    {order.priority === 'high' && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                        {t.highPriority}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {order.itemCount} {order.itemCount === 1 ? t.item : t.items} • {getTimeAgo(order.createdAt)}
                  </p>
                </div>

                <div className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Store className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-500 font-medium">{t.pickup}</p>
                      <p className="text-sm text-gray-900 truncate">{order.vendorAddress}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-8 flex justify-center">
                      <div className="w-0.5 h-4 bg-gray-200" />
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-500 font-medium">{t.deliverTo}</p>
                      <p className="text-sm text-gray-900 truncate">{order.customerAddress}</p>
                    </div>
                  </div>
                </div>

                <div className="px-4 pb-4 flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    {order.estimatedDistance && (
                      <span className="flex items-center gap-1">
                        <Navigation className="w-4 h-4" />
                        {order.estimatedDistance.toFixed(1)} {t.km}
                      </span>
                    )}
                    {order.estimatedTime && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        ~{order.estimatedTime} {t.mins}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-gray-500">{t.fee}</p>
                      <p className="font-bold text-green-600">{formatCurrency(order.deliveryFee)}</p>
                    </div>
                    <button
                      onClick={() => acceptOrder(order)}
                      disabled={acceptingOrderId !== null}
                      className="px-4 py-2 bg-[#55529d] text-white font-semibold rounded-xl hover:bg-[#444280] disabled:opacity-50 transition-colors flex items-center gap-2"
                    >
                      {acceptingOrderId === order.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {t.accepting}
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          {t.accept}
                        </>
                      )}
                    </button>
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
