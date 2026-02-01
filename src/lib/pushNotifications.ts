// src/lib/pushNotifications.ts
import { Capacitor } from '@capacitor/core';
import { PushNotifications, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { db, auth } from './firebase/config';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

// Track initialization state
let isInitialized = false;
let pendingNavigation: string | null = null;

/**
 * Navigation callback for when notifications are tapped
 * Set this from your app's root component
 */
let navigationCallback: ((url: string) => void) | null = null;

export function setNavigationCallback(callback: (url: string) => void) {
  navigationCallback = callback;
  
  // If there's a pending navigation from cold start, execute it
  if (pendingNavigation) {
    callback(pendingNavigation);
    pendingNavigation = null;
  }
}

/**
 * Initialize push notifications for native platforms
 * Call this AFTER user authentication
 */
export async function initPushNotifications(): Promise<boolean> {
  // Only run on native platforms
  if (!Capacitor.isNativePlatform()) {
    console.log('[Push] Not a native platform, skipping');
    return false;
  }

  // Prevent double initialization
  if (isInitialized) {
    console.log('[Push] Already initialized');
    return true;
  }

  try {
    // 1. Create Notification Channel (REQUIRED for Android 8+)
    await PushNotifications.createChannel({
      id: 'default',
      name: 'General Notifications',
      description: 'Order updates and general notifications',
      importance: 5, // HIGH - heads-up display + sound
      sound: 'default',
      visibility: 1, // PUBLIC
      vibration: true,
    });

    // 2. Create separate channel for orders (optional - higher priority)
    await PushNotifications.createChannel({
      id: 'orders',
      name: 'Order Updates',
      description: 'New orders and status changes',
      importance: 5,
      sound: 'default',
      visibility: 1,
      vibration: true,
    });

    // 3. Request permissions
    const permStatus = await PushNotifications.requestPermissions();
    console.log('[Push] Permission status:', permStatus.receive);

    if (permStatus.receive !== 'granted') {
      console.warn('[Push] Permission not granted');
      return false;
    }

    // 4. Register for push notifications
    await PushNotifications.register();

    // 5. Set up listeners
    setupListeners();

    isInitialized = true;
    console.log('[Push] Initialization complete');
    return true;

  } catch (error) {
    console.error('[Push] Initialization error:', error);
    return false;
  }
}

/**
 * Set up all push notification listeners
 */
function setupListeners() {
  // Registration success - save token to Firestore
  PushNotifications.addListener('registration', async (token) => {
    console.log('[Push] Registration token:', token.value);
    await saveTokenToFirestore(token.value);
  });

  // Registration error
  PushNotifications.addListener('registrationError', (error) => {
    console.error('[Push] Registration error:', error.error);
  });

  // Notification received while app is in foreground
  PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
    console.log('[Push] Notification received in foreground:', notification);
    
    // You can show an in-app toast/banner here
    // The notification will still appear in the system tray on most devices
    handleForegroundNotification(notification);
  });

  // Notification tapped (app was in background or closed)
  PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
    console.log('[Push] Notification tapped:', action);
    
    const data = action.notification.data;
    const url = data?.url || '/';
    
    // Navigate to the appropriate screen
    if (navigationCallback) {
      navigationCallback(url);
    } else {
      // Store for later if callback not yet set (cold start)
      pendingNavigation = url;
    }
  });
}

/**
 * Handle foreground notifications (optional in-app display)
 */
function handleForegroundNotification(notification: PushNotificationSchema) {
  // Dispatch a custom event that components can listen to
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('stackbot:push', {
      detail: {
        title: notification.title,
        body: notification.body,
        data: notification.data,
      }
    }));
  }
}

/**
 * Save FCM token to Firestore, linked to current user
 */
async function saveTokenToFirestore(token: string): Promise<void> {
  const user = auth.currentUser;
  
  if (!user) {
    console.warn('[Push] No user logged in, cannot save token');
    return;
  }

  try {
    await setDoc(doc(db, 'pushTokens', user.uid), {
      token,
      userId: user.uid,
      platform: Capacitor.getPlatform(), // 'ios' or 'android'
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    }, { merge: true });

    console.log('[Push] Token saved to Firestore for user:', user.uid);
  } catch (error) {
    console.error('[Push] Error saving token:', error);
  }
}

/**
 * Remove push token (call on logout)
 */
export async function removePushToken(): Promise<void> {
  const user = auth.currentUser;
  
  if (!user) return;

  try {
    await deleteDoc(doc(db, 'pushTokens', user.uid));
    console.log('[Push] Token removed for user:', user.uid);
  } catch (error) {
    console.error('[Push] Error removing token:', error);
  }
}

/**
 * Check if push notifications are supported and enabled
 */
export async function checkPushStatus(): Promise<{
  supported: boolean;
  enabled: boolean;
  permission: string;
}> {
  if (!Capacitor.isNativePlatform()) {
    return { supported: false, enabled: false, permission: 'unsupported' };
  }

  try {
    const permStatus = await PushNotifications.checkPermissions();
    return {
      supported: true,
      enabled: permStatus.receive === 'granted',
      permission: permStatus.receive,
    };
  } catch {
    return { supported: false, enabled: false, permission: 'error' };
  }
}

/**
 * Request permission without full initialization
 */
export async function requestPushPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;

  try {
    const result = await PushNotifications.requestPermissions();
    return result.receive === 'granted';
  } catch {
    return false;
  }
}