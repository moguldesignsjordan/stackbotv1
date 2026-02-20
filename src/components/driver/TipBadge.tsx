// src/components/driver/TipBadge.tsx
'use client';

import React from 'react';
import { Heart } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface TipBadgeProps {
  tipAmount: number;
  formatCurrency: (amount: number) => string;
  size?: 'sm' | 'md';
}

export default function TipBadge({ tipAmount, formatCurrency, size = 'sm' }: TipBadgeProps) {
  const { language } = useLanguage();

  if (!tipAmount || tipAmount <= 0) return null;

  if (size === 'md') {
    return (
      <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
        <Heart className="w-5 h-5 text-green-600 fill-current" />
        <div>
          <p className="text-sm font-semibold text-green-800">
            {formatCurrency(tipAmount)} {language === 'en' ? 'Tip' : 'Propina'}
          </p>
          <p className="text-xs text-green-600">
            {language === 'en'
              ? 'From the customer — thank you!'
              : 'Del cliente — ¡gracias!'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
      <Heart className="w-3 h-3 fill-current" />
      {formatCurrency(tipAmount)}
    </span>
  );
}