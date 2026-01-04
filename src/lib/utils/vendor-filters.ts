// src/lib/utils/vendor-filters.ts

/**
 * VENDOR CATEGORY FILTERING UTILITIES
 * 
 * Helpers to properly filter vendors by category using the unified category system.
 * Works with both normalized and legacy category formats.
 */

import { getCategoryFromLegacyName } from "@/lib/config/categories";

/**
 * Check if vendor matches a category filter
 */
export function vendorMatchesCategoryFilter(
  vendor: {
    category?: string;
    categories?: string[];
  },
  filterCategory: string
): boolean {
  // "All" always matches
  if (filterCategory === "all" || filterCategory === "All") {
    return true;
  }

  // Get all vendor categories
  const vendorCategories = [
    vendor.category,
    ...(vendor.categories || []),
  ].filter(Boolean) as string[];

  if (vendorCategories.length === 0) return false;

  // Normalize filter category
  const filterConfig = getCategoryFromLegacyName(filterCategory);
  const filterNormalized = filterConfig?.name || filterCategory;

  // Check each vendor category
  return vendorCategories.some(vendorCat => {
    // Direct match
    if (vendorCat === filterCategory || vendorCat === filterNormalized) {
      return true;
    }

    // Normalize vendor category and compare
    const vendorConfig = getCategoryFromLegacyName(vendorCat);
    if (vendorConfig && filterConfig) {
    // ✅ Fix: Compare names (since id matches name in your config)
    return vendorConfig.name === filterConfig.name;
    }

    // Fallback: case-insensitive partial match
    const vCat = vendorCat.toLowerCase().trim();
    const fCat = filterCategory.toLowerCase().trim();
    return vCat.includes(fCat) || fCat.includes(vCat);
  });
}

/**
 * Get unique categories from vendor list (normalized)
 */
export function getUniqueCategoriesFromVendors(
  vendors: Array<{
    category?: string;
    categories?: string[];
  }>
): string[] {
  const categorySet = new Set<string>();

  vendors.forEach(vendor => {
    const allCats = [vendor.category, ...(vendor.categories || [])].filter(Boolean);
    
    allCats.forEach(cat => {
      const config = getCategoryFromLegacyName(cat as string);
      if (config) {
        categorySet.add(config.name);
      } else {
        // Keep unmapped categories for backward compatibility
        categorySet.add(cat as string);
      }
    });
  });

  return Array.from(categorySet).sort();
}

/**
 * Get vendor's primary category (normalized)
 */
export function getVendorPrimaryCategory(vendor: {
  category?: string;
  categories?: string[];
}): string | null {
  const firstCat = vendor.category || vendor.categories?.[0];
  if (!firstCat) return null;

  const config = getCategoryFromLegacyName(firstCat);
  return config?.name || firstCat;
}