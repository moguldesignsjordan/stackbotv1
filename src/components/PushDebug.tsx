'use client';

import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

export function PushDebug() {
  const [status, setStatus] = useState('Tap to check');
  
  const checkPush = async () => {
    try {
      const isNative = Capacitor.isNativePlatform();
      const platform = Capacitor.getPlatform();
      
      if (!isNative) {
        setStatus(`Not native: ${platform}`);
        return;
      }
      
      const perm = await PushNotifications.checkPermissions();
      setStatus(`Native: ${platform}, Perm: ${perm.receive}`);
      
      if (perm.receive === 'prompt') {
        const result = await PushNotifications.requestPermissions();
        setStatus(`Requested: ${result.receive}`);
      }
    } catch (e: any) {
      setStatus(`Error: ${e.message}`);
    }
  };

  return (
    <button
      onClick={checkPush}
      style={{
        position: 'fixed',
        bottom: 100,
        right: 20,
        zIndex: 9999,
        background: 'red',
        color: 'white',
        padding: '10px 15px',
        borderRadius: 8,
        fontSize: 12,
        maxWidth: 200,
      }}
    >
      {status}
    </button>
  );
}
