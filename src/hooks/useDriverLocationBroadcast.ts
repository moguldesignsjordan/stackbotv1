// src/hooks/useDriverLocationBroadcast.ts
// ═══════════════════════════════════════════════════════════════════════════════
// UPDATED: Uses @capacitor/geolocation via useNativeGeolocation for reliable
//          GPS on iOS native. Falls back to web API automatically.
//
// ROLLBACK: Revert to previous version using navigator.geolocation directly
// ═══════════════════════════════════════════════════════════════════════════════
'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase/config';
import { useNativeGeolocation, type GeoCoords } from '@/hooks/useNativeGeolocation';

interface DriverLocationBroadcastOptions {
  /** Whether broadcasting is enabled (e.g., driver has an active delivery) */
  enabled: boolean;
  /** Throttle interval in ms — default 12000 (12s) */
  intervalMs?: number;
  /** High accuracy GPS — default true */
  highAccuracy?: boolean;
}

interface BroadcastState {
  /** Current driver coordinates */
  location: { lat: number; lng: number } | null;
  /** Last heading from GPS (degrees, 0=north) */
  heading: number | null;
  /** Last speed from GPS (m/s) */
  speed: number | null;
  /** Whether the GPS watcher is active */
  isWatching: boolean;
  /** Last error message */
  error: string | null;
  /** Timestamp of last successful broadcast */
  lastBroadcast: number | null;
}

/**
 * Hook that watches driver GPS (via native Capacitor plugin on iOS/Android)
 * and broadcasts to Firestore via the `updateDriverLocation` Cloud Function
 * at a throttled interval.
 */
export function useDriverLocationBroadcast({
  enabled,
  intervalMs = 12000,
  highAccuracy = true,
}: DriverLocationBroadcastOptions): BroadcastState {
  // ── Native geolocation (handles iOS CoreLocation properly) ────
  const {
    location: geoLocation,
    heading: geoHeading,
    speed: geoSpeed,
    status: geoStatus,
    error: geoError,
  } = useNativeGeolocation({
    watch: true,
    enableHighAccuracy: highAccuracy,
    timeoutMs: 15000,
    maximumAgeMs: 10000,
    autoStart: enabled,
  });

  // ── Broadcast state ───────────────────────────────────────────
  const [broadcastError, setBroadcastError] = useState<string | null>(null);
  const [lastBroadcast, setLastBroadcast] = useState<number | null>(null);
  const lastBroadcastRef = useRef<number>(0);
  const pendingRef = useRef<boolean>(false);
  const broadcastTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestLocationRef = useRef<GeoCoords | null>(null);
  const latestHeadingRef = useRef<number | null>(null);
  const latestSpeedRef = useRef<number | null>(null);

  const updateLocationFnRef = useRef(
    httpsCallable(getFunctions(app), 'updateDriverLocation')
  );

  // Keep refs in sync with latest geo data
  useEffect(() => {
    latestLocationRef.current = geoLocation;
    latestHeadingRef.current = geoHeading;
    latestSpeedRef.current = geoSpeed;
  }, [geoLocation, geoHeading, geoSpeed]);

  // ── Broadcast function ────────────────────────────────────────
  const broadcastPosition = useCallback(async () => {
    const loc = latestLocationRef.current;
    if (!loc || pendingRef.current) return;

    const now = Date.now();
    if (now - lastBroadcastRef.current < intervalMs * 0.8) return;

    pendingRef.current = true;

    try {
      await updateLocationFnRef.current({
        latitude: loc.lat,
        longitude: loc.lng,
        heading: latestHeadingRef.current,
        speed: latestSpeedRef.current,
      });

      lastBroadcastRef.current = Date.now();
      setLastBroadcast(Date.now());
      setBroadcastError(null);
    } catch (err) {
      console.error('[LocationBroadcast] CF error:', err);
      setBroadcastError('Failed to broadcast location');
    } finally {
      pendingRef.current = false;
    }
  }, [intervalMs]);

  // ── Start/stop broadcast timer based on enabled ───────────────
  useEffect(() => {
    if (!enabled) {
      if (broadcastTimerRef.current) {
        clearInterval(broadcastTimerRef.current);
        broadcastTimerRef.current = null;
      }
      return;
    }

    // Broadcast at regular intervals
    broadcastTimerRef.current = setInterval(() => {
      broadcastPosition();
    }, intervalMs);

    // Initial broadcast after short delay
    const initialTimeout = setTimeout(() => {
      broadcastPosition();
    }, 2000);

    return () => {
      if (broadcastTimerRef.current) {
        clearInterval(broadcastTimerRef.current);
        broadcastTimerRef.current = null;
      }
      clearTimeout(initialTimeout);
    };
  }, [enabled, intervalMs, broadcastPosition]);

  return {
    location: geoLocation,
    heading: geoHeading,
    speed: geoSpeed,
    isWatching: geoStatus === 'granted' || geoStatus === 'loading',
    error: geoError || broadcastError,
    lastBroadcast,
  };
}