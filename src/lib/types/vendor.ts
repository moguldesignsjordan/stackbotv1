export interface VendorLocation {
  lat: number;
  lng: number;
  location_address: string;
}

export interface VendorBankInfo {
  bank_name: string;
  account_holder: string;
  account_last4: string;
  routing_number: string;
  account_type: "checking" | "savings";
}

export interface Vendor {
  uid: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  website?: string;
  description?: string;
  categories: string[];
  logoUrl?: string;
  cover_image_url?: string;
  slug: string;
  verified: boolean;
  hours?: string;
  delivery_fee?: number;
  min_order?: number;
  total_orders: number;
  total_revenue: number;
  rating: number;
  
  // New fields
  location?: VendorLocation;
  bank_info?: VendorBankInfo;
  
  created_at: any; // Firestore Timestamp
  updated_at: any;
}