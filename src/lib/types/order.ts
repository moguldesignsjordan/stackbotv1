// src/lib/types/order.ts

export interface CartItem {
  productId: string;
  vendorId: string;
  vendorName: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface Cart {
  items: CartItem[];
  vendorId: string | null;
  vendorName: string | null;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
  image?: string;
}

export interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
}

export interface DeliveryAddress {
  street: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  instructions?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready_for_pickup'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface Order {
  id: string;
  orderId: string;
  customerId: string;
  vendorId: string;
  vendorName: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  tax: number;
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: 'stripe';
  stripePaymentIntentId?: string;
  stripeSessionId?: string;
  customerInfo: CustomerInfo;
  deliveryAddress: DeliveryAddress;
  trackingPin: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  confirmedAt?: Date;
  deliveredAt?: Date;
}

export interface CheckoutSessionRequest {
  items: CartItem[];
  customerInfo: CustomerInfo;
  deliveryAddress: DeliveryAddress;
  notes?: string;
}

export interface CheckoutSessionResponse {
  sessionId: string;
  url: string;
}