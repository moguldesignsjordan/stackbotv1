// src/lib/types/driver.ts
import { Timestamp } from 'firebase/firestore';

export type DriverStatus = 'online' | 'offline' | 'busy' | 'break';

export interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
  photoURL?: string;
  vehicleType: 'motorcycle' | 'car' | 'bicycle' | 'scooter';
  vehiclePlate: string;
  vehicleColor?: string;
  city?: string;
  currentLocation?: {
    lat: number;
    lng: number;
    updatedAt: Timestamp;
  };
  status: DriverStatus;
  lastStatusChange?: Timestamp;
  verified: boolean;
  rating: number;
  totalDeliveries: number;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface DriverStats {
  driverId: string;
  todayDeliveries: number;
  todayEarnings: number;
  todayTips: number;
  todayDate: string;
  weekDeliveries: number;
  weekEarnings: number;
  weekTips: number;
  weekStartDate: string;
  monthDeliveries: number;
  monthEarnings: number;
  monthTips: number;
  totalDeliveries: number;
  totalEarnings: number;
  totalTips: number;
  rating: number;
  totalRatings: number;
  acceptanceRate: number;
  completionRate: number;
  lastDeliveryAt?: Timestamp;
  updatedAt: Timestamp;
}

export type DeliveryQueueStatus =
  | 'pending'
  | 'assigned'
  | 'heading_to_pickup'
  | 'at_pickup'
  | 'picked_up'
  | 'heading_to_customer'
  | 'at_customer'
  | 'delivered'
  | 'cancelled';

export interface DeliveryQueueItem {
  id: string;
  orderId: string;
  vendorId: string;
  vendorName: string;
  vendorAddress: string;
  vendorPhone?: string;
  vendorLocation?: { lat: number; lng: number };
  customerId: string;
  customerName?: string;
  customerAddress: string;
  customerPhone?: string;
  customerLocation?: { lat: number; lng: number };
  itemCount: number;
  orderTotal: number;
  deliveryFee: number;
  tip?: number;
  estimatedDistance?: number;
  estimatedTime?: number;
  status: DeliveryQueueStatus;
  priority: 'normal' | 'high';
  driverId?: string;
  driverName?: string;
  createdAt: Timestamp;
  assignedAt?: Timestamp;
  pickedUpAt?: Timestamp;
  deliveredAt?: Timestamp;
  cancelledAt?: Timestamp;
  cancelledBy?: string;
  cancellationReason?: string;
}

export type ActiveDeliveryStatus =
  | 'heading_to_pickup'
  | 'at_pickup'
  | 'picked_up'
  | 'heading_to_customer'
  | 'at_customer'
  | 'delivered';

export interface ActiveDelivery {
  orderId: string;
  queueId: string;
  vendorId: string;
  vendorName: string;
  vendorAddress: string;
  vendorPhone?: string;
  vendorLocation?: { lat: number; lng: number };
  customerId?: string;
  customerName?: string;
  customerAddress: string;
  customerPhone?: string;
  customerLocation?: { lat: number; lng: number };
  itemCount: number;
  deliveryFee: number;
  tip?: number;
  orderItems?: Array<{ name: string; quantity: number }>;
  status: ActiveDeliveryStatus;
  acceptedAt: Timestamp;
  pickedUpAt?: Timestamp;
  deliveredAt?: Timestamp;
}

export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface DriverApplication {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  vehicleType: 'motorcycle' | 'car' | 'bicycle' | 'scooter';
  vehiclePlate: string;
  vehicleColor?: string;
  experience: 'none' | 'lessThan1' | 'oneToThree' | 'moreThan3';
  whyJoin?: string;
  hasLicense: boolean;
  hasSmartphone: boolean;
  agreedToTerms: boolean;
  status: ApplicationStatus;
  reviewedAt?: Timestamp;
  reviewedBy?: string;
  rejectionReason?: string;
  driverId?: string;
  language: 'es' | 'en';
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface DeliveryOrder {
  id: string;
  orderId: string;
  driverId: string;
  vendorId: string;
  vendorName: string;
  vendorAddress: string;
  customerId: string;
  customerName?: string;
  customerAddress: string;
  itemCount: number;
  orderTotal: number;
  deliveryFee: number;
  tip: number;
  bonus: number;
  totalEarnings: number;
  acceptedAt: Timestamp;
  pickedUpAt?: Timestamp;
  deliveredAt?: Timestamp;
  duration?: number;
  rating?: number;
  customerFeedback?: string;
  status: 'delivered' | 'cancelled';
  cancelledAt?: Timestamp;
  cancellationReason?: string;
  createdAt: Timestamp;
}
