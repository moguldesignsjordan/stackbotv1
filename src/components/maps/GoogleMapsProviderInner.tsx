// src/components/maps/GoogleMapsProviderInner.tsx
// ============================================================================
// INTERNAL — The actual Google Maps JS loader.
// This is the original GoogleMapsProvider logic, extracted so the public
// GoogleMapsProvider.tsx can lazy-load it via next/dynamic.
//
// DO NOT import this directly — always use GoogleMapsProvider.
//
// ROLLBACK: Merge this back into GoogleMapsProvider.tsx and remove the
//           dynamic() wrapper.
// ============================================================================

'use client';

import { ReactNode } from 'react';
import { Libraries, useJsApiLoader } from '@react-google-maps/api';
import { Loader2 } from 'lucide-react';

const libraries: Libraries = ['places', 'geometry', 'marker'];

interface GoogleMapsProviderInnerProps {
  children: ReactNode;
}

export function GoogleMapsProviderInner({ children }: GoogleMapsProviderInnerProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-red-50 rounded-xl border border-red-200">
        <p className="text-red-600 text-sm font-medium">Failed to load Google Maps</p>
        <p className="text-red-500 text-xs mt-1">Check your API key configuration</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center p-8 bg-gray-50 rounded-xl">
        <Loader2 className="w-6 h-6 animate-spin text-[#55529d]" />
        <span className="ml-2 text-gray-600">Loading map...</span>
      </div>
    );
  }

  return <>{children}</>;
}

// Re-export the hook for any consumers that use it directly
export function useGoogleMapsLoaded() {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });
  return isLoaded;
}