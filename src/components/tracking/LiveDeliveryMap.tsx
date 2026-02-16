// src/components/tracking/LiveDeliveryMap.tsx
// ═══════════════════════════════════════════════════════════════════════════════
// FIX 1: Show the live map for ALL active delivery statuses, not just
//        'claimed' and 'out_for_delivery'.
//
// WHAT CHANGED:
//   - MAP_STATUSES expanded from ['claimed','out_for_delivery'] to include
//     all pre-delivery statuses so the customer always sees a map with
//     vendor + delivery markers even before a driver is assigned.
//   - Added 'ready' and 'ready_for_pickup' to DRIVER_VISIBLE_STATUSES
//     (driver dot won't show for those since there's no driver yet, but
//     the status is correctly handled).
//
// ROLLBACK: Restore MAP_STATUSES to ['claimed', 'out_for_delivery']
// ═══════════════════════════════════════════════════════════════════════════════

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { GoogleMap, Marker, DirectionsRenderer } from '@react-google-maps/api';
import { GoogleMapsProvider } from '@/components/maps/GoogleMapsProvider';
import {
  Navigation,
  MapPin,
  Store,
  Clock,
  Truck,
  Loader2,
  Maximize2,
  Minimize2,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Coordinates {
  lat: number;
  lng: number;
}

interface LiveDeliveryMapProps {
  /** Firestore document ID of the order */
  orderDocId: string;
  /** Vendor location */
  vendorCoordinates?: Coordinates;
  /** Customer delivery location */
  deliveryCoordinates?: Coordinates;
  /** Vendor display name */
  vendorName?: string;
  /** Initial order status (will be overridden by real-time data) */
  initialStatus?: string;
  /** If true, map starts in compact mode (expandable) */
  compact?: boolean;
  /** Optional class name for the outer wrapper */
  className?: string;
}

// ─── SVG Marker Helpers ───────────────────────────────────────────────────────
const svgMarkerUrl = (svg: string) =>
  'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);

const DRIVER_MARKER_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
  <circle cx="22" cy="22" r="20" fill="#10b981" stroke="white" stroke-width="3"/>
  <path d="M22 12 L30 28 L22 24 L14 28 Z" fill="white"/>
</svg>`;

const VENDOR_MARKER_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="50" viewBox="0 0 40 50">
  <path d="M20 0C9 0 0 9 0 20c0 15 20 30 20 30s20-15 20-30C40 9 31 0 20 0z" fill="#55529d"/>
  <circle cx="20" cy="18" r="10" fill="white"/>
  <rect x="14" y="14" width="12" height="9" rx="1.5" fill="#55529d"/>
  <rect x="16" y="12" width="8" height="3" rx="1.5" fill="#55529d"/>
</svg>`;

const DELIVERY_MARKER_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="50" viewBox="0 0 40 50">
  <path d="M20 0C9 0 0 9 0 20c0 15 20 30 20 30s20-15 20-30C40 9 31 0 20 0z" fill="#ef4444"/>
  <circle cx="20" cy="18" r="10" fill="white"/>
  <circle cx="20" cy="18" r="5" fill="#ef4444"/>
</svg>`;

// ─── Map Config ───────────────────────────────────────────────────────────────
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

// ═══════════════════════════════════════════════════════════════════════════════
// FIX 1: Expanded MAP_STATUSES to show the map at ALL active delivery stages.
//        Previously: ['claimed', 'out_for_delivery']
//        Now: all statuses where the customer should see a map.
// ═══════════════════════════════════════════════════════════════════════════════
const MAP_STATUSES = ['confirmed', 'preparing', 'ready', 'ready_for_pickup', 'claimed', 'out_for_delivery'];
const DRIVER_VISIBLE_STATUSES = ['claimed', 'out_for_delivery', 'delivered'];

// ─── Inner Map Component (requires Google Maps loaded) ────────────────────────
function LiveMapInner({
  orderDocId,
  vendorCoordinates,
  deliveryCoordinates,
  vendorName,
  initialStatus,
  compact = false,
  className = '',
}: LiveDeliveryMapProps) {
  const [driverLocation, setDriverLocation] = useState<Coordinates | null>(null);
  const [driverName, setDriverName] = useState<string | null>(null);
  const [status, setStatus] = useState(initialStatus || '');
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [eta, setEta] = useState<string | null>(null);
  const [distance, setDistance] = useState<string | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [expanded, setExpanded] = useState(!compact);
  const lastDirectionsRef = useRef<number>(0);

  // ── Real-time order listener ──────────────────────────────────────────────
  useEffect(() => {
    if (!orderDocId) return;

    const unsubscribe = onSnapshot(
      doc(db, 'orders', orderDocId),
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();

        setStatus(data.status || '');

        if (data.driverLocation) {
          setDriverLocation(data.driverLocation);
        }

        if (data.driverName) {
          setDriverName(data.driverName);
        }
      },
      (error) => {
        console.error('LiveDeliveryMap: snapshot error', error);
      }
    );

    return () => unsubscribe();
  }, [orderDocId]);

  // ── Directions (throttled to 30s) ─────────────────────────────────────────
  useEffect(() => {
    if (!driverLocation || !window.google) return;

    const now = Date.now();
    if (now - lastDirectionsRef.current < 30_000) return;
    lastDirectionsRef.current = now;

    const isOutForDelivery = status === 'out_for_delivery';
    const destination = isOutForDelivery ? deliveryCoordinates : vendorCoordinates;
    if (!destination) return;

    const svc = new google.maps.DirectionsService();
    svc.route(
      {
        origin: driverLocation,
        destination,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, s) => {
        if (s === 'OK' && result) {
          setDirections(result);
          const leg = result.routes[0]?.legs[0];
          setEta(leg?.duration?.text || null);
          setDistance(leg?.distance?.text || null);
        }
      }
    );
  }, [driverLocation, status, vendorCoordinates, deliveryCoordinates]);

  // ── Fit bounds ────────────────────────────────────────────────────────────
  const fitBounds = useCallback(
    (m?: google.maps.Map) => {
      const inst = m || map;
      if (!inst) return;

      const bounds = new google.maps.LatLngBounds();
      if (vendorCoordinates) bounds.extend(vendorCoordinates);
      if (deliveryCoordinates) bounds.extend(deliveryCoordinates);
      if (driverLocation) bounds.extend(driverLocation);

      if (!bounds.isEmpty()) {
        inst.fitBounds(bounds, { top: 60, bottom: 40, left: 20, right: 20 });
      }
    },
    [map, vendorCoordinates, deliveryCoordinates, driverLocation]
  );

  const onMapLoad = useCallback(
    (m: google.maps.Map) => {
      setMap(m);
      fitBounds(m);
    },
    [fitBounds]
  );

  useEffect(() => {
    if (map && driverLocation) fitBounds();
  }, [driverLocation, map, fitBounds]);

  // ── Visibility checks ────────────────────────────────────────────────────
  const showMap = MAP_STATUSES.includes(status) && (vendorCoordinates || deliveryCoordinates);
  const showDriver = DRIVER_VISIBLE_STATUSES.includes(status) && driverLocation;

  // ═══════════════════════════════════════════════════════════════════════════
  // FIX 1 CONTINUED: The "waiting" fallback now only shows for 'pending'
  // and terminal statuses. For all mid-flow statuses the map renders.
  // ═══════════════════════════════════════════════════════════════════════════
  if (!showMap) {
    return (
      <div className={`bg-white rounded-2xl border border-gray-200 overflow-hidden ${className}`}>
        <div className="px-5 py-4 flex items-center gap-3 border-b border-gray-100">
          <div className="w-10 h-10 rounded-full bg-[#55529d]/10 flex items-center justify-center">
            <Truck className="w-5 h-5 text-[#55529d]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">Live Tracking</p>
            <p className="text-xs text-gray-500">
              {status === 'pending' && 'Waiting for vendor to accept your order...'}
              {status === 'delivered' && 'Your order has been delivered!'}
              {!status && 'Loading order status...'}
            </p>
          </div>
          {!['delivered', 'cancelled'].includes(status) && (
            <Loader2 className="w-5 h-5 animate-spin text-[#55529d]/40" />
          )}
        </div>
      </div>
    );
  }

  // ── Status label for the header ──────────────────────────────────────────
  const getStatusLabel = () => {
    if (status === 'out_for_delivery') return `${driverName || 'Driver'} is on the way`;
    if (status === 'claimed') return `${driverName || 'Driver'} is heading to pickup`;
    if (status === 'ready' || status === 'ready_for_pickup') return 'Order ready — assigning a driver...';
    if (status === 'preparing') return 'Your order is being prepared...';
    if (status === 'confirmed') return 'Vendor confirmed your order!';
    return 'Tracking your order...';
  };

  return (
    <div className={`bg-white rounded-2xl border border-gray-200 overflow-hidden ${className}`}>
      {/* Header bar */}
      <div className="px-5 py-3 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <Navigation className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {getStatusLabel()}
            </p>
            {eta && (
              <p className="text-xs text-emerald-600 font-medium">
                ETA: {eta} • {distance}
              </p>
            )}
          </div>
        </div>
        {compact && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {expanded ? (
              <Minimize2 className="w-4 h-4 text-gray-500" />
            ) : (
              <Maximize2 className="w-4 h-4 text-gray-500" />
            )}
          </button>
        )}
      </div>

      {/* Map */}
      {expanded && (
        <div className="relative h-56 sm:h-72">
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            options={mapOptions}
            onLoad={onMapLoad}
            center={
              driverLocation ||
              deliveryCoordinates ||
              vendorCoordinates ||
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

            {/* Driver marker — only when driver is assigned and has location */}
            {showDriver && driverLocation && (
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

            {/* Vendor marker */}
            {vendorCoordinates && (
              <Marker
                position={vendorCoordinates}
                icon={{
                  url: svgMarkerUrl(VENDOR_MARKER_SVG),
                  scaledSize: new google.maps.Size(36, 45),
                  anchor: new google.maps.Point(18, 45),
                }}
                zIndex={1}
              />
            )}

            {/* Delivery destination */}
            {deliveryCoordinates && (
              <Marker
                position={deliveryCoordinates}
                icon={{
                  url: svgMarkerUrl(DELIVERY_MARKER_SVG),
                  scaledSize: new google.maps.Size(36, 45),
                  anchor: new google.maps.Point(18, 45),
                }}
                zIndex={2}
              />
            )}
          </GoogleMap>

          {/* Distance badge overlay */}
          {distance && (
            <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-md border border-gray-200">
              <span className="text-xs font-semibold text-gray-700">{distance} away</span>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="px-5 py-3 border-t border-gray-100 flex flex-wrap gap-4 text-xs text-gray-500">
        {showDriver && (
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            {driverName || 'Driver'}
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#55529d]" />
          {vendorName || 'Vendor'}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500" />
          You
        </span>
      </div>
    </div>
  );
}

// ─── Status Proxy (renders fallback while Maps JS loads) ──────────────────────
export function LiveDeliveryMap(props: LiveDeliveryMapProps) {
  return (
    <GoogleMapsProvider>
      <LiveMapInner {...props} />
    </GoogleMapsProvider>
  );
}