// src/lib/types/order.ts

export interface CartItem {
  productId: string;
  vendorId: string;
  vendorName: string;
  name: string;
  description?: string;
  price: number;
  quantity: number;
  imageUrl?: string;
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
  postalCode?: string;
  country: string;
  instructions?: string;
}

export interface CheckoutSessionRequest {
  items: CartItem[];
  customerInfo: CustomerInfo;
  deliveryAddress: DeliveryAddress;
  notes?: string;
  saveAddress?: boolean; // Whether to save address to profile
}

export interface Order {
  id: string;
  orderId: string;
  customerId: string;
  vendorId: string;
  vendorName: string;
  items: CartItem[];
  customerInfo: CustomerInfo;
  deliveryAddress: DeliveryAddress;
  notes?: string;
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  tax: number;
  total: number;
  status: OrderStatus;
  trackingPin: string;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
  confirmedAt?: string;
  preparingAt?: string;
  outForDeliveryAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
}

export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export interface OrderStatusUpdate {
  status: OrderStatus;
  updatedAt: string;
  updatedBy?: string;
  notes?: string;
}