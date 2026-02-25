// src/components/ui/DistanceBadge.tsx
// ============================================================================
// DISTANCE BADGE — Shows "📍 3.2 km" on vendor cards
//
// Usage:
//   <DistanceBadge customerCoords={coords} vendor={vendor} />
//   OR
//   <DistanceBadge customerCoords={coords} vendorCoords={vendor.coordinates} />
//
// Renders nothing when:
//   - Either coordinate is missing (no layout shift)
//   - Distance exceeds 50 km (vendor too far to be relevant)
//
// ROLLBACK: Delete this file; remove <DistanceBadge /> from card consumers.
// ============================================================================

"use client";

import { useMemo } from "react";
import { MapPin } from "lucide-react";
import {
  calculateDistanceCoords,
  formatDistance,
  extractVendorCoords,
  type Coordinates,
} from "@/lib/utils/distance";

interface DistanceBadgeProps {
  customerCoords: Coordinates | null;
  /** Pass the full vendor object — extracts coords from coordinates, location, vendorCoordinates, or lat/lng */
  vendor?: Record<string, any>;
  /** OR pass resolved coords directly */
  vendorCoords?: Coordinates | undefined | null;
  /** Optional className override */
  className?: string;
}

export function DistanceBadge({
  customerCoords,
  vendor,
  vendorCoords,
  className,
}: DistanceBadgeProps) {
  const label = useMemo(() => {
    if (!customerCoords) return null;

    // Resolve vendor coordinates: prefer explicit vendorCoords, fall back to extraction
    const resolved = vendorCoords ?? (vendor ? extractVendorCoords(vendor) : null);
    if (!resolved) return null;
    if (typeof resolved.lat !== "number" || typeof resolved.lng !== "number") return null;

    const km = calculateDistanceCoords(customerCoords, resolved);
    return formatDistance(km);
  }, [customerCoords, vendor, vendorCoords]);

  if (!label) return null;

  return (
    <span
      className={
        className ||
        "inline-flex items-center gap-1 text-xs text-[#55529d] font-medium"
      }
    >
      <MapPin className="w-3 h-3" />
      {label}
    </span>
  );
}