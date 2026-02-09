// src/hooks/useDriverLocationBroadcast.ts
'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase/config';

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
 * Hook that watches driver GPS and broadcasts to Firestore via
 * the `updateDriverLocation` Cloud Function at a throttled interval.
 *
 * The CF handles:
 * - Writing to `drivers/{uid}.currentLocation`
 * - Writing to `orders/{orderId}.driverLocation` (if driver has currentOrderId)
 * - Storing location history in `drivers/{uid}/locationHistory`
 */
export function useDriverLocationBroadcast({
  enabled,
  intervalMs = 12000,
  highAccuracy = true,
}: DriverLocationBroadcastOptions): BroadcastState {
  const [state, setState] = useState<BroadcastState>({
    location: null,
    heading: null,
    speed: null,
    isWatching: false,
    error: null,
    lastBroadcast: null,
  });

  const lastBroadcastRef = useRef<number>(0);
  const pendingRef = useRef<boolean>(false);
  const latestPositionRef = useRef<GeolocationPosition | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const broadcastTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const updateLocationFnRef = useRef(
    httpsCallable(getFunctions(app), 'updateDriverLocation')
  );

  // Broadcast current position to CF (throttled)
  const broadcastPosition = useCallback(async () => {
    const position = latestPositionRef.current;
    if (!position || pendingRef.current) return;

    const now = Date.now();
    if (now - lastBroadcastRef.current < intervalMs * 0.8) return;

    pendingRef.current = true;

    try {
      await updateLocationFnRef.current({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        heading: position.coords.heading ?? null,
        speed: position.coords.speed ?? null,
      });

      lastBroadcastRef.current = Date.now();
      setState((prev) => ({
        ...prev,
        lastBroadcast: Date.now(),
        error: null,
      }));
    } catch (err) {
      console.error('[LocationBroadcast] CF error:', err);
      setState((prev) => ({
        ...prev,
        error: 'Failed to broadcast location',
      }));
    } finally {
      pendingRef.current = false;
    }
  }, [intervalMs]);

  useEffect(() => {
    if (!enabled || !navigator.geolocation) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (broadcastTimerRef.current) {
        clearInterval(broadcastTimerRef.current);
        broadcastTimerRef.current = null;
      }
      setState((prev) => ({ ...prev, isWatching: false }));
      return;
    }

    // Start GPS watcher — updates local state on every GPS event
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        latestPositionRef.current = position;

        setState((prev) => ({
          ...prev,
          location: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          heading: position.coords.heading,
          speed: position.coords.speed,
          isWatching: true,
          error: null,
        }));
      },
      (err) => {
        console.error('[LocationBroadcast] GPS error:', err.message);
        setState((prev) => ({
          ...prev,
          error:
            err.code === 1
              ? 'Location permission denied'
              : err.code === 2
              ? 'Location unavailable'
              : 'Location timeout',
        }));
      },
      {
        enableHighAccuracy: highAccuracy,
        maximumAge: 10000,
        timeout: 15000,
      }
    );

    watchIdRef.current = watchId;
    setState((prev) => ({ ...prev, isWatching: true }));

    // Broadcast at regular intervals (not on every GPS tick)
    broadcastTimerRef.current = setInterval(() => {
      broadcastPosition();
    }, intervalMs);

    // Also broadcast once after a short delay for first position
    const initialTimeout = setTimeout(() => {
      broadcastPosition();
    }, 2000);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      watchIdRef.current = null;
      if (broadcastTimerRef.current) {
        clearInterval(broadcastTimerRef.current);
        broadcastTimerRef.current = null;
      }
      clearTimeout(initialTimeout);
      setState((prev) => ({ ...prev, isWatching: false }));
    };
  }, [enabled, intervalMs, highAccuracy, broadcastPosition]);

  return state;
}