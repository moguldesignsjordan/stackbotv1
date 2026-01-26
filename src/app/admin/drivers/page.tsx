// src/app/admin/drivers/page.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase/config';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  Truck,
  User,
  Mail,
  Phone,
  AlertCircle,
  Loader2,
  Search,
  Filter,
  Plus,
  Star,
  Package,
  Trash2,
  CheckCircle,
} from 'lucide-react';
import { Driver } from '@/lib/types/driver';
import Image from 'next/image';

type MessageState = {
  type: 'success' | 'error';
  text: string;
} | null;

export default function AdminDriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline' | 'unverified'>('all');
  const [message, setMessage] = useState<MessageState>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // New driver form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDriverUid, setNewDriverUid] = useState('');
  const [newDriverEmail, setNewDriverEmail] = useState('');
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverPhone, setNewDriverPhone] = useState('');
  const [newDriverVehicle, setNewDriverVehicle] = useState<'motorcycle' | 'car' | 'bicycle' | 'scooter'>('motorcycle');
  const [addingDriver, setAddingDriver] = useState(false);

  // Fetch all drivers
  useEffect(() => {
    const driversQuery = query(
      collection(db, 'drivers'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(driversQuery, (snapshot) => {
      const driversData: Driver[] = [];
      snapshot.forEach((doc) => {
        driversData.push({
          id: doc.id,
          ...doc.data(),
        } as Driver);
      });
      setDrivers(driversData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter drivers
  const filteredDrivers = drivers.filter((driver) => {
    const matchesSearch =
      driver.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driver.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driver.phone?.includes(searchQuery);

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'online' && (driver.status === 'online' || driver.status === 'busy')) ||
      (statusFilter === 'offline' && driver.status === 'offline') ||
      (statusFilter === 'unverified' && !driver.verified);

    return matchesSearch && matchesStatus;
  });

  // Add new driver
  const handleAddDriver = async () => {
    if (!newDriverUid.trim()) {
      setMessage({ type: 'error', text: 'Firebase UID is required' });
      return;
    }

    setAddingDriver(true);
    setMessage(null);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      const token = await user.getIdToken(true);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_URL}/setDriverRole`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            uid: newDriverUid.trim(),
            email: newDriverEmail.trim(),
            name: newDriverName.trim() || 'Driver',
            phone: newDriverPhone.trim(),
            vehicleType: newDriverVehicle,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to add driver');
      }

      setMessage({ type: 'success', text: 'Driver added successfully!' });
      setShowAddForm(false);
      setNewDriverUid('');
      setNewDriverEmail('');
      setNewDriverName('');
      setNewDriverPhone('');
      setNewDriverVehicle('motorcycle');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add driver';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setAddingDriver(false);
    }
  };

  // Toggle driver verification
  const toggleVerification = async (driver: Driver) => {
    setProcessingId(driver.id);

    try {
      const driverRef = doc(db, 'drivers', driver.id);
      await updateDoc(driverRef, {
        verified: !driver.verified,
        updatedAt: Timestamp.now(),
      });

      setMessage({
        type: 'success',
        text: `Driver ${!driver.verified ? 'verified' : 'unverified'} successfully`,
      });
    } catch (err) {
      console.error('Error updating driver:', err);
      setMessage({ type: 'error', text: 'Failed to update driver' });
    } finally {
      setProcessingId(null);
    }
  };

  // Delete driver
  const deleteDriver = async (driverId: string) => {
    if (!confirm('Are you sure you want to delete this driver?')) return;

    setProcessingId(driverId);

    try {
      await deleteDoc(doc(db, 'drivers', driverId));
      setMessage({ type: 'success', text: 'Driver deleted successfully' });
    } catch (err) {
      console.error('Error deleting driver:', err);
      setMessage({ type: 'error', text: 'Failed to delete driver' });
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (driver: Driver) => {
    if (!driver.verified) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
          <AlertCircle className="w-3 h-3" />
          Unverified
        </span>
      );
    }
    if (driver.status === 'online' || driver.status === 'busy') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          {driver.status === 'busy' ? 'On Delivery' : 'Online'}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
        <span className="w-2 h-2 bg-gray-400 rounded-full" />
        Offline
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#55529d]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-100 text-emerald-600">
            <Truck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Drivers</h1>
            <p className="text-sm text-gray-500">
              {drivers.length} total • {drivers.filter((d) => d.status === 'online' || d.status === 'busy').length} online
            </p>
          </div>
        </div>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Driver
        </Button>
      </div>

      {/* Messages */}
      {message && (
        <div
          className={`flex items-center gap-2 p-4 rounded-xl ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <p className="text-sm">{message.text}</p>
        </div>
      )}

      {/* Add Driver Form */}
      {showAddForm && (
        <Card padding="lg">
          <h3 className="font-semibold text-gray-900 mb-4">Add New Driver</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Firebase UID *
              </label>
              <input
                type="text"
                value={newDriverUid}
                onChange={(e) => setNewDriverUid(e.target.value)}
                placeholder="e.g. abc123xyz..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={newDriverEmail}
                onChange={(e) => setNewDriverEmail(e.target.value)}
                placeholder="driver@example.com"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={newDriverName}
                onChange={(e) => setNewDriverName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={newDriverPhone}
                onChange={(e) => setNewDriverPhone(e.target.value)}
                placeholder="+1 809 555 1234"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vehicle Type
              </label>
              <select
                value={newDriverVehicle}
                onChange={(e) => setNewDriverVehicle(e.target.value as typeof newDriverVehicle)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
              >
                <option value="motorcycle">Motorcycle</option>
                <option value="car">Car</option>
                <option value="bicycle">Bicycle</option>
                <option value="scooter">Scooter</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <Button onClick={handleAddDriver} disabled={addingDriver}>
              {addingDriver ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Driver'
              )}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowAddForm(false)}
              disabled={addingDriver}
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search drivers..."
            className="w-full pl-11 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#55529d] focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#55529d] focus:border-transparent bg-white"
          >
            <option value="all">All Drivers</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
            <option value="unverified">Unverified</option>
          </select>
        </div>
      </div>

      {/* Drivers List */}
      {filteredDrivers.length === 0 ? (
        <Card padding="lg">
          <div className="text-center py-8">
            <Truck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No drivers found</p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredDrivers.map((driver) => (
            <Card key={driver.id} padding="md">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0 relative overflow-hidden">
                    {driver.photoURL ? (
                      <Image
                        src={driver.photoURL}
                        alt={driver.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <User className="w-6 h-6 text-emerald-600" />
                    )}
                  </div>

                  {/* Info */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">
                        {driver.name || 'Unnamed Driver'}
                      </h3>
                      {getStatusBadge(driver)}
                    </div>

                    <div className="space-y-1 text-sm text-gray-500">
                      <p className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        {driver.email || 'No email'}
                      </p>
                      <p className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        {driver.phone || 'No phone'}
                      </p>
                      <p className="flex items-center gap-2">
                        <Truck className="w-4 h-4" />
                        {driver.vehicleType?.charAt(0).toUpperCase() +
                          driver.vehicleType?.slice(1) || 'Unknown'}
                        {driver.vehiclePlate && ` • ${driver.vehiclePlate}`}
                      </p>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="flex items-center gap-1 text-gray-600">
                        <Package className="w-4 h-4" />
                        {driver.totalDeliveries || 0} deliveries
                      </span>
                      <span className="flex items-center gap-1 text-amber-600">
                        <Star className="w-4 h-4 fill-amber-400" />
                        {driver.rating?.toFixed(1) || '5.0'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleVerification(driver)}
                    disabled={processingId === driver.id}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                      driver.verified
                        ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                    }`}
                  >
                    {processingId === driver.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : driver.verified ? (
                      'Unverify'
                    ) : (
                      'Verify'
                    )}
                  </button>
                  <button
                    onClick={() => deleteDriver(driver.id)}
                    disabled={processingId === driver.id}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
