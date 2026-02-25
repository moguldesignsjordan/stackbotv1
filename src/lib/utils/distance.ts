// src/lib/utils/distance.ts
// ============================================================================
// SHARED DISTANCE UTILITY — Haversine formula for customer ↔ vendor distance
//
// Used by: Home page, Category page, Store page, Driver dashboard
// Extracted from driver/dashboard inline calculateDistance to single source.
//
// ROLLBACK: Delete this file; revert consumers to inline calculations.
// ============================================================================

export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Haversine distance between two lat/lng points.
 * @returns distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Overload accepting Coordinates objects directly.
 */
export function calculateDistanceCoords(
  from: Coordinates,
  to: Coordinates
): number {
  return calculateDistance(from.lat, from.lng, to.lat, to.lng);
}

/**
 * Format distance for display on vendor cards.
 *
 * Rules:
 *  - < 1 km  → "0.8 km"  (one decimal)
 *  - 1–50 km → "3 km"    (rounded integer)
 *  - > 50 km → null       (vendor too far, hide badge)
 *  - NaN/invalid → null
 */
export function formatDistance(km: number): string | null {
  if (!Number.isFinite(km) || km < 0) return null;
  if (km > 50) return null;
  if (km < 1) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Extract vendor coordinates from a vendor document that may store
 * location data under different field names.
 *
 * Checks (in order):
 *   1. vendor.coordinates: { lat, lng }
 *   2. vendor.location: { lat, lng, location_address? }
 *   3. vendor.vendorCoordinates: { lat, lng }
 *   4. vendor.latitude / vendor.longitude (flat fields)
 *
 * Mirrors the extractVendorCoordinates() helper in the Stripe webhook.
 */
export function extractVendorCoords(vendor: Record<string, any>): Coordinates | null {
  if (!vendor) return null;

  const sources = [
    vendor.coordinates,
    vendor.location,
    vendor.vendorCoordinates,
  ];

  for (const source of sources) {
    if (
      source &&
      typeof source === "object" &&
      typeof source.lat === "number" &&
      typeof source.lng === "number" &&
      source.lat >= -90 &&
      source.lat <= 90 &&
      source.lng >= -180 &&
      source.lng <= 180
    ) {
      return { lat: source.lat, lng: source.lng };
    }
  }

  // Flat latitude/longitude fields
  if (
    typeof vendor.latitude === "number" &&
    typeof vendor.longitude === "number"
  ) {
    return { lat: vendor.latitude, lng: vendor.longitude };
  }

  return null;
}