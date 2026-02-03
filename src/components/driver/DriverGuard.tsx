// src/components/driver/DriverGuard.tsx
'use client';

import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase/config';
import { onAuthStateChanged, getIdTokenResult } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Truck, Loader2 } from 'lucide-react';

interface DriverGuardProps {
  children: React.ReactNode;
  fallbackPath?: string;
}

export default function DriverGuard({
  children,
  fallbackPath = '/driver/login',
}: DriverGuardProps) {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'allowed' | 'denied'>('loading');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        console.log('DriverGuard: No user');
        setStatus('denied');
        router.replace(fallbackPath);
        return;
      }

      try {
        // Check custom claims
        const token = await getIdTokenResult(user, true);
        if (token.claims.role === 'driver' || token.claims.role === 'admin') {
          console.log('✅ DriverGuard: Allowed via custom claims');
          setStatus('allowed');
          return;
        }

        // Check if driver doc exists (matches Firestore rules)
        const driverDoc = await getDoc(doc(db, 'drivers', user.uid));
        if (driverDoc.exists()) {
          console.log('✅ DriverGuard: Allowed via driver doc existence');
          setStatus('allowed');
          return;
        }

        // Not a driver
        console.log('❌ DriverGuard: Access denied');
        setStatus('denied');
        router.replace(fallbackPath);
      } catch (error) {
        console.error('DriverGuard error:', error);
        setStatus('denied');
        router.replace(fallbackPath);
      }
    });

    return () => unsubscribe();
  }, [router, fallbackPath]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#55529d]">
        <div className="text-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Truck className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div className="flex items-center justify-center gap-2 text-white">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Verifying driver access...</span>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'denied') {
    return null;
  }

  return <>{children}</>;
}