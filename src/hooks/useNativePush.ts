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
  isNative: boolean;
  isInitialized: boolean;
  isEnabled: boolean;
}

export function useNativePush(): UseNativePushReturn {
  const router = useRouter();
  const [isNative] = useState(() => Capacitor.isNativePlatform());
  const [isInitialized, setIsInitialized] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const initRef = useRef(false);

  // Set up navigation callback for notification taps
  useEffect(() => {
    if (!isNative) return;

    setNavigationCallback((url: string) => {
      console.log('[useNativePush] Navigating to:', url);
      router.push(url);
    });
  }, [isNative, router]);

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

  return {
    isNative,
    isInitialized,
    isEnabled,
  };
}
