// src/components/ui/LanguageToggle.tsx
'use client';

import { useLanguage, Language } from '@/contexts/LanguageContext';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

// ============================================================================
// Toggle Switch (Default)
// ============================================================================

interface LanguageToggleProps {
  variant?: 'default' | 'pill' | 'compact' | 'icon-only';
  className?: string;
}

export function LanguageToggle({ variant = 'default', className = '' }: LanguageToggleProps) {
  const { language, setLanguage } = useLanguage();

  const toggle = () => {
    setLanguage(language === 'en' ? 'es' : 'en');
  };

  // Icon only - just a globe that toggles
  if (variant === 'icon-only') {
    return (
      <button
        onClick={toggle}
        className={`p-2 rounded-lg hover:bg-gray-100 transition-colors ${className}`}
        aria-label={`Switch to ${language === 'en' ? 'Spanish' : 'English'}`}
        title={language === 'en' ? 'Cambiar a Español' : 'Switch to English'}
      >
        <Globe className="w-5 h-5 text-gray-600" />
      </button>
    );
  }

  // Compact - just the code
  if (variant === 'compact') {
    return (
      <button
        onClick={toggle}
        className={`flex items-center gap-1 px-2 py-1 rounded-md hover:bg-gray-100 
                   text-sm font-medium text-gray-700 transition-colors ${className}`}
        aria-label={`Switch to ${language === 'en' ? 'Spanish' : 'English'}`}
      >
        <Globe className="w-4 h-4" />
        <span className="uppercase">{language}</span>
      </button>
    );
  }

  // Pill - EN | ES with flags and active state (ENHANCED)
  if (variant === 'pill') {
    return (
      <div className={`flex items-center bg-gray-100/80 rounded-full p-1 gap-1 ${className}`}>
        <button
          onClick={() => setLanguage('en')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-full transition-all ${
            language === 'en'
              ? 'bg-white text-gray-900 shadow-md'
              : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
          }`}
        >
          <span className="text-base">🇺🇸</span>
          <span>EN</span>
        </button>
        <button
          onClick={() => setLanguage('es')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-full transition-all ${
            language === 'es'
              ? 'bg-white text-gray-900 shadow-md'
              : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
          }`}
        >
          <span className="text-base">🇩🇴</span>
          <span>ES</span>
        </button>
      </div>
    );
  }

  // Default - Toggle with globe and text
  return (
    <button
      onClick={toggle}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200
                 hover:bg-gray-50 hover:border-gray-300 transition-all ${className}`}
      aria-label={`Switch to ${language === 'en' ? 'Spanish' : 'English'}`}
    >
      <Globe className="w-4 h-4 text-gray-500" />
      <span className="text-sm font-medium text-gray-700">
        {language === 'en' ? 'EN' : 'ES'}
      </span>
    </button>
  );
}

// ============================================================================
// Dropdown (Alternative with flags)
// ============================================================================

interface LanguageOption {
  code: Language;
  label: string;
  flag: string;
  currency: string;
}

const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'en', label: 'English', flag: '🇺🇸', currency: 'USD' },
  { code: 'es', label: 'Español', flag: '🇩🇴', currency: 'DOP' },
];

interface LanguageDropdownProps {
  className?: string;
  showCurrency?: boolean;
}

export function LanguageDropdown({ className = '', showCurrency = true }: LanguageDropdownProps) {
  const { language, setLanguage, currency } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentOption = LANGUAGE_OPTIONS.find((opt) => opt.code === language)!;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200
                   hover:bg-gray-50 hover:border-gray-300 transition-all"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="text-lg">{currentOption.flag}</span>
        <span className="text-sm font-medium text-gray-700">
          {currentOption.code.toUpperCase()}
          {showCurrency && (
            <span className="text-gray-400 ml-1">({currency})</span>
          )}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border 
                     border-gray-200 py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
          role="listbox"
        >
          {LANGUAGE_OPTIONS.map((option) => (
            <button
              key={option.code}
              onClick={() => {
                setLanguage(option.code);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50
                         transition-colors ${
                           language === option.code ? 'bg-gray-50' : ''
                         }`}
              role="option"
              aria-selected={language === option.code}
            >
              <span className="text-lg">{option.flag}</span>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">{option.label}</div>
                {showCurrency && (
                  <div className="text-xs text-gray-500">{option.currency}</div>
                )}
              </div>
              {language === option.code && (
                <Check className="w-4 h-4 text-sb-purple" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Mobile-friendly full-width toggle
// ============================================================================

export function LanguageToggleMobile({ className = '' }: { className?: string }) {
  const { language, setLanguage, currency } = useLanguage();

  return (
    <div className={`flex gap-2 ${className}`}>
      <button
        onClick={() => setLanguage('en')}
        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 
                   transition-all ${
                     language === 'en'
                       ? 'border-sb-purple bg-sb-purple/5 text-sb-purple'
                       : 'border-gray-200 text-gray-600 hover:border-gray-300'
                   }`}
      >
        <span className="text-lg">🇺🇸</span>
        <div className="text-left">
          <div className="text-sm font-medium">English</div>
          <div className="text-xs opacity-75">USD</div>
        </div>
      </button>
      <button
        onClick={() => setLanguage('es')}
        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 
                   transition-all ${
                     language === 'es'
                       ? 'border-sb-purple bg-sb-purple/5 text-sb-purple'
                       : 'border-gray-200 text-gray-600 hover:border-gray-300'
                   }`}
      >
        <span className="text-lg">🇩🇴</span>
        <div className="text-left">
          <div className="text-sm font-medium">Español</div>
          <div className="text-xs opacity-75">DOP</div>
        </div>
      </button>
    </div>
  );
}

// Default export
export default LanguageToggle;