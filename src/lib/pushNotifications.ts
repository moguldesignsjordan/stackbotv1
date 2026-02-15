// src/lib/pushNotifications.ts
import { Capacitor } from '@capacitor/core';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { db, auth } from './firebase/config';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

let isInitialized = false;
let listenerCleanups: (() => Promise<void>)[] = [];

/**
 * Initialize push notifications on native platforms.
 * - Requests permission
 * - Gets FCM token and saves to Firestore
 * - Sets up listeners for token refresh and incoming notifications
 * - Cleans up previous listeners before re-registering (prevents duplicates)
 */
export async function initPushNotifications(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    console.log('[Push] Not a native platform, skipping');
    return false;
  }

  // Clean up any previous listeners before re-initializing
  if (isInitialized) {
    console.log('[Push] Re-initializing, cleaning up previous listeners');
    await cleanupListeners();
  }

  try {
    // Request permission
    const permStatus = await FirebaseMessaging.requestPermissions();
    console.log('[Push] Permission status:', permStatus.receive);

    if (permStatus.receive !== 'granted') {
      console.warn('[Push] Permission not granted');
      return false;
    }

    // Get FCM token with retry
    let token: string | undefined;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const result = await FirebaseMessaging.getToken();
        token = result.token;
        if (token) break;
      } catch (tokenError) {
        console.warn(`[Push] Token attempt ${attempt}/3 failed:`, tokenError);
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    if (!token) {
      console.error('[Push] Failed to get FCM token after 3 attempts');
      return false;
    }

    console.log('[Push] FCM Token:', token.substring(0, 20) + '...');
    console.log('[Push] Platform:', Capacitor.getPlatform());

    // Save token - wait for auth if needed
    await saveTokenToFirestore(token);

    // Register listeners
    const tokenListener = await FirebaseMessaging.addListener('tokenReceived', async ({ token: newToken }) => {
      console.log('[Push] Token refreshed:', newToken?.substring(0, 20) + '...');
      if (newToken) {
        await saveTokenToFirestore(newToken);
      }
    });
    listenerCleanups.push(() => tokenListener.remove());

    const foregroundListener = await FirebaseMessaging.addListener('notificationReceived', (notification) => {
      console.log('[Push] Foreground notification received:', JSON.stringify(notification));
    });
    listenerCleanups.push(() => foregroundListener.remove());

    const tapListener = await FirebaseMessaging.addListener('notificationActionPerformed', (action) => {
      console.log('[Push] Notification tapped:', JSON.stringify(action));
    });
    listenerCleanups.push(() => tapListener.remove());

    isInitialized = true;
    console.log('[Push] ✅ Initialization complete on', Capacitor.getPlatform());
    return true;

  } catch (error) {
    console.error('[Push] ❌ Initialization error:', error);
    return false;
  }
}

/**
 * Clean up all registered listeners to prevent duplicates
 */
async function cleanupListeners(): Promise<void> {
  for (const cleanup of listenerCleanups) {
    try {
      await cleanup();
    } catch (e) {
      // Ignore cleanup errors
    }
  }
  listenerCleanups = [];
  isInitialized = false;
}

/**
 * Save FCM token to Firestore under pushTokens/{userId}
 * Retries if auth.currentUser is not yet available
 */
async function saveTokenToFirestore(token: string): Promise<void> {
  let user = auth.currentUser;

  // If user not ready yet, wait briefly for auth state to resolve
  if (!user) {
    console.log('[Push] Waiting for auth user...');
    user = await new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(null), 5000);
      const unsubscribe = auth.onAuthStateChanged((u) => {
        clearTimeout(timeout);
        unsubscribe();
        resolve(u);
      });
    });
  }

  if (!user) {
    console.warn('[Push] No user logged in after waiting, cannot save token');
    return;
  }

  try {
    await setDoc(doc(db, 'pushTokens', user.uid), {
      token,
      userId: user.uid,
      platform: Capacitor.getPlatform(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    console.log('[Push] ✅ Token saved to Firestore for user:', user.uid);
  } catch (error) {
    console.error('[Push] ❌ Error saving token:', error);
  }
}

/**
 * Remove push token from Firestore (on logout)
 */
export async function removePushToken(): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  try {
    await deleteDoc(doc(db, 'pushTokens', user.uid));
    await cleanupListeners();
    console.log('[Push] Token removed and listeners cleaned up');
  } catch (error) {
    console.error('[Push] Error removing token:', error);
  }
}

/**
 * Check current push notification status
 */
export async function checkPushStatus(): Promise<{
  supported: boolean;
  enabled: boolean;
  permission: string;
  token?: string;
}> {
  if (!Capacitor.isNativePlatform()) {
    return { supported: false, enabled: false, permission: 'unsupported' };
  }

  try {
    const permStatus = await FirebaseMessaging.checkPermissions();
    let token: string | undefined;

    if (permStatus.receive === 'granted') {
      try {
        const result = await FirebaseMessaging.getToken();
        token = result.token;
      } catch {
        // Token retrieval failed, but permission is granted
      }
    }

    return {
      supported: true,
      enabled: permStatus.receive === 'granted',
      permission: permStatus.receive,
      token: token ? token.substring(0, 20) + '...' : undefined,
    };
  } catch {
    return { supported: false, enabled: false, permission: 'error' };
  }
}

/**
 * Set up callback for handling notification tap navigation
 */
export function setNavigationCallback(callback: (url: string) => void) {
  FirebaseMessaging.addListener('notificationActionPerformed', (action) => {
    const data = action.notification?.data as Record<string, string> | undefined;
    const url = data?.url || '/';
    console.log('[Push] Navigation callback triggered, url:', url);
    callback(url);
  });
}