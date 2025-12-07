// User & Auth Types
export interface User {
  uid: string;
  role: "admin" | "vendor" | "customer" | "driver";
  email: string;
  display_name?: string;
  photo_url?: string;
  created_at: any;
}

// Vendor Types
export interface Vendor {
  id: string;
  owner_uid: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  description: string;
  categories: string[];
  business_hours: string;
  logoUrl?: string;
  verified: boolean;
  stackbot_pin: string;
  rating: number;
  total_orders: number;
  total_revenue: number;
  created_at: any;
  updated_at: any;
}

// Product Types
export interface Product {
  id: string;
  vendor_id: string;
  vendor_name: string;
  name: string;
  description: string;
  price: number;
  compare_at_price?: number;
  category: string;
  images: string[];
  stock: number;
  active: boolean;
  views: number;
  created_at: any;
}

// Order Types
export type OrderStatus = 
  | "pending" 
  | "confirmed" 
  | "preparing" 
  | "ready"
  | "out_for_delivery" 
  | "delivered" 
  | "cancelled";

export interface OrderItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
  image_url?: string;
}

export interface Order {
  id: string;
  order_number: string;
  vendor_id: string;
  vendor_name: string;
  customer_id: string;
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: OrderStatus;
  tracking_pin: string;
  customer_info: {
    name: string;
    email: string;
    phone: string;
  };
  delivery_address: {
    street: string;
    city: string;
    country: string;
  };
  created_at: any;
  updated_at: any;
}

// Customer Types
export interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  total_orders: number;
  total_spent: number;
  created_at: any;
}

// Category Types
export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  active: boolean;
  vendor_count: number;
  product_count: number;
}