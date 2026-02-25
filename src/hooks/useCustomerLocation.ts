// src/hooks/useCustomerLocation.ts
// ============================================================================
// CUSTOMER GEOLOCATION HOOK — GPS position for distance calculations
//
// Behavior:
//   1. On mount, checks sessionStorage for cached coords (avoids re-prompting)
//   2. If no cache, requests geolocation (non-blocking)
//   3. Returns { coords, loading, denied } — consumers decide what to show
//   4. Uses low accuracy (cell tower is fine for "3.2 km away")
//   5. Caches in sessionStorage so nav between pages doesn't re-prompt
//
// ROLLBACK: Delete this file; remove imports from page.tsx consumers.
// ============================================================================

"use client";

import { useState, useEffect, useCallback } from "react";

export interface CustomerCoords {
  lat: number;
  lng: number;
}

interface UseCustomerLocationReturn {
  /** Customer's GPS coordinates, null if unavailable */
  coords: CustomerCoords | null;
  /** True while actively requesting geolocation */
  loading: boolean;
  /** True if user explicitly denied permission */
  denied: boolean;
  /** Manually trigger a re-request (e.g. "Enable location" button) */
  retry: () => void;
}

const CACHE_KEY = "sb_customer_coords";
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function getCachedCoords(): CustomerCoords | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { lat, lng, ts } = JSON.parse(raw);
    // Expire after TTL
    if (Date.now() - ts > CACHE_TTL_MS) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }
    if (typeof lat === "number" && typeof lng === "number") {
      return { lat, lng };
    }
  } catch {
    // Corrupted cache — ignore
  }
  return null;
}

function cacheCoords(coords: CustomerCoords): void {
  try {
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ ...coords, ts: Date.now() })
    );
  } catch {
    // sessionStorage full or unavailable — not critical
  }
}

export function useCustomerLocation(): UseCustomerLocationReturn {
  const [coords, setCoords] = useState<CustomerCoords | null>(null);
  const [loading, setLoading] = useState(false);
  const [denied, setDenied] = useState(false);

  const requestLocation = useCallback(() => {
    // Check cache first
    const cached = getCachedCoords();
    if (cached) {
      setCoords(cached);
      setDenied(false);
      return;
    }

    if (typeof window === "undefined" || !navigator.geolocation) {
      setDenied(true);
      return;
    }

    setLoading(true);
    setDenied(false);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const result: CustomerCoords = { lat: latitude, lng: longitude };
        setCoords(result);
        setLoading(false);
        cacheCoords(result);
      },
      (err) => {
        console.warn("[useCustomerLocation] Geolocation error:", err.message);
        setLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setDenied(true);
        }
      },
      {
        enableHighAccuracy: false, // Cell tower accuracy is fine for distance badges
        timeout: 8000,
        maximumAge: 300000, // Accept 5-min old cached position from browser
      }
    );
  }, []);

  // Auto-request on mount
  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  return { coords, loading, denied, retry: requestLocation };
}