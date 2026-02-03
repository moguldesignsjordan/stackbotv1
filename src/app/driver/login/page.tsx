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
import { isNativePlatform } from '@capacitor/core';
import { Loader2, Mail, Lock, ArrowRight, Truck, Clock, AlertTriangle } from 'lucide-react';

const translations = {
  en: {
    title: 'Driver',
    subtitle: 'Sign in to start delivering',
    email: 'Email',
    password: 'Password',
    signIn: 'Sign In',
    signingIn: 'Signing in...',
    orContinueWith: 'or continue with',
    noAccount: "Don't have an account?",
    signUp: 'Sign up',
    forgotPassword: 'Forgot password?',
    pendingTitle: 'Application Pending',
    pendingMessage: 'Your application is pending review.',
    rejectedTitle: 'Application Rejected',
    rejectedMessage: 'Your application was rejected.',
    noApplicationTitle: 'No Application Found',
    noApplicationMessage: 'We could not find a driver application associated with your account.',
    applyNow: 'Apply Now',
    backHome: 'Back to Home',
  },
  es: {
    title: 'Conductor',
    subtitle: 'Inicia sesión para comenzar a repartir',
    email: 'Correo electrónico',
    password: 'Contraseña',
    signIn: 'Iniciar Sesión',
    signingIn: 'Iniciando...',
    orContinueWith: 'o continúa con',
    noAccount: '¿No tienes una cuenta?',
    signUp: 'Regístrate',
    forgotPassword: '¿Olvidaste tu contraseña?',
    pendingTitle: 'Solicitud Pendiente',
    pendingMessage: 'Tu solicitud está pendiente de revisión.',
    rejectedTitle: 'Solicitud Rechazada',
    rejectedMessage: 'Tu solicitud fue rechazada.',
    noApplicationTitle: 'Solicitud No Encontrada',
    noApplicationMessage: 'No pudimos encontrar una solicitud de conductor asociada con tu cuenta.',
    applyNow: 'Aplicar Ahora',
    backHome: 'Volver al Inicio',
  },
};

type Lang = 'en' | 'es';

export default function DriverLoginPage() {
  const router = useRouter();
  const [language, setLanguage] = useState<Lang>('en');
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
    const checkNative = async () => {
      try {
        const native = await isNativePlatform();
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
      // 1. Already an active driver? (doc exists → isDriver() will be true in rules)
      const driverDoc = await getDoc(doc(db, 'drivers', uid));
      if (driverDoc.exists()) {
        return true;
      }

      // 2. No driver doc — look up their application by uid, fall back to email
      let appSnap = await getDocs(
        query(collection(db, 'driver_applications'), where('uid', '==', uid), limit(1))
      );
      if (appSnap.empty) {
        appSnap = await getDocs(
          query(collection(db, 'driver_applications'), where('email', '==', userEmail), limit(1))
        );
      }

      // 3. No application at all
      if (appSnap.empty) {
        setApplicationStatus('none');
        return false;
      }

      const appData = appSnap.docs[0].data();

      // 4. Application exists but is not approved
      if (appData.status === 'rejected') {
        setApplicationStatus('rejected');
        return false;
      }
      if (appData.status !== 'approved') {
        // pending or any other non-approved state
        setApplicationStatus('pending');
        return false;
      }

      // 5. Approved — create the driver doc so isDriver() resolves via exists()
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

  if (checkingStatus) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#55529d]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-white animate-spin mx-auto mb-4" />
          <p className="text-white">Checking status...</p>
        </div>
      </div>
    );
  }

  if (applicationStatus === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-white p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <Clock className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t.pendingTitle}</h1>
          <p className="text-gray-600 mb-6">{t.pendingMessage}</p>
          <Link href="/" className="inline-block px-6 py-3 bg-[#55529d] text-white rounded-full font-semibold hover:bg-[#47418a] transition-colors">
            {t.backHome}
          </Link>
        </div>
      </div>
    );
  }

  if (applicationStatus === 'rejected') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-white p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t.rejectedTitle}</h1>
          <p className="text-gray-600 mb-6">{t.rejectedMessage}</p>
          <Link href="/" className="inline-block px-6 py-3 bg-[#55529d] text-white rounded-full font-semibold hover:bg-[#47418a] transition-colors">
            {t.backHome}
          </Link>
        </div>
      </div>
    );
  }

  if (applicationStatus === 'none') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <AlertTriangle className="w-16 h-16 text-indigo-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t.noApplicationTitle}</h1>
          <p className="text-gray-600 mb-6">{t.noApplicationMessage}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/driver/apply"
              className="px-6 py-3 bg-[#55529d] text-white rounded-full font-semibold hover:bg-[#47418a] transition-colors inline-flex items-center justify-center"
            >
              {t.applyNow}
            </Link>
            <Link
              href="/"
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-full font-semibold hover:bg-gray-50 transition-colors inline-flex items-center justify-center"
            >
              {t.backHome}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-amber-50 via-white to-[#e5e4ff]">
      <div className="flex flex-1 flex-col md:flex-row max-w-6xl mx-auto w-full">
        <div className="w-full md:w-1/2 flex flex-col justify-center px-6 sm:px-10 py-10">
          <div className="flex justify-between items-center mb-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-[#55529d] rounded-xl flex items-center justify-center">
                <Image src="/stackbot-icon-purple.png" alt="StackBot" width={28} height={28} />
              </div>
              <span className="font-semibold text-lg text-gray-900">StackBot Driver</span>
            </Link>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setLanguage('en')}
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  language === 'en' ? 'bg-[#55529d] text-white' : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('es')}
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  language === 'es' ? 'bg-[#55529d] text-white' : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                ES
              </button>
            </div>
          </div>

          <div className="max-w-md">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              <Truck className="w-7 h-7 text-[#55529d]" />
              {t.title}
            </h1>
            <p className="text-gray-600 mb-8">{t.subtitle}</p>

            {error && (
              <div className="mb-6 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                <AlertTriangle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">{t.email}</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#55529d] focus:border-transparent text-sm"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">{t.password}</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#55529d] focus:border-transparent text-sm"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs sm:text-sm">
                <div />
                <Link href="/driver/forgot-password" className="text-[#55529d] hover:underline">
                  {t.forgotPassword}
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-[#55529d] text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-[#47418a] transition-colors disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t.signingIn}
                  </>
                ) : (
                  <>
                    {t.signIn}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 uppercase tracking-wide">{t.orContinueWith}</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleGoogleLogin}
                disabled={socialLoading === 'google' || loading}
                className="flex-1 flex items-center justify-center gap-2 border border-gray-200 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-60"
              >
                {socialLoading === 'google' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Google...
                  </>
                ) : (
                  <>
                    <Image src="/google-icon.svg" alt="Google" width={18} height={18} />
                    Google
                  </>
                )}
              </button>

              <button
                onClick={handleAppleLogin}
                disabled={socialLoading === 'apple' || loading}
                className="flex-1 flex items-center justify-center gap-2 border border-gray-200 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-60"
              >
                {socialLoading === 'apple' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Apple...
                  </>
                ) : (
                  <>
                    <Image src="/apple-icon.svg" alt="Apple" width={18} height={18} />
                    Apple
                  </>
                )}
              </button>
            </div>

            <div className="mt-6 text-center text-sm text-gray-600">
              {t.noAccount}{' '}
              <Link href="/driver/signup" className="text-[#55529d] font-semibold hover:underline">
                {t.signUp}
              </Link>
            </div>
          </div>
        </div>

        <div className="hidden md:flex flex-col items-center justify-center bg-[#55529d] p-8">
          <Truck className="w-32 h-32 text-white mb-8" />
          <h2 className="text-white text-3xl font-bold text-center mb-4">Start Earning Today</h2>
          <p className="text-white/80 text-center max-w-sm">
            Join the StackBot driver network and deliver happiness to customers in your city.
          </p>
        </div>
      </div>
    </div>
  );
}