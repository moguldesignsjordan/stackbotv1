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
      setStatus('Checking...');
      
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

      setStatus('Registering...');

      // Remove old listeners
      await PushNotifications.removeAllListeners();

      // Add registration listener FIRST
      PushNotifications.addListener('registration', async (token) => {
        setStatus(`Token: ${token.value.substring(0, 20)}...`);
        
        // Save to Firestore
        try {
          await setDoc(doc(db, 'pushTokens', user.uid), {
            token: token.value,
            userId: user.uid,
            platform: Capacitor.getPlatform(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          setStatus('✅ Token saved!');
        } catch (e: any) {
          setStatus(`Save error: ${e.message}`);
        }
      });

      PushNotifications.addListener('registrationError', (error) => {
        setStatus(`Reg error: ${error.error}`);
      });

      // Register
      await PushNotifications.register();
      setStatus('Register called...');

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
