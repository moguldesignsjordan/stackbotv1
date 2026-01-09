// src/contexts/LanguageContext.tsx
'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { translations, TranslationKey } from '@/lib/translations';

// ============================================================================
// Types
// ============================================================================

export type Language = 'en' | 'es';
export type Currency = 'USD' | 'DOP';

interface LanguageContextType {
  language: Language;
  currency: Currency;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, replacements?: Record<string, string | number>) => string;
  formatCurrency: (amount: number) => string;
  formatCurrencyCompact: (amount: number) => string;
  exchangeRate: number;
}

// ============================================================================
// Constants
// ============================================================================

const LANGUAGE_STORAGE_KEY = 'stackbot_language';
const USD_TO_DOP_RATE = 60.5; // Update as needed - Dominican Peso rate

// ============================================================================
// Context
// ============================================================================

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// ============================================================================
// Provider
// ============================================================================

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');
  const [mounted, setMounted] = useState(false);

  // Derived currency from language
  const currency: Currency = language === 'es' ? 'DOP' : 'USD';

  // Load language from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY) as Language | null;
      if (saved && (saved === 'en' || saved === 'es')) {
        setLanguageState(saved);
      }
    } catch (error) {
      console.error('[Language] Failed to load language preference:', error);
    }
    setMounted(true);
  }, []);

  // Set language and persist to localStorage
  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch (error) {
      console.error('[Language] Failed to save language preference:', error);
    }
  }, []);

  // Translation function with optional placeholder replacement
  const t = useCallback(
    (key: TranslationKey, replacements?: Record<string, string | number>): string => {
      const dict = translations[language];
      let text = dict[key] || translations.en[key] || key;

      // Replace placeholders like {count}, {name}, etc.
      if (replacements) {
        Object.entries(replacements).forEach(([placeholder, value]) => {
          text = text.replace(new RegExp(`\\{${placeholder}\\}`, 'g'), String(value));
        });
      }

      return text;
    },
    [language]
  );

  // Format currency based on current language
  const formatCurrency = useCallback(
    (amount: number): string => {
      if (language === 'es') {
        // Convert USD to DOP and format
        const dopAmount = amount * USD_TO_DOP_RATE;
        return new Intl.NumberFormat('es-DO', {
          style: 'currency',
          currency: 'DOP',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(dopAmount);
      }

      // USD format
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    },
    [language]
  );

  // Format currency with compact notation for large amounts
  const formatCurrencyCompact = useCallback(
    (amount: number): string => {
      if (language === 'es') {
        const dopAmount = amount * USD_TO_DOP_RATE;
        if (dopAmount >= 1000) {
          return new Intl.NumberFormat('es-DO', {
            style: 'currency',
            currency: 'DOP',
            notation: 'compact',
            minimumFractionDigits: 0,
            maximumFractionDigits: 1,
          }).format(dopAmount);
        }
        return formatCurrency(amount);
      }

      // USD compact
      if (amount >= 1000) {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          notation: 'compact',
          minimumFractionDigits: 0,
          maximumFractionDigits: 1,
        }).format(amount);
      }
      return formatCurrency(amount);
    },
    [language, formatCurrency]
  );

  // Prevent hydration mismatch by providing static values until mounted
  if (!mounted) {
    return (
      <LanguageContext.Provider
        value={{
          language: 'en',
          currency: 'USD',
          setLanguage: () => {},
          t: (key) => key,
          formatCurrency: (amount) => `$${amount.toFixed(2)}`,
          formatCurrencyCompact: (amount) => `$${amount.toFixed(2)}`,
          exchangeRate: USD_TO_DOP_RATE,
        }}
      >
        {children}
      </LanguageContext.Provider>
    );
  }

  return (
    <LanguageContext.Provider
      value={{
        language,
        currency,
        setLanguage,
        t,
        formatCurrency,
        formatCurrencyCompact,
        exchangeRate: USD_TO_DOP_RATE,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}