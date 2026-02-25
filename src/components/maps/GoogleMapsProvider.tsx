// src/components/maps/GoogleMapsProvider.tsx
// ============================================================================
// GOOGLE MAPS PROVIDER — Now lazy-loads Maps JS to avoid blocking LCP
//
// LCP FIX: Wraps the actual Maps loader in next/dynamic with ssr: false.
// The Maps API (~200KB gzipped) now loads AFTER the page shell renders,
// so it no longer blocks First Contentful Paint or Largest Contentful Paint.
//
// No import changes needed — every file that uses <GoogleMapsProvider>
// automatically gets the lazy behavior.
//
// ROLLBACK: Restore the previous version of this file from git.
// ============================================================================

'use client';

import dynamic from 'next/dynamic';
import { ReactNode } from 'react';
import { Loader2, MapPin } from 'lucide-react';

// ── Lightweight placeholder while Maps JS loads ────────────────────────────
function MapLoadingPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-xl min-h-[200px]">
      <div className="relative">
        <MapPin className="w-8 h-8 text-[#55529d]/30" />
        <Loader2 className="w-5 h-5 animate-spin text-[#55529d] absolute -top-1 -right-1" />
      </div>
      <span className="mt-3 text-sm text-gray-500">Loading map...</span>
    </div>
  );
}

// ── The actual provider, loaded lazily (no SSR, no blocking initial paint) ─
const GoogleMapsProviderInner = dynamic(
  () => import('./GoogleMapsProviderInner').then((mod) => mod.GoogleMapsProviderInner),
  {
    ssr: false,
    loading: () => <MapLoadingPlaceholder />,
  }
);

// ── Public API (unchanged) ─────────────────────────────────────────────────
interface GoogleMapsProviderProps {
  children: ReactNode;
}

export function GoogleMapsProvider({ children }: GoogleMapsProviderProps) {
  return <GoogleMapsProviderInner>{children}</GoogleMapsProviderInner>;
}

// Re-export hook so existing imports still work:
//   import { useGoogleMapsLoaded } from '@/components/maps/GoogleMapsProvider';
export { useGoogleMapsLoaded } from './GoogleMapsProviderInner';