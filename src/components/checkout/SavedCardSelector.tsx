// src/components/checkout/SavedCardSelector.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CreditCard, Plus, Check, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  funding: string;
  isDefault: boolean;
}

interface SavedCardSelectorProps {
  selectedCardId: string | null; // null = new card
  onSelect: (cardId: string | null) => void;
}

const BRAND_DISPLAY: Record<string, string> = {
  visa: 'Visa',
  mastercard: 'MC',
  amex: 'Amex',
  discover: 'Disc',
  unknown: 'Card',
};

export default function SavedCardSelector({ selectedCardId, onSelect }: SavedCardSelectorProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCards = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/payment-methods', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        const savedCards = data.paymentMethods || [];
        setCards(savedCards);

        // Auto-select default card if available and nothing selected
        if (savedCards.length > 0 && selectedCardId === null) {
          const defaultCard = savedCards.find((c: SavedCard) => c.isDefault);
          if (defaultCard) {
            onSelect(defaultCard.id);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching saved cards:', err);
    } finally {
      setLoading(false);
    }
  }, [user, selectedCardId, onSelect]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <CreditCard className="w-5 h-5 text-[#55529d]" />
          <span className="text-sm font-semibold text-gray-900">
            {language === 'en' ? 'Payment Method' : 'Método de Pago'}
          </span>
        </div>
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
        </div>
      </div>
    );
  }

  // No saved cards - don't render anything (fall through to normal payment)
  if (cards.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <CreditCard className="w-5 h-5 text-[#55529d]" />
        <span className="text-sm font-semibold text-gray-900">
          {language === 'en' ? 'Payment Method' : 'Método de Pago'}
        </span>
      </div>

      <div className="space-y-2">
        {/* Saved cards */}
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => onSelect(card.id)}
            className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
              selectedCardId === card.id
                ? 'border-[#55529d] bg-[#55529d]/5'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-gray-500 uppercase w-10">
                {BRAND_DISPLAY[card.brand] || card.brand}
              </span>
              <span className="text-sm text-gray-900">•••• {card.last4}</span>
              <span className="text-[10px] text-gray-400">
                {String(card.expMonth).padStart(2, '0')}/{String(card.expYear).slice(-2)}
              </span>
            </div>
            {selectedCardId === card.id && (
              <Check className="w-4 h-4 text-[#55529d]" />
            )}
          </button>
        ))}

        {/* New card option */}
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
            selectedCardId === null
              ? 'border-[#55529d] bg-[#55529d]/5'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <Plus className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-700">
            {language === 'en' ? 'Use a new card' : 'Usar una tarjeta nueva'}
          </span>
          {selectedCardId === null && (
            <Check className="w-4 h-4 text-[#55529d] ml-auto" />
          )}
        </button>
      </div>
    </div>
  );
}