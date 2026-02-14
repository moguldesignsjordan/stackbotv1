'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
  OAuthProvider,
} from 'firebase/auth';
import { doc, getDoc, setDoc, query, collection, where, getDocs, serverTimestamp, limit } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { Capacitor } from '@capacitor/core';
import { Loader2, Mail, Lock, ArrowRight, Truck, AlertTriangle } from 'lucide-react';

const translations = {
  en: {
    title: 'Driver Portal',
    subtitle: 'Sign in to start delivering',
    email: 'Email',
    password: 'Password',
    signIn: 'Sign In',
    signingIn: 'Signing in...',
    orContinueWith: 'Or continue with',
    noAccount: "Don't have an account?",
    signUp: 'Sign up',
    forgotPassword: 'Forgot password?',
    pendingTitle: 'Application Pending',
    pendingMessage: 'Your application is under review. We\'ll notify you soon.',
    rejectedTitle: 'Application Not Approved',
    rejectedMessage: 'Unfortunately, your application was not approved at this time.',
    noApplicationTitle: 'No Application Found',
    noApplicationMessage: 'We couldn\'t find a driver application for your account.',
    applyNow: 'Apply Now',
    backHome: 'Back to Home',
  },
  es: {
    title: 'Portal del Conductor',
    subtitle: 'Inicia sesión para comenzar a repartir',
    email: 'Correo electrónico',
    password: 'Contraseña',
    signIn: 'Iniciar Sesión',
    signingIn: 'Iniciando...',
    orContinueWith: 'O continúa con',
    noAccount: '¿No tienes una cuenta?',
    signUp: 'Regístrate',
    forgotPassword: '¿Olvidaste tu contraseña?',
    pendingTitle: 'Solicitud Pendiente',
    pendingMessage: 'Tu solicitud está en revisión. Te notificaremos pronto.',
    rejectedTitle: 'Solicitud No Aprobada',
    rejectedMessage: 'Lamentablemente, tu solicitud no fue aprobada en este momento.',
    noApplicationTitle: 'Solicitud No Encontrada',
    noApplicationMessage: 'No encontramos una solicitud de conductor para tu cuenta.',
    applyNow: 'Aplicar Ahora',
    backHome: 'Volver al Inicio',
  },
};

type Lang = 'en' | 'es';

export default function DriverLoginPage() {
  const router = useRouter();
  const language: Lang = 'es';
  const t = translations[language];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [error, setError] = useState('');
  const [applicationStatus, setApplicationStatus] = useState<'pending' | 'rejected' | 'none' | null>(null);

  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    // Detect native (Capacitor) platform
    const checkNative = () => {
      try {
        const native = Capacitor.isNativePlatform();
        setIsNative(native);
      } catch {
        setIsNative(false);
      }
    };
    checkNative();
  }, []);

  const checkDriverStatus = async (userEmail: string, uid: string, displayName: string | null): Promise<boolean> => {
    setCheckingStatus(true);
    try {
      // 1. Check if already an active driver
      const driverDoc = await getDoc(doc(db, 'drivers', uid));
      if (driverDoc.exists()) {
        return true;
      }

      // 2. Look up application by uid, fall back to email
      let appSnap = await getDocs(
        query(collection(db, 'driver_applications'), where('uid', '==', uid), limit(1))
      );
      if (appSnap.empty) {
        appSnap = await getDocs(
          query(collection(db, 'driver_applications'), where('email', '==', userEmail), limit(1))
        );
      }

      // 3. No application found
      if (appSnap.empty) {
        setApplicationStatus('none');
        return false;
      }

      const appData = appSnap.docs[0].data();

      // 4. Check application status
      if (appData.status === 'rejected') {
        setApplicationStatus('rejected');
        return false;
      }
      if (appData.status !== 'approved') {
        setApplicationStatus('pending');
        return false;
      }

      // 5. Approved - create driver document
      await setDoc(doc(db, 'drivers', uid), {
        uid,
        email: userEmail,
        name: displayName || '',
        status: 'offline',
        isOnline: false,
        currentLocation: null,
        currentOrderId: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return true;
    } catch (err) {
      console.error('checkDriverStatus error:', err);
      setError('Failed to verify driver status. Please try again.');
      return false;
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError('');
    setApplicationStatus(null);

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const isDriver = await checkDriverStatus(cred.user.email!, cred.user.uid, cred.user.displayName);
      if (isDriver) router.push('/driver');
    } catch (err: any) {
      setError(err.code === 'auth/invalid-credential' ? 'Invalid email or password' : err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setSocialLoading('google');
    setError('');
    setApplicationStatus(null);
    try {
      let cred;
      if (isNative) {
        const result = await FirebaseAuthentication.signInWithGoogle();
        const credential = GoogleAuthProvider.credential(result.credential?.idToken);
        cred = await signInWithCredential(auth, credential);
      } else {
        cred = await signInWithPopup(auth, new GoogleAuthProvider());
      }
      const isDriver = await checkDriverStatus(cred.user.email!, cred.user.uid, cred.user.displayName);
      if (isDriver) router.push('/driver');
    } catch (err: any) {
      if (!err.message?.includes('canceled')) setError('Google sign-in failed');
    } finally {
      setSocialLoading(null);
    }
  };

  const handleAppleLogin = async () => {
    setSocialLoading('apple');
    setError('');
    setApplicationStatus(null);
    try {
      let cred;
      if (isNative) {
        const result = await FirebaseAuthentication.signInWithApple();
        const provider = new OAuthProvider('apple.com');
        const credential = provider.credential({
          idToken: result.credential?.idToken,
        });
        cred = await signInWithCredential(auth, credential);
      } else {
        const provider = new OAuthProvider('apple.com');
        cred = await signInWithPopup(auth, provider);
      }
      const isDriver = await checkDriverStatus(cred.user.email!, cred.user.uid, cred.user.displayName);
      if (isDriver) router.push('/driver');
    } catch (err: any) {
      if (!err.message?.includes('canceled')) setError('Apple sign-in failed');
    } finally {
      setSocialLoading(null);
    }
  };

  // Status screens
  if (checkingStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#55529d]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-white animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Verifying your account...</p>
        </div>
      </div>
    );
  }

  if (applicationStatus === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#55529d] p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center">
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Truck className="w-10 h-10 text-yellow-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">{t.pendingTitle}</h1>
          <p className="text-gray-600 mb-8">{t.pendingMessage}</p>
          <Link href="/" className="inline-block px-8 py-3 bg-[#55529d] text-white rounded-full font-semibold hover:bg-[#47418a] transition-colors shadow-lg">
            {t.backHome}
          </Link>
        </div>
      </div>
    );
  }

  if (applicationStatus === 'rejected') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#55529d] p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">{t.rejectedTitle}</h1>
          <p className="text-gray-600 mb-8">{t.rejectedMessage}</p>
          <Link href="/" className="inline-block px-8 py-3 bg-[#55529d] text-white rounded-full font-semibold hover:bg-[#47418a] transition-colors shadow-lg">
            {t.backHome}
          </Link>
        </div>
      </div>
    );
  }

  if (applicationStatus === 'none') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#55529d] p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center">
          <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Truck className="w-10 h-10 text-[#55529d]" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">{t.noApplicationTitle}</h1>
          <p className="text-gray-600 mb-8">{t.noApplicationMessage}</p>
          <div className="flex flex-col gap-3">
            <Link
              href="/driver/apply"
              className="px-8 py-3 bg-[#55529d] text-white rounded-full font-semibold hover:bg-[#47418a] transition-colors shadow-lg inline-flex items-center justify-center"
            >
              {t.applyNow}
            </Link>
            <Link
              href="/"
              className="px-8 py-3 border-2 border-gray-200 text-gray-700 rounded-full font-semibold hover:bg-gray-50 transition-colors inline-flex items-center justify-center"
            >
              {t.backHome}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#55529d] p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg">
              <Truck className="w-7 h-7 text-[#55529d]" />
            </div>
            <span className="font-bold text-xl text-white">StackBot Driver</span>
          </Link>

          <h1 className="text-3xl font-bold text-white mb-2">{t.title}</h1>
          <p className="text-white/80">{t.subtitle}</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          {error && (
            <div className="mb-6 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleEmailLogin} className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{t.email}</label>
              <div className="relative">
                <Mail className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-gray-200 focus:outline-none focus:border-[#55529d] transition-colors text-gray-900"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{t.password}</label>
              <div className="relative">
                <Lock className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-gray-200 focus:outline-none focus:border-[#55529d] transition-colors text-gray-900"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Link href="/driver/forgot-password" className="text-sm text-[#55529d] hover:underline font-medium">
                {t.forgotPassword}
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[#55529d] text-white py-3.5 rounded-2xl font-semibold hover:bg-[#47418a] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
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

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t-2 border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500 font-medium">{t.orContinueWith}</span>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleGoogleLogin}
              disabled={socialLoading !== null || loading}
              className="w-full flex items-center justify-center gap-3 border-2 border-gray-200 rounded-2xl py-3.5 font-semibold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {socialLoading === 'google' ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            <button
              onClick={handleAppleLogin}
              disabled={socialLoading !== null || loading}
              className="w-full flex items-center justify-center gap-3 border-2 border-gray-200 rounded-2xl py-3.5 font-semibold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {socialLoading === 'apple' ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                  <span>Continue with Apple</span>
                </>
              )}
            </button>
          </div>

          <div className="mt-6 text-center text-sm text-gray-600">
            {t.noAccount}{' '}
            <Link href="/driver/apply" className="text-[#55529d] font-semibold hover:underline">
              {t.signUp}
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <Link href="/" className="text-white/70 hover:text-white text-sm transition-colors">
            ← Back to StackBot
          </Link>
        </div>
      </div>
    </div>
  );
}