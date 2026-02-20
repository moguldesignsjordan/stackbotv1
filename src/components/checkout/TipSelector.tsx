// src/components/checkout/TipSelector.tsx
'use client';

import React, { useState, useCallback } from 'react';
import { Heart, Truck, Store } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

type FulfillmentType = 'delivery' | 'pickup';

interface TipSelectorProps {
  subtotal: number;
  fulfillmentType: FulfillmentType;
  onTipChange: (tipAmount: number, tipPercent: number | null) => void;
  formatCurrency: (amount: number) => string;
}

const TIP_PRESETS = [10, 15, 20, 25];

export default function TipSelector({
  subtotal,
  fulfillmentType,
  onTipChange,
  formatCurrency,
}: TipSelectorProps) {
  const { language } = useLanguage();
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [isCustom, setIsCustom] = useState(false);
  const [customAmount, setCustomAmount] = useState('');

  const isDelivery = fulfillmentType === 'delivery';

  const handlePresetSelect = useCallback(
    (percent: number) => {
      if (selectedPreset === percent) {
        // Deselect
        setSelectedPreset(null);
        setIsCustom(false);
        setCustomAmount('');
        onTipChange(0, null);
      } else {
        setSelectedPreset(percent);
        setIsCustom(false);
        setCustomAmount('');
        const tipAmount = Math.round(subtotal * (percent / 100) * 100) / 100;
        onTipChange(tipAmount, percent);
      }
    },
    [selectedPreset, subtotal, onTipChange]
  );

  const handleCustomToggle = useCallback(() => {
    if (isCustom) {
      setIsCustom(false);
      setCustomAmount('');
      setSelectedPreset(null);
      onTipChange(0, null);
    } else {
      setIsCustom(true);
      setSelectedPreset(null);
      setCustomAmount('');
      onTipChange(0, null);
    }
  }, [isCustom, onTipChange]);

  const handleCustomAmountChange = useCallback(
    (value: string) => {
      // Allow only numbers and one decimal point
      const cleaned = value.replace(/[^0-9.]/g, '');
      const parts = cleaned.split('.');
      const formatted = parts.length > 2 ? parts[0] + '.' + parts[1] : cleaned;

      setCustomAmount(formatted);

      const amount = parseFloat(formatted);
      if (!isNaN(amount) && amount >= 0) {
        onTipChange(Math.round(amount * 100) / 100, null);
      } else {
        onTipChange(0, null);
      }
    },
    [onTipChange]
  );

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        {isDelivery ? (
          <Truck className="w-5 h-5 text-[#55529d]" />
        ) : (
          <Store className="w-5 h-5 text-[#55529d]" />
        )}
        <h3 className="text-sm font-semibold text-gray-900">
          {isDelivery
            ? language === 'en'
              ? 'Driver Tip'
              : 'Propina para el Conductor'
            : language === 'en'
              ? 'Staff Tip'
              : 'Propina para el Personal'}
        </h3>
      </div>

      <p className="text-xs text-gray-500 mb-3">
        {isDelivery
          ? language === 'en'
            ? '100% of your tip goes to the driver'
            : 'El 100% de la propina va al conductor'
          : language === 'en'
            ? 'Show appreciation for great service'
            : 'Muestra aprecio por un buen servicio'}
      </p>

      {/* Preset buttons */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {TIP_PRESETS.map((percent) => {
          const amount = Math.round(subtotal * (percent / 100) * 100) / 100;
          const isSelected = selectedPreset === percent;

          return (
            <button
              key={percent}
              type="button"
              onClick={() => handlePresetSelect(percent)}
              className={`flex flex-col items-center py-2.5 px-1 rounded-xl border-2 transition-all text-center ${
                isSelected
                  ? 'border-[#55529d] bg-[#55529d]/5 shadow-sm'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span
                className={`text-sm font-bold ${
                  isSelected ? 'text-[#55529d]' : 'text-gray-900'
                }`}
              >
                {percent}%
              </span>
              <span
                className={`text-[10px] mt-0.5 ${
                  isSelected ? 'text-[#55529d]/70' : 'text-gray-400'
                }`}
              >
                {formatCurrency(amount)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Custom / No tip row */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleCustomToggle}
          className={`flex-1 py-2 px-3 rounded-xl border-2 text-xs font-medium transition-all ${
            isCustom
              ? 'border-[#55529d] bg-[#55529d]/5 text-[#55529d]'
              : 'border-gray-200 text-gray-600 hover:border-gray-300'
          }`}
        >
          {language === 'en' ? 'Custom' : 'Personalizado'}
        </button>
        <button
          type="button"
          onClick={() => {
            setSelectedPreset(null);
            setIsCustom(false);
            setCustomAmount('');
            onTipChange(0, null);
          }}
          className={`flex-1 py-2 px-3 rounded-xl border-2 text-xs font-medium transition-all ${
            !selectedPreset && !isCustom
              ? 'border-gray-300 bg-gray-50 text-gray-700'
              : 'border-gray-200 text-gray-400 hover:border-gray-300'
          }`}
        >
          {language === 'en' ? 'No Tip' : 'Sin Propina'}
        </button>
      </div>

      {/* Custom amount input */}
      {isCustom && (
        <div className="mt-3">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">
              $
            </span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={customAmount}
              onChange={(e) => handleCustomAmountChange(e.target.value)}
              className="w-full pl-7 pr-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm 
                         focus:border-[#55529d] focus:ring-1 focus:ring-[#55529d]/20 outline-none
                         transition-colors"
              autoFocus
            />
          </div>
        </div>
      )}

      {/* Selected tip summary */}
      {(selectedPreset || (isCustom && parseFloat(customAmount) > 0)) && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-[#55529d]">
          <Heart className="w-3.5 h-3.5 fill-current" />
          <span className="font-medium">
            {language === 'en' ? 'Tip' : 'Propina'}:{' '}
            {formatCurrency(
              selectedPreset
                ? Math.round(subtotal * (selectedPreset / 100) * 100) / 100
                : parseFloat(customAmount) || 0
            )}
          </span>
        </div>
      )}
    </div>
  );
}