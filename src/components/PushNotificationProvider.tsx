// src/components/PushNotificationProvider.tsx
'use client';

import { useNativePush } from '@/hooks/useNativePush';

/**
 * Push Notification Provider
 * Initializes push notifications on native platforms
 */
export function PushNotificationProvider({ children }: { children: React.ReactNode }) {
  // This hook handles all push initialization automatically
  useNativePush();

  return <>{children}</>;
}
