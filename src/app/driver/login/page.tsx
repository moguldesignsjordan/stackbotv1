// src/app/driver/login/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  signInWithEmailAndPassword,
  getIdTokenResult,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import {
  Truck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  ArrowRight,
  Globe,
  CheckCircle,
} from 'lucide-react';

// ============================================================================
// TRANSLATIONS
// ============================================================================
const translations = {
  es: {
    title: 'StackBot Driver',
    subtitle: 'Inicia sesión para comenzar a entregar',
    email: 'Correo electrónico',
    emailPlaceholder: 'conductor@ejemplo.com',
    password: 'Contraseña',
    passwordPlaceholder: '••••••••',
    signIn: 'Iniciar Sesión',
    signingIn: 'Iniciando sesión...',
    forgotPassword: '¿Olvidaste tu contraseña?',
    resetSent: 'Correo de recuperación enviado',
    resetSentDesc: 'Revisa tu bandeja de entrada',
    becomeDriver: '¿Quieres ser conductor?',
    applyHere: 'Aplica aquí',
    backToStackBot: '← Volver a StackBot',
    checkingAuth: 'Verificando autenticación...',
    errors: {
      invalidCredential: 'Correo o contraseña incorrectos.',
      tooManyRequests: 'Demasiados intentos. Intenta más tarde.',
      networkError: 'Error de conexión. Verifica tu internet.',
      notDriver: 'Esta cuenta no está registrada como conductor. Contacta a soporte.',
      generic: 'Error al iniciar sesión. Intenta de nuevo.',
      resetFailed: 'Error al enviar correo de recuperación.',
    },
  },
  en: {
    title: 'StackBot Driver',
    subtitle: 'Sign in to start delivering',
    email: 'Email',
    emailPlaceholder: 'driver@example.com',
    password: 'Password',
    passwordPlaceholder: '••••••••',
    signIn: 'Sign In',
    signingIn: 'Signing in...',
    forgotPassword: 'Forgot password?',
    resetSent: 'Reset email sent',
    resetSentDesc: 'Check your inbox',
    becomeDriver: 'Want to become a driver?',
    applyHere: 'Apply here',
    backToStackBot: '← Back to StackBot',
    checkingAuth: 'Checking authentication...',
    errors: {
      invalidCredential: 'Invalid email or password.',
      tooManyRequests: 'Too many attempts. Please try again later.',
      networkError: 'Network error. Please check your connection.',
      notDriver: 'This account is not registered as a driver. Please contact support.',
      generic: 'Failed to log in. Please try again.',
      resetFailed: 'Failed to send reset email.',
    },
  },
};

type Language = 'es' | 'en';

export default function DriverLoginPage() {
  const router = useRouter();
  const [language, setLanguage] = useState<Language>('es');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  const t = translations[language];

  // Load saved language preference
  useEffect(() => {
    const savedLang = localStorage.getItem('stackbot-driver-lang') as Language;
    if (savedLang && (savedLang === 'es' || savedLang === 'en')) {
      setLanguage(savedLang);
    }
  }, []);

  // Save language preference
  const toggleLanguage = () => {
    const newLang = language === 'es' ? 'en' : 'es';
    setLanguage(newLang);
    localStorage.setItem('stackbot-driver-lang', newLang);
  };

  // Check if already logged in as driver
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const token = await getIdTokenResult(user, true);
          if (token.claims.role === 'driver' || token.claims.role === 'admin') {
            router.replace('/driver');
            return;
          }
        } catch (err) {
          console.error('Error checking role:', err);
        }
      }
      setCheckingAuth(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const token = await getIdTokenResult(userCredential.user, true);

      // Verify they have driver role
      if (token.claims.role !== 'driver' && token.claims.role !== 'admin') {
        await auth.signOut();
        setError(t.errors.notDriver);
        setLoading(false);
        return;
      }

      router.push('/driver');
    } catch (err: unknown) {
      console.error('Login error:', err);
      const errorCode = (err as { code?: string })?.code;
      
      if (errorCode === 'auth/invalid-credential' || errorCode === 'auth/user-not-found') {
        setError(t.errors.invalidCredential);
      } else if (errorCode === 'auth/too-many-requests') {
        setError(t.errors.tooManyRequests);
      } else if (errorCode === 'auth/network-request-failed') {
        setError(t.errors.networkError);
      } else {
        setError(t.errors.generic);
      }
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError(language === 'es' ? 'Ingresa tu correo electrónico primero' : 'Enter your email first');
      return;
    }

    setSendingReset(true);
    setError('');

    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
      setTimeout(() => setResetSent(false), 5000);
    } catch (err) {
      console.error('Reset error:', err);
      setError(t.errors.resetFailed);
    } finally {
      setSendingReset(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mx-auto" />
          <p className="text-gray-400 mt-2">{t.checkingAuth}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 flex flex-col">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      {/* Language Toggle - Fixed Top Right */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-2 px-3 py-2 bg-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-xl text-gray-300 hover:bg-gray-700 transition-colors"
        >
          <Globe className="w-4 h-4" />
          <span className="text-sm font-medium">{language === 'es' ? 'EN' : 'ES'}</span>
        </button>
      </div>

      {/* Content */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-4 py-8 safe-top safe-bottom">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
            <Truck className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">{t.title}</h1>
          <p className="text-gray-400 mt-1">{t.subtitle}</p>
        </div>

        {/* Login Card */}
        <div className="w-full max-w-sm">
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50 shadow-xl">
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Error Message */}
              {error && (
                <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              )}

              {/* Reset Sent Message */}
              {resetSent && (
                <div className="flex items-start gap-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-emerald-300">{t.resetSent}</p>
                    <p className="text-xs text-emerald-400/70">{t.resetSentDesc}</p>
                  </div>
                </div>
              )}

              {/* Email Field */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  {t.email}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t.emailPlaceholder}
                    required
                    autoComplete="email"
                    className="w-full pl-11 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-gray-300">
                    {t.password}
                  </label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={sendingReset}
                    className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors disabled:opacity-50"
                  >
                    {sendingReset ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      t.forgotPassword
                    )}
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t.passwordPlaceholder}
                    required
                    autoComplete="current-password"
                    className="w-full pl-11 pr-12 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !email || !password}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-xl transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{t.signingIn}</span>
                  </>
                ) : (
                  <>
                    <span>{t.signIn}</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Bottom Links */}
          <div className="mt-6 text-center space-y-3">
            <p className="text-gray-500 text-sm">
              {t.becomeDriver}{' '}
              <Link href="/driver/apply" className="text-emerald-400 hover:text-emerald-300 font-medium">
                {t.applyHere}
              </Link>
            </p>
            <Link 
              href="/" 
              className="inline-block text-gray-500 hover:text-gray-300 text-sm transition-colors"
            >
              {t.backToStackBot}
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8">
          <Image
            src="/stackbot-logo-purp.png"
            alt="StackBot"
            width={100}
            height={28}
            className="opacity-30"
          />
        </div>
      </div>
    </div>
  );
}