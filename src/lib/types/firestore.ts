import { Timestamp } from "firebase/firestore";

/* =====================================================
   VENDOR TYPE
===================================================== */

export interface Vendor {
  id: string;

  // Names
  name?: string;
  business_name?: string;

  // Descriptions
  description?: string;
  business_description?: string;

  // Routing / SEO
  slug?: string;

  // Categories
  category?: string;
  categories?: string[];

  // Media
  logo_url?: string;
  logoUrl?: string;
  banner_url?: string;
  cover_image_url?: string;

  // Ratings
  rating?: number;
  total_reviews?: number;

  // Status
  status?: "pending" | "approved" | "rejected";
  verified?: boolean;

  // Timestamps
  created_at?: Timestamp;
}

/* =====================================================
   PRODUCT TYPE
===================================================== */

export interface Product {
  id: string;

  name: string;
  description?: string;

  price: number;
  images?: string[];

  active?: boolean;

  // Vendor relationship
  vendorId: string;
  vendorSlug?: string;
  vendor_name?: string;

  created_at?: Timestamp;
}

/* =====================================================
   PRODUCT OPTIONS
===================================================== */

export interface ProductOptionItem {
  id: string;
  label: string;
  priceDelta: number;
}

export interface ProductOptionGroup {
  id: string;
  title: string;
  type: "single" | "multiple";
  required: boolean;
  options: ProductOptionItem[];
}

/* =====================================================
   PRODUCT (EXTENDED)
===================================================== */

export interface Product {
  id: string;

  name: string;
  description?: string;
  price: number;

  images?: string[];
  active?: boolean;

  vendorId: string;
  vendorSlug?: string;
  vendor_name?: string;

  options?: ProductOptionGroup[];
  customFields?: any[];

  created_at?: any;
  updated_at?: any;
}
