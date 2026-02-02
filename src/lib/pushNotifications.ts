// src/lib/pushNotifications.ts
import { Capacitor } from '@capacitor/core';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { db, auth } from './firebase/config';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

let isInitialized = false;

export async function initPushNotifications(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    console.log('[Push] Not a native platform, skipping');
    return false;
  }

  if (isInitialized) {
    console.log('[Push] Already initialized');
    return true;
  }

  try {
    // Request permission
    const permStatus = await FirebaseMessaging.requestPermissions();
    console.log('[Push] Permission status:', permStatus.receive);

    if (permStatus.receive !== 'granted') {
      console.warn('[Push] Permission not granted');
      return false;
    }

    // Get FCM token
    const { token } = await FirebaseMessaging.getToken();
    console.log('[Push] FCM Token:', token?.substring(0, 20) + '...');

    if (token) {
      await saveTokenToFirestore(token);
    }

    // Listen for token refresh
    FirebaseMessaging.addListener('tokenReceived', async ({ token }) => {
      console.log('[Push] Token refreshed');
      await saveTokenToFirestore(token);
    });

    // Listen for foreground messages
    FirebaseMessaging.addListener('notificationReceived', (notification) => {
      console.log('[Push] Notification received:', notification);
    });

    // Listen for notification taps
    FirebaseMessaging.addListener('notificationActionPerformed', (action) => {
      console.log('[Push] Notification tapped:', action);
    });

    isInitialized = true;
    console.log('[Push] Initialization complete');
    return true;

  } catch (error) {
    console.error('[Push] Initialization error:', error);
    return false;
  }
}

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
      platform: Capacitor.getPlatform(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    console.log('[Push] Token saved to Firestore');
  } catch (error) {
    console.error('[Push] Error saving token:', error);
  }
}

export async function removePushToken(): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  try {
    await deleteDoc(doc(db, 'pushTokens', user.uid));
    console.log('[Push] Token removed');
  } catch (error) {
    console.error('[Push] Error removing token:', error);
  }
}

export async function checkPushStatus(): Promise<{
  supported: boolean;
  enabled: boolean;
  permission: string;
}> {
  if (!Capacitor.isNativePlatform()) {
    return { supported: false, enabled: false, permission: 'unsupported' };
  }

  try {
    const permStatus = await FirebaseMessaging.checkPermissions();
    return {
      supported: true,
      enabled: permStatus.receive === 'granted',
      permission: permStatus.receive,
    };
  } catch {
    return { supported: false, enabled: false, permission: 'error' };
  }
}

export function setNavigationCallback(callback: (url: string) => void) {
  // Handle notification taps
  FirebaseMessaging.addListener('notificationActionPerformed', (action) => {
    const data = action.notification?.data as Record<string, string> | undefined;
    const url = data?.url || '/';
    callback(url);
  });
}
