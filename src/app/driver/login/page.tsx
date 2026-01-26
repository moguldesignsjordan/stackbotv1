// src/app/driver/login/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
  OAuthProvider,
  getIdTokenResult,
} from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { Capacitor } from '@capacitor/core';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Globe,
  ArrowRight,
  Truck,
} from 'lucide-react';

const translations = {
  es: {
    title: 'StackBot Conductor',
    subtitle: 'Inicia sesión para comenzar a entregar',
    email: 'Correo Electrónico',
    emailPlaceholder: 'conductor@ejemplo.com',
    password: 'Contraseña',
    passwordPlaceholder: '••••••••',
    signIn: 'Iniciar Sesión',
    signingIn: 'Iniciando...',
    orContinueWith: 'o continúa con',
    google: 'Google',
    apple: 'Apple',
    forgotPassword: '¿Olvidaste tu contraseña?',
    notADriver: '¿No eres conductor?',
    applyNow: 'Aplica ahora',
    backToApp: 'Volver a StackBot',
    invalidCredentials: 'Correo o contraseña incorrectos',
    notDriverAccount: 'Esta cuenta no es de conductor. Aplica primero.',
    tooManyRequests: 'Demasiados intentos. Intenta más tarde.',
    networkError: 'Error de conexión. Verifica tu internet.',
    unknownError: 'Ocurrió un error. Intenta de nuevo.',
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
    orContinueWith: 'or continue with',
    google: 'Google',
    apple: 'Apple',
    forgotPassword: 'Forgot password?',
    notADriver: 'Not a driver yet?',
    applyNow: 'Apply now',
    backToApp: 'Back to StackBot',
    invalidCredentials: 'Invalid email or password',
    notDriverAccount: 'This account is not a driver. Apply first.',
    tooManyRequests: 'Too many attempts. Try again later.',
    networkError: 'Connection error. Check your internet.',
    unknownError: 'Something went wrong. Please try again.',
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
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);
  const [error, setError] = useState('');
  
  const isNative = Capacitor.isNativePlatform();
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

  const validateDriverRole = async (): Promise<boolean> => {
    try {
      const user = auth.currentUser;
      if (!user) return false;
      const tokenResult = await getIdTokenResult(user, true);
      return tokenResult.claims.role === 'driver';
    } catch {
      return false;
    }
  };

  const getErrorMessage = (code: string): string => {
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return t.invalidCredentials;
      case 'auth/too-many-requests':
        return t.tooManyRequests;
      case 'auth/network-request-failed':
        return t.networkError;
      default:
        return t.unknownError;
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setLoading(true);
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      
      const isDriver = await validateDriverRole();
      if (!isDriver) {
        await auth.signOut();
        setError(t.notDriverAccount);
        setLoading(false);
        return;
      }

      router.push('/driver/dashboard');
    } catch (err: any) {
      console.error('Sign in error:', err);
      setError(getErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setSocialLoading('google');
    setError('');

    try {
      if (isNative) {
        const result = await FirebaseAuthentication.signInWithGoogle();
        if (!result.credential?.idToken) {
          throw new Error('No credential received');
        }
        const credential = GoogleAuthProvider.credential(result.credential.idToken);
        await signInWithCredential(auth, credential);
      } else {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      }

      const isDriver = await validateDriverRole();
      if (!isDriver) {
        await auth.signOut();
        setError(t.notDriverAccount);
        setSocialLoading(null);
        return;
      }

      router.push('/driver/dashboard');
    } catch (err: any) {
      console.error('Google sign in error:', err);
      if (!err.message?.includes('canceled') && !err.message?.includes('cancelled')) {
        setError(getErrorMessage(err.code));
      }
    } finally {
      setSocialLoading(null);
    }
  };

  const handleAppleSignIn = async () => {
    setSocialLoading('apple');
    setError('');

    try {
      if (isNative) {
        const result = await FirebaseAuthentication.signInWithApple();
        if (!result.credential?.idToken) {
          throw new Error('No credential received');
        }
        const provider = new OAuthProvider('apple.com');
        const credential = provider.credential({
          idToken: result.credential.idToken,
          rawNonce: result.credential.nonce,
        });
        await signInWithCredential(auth, credential);
      } else {
        const provider = new OAuthProvider('apple.com');
        provider.addScope('email');
        provider.addScope('name');
        await signInWithPopup(auth, provider);
      }

      const isDriver = await validateDriverRole();
      if (!isDriver) {
        await auth.signOut();
        setError(t.notDriverAccount);
        setSocialLoading(null);
        return;
      }

      router.push('/driver/dashboard');
    } catch (err: any) {
      console.error('Apple sign in error:', err);
      if (!err.message?.includes('canceled') && !err.message?.includes('cancelled')) {
        setError(getErrorMessage(err.code));
      }
    } finally {
      setSocialLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#55529d] to-[#3d3b7a] flex flex-col">
      <header className="p-4 flex justify-between items-center safe-top">
        <Link href="/" className="text-white/80 hover:text-white text-sm font-medium">
          ← {t.backToApp}
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
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleEmailSignIn} className="space-y-4">
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
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t.password}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.passwordPlaceholder}
                  className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#55529d]/20 focus:border-[#55529d] transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="text-right">
              <Link href="/driver/forgot-password" className="text-sm text-[#55529d] hover:underline">
                {t.forgotPassword}
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full py-3 bg-[#55529d] text-white font-semibold rounded-xl hover:bg-[#444280] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t.signingIn}
                </>
              ) : (
                <>
                  {t.signIn}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-sm text-gray-500">{t.orContinueWith}</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleGoogleSignIn}
              disabled={socialLoading !== null}
              className="flex items-center justify-center gap-2 py-3 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {socialLoading === 'google' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              <span>{t.google}</span>
            </button>

            <button
              onClick={handleAppleSignIn}
              disabled={socialLoading !== null}
              className="flex items-center justify-center gap-2 py-3 bg-black text-white rounded-xl font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {socialLoading === 'apple' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
              )}
              <span>{t.apple}</span>
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              {t.notADriver}{' '}
              <Link href="/driver/apply" className="text-[#55529d] font-semibold hover:underline">
                {t.applyNow}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
