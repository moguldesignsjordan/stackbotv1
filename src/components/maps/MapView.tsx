// src/components/maps/MapView.tsx
'use client';

import { useCallback, useState } from 'react';
import { GoogleMap, Marker } from '@react-google-maps/api';
import { MapPin, ExternalLink } from 'lucide-react';
import { Coordinates, DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '@/lib/types/location';

interface MapViewProps {
  coordinates?: Coordinates;
  address?: string;
  height?: string;
  showOpenInMaps?: boolean;
  markerLabel?: string;
  zoom?: number;
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '12px',
};

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  clickableIcons: false,
  draggable: true,
  scrollwheel: false,
  styles: [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }],
    },
  ],
};

export function MapView({
  coordinates,
  address,
  height = '200px',
  showOpenInMaps = true,
  markerLabel,
  zoom = 16,
}: MapViewProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const onLoad = useCallback(
    (map: google.maps.Map) => {
      setMap(map);
      if (coordinates) {
        map.setCenter(coordinates);
        map.setZoom(zoom);
      }
    },
    [coordinates, zoom]
  );

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const openInGoogleMaps = () => {
    if (!coordinates) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${coordinates.lat},${coordinates.lng}`;
    window.open(url, '_blank');
  };

  if (!coordinates) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center bg-gray-100 rounded-xl border border-gray-200"
      >
        <div className="text-center text-gray-500">
          <MapPin className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">No location set</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        style={{ height }}
        className="relative rounded-xl overflow-hidden border border-gray-200"
      >
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={coordinates}
          zoom={zoom}
          onLoad={onLoad}
          onUnmount={onUnmount}
          options={mapOptions}
        >
          <Marker
            position={coordinates}
            icon={{
              url:
                'data:image/svg+xml;charset=UTF-8,' +
                encodeURIComponent(`
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="50" viewBox="0 0 40 50">
                    <path d="M20 0C9 0 0 9 0 20c0 15 20 30 20 30s20-15 20-30C40 9 31 0 20 0z" fill="#55529d"/>
                    <circle cx="20" cy="18" r="10" fill="white"/>
                    <circle cx="20" cy="18" r="5" fill="#55529d"/>
                  </svg>
                `),
              scaledSize: new google.maps.Size(40, 50),
              anchor: new google.maps.Point(20, 50),
            }}
            label={
              markerLabel
                ? {
                    text: markerLabel,
                    color: '#55529d',
                    fontWeight: 'bold',
                    fontSize: '12px',
                  }
                : undefined
            }
          />
        </GoogleMap>

        {showOpenInMaps && (
          <button
            onClick={openInGoogleMaps}
            className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-white shadow-md rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Open in Maps
          </button>
        )}
      </div>

      {address && (
        <div className="flex items-start gap-2 text-sm text-gray-600">
          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400" />
          <span>{address}</span>
        </div>
      )}
    </div>
  );
}