// src/components/maps/LocationPicker.tsx
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMap } from '@react-google-maps/api';
import {
  MapPin,
  Search,
  Lock,
  Unlock,
  RotateCcw,
  Navigation,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import {
  Coordinates,
  LocationPin,
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
} from '@/lib/types/location';

interface LocationPickerProps {
  initialLocation?: Coordinates;
  initialAddress?: string;
  onLocationSelect: (location: LocationPin) => void;
  onCancel?: () => void;
  height?: string;
  showSaveButton?: boolean;
  saveButtonText?: string;
  placeholder?: string;
  restrictToCaribbean?: boolean;
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '12px',
};

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
  clickableIcons: false,
  mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID',
};

export function LocationPicker({
  initialLocation,
  initialAddress = '',
  onLocationSelect,
  onCancel,
  height = '400px',
  showSaveButton = true,
  saveButtonText = 'Confirm Location',
  placeholder = 'Search for an address...',
  restrictToCaribbean = true,
}: LocationPickerProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [marker, setMarker] = useState<Coordinates | null>(initialLocation || null);
  const [address, setAddress] = useState(initialAddress);
  const [isLocked, setIsLocked] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState(initialAddress);

  const advancedMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const autocompleteInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  
  // Refs for stable callback references
  const updateMarkerPositionRef = useRef<((coords: Coordinates) => void) | undefined>(undefined);
  const reverseGeocodeRef = useRef<((coords: Coordinates) => Promise<string>) | undefined>(undefined);

  // Initialize geocoder
  useEffect(() => {
    if (typeof google !== 'undefined' && google.maps) {
      geocoderRef.current = new google.maps.Geocoder();
    }
  }, []);

  // Reverse geocode coordinates to address
  const reverseGeocode = useCallback(async (coords: Coordinates): Promise<string> => {
    if (!geocoderRef.current) return '';

    setIsGeocoding(true);
    try {
      const response = await geocoderRef.current.geocode({
        location: coords,
      });

      if (response.results[0]) {
        return response.results[0].formatted_address;
      }
    } catch (err) {
      console.error('Reverse geocode error:', err);
    } finally {
      setIsGeocoding(false);
    }
    return '';
  }, []);

  // Keep ref updated
  useEffect(() => {
    reverseGeocodeRef.current = reverseGeocode;
  }, [reverseGeocode]);

  // Create/update AdvancedMarkerElement
  const updateMarkerPosition = useCallback(
    (coords: Coordinates) => {
      if (!map) return;

      // Remove existing marker
      if (advancedMarkerRef.current) {
        advancedMarkerRef.current.map = null;
      }

      try {
        // Create pin element
        const pinElement = document.createElement('div');
        pinElement.innerHTML = isLocked
          ? `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="50" viewBox="0 0 40 50">
              <path d="M20 0C9 0 0 9 0 20c0 15 20 30 20 30s20-15 20-30C40 9 31 0 20 0z" fill="#16a34a"/>
              <circle cx="20" cy="18" r="8" fill="white"/>
              <rect x="15" y="14" width="10" height="8" rx="1" fill="#16a34a"/>
              <rect x="17" y="10" width="6" height="6" rx="3" stroke="#16a34a" stroke-width="2" fill="none"/>
            </svg>`
          : `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="50" viewBox="0 0 40 50">
              <path d="M20 0C9 0 0 9 0 20c0 15 20 30 20 30s20-15 20-30C40 9 31 0 20 0z" fill="#55529d"/>
              <circle cx="20" cy="18" r="10" fill="white"/>
              <circle cx="20" cy="18" r="5" fill="#55529d"/>
            </svg>`;

        // Check if AdvancedMarkerElement is available
        if (google.maps.marker?.AdvancedMarkerElement) {
          advancedMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({
            map,
            position: coords,
            content: pinElement,
            gmpDraggable: !isLocked,
            title: isLocked ? 'Location Locked' : 'Drag to adjust',
          });

          // Add drag listener
          if (!isLocked) {
            advancedMarkerRef.current.addListener('dragend', async () => {
              const position = advancedMarkerRef.current?.position;
              if (position) {
                const newCoords: Coordinates = {
                  lat: typeof position.lat === 'function' ? position.lat() : position.lat,
                  lng: typeof position.lng === 'function' ? position.lng() : position.lng,
                };
                setMarker(newCoords);
                const addr = await reverseGeocodeRef.current?.(newCoords);
                if (addr) {
                  setAddress(addr);
                  setSearchValue(addr);
                }
              }
            });
          }
        } else {
          // Fallback to legacy Marker if AdvancedMarkerElement not available
          console.warn('AdvancedMarkerElement not available, using legacy Marker');
          const legacyMarker = new google.maps.Marker({
            map,
            position: coords,
            draggable: !isLocked,
            icon: {
              url:
                'data:image/svg+xml;charset=UTF-8,' +
                encodeURIComponent(pinElement.innerHTML),
              scaledSize: new google.maps.Size(40, 50),
              anchor: new google.maps.Point(20, 50),
            },
          });

          legacyMarker.addListener('dragend', async () => {
            const position = legacyMarker.getPosition();
            if (position) {
              const newCoords: Coordinates = {
                lat: position.lat(),
                lng: position.lng(),
              };
              setMarker(newCoords);
              const addr = await reverseGeocodeRef.current?.(newCoords);
              if (addr) {
                setAddress(addr);
                setSearchValue(addr);
              }
            }
          });

          // Store reference for cleanup
          (advancedMarkerRef as any).current = legacyMarker;
        }
      } catch (err) {
        console.error('Marker creation error:', err);
      }
    },
    [map, isLocked]
  );

  // Keep ref updated
  useEffect(() => {
    updateMarkerPositionRef.current = updateMarkerPosition;
  }, [updateMarkerPosition]);

  // Update marker when lock state changes
  useEffect(() => {
    if (marker) {
      updateMarkerPosition(marker);
    }
  }, [isLocked, marker, updateMarkerPosition]);

  // Initialize Places Autocomplete
  useEffect(() => {
    if (!autocompleteInputRef.current || !map) return;
    if (typeof google === 'undefined' || !google.maps?.places) return;

    try {
      const options: google.maps.places.AutocompleteOptions = {
        types: ['address'],
        fields: ['formatted_address', 'geometry', 'name'],
      };

      if (restrictToCaribbean) {
        options.componentRestrictions = {
          country: ['do', 'pr', 'jm', 'ht', 'cu', 'bs', 'bb', 'tt', 'aw', 'cw'],
        };
      }

      autocompleteRef.current = new google.maps.places.Autocomplete(
        autocompleteInputRef.current,
        options
      );

      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();

        if (place?.geometry?.location) {
          const coords: Coordinates = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          };

          setMarker(coords);
          setAddress(place.formatted_address || '');
          setSearchValue(place.formatted_address || '');
          setError(null);
          updateMarkerPositionRef.current?.(coords);

          map?.panTo(coords);
          map?.setZoom(17);
        }
      });
    } catch (err) {
      console.error('Autocomplete init error:', err);
    }

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [map, restrictToCaribbean]);

  const onLoad = useCallback(
    (mapInstance: google.maps.Map) => {
      setMap(mapInstance);

      if (initialLocation) {
        mapInstance.setCenter(initialLocation);
        mapInstance.setZoom(17);
      }
    },
    [initialLocation]
  );

  const onUnmount = useCallback(() => {
    if (advancedMarkerRef.current) {
      advancedMarkerRef.current.map = null;
    }
    setMap(null);
  }, []);

  // Handle map click to place/move marker
  const handleMapClick = useCallback(
    async (e: google.maps.MapMouseEvent) => {
      if (isLocked) return;
      if (!e.latLng) return;

      const coords: Coordinates = {
        lat: e.latLng.lat(),
        lng: e.latLng.lng(),
      };

      setMarker(coords);
      setError(null);
      updateMarkerPositionRef.current?.(coords);

      const addr = await reverseGeocodeRef.current?.(coords);
      if (addr) {
        setAddress(addr);
        setSearchValue(addr);
      }
    },
    [isLocked]
  );

  // Get user's current location
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setIsGettingLocation(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords: Coordinates = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setMarker(coords);
        updateMarkerPositionRef.current?.(coords);

        const addr = await reverseGeocodeRef.current?.(coords);
        if (addr) {
          setAddress(addr);
          setSearchValue(addr);
        }

        map?.panTo(coords);
        map?.setZoom(17);

        setIsGettingLocation(false);
      },
      (err) => {
        // Provide specific error messages based on error code
        let errorMessage = 'Unable to get your location. Please search or click on the map.';
        
        if (err.code === 1) {
          // PERMISSION_DENIED
          errorMessage = 'Location access denied. Please enable location permissions in your browser settings, or search/click on the map.';
        } else if (err.code === 2) {
          // POSITION_UNAVAILABLE
          errorMessage = 'Location unavailable. Please check your device\'s location settings, or search/click on the map.';
        } else if (err.code === 3) {
          // TIMEOUT
          errorMessage = 'Location request timed out. Please try again or search/click on the map.';
        }
        
        setError(errorMessage);
        setIsGettingLocation(false);
        console.warn('Geolocation error:', err.code, err.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [map]);

  // Reset to initial state
  const handleReset = useCallback(() => {
    setMarker(initialLocation || null);
    setAddress(initialAddress);
    setSearchValue(initialAddress);
    setIsLocked(false);
    setError(null);

    if (advancedMarkerRef.current) {
      advancedMarkerRef.current.map = null;
    }

    if (initialLocation) {
      updateMarkerPositionRef.current?.(initialLocation);
    }

    map?.setCenter(initialLocation || DEFAULT_MAP_CENTER);
    map?.setZoom(initialLocation ? 17 : DEFAULT_MAP_ZOOM);
  }, [map, initialLocation, initialAddress]);

  // Toggle lock state
  const toggleLock = useCallback(() => {
    if (!marker) {
      setError('Please select a location first');
      return;
    }
    setIsLocked(!isLocked);
  }, [marker, isLocked]);

  // Confirm and save location
  const handleConfirm = useCallback(() => {
    if (!marker) {
      setError('Please select a location on the map');
      return;
    }

    onLocationSelect({
      coordinates: marker,
      address,
      pinLocked: isLocked,
    });
  }, [marker, address, isLocked, onLocationSelect]);

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
        <input
          ref={autocompleteInputRef}
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder={placeholder}
          disabled={isLocked}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#55529d] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
        />
        {isGeocoding && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={getCurrentLocation}
          disabled={isLocked || isGettingLocation}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#55529d] bg-purple-50 hover:bg-purple-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isGettingLocation ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Navigation className="w-4 h-4" />
          )}
          {isGettingLocation ? 'Getting location...' : 'Use My Location'}
        </button>

        <button
          type="button"
          onClick={toggleLock}
          disabled={!marker}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            isLocked
              ? 'text-white bg-green-600 hover:bg-green-700'
              : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isLocked ? (
            <>
              <Lock className="w-4 h-4" />
              Locked
            </>
          ) : (
            <>
              <Unlock className="w-4 h-4" />
              Lock Pin
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Map Container */}
      <div style={{ height }} className="relative rounded-xl overflow-hidden border border-gray-200">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={marker || DEFAULT_MAP_CENTER}
          zoom={marker ? 17 : DEFAULT_MAP_ZOOM}
          onLoad={onLoad}
          onUnmount={onUnmount}
          onClick={handleMapClick}
          options={mapOptions}
        />

        {/* Lock overlay indicator */}
        {isLocked && (
          <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-full shadow-lg">
            <Lock className="w-4 h-4" />
            Location Locked
          </div>
        )}

        {/* Instructions overlay */}
        {!marker && (
          <div className="absolute bottom-4 left-4 right-4 p-3 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg text-center">
            <div className="flex items-center justify-center gap-2 text-gray-700">
              <MapPin className="w-5 h-5 text-[#55529d]" />
              <span className="text-sm font-medium">
                Click on the map or search to place your delivery pin
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Selected Address Display */}
      {marker && address && (
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
          <div className="flex items-start gap-3">
            <MapPin
              className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                isLocked ? 'text-green-600' : 'text-[#55529d]'
              }`}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">Selected Location</p>
              <p className="text-sm text-gray-600 mt-1">{address}</p>
              <p className="text-xs text-gray-400 mt-1 font-mono">
                {marker.lat.toFixed(6)}, {marker.lng.toFixed(6)}
              </p>
            </div>
            {isLocked && (
              <div className="flex-shrink-0">
                <Check className="w-5 h-5 text-green-600" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {showSaveButton && (
        <div className="flex gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!marker}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-white bg-[#55529d] hover:bg-[#444182] disabled:bg-gray-300 disabled:cursor-not-allowed rounded-xl font-medium transition-colors"
          >
            <Check className="w-5 h-5" />
            {saveButtonText}
          </button>
        </div>
      )}
    </div>
  );
}