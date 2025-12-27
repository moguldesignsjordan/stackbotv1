// src/components/maps/DeliveryLocationPicker.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  orderBy,
  getDocs,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/hooks/useAuth';
import {
  MapPin,
  Plus,
  ChevronDown,
  ChevronUp,
  Check,
  Home,
  Briefcase,
  Building2,
  Loader2,
} from 'lucide-react';
import { SavedLocation, LocationPin, DeliveryAddressWithPin } from '@/lib/types/location';
import { GoogleMapsProvider } from './GoogleMapsProvider';
import { LocationPicker } from './LocationPicker';

interface DeliveryLocationPickerProps {
  onLocationConfirm: (address: DeliveryAddressWithPin) => void;
  initialAddress?: DeliveryAddressWithPin;
}

const LOCATION_ICONS: Record<string, typeof Home> = {
  Home: Home,
  Work: Briefcase,
  Office: Building2,
};

type SelectionMode = 'saved' | 'new' | 'manual';

export function DeliveryLocationPicker({
  onLocationConfirm,
  initialAddress,
}: DeliveryLocationPickerProps) {
  const { user } = useAuth();
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('saved');
  const [selectedSaved, setSelectedSaved] = useState<SavedLocation | null>(null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [manualAddress, setManualAddress] = useState<DeliveryAddressWithPin>({
    street: initialAddress?.street || '',
    city: initialAddress?.city || '',
    state: initialAddress?.state || '',
    postalCode: initialAddress?.postalCode || '',
    country: initialAddress?.country || 'Dominican Republic',
    instructions: initialAddress?.instructions || '',
    coordinates: initialAddress?.coordinates,
    pinLocked: initialAddress?.pinLocked || false,
  });
  const [showSavedExpanded, setShowSavedExpanded] = useState(true);

  // Memoized handler for selecting saved locations
  const handleSavedLocationSelect = useCallback((location: SavedLocation) => {
    setSelectedSaved(location);
    setSelectionMode('saved');

    // Parse address into components (best effort)
    const parts = location.address.split(',').map((p) => p.trim());

    const address: DeliveryAddressWithPin = {
      street: parts[0] || '',
      city: parts[1] || '',
      state: parts[2] || '',
      postalCode: '',
      country: parts[parts.length - 1] || 'Dominican Republic',
      instructions: '',
      coordinates: location.coordinates,
      pinLocked: true,
    };

    onLocationConfirm(address);
  }, [onLocationConfirm]);

  // Fetch saved locations
  useEffect(() => {
    const fetchLocations = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const locationsRef = collection(db, 'users', user.uid, 'savedLocations');
        const q = query(locationsRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);

        const locs: SavedLocation[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          locs.push({
            id: doc.id,
            label: data.label,
            address: data.address,
            coordinates: data.coordinates,
            isDefault: data.isDefault || false,
            createdAt: data.createdAt?.toDate() || new Date(),
          });
        });

        setSavedLocations(locs);

        // Auto-select default if available and no initial address
        const defaultLoc = locs.find((l) => l.isDefault);
        if (defaultLoc && !initialAddress) {
          handleSavedLocationSelect(defaultLoc);
        }
      } catch (error) {
        console.error('Error fetching saved locations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();
  }, [user, initialAddress, handleSavedLocationSelect]);

  const handleMapLocationSelect = useCallback((locationPin: LocationPin) => {
    // Parse address into components
    const parts = locationPin.address.split(',').map((p) => p.trim());

    const address: DeliveryAddressWithPin = {
      street: parts[0] || '',
      city: parts[1] || '',
      state: parts[2] || '',
      postalCode: '',
      country: parts[parts.length - 1] || 'Dominican Republic',
      instructions: manualAddress.instructions,
      coordinates: locationPin.coordinates,
      pinLocked: locationPin.pinLocked,
    };

    setManualAddress(address);
    setSelectionMode('new');
    setSelectedSaved(null);
    setShowMapPicker(false);
    onLocationConfirm(address);
  }, [manualAddress.instructions, onLocationConfirm]);

  const handleManualInputChange = useCallback((
    field: keyof DeliveryAddressWithPin,
    value: string
  ) => {
    setManualAddress((prev) => ({ ...prev, [field]: value }));
    setSelectionMode('manual');
    setSelectedSaved(null);
  }, []);

  const getIcon = (label: string) => {
    return LOCATION_ICONS[label] || MapPin;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6 bg-gray-50 rounded-xl">
        <Loader2 className="w-5 h-5 animate-spin text-[#55529d]" />
        <span className="ml-2 text-gray-600 text-sm">Loading saved locations...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Saved Locations Section */}
      {savedLocations.length > 0 && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowSavedExpanded(!showSavedExpanded)}
            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#55529d]" />
              <span className="font-medium text-gray-900">Saved Locations</span>
              <span className="text-sm text-gray-500">({savedLocations.length})</span>
            </div>
            {showSavedExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {showSavedExpanded && (
            <div className="p-3 space-y-2 bg-white">
              {savedLocations.map((location) => {
                const Icon = getIcon(location.label);
                const isSelected = selectedSaved?.id === location.id;

                return (
                  <button
                    key={location.id}
                    type="button"
                    onClick={() => handleSavedLocationSelect(location)}
                    className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all ${
                      isSelected
                        ? 'bg-purple-50 border-2 border-[#55529d]'
                        : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg ${
                        isSelected
                          ? 'bg-[#55529d] text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{location.label}</span>
                        {location.isDefault && (
                          <span className="px-1.5 py-0.5 text-xs font-medium text-[#55529d] bg-purple-100 rounded">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-0.5 line-clamp-1">
                        {location.address}
                      </p>
                    </div>

                    {isSelected && (
                      <div className="p-1 bg-[#55529d] rounded-full">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* New Location via Map */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowMapPicker(!showMapPicker)}
          className={`w-full flex items-center justify-between p-4 transition-colors ${
            selectionMode === 'new'
              ? 'bg-purple-50 border-b-2 border-[#55529d]'
              : 'bg-gray-50 hover:bg-gray-100'
          }`}
        >
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-[#55529d]" />
            <span className="font-medium text-gray-900">
              {selectionMode === 'new' ? 'Location Selected via Map' : 'Select Location on Map'}
            </span>
          </div>
          {showMapPicker ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {showMapPicker && (
          <div className="p-4 bg-white">
            <GoogleMapsProvider>
              <LocationPicker
                initialLocation={manualAddress.coordinates}
                initialAddress={manualAddress.street}
                onLocationSelect={handleMapLocationSelect}
                onCancel={() => setShowMapPicker(false)}
                height="300px"
                saveButtonText="Use This Location"
                placeholder="Search address in Caribbean..."
              />
            </GoogleMapsProvider>
          </div>
        )}

        {/* Show selected map location */}
        {selectionMode === 'new' && manualAddress.coordinates && !showMapPicker && (
          <div className="p-4 bg-purple-50 border-t border-purple-100">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-[#55529d] text-white rounded-lg">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">Pinned Location</p>
                <p className="text-sm text-gray-600 mt-0.5">
                  {manualAddress.street}, {manualAddress.city}
                </p>
                {manualAddress.pinLocked && (
                  <span className="inline-flex items-center gap-1 mt-2 px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                    <Check className="w-3 h-3" />
                    Location Locked
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Manual Address Fields (Always visible for additional details) */}
      <div className="border border-gray-200 rounded-xl p-4 bg-white space-y-3">
        <h4 className="font-medium text-gray-900 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-gray-400" />
          Address Details
        </h4>

        <input
          type="text"
          placeholder="Street Address *"
          value={manualAddress.street}
          onChange={(e) => handleManualInputChange('street', e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#55529d] focus:border-transparent"
        />

        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="City *"
            value={manualAddress.city}
            onChange={(e) => handleManualInputChange('city', e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#55529d] focus:border-transparent"
          />
          <input
            type="text"
            placeholder="State/Province"
            value={manualAddress.state}
            onChange={(e) => handleManualInputChange('state', e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#55529d] focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Postal Code"
            value={manualAddress.postalCode}
            onChange={(e) => handleManualInputChange('postalCode', e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#55529d] focus:border-transparent"
          />
          <input
            type="text"
            placeholder="Country"
            value={manualAddress.country}
            onChange={(e) => handleManualInputChange('country', e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#55529d] focus:border-transparent"
          />
        </div>

        <textarea
          placeholder="Delivery Instructions (gate code, landmark, etc.)"
          value={manualAddress.instructions}
          onChange={(e) => handleManualInputChange('instructions', e.target.value)}
          rows={2}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#55529d] focus:border-transparent resize-none"
        />
      </div>

      {/* Confirmation Status */}
      {(selectedSaved || manualAddress.coordinates) && (
        <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg">
          <Check className="w-5 h-5" />
          <span className="text-sm font-medium">
            Delivery location confirmed
            {manualAddress.pinLocked && ' and locked'}
          </span>
        </div>
      )}
    </div>
  );
}