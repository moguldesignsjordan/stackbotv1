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
  Star,
  Phone,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface AvailableOrder {
  id: string;
  orderId: string;
  orderDisplayId?: string;
  vendorId: string;
  vendorName: string;
  vendorAddress: string;
  vendorPhone?: string;
  vendorLocation?: { lat: number; lng: number } | null;
  customerId?: string;
  customerName?: string;
  customerAddress: string;
  customerPhone?: string;
  customerLocation?: { lat: number; lng: number } | null;
  deliveryFee: number;
  tip?: number;
  orderTotal?: number;
  estimatedDistance?: number | null;
  estimatedTime?: number | null;
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

// ============================================================================
// TRANSLATIONS
// ============================================================================

const translations = {
  es: {
    greeting: '¡Hola',
    youAreOnline: 'Estás en línea',
    youAreOffline: 'Estás desconectado',
    youAreBusy: 'En entrega',
    goOnline: 'Conectarse',
    goOffline: 'Desconectarse',
    today: 'Hoy',
    thisWeek: 'Esta Semana',
    deliveries: 'Entregas',
    totalDeliveries: 'Total',
    rating: 'Calificación',
    availableOrders: 'Pedidos Disponibles',
    noOrdersAvailable: 'No hay pedidos disponibles',
    noOrdersDesc: 'Nuevos pedidos aparecerán aquí cuando estén listos',
    noOrdersOffline: 'Conéctate para ver pedidos disponibles',
    pickup: 'Recoger en',
    deliverTo: 'Entregar en',
    items: 'artículos',
    item: 'artículo',
    accept: 'Aceptar',
    accepting: 'Aceptando...',
    fee: 'Tarifa',
    mins: 'min',
    km: 'km',
    highPriority: '🔥 Prioridad Alta',
    activeDelivery: 'Entrega Activa',
    viewDelivery: 'Toca para ver detalles',
    tipTitle: '💡 Consejo',
    tipOffline: 'Conéctate para empezar a recibir pedidos',
    tipOnline: 'Los pedidos más cercanos aparecen primero',
    errorAccepting: 'Error al aceptar pedido. Intenta de nuevo.',
  },
  en: {
    greeting: 'Hello',
    youAreOnline: "You're online",
    youAreOffline: "You're offline",
    youAreBusy: 'On delivery',
    goOnline: 'Go Online',
    goOffline: 'Go Offline',
    today: 'Today',
    thisWeek: 'This Week',
    deliveries: 'Deliveries',
    totalDeliveries: 'Total',
    rating: 'Rating',
    availableOrders: 'Available Orders',
    noOrdersAvailable: 'No orders available',
    noOrdersDesc: 'New orders will appear here when ready',
    noOrdersOffline: 'Go online to see available orders',
    pickup: 'Pickup at',
    deliverTo: 'Deliver to',
    items: 'items',
    item: 'item',
    accept: 'Accept',
    accepting: 'Accepting...',
    fee: 'Fee',
    mins: 'min',
    km: 'km',
    highPriority: '🔥 High Priority',
    activeDelivery: 'Active Delivery',
    viewDelivery: 'Tap to view details',
    tipTitle: '💡 Tip',
    tipOffline: 'Go online to start receiving orders',
    tipOnline: 'Closest orders appear first',
    errorAccepting: 'Error accepting order. Please try again.',
  },
};

type Language = 'es' | 'en';

// ============================================================================
// COMPONENT
// ============================================================================

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
  const [error, setError] = useState<string | null>(null);

  const t = translations[language];
  const userId = auth.currentUser?.uid;

  // ── Language persistence ─────────────────────────────────────
  useEffect(() => {
    const savedLang = localStorage.getItem('stackbot-driver-lang') as Language;
    if (savedLang && (savedLang === 'es' || savedLang === 'en')) {
      setLanguage(savedLang);
    }
  }, []);

  // ── Driver profile listener ──────────────────────────────────
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

  // ── Driver stats listener ────────────────────────────────────
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

  // ── Active delivery listener ─────────────────────────────────
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

  // ── Available orders listener (delivery_queue) ───────────────
  useEffect(() => {
    if (!userId || driverStatus !== 'online') {
      setAvailableOrders([]);
      return;
    }

    // Query pending queue items, ordered by creation time (oldest first)
    // Note: Firestore composite index required: status ASC, createdAt ASC
    const q = query(
      collection(db, 'delivery_queue'),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'asc'),
      limit(15)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          orderId: data.orderId,
          orderDisplayId: data.orderDisplayId || data.orderId?.slice(0, 8).toUpperCase(),
          vendorId: data.vendorId,
          vendorName: data.vendorName || 'Unknown Vendor',
          vendorAddress: data.vendorAddress || '',
          vendorPhone: data.vendorPhone || null,
          vendorLocation: data.vendorLocation || null,
          customerId: data.customerId || null,
          customerName: data.customerName || null,
          customerAddress: data.customerAddress || '',
          customerPhone: data.customerPhone || null,
          customerLocation: data.customerLocation || null,
          deliveryFee: data.deliveryFee || 0,
          tip: data.tip || 0,
          orderTotal: data.orderTotal || 0,
          estimatedDistance: data.estimatedDistance || null,
          estimatedTime: data.estimatedTime || null,
          itemCount: data.itemCount || 1,
          createdAt: data.createdAt,
          priority: data.priority || 'normal',
        } as AvailableOrder;
      });

      // Sort: high priority first, then by creation time (oldest first)
      orders.sort((a, b) => {
        if (a.priority === 'high' && b.priority !== 'high') return -1;
        if (a.priority !== 'high' && b.priority === 'high') return 1;
        return 0; // Firestore already orders by createdAt
      });

      setAvailableOrders(orders);
    });

    return () => unsubscribe();
  }, [userId, driverStatus]);

  // ── Toggle online/offline ────────────────────────────────────
  const toggleStatus = async () => {
    if (!userId) return;
    setStatusLoading(true);
    try {
      const newStatus = driverStatus === 'online' ? 'offline' : 'online';
      await updateDoc(doc(db, 'drivers', userId), {
        status: newStatus,
        lastStatusChange: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error updating status:', err);
    } finally {
      setStatusLoading(false);
    }
  };

  // ── Accept order from queue ──────────────────────────────────
  // Writes enriched data to driver_active_deliveries so the
  // onActiveDeliveryUpdate Cloud Function can sync to all collections.
  const acceptOrder = async (order: AvailableOrder) => {
    if (!userId || acceptingOrderId) return;

    setAcceptingOrderId(order.id);
    setError(null);

    try {
      // 1. Mark queue item as assigned
      await updateDoc(doc(db, 'delivery_queue', order.id), {
        status: 'assigned',
        driverId: userId,
        driverName: driverName,
        assignedAt: serverTimestamp(),
      });

      // 2. Create active delivery with ALL enriched fields
      //    (Phase 2: includes customerId, vendorLocation, customerLocation,
      //     vendorPhone, customerPhone — needed for the delivery page map
      //     and the onActiveDeliveryUpdate Cloud Function sync)
      await setDoc(doc(db, 'driver_active_deliveries', userId), {
        orderId: order.orderId,
        queueId: order.id,
        vendorId: order.vendorId,
        vendorName: order.vendorName,
        vendorAddress: order.vendorAddress,
        vendorPhone: order.vendorPhone || null,
        vendorLocation: order.vendorLocation || null,
        customerId: order.customerId || null,
        customerName: order.customerName || null,
        customerAddress: order.customerAddress,
        customerPhone: order.customerPhone || null,
        customerLocation: order.customerLocation || null,
        deliveryFee: order.deliveryFee,
        tip: order.tip || 0,
        orderTotal: order.orderTotal || 0,
        itemCount: order.itemCount,
        estimatedDistance: order.estimatedDistance || null,
        estimatedTime: order.estimatedTime || null,
        status: 'heading_to_pickup',
        driverName: driverName,
        acceptedAt: serverTimestamp(),
      });

      // 3. Set driver to busy
      await updateDoc(doc(db, 'drivers', userId), {
        status: 'busy',
        currentOrderId: order.orderId,
      });

      // 4. Update main order with driver info
      if (order.orderId) {
        try {
          await updateDoc(doc(db, 'orders', order.orderId), {
            driverId: userId,
            driverName: driverName,
            status: 'claimed',
            deliveryStatus: 'claimed',
            claimedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          // Order doc may not exist if using only queue-based system
          console.warn('Could not update orders doc:', err);
        }
      }

      router.push('/driver/delivery');
    } catch (err) {
      console.error('Error accepting order:', err);
      setError(t.errorAccepting);
      setTimeout(() => setError(null), 4000);
    } finally {
      setAcceptingOrderId(null);
    }
  };

  // ── Helpers ──────────────────────────────────────────────────
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

  // ── Loading state ────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#55529d]" />
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="px-4 py-4 space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {t.greeting}, {driverName?.split(' ')[0] || 'Driver'}! 👋
          </h1>
          <p className={`text-sm font-medium ${
            driverStatus === 'online' ? 'text-green-600' 
            : driverStatus === 'busy' ? 'text-orange-600' 
            : 'text-gray-500'
          }`}>
            {driverStatus === 'online' ? t.youAreOnline 
             : driverStatus === 'busy' ? t.youAreBusy 
             : t.youAreOffline}
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

      {/* Error Toast */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Active Delivery Banner */}
      {activeDeliveryId && (
        <Link
          href="/driver/delivery"
          className="block bg-gradient-to-r from-[#55529d] to-[#6d6abf] rounded-2xl p-4 text-white active:scale-[0.98] transition-transform"
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

      {/* Stats Grid */}
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

          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-1.5 mb-1">
              <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
              <span className="text-xs text-gray-500 font-medium">{t.rating}</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">{stats.rating.toFixed(1)}</span>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-xs text-gray-500 font-medium mb-1">{t.totalDeliveries}</p>
            <span className="text-2xl font-bold text-gray-900">{stats.totalDeliveries}</span>
          </div>
        </div>
      )}

      {/* Offline Tip */}
      {driverStatus === 'offline' && !activeDeliveryId && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">{t.tipTitle}</p>
            <p className="text-sm text-amber-700">{t.tipOffline}</p>
          </div>
        </div>
      )}

      {/* Available Orders */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-900">{t.availableOrders}</h2>
          {driverStatus === 'online' && availableOrders.length > 0 && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              {availableOrders.length} {language === 'es' ? 'disponibles' : 'available'}
            </span>
          )}
        </div>

        {driverStatus !== 'online' ? (
          <div className="bg-gray-50 rounded-xl p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Package className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-600 font-medium">{t.noOrdersAvailable}</p>
            <p className="text-sm text-gray-500 mt-1">{t.noOrdersOffline}</p>
          </div>
        ) : availableOrders.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-8 text-center">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <p className="text-gray-600 font-medium">{t.noOrdersAvailable}</p>
            <p className="text-sm text-gray-500 mt-1">{t.noOrdersDesc}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {availableOrders.map((order) => (
              <div
                key={order.id}
                className={`bg-white rounded-xl border overflow-hidden transition-all ${
                  order.priority === 'high'
                    ? 'border-orange-300 shadow-sm shadow-orange-100'
                    : 'border-gray-100'
                }`}
              >
                {/* Priority Badge */}
                {order.priority === 'high' && (
                  <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold px-3 py-1.5 text-center">
                    {t.highPriority}
                  </div>
                )}

                <div className="p-4">
                  {/* Vendor Row */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Store className="w-5 h-5 text-[#55529d]" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{order.vendorName}</p>
                        <p className="text-xs text-gray-500">
                          {order.itemCount} {order.itemCount === 1 ? t.item : t.items}
                          {order.orderTotal ? ` • ${formatCurrency(order.orderTotal)}` : ''}
                        </p>
                      </div>
                    </div>

                    {/* Time ago */}
                    {order.createdAt && (
                      <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                        <Clock className="w-3 h-3 inline mr-0.5" />
                        {getTimeAgo(order.createdAt)}
                      </span>
                    )}
                  </div>

                  {/* Addresses */}
                  <div className="space-y-2 mb-3">
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Store className="w-3 h-3 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500">{t.pickup}</p>
                        <p className="text-sm text-gray-700 truncate">{order.vendorAddress || order.vendorName}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <MapPin className="w-3 h-3 text-red-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500">{t.deliverTo}</p>
                        <p className="text-sm text-gray-700 truncate">{order.customerAddress}</p>
                      </div>
                    </div>
                  </div>

                  {/* Fee + Distance + Accept */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Delivery Fee */}
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4 text-green-600" />
                        <span className="font-bold text-green-700">{formatCurrency(order.deliveryFee)}</span>
                        {order.tip ? (
                          <span className="text-xs text-green-500">+{formatCurrency(order.tip)}</span>
                        ) : null}
                      </div>

                      {/* Distance */}
                      {order.estimatedDistance && (
                        <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-full">
                          <Navigation className="w-3 h-3 inline mr-0.5" />
                          {order.estimatedDistance} {t.km}
                        </span>
                      )}

                      {/* ETA */}
                      {order.estimatedTime && (
                        <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-full">
                          ~{order.estimatedTime} {t.mins}
                        </span>
                      )}
                    </div>

                    {/* Accept Button */}
                    <button
                      onClick={() => acceptOrder(order)}
                      disabled={!!acceptingOrderId || !!activeDeliveryId}
                      className={`px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-1.5 transition-all ${
                        activeDeliveryId
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : acceptingOrderId === order.id
                          ? 'bg-[#55529d] text-white opacity-70'
                          : 'bg-[#55529d] text-white hover:bg-[#444280] active:scale-95'
                      }`}
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