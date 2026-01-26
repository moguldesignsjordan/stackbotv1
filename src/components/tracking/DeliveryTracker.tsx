// src/components/tracking/DeliveryTracker.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { GoogleMap, Marker, Polyline } from '@react-google-maps/api';
import { GoogleMapsProvider } from '@/components/maps/GoogleMapsProvider';
import {
  Truck,
  Store,
  MapPin,
  Phone,
  Clock,
  Package,
  CheckCircle,
  Navigation,
  User,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface DeliveryTrackerProps {
  orderId: string;
  vendorCoordinates?: { lat: number; lng: number };
  deliveryCoordinates?: { lat: number; lng: number };
  vendorName: string;
  vendorAddress?: string;
  deliveryAddress: string;
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

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

export function DeliveryTracker({
  orderId,
  vendorCoordinates,
  deliveryCoordinates,
  vendorName,
  vendorAddress,
  deliveryAddress,
}: DeliveryTrackerProps) {
  return (
    <GoogleMapsProvider>
      <DeliveryTrackerContent
        orderId={orderId}
        vendorCoordinates={vendorCoordinates}
        deliveryCoordinates={deliveryCoordinates}
        vendorName={vendorName}
        vendorAddress={vendorAddress}
        deliveryAddress={deliveryAddress}
      />
    </GoogleMapsProvider>
  );
}

function DeliveryTrackerContent({
  orderId,
  vendorCoordinates,
  deliveryCoordinates,
  vendorName,
  vendorAddress,
  deliveryAddress,
}: DeliveryTrackerProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [driverInfo, setDriverInfo] = useState<{
    name: string;
    phone?: string;
    vehicleType?: string;
  } | null>(null);
  const [orderStatus, setOrderStatus] = useState<string>('preparing');
  const [eta, setEta] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  // Subscribe to order for driver location updates
  useEffect(() => {
    if (!orderId) return;

    const orderRef = doc(db, 'orders', orderId);
    const unsubscribe = onSnapshot(orderRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        setOrderStatus(data.status);

        // Get driver location from order
        if (data.driverLocation) {
          setDriverLocation(data.driverLocation);
        }

        // Get driver info
        if (data.driverId) {
          setDriverInfo({
            name: data.driverName || 'Driver',
            phone: data.driverPhone,
            vehicleType: 'motorcycle',
          });
        }
      }
    });

    return () => unsubscribe();
  }, [orderId]);

  // Calculate ETA when driver location updates
  useEffect(() => {
    if (!driverLocation || !deliveryCoordinates || !window.google) return;

    const service = new google.maps.DirectionsService();
    service.route(
      {
        origin: driverLocation,
        destination: deliveryCoordinates,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === 'OK' && result) {
          const duration = result.routes[0]?.legs[0]?.duration?.text;
          if (duration) setEta(duration);
        }
      }
    );
  }, [driverLocation, deliveryCoordinates]);

  // Fit map to show all markers
  const onMapLoad = useCallback(
    (mapInstance: google.maps.Map) => {
      setMap(mapInstance);

      const bounds = new google.maps.LatLngBounds();

      if (vendorCoordinates) bounds.extend(vendorCoordinates);
      if (deliveryCoordinates) bounds.extend(deliveryCoordinates);
      if (driverLocation) bounds.extend(driverLocation);

      if (!bounds.isEmpty()) {
        mapInstance.fitBounds(bounds, { padding: 60 });
      }
    },
    [vendorCoordinates, deliveryCoordinates, driverLocation]
  );

  // Update map bounds when driver moves
  useEffect(() => {
    if (!map || !driverLocation) return;

    const bounds = new google.maps.LatLngBounds();
    if (vendorCoordinates) bounds.extend(vendorCoordinates);
    if (deliveryCoordinates) bounds.extend(deliveryCoordinates);
    bounds.extend(driverLocation);

    map.fitBounds(bounds, { padding: 60 });
  }, [map, driverLocation, vendorCoordinates, deliveryCoordinates]);

  const getStatusInfo = () => {
    switch (orderStatus) {
      case 'pending':
      case 'confirmed':
        return {
          icon: <Store className="w-5 h-5" />,
          text: 'Order confirmed',
          subtext: 'Restaurant is preparing your order',
          color: 'text-blue-500',
        };
      case 'preparing':
        return {
          icon: <Package className="w-5 h-5" />,
          text: 'Preparing your order',
          subtext: 'Your food is being prepared',
          color: 'text-amber-500',
        };
      case 'ready':
      case 'claimed':
        return {
          icon: <Truck className="w-5 h-5" />,
          text: 'Driver assigned',
          subtext: driverInfo ? `${driverInfo.name} is heading to pickup` : 'Finding a driver',
          color: 'text-purple-500',
        };
      case 'out_for_delivery':
        return {
          icon: <Navigation className="w-5 h-5" />,
          text: 'On the way',
          subtext: eta ? `Arriving in ${eta}` : 'Driver is on the way',
          color: 'text-emerald-500',
        };
      case 'delivered':
        return {
          icon: <CheckCircle className="w-5 h-5" />,
          text: 'Delivered',
          subtext: 'Enjoy your meal!',
          color: 'text-green-500',
        };
      default:
        return {
          icon: <Clock className="w-5 h-5" />,
          text: 'Processing',
          subtext: 'Please wait...',
          color: 'text-gray-500',
        };
    }
  };

  const statusInfo = getStatusInfo();
  const showDriver = ['ready', 'claimed', 'out_for_delivery'].includes(orderStatus);

  // Build route path for polyline
  const routePath = [];
  if (orderStatus === 'out_for_delivery' && driverLocation && deliveryCoordinates) {
    routePath.push(driverLocation, deliveryCoordinates);
  } else if (showDriver && driverLocation && vendorCoordinates) {
    routePath.push(driverLocation, vendorCoordinates);
  }

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-200">
      {/* Map */}
      <div className="relative h-48 sm:h-64">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          options={mapOptions}
          onLoad={onMapLoad}
          center={deliveryCoordinates || vendorCoordinates || { lat: 19.75, lng: -70.45 }}
          zoom={14}
        >
          {/* Route Line */}
          {routePath.length > 1 && (
            <Polyline
              path={routePath}
              options={{
                strokeColor: '#10b981',
                strokeWeight: 4,
                strokeOpacity: 0.8,
              }}
            />
          )}

          {/* Vendor Marker */}
          {vendorCoordinates && (
            <Marker
              position={vendorCoordinates}
              icon={{
                url:
                  'data:image/svg+xml;charset=UTF-8,' +
                  encodeURIComponent(`
                    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
                      <path d="M18 0C8 0 0 8 0 18c0 13.5 18 26 18 26s18-12.5 18-26C36 8 28 0 18 0z" fill="#3b82f6"/>
                      <circle cx="18" cy="16" r="8" fill="white"/>
                      <rect x="13" y="11" width="10" height="10" rx="2" fill="#3b82f6"/>
                    </svg>
                  `),
                scaledSize: new google.maps.Size(36, 44),
                anchor: new google.maps.Point(18, 44),
              }}
            />
          )}

          {/* Delivery Location Marker */}
          {deliveryCoordinates && (
            <Marker
              position={deliveryCoordinates}
              icon={{
                url:
                  'data:image/svg+xml;charset=UTF-8,' +
                  encodeURIComponent(`
                    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
                      <path d="M18 0C8 0 0 8 0 18c0 13.5 18 26 18 26s18-12.5 18-26C36 8 28 0 18 0z" fill="#ef4444"/>
                      <circle cx="18" cy="16" r="8" fill="white"/>
                      <circle cx="18" cy="16" r="4" fill="#ef4444"/>
                    </svg>
                  `),
                scaledSize: new google.maps.Size(36, 44),
                anchor: new google.maps.Point(18, 44),
              }}
            />
          )}

          {/* Driver Marker */}
          {showDriver && driverLocation && (
            <Marker
              position={driverLocation}
              icon={{
                url:
                  'data:image/svg+xml;charset=UTF-8,' +
                  encodeURIComponent(`
                    <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
                      <circle cx="22" cy="22" r="20" fill="#10b981" stroke="#fff" stroke-width="3"/>
                      <path d="M15 22h14M22 15l7 7-7 7" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  `),
                scaledSize: new google.maps.Size(44, 44),
                anchor: new google.maps.Point(22, 22),
              }}
            />
          )}
        </GoogleMap>

        {/* ETA Badge */}
        {eta && orderStatus === 'out_for_delivery' && (
          <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-md">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-semibold text-gray-900">{eta}</span>
            </div>
          </div>
        )}
      </div>

      {/* Status Card */}
      <div className="p-4">
        {/* Current Status */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2.5 rounded-xl bg-gray-100 ${statusInfo.color}`}>
            {statusInfo.icon}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900">{statusInfo.text}</p>
            <p className="text-sm text-gray-500">{statusInfo.subtext}</p>
          </div>
        </div>

        {/* Driver Info */}
        {showDriver && driverInfo && (
          <div className="bg-gray-50 rounded-xl p-3 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{driverInfo.name}</p>
                  <p className="text-xs text-gray-500 capitalize">
                    {driverInfo.vehicleType || 'Driver'}
                  </p>
                </div>
              </div>
              {driverInfo.phone && (
                <a
                  href={`tel:${driverInfo.phone}`}
                  className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl hover:bg-emerald-200 transition-colors"
                >
                  <Phone className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Expandable Details */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between py-2 text-sm text-gray-500 hover:text-gray-700"
        >
          <span>Delivery details</span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {expanded && (
          <div className="space-y-3 pt-2 border-t border-gray-100">
            {/* Pickup Location */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Store className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Pickup</p>
                <p className="text-sm text-gray-900">{vendorName}</p>
                {vendorAddress && (
                  <p className="text-xs text-gray-500">{vendorAddress}</p>
                )}
              </div>
            </div>

            {/* Delivery Location */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Deliver to</p>
                <p className="text-sm text-gray-900">{deliveryAddress}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}