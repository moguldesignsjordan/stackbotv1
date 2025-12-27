// src/app/account/addresses/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { SavedAddress, AddressFormData } from '@/lib/types/address';
import { GoogleMapsProvider } from '@/components/maps/GoogleMapsProvider';
import { LocationPicker } from '@/components/maps/LocationPicker';
import {
  MapPin,
  Plus,
  Star,
  Trash2,
  Edit3,
  Loader2,
  Home,
  Briefcase,
  Building,
  X,
  Check,
  AlertCircle,
  Navigation,
} from 'lucide-react';

const LABEL_SUGGESTIONS = [
  { label: 'Home', icon: Home },
  { label: 'Work', icon: Briefcase },
  { label: 'Office', icon: Building },
];

const EMPTY_FORM: AddressFormData = {
  label: '',
  street: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'Dominican Republic',
  instructions: '',
  isPinned: false,
};

export default function AddressesPage() {
  const { user } = useAuth();
  
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<AddressFormData>(EMPTY_FORM);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Map picker state
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);

  // Fetch addresses on mount
  useEffect(() => {
    fetchAddresses();
  }, [user]);

  // Clear messages after delay
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  const fetchAddresses = async () => {
    if (!user) return;

    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/customer/addresses', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to fetch addresses');

      const data = await res.json();
      setAddresses(data.addresses || []);
    } catch (err) {
      setError('Failed to load addresses');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setFormData(EMPTY_FORM);
    setEditingId(null);
    setCoordinates(null);
    setShowForm(true);
    setShowMapPicker(false);
  };

  const handleEdit = (address: SavedAddress) => {
    setFormData({
      label: address.label,
      street: address.street,
      city: address.city,
      state: address.state || '',
      postalCode: address.postalCode || '',
      country: address.country,
      instructions: address.instructions || '',
      isPinned: address.isPinned,
    });
    setEditingId(address.id);
    setCoordinates(address.coordinates || null);
    setShowForm(true);
    setShowMapPicker(false);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setCoordinates(null);
    setShowMapPicker(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validate required fields
    if (!formData.label.trim()) {
      setError('Please enter a label for this address');
      return;
    }
    if (!formData.street.trim()) {
      setError('Please enter a street address');
      return;
    }
    if (!formData.city.trim()) {
      setError('Please enter a city');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const token = await user.getIdToken();
      const method = editingId ? 'PUT' : 'POST';
      
      const payload = {
        ...formData,
        ...(editingId && { id: editingId }),
        ...(coordinates && { coordinates }),
      };

      const res = await fetch('/api/customer/addresses', {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save address');
      }

      const data = await res.json();
      setAddresses(data.addresses);
      setSuccess(editingId ? 'Address updated' : 'Address saved');
      handleCancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save address');
    } finally {
      setSaving(false);
    }
  };

  const handlePin = async (addressId: string) => {
    if (!user) return;

    setSaving(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/customer/addresses', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          addressId,
          isPinned: true,
        }),
      });

      if (!res.ok) throw new Error('Failed to set default address');

      const data = await res.json();
      setAddresses(data.addresses);
      setSuccess('Default address updated');
    } catch (err) {
      setError('Failed to update default address');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (addressId: string) => {
    if (!user) return;

    setDeletingId(addressId);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/customer/addresses?id=${addressId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to delete address');

      const data = await res.json();
      setAddresses(data.addresses);
      setSuccess('Address deleted');
    } catch (err) {
      setError('Failed to delete address');
    } finally {
      setDeletingId(null);
    }
  };

  // Handle location selection from map
  const handleLocationSelect = (location: {
    coordinates: { lat: number; lng: number };
    address: string;
    pinLocked?: boolean;
  }) => {
    setCoordinates(location.coordinates);
    
    // Parse the address string to fill form fields
    const addressParts = location.address.split(',').map(s => s.trim());
    
    if (addressParts.length >= 1) {
      setFormData(prev => ({
        ...prev,
        street: addressParts[0] || prev.street,
        city: addressParts[1] || prev.city,
        state: addressParts[2] || prev.state,
        country: addressParts[addressParts.length - 1] || prev.country,
      }));
    }
    
    setShowMapPicker(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#55529d]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Saved Addresses</h2>
          <p className="text-gray-600 mt-1">
            Manage your delivery addresses. Pin your default address for faster checkout.
          </p>
        </div>
        
        {!showForm && addresses.length < 10 && (
          <button
            onClick={handleAddNew}
            className="flex items-center gap-2 px-4 py-2 bg-[#55529d] text-white rounded-xl hover:bg-[#444287] transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Add Address</span>
          </button>
        )}
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 text-green-700 rounded-xl">
          <Check className="w-5 h-5" />
          {success}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              {editingId ? 'Edit Address' : 'Add New Address'}
            </h3>
            <button
              onClick={handleCancel}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Map Picker Section */}
          {showMapPicker ? (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">Pin Your Location</h4>
                <button
                  type="button"
                  onClick={() => setShowMapPicker(false)}
                  className="text-sm text-[#55529d] hover:underline"
                >
                  Enter manually instead
                </button>
              </div>
              <GoogleMapsProvider>
                <LocationPicker
                  initialLocation={coordinates || undefined}
                  onLocationSelect={handleLocationSelect}
                  height="300px"
                />
              </GoogleMapsProvider>
            </div>
          ) : (
            <div className="mb-6">
              <button
                type="button"
                onClick={() => setShowMapPicker(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-[#55529d] hover:text-[#55529d] transition-colors"
              >
                <Navigation className="w-5 h-5" />
                {coordinates ? 'Change Pin Location' : 'Pin Location on Map'}
              </button>
              {coordinates && (
                <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                  <Check className="w-4 h-4" />
                  Location pinned ({coordinates.lat.toFixed(4)}, {coordinates.lng.toFixed(4)})
                </p>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Label */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Label *
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {LABEL_SUGGESTIONS.map(({ label, icon: Icon }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setFormData({ ...formData, label })}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${
                      formData.label === label
                        ? 'border-[#55529d] bg-[#55529d]/10 text-[#55529d]'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="Or enter a custom label"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#55529d] focus:border-transparent"
              />
            </div>

            {/* Street */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Street Address *
              </label>
              <input
                type="text"
                value={formData.street}
                onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                placeholder="123 Main St, Apt 4B"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#55529d] focus:border-transparent"
              />
            </div>

            {/* City & State */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City *
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Puerto Plata"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#55529d] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State / Province
                </label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="Puerto Plata"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#55529d] focus:border-transparent"
                />
              </div>
            </div>

            {/* Postal Code & Country */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Postal Code
                </label>
                <input
                  type="text"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  placeholder="57000"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#55529d] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Country
                </label>
                <select
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#55529d] focus:border-transparent"
                >
                  <option value="Dominican Republic">Dominican Republic</option>
                  <option value="Puerto Rico">Puerto Rico</option>
                  <option value="Haiti">Haiti</option>
                  <option value="Jamaica">Jamaica</option>
                  <option value="Cuba">Cuba</option>
                  <option value="Bahamas">Bahamas</option>
                  <option value="Trinidad and Tobago">Trinidad and Tobago</option>
                  <option value="Barbados">Barbados</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Delivery Instructions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Delivery Instructions
              </label>
              <textarea
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                placeholder="Gate code, leave at door, etc."
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#55529d] focus:border-transparent resize-none"
              />
            </div>

            {/* Set as Default */}
            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
              <input
                type="checkbox"
                checked={formData.isPinned}
                onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                className="w-5 h-5 text-[#55529d] border-gray-300 rounded focus:ring-[#55529d]"
              />
              <div>
                <span className="font-medium text-gray-900">Set as default address</span>
                <p className="text-sm text-gray-500">This will be pre-selected at checkout</p>
              </div>
            </label>

            {/* Submit */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#55529d] text-white rounded-xl hover:bg-[#444287] disabled:opacity-50 transition-colors"
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    {editingId ? 'Update Address' : 'Save Address'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Address List */}
      {addresses.length === 0 && !showForm ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <MapPin className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No saved addresses</h3>
          <p className="text-gray-500 mb-6">
            Add your delivery addresses to speed up checkout
          </p>
          <button
            onClick={handleAddNew}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#55529d] text-white rounded-xl hover:bg-[#444287] transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Your First Address
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {addresses.map((address) => (
            <div
              key={address.id}
              className={`bg-white rounded-xl shadow-sm border p-4 sm:p-6 transition-colors ${
                address.isPinned
                  ? 'border-[#55529d] ring-1 ring-[#55529d]/20'
                  : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div
                    className={`p-2 rounded-lg shrink-0 ${
                      address.isPinned
                        ? 'bg-[#55529d]/10 text-[#55529d]'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    <MapPin className="w-5 h-5" />
                  </div>
                  
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{address.label}</h3>
                      {address.isPinned && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#55529d]/10 text-[#55529d] text-xs font-medium rounded-full">
                          <Star className="w-3 h-3 fill-current" />
                          Default
                        </span>
                      )}
                      {address.coordinates && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                          <Navigation className="w-3 h-3" />
                          Pinned
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 mt-1">{address.street}</p>
                    <p className="text-gray-500 text-sm">
                      {address.city}
                      {address.state && `, ${address.state}`}
                      {address.postalCode && ` ${address.postalCode}`}
                    </p>
                    <p className="text-gray-500 text-sm">{address.country}</p>
                    {address.instructions && (
                      <p className="text-gray-400 text-sm mt-2 italic">
                        &ldquo;{address.instructions}&rdquo;
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {!address.isPinned && (
                    <button
                      onClick={() => handlePin(address.id)}
                      disabled={saving}
                      className="p-2 text-gray-400 hover:text-[#55529d] hover:bg-[#55529d]/10 rounded-lg transition-colors"
                      title="Set as default"
                    >
                      <Star className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(address)}
                    className="p-2 text-gray-400 hover:text-[#55529d] hover:bg-[#55529d]/10 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit3 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(address.id)}
                    disabled={deletingId === address.id}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Delete"
                  >
                    {deletingId === address.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Trash2 className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Limit Notice */}
      {addresses.length >= 10 && (
        <p className="text-center text-gray-500 text-sm">
          You&apos;ve reached the maximum of 10 saved addresses. Delete an address to add a new one.
        </p>
      )}
    </div>
  );
}