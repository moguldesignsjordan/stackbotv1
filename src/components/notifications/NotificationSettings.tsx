// src/components/notifications/NotificationSettings.tsx
'use client';

import { useState } from 'react';
import { Bell, BellOff, Loader2, CheckCircle, AlertCircle, Smartphone } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export function NotificationSettings() {
  const {
    isSupported,
    permission,
    isEnabled,
    isLoading,
    error,
    enable,
    requestPermission,
  } = usePushNotifications();

  const [showSuccess, setShowSuccess] = useState(false);

  const handleEnable = async () => {
    const success = await enable();
    if (success) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  };

  // Not supported
  if (!isSupported) {
    return (
      <div className="bg-gray-50 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-gray-200 rounded-lg">
            <BellOff className="w-5 h-5 text-gray-500" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Push Notifications</h3>
            <p className="text-sm text-gray-500 mt-1">
              Your browser doesn&apos;t support push notifications.
              Try using Chrome, Firefox, or Safari on desktop.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Permission denied
  if (permission === 'denied') {
    return (
      <div className="bg-red-50 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <BellOff className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Notifications Blocked</h3>
            <p className="text-sm text-gray-600 mt-1">
              You&apos;ve blocked notifications for this site.
              To enable them, click the lock icon in your browser&apos;s address bar
              and change the notification setting.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (showSuccess) {
    return (
      <div className="bg-green-50 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Notifications Enabled!</h3>
            <p className="text-sm text-gray-600 mt-1">
              You&apos;ll now receive notifications about your orders and updates.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Already enabled
  if (isEnabled && permission === 'granted') {
    return (
      <div className="bg-green-50 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <Bell className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-gray-900">Push Notifications</h3>
            <p className="text-sm text-gray-600 mt-1">
              Notifications are enabled. You&apos;ll receive updates about orders,
              vendor status, and more.
            </p>
          </div>
          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
            Enabled
          </span>
        </div>
      </div>
    );
  }

  // Default - can enable
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-[#55529d]/10 rounded-lg">
          <Bell className="w-5 h-5 text-[#55529d]" />
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-gray-900">Push Notifications</h3>
          <p className="text-sm text-gray-600 mt-1">
            Get instant updates about your orders, deliveries, and account activity.
          </p>

          {error && (
            <div className="flex items-center gap-2 mt-2 text-sm text-red-600">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <button
            onClick={handleEnable}
            disabled={isLoading}
            className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-[#55529d] text-white text-sm font-medium rounded-lg hover:bg-[#444287] disabled:opacity-50 transition-colors"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Enabling...
              </>
            ) : (
              <>
                <Bell className="w-4 h-4" />
                Enable Notifications
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact version for settings pages
 */
export function NotificationSettingsCompact() {
  const {
    isSupported,
    permission,
    isEnabled,
    isLoading,
    enable,
  } = usePushNotifications();

  if (!isSupported) {
    return (
      <div className="flex items-center justify-between py-3">
        <div className="flex items-center gap-3">
          <BellOff className="w-5 h-5 text-gray-400" />
          <div>
            <p className="font-medium text-gray-900">Push Notifications</p>
            <p className="text-sm text-gray-500">Not supported in this browser</p>
          </div>
        </div>
      </div>
    );
  }

  const isActive = isEnabled && permission === 'granted';
  const isBlocked = permission === 'denied';

  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <Bell className={`w-5 h-5 ${isActive ? 'text-green-600' : 'text-gray-400'}`} />
        <div>
          <p className="font-medium text-gray-900">Push Notifications</p>
          <p className="text-sm text-gray-500">
            {isBlocked
              ? 'Blocked - update browser settings'
              : isActive
              ? 'Receiving notifications'
              : 'Get instant updates'}
          </p>
        </div>
      </div>

      {!isBlocked && (
        <button
          onClick={enable}
          disabled={isLoading || isActive}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            isActive
              ? 'bg-green-100 text-green-700'
              : 'bg-[#55529d] text-white hover:bg-[#444287]'
          } disabled:opacity-50`}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isActive ? (
            'Enabled'
          ) : (
            'Enable'
          )}
        </button>
      )}
    </div>
  );
}