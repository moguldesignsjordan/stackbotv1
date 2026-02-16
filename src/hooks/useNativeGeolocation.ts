// src/hooks/useNativeGeolocation.ts
// ═══════════════════════════════════════════════════════════════════════════════
// Unified geolocation hook for Capacitor (native) + Web
//
// WHY: navigator.geolocation in iOS WebViews is unreliable — CoreLocation
//      reports kCLErrorLocationUnknown, positions time out, and watchPosition
//      fires inconsistently. @capacitor/geolocation bypasses the WebView and
//      talks directly to CoreLocation (iOS) / FusedLocationProvider (Android).
//
// USAGE:
//   const { location, error, status, retry } = useNativeGeolocation({
//     watch: true,            // continuous updates (default: false = one-shot)
//     enableHighAccuracy: true,
//     timeoutMs: 15000,
//     maximumAgeMs: 10000,
//   });
//
// ROLLBACK: Replace with navigator.geolocation calls (revert to old hooks)
// ═══════════════════════════════════════════════════════════════════════════════
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface GeoCoords {
  lat: number;
  lng: number;
}

export type GeoStatus =
  | 'idle'
  | 'loading'
  | 'granted'
  | 'denied'
  | 'unavailable'
  | 'unsupported';

interface UseNativeGeolocationOptions {
  /** If true, starts a continuous watcher. Default: false (one-shot). */
  watch?: boolean;
  /** High accuracy GPS. Default: true */
  enableHighAccuracy?: boolean;
  /** Timeout per position request in ms. Default: 15000 */
  timeoutMs?: number;
  /** Accept cached position up to this age in ms. Default: 10000 */
  maximumAgeMs?: number;
  /** Auto-start on mount. Default: true */
  autoStart?: boolean;
}

interface UseNativeGeolocationResult {
  location: GeoCoords | null;
  heading: number | null;
  speed: number | null;
  status: GeoStatus;
  error: string | null;
  /** Manually (re)start location acquisition */
  retry: () => void;
  /** Stop watching */
  stop: () => void;
}

// ─── Helpers: dynamic import so @capacitor/geolocation is not required at build
//     time on pure-web deploys ─────────────────────────────────────────────────
let CapGeolocation: typeof import('@capacitor/geolocation').Geolocation | null = null;

async function getCapGeolocation() {
  if (CapGeolocation) return CapGeolocation;
  try {
    const mod = await import('@capacitor/geolocation');
    CapGeolocation = mod.Geolocation;
    return CapGeolocation;
  } catch {
    return null;
  }
}

function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useNativeGeolocation(
  options: UseNativeGeolocationOptions = {}
): UseNativeGeolocationResult {
  const {
    watch = false,
    enableHighAccuracy = true,
    timeoutMs = 15000,
    maximumAgeMs = 10000,
    autoStart = true,
  } = options;

  const [location, setLocation] = useState<GeoCoords | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [speed, setSpeed] = useState<number | null>(null);
  const [status, setStatus] = useState<GeoStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  // Refs for cleanup
  const watchIdNativeRef = useRef<string | null>(null);
  const watchIdWebRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Successful position handler ───────────────────────────────
  const onPosition = useCallback(
    (lat: number, lng: number, hdg?: number | null, spd?: number | null) => {
      if (!mountedRef.current) return;
      setLocation({ lat, lng });
      setHeading(hdg ?? null);
      setSpeed(spd ?? null);
      setStatus('granted');
      setError(null);
      retryCountRef.current = 0; // reset retry count on success
    },
    []
  );

  // ── Error handler ─────────────────────────────────────────────
  const onError = useCallback(
    (code: number, message: string) => {
      if (!mountedRef.current) return;

      if (code === 1) {
        // PERMISSION_DENIED
        setStatus('denied');
        setError('Location permission denied. Please enable in Settings.');
      } else if (code === 2) {
        // POSITION_UNAVAILABLE — retry with reduced accuracy
        setStatus('unavailable');
        setError('Location temporarily unavailable');

        // Auto-retry up to 3 times with backoff
        if (retryCountRef.current < 3) {
          retryCountRef.current++;
          const delay = retryCountRef.current * 3000; // 3s, 6s, 9s
          console.log(
            `[Geolocation] Unavailable, retrying in ${delay / 1000}s (attempt ${retryCountRef.current}/3)`
          );
          retryTimerRef.current = setTimeout(() => {
            if (mountedRef.current) startLocation(false); // retry with low accuracy
          }, delay);
        }
      } else {
        // TIMEOUT or other
        setStatus('unavailable');
        setError('Location request timed out');

        // Also retry timeouts
        if (retryCountRef.current < 3) {
          retryCountRef.current++;
          const delay = retryCountRef.current * 2000;
          retryTimerRef.current = setTimeout(() => {
            if (mountedRef.current) startLocation(false);
          }, delay);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // ── Cleanup watchers ──────────────────────────────────────────
  const stopWatching = useCallback(async () => {
    // Clear retry timer
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    // Native watcher
    if (watchIdNativeRef.current) {
      try {
        const Geo = await getCapGeolocation();
        if (Geo) {
          await Geo.clearWatch({ id: watchIdNativeRef.current });
        }
      } catch {
        // ignore cleanup errors
      }
      watchIdNativeRef.current = null;
    }

    // Web watcher
    if (watchIdWebRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdWebRef.current);
      watchIdWebRef.current = null;
    }
  }, []);

  // ── Start location (native or web) ────────────────────────────
  const startLocation = useCallback(
    async (highAccuracy: boolean = enableHighAccuracy) => {
      await stopWatching();

      if (!mountedRef.current) return;
      setStatus('loading');

      // ── NATIVE PATH (Capacitor iOS / Android) ─────────────────
      if (isNative()) {
        const Geo = await getCapGeolocation();
        if (!Geo) {
          setStatus('unsupported');
          setError('Geolocation plugin not available');
          return;
        }

        // Check / request permissions
        try {
          let perms = await Geo.checkPermissions();
          if (perms.location === 'prompt' || perms.location === 'prompt-with-rationale') {
            perms = await Geo.requestPermissions();
          }
          if (perms.location === 'denied') {
            setStatus('denied');
            setError('Location permission denied. Please enable in Settings.');
            return;
          }
        } catch (permErr) {
          console.warn('[Geolocation] Permission check failed:', permErr);
          // Continue anyway — getCurrentPosition will trigger prompt
        }

        if (watch) {
          // Continuous watching
          try {
            const id = await Geo.watchPosition(
              { enableHighAccuracy: highAccuracy, timeout: timeoutMs, maximumAge: maximumAgeMs },
              (position, err) => {
                if (err) {
                  console.warn('[Geolocation Native] Watch error:', err.message);
                  onError(2, err.message || 'Position unavailable');
                  return;
                }
                if (position) {
                  onPosition(
                    position.coords.latitude,
                    position.coords.longitude,
                    position.coords.heading,
                    position.coords.speed
                  );
                }
              }
            );
            watchIdNativeRef.current = id;
          } catch (watchErr: any) {
            console.error('[Geolocation Native] watchPosition failed:', watchErr);
            onError(2, watchErr?.message || 'Watch failed');
          }
        } else {
          // One-shot
          try {
            const position = await Geo.getCurrentPosition({
              enableHighAccuracy: highAccuracy,
              timeout: timeoutMs,
              maximumAge: maximumAgeMs,
            });
            onPosition(
              position.coords.latitude,
              position.coords.longitude,
              position.coords.heading,
              position.coords.speed
            );
          } catch (posErr: any) {
            console.warn('[Geolocation Native] getCurrentPosition failed:', posErr);
            // If high accuracy failed, try low accuracy as fallback
            if (highAccuracy) {
              console.log('[Geolocation Native] Retrying with low accuracy...');
              try {
                const fallback = await Geo.getCurrentPosition({
                  enableHighAccuracy: false,
                  timeout: timeoutMs + 5000,
                  maximumAge: 60000, // accept older cached position
                });
                onPosition(
                  fallback.coords.latitude,
                  fallback.coords.longitude,
                  fallback.coords.heading,
                  fallback.coords.speed
                );
              } catch (fallbackErr: any) {
                onError(2, fallbackErr?.message || 'Position unavailable');
              }
            } else {
              onError(2, posErr?.message || 'Position unavailable');
            }
          }
        }
        return;
      }

      // ── WEB PATH (browser / PWA) ─────────────────────────────
      if (!navigator.geolocation) {
        setStatus('unsupported');
        setError('Geolocation is not supported by your browser');
        return;
      }

      const webOptions: PositionOptions = {
        enableHighAccuracy: highAccuracy,
        timeout: timeoutMs,
        maximumAge: maximumAgeMs,
      };

      if (watch) {
        const id = navigator.geolocation.watchPosition(
          (position) => {
            onPosition(
              position.coords.latitude,
              position.coords.longitude,
              position.coords.heading,
              position.coords.speed
            );
          },
          (err) => {
            console.warn('[Geolocation Web] Watch error:', err.code, err.message);
            onError(err.code, err.message);
          },
          webOptions
        );
        watchIdWebRef.current = id;
      } else {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            onPosition(
              position.coords.latitude,
              position.coords.longitude,
              position.coords.heading,
              position.coords.speed
            );
          },
          (err) => {
            console.warn('[Geolocation Web] getCurrentPosition error:', err.code, err.message);
            // Fallback: try low accuracy
            if (highAccuracy) {
              console.log('[Geolocation Web] Retrying with low accuracy...');
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  onPosition(
                    pos.coords.latitude,
                    pos.coords.longitude,
                    pos.coords.heading,
                    pos.coords.speed
                  );
                },
                (fallbackErr) => {
                  onError(fallbackErr.code, fallbackErr.message);
                },
                { enableHighAccuracy: false, timeout: timeoutMs + 5000, maximumAge: 60000 }
              );
            } else {
              onError(err.code, err.message);
            }
          },
          webOptions
        );
      }
    },
    [enableHighAccuracy, timeoutMs, maximumAgeMs, watch, stopWatching, onPosition, onError]
  );

  // ── Public retry (resets counter) ─────────────────────────────
  const retry = useCallback(() => {
    retryCountRef.current = 0;
    startLocation(enableHighAccuracy);
  }, [startLocation, enableHighAccuracy]);

  // ── Auto-start on mount ───────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;

    if (autoStart) {
      startLocation(enableHighAccuracy);
    }

    return () => {
      mountedRef.current = false;
      stopWatching();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  return {
    location,
    heading,
    speed,
    status,
    error,
    retry,
    stop: stopWatching,
  };
}