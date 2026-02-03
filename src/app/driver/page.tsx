// src/app/driver/page.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  setDoc,
  serverTimestamp,
  runTransaction,
  Timestamp,
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import {
  Truck,
  Package,
  MapPin,
  Clock,
  DollarSign,
  Navigation,
  Phone,
  Power,
  PowerOff,
  AlertCircle,
  CheckCircle,
  Loader2,
  Store,
  ExternalLink,
  Zap,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================
type DriverStatus = 'online' | 'offline' | 'busy' | 'break';

interface DriverProfile {
  id: string;
  userId?: string;
  isOnline?: boolean;
  ratingCount?: number;
  isVerified?: boolean;
  createdAt?: any;
  updatedAt?: any;
  name: string;
  email: string;
  phone?: string;
  photoURL?: string;
  vehicleType?: string;
  vehiclePlate?: string;
  status: DriverStatus;
  verified?: boolean;
  rating?: number;
  totalDeliveries?: number;
  currentLocation?: { lat: number; lng: number };
}

interface DeliveryOrder {
  id: string;
  customerPhone?: string;
  trackingPin?: string;
  vendorPhone?: string;
  items?: any[];
  vendorCoordinates?: { lat: number; lng: number };
  customerCoordinates?: { lat: number; lng: number };
  orderId: string;
  status: string;
  deliveryStatus?: string;
  vendorId: string;
  vendorName: string;
  vendorAddress: string;
  customerId: string;
  customerName?: string;
  customerAddress?: string;
  deliveryAddress?: any;
  deliveryFee: number;
  total?: number;
  itemCount?: number;
  orderTotal?: number;
  claimedAt?: any;
  deliveredAt?: any;
  createdAt?: any;
  [key: string]: any;
}

// ============================================================================
// TRANSLATIONS
// ============================================================================
const translations = {
  es: {
    greeting: 'Hola',
    online: 'En línea',
    offline: 'Desconectado',
    goOnline: 'Conectarse',
    goOffline: 'Desconecterse',
    available: 'Disponible',
    busy: 'Ocupado',
    onBreak: 'En descanso',
    availableOrders: 'Pedidos Disponibles',
    noOrdersTitle: 'Sin pedidos disponibles',
    noOrdersDesc: 'Los nuevos pedidos aparecerán aquí automáticamente',
    items: 'artículos',
    deliveryFee: 'tarifa de entrega',
    pickup: 'Recoger',
    deliverTo: 'Entregar a',
    away: 'de distancia',
    claimOrder: 'Tomar Pedido',
    claiming: 'Tomando...',
    justNow: 'Ahora mismo',
    minsAgo: 'hace {n}m',
    hoursAgo: 'hace {n}h',
    daysAgo: 'hace {n}d',
    activeOrder: 'Pedido Activo',
    headToPickup: 'Dirígete al Pickup',
    deliveringOrder: 'Entregando Pedido',
    navigate: 'Navegar',
    navigateTo: 'Navegar a',
    call: 'Llamar',
    customer: 'Cliente',
    vendor: 'Vendedor',
    orderSummary: 'Resumen del Pedido',
    moreItems: '+{n} más artículos',
    total: 'Total',
    confirmPickup: 'Confirmar Recogida',
    completeDelivery: 'Completar Entrega',
    deliveryPin: 'PIN de Entrega',
    todayDeliveries: 'Entregas Hoy',
    todayEarnings: 'Ganancias Hoy',
    rating: 'Calificación',
    errorClaiming: 'Error al tomar el pedido',
    orderTaken: 'Este pedido ya fue tomado por otro conductor',
    errorUpdating: 'Error al actualizar estado',
    errorGoingOffline: 'No puedes desconectarte con un pedido activo',
    orderClaimed: '¡Pedido tomado exitosamente!',
    pickupConfirmed: 'Recogida confirmada',
    deliveryCompleted: '¡Entrega completada!',
    youreOffline: 'Estás desconectado',
    goOnlineDesc: 'Conéctate para ver y tomar pedidos disponibles',
  },
  en: {
    greeting: 'Hello',
    online: 'Online',
    offline: 'Offline',
    goOnline: 'Go Online',
    goOffline: 'Go Offline',
    available: 'Available',
    busy: 'Busy',
    onBreak: 'On Break',
    availableOrders: 'Available Orders',
    noOrdersTitle: 'No available orders',
    noOrdersDesc: 'New orders will appear here automatically',
    items: 'items',
    deliveryFee: 'delivery fee',
    pickup: 'Pickup',
    deliverTo: 'Deliver to',
    away: 'away',
    claimOrder: 'Claim Order',
    claiming: 'Claiming...',
    justNow: 'Just now',
    minsAgo: '{n}m ago',
    hoursAgo: '{n}h ago',
    daysAgo: '{n}d ago',
    activeOrder: 'Active Order',
    headToPickup: 'Head to Pickup',
    deliveringOrder: 'Delivering Order',
    navigate: 'Navigate',
    navigateTo: 'Navigate to',
    call: 'Call',
    customer: 'Customer',
    vendor: 'Vendor',
    orderSummary: 'Order Summary',
    moreItems: '+{n} more items',
    total: 'Total',
    confirmPickup: 'Confirm Pickup',
    completeDelivery: 'Complete Delivery',
    deliveryPin: 'Delivery PIN',
    todayDeliveries: "Today's Deliveries",
    todayEarnings: "Today's Earnings",
    rating: 'Rating',
    errorClaiming: 'Error claiming order',
    orderTaken: 'This order was already taken by another driver',
    errorUpdating: 'Error updating status',
    errorGoingOffline: 'Cannot go offline with an active order',
    orderClaimed: 'Order claimed successfully!',
    pickupConfirmed: 'Pickup confirmed',
    deliveryCompleted: 'Delivery completed!',
    youreOffline: "You're offline",
    goOnlineDesc: 'Go online to see and claim available orders',
  },
};

type Language = 'es' | 'en';

// ============================================================================
// HELPERS
// ============================================================================
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatTimeAgo(date: Date, t: typeof translations.es): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return t.justNow;
  if (diffMins < 60) return t.minsAgo.replace('{n}', String(diffMins));
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return t.hoursAgo.replace('{n}', String(diffHours));
  return t.daysAgo.replace('{n}', String(Math.floor(diffHours / 24)));
}

// ============================================================================
// DASHBOARD
// ============================================================================
export default function DriverDashboard() {
  const [language, setLanguage] = useState<Language>('es');
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [availableOrders, setAvailableOrders] = useState<DeliveryOrder[]>([]);
  const [currentOrder, setCurrentOrder] = useState<DeliveryOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [claimingOrderId, setClaimingOrderId] = useState<string | null>(null);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // ── sync userId reactively ──────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid ?? null);
    });
    return () => unsub();
  }, []);

  // ── language pref (reads the same key layout writes) ────────────────────
  useEffect(() => {
    const saved = localStorage.getItem('stackbot-driver-lang') as Language;
    if (saved === 'es' || saved === 'en') setLanguage(saved);
  }, []);

  const t = translations[language];

  // ── geolocation ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setDriverLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => console.error('Geolocation error:', err),
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // ── driver profile listener ──────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    const driverRef = doc(db, 'drivers', userId);
    const unsubscribe = onSnapshot(driverRef, async (docSnap) => {
      if (docSnap.exists()) {
        setDriverProfile({ id: docSnap.id, ...docSnap.data() } as DriverProfile);
      } else {
        const user = auth.currentUser;
        if (user) {
          await setDoc(driverRef, {
            userId: user.uid,
            name: user.displayName || 'Conductor',
            email: user.email || '',
            phone: '',
            status: 'offline',
            isOnline: false,
            vehicleType: 'motorcycle',
            totalDeliveries: 0,
            rating: 5.0,
            ratingCount: 0,
            isVerified: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [userId]);

  // ── available orders listener ────────────────────────────────────────────
  useEffect(() => {
    if (!driverProfile?.isOnline) {
      setAvailableOrders([]);
      return;
    }
    const ordersQuery = query(
      collection(db, 'orders'),
      where('fulfillmentType', '==', 'delivery'),
      where('status', 'in', ['ready', 'confirmed', 'preparing']),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      const orders: DeliveryOrder[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        if (!data.driverId) {
          orders.push({
            id: d.id,
            orderId: data.orderId || d.id,
            status: data.status,
            deliveryStatus: 'available',
            vendorId: data.vendorId,
            vendorName: data.vendorName,
            vendorPhone: data.vendorPhone,
            vendorAddress: data.vendorAddress,
            vendorCoordinates: data.vendorCoordinates,
            customerId: data.customerId,
            customerName: data.customerInfo?.name || 'Cliente',
            customerPhone: data.customerInfo?.phone || '',
            deliveryAddress: data.deliveryAddress || {},
            items: data.items || [],
            deliveryFee: data.deliveryFee || 0,
            total: data.total || 0,
            trackingPin: data.trackingPin,
            createdAt: data.createdAt,
          });
        }
      });
      setAvailableOrders(orders);
    });
    return () => unsubscribe();
  }, [driverProfile?.isOnline]);

  // ── active order listener ────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    const currentOrderQuery = query(
      collection(db, 'orders'),
      where('driverId', '==', userId),
      where('status', 'in', ['claimed', 'picked_up', 'out_for_delivery'])
    );
    const unsubscribe = onSnapshot(currentOrderQuery, (snapshot) => {
      if (!snapshot.empty) {
        const d = snapshot.docs[0];
        const data = d.data();
        setCurrentOrder({
          id: d.id,
          orderId: data.orderId || d.id,
          status: data.status,
          deliveryStatus: data.deliveryStatus || 'claimed',
          vendorId: data.vendorId,
          vendorName: data.vendorName,
          vendorPhone: data.vendorPhone,
          vendorAddress: data.vendorAddress,
          vendorCoordinates: data.vendorCoordinates,
          customerId: data.customerId,
          customerName: data.customerInfo?.name || 'Cliente',
          customerPhone: data.customerInfo?.phone || '',
          deliveryAddress: data.deliveryAddress || {},
          items: data.items || [],
          deliveryFee: data.deliveryFee || 0,
          total: data.total || 0,
          trackingPin: data.trackingPin,
          createdAt: data.createdAt,
        });
      } else {
        setCurrentOrder(null);
      }
    });
    return () => unsubscribe();
  }, [userId]);

  // ── toggle online ────────────────────────────────────────────────────────
  const toggleOnlineStatus = async () => {
    if (!userId || !driverProfile) return;
    if (driverProfile.isOnline && currentOrder) {
      setError(t.errorGoingOffline);
      setTimeout(() => setError(null), 3000);
      return;
    }
    setTogglingStatus(true);
    try {
      await updateDoc(doc(db, 'drivers', userId), {
        isOnline: !driverProfile.isOnline,
        status: !driverProfile.isOnline ? 'available' : 'offline',
        currentLocation: driverLocation,
        lastLocationUpdate: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error toggling status:', err);
      setError(t.errorUpdating);
      setTimeout(() => setError(null), 3000);
    } finally {
      setTogglingStatus(false);
    }
  };

  // ── claim order ──────────────────────────────────────────────────────────
  const claimOrder = async (orderId: string) => {
    if (!userId || !driverProfile) return;
    setClaimingOrderId(orderId);
    setError(null);
    try {
      await runTransaction(db, async (transaction) => {
        const orderDoc = await transaction.get(doc(db, 'orders', orderId));
        if (!orderDoc.exists()) throw new Error('Order not found');
        if (orderDoc.data().driverId) throw new Error(t.orderTaken);
        transaction.update(doc(db, 'orders', orderId), {
          driverId: userId,
          driverName: driverProfile.name,
          driverPhone: driverProfile.phone,
          status: 'claimed',
          deliveryStatus: 'claimed',
          claimedAt: serverTimestamp(),
          driverLocation: driverLocation,
          updatedAt: serverTimestamp(),
        });
        transaction.update(doc(db, 'drivers', userId), {
          status: 'busy',
          currentOrderId: orderId,
          updatedAt: serverTimestamp(),
        });
      });
      setSuccessMessage(t.orderClaimed);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      setError((err as Error)?.message || t.errorClaiming);
      setTimeout(() => setError(null), 3000);
    } finally {
      setClaimingOrderId(null);
    }
  };

  // ── update order status ──────────────────────────────────────────────────
  const updateOrderStatus = async (newStatus: 'picked_up' | 'out_for_delivery' | 'delivered') => {
    if (!currentOrder || !userId) return;
    try {
      const updateData: Record<string, unknown> = {
        status: newStatus === 'picked_up' ? 'out_for_delivery' : newStatus,
        deliveryStatus: newStatus === 'delivered' ? 'delivered' : 'in_transit',
        updatedAt: serverTimestamp(),
      };
      if (newStatus === 'picked_up') updateData.pickedUpAt = serverTimestamp();
      if (newStatus === 'delivered') updateData.deliveredAt = serverTimestamp();
      await updateDoc(doc(db, 'orders', currentOrder.id), updateData);
      if (newStatus === 'delivered') {
        await updateDoc(doc(db, 'drivers', userId), {
          status: 'available',
          currentOrderId: null,
          updatedAt: serverTimestamp(),
        });
        setSuccessMessage(t.deliveryCompleted);
      } else {
        setSuccessMessage(t.pickupConfirmed);
      }
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error updating order:', err);
      setError(t.errorUpdating);
      setTimeout(() => setError(null), 3000);
    }
  };

  const openNavigation = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  const makeCall = (phone: string) => {
    if (phone) window.location.href = `tel:${phone}`;
  };

  // ── loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-purple-400 mx-auto" />
          <p className="text-gray-400 mt-3">Cargando...</p>
        </div>
      </div>
    );
  }

  // ── render ───────────────────────────────────────────────────────────────
  // Layout already provides: header (logo + status badge + globe + hamburger),
  //   bottom nav (Home / Delivery / History / Earnings / Account), slide-out menu, logout.
  // This page only renders content + the online/offline toggle above the nav.
  //
  // bottom-16 (4rem = 64px) positions the toggle just above layout's fixed bottom nav.
  // pb-32     gives enough scroll clearance for both the toggle and the nav.
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <main className="pb-32">
        {/* Welcome + Quick Stats */}
        <div className="px-4 py-6">
          <h1 className="text-2xl font-bold text-white">
            {t.greeting}, {driverProfile?.name?.split(' ')[0] || 'Conductor'} 👋
          </h1>

          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-gray-800/50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-white">{driverProfile?.totalDeliveries || 0}</p>
              <p className="text-xs text-gray-500">{t.todayDeliveries}</p>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-purple-400">$0.00</p>
              <p className="text-xs text-gray-500">{t.todayEarnings}</p>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-amber-400">⭐ {driverProfile?.rating?.toFixed(1) || '5.0'}</p>
              <p className="text-xs text-gray-500">{t.rating}</p>
            </div>
          </div>
        </div>

        {/* Toast Messages */}
        {error && (
          <div className="mx-4 mb-4 flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}
        {successMessage && (
          <div className="mx-4 mb-4 flex items-start gap-3 p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl">
            <CheckCircle className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-purple-300">{successMessage}</p>
          </div>
        )}

        {/* Active Order */}
        {currentOrder && (
          <div className="px-4 mb-6">
            <ActiveOrderCard
              order={currentOrder}
              t={t}
              onUpdateStatus={updateOrderStatus}
              onNavigate={openNavigation}
              onCall={makeCall}
            />
          </div>
        )}

        {/* Available Orders (online, no active order) */}
        {driverProfile?.isOnline && !currentOrder && (
          <div className="px-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">{t.availableOrders}</h2>
              <span className="text-sm text-gray-500">
                {availableOrders.length} {language === 'es' ? 'disponibles' : 'available'}
              </span>
            </div>
            {availableOrders.length === 0 ? (
              <div className="bg-gray-800/30 rounded-2xl p-8 text-center">
                <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="w-8 h-8 text-gray-500" />
                </div>
                <h3 className="text-lg font-medium text-gray-300 mb-1">{t.noOrdersTitle}</h3>
                <p className="text-sm text-gray-500">{t.noOrdersDesc}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {availableOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    t={t}
                    driverLocation={driverLocation}
                    claiming={claimingOrderId === order.id}
                    onClaim={() => claimOrder(order.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Offline prompt (offline, no active order) */}
        {!driverProfile?.isOnline && !currentOrder && (
          <div className="px-4">
            <div className="bg-gray-800/30 rounded-2xl p-8 text-center">
              <div className="w-20 h-20 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <PowerOff className="w-10 h-10 text-gray-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-300 mb-2">{t.youreOffline}</h3>
              <p className="text-gray-500 mb-6">{t.goOnlineDesc}</p>
            </div>
          </div>
        )}
      </main>

      {/* Online / Offline toggle ─ fixed above layout's bottom nav ─────────
          bottom-16 = 4rem = 64 px  (nav height ≈ 56-64 px)
          The nav itself is bottom-0. This bar floats directly on top of it.  */}
      <div className="fixed bottom-16 left-0 right-0 z-30 bg-gray-900/95 backdrop-blur-sm px-4 py-2">
        <button
          onClick={toggleOnlineStatus}
          disabled={togglingStatus || (driverProfile?.isOnline === true && !!currentOrder)}
          className={`w-full flex items-center justify-center gap-3 py-4 font-semibold rounded-xl transition-all ${
            driverProfile?.isOnline
              ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
              : 'bg-purple-600 text-white hover:bg-purple-700'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {togglingStatus ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : driverProfile?.isOnline ? (
            <PowerOff className="w-5 h-5" />
          ) : (
            <Power className="w-5 h-5" />
          )}
          <span>{driverProfile?.isOnline ? t.goOffline : t.goOnline}</span>
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// ORDER CARD
// ============================================================================
interface OrderCardProps {
  order: DeliveryOrder;
  t: typeof translations.es;
  driverLocation: { lat: number; lng: number } | null;
  claiming: boolean;
  onClaim: () => void;
}

function OrderCard({ order, t, driverLocation, claiming, onClaim }: OrderCardProps) {
  const createdAt =
    order.createdAt instanceof Timestamp ? order.createdAt.toDate() : new Date(order.createdAt);

  const distanceToPickup =
    driverLocation && order.vendorCoordinates
      ? `${calculateDistance(
          driverLocation.lat,
          driverLocation.lng,
          order.vendorCoordinates.lat,
          order.vendorCoordinates.lng
        ).toFixed(1)} km`
      : null;

  return (
    <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 overflow-hidden">
      <div className="p-4 border-b border-gray-700/50">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-700 rounded-xl flex items-center justify-center">
              <Store className="w-5 h-5 text-gray-400" />
            </div>
            <div>
              <p className="font-semibold text-white">{order.vendorName}</p>
              <p className="text-sm text-gray-500">
                {order.items?.length || 0} {t.items} • ${order.total?.toFixed(2)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-purple-400 font-semibold">
              <DollarSign className="w-4 h-4" />
              <span>{order.deliveryFee?.toFixed(2)}</span>
            </div>
            <p className="text-xs text-gray-500">{t.deliveryFee}</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            <Store className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{t.pickup}</p>
            <p className="text-sm text-white truncate">{order.vendorAddress || order.vendorName}</p>
            {distanceToPickup && (
              <p className="text-xs text-purple-400 mt-0.5">~{distanceToPickup} {t.away}</p>
            )}
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            <MapPin className="w-4 h-4 text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{t.deliverTo}</p>
            <p className="text-sm text-white truncate">
              {order.deliveryAddress?.street}, {order.deliveryAddress?.city}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{order.customerName}</p>
          </div>
        </div>
      </div>

      <div className="p-4 pt-0 flex items-center justify-between">
        <p className="text-xs text-gray-500">
          <Clock className="w-3.5 h-3.5 inline mr-1" />
          {formatTimeAgo(createdAt, t)}
        </p>
        <button
          onClick={onClaim}
          disabled={claiming}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-medium rounded-xl transition-all"
        >
          {claiming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          <span>{claiming ? t.claiming : t.claimOrder}</span>
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// ACTIVE ORDER CARD
// ============================================================================
interface ActiveOrderCardProps {
  order: DeliveryOrder;
  t: typeof translations.es;
  onUpdateStatus: (status: 'picked_up' | 'out_for_delivery' | 'delivered') => void;
  onNavigate: (lat: number, lng: number) => void;
  onCall: (phone: string) => void;
}

function ActiveOrderCard({ order, t, onUpdateStatus, onNavigate, onCall }: ActiveOrderCardProps) {
  const isPickedUp = order.status === 'out_for_delivery' || order.status === 'picked_up';
  const targetLocation = isPickedUp ? order.deliveryAddress?.coordinates : order.vendorCoordinates;
  const targetLabel = isPickedUp ? t.customer : t.vendor;
  const targetAddress = isPickedUp
    ? `${order.deliveryAddress?.street}, ${order.deliveryAddress?.city}`
    : order.vendorAddress || order.vendorName;

  return (
    <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 rounded-2xl border border-purple-500/30 overflow-hidden">
      <div className="bg-purple-500/20 px-4 py-2 border-b border-purple-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-purple-400">
              {isPickedUp ? t.deliveringOrder : t.headToPickup}
            </span>
          </div>
          <span className="text-xs text-gray-400">#{order.trackingPin || order.orderId.slice(-6)}</span>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isPickedUp ? 'bg-red-500/20' : 'bg-blue-500/20'}`}>
            {isPickedUp ? <MapPin className="w-5 h-5 text-red-400" /> : <Store className="w-5 h-5 text-blue-400" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{targetLabel}</p>
            <p className="text-white font-medium">{targetAddress}</p>
            {isPickedUp && order.deliveryAddress?.instructions && (
              <p className="text-sm text-amber-400 mt-1">📝 {order.deliveryAddress.instructions}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 bg-gray-800/50 rounded-xl px-3 py-2">
            <p className="text-xs text-gray-500">{isPickedUp ? t.customer : t.vendor}</p>
            <p className="text-sm text-white">{isPickedUp ? order.customerName : order.vendorName}</p>
          </div>
          <button
            onClick={() => onCall((isPickedUp ? order.customerPhone : order.vendorPhone) || '')}
            className="p-3 bg-gray-800/50 hover:bg-gray-700 rounded-xl transition-colors"
          >
            <Phone className="w-5 h-5 text-purple-400" />
          </button>
        </div>

        {targetLocation && (
          <button
            onClick={() => onNavigate(targetLocation.lat, targetLocation.lng)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl mb-3 transition-colors"
          >
            <Navigation className="w-5 h-5" />
            <span>{t.navigateTo} {targetLabel}</span>
            <ExternalLink className="w-4 h-4 ml-1 opacity-60" />
          </button>
        )}

        <div className="bg-gray-800/50 rounded-xl p-3 mb-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">{t.orderSummary}</p>
          <div className="space-y-1">
            {order.items?.slice(0, 3).map((item: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span className="text-gray-300">{item.quantity}x {item.name}</span>
                <span className="text-gray-500">${item.price?.toFixed(2)}</span>
              </div>
            ))}
            {(order.items?.length || 0) > 3 && (
              <p className="text-xs text-gray-500">
                {t.moreItems.replace('{n}', String((order.items?.length || 0) - 3))}
              </p>
            )}
          </div>
          <div className="border-t border-gray-700 mt-2 pt-2 flex justify-between">
            <span className="text-sm text-gray-400">{t.total}</span>
            <span className="text-sm font-semibold text-white">${order.total?.toFixed(2)}</span>
          </div>
        </div>

        {!isPickedUp ? (
          <button
            onClick={() => onUpdateStatus('picked_up')}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors"
          >
            <Package className="w-5 h-5" />
            <span>{t.confirmPickup}</span>
          </button>
        ) : (
          <button
            onClick={() => onUpdateStatus('delivered')}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors"
          >
            <CheckCircle className="w-5 h-5" />
            <span>{t.completeDelivery}</span>
          </button>
        )}

        {isPickedUp && order.trackingPin && (
          <div className="mt-3 text-center">
            <p className="text-xs text-gray-500">
              {t.deliveryPin}: <span className="text-purple-400 font-mono font-bold">{order.trackingPin}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}