// src/app/driver/delivery/[id]/page.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  doc,
  onSnapshot,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '@/lib/firebase/config';
import { GoogleMap, Marker, DirectionsRenderer } from '@react-google-maps/api';
import { GoogleMapsProvider } from '@/components/maps/GoogleMapsProvider';
import {
  ArrowLeft,
  Phone,
  Navigation,
  Package,
  CheckCircle,
  Store,
  MapPin,
  Clock,
  AlertCircle,
  Loader2,
  ChevronUp,
  ChevronDown,
  Copy,
  Check,
  Camera,
  X,
  ImageIcon,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================
interface DriverOrderDetail {
  id: string;
  orderId: string;
  status: string;
  deliveryStatus: string;
  driverId?: string;
  driverName?: string;
  claimedAt?: Timestamp;
  pickedUpAt?: Timestamp;
  vendorId: string;
  vendorName: string;
  vendorPhone?: string;
  vendorAddress: string;
  vendorCoordinates?: { lat: number; lng: number };
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  deliveryAddress: {
    street?: string;
    city?: string;
    coordinates?: { lat: number; lng: number };
    instructions?: string;
  };
  items: Array<{ quantity: number; name: string; price: number }>;
  subtotal: number;
  deliveryFee: number;
  total: number;
  trackingPin?: string;
  notes?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

// ============================================================================
// CAPACITOR CAMERA HELPER
// ============================================================================
/**
 * Safely captures a photo using @capacitor/camera when available (native app),
 * otherwise falls back to a file picker (web).
 *
 * The HTML `<input type="file" capture="environment">` attribute crashes
 * Capacitor WebViews because the native camera intent backgrounds the WebView
 * Activity/ViewController, and iOS/Android can kill it for memory.
 *
 * @capacitor/camera handles the lifecycle correctly within the native shell.
 */
async function capturePhotoNative(): Promise<{ blob: Blob; dataUrl: string } | null> {
  try {
    const { Camera, CameraResultType, CameraSource } = await import(
      '@capacitor/camera'
    );
    const photo = await Camera.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
      width: 1200,
      height: 1200,
      correctOrientation: true,
    });

    if (!photo.dataUrl) return null;

    // Convert data URL to Blob for Firebase upload
    const response = await fetch(photo.dataUrl);
    const blob = await response.blob();

    return { blob, dataUrl: photo.dataUrl };
  } catch (err: any) {
    // User cancelled or plugin not available
    if (err?.message?.includes('User cancelled') || err?.message?.includes('canceled')) {
      return null;
    }
    throw err;
  }
}

/**
 * Detects if we're running inside a Capacitor native shell.
 */
function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  // Capacitor injects this object on native platforms
  return !!(window as any).Capacitor?.isNativePlatform?.();
}

// ============================================================================
// MAP CONFIG
// ============================================================================
const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: false,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  clickableIcons: false,
  styles: [
    { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a2e' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
    {
      featureType: 'road',
      elementType: 'geometry',
      stylers: [{ color: '#2c2c54' }],
    },
    {
      featureType: 'road',
      elementType: 'geometry.stroke',
      stylers: [{ color: '#1a1a2e' }],
    },
    {
      featureType: 'water',
      elementType: 'geometry',
      stylers: [{ color: '#0e4d64' }],
    },
  ],
};

// ============================================================================
// PAGE WRAPPER
// ============================================================================
export default function DeliveryDetailPage() {
  return (
    <GoogleMapsProvider>
      <DeliveryDetailContent />
    </GoogleMapsProvider>
  );
}

// ============================================================================
// MAIN CONTENT
// ============================================================================
function DeliveryDetailContent() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  // Core state
  const [order, setOrder] = useState<DriverOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);

  // Map state
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  // Photo state
  const [proofPhoto, setProofPhoto] = useState<string | null>(null);
  const [proofPhotoBlob, setProofPhotoBlob] = useState<Blob | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ========================================================================
  // GEOLOCATION
  // ========================================================================
  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setDriverLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (err) => console.error('Geolocation error:', err),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // ========================================================================
  // ORDER SUBSCRIPTION
  // ========================================================================
  useEffect(() => {
    if (!orderId) return;

    const orderRef = doc(db, 'orders', orderId);
    const unsubscribe = onSnapshot(
      orderRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setOrder({
            id: docSnap.id,
            orderId: data.orderId || docSnap.id,
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
          } as DriverOrderDetail);
        } else {
          setError('Order not found');
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching order:', err);
        setError('Failed to load order');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [orderId]);

  // ========================================================================
  // DIRECTIONS
  // ========================================================================
  useEffect(() => {
    if (!driverLocation || !order || !window.google) return;

    const isPickedUp = order.status === 'out_for_delivery';
    const destination = isPickedUp
      ? order.deliveryAddress?.coordinates
      : order.vendorCoordinates;

    if (!destination) return;

    const directionsService = new google.maps.DirectionsService();

    directionsService.route(
      {
        origin: driverLocation,
        destination: destination,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === 'OK' && result) {
          setDirections(result);
        }
      }
    );
  }, [driverLocation, order]);

  // ========================================================================
  // MAP LOAD
  // ========================================================================
  const onMapLoad = useCallback(
    (mapInstance: google.maps.Map) => {
      setMap(mapInstance);

      if (order) {
        const bounds = new google.maps.LatLngBounds();

        if (driverLocation) {
          bounds.extend(driverLocation);
        }

        if (order.vendorCoordinates) {
          bounds.extend(order.vendorCoordinates);
        }

        if (order.deliveryAddress?.coordinates) {
          bounds.extend(order.deliveryAddress.coordinates);
        }

        mapInstance.fitBounds(bounds, 80);
      }
    },
    [order, driverLocation]
  );

  // ========================================================================
  // PHOTO CAPTURE — Capacitor native or web fallback
  // ========================================================================
  const handleTakePhoto = async () => {
    setPhotoError(null);

    if (isNativeApp()) {
      // ── Native path: use @capacitor/camera ──
      try {
        const result = await capturePhotoNative();
        if (result) {
          setProofPhoto(result.dataUrl);
          setProofPhotoBlob(result.blob);
        }
      } catch (err) {
        console.error('Camera error:', err);
        setPhotoError('Failed to capture photo. Please try again.');
      }
    } else {
      // ── Web fallback: trigger file input WITHOUT capture attribute ──
      // The capture attribute is intentionally omitted from the input element
      // to prevent WebView crashes. On web browsers, this opens a file picker
      // that still includes camera as an option on mobile browsers.
      fileInputRef.current?.click();
    }
  };

  // Web file input handler (fallback only)
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoError(null);

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setPhotoError('Please select an image file.');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setPhotoError('Photo must be under 10MB.');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setProofPhoto(previewUrl);
    setProofPhotoBlob(file);
  };

  const clearPhoto = () => {
    if (proofPhoto && proofPhoto.startsWith('blob:')) {
      URL.revokeObjectURL(proofPhoto);
    }
    setProofPhoto(null);
    setProofPhotoBlob(null);
    setPhotoError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // ========================================================================
  // UPLOAD PHOTO + COMPLETE DELIVERY
  // ========================================================================
  const handleCompleteDelivery = async () => {
    if (!order) return;

    if (!proofPhotoBlob) {
      setPhotoError('Please take a photo before completing delivery.');
      return;
    }

    setUploadingPhoto(true);
    setPhotoError(null);

    try {
      // Upload to Firebase Storage
      const timestamp = Date.now();
      const fileName = `proof_${order.id}_${timestamp}.jpg`;
      const storageRef = ref(storage, `deliveries/${order.id}/${fileName}`);

      await uploadBytes(storageRef, proofPhotoBlob, {
        contentType: proofPhotoBlob.type || 'image/jpeg',
        customMetadata: {
          orderId: order.id,
          driverId: auth.currentUser?.uid || '',
          uploadedAt: new Date().toISOString(),
        },
      });

      const downloadUrl = await getDownloadURL(storageRef);

      // Update order with proof URL and mark delivered
      await updateOrderStatus('delivered', downloadUrl);

      clearPhoto();
    } catch (err) {
      console.error('Error uploading proof photo:', err);
      setPhotoError('Failed to upload photo. Please try again.');
      setUploadingPhoto(false);
    }
  };

  // ========================================================================
  // ORDER STATUS UPDATE
  // ========================================================================
  const updateOrderStatus = async (
    newStatus: 'picked_up' | 'out_for_delivery' | 'delivered',
    proofOfDeliveryUrl?: string
  ) => {
    if (!order) return;

    setUpdating(true);

    try {
      const orderRef = doc(db, 'orders', order.id);

      const updateData: Record<string, unknown> = {
        status: newStatus === 'picked_up' ? 'out_for_delivery' : newStatus,
        deliveryStatus: newStatus === 'delivered' ? 'delivered' : 'in_transit',
        updatedAt: serverTimestamp(),
      };

      if (newStatus === 'picked_up') {
        updateData.pickedUpAt = serverTimestamp();
      } else if (newStatus === 'delivered') {
        updateData.deliveredAt = serverTimestamp();
        if (proofOfDeliveryUrl) {
          updateData.proofOfDeliveryUrl = proofOfDeliveryUrl;
        }
      }

      await updateDoc(orderRef, updateData);

      // Update subcollections
      const vendorOrderRef = doc(db, 'vendors', order.vendorId, 'orders', order.id);
      await updateDoc(vendorOrderRef, updateData);

      const customerOrderRef = doc(db, 'customers', order.customerId, 'orders', order.id);
      await updateDoc(customerOrderRef, updateData);

      // If delivered, update driver stats and go back
      if (newStatus === 'delivered') {
        const userId = auth.currentUser?.uid;
        if (userId) {
          const driverRef = doc(db, 'drivers', userId);
          await updateDoc(driverRef, {
            status: 'available',
            currentOrderId: null,
            updatedAt: serverTimestamp(),
          });
        }
        router.push('/driver');
      }
    } catch (err) {
      console.error('Error updating order:', err);
      setError('Failed to update order');
    } finally {
      setUpdating(false);
      setUploadingPhoto(false);
    }
  };

  // ========================================================================
  // NAVIGATION HELPERS
  // ========================================================================
  const openNavigation = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  const callPhone = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPin(true);
    setTimeout(() => setCopiedPin(false), 2000);
  };

  // ========================================================================
  // LOADING / ERROR STATES
  // ========================================================================
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 px-4">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <p className="text-white text-lg mb-4">{error || 'Order not found'}</p>
        <button
          onClick={() => router.push('/driver')}
          className="px-4 py-2 bg-gray-700 text-white rounded-xl"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  // ========================================================================
  // DERIVED VALUES
  // ========================================================================
  const isPickedUp = order.status === 'out_for_delivery';
  const targetLocation = isPickedUp
    ? order.deliveryAddress?.coordinates
    : order.vendorCoordinates;
  const targetAddress = isPickedUp
    ? `${order.deliveryAddress?.street}, ${order.deliveryAddress?.city}`
    : order.vendorAddress || order.vendorName;
  const targetName = isPickedUp ? order.customerName : order.vendorName;
  const targetPhone = (isPickedUp ? order.customerPhone : order.vendorPhone) || '';

  const eta = directions?.routes?.[0]?.legs?.[0]?.duration?.text || null;
  const distance = directions?.routes?.[0]?.legs?.[0]?.distance?.text || null;

  // ========================================================================
  // RENDER
  // ========================================================================
  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* ── Hidden file input for web fallback (NO capture attribute!) ── */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
        aria-hidden="true"
      />

      {/* ── Map Area ── */}
      <div className="flex-1 relative">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          options={mapOptions}
          onLoad={onMapLoad}
          center={driverLocation || order.vendorCoordinates || { lat: 19.75, lng: -70.45 }}
          zoom={14}
        >
          {/* Directions Route */}
          {directions && (
            <DirectionsRenderer
              directions={directions}
              options={{
                suppressMarkers: true,
                polylineOptions: {
                  strokeColor: '#10b981',
                  strokeWeight: 4,
                  strokeOpacity: 0.8,
                },
              }}
            />
          )}

          {/* Driver Location */}
          {driverLocation && (
            <Marker
              position={driverLocation}
              icon={{
                url:
                  'data:image/svg+xml;charset=UTF-8,' +
                  encodeURIComponent(`
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
                      <circle cx="20" cy="20" r="18" fill="#10b981" stroke="#fff" stroke-width="3"/>
                      <circle cx="20" cy="20" r="6" fill="#fff"/>
                    </svg>
                  `),
                scaledSize: new google.maps.Size(40, 40),
                anchor: new google.maps.Point(20, 20),
              }}
            />
          )}

          {/* Vendor Location */}
          {order.vendorCoordinates && (
            <Marker
              position={order.vendorCoordinates}
              icon={{
                url:
                  'data:image/svg+xml;charset=UTF-8,' +
                  encodeURIComponent(`
                    <svg xmlns="http://www.w3.org/2000/svg" width="44" height="54" viewBox="0 0 44 54">
                      <path d="M22 0C10 0 0 10 0 22c0 16.5 22 32 22 32s22-15.5 22-32C44 10 34 0 22 0z" fill="#3b82f6"/>
                      <circle cx="22" cy="20" r="12" fill="white"/>
                      <rect x="16" y="14" width="12" height="12" rx="2" fill="#3b82f6"/>
                    </svg>
                  `),
                scaledSize: new google.maps.Size(44, 54),
                anchor: new google.maps.Point(22, 54),
              }}
            />
          )}

          {/* Delivery Location */}
          {order.deliveryAddress?.coordinates && (
            <Marker
              position={order.deliveryAddress.coordinates}
              icon={{
                url:
                  'data:image/svg+xml;charset=UTF-8,' +
                  encodeURIComponent(`
                    <svg xmlns="http://www.w3.org/2000/svg" width="44" height="54" viewBox="0 0 44 54">
                      <path d="M22 0C10 0 0 10 0 22c0 16.5 22 32 22 32s22-15.5 22-32C44 10 34 0 22 0z" fill="#ef4444"/>
                      <circle cx="22" cy="20" r="12" fill="white"/>
                      <circle cx="22" cy="20" r="6" fill="#ef4444"/>
                    </svg>
                  `),
                scaledSize: new google.maps.Size(44, 54),
                anchor: new google.maps.Point(22, 54),
              }}
            />
          )}
        </GoogleMap>

        {/* Back Button */}
        <button
          onClick={() => router.push('/driver')}
          className="absolute top-12 left-4 z-10 p-3 bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-lg"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>

        {/* ETA Badge */}
        {eta && (
          <div className="absolute top-12 right-4 z-10 bg-gray-800/90 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span className="text-white font-semibold">{eta}</span>
            </div>
            {distance && (
              <p className="text-xs text-gray-400 text-right">{distance}</p>
            )}
          </div>
        )}
      </div>

      {/* ── Bottom Panel ── */}
      <div className="bg-gray-800 rounded-t-3xl border-t border-gray-700 safe-bottom">
        {/* Expand Handle */}
        <button
          onClick={() => setDetailsExpanded(!detailsExpanded)}
          className="w-full flex items-center justify-center py-2"
        >
          <div className="w-12 h-1 bg-gray-600 rounded-full" />
        </button>

        {/* Status Header */}
        <div className="px-4 pb-3 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
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
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  {isPickedUp ? 'Delivering to' : 'Picking up from'}
                </p>
                <p className="text-white font-semibold">{targetName}</p>
              </div>
            </div>
            <button
              onClick={() => setDetailsExpanded(!detailsExpanded)}
              className="p-2 text-gray-400"
            >
              {detailsExpanded ? (
                <ChevronDown className="w-5 h-5" />
              ) : (
                <ChevronUp className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Expanded Details */}
        {detailsExpanded && (
          <div className="px-4 py-3 border-b border-gray-700 max-h-48 overflow-y-auto">
            {/* Address */}
            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-1">Address</p>
              <p className="text-sm text-white">{targetAddress}</p>
              {isPickedUp && order.deliveryAddress?.instructions && (
                <p className="text-sm text-amber-400 mt-1">
                  📝 {order.deliveryAddress.instructions}
                </p>
              )}
            </div>

            {/* Order Items */}
            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-1">Items</p>
              {order.items?.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-gray-300">
                    {item.quantity}x {item.name}
                  </span>
                  <span className="text-gray-500">${item.price?.toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm mt-2 pt-2 border-t border-gray-700">
                <span className="text-gray-400">Total</span>
                <span className="text-white font-semibold">
                  ${order.total?.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Tracking PIN */}
            {isPickedUp && order.trackingPin && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-emerald-400">Delivery PIN</p>
                    <p className="text-lg font-mono font-bold text-white">
                      {order.trackingPin}
                    </p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(order.trackingPin || '')}
                    className="p-2 bg-emerald-500/20 rounded-lg"
                  >
                    {copiedPin ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-emerald-400" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="px-4 py-3 flex items-center gap-2">
          {/* Call Button */}
          <button
            onClick={() => callPhone(targetPhone)}
            disabled={!targetPhone}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white font-medium rounded-xl transition-colors"
          >
            <Phone className="w-5 h-5" />
            <span>Call</span>
          </button>

          {/* Navigate Button */}
          <button
            onClick={() =>
              targetLocation && openNavigation(targetLocation.lat, targetLocation.lng)
            }
            disabled={!targetLocation}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-700 text-white font-medium rounded-xl transition-colors"
          >
            <Navigation className="w-5 h-5" />
            <span>Navigate</span>
          </button>
        </div>

        {/* ── Proof of Delivery Photo (only visible after pickup) ── */}
        {isPickedUp && (
          <div className="px-4 pb-3">
            {proofPhoto ? (
              /* Photo preview */
              <div className="relative rounded-xl overflow-hidden border border-gray-700">
                <img
                  src={proofPhoto}
                  alt="Proof of delivery"
                  className="w-full h-36 object-cover"
                />
                <button
                  onClick={clearPhoto}
                  className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                {/* Retake */}
                <button
                  onClick={handleTakePhoto}
                  className="absolute bottom-2 right-2 px-3 py-1.5 bg-black/60 hover:bg-black/80 text-white text-xs font-medium rounded-lg flex items-center gap-1 transition-colors"
                >
                  <Camera className="w-3 h-3" />
                  Retake
                </button>
              </div>
            ) : (
              /* Capture button */
              <button
                onClick={handleTakePhoto}
                className="w-full flex items-center justify-center gap-3 py-4 border-2 border-dashed border-gray-600 hover:border-emerald-500/50 hover:bg-emerald-500/5 rounded-xl transition-colors"
              >
                <Camera className="w-6 h-6 text-gray-400" />
                <div className="text-left">
                  <p className="text-sm text-white font-medium">Take Delivery Photo</p>
                  <p className="text-xs text-gray-500">Required to complete delivery</p>
                </div>
              </button>
            )}

            {/* Photo error */}
            {photoError && (
              <p className="text-xs text-red-400 text-center mt-2">{photoError}</p>
            )}
          </div>
        )}

        {/* Main Action Button */}
        <div className="px-4 pb-4">
          {!isPickedUp ? (
            <button
              onClick={() => updateOrderStatus('picked_up')}
              disabled={updating}
              className="w-full flex items-center justify-center gap-2 py-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-600 text-white font-semibold rounded-xl transition-colors"
            >
              {updating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Package className="w-5 h-5" />
              )}
              <span>{updating ? 'Updating...' : 'Confirm Pickup'}</span>
            </button>
          ) : (
            <button
              onClick={handleCompleteDelivery}
              disabled={updating || uploadingPhoto || !proofPhoto}
              className="w-full flex items-center justify-center gap-2 py-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-600 disabled:text-gray-400 text-white font-semibold rounded-xl transition-colors"
            >
              {updating || uploadingPhoto ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <CheckCircle className="w-5 h-5" />
              )}
              <span>
                {uploadingPhoto
                  ? 'Uploading Photo...'
                  : updating
                  ? 'Completing...'
                  : !proofPhoto
                  ? 'Photo Required'
                  : 'Complete Delivery'}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}