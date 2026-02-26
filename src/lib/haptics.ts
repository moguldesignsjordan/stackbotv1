// src/lib/haptics.ts
import { Capacitor } from '@capacitor/core';

export async function triggerHaptic(
  style: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'medium'
) {
  if (!Capacitor.isNativePlatform()) return;

  const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics');

  switch (style) {
    case 'light':
      await Haptics.impact({ style: ImpactStyle.Light });
      break;
    case 'medium':
      await Haptics.impact({ style: ImpactStyle.Medium });
      break;
    case 'heavy':
      await Haptics.impact({ style: ImpactStyle.Heavy });
      break;
    case 'success':
      await Haptics.notification({ type: NotificationType.Success });
      break;
    case 'warning':
      await Haptics.notification({ type: NotificationType.Warning });
      break;
    case 'error':
      await Haptics.notification({ type: NotificationType.Error });
      break;
  }
}