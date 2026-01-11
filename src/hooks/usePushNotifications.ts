// src/hooks/usePushNotifications.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase/config';
import { doc, setDoc, deleteDoc, getDoc, serverTimestamp } from 'firebase/firestore';

type PermissionState = 'default' | 'granted' | 'denied';

interface UsePushNotificationsReturn {
  /** Whether browser supports push notifications */
  isSupported: boolean;
  /** Current permission state */
  permission: PermissionState;
  /** Whether push notifications are enabled for this user */
  isEnabled: boolean;
  /** Loading state during operations */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Enable push notifications */
  enable: () => Promise<boolean>;
  /** Disable push notifications */
  disable: () => Promise<void>;
  /** Request permission only (without enabling) */
  requestPermission: () => Promise<PermissionState>;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<PermissionState>('default');
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check browser support
  useEffect(() => {
    const supported = 
      typeof window !== 'undefined' && 
      'Notification' in window && 
      'serviceWorker' in navigator;
    
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission as PermissionState);
    }
  }, []);

  // Check if user has push enabled in Firestore
  useEffect(() => {
    const checkEnabled = async () => {
      if (!user?.uid) {
        setIsEnabled(false);
        return;
      }

      try {
        const tokenDoc = await getDoc(doc(db, 'pushTokens', user.uid));
        setIsEnabled(tokenDoc.exists());
      } catch (err) {
        console.error('[PushNotifications] Error checking enabled status:', err);
        setIsEnabled(false);
      }
    };

    checkEnabled();
  }, [user?.uid]);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<PermissionState> => {
    if (!isSupported) {
      return 'denied';
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result as PermissionState);
      return result as PermissionState;
    } catch (err) {
      console.error('[PushNotifications] Permission request failed:', err);
      return 'denied';
    }
  }, [isSupported]);

  // Enable push notifications
  const enable = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !user?.uid) {
      setError('Push notifications not available');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Request permission if not granted
      let currentPermission = permission;
      if (currentPermission !== 'granted') {
        currentPermission = await requestPermission();
      }

      if (currentPermission !== 'granted') {
        setError('Permission denied. Please enable notifications in your browser settings.');
        setIsLoading(false);
        return false;
      }

      // Register service worker if not already registered
      const registration = await navigator.serviceWorker.ready;

      // Get push subscription
      // Note: In production, you'd use VAPID keys here
      // For now, we'll just save a basic token
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        // In production, add: applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      }).catch(() => null);

      // Save token to Firestore
      const tokenData = {
        userId: user.uid,
        token: subscription?.endpoint || `web-${user.uid}-${Date.now()}`,
        platform: 'web' as const,
        userAgent: navigator.userAgent,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'pushTokens', user.uid), tokenData);
      
      setIsEnabled(true);
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error('[PushNotifications] Enable failed:', err);
      setError('Failed to enable notifications. Please try again.');
      setIsLoading(false);
      return false;
    }
  }, [isSupported, user?.uid, permission, requestPermission]);

  // Disable push notifications
  const disable = useCallback(async (): Promise<void> => {
    if (!user?.uid) return;

    setIsLoading(true);
    setError(null);

    try {
      await deleteDoc(doc(db, 'pushTokens', user.uid));
      setIsEnabled(false);
    } catch (err) {
      console.error('[PushNotifications] Disable failed:', err);
      setError('Failed to disable notifications');
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid]);

  return {
    isSupported,
    permission,
    isEnabled,
    isLoading,
    error,
    enable,
    disable,
    requestPermission,
  };
}