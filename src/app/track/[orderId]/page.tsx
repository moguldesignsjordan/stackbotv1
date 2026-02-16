// src/app/track/[orderId]/page.tsx
// IMPORTANT: Rename this directory from _orderId_ to [orderId] in your project
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { GoogleMap, Marker, DirectionsRenderer } from '@react-google-maps/api';
import { GoogleMapsProvider } from '@/components/maps/GoogleMapsProvider';
import {
  ArrowLeft,
  Phone,
  Navigation,
  Package,
  CheckCircle,
  Store,
  MapPin,
  Clock,
  Loader2,
  AlertCircle,
  Truck,
  User,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
} from 'lucide-react';
import Link from 'next/link';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface OrderData {
  id: string;
  orderId: string;
  status: string;
  deliveryStatus?: string;
  fulfillmentType?: string;
  vendorId: string;
  vendorName: string;
  vendorPhone?: string;
  vendorAddress?: string;
  vendorCoordinates?: { lat: number; lng: number };
  customerId?: string;
  customerName?: string;
  deliveryAddress?: {
    street?: string;
    city?: string;
    coordinates?: { lat: number; lng: number };
    instructions?: string;
  };
  deliveryFee?: number;
  subtotal?: number;
  total?: number;
  items?: Array<{ name: string; quantity: number; price: number; image?: string }>;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  driverLocation?: { lat: number; lng: number };
  driverLocationUpdatedAt?: unknown;
  trackingPin?: string;
  createdAt?: unknown;
  confirmedAt?: unknown;
  preparingAt?: unknown;
  readyAt?: unknown;
  outForDeliveryAt?: unknown;
  deliveredAt?: unknown;
  claimedAt?: unknown;
}

// ---------------------------------------------------------------------------
// Map styles & config
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------
const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    sublabel: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
  }
> = {
  pending: {
    label: 'Order Received',
    sublabel: 'Waiting for vendor to confirm',
    icon: <Clock className="w-5 h-5" />,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
  },
  confirmed: {
    label: 'Confirmed',
    sublabel: 'Vendor accepted your order',
    icon: <CheckCircle className="w-5 h-5" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  preparing: {
    label: 'Preparing',
    sublabel: 'Your order is being prepared',
    icon: <Package className="w-5 h-5" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
  ready: {
    label: 'Ready for Pickup',
    sublabel: 'Waiting for driver assignment',
    icon: <ShoppingBag className="w-5 h-5" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  claimed: {
    label: 'Driver Assigned',
    sublabel: 'Driver is heading to the vendor',
    icon: <Truck className="w-5 h-5" />,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
  },
  out_for_delivery: {
    label: 'On the Way',
    sublabel: 'Your order is en route to you',
    icon: <Navigation className="w-5 h-5" />,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
  },
  delivered: {
    label: 'Delivered',
    sublabel: 'Enjoy your order!',
    icon: <CheckCircle className="w-5 h-5" />,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  cancelled: {
    label: 'Cancelled',
    sublabel: 'This order was cancelled',
    icon: <AlertCircle className="w-5 h-5" />,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
  },
};

const DELIVERY_STEPS = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'claimed',
  'out_for_delivery',
  'delivered',
] as const;

// ---------------------------------------------------------------------------
// SVG marker helpers
// ---------------------------------------------------------------------------
function svgMarkerUrl(svg: string) {
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
}

const DRIVER_MARKER_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <circle cx="20" cy="20" r="18" fill="#10b981" stroke="#fff" stroke-width="3"/>
    <circle cx="20" cy="20" r="6" fill="#fff"/>
  </svg>
`;

const VENDOR_MARKER_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
    <path d="M18 0C8 0 0 8 0 18c0 13.5 18 26 18 26s18-12.5 18-26C36 8 28 0 18 0z" fill="#3b82f6"/>
    <circle cx="18" cy="16" r="8" fill="white"/>
    <rect x="13" y="11" width="10" height="10" rx="2" fill="#3b82f6"/>
  </svg>
`;

const DELIVERY_MARKER_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
    <path d="M18 0C8 0 0 8 0 18c0 13.5 18 26 18 26s18-12.5 18-26C36 8 28 0 18 0z" fill="#ef4444"/>
    <circle cx="18" cy="16" r="8" fill="white"/>
    <circle cx="18" cy="16" r="4" fill="#ef4444"/>
  </svg>
`;

// ---------------------------------------------------------------------------
// Page wrapper
// ---------------------------------------------------------------------------
export default function LiveTrackingPage() {
  return (
    <GoogleMapsProvider>
      <LiveTrackingContent />
    </GoogleMapsProvider>
  );
}

// ---------------------------------------------------------------------------
// Main content
// ---------------------------------------------------------------------------
function LiveTrackingContent() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eta, setEta] = useState<string | null>(null);
  const [distance, setDistance] = useState<string | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [itemsExpanded, setItemsExpanded] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);

  // Ref for throttling directions calls (every 30s max)
  const lastDirectionsRef = useRef<number>(0);

  // ─── Real-time order subscription ────────────────────────────────────
  useEffect(() => {
    if (!orderId) return;

    const orderRef = doc(db, 'orders', orderId);
    const unsubscribe = onSnapshot(
      orderRef,
      (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setOrder({
            id: snap.id,
            orderId: d.orderId || snap.id,
            status: d.status,
            deliveryStatus: d.deliveryStatus,
            fulfillmentType: d.fulfillmentType,
            vendorId: d.vendorId,
            vendorName: d.vendorName,
            vendorPhone: d.vendorPhone,
            vendorAddress: d.vendorAddress,
            vendorCoordinates: d.vendorCoordinates,
            customerId: d.customerId,
            customerName: d.customerInfo?.name || d.customerName,
            deliveryAddress: d.deliveryAddress,
            deliveryFee: d.deliveryFee ?? 0,
            subtotal: d.subtotal ?? 0,
            total: d.total ?? 0,
            items: d.items || [],
            driverId: d.driverId,
            driverName: d.driverName,
            driverPhone: d.driverPhone,
            driverLocation: d.driverLocation,
            driverLocationUpdatedAt: d.driverLocationUpdatedAt,
            trackingPin: d.trackingPin,
            createdAt: d.createdAt,
            confirmedAt: d.confirmedAt,
            preparingAt: d.preparingAt,
            readyAt: d.readyAt,
            outForDeliveryAt: d.outForDeliveryAt,
            deliveredAt: d.deliveredAt,
            claimedAt: d.claimedAt,
          });
          setError(null);
        } else {
          setError('Order not found');
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error subscribing to order:', err);
        setError('Unable to load order. You may not have permission to view this order.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [orderId]);

  // ─── Calculate directions when driver location updates ───────────────
  useEffect(() => {
    if (!order?.driverLocation || !window.google) return;

    const now = Date.now();
    if (now - lastDirectionsRef.current < 30_000) return; // throttle to 30s
    lastDirectionsRef.current = now;

    const isOutForDelivery = order.status === 'out_for_delivery';
    const destination = isOutForDelivery
      ? order.deliveryAddress?.coordinates
      : order.vendorCoordinates;

    if (!destination) return;

    const directionsService = new google.maps.DirectionsService();
    directionsService.route(
      {
        origin: order.driverLocation,
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
  }, [
    order?.driverLocation,
    order?.status,
    order?.deliveryAddress?.coordinates,
    order?.vendorCoordinates,
  ]);

  // ─── Fit map bounds ──────────────────────────────────────────────────
  const onMapLoad = useCallback(
    (mapInstance: google.maps.Map) => {
      setMap(mapInstance);
      fitBounds(mapInstance);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const fitBounds = useCallback(
    (mapInstance?: google.maps.Map) => {
      const m = mapInstance || map;
      if (!m || !order) return;

      const bounds = new google.maps.LatLngBounds();
      if (order.vendorCoordinates) bounds.extend(order.vendorCoordinates);
      if (order.deliveryAddress?.coordinates) bounds.extend(order.deliveryAddress.coordinates);
      if (order.driverLocation) bounds.extend(order.driverLocation);

      if (!bounds.isEmpty()) {
        m.fitBounds(bounds, { top: 60, bottom: 20, left: 20, right: 20 });
      }
    },
    [map, order]
  );

  // Re-fit when driver moves
  useEffect(() => {
    if (map && order?.driverLocation) {
      fitBounds();
    }
  }, [order?.driverLocation, map, fitBounds]);

  // ─── Helpers ─────────────────────────────────────────────────────────
  const copyPin = () => {
    if (order?.trackingPin) {
      navigator.clipboard.writeText(order.trackingPin);
      setCopiedPin(true);
      setTimeout(() => setCopiedPin(false), 2000);
    }
  };

  // FIX 1: Show map for ALL active delivery statuses, not just claimed/out_for_delivery
  const showMap =
    order &&
    ['confirmed', 'preparing', 'ready', 'ready_for_pickup', 'claimed', 'out_for_delivery'].includes(order.status) &&
    (order.vendorCoordinates || order.deliveryAddress?.coordinates);

  const showDriver =
    order &&
    ['claimed', 'out_for_delivery', 'delivered'].includes(order.status) &&
    order.driverId;

  const statusConfig = STATUS_CONFIG[order?.status || 'pending'] || STATUS_CONFIG.pending;
  const currentStepIndex = DELIVERY_STEPS.indexOf(
    (order?.status || 'pending') as (typeof DELIVERY_STEPS)[number]
  );

  // ─── Loading ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#55529d]" />
        <p className="mt-3 text-gray-500 text-sm">Loading tracking info…</p>
      </div>
    );
  }

  // ─── Error ───────────────────────────────────────────────────────────
  if (error || !order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <p className="text-gray-900 font-semibold text-lg mb-1">Can&apos;t load order</p>
        <p className="text-gray-500 text-sm text-center mb-6">{error}</p>
        <Link
          href="/track"
          className="px-5 py-2.5 bg-[#55529d] text-white rounded-xl font-medium hover:bg-[#444287] transition-colors"
        >
          Back to Tracking
        </Link>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 pb-safe">
      {/* ── Top bar ────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.push('/track')}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            Order {order.orderId}
          </p>
          <p className={`text-xs font-medium ${statusConfig.color}`}>{statusConfig.label}</p>
        </div>
        {order.trackingPin && (
          <button
            onClick={copyPin}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-lg text-xs font-mono text-gray-700 hover:bg-gray-200 transition-colors"
          >
            PIN: {order.trackingPin}
            {copiedPin ? (
              <Check className="w-3.5 h-3.5 text-green-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </div>

      {/* ── Live Map ───────────────────────────────────────────────── */}
      {showMap && (
        <div className="relative h-56 sm:h-72">
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            options={mapOptions}
            onLoad={onMapLoad}
            center={
              order.driverLocation ||
              order.deliveryAddress?.coordinates ||
              order.vendorCoordinates ||
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

            {/* Driver marker */}
            {order.driverLocation && (
              <Marker
                position={order.driverLocation}
                icon={{
                  url: svgMarkerUrl(DRIVER_MARKER_SVG),
                  scaledSize: new google.maps.Size(40, 40),
                  anchor: new google.maps.Point(20, 20),
                }}
              />
            )}

            {/* Vendor marker */}
            {order.vendorCoordinates && (
              <Marker
                position={order.vendorCoordinates}
                icon={{
                  url: svgMarkerUrl(VENDOR_MARKER_SVG),
                  scaledSize: new google.maps.Size(36, 44),
                  anchor: new google.maps.Point(18, 44),
                }}
              />
            )}

            {/* Delivery marker */}
            {order.deliveryAddress?.coordinates && (
              <Marker
                position={order.deliveryAddress.coordinates}
                icon={{
                  url: svgMarkerUrl(DELIVERY_MARKER_SVG),
                  scaledSize: new google.maps.Size(36, 44),
                  anchor: new google.maps.Point(18, 44),
                }}
              />
            )}
          </GoogleMap>

          {/* ETA overlay */}
          {eta && (
            <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm rounded-xl px-3 py-2 shadow-lg">
              <p className="text-xs text-gray-500">Estimated arrival</p>
              <p className="text-sm font-bold text-gray-900">{eta}</p>
              {distance && <p className="text-xs text-gray-400">{distance} away</p>}
            </div>
          )}

          {/* No driver location yet */}
          {!order.driverLocation && order.status === 'claimed' && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80">
              <div className="text-center px-4">
                <Truck className="w-8 h-8 text-[#55529d] mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-700">
                  Driver assigned — waiting for location…
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Content cards ──────────────────────────────────────────── */}
      <div className="px-4 space-y-3 mt-3">
        {/* Status card */}
        <div className={`rounded-2xl p-4 ${statusConfig.bgColor}`}>
          <div className="flex items-center gap-3">
            <div className={`${statusConfig.color}`}>{statusConfig.icon}</div>
            <div>
              <p className={`font-semibold ${statusConfig.color}`}>{statusConfig.label}</p>
              <p className="text-sm text-gray-500">{statusConfig.sublabel}</p>
            </div>
          </div>
        </div>

        {/* Driver info card */}
        {showDriver && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-emerald-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {order.driverName || 'Your driver'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {order.status === 'out_for_delivery'
                      ? 'On the way to you'
                      : order.status === 'delivered'
                        ? 'Delivery completed'
                        : 'Heading to pickup'}
                  </p>
                </div>
              </div>
              {order.driverPhone && order.status !== 'delivered' && (
                <a
                  href={`tel:${order.driverPhone}`}
                  className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl hover:bg-emerald-200 transition-colors"
                  aria-label="Call driver"
                >
                  <Phone className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Status timeline */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm font-semibold text-gray-900 mb-3">Order Progress</p>
          <div className="space-y-0">
            {DELIVERY_STEPS.map((step, i) => {
              const isCompleted = i < currentStepIndex;
              const isCurrent = i === currentStepIndex;
              const isPending = i > currentStepIndex;
              const cfg = STATUS_CONFIG[step] || STATUS_CONFIG.pending;

              return (
                <div key={step} className="flex items-start gap-3">
                  {/* Timeline line + dot */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${
                        isCompleted
                          ? 'bg-emerald-500 border-emerald-500'
                          : isCurrent
                            ? 'bg-[#55529d] border-[#55529d]'
                            : 'bg-white border-gray-300'
                      }`}
                    />
                    {i < DELIVERY_STEPS.length - 1 && (
                      <div
                        className={`w-0.5 h-6 ${
                          isCompleted ? 'bg-emerald-300' : 'bg-gray-200'
                        }`}
                      />
                    )}
                  </div>
                  <div className={`-mt-0.5 pb-2 ${isPending ? 'opacity-40' : ''}`}>
                    <p
                      className={`text-sm font-medium ${
                        isCurrent
                          ? 'text-[#55529d]'
                          : isCompleted
                            ? 'text-gray-700'
                            : 'text-gray-400'
                      }`}
                    >
                      {cfg.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Locations card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
          {/* Vendor */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Store className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">Pickup</p>
              <p className="text-sm font-medium text-gray-900 truncate">{order.vendorName}</p>
              {order.vendorAddress && (
                <p className="text-xs text-gray-500 truncate">{order.vendorAddress}</p>
              )}
            </div>
            {order.vendorPhone && (
              <a
                href={`tel:${order.vendorPhone}`}
                className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                aria-label="Call vendor"
              >
                <Phone className="w-4 h-4" />
              </a>
            )}
          </div>

          {/* Delivery */}
          {order.deliveryAddress && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">Deliver to</p>
                <p className="text-sm font-medium text-gray-900 truncate">
                  {order.deliveryAddress.street}
                  {order.deliveryAddress.city ? `, ${order.deliveryAddress.city}` : ''}
                </p>
                {order.deliveryAddress.instructions && (
                  <p className="text-xs text-gray-500 mt-0.5 italic">
                    &quot;{order.deliveryAddress.instructions}&quot;
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Order items (collapsible) */}
        {order.items && order.items.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <button
              onClick={() => setItemsExpanded(!itemsExpanded)}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <span className="text-sm font-semibold text-gray-900">
                Order Items ({order.items.length})
              </span>
              {itemsExpanded ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>
            {itemsExpanded && (
              <div className="px-4 pb-4 space-y-2 border-t border-gray-100 pt-3">
                {order.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">
                      <span className="font-medium text-gray-900">{item.quantity}×</span>{' '}
                      {item.name}
                    </span>
                    <span className="text-gray-500">
                      RD${(item.price * item.quantity).toLocaleString()}
                    </span>
                  </div>
                ))}
                <div className="border-t border-gray-100 pt-2 mt-2 space-y-1">
                  {order.subtotal !== undefined && (
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Subtotal</span>
                      <span>RD${order.subtotal.toLocaleString()}</span>
                    </div>
                  )}
                  {(order.deliveryFee ?? 0) > 0 && (
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Delivery</span>
                      <span>RD${order.deliveryFee!.toLocaleString()}</span>
                    </div>
                  )}
                  {order.total !== undefined && (
                    <div className="flex justify-between text-sm font-semibold text-gray-900 pt-1 border-t border-gray-100">
                      <span>Total</span>
                      <span>RD${order.total.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom spacer for safe area */}
      <div className="h-6" />
    </div>
  );
}