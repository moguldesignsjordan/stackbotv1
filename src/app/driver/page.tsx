// src/app/driver/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  runTransaction,
  Timestamp,
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase/config';
import { signOut } from 'firebase/auth';
import {
  Truck,
  Package,
  MapPin,
  Clock,
  DollarSign,
  Navigation,
  Phone,
  ChevronRight,
  Power,
  PowerOff,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Loader2,
  Menu,
  X,
  User,
  LogOut,
  History,
  Settings,
  Store,
  Home,
  ExternalLink,
  Zap,
} from 'lucide-react';
import { DeliveryOrder, DriverProfile, DriverStatus } from '@/lib/types/driver';

// Haversine distance calculation
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Format time ago
function timeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  return `${Math.floor(diffHours / 24)}d ago`;
}

export default function DriverDashboard() {
  const router = useRouter();
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [availableOrders, setAvailableOrders] = useState<DeliveryOrder[]>([]);
  const [currentOrder, setCurrentOrder] = useState<DeliveryOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [claimingOrderId, setClaimingOrderId] = useState<string | null>(null);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const userId = auth.currentUser?.uid;

  // Get driver's current location
  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setDriverLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (err) => {
        console.error('Geolocation error:', err);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 30000,
        timeout: 10000,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Fetch driver profile
  useEffect(() => {
    if (!userId) return;

    const driverRef = doc(db, 'drivers', userId);
    
    const unsubscribe = onSnapshot(driverRef, async (docSnap) => {
      if (docSnap.exists()) {
        setDriverProfile({ id: docSnap.id, ...docSnap.data() } as DriverProfile);
      } else {
        // Create driver profile if doesn't exist
        const user = auth.currentUser;
        if (user) {
          const newProfile: Partial<DriverProfile> = {
            userId: user.uid,
            name: user.displayName || 'Driver',
            email: user.email || '',
            phone: '',
            status: 'offline',
            isOnline: false,
            vehicleType: 'motorcycle',
            totalDeliveries: 0,
            rating: 5.0,
            ratingCount: 0,
            isVerified: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          
          await updateDoc(driverRef, newProfile).catch(async () => {
            // Document doesn't exist, need to set it
            const { setDoc } = await import('firebase/firestore');
            await setDoc(driverRef, newProfile);
          });
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  // Listen for available orders (delivery orders that are ready and not claimed)
  useEffect(() => {
    if (!driverProfile?.isOnline) {
      setAvailableOrders([]);
      return;
    }

    // Query for orders that are ready for delivery and not yet claimed
    const ordersQuery = query(
      collection(db, 'orders'),
      where('fulfillmentType', '==', 'delivery'),
      where('status', 'in', ['ready', 'confirmed', 'preparing']),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      const orders: DeliveryOrder[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Only show orders that haven't been claimed by a driver
        if (!data.driverId) {
          orders.push({
            id: doc.id,
            orderId: data.orderId || doc.id,
            status: data.status,
            deliveryStatus: 'available',
            vendorId: data.vendorId,
            vendorName: data.vendorName,
            vendorPhone: data.vendorPhone,
            vendorAddress: data.vendorAddress,
            vendorCoordinates: data.vendorCoordinates,
            customerId: data.customerId,
            customerName: data.customerInfo?.name || 'Customer',
            customerPhone: data.customerInfo?.phone || '',
            customerEmail: data.customerInfo?.email,
            deliveryAddress: data.deliveryAddress || {},
            items: data.items || [],
            subtotal: data.subtotal || 0,
            deliveryFee: data.deliveryFee || 0,
            total: data.total || 0,
            trackingPin: data.trackingPin,
            notes: data.notes,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          } as DeliveryOrder);
        }
      });

      setAvailableOrders(orders);
    });

    return () => unsubscribe();
  }, [driverProfile?.isOnline]);

  // Listen for current active order (claimed by this driver)
  useEffect(() => {
    if (!userId) return;

    const currentOrderQuery = query(
      collection(db, 'orders'),
      where('driverId', '==', userId),
      where('status', 'in', ['claimed', 'picked_up', 'out_for_delivery'])
    );

    const unsubscribe = onSnapshot(currentOrderQuery, (snapshot) => {
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        const data = doc.data();
        setCurrentOrder({
          id: doc.id,
          orderId: data.orderId || doc.id,
          status: data.status,
          deliveryStatus: data.deliveryStatus || 'claimed',
          driverId: data.driverId,
          driverName: data.driverName,
          claimedAt: data.claimedAt,
          pickedUpAt: data.pickedUpAt,
          vendorId: data.vendorId,
          vendorName: data.vendorName,
          vendorPhone: data.vendorPhone,
          vendorAddress: data.vendorAddress,
          vendorCoordinates: data.vendorCoordinates,
          customerId: data.customerId,
          customerName: data.customerInfo?.name || 'Customer',
          customerPhone: data.customerInfo?.phone || '',
          customerEmail: data.customerInfo?.email,
          deliveryAddress: data.deliveryAddress || {},
          items: data.items || [],
          subtotal: data.subtotal || 0,
          deliveryFee: data.deliveryFee || 0,
          total: data.total || 0,
          trackingPin: data.trackingPin,
          notes: data.notes,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        } as DeliveryOrder);
      } else {
        setCurrentOrder(null);
      }
    });

    return () => unsubscribe();
  }, [userId]);

  // Toggle online/offline status
  const toggleOnlineStatus = async () => {
    if (!userId || !driverProfile) return;
    
    setTogglingStatus(true);
    setError(null);

    try {
      const driverRef = doc(db, 'drivers', userId);
      const newStatus = driverProfile.isOnline ? 'offline' : 'available';
      
      await updateDoc(driverRef, {
        isOnline: !driverProfile.isOnline,
        status: newStatus,
        lastActiveAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...(driverLocation && { currentLocation: driverLocation }),
      });

      setSuccessMessage(driverProfile.isOnline ? 'You are now offline' : 'You are now online!');
      setTimeout(() => setSuccessMessage(null), 2000);
    } catch (err) {
      console.error('Error toggling status:', err);
      setError('Failed to update status');
    } finally {
      setTogglingStatus(false);
    }
  };

  // Claim an order with transaction (first-come-first-served)
  const claimOrder = async (order: DeliveryOrder) => {
    if (!userId || !driverProfile) return;
    
    setClaimingOrderId(order.id);
    setError(null);

    try {
      const orderRef = doc(db, 'orders', order.id);
      
      // Use transaction to ensure atomic claim
      await runTransaction(db, async (transaction) => {
        const orderDoc = await transaction.get(orderRef);
        
        if (!orderDoc.exists()) {
          throw new Error('Order no longer exists');
        }

        const orderData = orderDoc.data();
        
        // Check if already claimed
        if (orderData.driverId) {
          throw new Error('Order already claimed by another driver');
        }

        // Claim the order
        transaction.update(orderRef, {
          driverId: userId,
          driverName: driverProfile.name,
          driverPhone: driverProfile.phone,
          status: 'claimed',
          deliveryStatus: 'claimed',
          claimedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // Update vendor's subcollection
        const vendorOrderRef = doc(db, 'vendors', order.vendorId, 'orders', order.id);
        transaction.update(vendorOrderRef, {
          driverId: userId,
          driverName: driverProfile.name,
          status: 'claimed',
          claimedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // Update customer's subcollection
        const customerOrderRef = doc(db, 'customers', order.customerId, 'orders', order.id);
        transaction.update(customerOrderRef, {
          driverId: userId,
          driverName: driverProfile.name,
          status: 'claimed',
          claimedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });

      // Update driver status to busy
      const driverRef = doc(db, 'drivers', userId);
      await updateDoc(driverRef, {
        status: 'busy',
        currentOrderId: order.id,
        updatedAt: serverTimestamp(),
      });

      setSuccessMessage('Order claimed! Head to pickup location.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      console.error('Error claiming order:', err);
      const message = err instanceof Error ? err.message : 'Failed to claim order';
      setError(message);
      setTimeout(() => setError(null), 3000);
    } finally {
      setClaimingOrderId(null);
    }
  };

  // Update order status (picked up, delivered, etc.)
  const updateOrderStatus = async (
    newStatus: 'picked_up' | 'out_for_delivery' | 'delivered'
  ) => {
    if (!currentOrder || !userId) return;

    try {
      const orderRef = doc(db, 'orders', currentOrder.id);
      
      const updateData: Record<string, unknown> = {
        status: newStatus,
        deliveryStatus: newStatus === 'delivered' ? 'delivered' : 'in_transit',
        updatedAt: serverTimestamp(),
      };

      if (newStatus === 'picked_up') {
        updateData.pickedUpAt = serverTimestamp();
        updateData.status = 'out_for_delivery';
      } else if (newStatus === 'delivered') {
        updateData.deliveredAt = serverTimestamp();
      }

      await updateDoc(orderRef, updateData);

      // Update subcollections
      const vendorOrderRef = doc(db, 'vendors', currentOrder.vendorId, 'orders', currentOrder.id);
      await updateDoc(vendorOrderRef, updateData);

      const customerOrderRef = doc(db, 'customers', currentOrder.customerId, 'orders', currentOrder.id);
      await updateDoc(customerOrderRef, updateData);

      // If delivered, free up the driver
      if (newStatus === 'delivered') {
        const driverRef = doc(db, 'drivers', userId);
        await updateDoc(driverRef, {
          status: 'available',
          currentOrderId: null,
          totalDeliveries: (driverProfile?.totalDeliveries || 0) + 1,
          updatedAt: serverTimestamp(),
        });

        setSuccessMessage('Delivery completed! 🎉');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      console.error('Error updating order:', err);
      setError('Failed to update order status');
    }
  };

  // Open navigation app
  const openNavigation = (lat: number, lng: number, label?: string) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_blank');
  };

  // Call phone number
  const callPhone = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  // Logout
  const handleLogout = async () => {
    if (driverProfile?.isOnline) {
      const driverRef = doc(db, 'drivers', userId!);
      await updateDoc(driverRef, {
        isOnline: false,
        status: 'offline',
        updatedAt: serverTimestamp(),
      });
    }
    await signOut(auth);
    router.push('/driver/login');
  };

  // Calculate estimated distance to pickup
  const getDistanceToPickup = useCallback(
    (order: DeliveryOrder): string | null => {
      if (!driverLocation || !order.vendorCoordinates) return null;
      const dist = calculateDistance(
        driverLocation.lat,
        driverLocation.lng,
        order.vendorCoordinates.lat,
        order.vendorCoordinates.lng
      );
      return dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`;
    },
    [driverLocation]
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mx-auto" />
          <p className="text-gray-400 mt-3">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gray-800/95 backdrop-blur-sm border-b border-gray-700 safe-top">
        <div className="px-4 py-3 pt-12 lg:pt-3">
          <div className="flex items-center justify-between">
            {/* Left: Logo + Status */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                <Truck className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="font-semibold text-white">
                  {driverProfile?.name || 'Driver'}
                </p>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      driverProfile?.isOnline
                        ? currentOrder
                          ? 'bg-yellow-400'
                          : 'bg-emerald-400'
                        : 'bg-gray-500'
                    }`}
                  />
                  <span className="text-xs text-gray-400">
                    {driverProfile?.isOnline
                      ? currentOrder
                        ? 'On delivery'
                        : 'Online'
                      : 'Offline'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              {/* Online Toggle */}
              <button
                onClick={toggleOnlineStatus}
                disabled={togglingStatus || !!currentOrder}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                  driverProfile?.isOnline
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-gray-700 text-gray-300 border border-gray-600'
                } ${currentOrder ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {togglingStatus ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : driverProfile?.isOnline ? (
                  <Power className="w-4 h-4" />
                ) : (
                  <PowerOff className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">
                  {driverProfile?.isOnline ? 'Online' : 'Go Online'}
                </span>
              </button>

              {/* Menu Button */}
              <button
                onClick={() => setMenuOpen(true)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-xl transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Toast Messages */}
      {(error || successMessage) && (
        <div className="fixed top-24 left-4 right-4 z-50 pointer-events-none">
          <div
            className={`max-w-md mx-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg pointer-events-auto ${
              error
                ? 'bg-red-500/90 text-white'
                : 'bg-emerald-500/90 text-white'
            }`}
          >
            {error ? (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            ) : (
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <p className="text-sm font-medium">{error || successMessage}</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="pb-8">
        {/* Active Order Card */}
        {currentOrder && (
          <div className="p-4">
            <ActiveOrderCard
              order={currentOrder}
              onUpdateStatus={updateOrderStatus}
              onNavigate={openNavigation}
              onCall={callPhone}
            />
          </div>
        )}

        {/* Not Online State */}
        {!driverProfile?.isOnline && !currentOrder && (
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <div className="w-20 h-20 bg-gray-800 rounded-2xl flex items-center justify-center mb-4">
              <PowerOff className="w-10 h-10 text-gray-600" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              You&apos;re Offline
            </h2>
            <p className="text-gray-400 mb-6 max-w-xs">
              Go online to start receiving delivery requests
            </p>
            <button
              onClick={toggleOnlineStatus}
              disabled={togglingStatus}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-all"
            >
              {togglingStatus ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Zap className="w-5 h-5" />
              )}
              <span>Go Online</span>
            </button>
          </div>
        )}

        {/* Available Orders */}
        {driverProfile?.isOnline && !currentOrder && (
          <div className="px-4 pt-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">
                Available Orders
              </h2>
              <span className="text-sm text-gray-400">
                {availableOrders.length} nearby
              </span>
            </div>

            {availableOrders.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Package className="w-8 h-8 text-gray-600" />
                </div>
                <p className="text-gray-400 mb-2">No orders available</p>
                <p className="text-sm text-gray-500">
                  New orders will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {availableOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    distanceToPickup={getDistanceToPickup(order)}
                    onClaim={() => claimOrder(order)}
                    claiming={claimingOrderId === order.id}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Slide-out Menu */}
      <div
        className={`fixed inset-0 z-50 transition-all duration-300 ${
          menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setMenuOpen(false)}
        />
        <div
          className={`absolute right-0 top-0 bottom-0 w-80 max-w-[85vw] bg-gray-800 shadow-2xl transition-transform duration-300 safe-top safe-bottom ${
            menuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex flex-col h-full pt-16">
            {/* Menu Header */}
            <div className="flex items-center justify-between px-4 pb-4 border-b border-gray-700">
              <h2 className="text-lg font-semibold text-white">Menu</h2>
              <button
                onClick={() => setMenuOpen(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Card */}
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                  <User className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <p className="font-medium text-white">
                    {driverProfile?.name || 'Driver'}
                  </p>
                  <p className="text-sm text-gray-400">
                    {driverProfile?.totalDeliveries || 0} deliveries
                  </p>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <nav className="flex-1 p-4 space-y-1">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  router.push('/driver/history');
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-700/50 rounded-xl transition-colors"
              >
                <History className="w-5 h-5" />
                <span>Delivery History</span>
              </button>

              <button
                onClick={() => {
                  setMenuOpen(false);
                  router.push('/driver/earnings');
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-700/50 rounded-xl transition-colors"
              >
                <DollarSign className="w-5 h-5" />
                <span>Earnings</span>
              </button>

              <button
                onClick={() => {
                  setMenuOpen(false);
                  router.push('/driver/settings');
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-700/50 rounded-xl transition-colors"
              >
                <Settings className="w-5 h-5" />
                <span>Settings</span>
              </button>

              <a
                href="/"
                className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-700/50 rounded-xl transition-colors"
              >
                <Home className="w-5 h-5" />
                <span>Back to StackBot</span>
              </a>
            </nav>

            {/* Logout */}
            <div className="p-4 border-t border-gray-700">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Order Card Component
// ============================================================================
interface OrderCardProps {
  order: DeliveryOrder;
  distanceToPickup: string | null;
  onClaim: () => void;
  claiming: boolean;
}

function OrderCard({ order, distanceToPickup, onClaim, claiming }: OrderCardProps) {
  const createdAt = order.createdAt instanceof Timestamp
    ? order.createdAt.toDate()
    : new Date();

  return (
    <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-700/50">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <Store className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">{order.vendorName}</h3>
              <p className="text-sm text-gray-400">
                {order.items?.length || 0} items • ${order.total?.toFixed(2)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-emerald-400 font-semibold">
              <DollarSign className="w-4 h-4" />
              <span>{order.deliveryFee?.toFixed(2)}</span>
            </div>
            <p className="text-xs text-gray-500">delivery fee</p>
          </div>
        </div>
      </div>

      {/* Locations */}
      <div className="p-4 space-y-3">
        {/* Pickup */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            <Store className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Pickup</p>
            <p className="text-sm text-white truncate">
              {order.vendorAddress || order.vendorName}
            </p>
            {distanceToPickup && (
              <p className="text-xs text-emerald-400 mt-0.5">
                ~{distanceToPickup} away
              </p>
            )}
          </div>
        </div>

        {/* Delivery */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            <MapPin className="w-4 h-4 text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Deliver to</p>
            <p className="text-sm text-white truncate">
              {order.deliveryAddress?.street}, {order.deliveryAddress?.city}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {order.customerName}
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 pt-0 flex items-center justify-between">
        <p className="text-xs text-gray-500">
          <Clock className="w-3.5 h-3.5 inline mr-1" />
          {timeAgo(createdAt)}
        </p>
        <button
          onClick={onClaim}
          disabled={claiming}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-600 text-white font-medium rounded-xl transition-all"
        >
          {claiming ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Zap className="w-4 h-4" />
          )}
          <span>{claiming ? 'Claiming...' : 'Claim Order'}</span>
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Active Order Card Component
// ============================================================================
interface ActiveOrderCardProps {
  order: DeliveryOrder;
  onUpdateStatus: (status: 'picked_up' | 'out_for_delivery' | 'delivered') => void;
  onNavigate: (lat: number, lng: number, label?: string) => void;
  onCall: (phone: string) => void;
}

function ActiveOrderCard({
  order,
  onUpdateStatus,
  onNavigate,
  onCall,
}: ActiveOrderCardProps) {
  const isPickedUp = order.status === 'out_for_delivery' || order.status === 'picked_up';
  const targetLocation = isPickedUp
    ? order.deliveryAddress?.coordinates
    : order.vendorCoordinates;
  const targetLabel = isPickedUp ? 'Delivery' : 'Pickup';
  const targetAddress = isPickedUp
    ? `${order.deliveryAddress?.street}, ${order.deliveryAddress?.city}`
    : order.vendorAddress || order.vendorName;

  return (
    <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 rounded-2xl border border-emerald-500/30 overflow-hidden">
      {/* Status Banner */}
      <div className="bg-emerald-500/20 px-4 py-2 border-b border-emerald-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-medium text-emerald-400">
              {isPickedUp ? 'Delivering Order' : 'Head to Pickup'}
            </span>
          </div>
          <span className="text-xs text-gray-400">
            #{order.trackingPin || order.orderId.slice(-6)}
          </span>
        </div>
      </div>

      {/* Destination */}
      <div className="p-4">
        <div className="flex items-start gap-3 mb-4">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isPickedUp ? 'bg-red-500/20' : 'bg-blue-500/20'
            }`}
          >
            {isPickedUp ? (
              <MapPin className="w-5 h-5 text-red-400" />
            ) : (
              <Store className="w-5 h-5 text-blue-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              {targetLabel}
            </p>
            <p className="text-white font-medium">{targetAddress}</p>
            {isPickedUp && order.deliveryAddress?.instructions && (
              <p className="text-sm text-gray-400 mt-1">
                📝 {order.deliveryAddress.instructions}
              </p>
            )}
          </div>
        </div>

        {/* Contact Info */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 bg-gray-800/50 rounded-xl px-3 py-2">
            <p className="text-xs text-gray-500">
              {isPickedUp ? 'Customer' : 'Vendor'}
            </p>
            <p className="text-sm text-white">
              {isPickedUp ? order.customerName : order.vendorName}
            </p>
          </div>
          <button
            onClick={() =>
              onCall(isPickedUp ? order.customerPhone : order.vendorPhone || '')
            }
            className="p-3 bg-gray-800/50 hover:bg-gray-700 rounded-xl transition-colors"
          >
            <Phone className="w-5 h-5 text-emerald-400" />
          </button>
        </div>

        {/* Navigation Button */}
        {targetLocation && (
          <button
            onClick={() =>
              onNavigate(targetLocation.lat, targetLocation.lng, targetLabel)
            }
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl mb-3 transition-colors"
          >
            <Navigation className="w-5 h-5" />
            <span>Navigate to {targetLabel}</span>
            <ExternalLink className="w-4 h-4 ml-1 opacity-60" />
          </button>
        )}

        {/* Order Items Summary */}
        <div className="bg-gray-800/50 rounded-xl p-3 mb-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
            Order Summary
          </p>
          <div className="space-y-1">
            {order.items?.slice(0, 3).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span className="text-gray-300">
                  {item.quantity}x {item.name}
                </span>
                <span className="text-gray-500">${item.price?.toFixed(2)}</span>
              </div>
            ))}
            {(order.items?.length || 0) > 3 && (
              <p className="text-xs text-gray-500">
                +{(order.items?.length || 0) - 3} more items
              </p>
            )}
          </div>
          <div className="border-t border-gray-700 mt-2 pt-2 flex justify-between">
            <span className="text-sm text-gray-400">Total</span>
            <span className="text-sm font-semibold text-white">
              ${order.total?.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Action Button */}
        {!isPickedUp ? (
          <button
            onClick={() => onUpdateStatus('picked_up')}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-colors"
          >
            <Package className="w-5 h-5" />
            <span>Confirm Pickup</span>
          </button>
        ) : (
          <button
            onClick={() => onUpdateStatus('delivered')}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-colors"
          >
            <CheckCircle className="w-5 h-5" />
            <span>Complete Delivery</span>
          </button>
        )}

        {/* Tracking PIN (show when delivering) */}
        {isPickedUp && order.trackingPin && (
          <div className="mt-3 text-center">
            <p className="text-xs text-gray-500">
              Delivery PIN: <span className="text-emerald-400 font-mono font-bold">{order.trackingPin}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}