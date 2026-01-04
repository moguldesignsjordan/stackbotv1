// src/lib/config/categories.ts
//
// ═══════════════════════════════════════════════════════════════════════════
// MASTER CATEGORY CONFIGURATION - SINGLE SOURCE OF TRUTH
// ═══════════════════════════════════════════════════════════════════════════
//
// All pages should import from this file to ensure consistency.
// When a vendor signs up, they select from VENDOR_CATEGORIES.
// When filtering/displaying, use these same values.
//

import type { LucideIcon } from "lucide-react";
import {
  Pizza,
  ShoppingBasket,
  Car,
  Sparkles,
  Briefcase,
  Wrench,
  ShoppingBag,
  Smartphone,
  Compass,
} from "lucide-react";

/* ======================================================
   MASTER VENDOR CATEGORIES (STORED IN FIREBASE)
====================================================== */

export const VENDOR_CATEGORIES = [
  "Restaurants",
  "Groceries",
  "Taxi Service",
  "Beauty & Wellness",
  "Professional Services",
  "Home Repair & Maintenance",
  "Retail Shops",
  "Electronics & Gadgets",
  "Tours & Activities",
  "Cleaning Services",
] as const;

export type VendorCategory = typeof VENDOR_CATEGORIES[number];

/* ======================================================
   CATEGORY METADATA (DISPLAY CONFIG)
====================================================== */

export interface CategoryMeta {
  slug: string;
  name: VendorCategory;
  description: string;
  icon: LucideIcon; // ✅ REAL REACT COMPONENT
  color: string;
  bgColor: string;
  featured?: boolean;
}

export const CATEGORY_META: CategoryMeta[] = [
  {
    slug: "restaurants",
    name: "Restaurants",
    description: "Local dining and takeout options",
    icon: Pizza,
    color: "text-red-600",
    bgColor: "bg-red-100",
    featured: true,
  },
  {
    slug: "groceries",
    name: "Groceries",
    description: "Supermarkets and grocery stores",
    icon: ShoppingBasket,
    color: "text-green-600",
    bgColor: "bg-green-100",
    featured: true,
  },
  {
    slug: "taxi-service",
    name: "Taxi Service",
    description: "Transportation and ride services",
    icon: Car,
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
    featured: true,
  },
  {
    slug: "beauty-wellness",
    name: "Beauty & Wellness",
    description: "Salons, spas, and cosmetics",
    icon: Sparkles,
    color: "text-pink-600",
    bgColor: "bg-pink-100",
  },
  {
    slug: "professional-services",
    name: "Professional Services",
    description: "Lawyers, accountants, consultants",
    icon: Briefcase,
    color: "text-indigo-600",
    bgColor: "bg-indigo-100",
  },
  {
    slug: "home-repair",
    name: "Home Repair & Maintenance",
    description: "Handyman, plumbing, electrical",
    icon: Wrench,
    color: "text-slate-600",
    bgColor: "bg-slate-100",
  },
  {
    slug: "retail-shops",
    name: "Retail Shops",
    description: "General merchandise and shopping",
    icon: ShoppingBag,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
    featured: true,
  },
  {
    slug: "electronics",
    name: "Electronics & Gadgets",
    description: "Phones, computers, and tech",
    icon: Smartphone,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  {
    slug: "tours-activities",
    name: "Tours & Activities",
    description: "Tours, excursions, and experiences",
    icon: Compass,
    color: "text-cyan-600",
    bgColor: "bg-cyan-100",
  },
  {
    slug: "cleaning-services",
    name: "Cleaning Services",
    description: "Home and commercial cleaning",
    icon: Sparkles,
    color: "text-teal-600",
    bgColor: "bg-teal-100",
  },
];

/* ======================================================
   LEGACY CATEGORY NORMALIZATION
====================================================== */

export const LEGACY_CATEGORY_MAP: Record<string, VendorCategory> = {
  "taxi & transport": "Taxi Service",
  "taxi and transport": "Taxi Service",
  "taxi_transport": "Taxi Service",
  "taxi": "Taxi Service",
  "transport": "Taxi Service",
  "transportation": "Taxi Service",
  "taxi service": "Taxi Service",
  "taxi-service": "Taxi Service",

  "cleaning service": "Cleaning Services",
  "cleaning_services": "Cleaning Services",
  "cleaning": "Cleaning Services",

  "beauty_wellness": "Beauty & Wellness",
  "beauty": "Beauty & Wellness",
  "wellness": "Beauty & Wellness",
  "salon": "Beauty & Wellness",
  "spa": "Beauty & Wellness",

  "professional_services": "Professional Services",
  "services": "Professional Services",

  "electronics_gadgets": "Electronics & Gadgets",
  "electronics": "Electronics & Gadgets",
  "gadgets": "Electronics & Gadgets",

  "home_repair": "Home Repair & Maintenance",
  "home repair": "Home Repair & Maintenance",
  "maintenance": "Home Repair & Maintenance",

  "tours_activities": "Tours & Activities",
  "tours": "Tours & Activities",
  "activities": "Tours & Activities",

  "retail_shops": "Retail Shops",
  "retail": "Retail Shops",

  "restaurant": "Restaurants",
  "dining": "Restaurants",
  "food": "Restaurants",

  "grocery": "Groceries",
  "supermarket": "Groceries",
};

/* ======================================================
   NORMALIZATION HELPERS
====================================================== */

export function normalizeCategory(category: string): VendorCategory | null {
  if (!category) return null;

  const normalized = category.toLowerCase().trim();

  const directMatch = VENDOR_CATEGORIES.find(
    c => c.toLowerCase() === normalized
  );
  if (directMatch) return directMatch;

  return LEGACY_CATEGORY_MAP[normalized] || null;
}

/* ======================================================
   MATCHING LOGIC
====================================================== */

export function vendorMatchesCategory(
  vendorOrCategory:
    | string
    | { category?: string; categories?: string[] }
    | undefined,
  vendorCategoriesOrTarget: string[] | string | undefined,
  targetCategory?: string
): boolean {
  let vendorCategory: string | undefined;
  let vendorCategories: string[] | undefined;
  let target: string;

  if (typeof vendorOrCategory === "object" && vendorOrCategory !== null) {
    vendorCategory = vendorOrCategory.category;
    vendorCategories = vendorOrCategory.categories;
    target = vendorCategoriesOrTarget as string;
  } else {
    vendorCategory = vendorOrCategory as string | undefined;
    vendorCategories = vendorCategoriesOrTarget as string[] | undefined;
    target = targetCategory as string;
  }

  if (!target || target.toLowerCase() === "all") return true;

  const normalizedTarget = normalizeCategory(target) || target;

  if (vendorCategory) {
    const normalizedVendor =
      normalizeCategory(vendorCategory) || vendorCategory;
    if (
      normalizedVendor.toLowerCase() ===
      normalizedTarget.toLowerCase()
    ) {
      return true;
    }
  }

  if (vendorCategories?.length) {
    return vendorCategories.some(cat => {
      const normalized =
        normalizeCategory(cat) || cat;
      return (
        normalized.toLowerCase() ===
        normalizedTarget.toLowerCase()
      );
    });
  }

  return false;
}

/* ======================================================
   PUBLIC / INTERNAL HELPERS
====================================================== */

export interface PublicCategory {
  slug: string;
  name: VendorCategory;
  description: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
}

export interface CategoryWithId extends PublicCategory {
  id: string;
  featured?: boolean;
}

export function getPublicCategory(slug: string): PublicCategory | null {
  const meta = CATEGORY_META.find(c => c.slug === slug);
  if (!meta) return null;
  return meta;
}

export function getAllPublicCategories(): PublicCategory[] {
  return CATEGORY_META;
}

export function getAllCategories(): CategoryWithId[] {
  return CATEGORY_META.map(c => ({
    id: c.name,
    ...c,
  }));
}

export function getFeaturedCategories(): CategoryWithId[] {
  return CATEGORY_META.filter(c => c.featured).map(c => ({
    id: c.name,
    ...c,
  }));
}

export function getCategoryBySlug(slug: string) {
  return CATEGORY_META.find(c => c.slug === slug);
}

export function getCategoryNameFromSlug(slug: string): VendorCategory | null {
  return CATEGORY_META.find(c => c.slug === slug)?.name || null;
}

export function getAllCategorySlugs(): string[] {
  return CATEGORY_META.map(c => c.slug);
}
