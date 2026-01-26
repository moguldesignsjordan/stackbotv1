// src/components/driver/DriverGuard.tsx
'use client';

import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase/config';
import { onAuthStateChanged, getIdTokenResult } from 'firebase/auth';
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
  const [debugInfo, setDebugInfo] = useState<string>('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        console.log('DriverGuard: No user, redirecting to login');
        setStatus('denied');
        router.replace(fallbackPath);
        return;
      }

      try {
        // Force refresh to get latest claims
        const token = await getIdTokenResult(user, true);

        console.log('=== DRIVER GUARD DEBUG ===');
        console.log('User:', user.email);
        console.log('UID:', user.uid);
        console.log('Role claim:', token.claims.role);

        setDebugInfo(`${user.email} | Role: ${token.claims.role || 'none'}`);

        // Allow drivers AND admins to access driver pages
        if (token.claims.role === 'driver' || token.claims.role === 'admin') {
          setStatus('allowed');
        } else {
          console.log('DriverGuard: User is not driver, redirecting');
          setStatus('denied');
          
          // Redirect based on their actual role
          if (token.claims.role === 'vendor') {
            router.replace('/vendor');
          } else {
            router.replace('/');
          }
        }
      } catch (error) {
        console.error('DriverGuard: Error checking role', error);
        setStatus('denied');
        router.replace(fallbackPath);
      }
    });

    return () => unsubscribe();
  }, [router, fallbackPath]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Truck className="w-8 h-8 text-emerald-400 animate-pulse" />
          </div>
          <div className="flex items-center justify-center gap-2 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Verifying driver access...</span>
          </div>
          {debugInfo && (
            <p className="text-xs text-gray-600 mt-4">{debugInfo}</p>
          )}
        </div>
      </div>
    );
  }

  if (status === 'denied') {
    return null;
  }

  return <>{children}</>;
}