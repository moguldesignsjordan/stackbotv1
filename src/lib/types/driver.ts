// src/lib/types/driver.ts

import { Timestamp, FieldValue } from 'firebase/firestore';

export type DriverStatus = 'offline' | 'available' | 'busy' | 'returning';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface DriverProfile {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  photoURL?: string;
  
  // Status
  status: DriverStatus;
  isOnline: boolean;
  currentOrderId?: string;
  
  // Location
  currentLocation?: Coordinates;
  lastLocationUpdate?: Timestamp;
  
  // Vehicle info
  vehicleType: 'motorcycle' | 'car' | 'bicycle' | 'scooter';
  vehiclePlate?: string;
  vehicleColor?: string;
  
  // Stats
  totalDeliveries: number;
  rating: number;
  ratingCount: number;
  
  // Timestamps
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
  lastActiveAt?: Timestamp;
  
  // Verification
  isVerified: boolean;
  verifiedAt?: Timestamp;
  documents?: {
    license?: string;
    insurance?: string;
    vehiclePhoto?: string;
  };
}

export interface DeliveryOrder {
  id: string;
  orderId: string;
  
  // Status
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'claimed' | 'picked_up' | 'out_for_delivery' | 'delivered' | 'cancelled';
  deliveryStatus: 'available' | 'claimed' | 'picked_up' | 'in_transit' | 'delivered';
  
  // Assignment
  driverId?: string;
  driverName?: string;
  claimedAt?: Timestamp;
  pickedUpAt?: Timestamp;
  deliveredAt?: Timestamp;
  
  // Vendor info
  vendorId: string;
  vendorName: string;
  vendorPhone?: string;
  vendorAddress?: string;
  vendorCoordinates?: Coordinates;
  
  // Customer info
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  
  // Delivery details
  deliveryAddress: {
    street: string;
    city: string;
    state?: string;
    postalCode?: string;
    country: string;
    instructions?: string;
    coordinates?: Coordinates;
  };
  
  // Order details
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  deliveryFee: number;
  total: number;
  
  // Distance & time
  estimatedDistance?: number; // km
  estimatedDuration?: number; // minutes
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // Tracking PIN
  trackingPin?: string;
  
  // Notes
  notes?: string;
}

export interface DriverEarnings {
  driverId: string;
  date: string; // YYYY-MM-DD
  deliveries: number;
  totalEarnings: number;
  tips: number;
  bonuses: number;
  deductions: number;
  netEarnings: number;
}

export interface DriverLocation {
  driverId: string;
  coordinates: Coordinates;
  heading?: number;
  speed?: number;
  accuracy?: number;
  timestamp: Timestamp;
}