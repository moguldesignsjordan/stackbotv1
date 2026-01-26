// src/app/driver/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  serverTimestamp,
  runTransaction,
  Timestamp,
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase/config';
import { signOut } from 'firebase/auth';
import {
  Truck,
  Package,
  MapPin,
  Clock,
  DollarSign,
  Navigation,
  Phone,
  ChevronRight,
  Power,
  PowerOff,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Loader2,
  Menu,
  X,
  User,
  LogOut,
  History,
  Settings,
  Store,
  Home,
  ExternalLink,
  Zap,
  Globe,
  Bell,
  MapPinned,
} from 'lucide-react';
import { DeliveryOrder, DriverProfile, DriverStatus } from '@/lib/types/driver';

// ============================================================================
// TRANSLATIONS
// ============================================================================
const translations = {
  es: {
    // Header
    greeting: 'Hola',
    online: 'En línea',
    offline: 'Desconectado',
    goOnline: 'Conectarse',
    goOffline: 'Desconectarse',
    
    // Status
    available: 'Disponible',
    busy: 'Ocupado',
    onBreak: 'En descanso',
    
    // Dashboard
    availableOrders: 'Pedidos Disponibles',
    noOrdersTitle: 'Sin pedidos disponibles',
    noOrdersDesc: 'Los nuevos pedidos aparecerán aquí automáticamente',
    refreshing: 'Actualizando...',
    
    // Order Card
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
    
    // Active Order
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
    instructions: 'Instrucciones',
    
    // Menu
    menu: 'Menú',
    dashboard: 'Panel Principal',
    orderHistory: 'Historial de Pedidos',
    earnings: 'Ganancias',
    settings: 'Configuración',
    backToStackBot: 'Volver a StackBot',
    logout: 'Cerrar Sesión',
    
    // Stats
    todayDeliveries: 'Entregas Hoy',
    todayEarnings: 'Ganancias Hoy',
    rating: 'Calificación',
    
    // Errors
    errorClaiming: 'Error al tomar el pedido',
    orderTaken: 'Este pedido ya fue tomado por otro conductor',
    errorUpdating: 'Error al actualizar estado',
    errorGoingOffline: 'No puedes desconectarte con un pedido activo',
    
    // Success
    orderClaimed: '¡Pedido tomado exitosamente!',
    pickupConfirmed: 'Recogida confirmada',
    deliveryCompleted: '¡Entrega completada!',
  },
  en: {
    // Header
    greeting: 'Hello',
    online: 'Online',
    offline: 'Offline',
    goOnline: 'Go Online',
    goOffline: 'Go Offline',
    
    // Status
    available: 'Available',
    busy: 'Busy',
    onBreak: 'On Break',
    
    // Dashboard
    availableOrders: 'Available Orders',
    noOrdersTitle: 'No available orders',
    noOrdersDesc: 'New orders will appear here automatically',
    refreshing: 'Refreshing...',
    
    // Order Card
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
    
    // Active Order
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
    instructions: 'Instructions',
    
    // Menu
    menu: 'Menu',
    dashboard: 'Dashboard',
    orderHistory: 'Order History',
    earnings: 'Earnings',
    settings: 'Settings',
    backToStackBot: 'Back to StackBot',
    logout: 'Logout',
    
    // Stats
    todayDeliveries: 'Today\'s Deliveries',
    todayEarnings: 'Today\'s Earnings',
    rating: 'Rating',
    
    // Errors
    errorClaiming: 'Error claiming order',
    orderTaken: 'This order was already taken by another driver',
    errorUpdating: 'Error updating status',
    errorGoingOffline: 'Cannot go offline with an active order',
    
    // Success
    orderClaimed: 'Order claimed successfully!',
    pickupConfirmed: 'Pickup confirmed',
    deliveryCompleted: 'Delivery completed!',
  },
};

type Language = 'es' | 'en';

// Haversine distance calculation
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
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

// Format time ago
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

export default function DriverDashboard() {
  const router = useRouter();
  const [language, setLanguage] = useState<Language>('es');
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [availableOrders, setAvailableOrders] = useState<DeliveryOrder[]>([]);
  const [currentOrder, setCurrentOrder] = useState<DeliveryOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [claimingOrderId, setClaimingOrderId] = useState<string | null>(null);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const t = translations[language];
  const userId = auth.currentUser?.uid;

  // Load saved language preference
  useEffect(() => {
    const savedLang = localStorage.getItem('stackbot-driver-lang') as Language;
    if (savedLang && (savedLang === 'es' || savedLang === 'en')) {
      setLanguage(savedLang);
    }
  }, []);

  // Toggle language
  const toggleLanguage = () => {
    const newLang = language === 'es' ? 'en' : 'es';
    setLanguage(newLang);
    localStorage.setItem('stackbot-driver-lang', newLang);
  };

  // Get driver's current location
  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setDriverLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (err) => {
        console.error('Geolocation error:', err);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 30000,
        timeout: 10000,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Fetch driver profile
  useEffect(() => {
    if (!userId) return;

    const driverRef = doc(db, 'drivers', userId);
    
    const unsubscribe = onSnapshot(driverRef, async (docSnap) => {
      if (docSnap.exists()) {
        setDriverProfile({ id: docSnap.id, ...docSnap.data() } as DriverProfile);
      } else {
        // Create driver profile if doesn't exist
        const user = auth.currentUser;
        if (user) {
          const newProfile: Partial<DriverProfile> = {
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
          };
          
          await setDoc(driverRef, newProfile);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  // Listen for available orders
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
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (!data.driverId) {
          orders.push({
            id: doc.id,
            orderId: data.orderId || doc.id,
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
            customerEmail: data.customerInfo?.email,
            deliveryAddress: data.deliveryAddress || {},
            items: data.items || [],
            subtotal: data.subtotal || 0,
            deliveryFee: data.deliveryFee || 0,
            total: data.total || 0,
            trackingPin: data.trackingPin,
            notes: data.notes,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          } as DeliveryOrder);
        }
      });

      setAvailableOrders(orders);
    });

    return () => unsubscribe();
  }, [driverProfile?.isOnline]);

  // Listen for current active order
  useEffect(() => {
    if (!userId) return;

    const currentOrderQuery = query(
      collection(db, 'orders'),
      where('driverId', '==', userId),
      where('status', 'in', ['claimed', 'picked_up', 'out_for_delivery'])
    );

    const unsubscribe = onSnapshot(currentOrderQuery, (snapshot) => {
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        const data = doc.data();
        setCurrentOrder({
          id: doc.id,
          orderId: data.orderId || doc.id,
          status: data.status,
          deliveryStatus: data.deliveryStatus || 'claimed',
          driverId: data.driverId,
          driverName: data.driverName,
          claimedAt: data.claimedAt,
          pickedUpAt: data.pickedUpAt,
          vendorId: data.vendorId,
          vendorName: data.vendorName,
          vendorPhone: data.vendorPhone,
          vendorAddress: data.vendorAddress,
          vendorCoordinates: data.vendorCoordinates,
          customerId: data.customerId,
          customerName: data.customerInfo?.name || 'Cliente',
          customerPhone: data.customerInfo?.phone || '',
          customerEmail: data.customerInfo?.email,
          deliveryAddress: data.deliveryAddress || {},
          items: data.items || [],
          subtotal: data.subtotal || 0,
          deliveryFee: data.deliveryFee || 0,
          total: data.total || 0,
          trackingPin: data.trackingPin,
          notes: data.notes,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        } as DeliveryOrder);
      } else {
        setCurrentOrder(null);
      }
    });

    return () => unsubscribe();
  }, [userId]);

  // Toggle online/offline status
  const toggleOnlineStatus = async () => {
    if (!userId || !driverProfile) return;

    // Prevent going offline with active order
    if (driverProfile.isOnline && currentOrder) {
      setError(t.errorGoingOffline);
      setTimeout(() => setError(null), 3000);
      return;
    }

    setTogglingStatus(true);

    try {
      const driverRef = doc(db, 'drivers', userId);
      await updateDoc(driverRef, {
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

  // Claim an order
  const claimOrder = async (orderId: string) => {
    if (!userId || !driverProfile) return;

    setClaimingOrderId(orderId);
    setError(null);

    try {
      const orderRef = doc(db, 'orders', orderId);
      const driverRef = doc(db, 'drivers', userId);

      await runTransaction(db, async (transaction) => {
        const orderDoc = await transaction.get(orderRef);
        
        if (!orderDoc.exists()) {
          throw new Error('Order not found');
        }

        const orderData = orderDoc.data();

        if (orderData.driverId) {
          throw new Error(t.orderTaken);
        }

        transaction.update(orderRef, {
          driverId: userId,
          driverName: driverProfile.name,
          driverPhone: driverProfile.phone,
          status: 'claimed',
          deliveryStatus: 'claimed',
          claimedAt: serverTimestamp(),
          driverLocation: driverLocation,
          updatedAt: serverTimestamp(),
        });

        transaction.update(driverRef, {
          status: 'busy',
          currentOrderId: orderId,
          updatedAt: serverTimestamp(),
        });
      });

      setSuccessMessage(t.orderClaimed);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      console.error('Error claiming order:', err);
      const errorMessage = (err as Error)?.message || t.errorClaiming;
      setError(errorMessage);
      setTimeout(() => setError(null), 3000);
    } finally {
      setClaimingOrderId(null);
    }
  };

  // Update order status
  const updateOrderStatus = async (newStatus: 'picked_up' | 'out_for_delivery' | 'delivered') => {
    if (!currentOrder || !userId) return;

    try {
      const orderRef = doc(db, 'orders', currentOrder.id);
      const driverRef = doc(db, 'drivers', userId);

      const updateData: Record<string, unknown> = {
        status: newStatus === 'picked_up' ? 'out_for_delivery' : newStatus,
        deliveryStatus: newStatus === 'delivered' ? 'delivered' : 'in_transit',
        updatedAt: serverTimestamp(),
      };

      if (newStatus === 'picked_up') {
        updateData.pickedUpAt = serverTimestamp();
      } else if (newStatus === 'delivered') {
        updateData.deliveredAt = serverTimestamp();
      }

      await updateDoc(orderRef, updateData);

      // If delivered, free up the driver
      if (newStatus === 'delivered') {
        await updateDoc(driverRef, {
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

  // Open navigation
  const openNavigation = (lat: number, lng: number, label?: string) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_blank');
  };

  // Make phone call
  const makeCall = (phone: string) => {
    if (phone) {
      window.location.href = `tel:${phone}`;
    }
  };

  // Logout
  const handleLogout = async () => {
    try {
      if (driverProfile?.isOnline) {
        const driverRef = doc(db, 'drivers', userId!);
        await updateDoc(driverRef, {
          isOnline: false,
          status: 'offline',
          updatedAt: serverTimestamp(),
        });
      }
      await signOut(auth);
      router.push('/driver/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Loading state
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

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 safe-top">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Menu Button */}
          <button
            onClick={() => setMenuOpen(true)}
            className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                driverProfile?.isOnline ? 'bg-purple-400 animate-pulse' : 'bg-gray-500'
              }`}
            />
            <span className="text-sm font-medium text-gray-300">
              {driverProfile?.isOnline ? t.online : t.offline}
            </span>
          </div>

          {/* Language Toggle */}
          <button
            onClick={toggleLanguage}
            className="p-2 -mr-2 text-gray-400 hover:text-white transition-colors"
          >
            <Globe className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-32">
        {/* Welcome Section */}
        <div className="px-4 py-6">
          <h1 className="text-2xl font-bold text-white">
            {t.greeting}, {driverProfile?.name?.split(' ')[0] || 'Conductor'} 👋
          </h1>
          
          {/* Quick Stats */}
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
          <div className="mx-4 mb-4 flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl animate-fade-in">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="mx-4 mb-4 flex items-start gap-3 p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl animate-fade-in">
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

        {/* Available Orders */}
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

        {/* Offline State */}
        {!driverProfile?.isOnline && !currentOrder && (
          <div className="px-4">
            <div className="bg-gray-800/30 rounded-2xl p-8 text-center">
              <div className="w-20 h-20 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <PowerOff className="w-10 h-10 text-gray-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-300 mb-2">
                {language === 'es' ? 'Estás desconectado' : "You're offline"}
              </h3>
              <p className="text-gray-500 mb-6">
                {language === 'es' 
                  ? 'Conéctate para ver y tomar pedidos disponibles'
                  : 'Go online to see and claim available orders'}
              </p>
              <button
                onClick={toggleOnlineStatus}
                disabled={togglingStatus}
                className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-all"
              >
                {togglingStatus ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Power className="w-5 h-5" />
                )}
                <span>{t.goOnline}</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Status Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 safe-bottom z-30">
        <div className="px-4 py-4">
          <button
            onClick={toggleOnlineStatus}
            disabled={togglingStatus || (driverProfile?.isOnline && !!currentOrder)}
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

      {/* Slide-out Menu */}
      <div
        className={`fixed inset-0 z-50 transition-opacity duration-300 ${
          menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setMenuOpen(false)}
        />
        
        <div
          className={`absolute left-0 top-0 bottom-0 w-72 bg-gray-800 border-r border-gray-700 transition-transform duration-300 safe-top ${
            menuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Profile */}
          <div className="p-6 border-b border-gray-700">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-purple-500/20 rounded-full flex items-center justify-center border border-purple-500/30">
                <User className="w-7 h-7 text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">{driverProfile?.name}</p>
                <p className="text-sm text-gray-500 truncate">{driverProfile?.email}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="p-4 space-y-1">
            <button
              onClick={() => {
                setMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-purple-400 bg-purple-500/10 rounded-xl"
            >
              <Truck className="w-5 h-5" />
              <span>{t.dashboard}</span>
            </button>

            <button
              onClick={() => {
                setMenuOpen(false);
                router.push('/driver/history');
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-700/50 rounded-xl transition-colors"
            >
              <History className="w-5 h-5" />
              <span>{t.orderHistory}</span>
            </button>

            <button
              onClick={() => {
                setMenuOpen(false);
                router.push('/driver/settings');
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-700/50 rounded-xl transition-colors"
            >
              <Settings className="w-5 h-5" />
              <span>{t.settings}</span>
            </button>

            <Link
              href="/"
              className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-700/50 rounded-xl transition-colors"
            >
              <Home className="w-5 h-5" />
              <span>{t.backToStackBot}</span>
            </Link>
          </nav>

          {/* Logout */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700 safe-bottom">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>{t.logout}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Order Card Component
// ============================================================================
interface OrderCardProps {
  order: DeliveryOrder;
  t: typeof translations.es;
  driverLocation: { lat: number; lng: number } | null;
  claiming: boolean;
  onClaim: () => void;
}

function OrderCard({ order, t, driverLocation, claiming, onClaim }: OrderCardProps) {
  const createdAt = order.createdAt instanceof Timestamp 
    ? order.createdAt.toDate() 
    : new Date(order.createdAt);

  const distanceToPickup = driverLocation && order.vendorCoordinates
    ? `${calculateDistance(
        driverLocation.lat,
        driverLocation.lng,
        order.vendorCoordinates.lat,
        order.vendorCoordinates.lng
      ).toFixed(1)} km`
    : null;

  return (
    <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 overflow-hidden">
      {/* Header */}
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

      {/* Locations */}
      <div className="p-4 space-y-3">
        {/* Pickup */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            <Store className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{t.pickup}</p>
            <p className="text-sm text-white truncate">
              {order.vendorAddress || order.vendorName}
            </p>
            {distanceToPickup && (
              <p className="text-xs text-purple-400 mt-0.5">
                ~{distanceToPickup} {t.away}
              </p>
            )}
          </div>
        </div>

        {/* Delivery */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            <MapPin className="w-4 h-4 text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{t.deliverTo}</p>
            <p className="text-sm text-white truncate">
              {order.deliveryAddress?.street}, {order.deliveryAddress?.city}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {order.customerName}
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
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
          {claiming ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Zap className="w-4 h-4" />
          )}
          <span>{claiming ? t.claiming : t.claimOrder}</span>
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Active Order Card Component
// ============================================================================
interface ActiveOrderCardProps {
  order: DeliveryOrder;
  t: typeof translations.es;
  onUpdateStatus: (status: 'picked_up' | 'out_for_delivery' | 'delivered') => void;
  onNavigate: (lat: number, lng: number, label?: string) => void;
  onCall: (phone: string) => void;
}

function ActiveOrderCard({
  order,
  t,
  onUpdateStatus,
  onNavigate,
  onCall,
}: ActiveOrderCardProps) {
  const isPickedUp = order.status === 'out_for_delivery' || order.status === 'picked_up';
  const targetLocation = isPickedUp
    ? order.deliveryAddress?.coordinates
    : order.vendorCoordinates;
  const targetLabel = isPickedUp ? t.customer : t.vendor;
  const targetAddress = isPickedUp
    ? `${order.deliveryAddress?.street}, ${order.deliveryAddress?.city}`
    : order.vendorAddress || order.vendorName;

  return (
    <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 rounded-2xl border border-purple-500/30 overflow-hidden">
      {/* Status Banner */}
      <div className="bg-purple-500/20 px-4 py-2 border-b border-purple-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-purple-400">
              {isPickedUp ? t.deliveringOrder : t.headToPickup}
            </span>
          </div>
          <span className="text-xs text-gray-400">
            #{order.trackingPin || order.orderId.slice(-6)}
          </span>
        </div>
      </div>

      {/* Destination */}
      <div className="p-4">
        <div className="flex items-start gap-3 mb-4">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isPickedUp ? 'bg-red-500/20' : 'bg-blue-500/20'
            }`}
          >
            {isPickedUp ? (
              <MapPin className="w-5 h-5 text-red-400" />
            ) : (
              <Store className="w-5 h-5 text-blue-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              {targetLabel}
            </p>
            <p className="text-white font-medium">{targetAddress}</p>
            {isPickedUp && order.deliveryAddress?.instructions && (
              <p className="text-sm text-amber-400 mt-1">
                📝 {order.deliveryAddress.instructions}
              </p>
            )}
          </div>
        </div>

        {/* Contact Info */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 bg-gray-800/50 rounded-xl px-3 py-2">
            <p className="text-xs text-gray-500">
              {isPickedUp ? t.customer : t.vendor}
            </p>
            <p className="text-sm text-white">
              {isPickedUp ? order.customerName : order.vendorName}
            </p>
          </div>
          <button
            onClick={() =>
              onCall(isPickedUp ? order.customerPhone : order.vendorPhone || '')
            }
            className="p-3 bg-gray-800/50 hover:bg-gray-700 rounded-xl transition-colors"
          >
            <Phone className="w-5 h-5 text-purple-400" />
          </button>
        </div>

        {/* Navigation Button */}
        {targetLocation && (
          <button
            onClick={() =>
              onNavigate(targetLocation.lat, targetLocation.lng, targetLabel)
            }
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl mb-3 transition-colors"
          >
            <Navigation className="w-5 h-5" />
            <span>{t.navigateTo} {targetLabel}</span>
            <ExternalLink className="w-4 h-4 ml-1 opacity-60" />
          </button>
        )}

        {/* Order Items Summary */}
        <div className="bg-gray-800/50 rounded-xl p-3 mb-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
            {t.orderSummary}
          </p>
          <div className="space-y-1">
            {order.items?.slice(0, 3).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span className="text-gray-300">
                  {item.quantity}x {item.name}
                </span>
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
            <span className="text-sm font-semibold text-white">
              ${order.total?.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Action Button */}
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

        {/* Tracking PIN (show when delivering) */}
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