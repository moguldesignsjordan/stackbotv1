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

/**
 * Master list of vendor categories.
 * This is what gets stored in Firebase when vendors sign up.
 * All other pages should reference this list.
 */
export const VENDOR_CATEGORIES = [
  "Restaurants",
  "Groceries",
  "Taxi Service",           // ← Standardized name
  "Beauty & Wellness",
  "Professional Services",
  "Home Repair & Maintenance",
  "Retail Shops",
  "Electronics & Gadgets",
  "Tours & Activities",
  "Cleaning Services",
] as const;

export type VendorCategory = typeof VENDOR_CATEGORIES[number];

/**
 * Category metadata for display purposes.
 * slug: URL-friendly version
 * name: Display name (must match VENDOR_CATEGORIES)
 * description: Short description for category pages
 * icon: Lucide icon name
 * color: Tailwind text color class
 * bgColor: Tailwind background color class
 * featured: Show in featured section on homepage
 */
export interface CategoryMeta {
  slug: string;
  name: VendorCategory;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
  featured?: boolean;
}

export const CATEGORY_META: CategoryMeta[] = [
  {
    slug: "restaurants",
    name: "Restaurants",
    description: "Local dining and takeout options",
    icon: "Pizza",
    color: "text-red-600",
    bgColor: "bg-red-100",
    featured: true,
  },
  {
    slug: "groceries",
    name: "Groceries",
    description: "Supermarkets and grocery stores",
    icon: "ShoppingBasket",
    color: "text-green-600",
    bgColor: "bg-green-100",
    featured: true,
  },
  {
    slug: "taxi-service",
    name: "Taxi Service",
    description: "Transportation and ride services",
    icon: "Car",
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
    featured: true,
  },
  {
    slug: "beauty-wellness",
    name: "Beauty & Wellness",
    description: "Salons, spas, and cosmetics",
    icon: "Sparkles",
    color: "text-pink-600",
    bgColor: "bg-pink-100",
  },
  {
    slug: "professional-services",
    name: "Professional Services",
    description: "Lawyers, accountants, consultants",
    icon: "Briefcase",
    color: "text-indigo-600",
    bgColor: "bg-indigo-100",
  },
  {
    slug: "home-repair",
    name: "Home Repair & Maintenance",
    description: "Handyman, plumbing, electrical",
    icon: "Wrench",
    color: "text-slate-600",
    bgColor: "bg-slate-100",
  },
  {
    slug: "retail-shops",
    name: "Retail Shops",
    description: "General merchandise and shopping",
    icon: "ShoppingBag",
    color: "text-purple-600",
    bgColor: "bg-purple-100",
    featured: true,
  },
  {
    slug: "electronics",
    name: "Electronics & Gadgets",
    description: "Phones, computers, and tech",
    icon: "Smartphone",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  {
    slug: "tours-activities",
    name: "Tours & Activities",
    description: "Tours, excursions, and experiences",
    icon: "Compass",
    color: "text-cyan-600",
    bgColor: "bg-cyan-100",
  },
  {
    slug: "cleaning-services",
    name: "Cleaning Services",
    description: "Home and commercial cleaning",
    icon: "Sparkles",
    color: "text-teal-600",
    bgColor: "bg-teal-100",
  },
];

/**
 * Legacy category mapping for backward compatibility.
 * Maps old category names to the new standardized names.
 * Use this when querying vendors that may have old category values.
 */
export const LEGACY_CATEGORY_MAP: Record<string, VendorCategory> = {
  // Taxi variations - ALL map to "Taxi Service"
  "taxi & transport": "Taxi Service",
  "taxi and transport": "Taxi Service",
  "taxi_transport": "Taxi Service",
  "taxi": "Taxi Service",
  "transport": "Taxi Service",
  "transportation": "Taxi Service",
  "taxi service": "Taxi Service",
  "taxi-service": "Taxi Service",
  
  // Cleaning variations
  "cleaning service": "Cleaning Services",
  "cleaning_services": "Cleaning Services",
  "cleaning": "Cleaning Services",
  
  // Beauty variations
  "beauty_wellness": "Beauty & Wellness",
  "beauty": "Beauty & Wellness",
  "wellness": "Beauty & Wellness",
  "salon": "Beauty & Wellness",
  "spa": "Beauty & Wellness",
  
  // Professional services variations
  "professional_services": "Professional Services",
  "services": "Professional Services",
  
  // Electronics variations
  "electronics_gadgets": "Electronics & Gadgets",
  "electronics": "Electronics & Gadgets",
  "gadgets": "Electronics & Gadgets",
  
  // Home repair variations
  "home_repair": "Home Repair & Maintenance",
  "home repair": "Home Repair & Maintenance",
  "maintenance": "Home Repair & Maintenance",
  
  // Tours variations
  "tours_activities": "Tours & Activities",
  "tours": "Tours & Activities",
  "activities": "Tours & Activities",
  
  // Retail variations
  "retail_shops": "Retail Shops",
  "retail": "Retail Shops",
  
  // Restaurant variations
  "restaurant": "Restaurants",
  "dining": "Restaurants",
  "food": "Restaurants",
  
  // Grocery variations
  "grocery": "Groceries",
  "supermarket": "Groceries",
};

/**
 * Normalize a category string to the standard name.
 * Handles legacy names and case variations.
 */
export function normalizeCategory(category: string): VendorCategory | null {
  if (!category) return null;
  
  const normalized = category.toLowerCase().trim();
  
  // Check if it's already a valid category (case-insensitive)
  const directMatch = VENDOR_CATEGORIES.find(
    c => c.toLowerCase() === normalized
  );
  if (directMatch) return directMatch;
  
  // Check legacy mapping
  if (LEGACY_CATEGORY_MAP[normalized]) {
    return LEGACY_CATEGORY_MAP[normalized];
  }
  
  return null;
}

/**
 * Check if a vendor's category matches a target category.
 * Handles legacy names and array of categories.
 * 
 * Can be called two ways:
 * 1. vendorMatchesCategory(vendorCategory, vendorCategories, targetCategory)
 * 2. vendorMatchesCategory(vendorObject, targetCategory) - for convenience
 */
export function vendorMatchesCategory(
  vendorOrCategory: string | { category?: string; categories?: string[] } | undefined,
  vendorCategoriesOrTarget: string[] | string | undefined,
  targetCategory?: string
): boolean {
  // Detect which call signature is being used
  let vendorCategory: string | undefined;
  let vendorCategories: string[] | undefined;
  let target: string;

  if (typeof vendorOrCategory === 'object' && vendorOrCategory !== null) {
    // Called as: vendorMatchesCategory(vendorObject, targetCategory)
    vendorCategory = vendorOrCategory.category;
    vendorCategories = vendorOrCategory.categories;
    target = vendorCategoriesOrTarget as string;
  } else {
    // Called as: vendorMatchesCategory(vendorCategory, vendorCategories, targetCategory)
    vendorCategory = vendorOrCategory as string | undefined;
    vendorCategories = vendorCategoriesOrTarget as string[] | undefined;
    target = targetCategory as string;
  }

  if (!target || target.toLowerCase() === "all") {
    return true;
  }

  const normalizedTarget = normalizeCategory(target) || target;
  
  // Check primary category
  if (vendorCategory) {
    const normalizedVendor = normalizeCategory(vendorCategory) || vendorCategory;
    if (normalizedVendor.toLowerCase() === normalizedTarget.toLowerCase()) {
      return true;
    }
  }
  
  // Check categories array
  if (vendorCategories && vendorCategories.length > 0) {
    for (const cat of vendorCategories) {
      const normalizedCat = normalizeCategory(cat) || cat;
      if (normalizedCat.toLowerCase() === normalizedTarget.toLowerCase()) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Get category metadata by slug
 */
export function getCategoryBySlug(slug: string): CategoryMeta | undefined {
  return CATEGORY_META.find(c => c.slug === slug);
}

/**
 * Get category metadata by name
 */
export function getCategoryByName(name: string): CategoryMeta | undefined {
  const normalized = normalizeCategory(name);
  return CATEGORY_META.find(c => c.name === normalized || c.name === name);
}

/**
 * Get slug from category name
 */
export function getCategorySlug(name: string): string {
  const meta = getCategoryByName(name);
  return meta?.slug || name.toLowerCase().replace(/[\s&]+/g, "-");
}

/**
 * Public category info for dynamic category pages.
 * Returns category data needed for /categories/[slug] page.
 */
export interface PublicCategory {
  slug: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
}

/**
 * Get public category info by slug.
 * Used by /categories/[slug]/page.tsx
 */
export function getPublicCategory(slug: string): PublicCategory | null {
  const meta = CATEGORY_META.find(c => c.slug === slug);
  if (!meta) return null;
  
  return {
    slug: meta.slug,
    name: meta.name,
    description: meta.description,
    icon: meta.icon,
    color: meta.color,
    bgColor: meta.bgColor,
  };
}

/**
 * Get all public categories for listing pages.
 */
export function getAllPublicCategories(): PublicCategory[] {
  return CATEGORY_META.map(c => ({
    slug: c.slug,
    name: c.name,
    description: c.description,
    icon: c.icon,
    color: c.color,
    bgColor: c.bgColor,
  }));
}

/**
 * Category with ID for internal use.
 * Used by categories page for filtering.
 */
export interface CategoryWithId {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
  featured?: boolean;
}

/**
 * Get all categories with IDs for the categories listing page.
 * The ID is the normalized category name used for matching.
 */
export function getAllCategories(): CategoryWithId[] {
  return CATEGORY_META.map(c => ({
    id: c.name, // The category name IS the ID for matching
    slug: c.slug,
    name: c.name,
    description: c.description,
    icon: c.icon,
    color: c.color,
    bgColor: c.bgColor,
    featured: c.featured,
  }));
}

/**
 * Check if a vendor matches a category by ID (category name).
 * Simplified version for categories page.
 */
export function vendorMatchesCategoryById(
  vendor: { category?: string; categories?: string[] },
  categoryId: string
): boolean {
  return vendorMatchesCategory(vendor.category, vendor.categories, categoryId);
}

/**
 * Get featured categories for homepage/highlights.
 */
export function getFeaturedCategories(): CategoryWithId[] {
  return CATEGORY_META
    .filter(c => c.featured)
    .map(c => ({
      id: c.name,
      slug: c.slug,
      name: c.name,
      description: c.description,
      icon: c.icon,
      color: c.color,
      bgColor: c.bgColor,
      featured: c.featured,
    }));
}

/**
 * Get category name from slug.
 */
export function getCategoryNameFromSlug(slug: string): string | null {
  const meta = CATEGORY_META.find(c => c.slug === slug);
  return meta?.name || null;
}

/**
 * Get all category slugs (for static paths generation).
 */
export function getAllCategorySlugs(): string[] {
  return CATEGORY_META.map(c => c.slug);
}