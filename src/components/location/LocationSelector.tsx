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
  Loader2,
  Navigation,
  Home,
  Briefcase,
  Building2,
} from 'lucide-react';
import { SavedLocation, Coordinates, LocationPin } from '@/lib/types/location';
import { GoogleMapsProvider } from '@/components/maps/GoogleMapsProvider';
import { LocationPicker } from '@/components/maps/LocationPicker';

////////////////////////////////////////////////////////////////////////////////
// TYPES
////////////////////////////////////////////////////////////////////////////////

interface LocationSelectorProps {
  user: User | null;
  language: string;
  isOpen: boolean;
  onClose: () => void;
  currentLocation: string;
  onLocationChange: (location: string, coordinates?: Coordinates) => void;
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
  const [savingLocation, setSavingLocation] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [newLabel, setNewLabel] = useState('');

  // Listen to saved locations from Firestore subcollection (customers collection)
  useEffect(() => {
    if (!user) {
      setSavedLocations([]);
      setLoadingLocations(false);
      return;
    }

    // Changed from 'users' to 'customers'
    const locationsRef = collection(db, 'customers', user.uid, 'savedLocations');
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
          onLocationChange(defaultLoc.address, defaultLoc.coordinates);
        }
      },
      (error) => {
        console.error('Error fetching saved locations:', error);
        setLoadingLocations(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Select a saved address and set it as default
  const selectSavedAddress = useCallback(
    async (location: SavedLocation) => {
      onLocationChange(location.address, location.coordinates);

      // Set this as default if user is logged in
      if (user && !location.isDefault) {
        try {
          const batch = writeBatch(db);

          // Remove default from all others (changed from 'users' to 'customers')
          savedLocations
            .filter((loc) => loc.isDefault)
            .forEach((loc) => {
              const ref = doc(db, 'customers', user.uid, 'savedLocations', loc.id);
              batch.update(ref, { isDefault: false });
            });

          // Set this one as default (changed from 'users' to 'customers')
          const currentRef = doc(db, 'customers', user.uid, 'savedLocations', location.id);
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

  // Handle location selection from map picker (Google Maps)
  const handleMapLocationSelect = useCallback(
    async (locationPin: LocationPin) => {
      const { address, coordinates } = locationPin;

      // Update the current location immediately
      onLocationChange(address, coordinates);

      // Save to profile if user is logged in
      if (user) {
        setSavingLocation(true);
        try {
          // Changed from 'users' to 'customers'
          const locationsRef = collection(db, 'customers', user.uid, 'savedLocations');

          // Check if this location already exists (within ~100m)
          const existingLoc = savedLocations.find((loc) => {
            const latDiff = Math.abs(loc.coordinates.lat - coordinates.lat);
            const lngDiff = Math.abs(loc.coordinates.lng - coordinates.lng);
            return latDiff < 0.001 && lngDiff < 0.001; // ~100m threshold
          });

          if (existingLoc) {
            // Update existing location and set as default (changed from 'users' to 'customers')
            const existingRef = doc(db, 'customers', user.uid, 'savedLocations', existingLoc.id);

            // Remove default from others first
            const batch = writeBatch(db);
            savedLocations
              .filter((loc) => loc.isDefault && loc.id !== existingLoc.id)
              .forEach((loc) => {
                const ref = doc(db, 'customers', user.uid, 'savedLocations', loc.id);
                batch.update(ref, { isDefault: false });
              });

            batch.update(existingRef, {
              address,
              coordinates,
              isDefault: true,
              updatedAt: serverTimestamp(),
            });

            await batch.commit();
          } else {
            // Remove default from all others first (changed from 'users' to 'customers')
            const batch = writeBatch(db);
            savedLocations
              .filter((loc) => loc.isDefault)
              .forEach((loc) => {
                const ref = doc(db, 'customers', user.uid, 'savedLocations', loc.id);
                batch.update(ref, { isDefault: false });
              });
            await batch.commit();

            // Add new location as default
            const label = newLabel.trim() || (language === 'es' ? 'Mi ubicación' : 'My Location');
            await addDoc(locationsRef, {
              label,
              address,
              coordinates,
              isDefault: true,
              createdAt: serverTimestamp(),
            });
          }
        } catch (error) {
          console.error('Error saving location to profile:', error);
        }
        setSavingLocation(false);
      }

      setShowMapPicker(false);
      setNewLabel('');
      onClose();
    },
    [user, savedLocations, language, newLabel, onLocationChange, onClose]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end lg:items-center lg:justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => {
          if (!showMapPicker) onClose();
        }}
      />

      {/* Bottom Sheet (Mobile) / Centered Modal (Desktop) */}
      <div
        className={`relative w-full bg-white rounded-t-3xl lg:rounded-2xl p-6 safe-area-bottom lg:m-4 overflow-hidden transition-all duration-300 ${
          showMapPicker ? 'lg:max-w-2xl max-h-[95vh]' : 'lg:max-w-md max-h-[85vh]'
        }`}
        style={{ animation: 'slideUp 0.3s ease-out' }}
      >
        {/* Drag handle - mobile only */}
        <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4 lg:hidden" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors z-10"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        <h3 className="text-xl font-bold text-gray-900 mb-1 pr-10">
          {showMapPicker
            ? language === 'es'
              ? 'Seleccionar ubicación'
              : 'Select Location'
            : language === 'es'
            ? 'Tu ubicación'
            : 'Your Location'}
        </h3>
        <p className="text-gray-500 text-sm mb-4">
          {showMapPicker
            ? language === 'es'
              ? 'Busca o toca el mapa para seleccionar tu ubicación exacta'
              : 'Search or tap the map to select your exact location'
            : language === 'es'
            ? 'Selecciona una dirección guardada o detecta tu ubicación'
            : 'Select a saved address or detect your location'}
        </p>

        {/* Content Area - Scrollable */}
        <div className={`overflow-y-auto ${showMapPicker ? 'max-h-[70vh]' : 'max-h-[60vh]'}`}>
          {/* Map Picker View */}
          {showMapPicker ? (
            <div className="space-y-4">
              {/* Label Input for new location */}
              {user && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {language === 'es' ? 'Etiqueta (opcional)' : 'Label (optional)'}
                  </label>
                  <div className="flex gap-2 flex-wrap mb-2">
                    {['Home', 'Work', 'Office'].map((label) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setNewLabel(label)}
                        className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                          newLabel === label
                            ? 'bg-[#55529d] text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder={language === 'es' ? 'O escribe una etiqueta...' : 'Or enter custom label...'}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#55529d] focus:border-transparent text-sm"
                  />
                </div>
              )}

              {/* Google Maps Location Picker */}
              <GoogleMapsProvider>
                <LocationPicker
                  onLocationSelect={handleMapLocationSelect}
                  onCancel={() => setShowMapPicker(false)}
                  height="350px"
                  showSaveButton={true}
                  saveButtonText={
                    savingLocation
                      ? language === 'es'
                        ? 'Guardando...'
                        : 'Saving...'
                      : language === 'es'
                      ? 'Usar esta ubicación'
                      : 'Use this location'
                  }
                  placeholder={
                    language === 'es'
                      ? 'Buscar dirección...'
                      : 'Search for an address...'
                  }
                />
              </GoogleMapsProvider>

              {/* Back Button */}
              <button
                onClick={() => setShowMapPicker(false)}
                className="w-full py-3 text-gray-500 font-medium text-sm hover:text-gray-700"
              >
                {language === 'es' ? '← Volver' : '← Back'}
              </button>
            </div>
          ) : (
            <>
              {/* Loading State */}
              {user && loadingLocations && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-[#55529d]" />
                </div>
              )}

              {/* Saved Addresses */}
              {user && !loadingLocations && savedLocations.length > 0 && (
                <div className="mb-4">
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
                              ? 'border-[#55529d] bg-[#55529d]/5'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                              isSelected ? 'bg-[#55529d] text-white' : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            <IconComponent className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm truncate">{loc.address}</p>
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              {loc.label}
                              {loc.isDefault && (
                                <span className="text-[#55529d]">
                                  • {language === 'es' ? 'Predeterminada' : 'Default'}
                                </span>
                              )}
                            </p>
                          </div>
                          {isSelected && <BadgeCheck className="w-5 h-5 text-[#55529d] flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Divider */}
              {user && !loadingLocations && savedLocations.length > 0 && (
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400 uppercase">
                    {language === 'es' ? 'O' : 'Or'}
                  </span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
              )}

              {/* Detect/Select Location Button - Opens Map */}
              <button
                onClick={() => setShowMapPicker(true)}
                className="w-full flex items-center justify-center gap-2 bg-[#55529d] text-white py-4 rounded-xl font-semibold hover:bg-[#433f7a] transition-colors"
              >
                <Navigation className="w-5 h-5" />
                {language === 'es' ? 'Detectar o seleccionar ubicación' : 'Detect or select location'}
              </button>

              {/* Precision note */}
              <p className="text-xs text-gray-400 text-center mt-2">
                {language === 'es'
                  ? 'Usa el mapa para obtener tu ubicación exacta'
                  : 'Use the map to get your exact location'}
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
                    className="mt-2 w-full flex items-center justify-center gap-2 text-[#55529d] font-semibold text-sm hover:underline"
                  >
                    {language === 'es' ? 'Iniciar sesión' : 'Sign in'}
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              )}

              {/* Close Button - mobile only */}
              <button onClick={onClose} className="w-full mt-4 py-3 text-gray-500 font-medium lg:hidden">
                {language === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Animation Styles */}
      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
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

export function LocationButton({ currentLocation, onClick, compact = false }: LocationButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 hover:bg-gray-50 rounded-lg transition-colors active:bg-gray-100 ${
        compact ? 'px-2 py-1' : 'px-2 py-1.5 -mx-2'
      }`}
    >
      <MapPin className="w-4 h-4 text-[#55529d]" />
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