// src/components/checkout/SaveCardToggle.tsx
'use client';

import React from 'react';
import { CreditCard, Shield } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface SaveCardToggleProps {
  saveCard: boolean;
  onToggle: (save: boolean) => void;
}

export default function SaveCardToggle({ saveCard, onToggle }: SaveCardToggleProps) {
  const { language } = useLanguage();

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <button
        type="button"
        onClick={() => onToggle(!saveCard)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <CreditCard className="w-5 h-5 text-[#55529d]" />
          <div className="text-left">
            <p className="text-sm font-medium text-gray-900">
              {language === 'en' ? 'Save card for next time' : 'Guardar tarjeta para la próxima'}
            </p>
            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
              <Shield className="w-3 h-3" />
              {language === 'en'
                ? 'Secured by Stripe'
                : 'Protegido por Stripe'}
            </p>
          </div>
        </div>

        {/* Toggle switch */}
        <div
          className={`relative w-11 h-6 rounded-full transition-colors ${
            saveCard ? 'bg-[#55529d]' : 'bg-gray-300'
          }`}
        >
          <div
            className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
              saveCard ? 'translate-x-[22px]' : 'translate-x-0.5'
            }`}
          />
        </div>
      </button>
    </div>
  );
}