// src/app/driver/delivery/page.tsx
// ============================================================================
// ACTIVE DELIVERY PAGE — Phase 5: Embedded Mini-Map Added
//
// Reads from driver_active_deliveries/{driverId} for current delivery state.
// Broadcasts driver GPS to:
//   - orders/{orderId}.driverLocation  (customer tracking picks this up)
//   - drivers/{driverId}.currentLocation (admin visibility)
//
// Shows embedded Google Map with:
//   - Driver position (green dot)
//   - Vendor location (blue pin during pickup phase)
//   - Customer location (red pin during delivery phase)
//   - Driving route with ETA and distance
//
// Status flow: heading_to_pickup → at_pickup → picked_up →
//              heading_to_customer → at_customer → delivered → complete
//
// ROLLBACK: Revert this file from git to remove embedded map / GPS broadcasting.
// ============================================================================
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  doc,
  onSnapshot,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  increment,
  Timestamp,
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase/config';
import { GoogleMap, Marker, DirectionsRenderer } from '@react-google-maps/api';
import { GoogleMapsProvider } from '@/components/maps/GoogleMapsProvider';
import {
  Package,
  MapPin,
  Phone,
  Navigation,
  Store,
  CheckCircle,
  Loader2,
  AlertCircle,
  Locate,
  X,
  Clock,
  Maximize2,
  Minimize2,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface ActiveDelivery {
  orderId: string;
  queueId: string;
  vendorId: string;
  vendorName: string;
  vendorAddress: string;
  vendorPhone?: string;
  vendorLocation?: { lat: number; lng: number };
  customerId?: string;
  customerName?: string;
  customerAddress: string;
  customerPhone?: string;
  customerLocation?: { lat: number; lng: number };
  deliveryFee: number;
  tip?: number;
  orderTotal?: number;
  itemCount: number;
  estimatedDistance?: number | null;
  estimatedTime?: number | null;
  status: DeliveryStatus;
  driverName?: string;
  acceptedAt: any;
  pickedUpAt?: any;
}

type DeliveryStatus =
  | 'heading_to_pickup'
  | 'at_pickup'
  | 'picked_up'
  | 'heading_to_customer'
  | 'at_customer'
  | 'delivered';

// ============================================================================
// TRANSLATIONS
// ============================================================================

const translations = {
  es: {
    headingToPickup: 'Dirígete al Restaurante',
    atPickup: 'Llegaste al Restaurante',
    pickedUp: 'Pedido Recogido',
    headingToCustomer: 'Dirígete al Cliente',
    atCustomer: 'Llegaste al Destino',
    delivered: 'Entrega Completada',
    headingToPickupDesc: 'Ve a recoger el pedido',
    atPickupDesc: 'Recoge el pedido del restaurante',
    pickedUpDesc: 'Confirma que tienes todos los artículos',
    headingToCustomerDesc: 'Lleva el pedido al cliente',
    atCustomerDesc: 'Entrega el pedido al cliente',
    deliveredDesc: '¡Felicidades! Entrega completada',
    arrivedAtPickup: 'Llegué al Restaurante',
    confirmPickup: 'Confirmar Recogida',
    startDelivery: 'Iniciar Entrega',
    arrivedAtCustomer: 'Llegué al Destino',
    confirmDelivery: 'Confirmar Entrega',
    completeDelivery: 'Completar Entrega',
    pickup: 'Recoger',
    deliver: 'Entregar',
    items: 'artículos',
    item: 'artículo',
    fee: 'Tu Ganancia',
    orderId: 'Pedido',
    call: 'Llamar',
    navigate: 'Navegar',
    noActiveDelivery: 'Sin entrega activa',
    noActiveDeliveryDesc: 'Acepta un pedido para comenzar',
    goToDashboard: 'Ir al Inicio',
    updating: 'Actualizando...',
    cancelDelivery: 'Cancelar Entrega',
    cancelConfirm: '¿Cancelar esta entrega?',
    cancelWarning: 'Tu tasa de cancelación puede afectar tu cuenta.',
    confirmCancel: 'Sí, Cancelar',
    keepDelivery: 'No, Continuar',
    gpsActive: 'GPS activo',
    gpsInactive: 'GPS inactivo',
    eta: 'Tiempo est.',
    distance: 'Distancia',
    liveMap: 'Mapa en Vivo',
    loadingMap: 'Cargando mapa...',
    noGps: 'Esperando señal GPS...',
  },
  en: {
    headingToPickup: 'Head to Restaurant',
    atPickup: 'Arrived at Restaurant',
    pickedUp: 'Order Picked Up',
    headingToCustomer: 'Head to Customer',
    atCustomer: 'Arrived at Destination',
    delivered: 'Delivery Complete',
    headingToPickupDesc: 'Go pick up the order',
    atPickupDesc: 'Pick up the order from the restaurant',
    pickedUpDesc: 'Confirm you have all items',
    headingToCustomerDesc: 'Take the order to the customer',
    atCustomerDesc: 'Deliver the order to the customer',
    deliveredDesc: 'Congratulations! Delivery completed',
    arrivedAtPickup: 'Arrived at Restaurant',
    confirmPickup: 'Confirm Pickup',
    startDelivery: 'Start Delivery',
    arrivedAtCustomer: 'Arrived at Destination',
    confirmDelivery: 'Confirm Delivery',
    completeDelivery: 'Complete Delivery',
    pickup: 'Pickup',
    deliver: 'Deliver',
    items: 'items',
    item: 'item',
    fee: 'Your Earnings',
    orderId: 'Order',
    call: 'Call',
    navigate: 'Navigate',
    noActiveDelivery: 'No active delivery',
    noActiveDeliveryDesc: 'Accept an order to get started',
    goToDashboard: 'Go to Dashboard',
    updating: 'Updating...',
    cancelDelivery: 'Cancel Delivery',
    cancelConfirm: 'Cancel this delivery?',
    cancelWarning: 'Your cancellation rate may affect your account.',
    confirmCancel: 'Yes, Cancel',
    keepDelivery: 'No, Continue',
    gpsActive: 'GPS active',
    gpsInactive: 'GPS inactive',
    eta: 'ETA',
    distance: 'Distance',
    liveMap: 'Live Map',
    loadingMap: 'Loading map...',
    noGps: 'Waiting for GPS signal...',
  },
};

type Language = 'es' | 'en';

// ============================================================================
// STATUS CONFIG
// ============================================================================

const STATUS_CONFIG: Record<DeliveryStatus, { step: number; color: string; bgColor: string }> = {
  heading_to_pickup: { step: 1, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  at_pickup: { step: 2, color: 'text-orange-600', bgColor: 'bg-orange-50' },
  picked_up: { step: 3, color: 'text-purple-600', bgColor: 'bg-purple-50' },
  heading_to_customer: { step: 4, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  at_customer: { step: 5, color: 'text-orange-600', bgColor: 'bg-orange-50' },
  delivered: { step: 6, color: 'text-green-600', bgColor: 'bg-green-50' },
};

// ============================================================================
// SVG MARKER HELPERS (matching existing codebase patterns)
// ============================================================================

const svgMarkerUrl = (svg: string) =>
  'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);

const DRIVER_MARKER_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
  <circle cx="20" cy="20" r="18" fill="#10b981" stroke="#fff" stroke-width="3"/>
  <circle cx="20" cy="20" r="6" fill="#fff"/>
</svg>`;

const VENDOR_MARKER_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="44" height="54" viewBox="0 0 44 54">
  <path d="M22 0C10 0 0 10 0 22c0 16.5 22 32 22 32s22-15.5 22-32C44 10 34 0 22 0z" fill="#3b82f6"/>
  <circle cx="22" cy="20" r="12" fill="white"/>
  <rect x="16" y="14" width="12" height="12" rx="2" fill="#3b82f6"/>
</svg>`;

const CUSTOMER_MARKER_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="44" height="54" viewBox="0 0 44 54">
  <path d="M22 0C10 0 0 10 0 22c0 16.5 22 32 22 32s22-15.5 22-32C44 10 34 0 22 0z" fill="#ef4444"/>
  <circle cx="22" cy="20" r="12" fill="white"/>
  <circle cx="22" cy="20" r="6" fill="#ef4444"/>
</svg>`;

// ============================================================================
// MAP CONFIG
// ============================================================================

const mapContainerStyle = { width: '100%', height: '100%' };

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: false,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  clickableIcons: false,
  styles: [
    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  ],
};

// ============================================================================
// GPS BROADCASTING HOOK
// ============================================================================

/**
 * Watches driver GPS and broadcasts to Firestore every ~10 seconds.
 * Writes to:
 *   - orders/{orderId}.driverLocation + driverLocationUpdatedAt
 *   - drivers/{driverId}.currentLocation + lastLocationUpdate
 *
 * Stops broadcasting when delivery is null or status is 'delivered'.
 */
function useGPSBroadcast(
  userId: string | undefined,
  delivery: ActiveDelivery | null
) {
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsActive, setGpsActive] = useState(false);
  const lastBroadcastRef = useRef<number>(0);
  const watchIdRef = useRef<number | null>(null);

  // Broadcast location to Firestore (throttled to every 10 seconds)
  const broadcastLocation = useCallback(
    async (lat: number, lng: number) => {
      if (!userId || !delivery?.orderId) return;
      if (delivery.status === 'delivered') return;

      const now = Date.now();
      if (now - lastBroadcastRef.current < 10000) return; // 10s throttle
      lastBroadcastRef.current = now;

      const location = { lat, lng };

      try {
        // Write to orders/{orderId} — customer tracking reads this
        await updateDoc(doc(db, 'orders', delivery.orderId), {
          driverLocation: location,
          driverLocationUpdatedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // Write to drivers/{driverId} — admin visibility
        await updateDoc(doc(db, 'drivers', userId), {
          currentLocation: location,
          lastLocationUpdate: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        // Non-critical — don't crash the delivery page for a GPS write failure
        console.warn('[GPS Broadcast] Write failed:', err);
      }
    },
    [userId, delivery?.orderId, delivery?.status]
  );

  // Start/stop geolocation watch
  useEffect(() => {
    if (!userId || !delivery || delivery.status === 'delivered') {
      // Stop watching
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setGpsActive(false);
      return;
    }

    if (!navigator.geolocation) {
      console.warn('[GPS] Geolocation not supported');
      setGpsActive(false);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setDriverLocation({ lat: latitude, lng: longitude });
        setGpsActive(true);
        broadcastLocation(latitude, longitude);
      },
      (err) => {
        console.error('[GPS] Watch error:', err.message);
        setGpsActive(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000, // Accept cached position up to 10s old
        timeout: 15000,
      }
    );

    watchIdRef.current = watchId;

    return () => {
      navigator.geolocation.clearWatch(watchId);
      watchIdRef.current = null;
    };
  }, [userId, delivery?.orderId, delivery?.status, broadcastLocation]);

  return { driverLocation, gpsActive };
}

// ============================================================================
// DIRECTIONS HOOK — Fetches route + ETA, throttled to 30s
// ============================================================================

function useDirections(
  driverLocation: { lat: number; lng: number } | null,
  destination: { lat: number; lng: number } | null | undefined,
  isActive: boolean
) {
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [eta, setEta] = useState<string | null>(null);
  const [distance, setDistance] = useState<string | null>(null);
  const lastFetchRef = useRef<number>(0);

  useEffect(() => {
    if (!isActive || !driverLocation || !destination || !window.google) return;

    const now = Date.now();
    if (now - lastFetchRef.current < 30_000) return; // 30s throttle
    lastFetchRef.current = now;

    const svc = new google.maps.DirectionsService();
    svc.route(
      {
        origin: driverLocation,
        destination,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === 'OK' && result) {
          setDirections(result);
          const leg = result.routes[0]?.legs[0];
          setEta(leg?.duration?.text || null);
          setDistance(leg?.distance?.text || null);
        }
      }
    );
  }, [driverLocation, destination, isActive]);

  return { directions, eta, distance };
}

// ============================================================================
// PAGE WRAPPER — GoogleMapsProvider must be above GoogleMap usage
// ============================================================================

export default function ActiveDeliveryPage() {
  return (
    <GoogleMapsProvider>
      <ActiveDeliveryContent />
    </GoogleMapsProvider>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function ActiveDeliveryContent() {
  const router = useRouter();
  const [language, setLanguage] = useState<Language>('es');
  const [delivery, setDelivery] = useState<ActiveDelivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(true);

  const t = translations[language];
  const userId = auth.currentUser?.uid;

  // ── Phase 3: GPS Broadcasting ────────────────────────────────
  const { driverLocation, gpsActive } = useGPSBroadcast(userId, delivery);

  // ── Phase 5: Determine destination for directions ────────────
  const isPickupPhase = delivery
    ? ['heading_to_pickup', 'at_pickup', 'picked_up'].includes(delivery.status)
    : true;

  const routeDestination = delivery
    ? isPickupPhase
      ? delivery.vendorLocation
      : delivery.customerLocation
    : null;

  const isDelivered = delivery?.status === 'delivered';

  const { directions, eta, distance } = useDirections(
    driverLocation,
    routeDestination,
    !isDelivered && !!delivery
  );

  // ── Map ref for fitBounds ────────────────────────────────────
  const mapRef = useRef<google.maps.Map | null>(null);

  const fitMapBounds = useCallback(
    (mapInstance?: google.maps.Map) => {
      const map = mapInstance || mapRef.current;
      if (!map) return;

      const bounds = new google.maps.LatLngBounds();
      let hasPoints = false;

      if (driverLocation) {
        bounds.extend(driverLocation);
        hasPoints = true;
      }
      if (delivery?.vendorLocation) {
        bounds.extend(delivery.vendorLocation);
        hasPoints = true;
      }
      if (delivery?.customerLocation && !isPickupPhase) {
        bounds.extend(delivery.customerLocation);
        hasPoints = true;
      }

      if (hasPoints) {
        map.fitBounds(bounds, { top: 40, bottom: 40, left: 20, right: 20 });
      }
    },
    [driverLocation, delivery?.vendorLocation, delivery?.customerLocation, isPickupPhase]
  );

  const onMapLoad = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;
      fitMapBounds(map);
    },
    [fitMapBounds]
  );

  // Re-fit bounds when driver moves or phase changes
  useEffect(() => {
    if (mapRef.current && driverLocation) {
      fitMapBounds();
    }
  }, [driverLocation, isPickupPhase, fitMapBounds]);

  // ── Language persistence ─────────────────────────────────────
  useEffect(() => {
    const savedLang = localStorage.getItem('stackbot-driver-lang') as Language;
    if (savedLang && (savedLang === 'es' || savedLang === 'en')) {
      setLanguage(savedLang);
    }
  }, []);

  // ── Active delivery listener ─────────────────────────────────
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    const unsubscribe = onSnapshot(doc(db, 'driver_active_deliveries', userId), (docSnap) => {
      setDelivery(docSnap.exists() ? (docSnap.data() as ActiveDelivery) : null);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [userId]);

  // ── Status helpers ───────────────────────────────────────────
  const getStatusInfo = (status: DeliveryStatus) => {
    const titles: Record<DeliveryStatus, string> = {
      heading_to_pickup: t.headingToPickup,
      at_pickup: t.atPickup,
      picked_up: t.pickedUp,
      heading_to_customer: t.headingToCustomer,
      at_customer: t.atCustomer,
      delivered: t.delivered,
    };
    const descriptions: Record<DeliveryStatus, string> = {
      heading_to_pickup: t.headingToPickupDesc,
      at_pickup: t.atPickupDesc,
      picked_up: t.pickedUpDesc,
      heading_to_customer: t.headingToCustomerDesc,
      at_customer: t.atCustomerDesc,
      delivered: t.deliveredDesc,
    };
    return { title: titles[status], description: descriptions[status], ...STATUS_CONFIG[status] };
  };

  const getNextAction = (status: DeliveryStatus) => {
    const actions: Record<DeliveryStatus, { label: string; nextStatus: DeliveryStatus | 'complete' }> = {
      heading_to_pickup: { label: t.arrivedAtPickup, nextStatus: 'at_pickup' },
      at_pickup: { label: t.confirmPickup, nextStatus: 'picked_up' },
      picked_up: { label: t.startDelivery, nextStatus: 'heading_to_customer' },
      heading_to_customer: { label: t.arrivedAtCustomer, nextStatus: 'at_customer' },
      at_customer: { label: t.confirmDelivery, nextStatus: 'delivered' },
      delivered: { label: t.completeDelivery, nextStatus: 'complete' },
    };
    return actions[status] || null;
  };

  // ── Update delivery status ───────────────────────────────────
  const updateStatus = async () => {
    if (!userId || !delivery || actionLoading) return;
    const action = getNextAction(delivery.status);
    if (!action) return;

    setActionLoading(true);
    try {
      if (action.nextStatus === 'complete') {
        await completeDelivery();
      } else {
        const updates: Record<string, any> = { status: action.nextStatus };
        if (action.nextStatus === 'picked_up') {
          updates.pickedUpAt = serverTimestamp();
        }

        // Update driver_active_deliveries (primary source)
        await updateDoc(doc(db, 'driver_active_deliveries', userId), updates);

        // Sync to delivery_queue
        if (delivery.queueId) {
          await updateDoc(doc(db, 'delivery_queue', delivery.queueId), {
            status: action.nextStatus,
          });
        }

        // Sync to orders
        if (delivery.orderId) {
          await updateDoc(doc(db, 'orders', delivery.orderId), {
            delivery_status: action.nextStatus,
            updatedAt: serverTimestamp(),
          });
        }
      }
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setActionLoading(false);
    }
  };

  // ── Complete delivery ────────────────────────────────────────
  const completeDelivery = async () => {
    if (!userId || !delivery) return;
    try {
      // Update driver stats
      await updateDoc(doc(db, 'driver_stats', userId), {
        todayDeliveries: increment(1),
        todayEarnings: increment(delivery.deliveryFee),
        weekDeliveries: increment(1),
        weekEarnings: increment(delivery.deliveryFee),
        totalDeliveries: increment(1),
      });

      // Set driver back to online
      await updateDoc(doc(db, 'drivers', userId), {
        status: 'online',
        currentOrderId: null,
      });

      // Mark queue entry as delivered
      if (delivery.queueId) {
        await updateDoc(doc(db, 'delivery_queue', delivery.queueId), {
          status: 'delivered',
          deliveredAt: serverTimestamp(),
        });
      }

      // Mark order as delivered
      if (delivery.orderId) {
        await updateDoc(doc(db, 'orders', delivery.orderId), {
          status: 'delivered',
          delivery_status: 'delivered',
          deliveredAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      // Remove active delivery (triggers cleanup)
      await deleteDoc(doc(db, 'driver_active_deliveries', userId));

      router.push('/driver/dashboard');
    } catch (error) {
      console.error('Error completing delivery:', error);
    }
  };

  // ── Cancel delivery ──────────────────────────────────────────
  const cancelDelivery = async () => {
    if (!userId || !delivery) return;
    setActionLoading(true);
    try {
      // Return queue item to pending
      if (delivery.queueId) {
        await updateDoc(doc(db, 'delivery_queue', delivery.queueId), {
          status: 'pending',
          driverId: null,
          driverName: null,
          cancelledBy: userId,
          cancelledAt: serverTimestamp(),
        });
      }

      // Reset order
      if (delivery.orderId) {
        await updateDoc(doc(db, 'orders', delivery.orderId), {
          driverId: null,
          driverName: null,
          driverPhone: null,
          driverLocation: null,
          status: 'ready',
          deliveryStatus: null,
          delivery_status: null,
          updatedAt: serverTimestamp(),
        });
      }

      // Set driver back to online AND clear stale order reference (FIX 3b)
      await updateDoc(doc(db, 'drivers', userId), {
        status: 'online',
        currentOrderId: null,
        updatedAt: serverTimestamp(),
      });

      // Remove active delivery
      await deleteDoc(doc(db, 'driver_active_deliveries', userId));

      router.push('/driver/dashboard');
    } catch (error) {
      console.error('Error cancelling delivery:', error);
    } finally {
      setActionLoading(false);
      setShowCancelModal(false);
    }
  };

  // ── Navigation helpers ───────────────────────────────────────
  const openNavigation = (address: string) => {
    window.open(
      'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(address),
      '_blank'
    );
  };

  const makeCall = (phone: string) => {
    if (phone) window.location.href = `tel:${phone}`;
  };

  const formatCurrency = (amount: number) => 'RD$' + amount.toLocaleString();

  // ── Loading state ────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#55529d]" />
      </div>
    );
  }

  // ── No active delivery ───────────────────────────────────────
  if (!delivery) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Package className="w-10 h-10 text-gray-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">{t.noActiveDelivery}</h2>
        <p className="text-gray-600 mb-6">{t.noActiveDeliveryDesc}</p>
        <Link
          href="/driver/dashboard"
          className="px-6 py-3 bg-[#55529d] text-white font-semibold rounded-xl hover:bg-[#444280] transition-colors"
        >
          {t.goToDashboard}
        </Link>
      </div>
    );
  }

  // ── Render active delivery ───────────────────────────────────
  const statusInfo = getStatusInfo(delivery.status);
  const nextAction = getNextAction(delivery.status);

  // Determine target for navigation buttons
  const targetAddress = isPickupPhase ? delivery.vendorAddress : delivery.customerAddress;
  const targetName = isPickupPhase ? delivery.vendorName : (delivery.customerName || 'Customer');
  const targetPhone = isPickupPhase ? delivery.vendorPhone : delivery.customerPhone;

  // Map has at least one coordinate to show
  const hasMapData = !!(driverLocation || delivery.vendorLocation || delivery.customerLocation);

  return (
    <div className="pb-32">
      {/* ── Status Header ─────────────────────────────────────── */}
      <div className={statusInfo.bgColor + ' px-4 py-6'}>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-sm">
            {delivery.status === 'delivered' ? (
              <CheckCircle className={'w-7 h-7 ' + statusInfo.color} />
            ) : (
              <Package className={'w-7 h-7 ' + statusInfo.color} />
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">{statusInfo.title}</h1>
            <p className="text-sm text-gray-600">{statusInfo.description}</p>
          </div>

          {/* GPS Indicator */}
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
            gpsActive
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-200 text-gray-500'
          }`}>
            <Locate className="w-3 h-3" />
            <span className="hidden sm:inline">
              {gpsActive ? t.gpsActive : t.gpsInactive}
            </span>
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mt-4">
          {[1, 2, 3, 4, 5, 6].map((step) => (
            <div
              key={step}
              className={`w-2 h-2 rounded-full transition-colors ${
                step <= statusInfo.step ? 'bg-[#55529d]' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>

      {/* ── Embedded Mini-Map (Phase 5) ───────────────────────── */}
      {!isDelivered && (
        <div className="px-4 mt-4">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            {/* Map header with ETA/Distance badges */}
            <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#55529d]/10 flex items-center justify-center">
                  <Navigation className="w-4 h-4 text-[#55529d]" />
                </div>
                <span className="text-sm font-semibold text-gray-900">{t.liveMap}</span>
              </div>

              <div className="flex items-center gap-2">
                {/* ETA badge */}
                {eta && (
                  <div className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                    <Clock className="w-3 h-3" />
                    {eta}
                  </div>
                )}
                {/* Distance badge */}
                {distance && (
                  <div className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                    <MapPin className="w-3 h-3" />
                    {distance}
                  </div>
                )}
                {/* Expand/collapse toggle */}
                <button
                  onClick={() => setMapExpanded(!mapExpanded)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                >
                  {mapExpanded ? (
                    <Minimize2 className="w-4 h-4 text-gray-500" />
                  ) : (
                    <Maximize2 className="w-4 h-4 text-gray-500" />
                  )}
                </button>
              </div>
            </div>

            {/* Map canvas */}
            {mapExpanded && (
              <div className="relative h-48 sm:h-56">
                {hasMapData ? (
                  <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    options={mapOptions}
                    onLoad={onMapLoad}
                    center={
                      driverLocation ||
                      delivery.vendorLocation ||
                      delivery.customerLocation ||
                      { lat: 19.75, lng: -70.45 }
                    }
                    zoom={14}
                  >
                    {/* Directions route */}
                    {directions && (
                      <DirectionsRenderer
                        directions={directions}
                        options={{
                          suppressMarkers: true,
                          polylineOptions: {
                            strokeColor: '#10b981',
                            strokeWeight: 4,
                            strokeOpacity: 0.8,
                          },
                        }}
                      />
                    )}

                    {/* Driver marker (green dot) */}
                    {driverLocation && (
                      <Marker
                        position={driverLocation}
                        icon={{
                          url: svgMarkerUrl(DRIVER_MARKER_SVG),
                          scaledSize: new google.maps.Size(40, 40),
                          anchor: new google.maps.Point(20, 20),
                        }}
                        zIndex={3}
                      />
                    )}

                    {/* Vendor marker (blue pin) — always visible during pickup */}
                    {delivery.vendorLocation && isPickupPhase && (
                      <Marker
                        position={delivery.vendorLocation}
                        icon={{
                          url: svgMarkerUrl(VENDOR_MARKER_SVG),
                          scaledSize: new google.maps.Size(44, 54),
                          anchor: new google.maps.Point(22, 54),
                        }}
                        zIndex={1}
                      />
                    )}

                    {/* Customer marker (red pin) — visible during delivery phase */}
                    {delivery.customerLocation && !isPickupPhase && (
                      <Marker
                        position={delivery.customerLocation}
                        icon={{
                          url: svgMarkerUrl(CUSTOMER_MARKER_SVG),
                          scaledSize: new google.maps.Size(44, 54),
                          anchor: new google.maps.Point(22, 54),
                        }}
                        zIndex={2}
                      />
                    )}
                  </GoogleMap>
                ) : (
                  <div className="flex items-center justify-center h-full bg-gray-50">
                    <div className="text-center">
                      <Locate className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">{t.noGps}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Delivery Info Cards ───────────────────────────────── */}
      <div className="px-4 space-y-3 mt-4">
        {/* Order ID + Earnings */}
        <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-gray-100">
          <div>
            <p className="text-xs text-gray-500">{t.orderId}</p>
            <p className="font-mono text-sm font-semibold text-gray-900">
              #{delivery.orderId?.slice(0, 8).toUpperCase()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">{t.fee}</p>
            <p className="font-bold text-green-600 text-lg">
              {formatCurrency(delivery.deliveryFee)}
              {delivery.tip ? (
                <span className="text-xs text-green-500 ml-1">
                  +{formatCurrency(delivery.tip)}
                </span>
              ) : null}
            </p>
          </div>
        </div>

        {/* Pickup Location */}
        <div className={`bg-white rounded-xl p-4 border ${
          isPickupPhase ? 'border-blue-200 ring-1 ring-blue-100' : 'border-gray-100'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              isPickupPhase ? 'bg-blue-100' : 'bg-gray-100'
            }`}>
              <Store className={`w-5 h-5 ${isPickupPhase ? 'text-blue-600' : 'text-gray-400'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 uppercase tracking-wide">{t.pickup}</p>
              <p className="font-semibold text-gray-900">{delivery.vendorName}</p>
              <p className="text-sm text-gray-600 truncate">{delivery.vendorAddress}</p>
            </div>
          </div>

          {isPickupPhase && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => openNavigation(delivery.vendorAddress)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-50 text-blue-700 font-semibold rounded-xl text-sm hover:bg-blue-100 transition-colors"
              >
                <Navigation className="w-4 h-4" />
                {t.navigate}
              </button>
              {delivery.vendorPhone && (
                <button
                  onClick={() => makeCall(delivery.vendorPhone!)}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-50 text-gray-700 font-semibold rounded-xl text-sm hover:bg-gray-100 transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  {t.call}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Delivery Location */}
        <div className={`bg-white rounded-xl p-4 border ${
          !isPickupPhase ? 'border-red-200 ring-1 ring-red-100' : 'border-gray-100'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              !isPickupPhase ? 'bg-red-100' : 'bg-gray-100'
            }`}>
              <MapPin className={`w-5 h-5 ${!isPickupPhase ? 'text-red-600' : 'text-gray-400'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 uppercase tracking-wide">{t.deliver}</p>
              <p className="font-semibold text-gray-900">{delivery.customerName || 'Customer'}</p>
              <p className="text-sm text-gray-600 truncate">{delivery.customerAddress}</p>
            </div>
          </div>

          {!isPickupPhase && delivery.status !== 'delivered' && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => openNavigation(delivery.customerAddress)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-50 text-red-700 font-semibold rounded-xl text-sm hover:bg-red-100 transition-colors"
              >
                <Navigation className="w-4 h-4" />
                {t.navigate}
              </button>
              {delivery.customerPhone && (
                <button
                  onClick={() => makeCall(delivery.customerPhone!)}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-50 text-gray-700 font-semibold rounded-xl text-sm hover:bg-gray-100 transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  {t.call}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Items count */}
        <div className="bg-white rounded-xl p-3 border border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-700">
              {delivery.itemCount} {delivery.itemCount === 1 ? t.item : t.items}
            </span>
          </div>
          {delivery.orderTotal ? (
            <span className="text-sm font-medium text-gray-700">
              {formatCurrency(delivery.orderTotal)}
            </span>
          ) : null}
        </div>
      </div>

      {/* ── Cancel Button (only during pickup phase) ──────────── */}
      {isPickupPhase && delivery.status === 'heading_to_pickup' && (
        <div className="px-4 mt-4">
          <button
            onClick={() => setShowCancelModal(true)}
            className="w-full py-2.5 text-red-600 text-sm font-medium rounded-xl border border-red-200 hover:bg-red-50 transition-colors"
          >
            {t.cancelDelivery}
          </button>
        </div>
      )}

      {/* ── Fixed Action Button ───────────────────────────────── */}
      {nextAction && (
        <div className="fixed bottom-20 left-0 right-0 px-4 z-40">
          <button
            onClick={updateStatus}
            disabled={actionLoading}
            className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg ${
              delivery.status === 'delivered'
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-[#55529d] text-white hover:bg-[#444280]'
            } ${actionLoading && 'opacity-70 cursor-not-allowed'}`}
          >
            {actionLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t.updating}
              </>
            ) : (
              <>
                {delivery.status === 'delivered' ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <CheckCircle className="w-5 h-5" />
                )}
                {nextAction.label}
              </>
            )}
          </button>
        </div>
      )}

      {/* ── Cancel Modal ──────────────────────────────────────── */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowCancelModal(false)}
          />
          <div className="relative bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-6 safe-bottom">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">{t.cancelConfirm}</h3>
                <p className="text-sm text-gray-600">{t.cancelWarning}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-3 rounded-xl border border-gray-200 font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {t.keepDelivery}
              </button>
              <button
                onClick={cancelDelivery}
                disabled={actionLoading}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  t.confirmCancel
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}