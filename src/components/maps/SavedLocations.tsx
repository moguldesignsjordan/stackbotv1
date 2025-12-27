// src/components/maps/SavedLocations.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/hooks/useAuth';
import {
  MapPin,
  Plus,
  Star,
  Trash2,
  Edit2,
  Home,
  Briefcase,
  Building2,
  Loader2,
  X,
  Check,
} from 'lucide-react';
import { SavedLocation, Coordinates, LocationPin } from '@/lib/types/location';
import { GoogleMapsProvider } from './GoogleMapsProvider';
import { LocationPicker } from './LocationPicker';

interface SavedLocationsProps {
  onSelectLocation?: (location: SavedLocation) => void;
  selectable?: boolean;
  maxLocations?: number;
}

const LOCATION_ICONS: Record<string, typeof Home> = {
  Home: Home,
  Work: Briefcase,
  Office: Building2,
};

export function SavedLocations({
  onSelectLocation,
  selectable = false,
  maxLocations = 10,
}: SavedLocationsProps) {
  const { user } = useAuth();
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<SavedLocation | null>(null);
  const [newLabel, setNewLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Listen to saved locations
  useEffect(() => {
    if (!user) {
      setLocations([]);
      setLoading(false);
      return;
    }

    const locationsRef = collection(db, 'users', user.uid, 'savedLocations');
    const q = query(locationsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
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
            updatedAt: data.updatedAt?.toDate(),
          });
        });
        setLocations(locs);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching saved locations:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleAddLocation = async (locationPin: LocationPin) => {
    if (!user || !newLabel.trim()) return;

    setSaving(true);
    try {
      const locationsRef = collection(db, 'users', user.uid, 'savedLocations');

      // If this is the first location, make it default
      const isFirst = locations.length === 0;

      await addDoc(locationsRef, {
        label: newLabel.trim(),
        address: locationPin.address,
        coordinates: locationPin.coordinates,
        isDefault: isFirst,
        createdAt: serverTimestamp(),
      });

      setShowAddModal(false);
      setNewLabel('');
    } catch (error) {
      console.error('Error saving location:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateLocation = async (locationPin: LocationPin) => {
    if (!user || !editingLocation) return;

    setSaving(true);
    try {
      const locationRef = doc(
        db,
        'users',
        user.uid,
        'savedLocations',
        editingLocation.id
      );

      await updateDoc(locationRef, {
        label: newLabel.trim() || editingLocation.label,
        address: locationPin.address,
        coordinates: locationPin.coordinates,
        updatedAt: serverTimestamp(),
      });

      setEditingLocation(null);
      setNewLabel('');
    } catch (error) {
      console.error('Error updating location:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (location: SavedLocation) => {
    if (!user) return;

    try {
      // Remove default from all others
      const batch = locations
        .filter((loc) => loc.isDefault)
        .map((loc) => {
          const ref = doc(db, 'users', user.uid, 'savedLocations', loc.id);
          return updateDoc(ref, { isDefault: false });
        });

      await Promise.all(batch);

      // Set new default
      const locationRef = doc(
        db,
        'users',
        user.uid,
        'savedLocations',
        location.id
      );
      await updateDoc(locationRef, { isDefault: true });
    } catch (error) {
      console.error('Error setting default location:', error);
    }
  };

  const handleDelete = async (locationId: string) => {
    if (!user) return;

    setDeletingId(locationId);
    try {
      const locationRef = doc(db, 'users', user.uid, 'savedLocations', locationId);
      await deleteDoc(locationRef);
    } catch (error) {
      console.error('Error deleting location:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const getIcon = (label: string) => {
    const Icon = LOCATION_ICONS[label] || MapPin;
    return Icon;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-[#55529d]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Saved Locations</h3>
        {locations.length < maxLocations && (
          <button
            onClick={() => {
              setShowAddModal(true);
              setNewLabel('');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#55529d] hover:bg-purple-50 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add New
          </button>
        )}
      </div>

      {/* Locations List */}
      {locations.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-xl">
          <MapPin className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm">No saved locations yet</p>
          <button
            onClick={() => {
              setShowAddModal(true);
              setNewLabel('');
            }}
            className="mt-3 text-sm font-medium text-[#55529d] hover:underline"
          >
            Add your first location
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {locations.map((location) => {
            const Icon = getIcon(location.label);
            return (
              <div
                key={location.id}
                className={`relative p-4 rounded-xl border transition-all ${
                  selectable
                    ? 'cursor-pointer hover:border-[#55529d] hover:shadow-sm'
                    : ''
                } ${
                  location.isDefault
                    ? 'border-[#55529d] bg-purple-50/50'
                    : 'border-gray-200 bg-white'
                }`}
                onClick={() => selectable && onSelectLocation?.(location)}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      location.isDefault ? 'bg-[#55529d] text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{location.label}</span>
                      {location.isDefault && (
                        <span className="px-2 py-0.5 text-xs font-medium text-[#55529d] bg-purple-100 rounded-full">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {location.address}
                    </p>
                  </div>

                  {/* Actions */}
                  {!selectable && (
                    <div className="flex items-center gap-1">
                      {!location.isDefault && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetDefault(location);
                          }}
                          className="p-2 text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 rounded-lg transition-colors"
                          title="Set as default"
                        >
                          <Star className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingLocation(location);
                          setNewLabel(location.label);
                        }}
                        className="p-2 text-gray-400 hover:text-[#55529d] hover:bg-purple-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(location.id);
                        }}
                        disabled={deletingId === location.id}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete"
                      >
                        {deletingId === location.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  )}

                  {selectable && (
                    <div className="flex items-center">
                      <Check className="w-5 h-5 text-[#55529d]" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {(showAddModal || editingLocation) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-white border-b">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingLocation ? 'Edit Location' : 'Add New Location'}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingLocation(null);
                  setNewLabel('');
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Label Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location Label
                </label>
                <div className="flex gap-2 flex-wrap">
                  {['Home', 'Work', 'Office'].map((label) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setNewLabel(label)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
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
                  placeholder="Or enter custom label..."
                  className="mt-2 w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#55529d] focus:border-transparent"
                />
              </div>

              {/* Location Picker */}
              <GoogleMapsProvider>
                <LocationPicker
                  initialLocation={editingLocation?.coordinates}
                  initialAddress={editingLocation?.address}
                  onLocationSelect={editingLocation ? handleUpdateLocation : handleAddLocation}
                  onCancel={() => {
                    setShowAddModal(false);
                    setEditingLocation(null);
                    setNewLabel('');
                  }}
                  saveButtonText={
                    saving
                      ? 'Saving...'
                      : editingLocation
                      ? 'Update Location'
                      : 'Save Location'
                  }
                  height="350px"
                />
              </GoogleMapsProvider>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}