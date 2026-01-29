// src/app/driver/forgot-password/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import {
  Mail,
  Loader2,
  AlertCircle,
  Globe,
  ArrowLeft,
  Truck,
  CheckCircle,
} from 'lucide-react';

const translations = {
  es: {
    title: 'Recuperar Contraseña',
    subtitle: 'Te enviaremos un enlace para restablecer tu contraseña',
    email: 'Correo Electrónico',
    emailPlaceholder: 'conductor@ejemplo.com',
    sendLink: 'Enviar Enlace',
    sending: 'Enviando...',
    backToLogin: 'Volver a iniciar sesión',
    successTitle: '¡Enlace Enviado!',
    successMessage: 'Revisa tu correo electrónico para restablecer tu contraseña.',
    checkSpam: 'Si no lo ves, revisa tu carpeta de spam.',
    sendAgain: 'Enviar de nuevo',
    // Errors
    userNotFound: 'No existe una cuenta con este correo.',
    invalidEmail: 'Ingresa un correo válido.',
    tooManyRequests: 'Demasiados intentos. Intenta más tarde.',
    networkError: 'Error de conexión. Verifica tu internet.',
    unknownError: 'Ocurrió un error. Intenta de nuevo.',
  },
  en: {
    title: 'Reset Password',
    subtitle: 'We\'ll send you a link to reset your password',
    email: 'Email',
    emailPlaceholder: 'driver@example.com',
    sendLink: 'Send Link',
    sending: 'Sending...',
    backToLogin: 'Back to login',
    successTitle: 'Link Sent!',
    successMessage: 'Check your email to reset your password.',
    checkSpam: 'If you don\'t see it, check your spam folder.',
    sendAgain: 'Send again',
    // Errors
    userNotFound: 'No account exists with this email.',
    invalidEmail: 'Please enter a valid email.',
    tooManyRequests: 'Too many attempts. Try again later.',
    networkError: 'Connection error. Check your internet.',
    unknownError: 'Something went wrong. Please try again.',
  },
};

type Language = 'es' | 'en';

export default function DriverForgotPasswordPage() {
  const [language, setLanguage] = useState<Language>('es');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const t = translations[language];

  useEffect(() => {
    const savedLang = localStorage.getItem('stackbot-driver-lang') as Language;
    if (savedLang && (savedLang === 'es' || savedLang === 'en')) {
      setLanguage(savedLang);
    }
  }, []);

  const toggleLanguage = () => {
    const newLang = language === 'es' ? 'en' : 'es';
    setLanguage(newLang);
    localStorage.setItem('stackbot-driver-lang', newLang);
  };

  const getErrorMessage = (code: string): string => {
    switch (code) {
      case 'auth/user-not-found':
        return t.userNotFound;
      case 'auth/invalid-email':
        return t.invalidEmail;
      case 'auth/too-many-requests':
        return t.tooManyRequests;
      case 'auth/network-request-failed':
        return t.networkError;
      default:
        return t.unknownError;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError('');

    try {
      await sendPasswordResetEmail(auth, email.trim(), {
        url: `${window.location.origin}/driver/login`,
        handleCodeInApp: false,
      });
      setSuccess(true);
    } catch (err: any) {
      console.error('Password reset error:', err);
      setError(getErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleSendAgain = () => {
    setSuccess(false);
    setEmail('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#55529d] to-[#3d3b7a] flex flex-col">
      <header className="p-4 flex justify-between items-center safe-top">
        <Link href="/driver/login" className="text-white/80 hover:text-white text-sm font-medium flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          {t.backToLogin}
        </Link>
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-full text-white text-sm font-medium hover:bg-white/20 transition-colors"
        >
          <Globe className="w-4 h-4" />
          {language.toUpperCase()}
        </button>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="mb-8 text-center">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Truck className="w-10 h-10 text-[#55529d]" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">{t.title}</h1>
          <p className="text-white/70">{t.subtitle}</p>
        </div>

        <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6">
          {success ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">{t.successTitle}</h2>
              <p className="text-gray-600 mb-2">{t.successMessage}</p>
              <p className="text-sm text-gray-500 mb-6">{t.checkSpam}</p>
              
              <div className="space-y-3">
                <Link
                  href="/driver/login"
                  className="block w-full py-3 bg-[#55529d] text-white font-semibold rounded-xl hover:bg-[#444280] transition-colors text-center"
                >
                  {t.backToLogin}
                </Link>
                <button
                  onClick={handleSendAgain}
                  className="w-full py-3 border border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {t.sendAgain}
                </button>
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t.email}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t.emailPlaceholder}
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#55529d]/20 focus:border-[#55529d] transition-colors"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full py-3 bg-[#55529d] text-white font-semibold rounded-xl hover:bg-[#444280] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {t.sending}
                    </>
                  ) : (
                    t.sendLink
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link href="/driver/login" className="text-sm text-[#55529d] hover:underline">
                  {t.backToLogin}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
