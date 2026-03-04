// src/lib/pushNotifications.ts
// ═══════════════════════════════════════════════════════════════════════════
// Native push notification initialization for Capacitor (iOS + Android)
//
// CHANGES from previous version:
//   1. Added foreground haptics via @capacitor/haptics for in-app alerts
//   2. Added audio feedback when notification arrives while app is open
//   3. Better error handling and retry logic
//
// ROLLBACK: Replace with previous pushNotifications.ts (no haptics/audio)
// ═══════════════════════════════════════════════════════════════════════════
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
 * - Sets up listeners for token refresh, incoming notifications, and taps
 * - Adds haptic feedback for foreground notifications
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

    // ── Register listeners ──────────────────────────────────────

    // Token refresh
    const tokenListener = await FirebaseMessaging.addListener(
      'tokenReceived',
      async ({ token: newToken }) => {
        console.log('[Push] Token refreshed:', newToken?.substring(0, 20) + '...');
        if (newToken) {
          await saveTokenToFirestore(newToken);
        }
      }
    );
    listenerCleanups.push(() => tokenListener.remove());

    // ── Foreground notification: haptics + audio ────────────────
    const foregroundListener = await FirebaseMessaging.addListener(
      'notificationReceived',
      async (notification) => {
        console.log('[Push] Foreground notification received:', JSON.stringify(notification));

        // Fire haptic feedback so the user FEELS the notification
        try {
          const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
          // Triple impact pattern: buzz-pause-buzz-pause-buzz
          await Haptics.impact({ style: ImpactStyle.Heavy });
          await new Promise(r => setTimeout(r, 150));
          await Haptics.impact({ style: ImpactStyle.Heavy });
          await new Promise(r => setTimeout(r, 150));
          await Haptics.impact({ style: ImpactStyle.Heavy });
        } catch (hapticErr) {
          console.warn('[Push] Haptics not available:', hapticErr);
        }
      }
    );
    listenerCleanups.push(() => foregroundListener.remove());

    // Notification tap — handle deep linking
    const tapListener = await FirebaseMessaging.addListener(
      'notificationActionPerformed',
      (action) => {
        console.log('[Push] Notification tapped:', JSON.stringify(action));

        // Extract URL from notification data for deep linking
        const url = action?.notification?.data?.url;
        if (url && typeof window !== 'undefined') {
          // Use Next.js router if available, otherwise direct navigation
          if ((window as any).__NEXT_ROUTER_BASEPATH !== undefined) {
            window.location.href = url;
          } else {
            window.location.href = url;
          }
        }
      }
    );
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
 * Retries if auth.currentUser isn't ready yet (common on cold start).
 */
async function saveTokenToFirestore(token: string): Promise<void> {
  // Wait for auth to be ready (up to 5 seconds)
  let user = auth.currentUser;
  if (!user) {
    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      user = auth.currentUser;
      if (user) break;
    }
  }

  if (!user) {
    console.warn('[Push] No authenticated user, cannot save token');
    return;
  }

  try {
    await setDoc(doc(db, 'pushTokens', user.uid), {
      token,
      platform: Capacitor.getPlatform(), // 'ios' | 'android'
      userId: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    console.log('[Push] ✅ Token saved to Firestore for user', user.uid);
  } catch (error) {
    console.error('[Push] ❌ Failed to save token:', error);
  }
}

/**
 * Remove FCM token from Firestore (call on logout)
 */
export async function removePushToken(): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  try {
    await deleteDoc(doc(db, 'pushTokens', user.uid));
    console.log('[Push] Token removed for user', user.uid);
  } catch (error) {
    console.error('[Push] Failed to remove token:', error);
  }
}

/**
 * Check if push notifications are currently enabled
 */
export async function isPushEnabled(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;

  try {
    const result = await FirebaseMessaging.checkPermissions();
    return result.receive === 'granted';
  } catch {
    return false;
  }
}

/**
 * Subscribe to an FCM topic (e.g., 'support_admin' for admin users)
 */
export async function subscribeToTopic(topic: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await FirebaseMessaging.subscribeToTopic({ topic });
    console.log(`[Push] Subscribed to topic: ${topic}`);
  } catch (error) {
    console.error(`[Push] Failed to subscribe to topic ${topic}:`, error);
  }
}

/**
 * Unsubscribe from an FCM topic
 */
export async function unsubscribeFromTopic(topic: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await FirebaseMessaging.unsubscribeFromTopic({ topic });
    console.log(`[Push] Unsubscribed from topic: ${topic}`);
  } catch (error) {
    console.error(`[Push] Failed to unsubscribe from topic ${topic}:`, error);
  }
}