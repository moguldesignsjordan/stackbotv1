'use client';

import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase/config';

export function PushDebug() {
  const [status, setStatus] = useState('Tap to register push');
  
  const registerPush = async () => {
    try {
      setStatus('Starting...');
      
      const isNative = Capacitor.isNativePlatform();
      if (!isNative) {
        setStatus('Not native');
        return;
      }

      const user = auth.currentUser;
      if (!user) {
        setStatus('Not logged in');
        return;
      }

      // Step 1: Request permission
      setStatus('Requesting permission...');
      const permResult = await PushNotifications.requestPermissions();
      setStatus(`Perm: ${permResult.receive}`);
      
      if (permResult.receive !== 'granted') {
        setStatus(`Permission denied: ${permResult.receive}`);
        return;
      }

      // Step 2: Remove old listeners
      await PushNotifications.removeAllListeners();

      // Step 3: Add registration listener
      PushNotifications.addListener('registration', async (token) => {
        setStatus(`Got token!`);
        
        try {
          await setDoc(doc(db, 'pushTokens', user.uid), {
            token: token.value,
            userId: user.uid,
            platform: Capacitor.getPlatform(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          setStatus('✅ Saved!');
        } catch (e: any) {
          setStatus(`Save err: ${e.message}`);
        }
      });

      PushNotifications.addListener('registrationError', (error) => {
        setStatus(`Reg err: ${error.error}`);
      });

      // Step 4: Register
      setStatus('Registering...');
      await PushNotifications.register();

    } catch (e: any) {
      setStatus(`Error: ${e.message}`);
    }
  };

  return (
    <button
      onClick={registerPush}
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
        wordBreak: 'break-all',
      }}
    >
      {status}
    </button>
  );
}
