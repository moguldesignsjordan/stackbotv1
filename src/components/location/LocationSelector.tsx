// src/components/location/LocationSelector.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { User } from 'firebase/auth';
import {
  MapPin,
  X,
  ChevronRight,
  ChevronDown,
  BadgeCheck,
  Compass,
  Loader2,
  Navigation,
  Home,
  Briefcase,
  Building2,
} from 'lucide-react';

////////////////////////////////////////////////////////////////////////////////
// TYPES
////////////////////////////////////////////////////////////////////////////////

interface Coordinates {
  lat: number;
  lng: number;
}

interface SavedLocation {
  id: string;
  label: string;
  address: string;
  coordinates: Coordinates;
  isDefault: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

interface LocationSelectorProps {
  user: User | null;
  language: string;
  isOpen: boolean;
  onClose: () => void;
  currentLocation: string;
  onLocationChange: (location: string) => void;
}

////////////////////////////////////////////////////////////////////////////////
// CONSTANTS
////////////////////////////////////////////////////////////////////////////////

const LABEL_ICONS: Record<string, typeof Home> = {
  Home: Home,
  Work: Briefcase,
  Office: Building2,
};

////////////////////////////////////////////////////////////////////////////////
// COMPONENT
////////////////////////////////////////////////////////////////////////////////

export function LocationSelector({
  user,
  language,
  isOpen,
  onClose,
  currentLocation,
  onLocationChange,
}: LocationSelectorProps) {
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Listen to saved locations from Firestore subcollection
  useEffect(() => {
    if (!user) {
      setSavedLocations([]);
      setLoadingLocations(false);
      return;
    }

    const locationsRef = collection(db, 'users', user.uid, 'savedLocations');
    const q = query(locationsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const locs: SavedLocation[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          locs.push({
            id: docSnap.id,
            label: data.label || 'Location',
            address: data.address || '',
            coordinates: data.coordinates || { lat: 0, lng: 0 },
            isDefault: data.isDefault || false,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate(),
          });
        });
        setSavedLocations(locs);
        setLoadingLocations(false);

        // Set default location if user hasn't selected one yet
        const defaultLoc = locs.find((l) => l.isDefault);
        if (defaultLoc && currentLocation === 'Sosúa, Puerto Plata') {
          onLocationChange(defaultLoc.address);
        }
      },
      (error) => {
        console.error('Error fetching saved locations:', error);
        setLoadingLocations(false);
      }
    );

    return () => unsubscribe();
  }, [user, currentLocation, onLocationChange]);

  // Select a saved address
  const selectSavedAddress = useCallback(
    async (location: SavedLocation) => {
      onLocationChange(location.address);

      // Set this as default if user is logged in
      if (user && !location.isDefault) {
        try {
          const batch = writeBatch(db);
          
          // Remove default from all others
          savedLocations
            .filter((loc) => loc.isDefault)
            .forEach((loc) => {
              const ref = doc(db, 'users', user.uid, 'savedLocations', loc.id);
              batch.update(ref, { isDefault: false });
            });

          // Set this one as default
          const currentRef = doc(db, 'users', user.uid, 'savedLocations', location.id);
          batch.update(currentRef, { isDefault: true, updatedAt: serverTimestamp() });

          await batch.commit();
        } catch (error) {
          console.error('Error setting default location:', error);
        }
      }

      onClose();
    },
    [user, savedLocations, onLocationChange, onClose]
  );

  // Get precise location using browser geolocation + reverse geocoding
  const detectLocation = useCallback(
    async (saveToProfile: boolean = false) => {
      setLoadingGeo(true);
      setGeoError(null);

      if (!navigator.geolocation) {
        setGeoError(
          language === 'es'
            ? 'Geolocalización no disponible'
            : 'Geolocation not available'
        );
        setLoadingGeo(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude, accuracy } = position.coords;
            console.log(`Location detected: ${latitude}, ${longitude} (accuracy: ${accuracy}m)`);

            // Use zoom=18 for street-level precision (vs zoom=10 for municipality)
            // addressdetails=1 gives us granular components
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?` +
                `format=json&lat=${latitude}&lon=${longitude}` +
                `&zoom=18&addressdetails=1&accept-language=${language}`
            );

            if (!response.ok) {
              throw new Error('Geocoding request failed');
            }

            const data = await response.json();
            console.log('Nominatim response:', data);

            if (data && data.address) {
              // Build precise location string from most specific to least specific
              const addr = data.address;
              
              // Try to get the most precise location name
              const neighborhood =
                addr.neighbourhood ||
                addr.suburb ||
                addr.hamlet ||
                addr.village ||
                addr.residential ||
                addr.quarter ||
                '';
                
              const road = addr.road || addr.street || '';
              
              const city =
                addr.city ||
                addr.town ||
                addr.municipality ||
                addr.county ||
                '';
                
              const state =
                addr.state ||
                addr.province ||
                addr.region ||
                '';

              // Build a more precise location string
              let locationStr = '';
              
              if (neighborhood && city) {
                // Show: "El Batey, Sosúa" or "Charamicos, Puerto Plata"
                locationStr = `${neighborhood}, ${city}`;
              } else if (road && city) {
                // Show: "Calle Principal, Sosúa"
                locationStr = `${road}, ${city}`;
              } else if (city && state) {
                // Fallback: "Sosúa, Puerto Plata"
                locationStr = `${city}, ${state}`;
              } else {
                // Last resort
                locationStr = data.display_name?.split(',').slice(0, 2).join(',') || 'Location detected';
              }

              onLocationChange(locationStr);

              // Save to profile if requested and user is logged in
              if (saveToProfile && user) {
                setSavingLocation(true);
                try {
                  const locationsRef = collection(db, 'users', user.uid, 'savedLocations');

                  // Check if this location already exists (within ~100m)
                  const existingLoc = savedLocations.find((loc) => {
                    const latDiff = Math.abs(loc.coordinates.lat - latitude);
                    const lngDiff = Math.abs(loc.coordinates.lng - longitude);
                    return latDiff < 0.001 && lngDiff < 0.001; // ~100m threshold
                  });

                  if (existingLoc) {
                    // Update existing location
                    const existingRef = doc(db, 'users', user.uid, 'savedLocations', existingLoc.id);
                    await updateDoc(existingRef, {
                      address: locationStr,
                      coordinates: { lat: latitude, lng: longitude },
                      isDefault: true,
                      updatedAt: serverTimestamp(),
                    });

                    // Remove default from others
                    const batch = writeBatch(db);
                    savedLocations
                      .filter((loc) => loc.isDefault && loc.id !== existingLoc.id)
                      .forEach((loc) => {
                        const ref = doc(db, 'users', user.uid, 'savedLocations', loc.id);
                        batch.update(ref, { isDefault: false });
                      });
                    await batch.commit();
                  } else {
                    // Add new location
                    // First, remove default from all others
                    const batch = writeBatch(db);
                    savedLocations
                      .filter((loc) => loc.isDefault)
                      .forEach((loc) => {
                        const ref = doc(db, 'users', user.uid, 'savedLocations', loc.id);
                        batch.update(ref, { isDefault: false });
                      });
                    await batch.commit();

                    // Now add the new location
                    await addDoc(locationsRef, {
                      label: language === 'es' ? 'Mi ubicación' : 'My Location',
                      address: locationStr,
                      coordinates: {
                        lat: latitude,
                        lng: longitude,
                      },
                      isDefault: true,
                      createdAt: serverTimestamp(),
                    });
                  }
                } catch (error) {
                  console.error('Error saving location to profile:', error);
                }
                setSavingLocation(false);
              }
            } else {
              setGeoError(
                language === 'es'
                  ? 'No se pudo determinar la dirección'
                  : 'Could not determine address'
              );
            }
          } catch (error) {
            console.error('Error getting location:', error);
            setGeoError(
              language === 'es'
                ? 'Error al obtener ubicación'
                : 'Error getting location'
            );
          }
          setLoadingGeo(false);
          onClose();
        },
        (error) => {
          console.error('Geolocation error:', error);
          let errorMsg = '';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMsg =
                language === 'es'
                  ? 'Permiso de ubicación denegado'
                  : 'Location permission denied';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMsg =
                language === 'es'
                  ? 'Ubicación no disponible'
                  : 'Location unavailable';
              break;
            case error.TIMEOUT:
              errorMsg =
                language === 'es'
                  ? 'Tiempo de espera agotado'
                  : 'Location request timed out';
              break;
            default:
              errorMsg =
                language === 'es'
                  ? 'Error al obtener ubicación'
                  : 'Error getting location';
          }
          setGeoError(errorMsg);
          setLoadingGeo(false);
        },
        {
          enableHighAccuracy: true, // Request GPS-level accuracy
          timeout: 15000, // 15 second timeout
          maximumAge: 60000, // Accept cached position up to 1 minute old
        }
      );
    },
    [language, user, savedLocations, onLocationChange, onClose]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end lg:items-center lg:justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Bottom Sheet (Mobile) / Centered Modal (Desktop) */}
      <div className="relative w-full lg:w-auto lg:max-w-md bg-white rounded-t-3xl lg:rounded-2xl p-6 animate-slide-up lg:animate-fade-in safe-area-bottom lg:m-4 max-h-[85vh] overflow-y-auto">
        {/* Drag handle - mobile only */}
        <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6 lg:hidden" />

        {/* Close button - desktop */}
        <button
          onClick={onClose}
          className="hidden lg:flex absolute top-4 right-4 w-8 h-8 items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        <h3 className="text-xl font-bold text-gray-900 mb-2">
          {language === 'es' ? 'Tu ubicación' : 'Your Location'}
        </h3>
        <p className="text-gray-500 text-sm mb-6">
          {language === 'es'
            ? 'Selecciona una dirección guardada o detecta tu ubicación'
            : 'Select a saved address or detect your location'}
        </p>

        {/* Loading State */}
        {user && loadingLocations && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--sb-primary)]" />
          </div>
        )}

        {/* Saved Addresses - Show if user is logged in and has addresses */}
        {user && !loadingLocations && savedLocations.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              {language === 'es' ? 'Direcciones guardadas' : 'Saved Addresses'}
            </p>
            <div className="space-y-2">
              {savedLocations.map((loc) => {
                const IconComponent = LABEL_ICONS[loc.label] || MapPin;
                const isSelected = currentLocation === loc.address;

                return (
                  <button
                    key={loc.id}
                    onClick={() => selectSavedAddress(loc)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left ${
                      isSelected
                        ? 'border-[var(--sb-primary)] bg-[var(--sb-primary)]/5'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isSelected
                          ? 'bg-[var(--sb-primary)] text-white'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">
                        {loc.address}
                      </p>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        {loc.label}
                        {loc.isDefault && (
                          <span className="text-[var(--sb-primary)]">
                            • {language === 'es' ? 'Predeterminada' : 'Default'}
                          </span>
                        )}
                      </p>
                    </div>
                    {isSelected && (
                      <BadgeCheck className="w-5 h-5 text-[var(--sb-primary)]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Divider */}
        {user && !loadingLocations && savedLocations.length > 0 && (
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 uppercase">
              {language === 'es' ? 'O' : 'Or'}
            </span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
        )}

        {/* Error Message */}
        {geoError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {geoError}
          </div>
        )}

        {/* Detect Location Button */}
        <button
          onClick={() => detectLocation(!!user)}
          disabled={loadingGeo || savingLocation}
          className="w-full flex items-center justify-center gap-2 bg-[var(--sb-primary)] text-white py-4 rounded-xl font-semibold hover:bg-[var(--sb-primary-dark)] transition-colors disabled:opacity-50"
        >
          {loadingGeo || savingLocation ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {savingLocation
                ? language === 'es'
                  ? 'Guardando...'
                  : 'Saving...'
                : language === 'es'
                ? 'Detectando...'
                : 'Detecting...'}
            </>
          ) : (
            <>
              <Navigation className="w-5 h-5" />
              {language === 'es' ? 'Detectar mi ubicación' : 'Detect my location'}
            </>
          )}
        </button>

        {/* Precision note */}
        <p className="text-xs text-gray-400 text-center mt-2">
          {language === 'es'
            ? 'Detectamos tu ubicación exacta (barrio/calle)'
            : 'We detect your precise location (neighborhood/street)'}
        </p>

        {/* Save to profile note */}
        {user && (
          <p className="text-xs text-gray-400 text-center mt-1">
            {language === 'es'
              ? 'Se guardará automáticamente en tu perfil'
              : 'Will be automatically saved to your profile'}
          </p>
        )}

        {/* Login prompt if not logged in */}
        {!user && (
          <div className="mt-4 p-4 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-600 text-center">
              {language === 'es'
                ? 'Inicia sesión para guardar direcciones'
                : 'Sign in to save addresses'}
            </p>
            <Link
              href="/login"
              onClick={onClose}
              className="mt-2 w-full flex items-center justify-center gap-2 text-[var(--sb-primary)] font-semibold text-sm hover:underline"
            >
              {language === 'es' ? 'Iniciar sesión' : 'Sign in'}
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Close Button - mobile only */}
        <button
          onClick={onClose}
          className="w-full mt-4 py-3 text-gray-500 font-medium lg:hidden"
        >
          {language === 'es' ? 'Cancelar' : 'Cancel'}
        </button>
      </div>

      {/* Animation Styles */}
      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}

////////////////////////////////////////////////////////////////////////////////
// LOCATION BUTTON - For use in navbars
////////////////////////////////////////////////////////////////////////////////

interface LocationButtonProps {
  currentLocation: string;
  onClick: () => void;
  compact?: boolean;
}

export function LocationButton({
  currentLocation,
  onClick,
  compact = false,
}: LocationButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 hover:bg-gray-50 rounded-lg transition-colors active:bg-gray-100 ${
        compact ? 'px-2 py-1' : 'px-2 py-1.5 -mx-2'
      }`}
    >
      <MapPin className="w-4 h-4 text-[var(--sb-primary)]" />
      <span
        className={`font-semibold text-gray-900 truncate ${
          compact ? 'max-w-[120px] text-xs' : 'max-w-[200px] text-sm'
        }`}
      >
        {currentLocation}
      </span>
      <ChevronDown className="w-4 h-4 text-gray-400" />
    </button>
  );
}

export default LocationSelector;