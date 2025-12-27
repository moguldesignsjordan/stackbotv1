// src/components/vendor/VendorLocationSettings.tsx
'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/hooks/useAuth';
import {
  MapPin,
  Save,
  Loader2,
  Check,
  AlertCircle,
  Navigation,
} from 'lucide-react';
import { Coordinates, LocationPin, VendorLocationSettings as VendorLocSettings } from '@/lib/types/location';
import { GoogleMapsProvider } from '@/components/maps/GoogleMapsProvider';
import { LocationPicker } from '@/components/maps/LocationPicker';
import { MapView } from '@/components/maps/MapView';

export function VendorLocationSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [locationSettings, setLocationSettings] = useState<VendorLocSettings>({
    coordinates: undefined,
    address: '',
    serviceRadius: 10, // 10km default
  });

  // Fetch vendor's current location settings
  useEffect(() => {
    const fetchVendorLocation = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const vendorRef = doc(db, 'vendors', user.uid);
        const vendorDoc = await getDoc(vendorRef);

        if (vendorDoc.exists()) {
          const data = vendorDoc.data();
          setLocationSettings({
            coordinates: data.coordinates,
            address: data.address || data.business_address || '',
            serviceRadius: data.serviceRadius || 10,
          });
        }
      } catch (err) {
        console.error('Error fetching vendor location:', err);
        setError('Failed to load location settings');
      } finally {
        setLoading(false);
      }
    };

    fetchVendorLocation();
  }, [user]);

  const handleLocationSelect = (locationPin: LocationPin) => {
    setLocationSettings((prev) => ({
      ...prev,
      coordinates: locationPin.coordinates,
      address: locationPin.address,
    }));
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const vendorRef = doc(db, 'vendors', user.uid);
      await updateDoc(vendorRef, {
        coordinates: locationSettings.coordinates,
        address: locationSettings.address,
        serviceRadius: locationSettings.serviceRadius,
        updated_at: serverTimestamp(),
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving vendor location:', err);
      setError('Failed to save location settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-[#55529d]" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#55529d]" />
            Store Location
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Set your store location so customers can find you
          </p>
        </div>
        {locationSettings.coordinates && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 text-sm font-medium text-[#55529d] hover:bg-purple-50 rounded-lg transition-colors"
          >
            Change Location
          </button>
        )}
      </div>

      {/* Current Location Display */}
      {locationSettings.coordinates && !isEditing && (
        <div className="space-y-4">
          <GoogleMapsProvider>
            <MapView
              coordinates={locationSettings.coordinates}
              address={locationSettings.address}
              height="250px"
              showOpenInMaps
            />
          </GoogleMapsProvider>

          {/* Service Radius */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Delivery Service Radius
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="1"
                max="50"
                value={locationSettings.serviceRadius}
                onChange={(e) =>
                  setLocationSettings((prev) => ({
                    ...prev,
                    serviceRadius: parseInt(e.target.value),
                  }))
                }
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#55529d]"
              />
              <span className="text-sm font-medium text-gray-900 w-16 text-right">
                {locationSettings.serviceRadius} km
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Customers within this radius will see your store
            </p>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 bg-[#55529d] hover:bg-[#444182] disabled:bg-gray-300 text-white font-medium rounded-xl transition-colors"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : success ? (
              <>
                <Check className="w-5 h-5" />
                Saved!
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Settings
              </>
            )}
          </button>
        </div>
      )}

      {/* Location Picker (when editing or no location set) */}
      {(isEditing || !locationSettings.coordinates) && (
        <div className="space-y-4">
          {!locationSettings.coordinates && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex gap-3">
                <Navigation className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    Set your store location
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    Adding your location helps customers find your store and enables
                    delivery radius calculations.
                  </p>
                </div>
              </div>
            </div>
          )}

          <GoogleMapsProvider>
            <LocationPicker
              initialLocation={locationSettings.coordinates}
              initialAddress={locationSettings.address}
              onLocationSelect={handleLocationSelect}
              onCancel={
                locationSettings.coordinates
                  ? () => setIsEditing(false)
                  : undefined
              }
              height="350px"
              saveButtonText="Set Store Location"
              placeholder="Search for your store address..."
            />
          </GoogleMapsProvider>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg text-sm">
          <Check className="w-4 h-4 flex-shrink-0" />
          Location settings saved successfully!
        </div>
      )}
    </div>
  );
}