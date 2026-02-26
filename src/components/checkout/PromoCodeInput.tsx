// src/components/checkout/PromoCodeInput.tsx

'use client';

import { useState, useCallback } from 'react';
import { Tag, X, Loader2, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export interface PromoDiscount {
  promoCodeId: string;
  couponId: string;
  code: string;
  name: string;
  percentOff: number | null;
  amountOff: number | null;
  discountAmount: number;
}

interface PromoCodeInputProps {
  subtotal: number;
  onApply: (discount: PromoDiscount) => void;
  onRemove: () => void;
  appliedDiscount: PromoDiscount | null;
  disabled?: boolean;
}

export default function PromoCodeInput({
  subtotal,
  onApply,
  onRemove,
  appliedDiscount,
  disabled = false,
}: PromoCodeInputProps) {
  const { language } = useLanguage();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const t = useCallback(
    (en: string, es: string) => (language === 'en' ? en : es),
    [language]
  );

  const handleApply = async () => {
    const trimmed = code.trim();
    if (!trimmed) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/promo/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promoCode: trimmed, subtotal }),
      });

      const data = await res.json();

      if (!res.ok || !data.valid) {
        setError(data.error || t('Invalid promotion code', 'Código de promoción inválido'));
        return;
      }

      onApply({
        promoCodeId: data.promoCodeId,
        couponId: data.couponId,
        code: data.code,
        name: data.name,
        percentOff: data.percentOff,
        amountOff: data.amountOff,
        discountAmount: data.discountAmount,
      });
      setCode('');
      setError('');
      setIsExpanded(false);
    } catch {
      setError(t('Failed to validate code', 'Error al validar el código'));
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = () => {
    onRemove();
    setCode('');
    setError('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleApply();
    }
  };

  // ── Applied state ──
  if (appliedDiscount) {
    const label = appliedDiscount.percentOff
      ? `${appliedDiscount.percentOff}% off`
      : appliedDiscount.amountOff
      ? `$${appliedDiscount.amountOff.toFixed(2)} off`
      : '';

    return (
      <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <CheckCircle2 className="w-4.5 h-4.5 text-green-600 flex-shrink-0" />
          <div className="min-w-0">
            <span className="text-sm font-semibold text-green-800 block truncate">
              {appliedDiscount.code}
            </span>
            {label && (
              <span className="text-xs text-green-600">{label}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-sm font-semibold text-green-700">
            -${appliedDiscount.discountAmount.toFixed(2)}
          </span>
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled}
            className="p-1 rounded-full text-green-600 hover:bg-green-100 transition-colors disabled:opacity-50"
            aria-label={t('Remove promo code', 'Eliminar código de promoción')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ── Collapsed toggle ──
  if (!isExpanded) {
    return (
      <button
        type="button"
        onClick={() => setIsExpanded(true)}
        disabled={disabled}
        className="flex items-center gap-2 text-sm text-[#55529d] hover:text-[#433f8a] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed py-1"
      >
        <Tag className="w-4 h-4" />
        {t('Have a promo code?', '¿Tienes un código de promoción?')}
      </button>
    );
  }

  // ── Expanded input ──
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              if (error) setError('');
            }}
            onKeyDown={handleKeyDown}
            placeholder={t('Enter code', 'Ingresa el código')}
            disabled={disabled || loading}
            autoFocus
            className={`w-full pl-9 pr-3 py-2.5 text-sm border rounded-xl transition-colors uppercase tracking-wide
              placeholder:normal-case placeholder:tracking-normal
              focus:ring-2 focus:ring-[#55529d]/20 focus:border-[#55529d]
              disabled:opacity-50 disabled:cursor-not-allowed
              ${error ? 'border-red-300 bg-red-50/30' : 'border-gray-200'}
            `}
            maxLength={50}
          />
        </div>
        <button
          type="button"
          onClick={handleApply}
          disabled={disabled || loading || !code.trim()}
          className="px-4 py-2.5 bg-[#55529d] text-white text-sm font-medium rounded-xl
            hover:bg-[#433f8a] active:bg-[#36336e] transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
            flex items-center gap-1.5 flex-shrink-0"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            t('Apply', 'Aplicar')
          )}
        </button>
        <button
          type="button"
          onClick={() => {
            setIsExpanded(false);
            setCode('');
            setError('');
          }}
          className="p-2.5 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label={t('Cancel', 'Cancelar')}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-600 pl-1">{error}</p>
      )}
    </div>
  );
}