// src/components/tracking/TrackLiveButton.tsx
'use client';

import { Navigation, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface TrackLiveButtonProps {
  /** Firestore document ID (not the human-readable orderId) */
  orderDocId: string;
  status: string;
  driverName?: string;
}

/**
 * Shows a prominent "Track Live" CTA when the order is being delivered.
 * Links to /track/[orderId] for real-time map tracking.
 */
export function TrackLiveButton({ orderDocId, status, driverName }: TrackLiveButtonProps) {
  const showLiveTracking = ['claimed', 'out_for_delivery'].includes(status);

  if (!showLiveTracking) return null;

  return (
    <Link
      href={`/track/${orderDocId}`}
      className="flex items-center justify-between gap-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl p-4 shadow-lg transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
          <Navigation className="w-5 h-5" />
        </div>
        <div>
          <p className="font-semibold text-sm">Track Live</p>
          <p className="text-xs text-emerald-100">
            {status === 'out_for_delivery'
              ? `${driverName || 'Driver'} is on the way`
              : `${driverName || 'Driver'} is picking up your order`}
          </p>
        </div>
      </div>
      <ArrowRight className="w-5 h-5 text-emerald-100" />
    </Link>
  );
}