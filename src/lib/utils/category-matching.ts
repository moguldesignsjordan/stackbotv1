// src/lib/utils/category-matching.ts

/**
 * Category Matching Utilities
 * 
 * Provides consistent category matching across the platform.
 * Handles variations in how categories are stored vs displayed.
 */

/* ======================================================
   CATEGORY ALIASES MAP
   
   Maps display names to all possible stored values.
   This ensures vendors with legacy category names still match.
====================================================== */

export const CATEGORY_ALIASES: Record<string, string[]> = {
  "taxi & transport": [
    "taxi & transport",
    "taxi and transport",
    "taxi_transport",
    "taxi service",
    "taxi-service",
    "taxi",
    "transport",
    "transportation",
    "ride services",
    "car service",
  ],
  "cleaning services": [
    "cleaning services",
    "cleaning_services",
    "cleaning service",
    "cleaning",
    "house cleaning",
    "commercial cleaning",
  ],
  "restaurants": [
    "restaurants",
    "restaurant",
    "dining",
    "food",
  ],
  "groceries": [
    "groceries",
    "grocery",
    "supermarket",
    "supermarkets",
    "grocery store",
  ],
  "beauty & wellness": [
    "beauty & wellness",
    "beauty and wellness",
    "beauty_wellness",
    "beauty",
    "wellness",
    "salon",
    "spa",
    "cosmetics",
    "barbershop",
  ],
  "professional services": [
    "professional services",
    "professional_services",
    "services",
    "professional",
    "consulting",
  ],
  "electronics": [
    "electronics",
    "electronics & gadgets",
    "electronics and gadgets",
    "electronics_gadgets",
    "gadgets",
    "phones",
    "computers",
    "tech",
  ],
  "retail shops": [
    "retail shops",
    "retail_shops",
    "retail",
    "shopping",
    "shop",
    "store",
  ],
  "home repair & maintenance": [
    "home repair & maintenance",
    "home repair and maintenance",
    "home_repair",
    "home repair",
    "maintenance",
    "handyman",
  ],
  "tours & activities": [
    "tours & activities",
    "tours and activities",
    "tours_activities",
    "tours",
    "activities",
    "travel & tourism",
    "travel",
    "tourism",
  ],
  "food & drinks": [
    "food & drinks",
    "food and drinks",
    "food",
    "drinks",
  ],
};

/* ======================================================
   HELPER FUNCTIONS
====================================================== */

/**
 * Get all aliases for a category (case-insensitive lookup)
 */
export function getCategoryAliases(category: string): string[] {
  const normalizedCategory = category.toLowerCase().trim();
  
  // Direct match in aliases map
  if (CATEGORY_ALIASES[normalizedCategory]) {
    return CATEGORY_ALIASES[normalizedCategory];
  }
  
  // Check if category is an alias of another category
  for (const [key, aliases] of Object.entries(CATEGORY_ALIASES)) {
    if (aliases.map(a => a.toLowerCase()).includes(normalizedCategory)) {
      return aliases;
    }
  }
  
  // No aliases found, return the category itself
  return [normalizedCategory];
}

/**
 * Check if a vendor matches a category (flexible matching)
 * 
 * @param vendorCategory - The vendor's primary category field
 * @param vendorCategories - The vendor's categories array
 * @param targetCategory - The category to match against
 */
export function vendorMatchesCategory(
  vendorCategory: string | undefined,
  vendorCategories: string[] | undefined,
  targetCategory: string
): boolean {
  if (!targetCategory || targetCategory.toLowerCase() === "all") {
    return true;
  }

  const aliases = getCategoryAliases(targetCategory);
  const vendorCatLower = (vendorCategory || "").toLowerCase().trim();
  const vendorCatsLower = (vendorCategories || []).map(c => c.toLowerCase().trim());

  for (const alias of aliases) {
    const aliasLower = alias.toLowerCase();

    // Exact matches
    if (vendorCatLower === aliasLower) return true;
    if (vendorCatsLower.includes(aliasLower)) return true;

    // Partial matches (contains)
    if (vendorCatLower && (vendorCatLower.includes(aliasLower) || aliasLower.includes(vendorCatLower))) {
      return true;
    }

    for (const vc of vendorCatsLower) {
      if (vc.includes(aliasLower) || aliasLower.includes(vc)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if a product matches a category through its vendor
 * 
 * @param productCategory - The product's category field
 * @param vendorCategory - The vendor's primary category
 * @param vendorCategories - The vendor's categories array
 * @param targetCategory - The category to match against
 */
export function productMatchesCategory(
  productCategory: string | undefined,
  vendorCategory: string | undefined,
  vendorCategories: string[] | undefined,
  targetCategory: string
): boolean {
  if (!targetCategory || targetCategory.toLowerCase() === "all") {
    return true;
  }

  const aliases = getCategoryAliases(targetCategory);
  const productCatLower = (productCategory || "").toLowerCase().trim();

  // Check product's own category
  for (const alias of aliases) {
    if (productCatLower === alias.toLowerCase()) {
      return true;
    }
  }

  // Check vendor's category
  return vendorMatchesCategory(vendorCategory, vendorCategories, targetCategory);
}

/**
 * Normalize a category string for consistent storage
 */
export function normalizeCategory(category: string): string {
  return category
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s*&\s*/g, ' & ');
}

/**
 * Get display name for a category
 * Converts stored values to proper display format
 */
export function getCategoryDisplayName(category: string): string {
  const normalized = normalizeCategory(category);
  
  // Map common stored values to display names
  const displayNames: Record<string, string> = {
    "taxi & transport": "Taxi & Transport",
    "taxi_transport": "Taxi & Transport",
    "taxi service": "Taxi & Transport",
    "cleaning services": "Cleaning Services",
    "cleaning_services": "Cleaning Services",
    "beauty & wellness": "Beauty & Wellness",
    "beauty_wellness": "Beauty & Wellness",
    "professional services": "Professional Services",
    "professional_services": "Professional Services",
    "electronics & gadgets": "Electronics & Gadgets",
    "electronics_gadgets": "Electronics & Gadgets",
    "retail shops": "Retail Shops",
    "retail_shops": "Retail Shops",
    "home repair & maintenance": "Home Repair & Maintenance",
    "home_repair": "Home Repair & Maintenance",
    "tours & activities": "Tours & Activities",
    "tours_activities": "Tours & Activities",
    "food & drinks": "Food & Drinks",
    "restaurants": "Restaurants",
    "groceries": "Groceries",
  };

  return displayNames[normalized] || 
    category
      .split(/[\s_]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
      .replace(' And ', ' & ');
}