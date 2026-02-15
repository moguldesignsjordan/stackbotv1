// src/app/driver/dashboard/page.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  Timestamp,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage, functions } from '@/lib/firebase/config';
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
  Zap,
  Camera,
  X,
  ExternalLink,
  Locate,
} from 'lucide-react';

// ============================================================================
// CONSTANTS
// ============================================================================
const MAX_ORDER_DISTANCE_KM = 8; // Maximum distance in kilometers for order visibility

// ============================================================================
// TYPES
// ============================================================================
type DriverStatus = 'online' | 'offline' | 'busy' | 'break';
type LocationStatus = 'loading' | 'granted' | 'denied' | 'unavailable' | 'unsupported';

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
  customerEmail?: string;
  deliveryAddress?: any;
  deliveryFee: number;
  subtotal?: number;
  total?: number;
  itemCount?: number;
  orderTotal?: number;
  driverId?: string;
  driverName?: string;
  claimedAt?: any;
  pickedUpAt?: any;
  deliveredAt?: any;
  createdAt?: any;
  updatedAt?: any;
  notes?: string;
  proofOfDeliveryUrl?: string;
}

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
    noOrdersInRange: 'No hay pedidos dentro de 8km de tu ubicación',
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

    // Proof of Delivery
    takePhoto: 'Tomar Foto de Entrega',
    retakePhoto: 'Volver a Tomar',
    photoRequired: 'Se requiere foto para completar',
    uploadingPhoto: 'Subiendo foto...',
    photoUploaded: 'Foto subida exitosamente',
    photoError: 'Error al subir foto',

    // Stats
    todayDeliveries: 'Entregas Hoy',
    todayEarnings: 'Ganancias Hoy',
    rating: 'Calificación',

    // Errors
    errorClaiming: 'Error al tomar el pedido',
    orderTaken: 'Este pedido ya fue tomado por otro conductor',
    errorUpdating: 'Error al actualizar estado',
    errorGoingOffline: 'No puedes desconectarte con un pedido activo',
    locationRequired: 'Se necesita tu ubicación para ver pedidos cercanos',

    // Location
    locationBlocked: 'Ubicación bloqueada',
    locationLoading: 'Obteniendo ubicación...',
    locationUnavailable: 'Ubicación no disponible',
    locationDeniedDesc: 'Habilita el GPS en la configuración de tu navegador o dispositivo para ver distancias. Los pedidos se muestran sin filtro de distancia.',
    locationFallbackDesc: 'Los pedidos se muestran sin filtro de distancia.',
    retryLocation: 'Reintentar ubicación',
    locationActive: 'GPS activo',

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
    noOrdersInRange: 'No orders within 8km of your location',
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

    // Proof of Delivery
    takePhoto: 'Take Delivery Photo',
    retakePhoto: 'Retake Photo',
    photoRequired: 'Photo required to complete',
    uploadingPhoto: 'Uploading photo...',
    photoUploaded: 'Photo uploaded successfully',
    photoError: 'Error uploading photo',

    // Stats
    todayDeliveries: "Today's Deliveries",
    todayEarnings: "Today's Earnings",
    rating: 'Rating',

    // Errors
    errorClaiming: 'Error claiming order',
    orderTaken: 'This order was already taken by another driver',
    errorUpdating: 'Error updating status',
    errorGoingOffline: 'Cannot go offline with an active order',
    locationRequired: 'Your location is needed to see nearby orders',

    // Location
    locationBlocked: 'Location blocked',
    locationLoading: 'Getting location...',
    locationUnavailable: 'Location unavailable',
    locationDeniedDesc: 'Enable GPS in your browser or device settings to see distances. Orders are shown without distance filter.',
    locationFallbackDesc: 'Orders shown without distance filter.',
    retryLocation: 'Retry Location',
    locationActive: 'GPS active',

    // Success
    orderClaimed: 'Order claimed successfully!',
    pickupConfirmed: 'Pickup confirmed',
    deliveryCompleted: 'Delivery completed!',
  },
};

type Language = 'es' | 'en';

// ============================================================================
// HELPERS
// ============================================================================

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

// Build Google Maps navigation URL
function buildNavigationUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
}

// Build Google Maps location URL (for viewing)
function buildLocationUrl(address: string, lat?: number, lng?: number): string {
  if (lat && lng) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function DriverDashboard() {
  const [language, setLanguage] = useState<Language>('es');
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [availableOrders, setAvailableOrders] = useState<DeliveryOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<DeliveryOrder[]>([]);
  const [currentOrder, setCurrentOrder] = useState<DeliveryOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [claimingOrderId, setClaimingOrderId] = useState<string | null>(null);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ── NEW: location permission tracking ─────────────────────────
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('loading');
  const [locationRetryCount, setLocationRetryCount] = useState(0);
  const watchIdRef = useRef<number | null>(null);

  const t = translations[language];
  const userId = auth.currentUser?.uid;

  // Load saved language preference
  useEffect(() => {
    const savedLang = localStorage.getItem('stackbot-driver-lang') as Language;
    if (savedLang && (savedLang === 'es' || savedLang === 'en')) {
      setLanguage(savedLang);
    }
  }, []);

  // ── FIX 1: Permission-aware geolocation with retry ────────────
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus('unsupported');
      return;
    }

    setLocationStatus('loading');

    // Clear any existing watcher
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    // One-shot first — triggers the browser/OS permission prompt immediately
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDriverLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationStatus('granted');
      },
      (err) => {
        console.warn('getCurrentPosition error:', err.code, err.message);
        if (err.code === 1) {
          // PERMISSION_DENIED
          setLocationStatus('denied');
        } else {
          setLocationStatus('unavailable');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    // Continuous watcher for ongoing position updates
    const id = navigator.geolocation.watchPosition(
      (position) => {
        setDriverLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationStatus('granted');
      },
      (err) => {
        console.warn('watchPosition error:', err.code, err.message);
        if (err.code === 1) {
          setLocationStatus('denied');
        }
        // Don't overwrite 'granted' if we already have a position
      },
      {
        enableHighAccuracy: true,
        maximumAge: 30000,
        timeout: 15000,
      }
    );

    watchIdRef.current = id;
  }, []);

  // Initial request + cleanup — re-runs on retry
  useEffect(() => {
    requestLocation();

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationRetryCount]);

  // Retry handler for the UI button
  const retryLocation = useCallback(() => {
    setLocationRetryCount((c) => c + 1);
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

  // ── FIX 2: Show ALL orders when no location (fallback) ────────
  useEffect(() => {
    if (!driverLocation) {
      // FALLBACK: show all available orders unsorted so drivers
      // aren't staring at an empty screen while GPS resolves
      setFilteredOrders(availableOrders);
      return;
    }

    const nearby = availableOrders.filter((order) => {
      if (!order.vendorCoordinates?.lat || !order.vendorCoordinates?.lng) {
        // If no coordinates, include the order (fallback)
        return true;
      }

      const distance = calculateDistance(
        driverLocation.lat,
        driverLocation.lng,
        order.vendorCoordinates.lat,
        order.vendorCoordinates.lng
      );

      return distance <= MAX_ORDER_DISTANCE_KM;
    });

    // Sort by distance (closest first)
    nearby.sort((a, b) => {
      const distA = a.vendorCoordinates
        ? calculateDistance(
            driverLocation.lat,
            driverLocation.lng,
            a.vendorCoordinates.lat,
            a.vendorCoordinates.lng
          )
        : Infinity;
      const distB = b.vendorCoordinates
        ? calculateDistance(
            driverLocation.lat,
            driverLocation.lng,
            b.vendorCoordinates.lat,
            b.vendorCoordinates.lng
          )
        : Infinity;
      return distA - distB;
    });

    setFilteredOrders(nearby);
  }, [availableOrders, driverLocation]);

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
          proofOfDeliveryUrl: data.proofOfDeliveryUrl,
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

  // ============================================================================
  // Claim an order via Cloud Function
  // The CF handles: driver verification, status validation, cross-collection
  // sync (orders, vendors/orders, customers/orders, drivers), and customer
  // notification — all via Admin SDK (bypasses Firestore rules).
  // ============================================================================
  const claimOrder = async (orderId: string) => {
    if (!userId || !driverProfile) return;

    setClaimingOrderId(orderId);
    setError(null);

    try {
      const claimOrderFn = httpsCallable(functions, 'claimOrder');
      await claimOrderFn({ orderId });

      setSuccessMessage(t.orderClaimed);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      console.error('Error claiming order:', err);
      // httpsCallable errors expose .message (general) and .details (HttpsError reason)
      const firebaseErr = err as { message?: string; code?: string; details?: string };
      const errorMessage =
        firebaseErr.details || firebaseErr.message || t.errorClaiming;
      setError(errorMessage);
      setTimeout(() => setError(null), 3000);
    } finally {
      setClaimingOrderId(null);
    }
  };

  // Update order status
  const updateOrderStatus = async (
    newStatus: 'picked_up' | 'out_for_delivery' | 'delivered',
    proofOfDeliveryUrl?: string
  ) => {
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
        if (proofOfDeliveryUrl) {
          updateData.proofOfDeliveryUrl = proofOfDeliveryUrl;
        }
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
    const url = buildNavigationUrl(lat, lng);
    window.open(url, '_blank');
  };

  // Make phone call
  const makeCall = (phone: string) => {
    if (phone) {
      window.location.href = `tel:${phone}`;
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-[#55529d] mx-auto" />
          <p className="text-gray-500 mt-3">
            {language === 'es' ? 'Cargando...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="text-gray-900">
      {/* Main Content — extra bottom padding for the online/offline bar + bottom nav */}
      <main className="pb-44">
        {/* Welcome Section */}
        <div className="px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {t.greeting}, {driverProfile?.name?.split(' ')[0] || 'Conductor'} 👋
          </h1>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
              <p className="text-2xl font-bold text-gray-900">
                {driverProfile?.totalDeliveries || 0}
              </p>
              <p className="text-xs text-gray-500">{t.todayDeliveries}</p>
            </div>
            <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
              <p className="text-2xl font-bold text-[#55529d]">$0.00</p>
              <p className="text-xs text-gray-500">{t.todayEarnings}</p>
            </div>
            <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
              <p className="text-2xl font-bold text-amber-500">
                ⭐ {driverProfile?.rating?.toFixed(1) || '5.0'}
              </p>
              <p className="text-xs text-gray-500">{t.rating}</p>
            </div>
          </div>
        </div>

        {/* Toast Messages */}
        {error && (
          <div className="mx-4 mb-4 flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="mx-4 mb-4 flex items-start gap-3 p-3 bg-purple-50 border border-purple-200 rounded-xl">
            <CheckCircle className="w-5 h-5 text-[#55529d] flex-shrink-0 mt-0.5" />
            <p className="text-sm text-purple-700">{successMessage}</p>
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
              <h2 className="text-lg font-semibold text-gray-900">{t.availableOrders}</h2>
              <span className="text-sm text-gray-500">
                {filteredOrders.length} {language === 'es' ? 'disponibles' : 'available'}
                {driverLocation && (
                  <span className="text-green-500 ml-1">
                    <Locate className="w-3 h-3 inline" />
                  </span>
                )}
              </span>
            </div>

            {/* ── FIX 3: Actionable location banner ──────────────── */}
            {!driverLocation && (
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-800">
                      {locationStatus === 'denied'
                        ? t.locationBlocked
                        : locationStatus === 'loading'
                        ? t.locationLoading
                        : t.locationUnavailable}
                    </p>
                    <p className="text-xs text-amber-700 mt-1">
                      {locationStatus === 'denied'
                        ? t.locationDeniedDesc
                        : t.locationFallbackDesc}
                    </p>
                  </div>
                </div>
                {locationStatus !== 'loading' && (
                  <button
                    onClick={retryLocation}
                    className="mt-3 w-full flex items-center justify-center gap-2 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 text-sm font-medium rounded-lg transition-colors"
                  >
                    <Navigation className="w-4 h-4" />
                    {t.retryLocation}
                  </button>
                )}
                {locationStatus === 'loading' && (
                  <div className="mt-3 flex items-center justify-center gap-2 py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                  </div>
                )}
              </div>
            )}

            {filteredOrders.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-700 mb-1">{t.noOrdersTitle}</h3>
                <p className="text-sm text-gray-500">
                  {driverLocation ? t.noOrdersInRange : t.noOrdersDesc}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => (
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
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <PowerOff className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
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
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#55529d] hover:bg-[#444280] text-white font-semibold rounded-xl transition-all disabled:opacity-50"
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

      {/* ── Online/Offline Toggle ─────────────────────────────────────
           Positioned ABOVE the layout's bottom nav (bottom-[4.5rem])
           so it stays visible and tappable.
           z-40 keeps it below the layout nav (z-50) stacking context
           but visually it sits in the gap above it.
      ─────────────────────────────────────────────────────────────── */}
      <div className="fixed bottom-[4.5rem] left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 z-40 safe-bottom">
        <div className="px-4 py-3">
          <button
            onClick={toggleOnlineStatus}
            disabled={togglingStatus || (driverProfile?.isOnline && !!currentOrder)}
            className={`w-full flex items-center justify-center gap-3 py-3.5 font-semibold rounded-xl transition-all ${
              driverProfile?.isOnline
                ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                : 'bg-[#55529d] text-white hover:bg-[#444280]'
            } disabled:opacity-50`}
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
    </div>
  );
}

// ============================================================================
// Order Card Component - WITH NAVIGATION LINK
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
      ? calculateDistance(
          driverLocation.lat,
          driverLocation.lng,
          order.vendorCoordinates.lat,
          order.vendorCoordinates.lng
        ).toFixed(1)
      : null;

  // Build navigation URL for vendor pickup
  const pickupNavUrl = order.vendorCoordinates
    ? buildNavigationUrl(order.vendorCoordinates.lat, order.vendorCoordinates.lng)
    : buildLocationUrl(order.vendorAddress || order.vendorName);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
              <Store className="w-5 h-5 text-gray-500" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{order.vendorName}</p>
              <p className="text-sm text-gray-500">
                {order.items?.length || 0} {t.items} • ${order.total?.toFixed(2)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-[#55529d] font-semibold">
              <DollarSign className="w-4 h-4" />
              <span>{order.deliveryFee?.toFixed(2)}</span>
            </div>
            <p className="text-xs text-gray-500">{t.deliveryFee}</p>
          </div>
        </div>
      </div>

      {/* Locations */}
      <div className="p-4 space-y-3">
        {/* Pickup - Clickable Navigation Link */}
        <a
          href={pickupNavUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-3 p-2 -m-2 rounded-xl hover:bg-blue-50 transition-colors group"
        >
          <div className="w-8 h-8 bg-blue-50 group-hover:bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors">
            <Store className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 uppercase tracking-wide flex items-center gap-1">
              {t.pickup}
              <ExternalLink className="w-3 h-3 text-blue-400" />
            </p>
            <p className="text-sm text-gray-900 truncate group-hover:text-blue-600 transition-colors">
              {order.vendorAddress || order.vendorName}
            </p>
            {distanceToPickup && (
              <p className="text-xs text-[#55529d] mt-0.5">
                ~{distanceToPickup} km {t.away}
              </p>
            )}
          </div>
          <Navigation className="w-4 h-4 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity mt-2" />
        </a>

        {/* Delivery */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            <MapPin className="w-4 h-4 text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{t.deliverTo}</p>
            <p className="text-sm text-gray-900 truncate">
              {order.deliveryAddress?.street}, {order.deliveryAddress?.city}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{order.customerName}</p>
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
          className="flex items-center gap-2 px-4 py-2 bg-[#55529d] hover:bg-[#444280] disabled:bg-gray-300 text-white font-medium rounded-xl transition-all"
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
// Active Order Card Component - WITH PHOTO CAPTURE
// ============================================================================
interface ActiveOrderCardProps {
  order: DeliveryOrder;
  t: typeof translations.es;
  onUpdateStatus: (status: 'picked_up' | 'out_for_delivery' | 'delivered', proofUrl?: string) => void;
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
  const [proofPhoto, setProofPhoto] = useState<string | null>(null);
  const [proofPhotoFile, setProofPhotoFile] = useState<File | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isPickedUp = order.status === 'out_for_delivery' || order.status === 'picked_up';
  const targetLocation = isPickedUp
    ? order.deliveryAddress?.coordinates
    : order.vendorCoordinates;
  const targetLabel = isPickedUp ? t.customer : t.vendor;
  const targetAddress = isPickedUp
    ? `${order.deliveryAddress?.street}, ${order.deliveryAddress?.city}`
    : order.vendorAddress || order.vendorName;

  // Build navigation URL
  const navUrl = targetLocation
    ? buildNavigationUrl(targetLocation.lat, targetLocation.lng)
    : buildLocationUrl(targetAddress);

  // Handle photo capture
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setProofPhoto(previewUrl);
      setProofPhotoFile(file);
      setPhotoError(null);
    }
  };

  // Clear photo
  const clearPhoto = () => {
    if (proofPhoto) {
      URL.revokeObjectURL(proofPhoto);
    }
    setProofPhoto(null);
    setProofPhotoFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Upload photo and complete delivery
  const handleCompleteDelivery = async () => {
    if (!proofPhotoFile) {
      setPhotoError(t.photoRequired);
      return;
    }

    setUploadingPhoto(true);
    setPhotoError(null);

    try {
      // Upload to Firebase Storage
      const timestamp = Date.now();
      const fileName = `proof_${order.id}_${timestamp}.jpg`;
      const storageRef = ref(storage, `deliveries/${order.id}/${fileName}`);
      
      // Upload the file
      await uploadBytes(storageRef, proofPhotoFile, {
        contentType: proofPhotoFile.type || 'image/jpeg',
        customMetadata: {
          orderId: order.id,
          driverId: auth.currentUser?.uid || '',
          uploadedAt: new Date().toISOString(),
        },
      });

      // Get download URL
      const downloadUrl = await getDownloadURL(storageRef);

      // Complete delivery with proof URL
      onUpdateStatus('delivered', downloadUrl);

      // Clean up
      clearPhoto();
    } catch (error) {
      console.error('Error uploading proof photo:', error);
      setPhotoError(t.photoError);
    } finally {
      setUploadingPhoto(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-[#55529d]/10 to-[#55529d]/5 rounded-2xl border border-[#55529d]/20 overflow-hidden">
      {/* Status Banner */}
      <div className="bg-[#55529d]/10 px-4 py-2 border-b border-[#55529d]/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-[#55529d]" />
            <span className="text-sm font-medium text-[#55529d]">
              {isPickedUp ? t.deliveringOrder : t.headToPickup}
            </span>
          </div>
          <span className="text-xs text-gray-500">#{order.orderId}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Target Location - Clickable Link */}
        <a
          href={navUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-3 p-2 -m-2 rounded-xl hover:bg-[#55529d]/10 transition-colors group"
        >
          <div className="w-10 h-10 bg-[#55529d]/10 group-hover:bg-[#55529d]/20 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors">
            {isPickedUp ? (
              <MapPin className="w-5 h-5 text-[#55529d]" />
            ) : (
              <Store className="w-5 h-5 text-[#55529d]" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 uppercase tracking-wide flex items-center gap-1">
              {t.navigateTo} {targetLabel}
              <ExternalLink className="w-3 h-3 text-[#55529d]" />
            </p>
            <p className="text-sm text-gray-900 font-medium truncate group-hover:text-[#55529d] transition-colors">
              {targetAddress}
            </p>
          </div>
          <Navigation className="w-5 h-5 text-[#55529d] mt-2" />
        </a>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {targetLocation && (
            <button
              onClick={() => onNavigate(targetLocation.lat, targetLocation.lng)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors"
            >
              <Navigation className="w-4 h-4" />
              <span className="text-sm font-medium">{t.navigate}</span>
            </button>
          )}
          {(isPickedUp ? order.customerPhone : order.vendorPhone) && (
            <button
              onClick={() => onCall((isPickedUp ? order.customerPhone : order.vendorPhone) || '')}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-50 text-green-600 border border-green-200 rounded-xl hover:bg-green-100 transition-colors"
            >
              <Phone className="w-4 h-4" />
              <span className="text-sm font-medium">{t.call}</span>
            </button>
          )}
        </div>

        {/* Order Summary */}
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">{t.orderSummary}</p>
          <div className="space-y-1">
            {order.items?.slice(0, 3).map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="text-gray-700 truncate">
                  {item.quantity}x {item.name}
                </span>
                <span className="text-gray-500 ml-2">${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            {(order.items?.length || 0) > 3 && (
              <p className="text-xs text-gray-500">
                {t.moreItems.replace('{n}', String((order.items?.length || 0) - 3))}
              </p>
            )}
          </div>
          <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between text-sm font-semibold">
            <span className="text-gray-700">{t.total}</span>
            <span className="text-gray-900">${order.total?.toFixed(2)}</span>
          </div>
        </div>

        {/* Tracking PIN */}
        {isPickedUp && order.trackingPin && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
            <p className="text-xs text-amber-600 mb-1">{t.deliveryPin}</p>
            <p className="text-2xl font-mono font-bold text-amber-700 tracking-widest">
              {order.trackingPin}
            </p>
          </div>
        )}

        {/* Proof of Delivery Photo Section - Only show when delivering */}
        {isPickedUp && (
          <div className="space-y-3">
            {/* Photo Preview */}
            {proofPhoto ? (
              <div className="relative">
                <img
                  src={proofPhoto}
                  alt="Proof of delivery"
                  className="w-full h-48 object-cover rounded-xl border border-gray-200"
                />
                <button
                  onClick={clearPhoto}
                  className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoCapture}
                  className="hidden"
                  id="proof-photo-input"
                />
                <label
                  htmlFor="proof-photo-input"
                  className="flex flex-col items-center justify-center gap-2 py-6 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-[#55529d] hover:bg-[#55529d]/5 transition-colors"
                >
                  <Camera className="w-8 h-8 text-gray-400" />
                  <span className="text-sm text-gray-600 font-medium">{t.takePhoto}</span>
                  <span className="text-xs text-gray-400">{t.photoRequired}</span>
                </label>
              </div>
            )}

            {/* Photo Error */}
            {photoError && (
              <p className="text-sm text-red-600 text-center">{photoError}</p>
            )}

            {/* Retake button */}
            {proofPhoto && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2 text-sm text-[#55529d] font-medium hover:underline"
              >
                {t.retakePhoto}
              </button>
            )}
          </div>
        )}

        {/* Status Action */}
        {!isPickedUp ? (
          <button
            onClick={() => onUpdateStatus('picked_up')}
            className="w-full py-3 bg-[#55529d] hover:bg-[#444280] text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Package className="w-5 h-5" />
            {t.confirmPickup}
          </button>
        ) : (
          <button
            onClick={handleCompleteDelivery}
            disabled={uploadingPhoto || !proofPhoto}
            className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {uploadingPhoto ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t.uploadingPhoto}
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                {t.completeDelivery}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}