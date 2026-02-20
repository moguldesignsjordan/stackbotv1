// src/components/profile/SavedCards.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CreditCard, Trash2, Star, Loader2, AlertCircle, Plus } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  funding: string; // 'credit' | 'debit' | 'prepaid'
  isDefault: boolean;
}

const BRAND_ICONS: Record<string, string> = {
  visa: '💳 Visa',
  mastercard: '💳 Mastercard',
  amex: '💳 Amex',
  discover: '💳 Discover',
  unknown: '💳',
};

export default function SavedCards() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

  const fetchCards = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const token = await user.getIdToken();
      const res = await fetch('/api/payment-methods', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to fetch');

      const data = await res.json();
      setCards(data.paymentMethods || []);
    } catch (err) {
      console.error('Error fetching cards:', err);
      setError(
        language === 'en'
          ? 'Failed to load payment methods'
          : 'Error al cargar métodos de pago'
      );
    } finally {
      setLoading(false);
    }
  }, [user, language]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const handleDelete = async (cardId: string) => {
    if (!user) return;

    const confirmMsg =
      language === 'en'
        ? 'Remove this card? This cannot be undone.'
        : '¿Eliminar esta tarjeta? Esto no se puede deshacer.';

    if (!window.confirm(confirmMsg)) return;

    try {
      setDeletingId(cardId);
      const token = await user.getIdToken();
      const res = await fetch('/api/payment-methods', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentMethodId: cardId }),
      });

      if (!res.ok) throw new Error('Failed to delete');

      setCards((prev) => prev.filter((c) => c.id !== cardId));
    } catch (err) {
      console.error('Error deleting card:', err);
      setError(
        language === 'en'
          ? 'Failed to remove card'
          : 'Error al eliminar tarjeta'
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetDefault = async (cardId: string) => {
    if (!user) return;

    try {
      setSettingDefaultId(cardId);
      const token = await user.getIdToken();
      const res = await fetch('/api/payment-methods', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentMethodId: cardId }),
      });

      if (!res.ok) throw new Error('Failed to set default');

      setCards((prev) =>
        prev.map((c) => ({
          ...c,
          isDefault: c.id === cardId,
        }))
      );
    } catch (err) {
      console.error('Error setting default:', err);
      setError(
        language === 'en'
          ? 'Failed to update default card'
          : 'Error al actualizar tarjeta predeterminada'
      );
    } finally {
      setSettingDefaultId(null);
    }
  };

  const getFundingLabel = (funding: string) => {
    const labels: Record<string, { en: string; es: string }> = {
      debit: { en: 'Debit', es: 'Débito' },
      credit: { en: 'Credit', es: 'Crédito' },
      prepaid: { en: 'Prepaid', es: 'Prepago' },
    };
    return labels[funding]?.[language === 'en' ? 'en' : 'es'] || funding;
  };

  // Loading state
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-5 h-5 text-[#55529d]" />
          <h3 className="text-base font-semibold text-gray-900">
            {language === 'en' ? 'Payment Methods' : 'Métodos de Pago'}
          </h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-[#55529d] animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-[#55529d]" />
          <h3 className="text-base font-semibold text-gray-900">
            {language === 'en' ? 'Payment Methods' : 'Métodos de Pago'}
          </h3>
        </div>
        <span className="text-xs text-gray-400">
          {cards.length} {language === 'en' ? 'saved' : 'guardadas'}
        </span>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {/* Empty state */}
      {cards.length === 0 ? (
        <div className="text-center py-6">
          <CreditCard className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">
            {language === 'en'
              ? 'No saved cards yet'
              : 'No hay tarjetas guardadas'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {language === 'en'
              ? 'Cards will be saved when you check out with "Save card" enabled'
              : 'Las tarjetas se guardarán al pagar con "Guardar tarjeta" activado'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {cards.map((card) => (
            <div
              key={card.id}
              className={`relative p-3 rounded-xl border-2 transition-all ${
                card.isDefault
                  ? 'border-[#55529d] bg-[#55529d]/5'
                  : 'border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between">
                {/* Card info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="text-lg flex-shrink-0">
                    {BRAND_ICONS[card.brand] || BRAND_ICONS.unknown}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        •••• {card.last4}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full uppercase font-medium">
                        {getFundingLabel(card.funding)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {language === 'en' ? 'Expires' : 'Vence'}{' '}
                      {String(card.expMonth).padStart(2, '0')}/{card.expYear}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {!card.isDefault && (
                    <button
                      type="button"
                      onClick={() => handleSetDefault(card.id)}
                      disabled={settingDefaultId === card.id}
                      className="p-2 rounded-lg text-gray-400 hover:text-[#55529d] hover:bg-[#55529d]/5 
                                 transition-colors disabled:opacity-50"
                      title={language === 'en' ? 'Set as default' : 'Establecer como predeterminada'}
                    >
                      {settingDefaultId === card.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Star className="w-4 h-4" />
                      )}
                    </button>
                  )}
                  {card.isDefault && (
                    <span className="text-[10px] text-[#55529d] font-semibold uppercase px-2 py-1">
                      {language === 'en' ? 'Default' : 'Principal'}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(card.id)}
                    disabled={deletingId === card.id}
                    className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 
                               transition-colors disabled:opacity-50"
                    title={language === 'en' ? 'Remove card' : 'Eliminar tarjeta'}
                  >
                    {deletingId === card.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info note */}
      <p className="mt-4 text-[10px] text-gray-400 text-center">
        {language === 'en'
          ? 'Card data is securely stored by Stripe. StackBot never sees your full card number.'
          : 'Los datos de tu tarjeta son almacenados de forma segura por Stripe. StackBot nunca ve tu número completo.'}
      </p>
    </div>
  );
}