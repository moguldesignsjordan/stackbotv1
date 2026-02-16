// src/app/track/[orderId]/page.tsx
// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOMER LIVE TRACKING PAGE
//
// FIXES APPLIED:
//   1. showMap now includes driverLocation — map shows whenever we have ANY
//      location data (vendor coords, delivery coords, OR driver location).
//   2. Added fallback: if vendorCoordinates is missing from the order doc,
//      we fetch it from the vendor doc directly.
//   3. Added driver photo (profilePicUrl / profilePic from order or drivers
//      collection) and contact button.
//   4. deliveryAddress.coordinates also checked from the order snapshot.
//
// ROLLBACK: Restore previous page.tsx from git.
// ═══════════════════════════════════════════════════════════════════════════════

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { GoogleMap, Marker, DirectionsRenderer } from '@react-google-maps/api';
import { GoogleMapsProvider } from '@/components/maps/GoogleMapsProvider';
import Image from 'next/image';
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
  MessageCircle,
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
  items?: Array<{
    name: string;
    quantity: number;
    price: number;
    image?: string;
  }>;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  driverPhoto?: string;
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
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }],
    },
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
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [copiedPin, setCopiedPin] = useState(false);
  const [showItems, setShowItems] = useState(false);

  // Fallback coordinates fetched from vendor doc
  const [fallbackVendorCoords, setFallbackVendorCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // Driver profile photo fetched from drivers collection
  const [driverPhoto, setDriverPhoto] = useState<string | null>(null);

  const lastDirectionsRef = useRef<number>(0);

  // ─── Real-time order listener ────────────────────────────────────────
  useEffect(() => {
    if (!orderId) return;

    const unsubscribe = onSnapshot(
      doc(db, 'orders', orderId),
      (snap) => {
        if (!snap.exists()) {
          setError(
            'Order not found. You may not have permission to view this order.'
          );
          setLoading(false);
          return;
        }

        const data = snap.data();
        setOrder({
          id: snap.id,
          orderId: data.orderId || snap.id,
          status: data.status || 'pending',
          deliveryStatus: data.deliveryStatus,
          fulfillmentType: data.fulfillmentType,
          vendorId: data.vendorId,
          vendorName: data.vendorName || 'Vendor',
          vendorPhone: data.vendorPhone,
          vendorAddress: data.vendorAddress,
          vendorCoordinates: data.vendorCoordinates || null,
          customerId: data.customerId,
          customerName: data.customerName,
          deliveryAddress: data.deliveryAddress || null,
          deliveryFee: data.deliveryFee,
          subtotal: data.subtotal,
          total: data.totalAmount || data.total,
          items: data.items || [],
          driverId: data.driverId || null,
          driverName: data.driverName || null,
          driverPhone: data.driverPhone || null,
          driverPhoto:
            data.driverProfilePic ||
            data.driverPhoto ||
            data.driverProfilePicUrl ||
            null,
          driverLocation: data.driverLocation || null,
          driverLocationUpdatedAt: data.driverLocationUpdatedAt || null,
          trackingPin: data.trackingPin || null,
          createdAt: data.createdAt,
          confirmedAt: data.confirmedAt,
          preparingAt: data.preparingAt,
          readyAt: data.readyAt,
          outForDeliveryAt: data.outForDeliveryAt,
          deliveredAt: data.deliveredAt,
          claimedAt: data.claimedAt,
        } as OrderData);

        setLoading(false);
      },
      (err) => {
        console.error('Track page snapshot error:', err);
        setError(
          'Order not found. You may not have permission to view this order.'
        );
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [orderId]);

  // ─── Fallback: Fetch vendor coordinates if missing from order ────────
  useEffect(() => {
    if (!order) return;
    // Already have vendor coords from the order doc
    if (order.vendorCoordinates?.lat && order.vendorCoordinates?.lng) return;
    if (!order.vendorId) return;

    async function fetchVendorCoords() {
      try {
        const vendorSnap = await getDoc(doc(db, 'vendors', order!.vendorId));
        if (vendorSnap.exists()) {
          const vData = vendorSnap.data();
          // Check common field names for coordinates
          const coords =
            vData.coordinates ||
            vData.location ||
            vData.vendorCoordinates ||
            null;
          if (coords?.lat && coords?.lng) {
            setFallbackVendorCoords({ lat: coords.lat, lng: coords.lng });
          } else if (vData.latitude && vData.longitude) {
            setFallbackVendorCoords({
              lat: vData.latitude,
              lng: vData.longitude,
            });
          }
        }
      } catch (err) {
        console.error('Failed to fetch vendor coordinates fallback:', err);
      }
    }

    fetchVendorCoords();
  }, [order?.vendorId, order?.vendorCoordinates]);

  // ─── Fetch driver profile photo if not on the order doc ──────────────
  useEffect(() => {
    if (!order?.driverId) return;
    // If order already has a photo URL, use it
    if (order.driverPhoto) {
      setDriverPhoto(order.driverPhoto);
      return;
    }

    async function fetchDriverPhoto() {
      try {
        const driverSnap = await getDoc(
          doc(db, 'drivers', order!.driverId!)
        );
        if (driverSnap.exists()) {
          const dData = driverSnap.data();
          const photo =
            dData.profilePicUrl ||
            dData.profilePic ||
            dData.photoURL ||
            dData.photo ||
            null;
          if (photo) setDriverPhoto(photo);
        }
      } catch (err) {
        console.error('Failed to fetch driver photo:', err);
      }
    }

    fetchDriverPhoto();
  }, [order?.driverId, order?.driverPhoto]);

  // ─── Resolved coordinates (order field OR fallback) ──────────────────
  const vendorCoords =
    order?.vendorCoordinates?.lat && order?.vendorCoordinates?.lng
      ? order.vendorCoordinates
      : fallbackVendorCoords;

  const deliveryCoords = order?.deliveryAddress?.coordinates || null;
  const driverLoc = order?.driverLocation || null;

  // ─── Calculate directions when driver location updates ───────────────
  useEffect(() => {
    if (!driverLoc || !window.google) return;

    const now = Date.now();
    if (now - lastDirectionsRef.current < 30_000) return;
    lastDirectionsRef.current = now;

    const isOutForDelivery = order?.status === 'out_for_delivery';
    const destination = isOutForDelivery ? deliveryCoords : vendorCoords;

    if (!destination) return;

    const directionsService = new google.maps.DirectionsService();
    directionsService.route(
      {
        origin: driverLoc,
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
  }, [driverLoc, order?.status, deliveryCoords, vendorCoords]);

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
      if (!m) return;

      const bounds = new google.maps.LatLngBounds();
      if (vendorCoords) bounds.extend(vendorCoords);
      if (deliveryCoords) bounds.extend(deliveryCoords);
      if (driverLoc) bounds.extend(driverLoc);

      if (!bounds.isEmpty()) {
        m.fitBounds(bounds, { top: 60, bottom: 20, left: 20, right: 20 });
      }
    },
    [map, vendorCoords, deliveryCoords, driverLoc]
  );

  // Re-fit when driver moves
  useEffect(() => {
    if (map && driverLoc) {
      fitBounds();
    }
  }, [driverLoc, map, fitBounds]);

  // ─── Helpers ─────────────────────────────────────────────────────────
  const copyPin = () => {
    if (order?.trackingPin) {
      navigator.clipboard.writeText(order.trackingPin);
      setCopiedPin(true);
      setTimeout(() => setCopiedPin(false), 2000);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // FIX: Show map when we have ANY location data — vendor, delivery, or
  // driver. Previously required vendorCoordinates || deliveryCoordinates
  // which were both null due to missing data at order creation.
  // ═══════════════════════════════════════════════════════════════════════
  const hasAnyCoordinates = !!(vendorCoords || deliveryCoords || driverLoc);
  const isActiveStatus = order
    ? [
        'confirmed',
        'preparing',
        'ready',
        'ready_for_pickup',
        'claimed',
        'out_for_delivery',
      ].includes(order.status)
    : false;
  const showMap = order && isActiveStatus && hasAnyCoordinates;

  // Show driver info card
  const showDriverCard =
    order?.driverId &&
    ['claimed', 'out_for_delivery'].includes(order?.status || '');

  // ─── Loading / Error states ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#55529d] mx-auto" />
          <p className="text-gray-500 mt-3 text-sm">Loading order...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Order Not Found
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            {error || "We couldn't find this order."}
          </p>
          <Link
            href="/account/orders"
            className="inline-flex items-center gap-2 text-[#55529d] font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  // Status helpers
  const statusInfo = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const currentStepIndex = DELIVERY_STEPS.indexOf(
    order.status as (typeof DELIVERY_STEPS)[number]
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="bg-white sticky top-0 z-20 border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/account/orders"
            className="p-1.5 -ml-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              Order {order.orderId}
            </p>
            <p className={`text-xs font-medium ${statusInfo.color}`}>
              {statusInfo.label}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
        {/* ── Status Banner ─────────────────────────────────────────── */}
        <div
          className={`rounded-2xl px-5 py-4 ${statusInfo.bgColor} flex items-center gap-3`}
        >
          <div className={statusInfo.color}>{statusInfo.icon}</div>
          <div>
            <p className={`font-semibold ${statusInfo.color}`}>
              {statusInfo.label}
            </p>
            <p className="text-sm text-gray-600">{statusInfo.sublabel}</p>
          </div>
        </div>

        {/* ── Live Map ─────────────────────────────────────────────── */}
        {showMap && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="relative h-56 sm:h-72">
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                options={mapOptions}
                onLoad={onMapLoad}
                center={
                  driverLoc ||
                  deliveryCoords ||
                  vendorCoords || { lat: 19.75, lng: -70.45 }
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
                {driverLoc && (
                  <Marker
                    position={driverLoc}
                    icon={{
                      url: svgMarkerUrl(DRIVER_MARKER_SVG),
                      scaledSize: new google.maps.Size(40, 40),
                      anchor: new google.maps.Point(20, 20),
                    }}
                  />
                )}

                {/* Vendor marker */}
                {vendorCoords && (
                  <Marker
                    position={vendorCoords}
                    icon={{
                      url: svgMarkerUrl(VENDOR_MARKER_SVG),
                      scaledSize: new google.maps.Size(36, 44),
                      anchor: new google.maps.Point(18, 44),
                    }}
                  />
                )}

                {/* Delivery marker */}
                {deliveryCoords && (
                  <Marker
                    position={deliveryCoords}
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
                  {distance && (
                    <p className="text-xs text-gray-400">{distance} away</p>
                  )}
                </div>
              )}

              {/* Waiting for driver location */}
              {!driverLoc &&
                ['claimed'].includes(order.status) &&
                (vendorCoords || deliveryCoords) && (
                  <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-sm rounded-xl px-3 py-2 shadow-lg text-center">
                    <p className="text-xs text-gray-600">
                      <Loader2 className="w-3 h-3 inline animate-spin mr-1" />
                      Waiting for driver location...
                    </p>
                  </div>
                )}
            </div>
          </div>
        )}

        {/* ── No coordinates debug hint (only in dev) ───────────────── */}
        {!showMap &&
          isActiveStatus &&
          !hasAnyCoordinates &&
          process.env.NODE_ENV === 'development' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-700">
              <strong>Debug:</strong> Map hidden — no coordinates found.
              vendorCoordinates={JSON.stringify(order.vendorCoordinates)},
              deliveryAddr.coords=
              {JSON.stringify(order.deliveryAddress?.coordinates)},
              driverLocation={JSON.stringify(order.driverLocation)},
              fallbackVendor={JSON.stringify(fallbackVendorCoords)}
            </div>
          )}

        {/* ══════════════════════════════════════════════════════════════
            DRIVER INFO CARD — with photo + contact button
        ══════════════════════════════════════════════════════════════ */}
        {showDriverCard && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 flex items-center gap-4">
              {/* Driver Photo */}
              <div className="flex-shrink-0">
                {driverPhoto ? (
                  <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-emerald-200">
                    <Image
                      src={driverPhoto}
                      alt={order.driverName || 'Driver'}
                      width={56}
                      height={56}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center border-2 border-emerald-200">
                    <User className="w-7 h-7 text-emerald-600" />
                  </div>
                )}
              </div>

              {/* Driver Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">
                  {order.driverName || 'Your Driver'}
                </p>
                <p className="text-sm text-emerald-600 font-medium">
                  {order.status === 'out_for_delivery'
                    ? 'On the way to you'
                    : 'Picking up your order'}
                </p>
                {eta && (
                  <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    ETA: {eta}
                    {distance && ` · ${distance}`}
                  </p>
                )}
              </div>

              {/* Contact Buttons */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Message / Contact Button */}
                <button
                  className="w-10 h-10 bg-[#55529d]/10 hover:bg-[#55529d]/20 rounded-full flex items-center justify-center transition-colors"
                  aria-label="Message driver"
                  title="Contact driver"
                >
                  <MessageCircle className="w-5 h-5 text-[#55529d]" />
                </button>

                {/* Phone Call Button */}
                {order.driverPhone ? (
                  <a
                    href={`tel:${order.driverPhone}`}
                    className="w-10 h-10 bg-emerald-100 hover:bg-emerald-200 rounded-full flex items-center justify-center transition-colors"
                    aria-label="Call driver"
                    title="Call driver"
                  >
                    <Phone className="w-5 h-5 text-emerald-600" />
                  </a>
                ) : (
                  <button
                    className="w-10 h-10 bg-emerald-100 hover:bg-emerald-200 rounded-full flex items-center justify-center transition-colors"
                    aria-label="Call driver"
                    title="Call driver"
                  >
                    <Phone className="w-5 h-5 text-emerald-600" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Tracking PIN ──────────────────────────────────────────── */}
        {order.trackingPin && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  Delivery PIN
                </p>
                <p className="text-2xl font-bold text-gray-900 tracking-widest font-mono mt-1">
                  {order.trackingPin}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Share this PIN with your driver
                </p>
              </div>
              <button
                onClick={copyPin}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Copy PIN"
              >
                {copiedPin ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : (
                  <Copy className="w-5 h-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── Order Progress ────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Order Progress</h3>
          <div className="space-y-0">
            {DELIVERY_STEPS.map((step, index) => {
              const isCompleted = currentStepIndex > index;
              const isCurrent = currentStepIndex === index;
              const isFuture = currentStepIndex < index;
              const isLast = index === DELIVERY_STEPS.length - 1;
              const stepConfig = STATUS_CONFIG[step];

              return (
                <div key={step} className="flex items-start gap-3">
                  {/* Timeline dot + line */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isCompleted
                          ? 'bg-emerald-500'
                          : isCurrent
                            ? 'bg-[#55529d] ring-4 ring-[#55529d]/20'
                            : 'bg-gray-200'
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="w-3.5 h-3.5 text-white" />
                      ) : isCurrent ? (
                        <div className="w-2 h-2 bg-white rounded-full" />
                      ) : null}
                    </div>
                    {!isLast && (
                      <div
                        className={`w-0.5 h-8 ${
                          isCompleted ? 'bg-emerald-500' : 'bg-gray-200'
                        }`}
                      />
                    )}
                  </div>

                  {/* Label */}
                  <div className="pb-6 -mt-0.5">
                    <p
                      className={`text-sm font-medium ${
                        isCompleted
                          ? 'text-emerald-700'
                          : isCurrent
                            ? 'text-[#55529d] font-semibold'
                            : 'text-gray-400'
                      }`}
                    >
                      {stepConfig?.label || step}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Locations (Pickup / Delivery) ─────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
          {/* Vendor / Pickup */}
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Store className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">Pickup</p>
              <p className="font-medium text-gray-900 truncate">
                {order.vendorName}
              </p>
              {order.vendorAddress && (
                <p className="text-xs text-gray-500 mt-0.5 truncate">
                  {order.vendorAddress}
                </p>
              )}
            </div>
            {order.vendorPhone && (
              <a
                href={`tel:${order.vendorPhone}`}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              >
                <Phone className="w-4 h-4 text-gray-400" />
              </a>
            )}
          </div>

          {/* Delivery Address */}
          {order.deliveryAddress && (
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">Deliver to</p>
                <p className="font-medium text-gray-900">
                  {[order.deliveryAddress.street, order.deliveryAddress.city]
                    .filter(Boolean)
                    .join(', ')}
                </p>
                {order.deliveryAddress.instructions && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {order.deliveryAddress.instructions}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Order Items (collapsible) ─────────────────────────────── */}
        {order.items && order.items.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <button
              onClick={() => setShowItems(!showItems)}
              className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
            >
              <span className="font-semibold text-gray-900">
                Order Items ({order.items.length})
              </span>
              {showItems ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {showItems && (
              <div className="px-5 pb-5 border-t border-gray-100 pt-3 space-y-3">
                {order.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    {item.image ? (
                      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                        <Image
                          src={item.image}
                          alt={item.name}
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Package className="w-4 h-4 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        Qty: {item.quantity}
                      </p>
                    </div>
                    <p className="text-sm font-medium text-gray-900">
                      ${(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))}

                {/* Total */}
                {order.total != null && (
                  <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
                    <p className="font-semibold text-gray-900">Total</p>
                    <p className="font-bold text-[#55529d]">
                      ${order.total.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}