// src/hooks/useNativePush.ts
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import {
  initPushNotifications,
  setNavigationCallback,
  removePushToken,
  checkPushStatus,
} from '@/lib/pushNotifications';

interface UseNativePushReturn {
  /** Whether running on native platform */
  isNative: boolean;
  /** Whether push is initialized */
  isInitialized: boolean;
  /** Whether permission is granted */
  isEnabled: boolean;
  /** Last received foreground notification */
  lastNotification: ForegroundNotification | null;
  /** Clear the last notification */
  clearNotification: () => void;
}

interface ForegroundNotification {
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
  receivedAt: Date;
}

/**
 * Hook to manage native push notifications
 * Automatically initializes after user login
 * 
 * Usage: Add to your root layout or _app
 * ```tsx
 * function RootLayout({ children }) {
 *   useNativePush(); // That's it!
 *   return <>{children}</>;
 * }
 * ```
 */
export function useNativePush(): UseNativePushReturn {
  const router = useRouter();
  const [isNative] = useState(() => Capacitor.isNativePlatform());
  const [isInitialized, setIsInitialized] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [lastNotification, setLastNotification] = useState<ForegroundNotification | null>(null);
  const initRef = useRef(false);

  // Set up navigation callback for notification taps
  useEffect(() => {
    if (!isNative) return;

    setNavigationCallback((url: string) => {
      console.log('[useNativePush] Navigating to:', url);
      router.push(url);
    });
  }, [isNative, router]);

  // Listen for foreground notifications
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handler = (event: CustomEvent<ForegroundNotification>) => {
      setLastNotification({
        ...event.detail,
        receivedAt: new Date(),
      });
    };

    window.addEventListener('stackbot:push', handler as EventListener);
    return () => {
      window.removeEventListener('stackbot:push', handler as EventListener);
    };
  }, []);

  // Initialize push after auth
  useEffect(() => {
    if (!isNative) return;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User logged in - initialize push
        if (!initRef.current) {
          initRef.current = true;
          
          const success = await initPushNotifications();
          setIsInitialized(success);
          
          // Check permission status
          const status = await checkPushStatus();
          setIsEnabled(status.enabled);
        }
      } else {
        // User logged out - cleanup
        if (initRef.current) {
          await removePushToken();
          initRef.current = false;
          setIsInitialized(false);
          setIsEnabled(false);
        }
      }
    });

    return () => unsubscribe();
  }, [isNative]);

  const clearNotification = () => setLastNotification(null);

  return {
    isNative,
    isInitialized,
    isEnabled,
    lastNotification,
    clearNotification,
  };
}