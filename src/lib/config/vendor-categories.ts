// src/lib/config/vendor-categories.ts

/**
 * Vendor Category Configuration
 * 
 * This file defines all vendor categories and their feature requirements.
 * Categories determine which fields/features are available to vendors.
 */

/* ======================================================
   CATEGORY TYPES
====================================================== */

export type VendorCategoryType = 
  | "restaurants"
  | "groceries"
  | "beauty_wellness"
  | "taxi_transport"
  | "tours_activities"
  | "professional_services"
  | "home_repair"
  | "electronics"
  | "cleaning_services"
  | "retail_shops";

export interface CategoryFeatures {
  // Location & Delivery
  requiresPickupLocation: boolean;      // Physical pickup point (restaurants, retail)
  requiresServiceArea: boolean;         // Service coverage area (taxi, cleaning)
  supportsDelivery: boolean;            // Can deliver products
  supportsPickup: boolean;              // Customer can pick up
  supportsOnSite: boolean;              // Service at customer location
  
  // Ordering & Scheduling
  requiresBusinessHours: boolean;       // Operating hours matter
  supportsAppointments: boolean;        // Book time slots
  supportsInstantOrder: boolean;        // Order now, get now/soon
  supportsScheduledOrder: boolean;      // Order for later
  
  // Products & Services
  hasPhysicalProducts: boolean;         // Sells tangible items
  hasServices: boolean;                 // Offers services
  requiresMenuCategories: boolean;      // Needs menu-style organization
  supportsVariants: boolean;            // Size, color, etc.
  requiresInventory: boolean;           // Track stock levels
  
  // Pricing
  supportsDeliveryFee: boolean;         // Charge for delivery
  supportsMinimumOrder: boolean;        // Minimum order amount
  supportsServiceFee: boolean;          // Additional service charges
  supportsTipping: boolean;             // Allow tips
  supportsQuotes: boolean;              // Request quote (no fixed price)
  
  // Communication
  requiresContactNumber: boolean;       // Must have phone
  supportsChat: boolean;                // In-app messaging
  supportsCallButton: boolean;          // Direct call CTA
}

export interface CategoryConfig {
  id: VendorCategoryType;
  name: string;
  displayName: string;
  icon: string;                         // Lucide icon name
  description: string;
  color: string;                        // Brand color for category
  features: CategoryFeatures;
  defaultFields: string[];              // Fields shown by default in forms
  requiredFields: string[];             // Mandatory fields
}

/* ======================================================
   CATEGORY DEFINITIONS
====================================================== */

export const VENDOR_CATEGORIES: Record<VendorCategoryType, CategoryConfig> = {
  restaurants: {
    id: "restaurants",
    name: "Restaurants",
    displayName: "Restaurant & Food",
    icon: "UtensilsCrossed",
    description: "Restaurants, cafes, bakeries, and food vendors",
    color: "#ef4444", // red
    features: {
      requiresPickupLocation: true,
      requiresServiceArea: false,
      supportsDelivery: true,
      supportsPickup: true,
      supportsOnSite: false,
      requiresBusinessHours: true,
      supportsAppointments: false,
      supportsInstantOrder: true,
      supportsScheduledOrder: true,
      hasPhysicalProducts: true,
      hasServices: false,
      requiresMenuCategories: true,
      supportsVariants: true,
      requiresInventory: false,
      supportsDeliveryFee: true,
      supportsMinimumOrder: true,
      supportsServiceFee: true,
      supportsTipping: true,
      supportsQuotes: false,
      requiresContactNumber: true,
      supportsChat: true,
      supportsCallButton: true,
    },
    defaultFields: [
      "name", "description", "address", "phone", "email", 
      "hours", "pickup_location", "delivery_fee", "min_order",
      "logo", "cover_image", "menu_categories"
    ],
    requiredFields: ["name", "address", "phone", "pickup_location"],
  },

  groceries: {
    id: "groceries",
    name: "Groceries",
    displayName: "Grocery & Supermarket",
    icon: "ShoppingBasket",
    description: "Supermarkets, convenience stores, and grocery shops",
    color: "#22c55e", // green
    features: {
      requiresPickupLocation: true,
      requiresServiceArea: false,
      supportsDelivery: true,
      supportsPickup: true,
      supportsOnSite: false,
      requiresBusinessHours: true,
      supportsAppointments: false,
      supportsInstantOrder: true,
      supportsScheduledOrder: true,
      hasPhysicalProducts: true,
      hasServices: false,
      requiresMenuCategories: true,
      supportsVariants: true,
      requiresInventory: true,
      supportsDeliveryFee: true,
      supportsMinimumOrder: true,
      supportsServiceFee: false,
      supportsTipping: false,
      supportsQuotes: false,
      requiresContactNumber: true,
      supportsChat: false,
      supportsCallButton: true,
    },
    defaultFields: [
      "name", "description", "address", "phone", "email",
      "hours", "pickup_location", "delivery_fee", "min_order",
      "logo", "cover_image"
    ],
    requiredFields: ["name", "address", "phone", "pickup_location"],
  },

  beauty_wellness: {
    id: "beauty_wellness",
    name: "Beauty & Wellness",
    displayName: "Beauty & Wellness",
    icon: "Sparkles",
    description: "Salons, spas, barbershops, and wellness centers",
    color: "#ec4899", // pink
    features: {
      requiresPickupLocation: true,
      requiresServiceArea: false,
      supportsDelivery: false,
      supportsPickup: false,
      supportsOnSite: true,
      requiresBusinessHours: true,
      supportsAppointments: true,
      supportsInstantOrder: false,
      supportsScheduledOrder: true,
      hasPhysicalProducts: false,
      hasServices: true,
      requiresMenuCategories: true,
      supportsVariants: false,
      requiresInventory: false,
      supportsDeliveryFee: false,
      supportsMinimumOrder: false,
      supportsServiceFee: false,
      supportsTipping: true,
      supportsQuotes: false,
      requiresContactNumber: true,
      supportsChat: true,
      supportsCallButton: true,
    },
    defaultFields: [
      "name", "description", "address", "phone", "email",
      "hours", "pickup_location", "logo", "cover_image", "services"
    ],
    requiredFields: ["name", "address", "phone", "pickup_location"],
  },

  taxi_transport: {
    id: "taxi_transport",
    name: "Taxi & Transport",
    displayName: "Taxi & Transportation",
    icon: "Car",
    description: "Taxi services, car rentals, and transportation",
    color: "#f59e0b", // amber
    features: {
      requiresPickupLocation: false,
      requiresServiceArea: true,
      supportsDelivery: false,
      supportsPickup: false,
      supportsOnSite: true,
      requiresBusinessHours: true,
      supportsAppointments: true,
      supportsInstantOrder: true,
      supportsScheduledOrder: true,
      hasPhysicalProducts: false,
      hasServices: true,
      requiresMenuCategories: false,
      supportsVariants: false,
      requiresInventory: false,
      supportsDeliveryFee: false,
      supportsMinimumOrder: false,
      supportsServiceFee: true,
      supportsTipping: true,
      supportsQuotes: true,
      requiresContactNumber: true,
      supportsChat: true,
      supportsCallButton: true,
    },
    defaultFields: [
      "name", "description", "phone", "email",
      "hours", "service_area", "logo"
    ],
    requiredFields: ["name", "phone"],
  },

  tours_activities: {
    id: "tours_activities",
    name: "Tours & Activities",
    displayName: "Tours & Activities",
    icon: "Compass",
    description: "Tour operators, activity providers, and experiences",
    color: "#06b6d4", // cyan
    features: {
      requiresPickupLocation: true,
      requiresServiceArea: false,
      supportsDelivery: false,
      supportsPickup: true,
      supportsOnSite: true,
      requiresBusinessHours: true,
      supportsAppointments: true,
      supportsInstantOrder: false,
      supportsScheduledOrder: true,
      hasPhysicalProducts: false,
      hasServices: true,
      requiresMenuCategories: true,
      supportsVariants: true,
      requiresInventory: true,
      supportsDeliveryFee: false,
      supportsMinimumOrder: false,
      supportsServiceFee: false,
      supportsTipping: true,
      supportsQuotes: false,
      requiresContactNumber: true,
      supportsChat: true,
      supportsCallButton: true,
    },
    defaultFields: [
      "name", "description", "address", "phone", "email",
      "hours", "pickup_location", "logo", "cover_image"
    ],
    requiredFields: ["name", "phone", "pickup_location"],
  },

  professional_services: {
    id: "professional_services",
    name: "Professional Services",
    displayName: "Professional Services",
    icon: "Briefcase",
    description: "Lawyers, accountants, consultants, and professionals",
    color: "#6366f1", // indigo
    features: {
      requiresPickupLocation: false,
      requiresServiceArea: true,
      supportsDelivery: false,
      supportsPickup: false,
      supportsOnSite: true,
      requiresBusinessHours: true,
      supportsAppointments: true,
      supportsInstantOrder: false,
      supportsScheduledOrder: true,
      hasPhysicalProducts: false,
      hasServices: true,
      requiresMenuCategories: true,
      supportsVariants: false,
      requiresInventory: false,
      supportsDeliveryFee: false,
      supportsMinimumOrder: false,
      supportsServiceFee: true,
      supportsTipping: false,
      supportsQuotes: true,
      requiresContactNumber: true,
      supportsChat: true,
      supportsCallButton: true,
    },
    defaultFields: [
      "name", "description", "phone", "email", "website",
      "hours", "service_area", "logo"
    ],
    requiredFields: ["name", "phone", "email"],
  },

  home_repair: {
    id: "home_repair",
    name: "Home Repair & Maintenance",
    displayName: "Home Services",
    icon: "Wrench",
    description: "Plumbers, electricians, handymen, and contractors",
    color: "#78716c", // stone
    features: {
      requiresPickupLocation: false,
      requiresServiceArea: true,
      supportsDelivery: false,
      supportsPickup: false,
      supportsOnSite: true,
      requiresBusinessHours: true,
      supportsAppointments: true,
      supportsInstantOrder: true,
      supportsScheduledOrder: true,
      hasPhysicalProducts: false,
      hasServices: true,
      requiresMenuCategories: true,
      supportsVariants: false,
      requiresInventory: false,
      supportsDeliveryFee: false,
      supportsMinimumOrder: false,
      supportsServiceFee: true,
      supportsTipping: true,
      supportsQuotes: true,
      requiresContactNumber: true,
      supportsChat: true,
      supportsCallButton: true,
    },
    defaultFields: [
      "name", "description", "phone", "email",
      "hours", "service_area", "logo"
    ],
    requiredFields: ["name", "phone"],
  },

  electronics: {
    id: "electronics",
    name: "Electronics & Gadgets",
    displayName: "Electronics",
    icon: "Smartphone",
    description: "Electronics stores, phone shops, and tech retailers",
    color: "#3b82f6", // blue
    features: {
      requiresPickupLocation: true,
      requiresServiceArea: false,
      supportsDelivery: true,
      supportsPickup: true,
      supportsOnSite: false,
      requiresBusinessHours: true,
      supportsAppointments: false,
      supportsInstantOrder: true,
      supportsScheduledOrder: false,
      hasPhysicalProducts: true,
      hasServices: false,
      requiresMenuCategories: true,
      supportsVariants: true,
      requiresInventory: true,
      supportsDeliveryFee: true,
      supportsMinimumOrder: false,
      supportsServiceFee: false,
      supportsTipping: false,
      supportsQuotes: false,
      requiresContactNumber: true,
      supportsChat: true,
      supportsCallButton: true,
    },
    defaultFields: [
      "name", "description", "address", "phone", "email",
      "hours", "pickup_location", "delivery_fee", "logo", "cover_image"
    ],
    requiredFields: ["name", "address", "phone", "pickup_location"],
  },

  cleaning_services: {
    id: "cleaning_services",
    name: "Cleaning Services",
    displayName: "Cleaning Services",
    icon: "SprayCan",
    description: "House cleaning, laundry, and maintenance services",
    color: "#14b8a6", // teal
    features: {
      requiresPickupLocation: false,
      requiresServiceArea: true,
      supportsDelivery: false,
      supportsPickup: false,
      supportsOnSite: true,
      requiresBusinessHours: true,
      supportsAppointments: true,
      supportsInstantOrder: false,
      supportsScheduledOrder: true,
      hasPhysicalProducts: false,
      hasServices: true,
      requiresMenuCategories: true,
      supportsVariants: false,
      requiresInventory: false,
      supportsDeliveryFee: false,
      supportsMinimumOrder: false,
      supportsServiceFee: true,
      supportsTipping: true,
      supportsQuotes: true,
      requiresContactNumber: true,
      supportsChat: true,
      supportsCallButton: true,
    },
    defaultFields: [
      "name", "description", "phone", "email",
      "hours", "service_area", "logo"
    ],
    requiredFields: ["name", "phone"],
  },

  retail_shops: {
    id: "retail_shops",
    name: "Retail Shops",
    displayName: "Retail & Shopping",
    icon: "Store",
    description: "Clothing, furniture, gifts, and general retail",
    color: "#a855f7", // purple
    features: {
      requiresPickupLocation: true,
      requiresServiceArea: false,
      supportsDelivery: true,
      supportsPickup: true,
      supportsOnSite: false,
      requiresBusinessHours: true,
      supportsAppointments: false,
      supportsInstantOrder: true,
      supportsScheduledOrder: false,
      hasPhysicalProducts: true,
      hasServices: false,
      requiresMenuCategories: true,
      supportsVariants: true,
      requiresInventory: true,
      supportsDeliveryFee: true,
      supportsMinimumOrder: true,
      supportsServiceFee: false,
      supportsTipping: false,
      supportsQuotes: false,
      requiresContactNumber: true,
      supportsChat: true,
      supportsCallButton: true,
    },
    defaultFields: [
      "name", "description", "address", "phone", "email",
      "hours", "pickup_location", "delivery_fee", "min_order",
      "logo", "cover_image"
    ],
    requiredFields: ["name", "address", "phone", "pickup_location"],
  },
};

/* ======================================================
   HELPER FUNCTIONS
====================================================== */

/**
 * Get category config by ID
 */
export function getCategoryConfig(categoryId: string): CategoryConfig | null {
  const normalized = categoryId.toLowerCase().replace(/[\s&]+/g, "_") as VendorCategoryType;
  return VENDOR_CATEGORIES[normalized] || null;
}

/**
 * Get category config from legacy category name
 * Maps old category names to new config
 */
export function getCategoryFromLegacyName(legacyName: string): CategoryConfig | null {
  const mapping: Record<string, VendorCategoryType> = {
    "restaurants": "restaurants",
    "restaurant": "restaurants",
    "food": "restaurants",
    "groceries": "groceries",
    "grocery": "groceries",
    "supermarket": "groceries",
    "beauty & wellness": "beauty_wellness",
    "beauty": "beauty_wellness",
    "wellness": "beauty_wellness",
    "salon": "beauty_wellness",
    "spa": "beauty_wellness",
    "taxi & transport": "taxi_transport",
    "taxi": "taxi_transport",
    "transport": "taxi_transport",
    "transportation": "taxi_transport",
    "tours & activities": "tours_activities",
    "tours": "tours_activities",
    "activities": "tours_activities",
    "professional services": "professional_services",
    "professional": "professional_services",
    "services": "professional_services",
    "home repair & maintenance": "home_repair",
    "home repair": "home_repair",
    "maintenance": "home_repair",
    "electronics & gadgets": "electronics",
    "electronics": "electronics",
    "gadgets": "electronics",
    "cleaning services": "cleaning_services",
    "cleaning": "cleaning_services",
    "retail shops": "retail_shops",
    "retail": "retail_shops",
    "shopping": "retail_shops",
  };

  const key = legacyName.toLowerCase().trim();
  const categoryId = mapping[key];
  
  return categoryId ? VENDOR_CATEGORIES[categoryId] : null;
}

/**
 * Get primary category from vendor's categories array
 */
export function getPrimaryCategory(categories: string[]): CategoryConfig | null {
  if (!categories || categories.length === 0) return null;
  
  // Try first category
  const config = getCategoryFromLegacyName(categories[0]);
  if (config) return config;

  // Try other categories
  for (const cat of categories) {
    const cfg = getCategoryFromLegacyName(cat);
    if (cfg) return cfg;
  }

  return null;
}

/**
 * Check if vendor category requires pickup location
 */
export function requiresPickupLocation(categories: string[]): boolean {
  const config = getPrimaryCategory(categories);
  return config?.features.requiresPickupLocation ?? true; // Default to true
}

/**
 * Check if vendor category requires service area
 */
export function requiresServiceArea(categories: string[]): boolean {
  const config = getPrimaryCategory(categories);
  return config?.features.requiresServiceArea ?? false;
}

/**
 * Check if vendor category supports delivery
 */
export function supportsDelivery(categories: string[]): boolean {
  const config = getPrimaryCategory(categories);
  return config?.features.supportsDelivery ?? true;
}

/**
 * Get all categories that require pickup locations (for filtering)
 */
export function getCategoriesWithPickup(): VendorCategoryType[] {
  return Object.values(VENDOR_CATEGORIES)
    .filter(c => c.features.requiresPickupLocation)
    .map(c => c.id);
}

/**
 * Get all categories that are service-based (for filtering)
 */
export function getServiceCategories(): VendorCategoryType[] {
  return Object.values(VENDOR_CATEGORIES)
    .filter(c => c.features.hasServices && !c.features.hasPhysicalProducts)
    .map(c => c.id);
}

/**
 * Get all categories that are product-based (for filtering)
 */
export function getProductCategories(): VendorCategoryType[] {
  return Object.values(VENDOR_CATEGORIES)
    .filter(c => c.features.hasPhysicalProducts)
    .map(c => c.id);
}

/**
 * Get list of all categories for dropdown
 */
export function getAllCategoryOptions(): Array<{ value: string; label: string; icon: string }> {
  return Object.values(VENDOR_CATEGORIES).map(c => ({
    value: c.name,  // Keep using display name for backward compatibility
    label: c.displayName,
    icon: c.icon,
  }));
}

/**
 * Convert category array to normalized category IDs
 */
export function normalizeCategoryIds(categories: string[]): VendorCategoryType[] {
  return categories
    .map(cat => getCategoryFromLegacyName(cat)?.id)
    .filter((id): id is VendorCategoryType => id !== undefined);
}