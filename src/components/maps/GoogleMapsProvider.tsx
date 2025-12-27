// src/components/maps/GoogleMapsProvider.tsx
'use client';

import { ReactNode } from 'react';
import { Libraries, useJsApiLoader } from '@react-google-maps/api';
import { Loader2 } from 'lucide-react';

// Include 'marker' library for AdvancedMarkerElement
const libraries: Libraries = ['places', 'geometry', 'marker'];

interface GoogleMapsProviderProps {
  children: ReactNode;
}

export function GoogleMapsProvider({ children }: GoogleMapsProviderProps) {
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

// Hook to check if maps are loaded
export function useGoogleMapsLoaded() {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });
  return isLoaded;
}