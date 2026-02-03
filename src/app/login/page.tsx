// src/app/driver/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { signInWithEmailAndPassword } from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  query,
  collection,
  where,
  getDocs,
  serverTimestamp,
  limit,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import { Loader2, Mail, Lock, ArrowRight, Truck, Clock, AlertTriangle } from 'lucide-react';

// ============================================================================
// TRANSLATIONS
// ============================================================================
const translations = {
  en: {
    title: 'Driver',
    subtitle: 'Sign in to start delivering',
    email: 'Email',
    password: 'Password',
    signIn: 'Sign In',
    signingIn: 'Signing in...',
    noAccount: "Don't have an account?",
    signUp: 'Sign up',
    forgotPassword: 'Forgot password?',
    pendingTitle: 'Application Pending',
    pendingMessage: 'Your application is pending review. Check back soon.',
    rejectedTitle: 'Application Rejected',
    rejectedMessage: 'Your application was rejected. Please contact support.',
    noApplicationTitle: 'No Application Found',
    noApplicationMessage:
      'We could not find a driver application associated with your account.',
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
    noAccount: '¿No tienes una cuenta?',
    signUp: 'Regístrate',
    forgotPassword: '¿Olvidaste tu contraseña?',
    pendingTitle: 'Solicitud Pendiente',
    pendingMessage: 'Tu solicitud está pendiente de revisión.',
    rejectedTitle: 'Solicitud Rechazada',
    rejectedMessage: 'Tu solicitud fue rechazada.',
    noApplicationTitle: 'Solicitud No Encontrada',
    noApplicationMessage:
      'No pudimos encontrar una solicitud de conductor asociada con tu cuenta.',
    applyNow: 'Aplicar Ahora',
    backHome: 'Volver al Inicio',
  },
};

type Lang = 'en' | 'es';

// ============================================================================
// PAGE
// ============================================================================
export default function DriverLoginPage() {
  const router = useRouter();
  const [language, setLanguage] = useState<Lang>('en');
  const t = translations[language];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [error, setError] = useState('');
  const [applicationStatus, setApplicationStatus] = useState<
    'pending' | 'rejected' | 'none' | null
  >(null);

  // ── helpers ─────────────────────────────────────────────────
  const createDriverDoc = async (
    uid: string,
    userEmail: string,
    displayName: string | null
  ) => {
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
  };

  // ── driver-status check ────────────────────────────────────
  const checkDriverStatus = async (
    userEmail: string,
    uid: string,
    displayName: string | null
  ): Promise<boolean> => {
    setCheckingStatus(true);
    try {
      // 1. Driver doc already exists → fastest path, go straight to dashboard
      const driverDoc = await getDoc(doc(db, 'drivers', uid));
      if (driverDoc.exists()) return true;

      // 2. No driver doc – look for an application (by uid, then by email)
      let appSnap = await getDocs(
        query(
          collection(db, 'driver_applications'),
          where('uid', '==', uid),
          limit(1)
        )
      );
      if (appSnap.empty) {
        appSnap = await getDocs(
          query(
            collection(db, 'driver_applications'),
            where('email', '==', userEmail),
            limit(1)
          )
        );
      }

      // 3. Application exists – honour its status
      if (!appSnap.empty) {
        const status = appSnap.docs[0].data().status;
        if (status === 'rejected') {
          setApplicationStatus('rejected');
          return false;
        }
        if (status !== 'approved') {
          setApplicationStatus('pending');
          return false;
        }
        // Approved – create the driver doc and proceed
        await createDriverDoc(uid, userEmail, displayName);
        return true;
      }

      // 4. No doc, no application – DEV fallback.
      //    Returning drivers whose doc was cleaned up would be permanently
      //    locked out otherwise.  Create the doc and let them through.
      //    TODO: swap this for an approved_drivers lookup before launch.
      console.warn(
        '[DEV] No driver doc or application found – creating driver doc for',
        uid
      );
      await createDriverDoc(uid, userEmail, displayName);
      return true;
    } catch (err) {
      console.error('checkDriverStatus error:', err);
      setError('Failed to verify driver status. Please try again.');
      return false;
    } finally {
      setCheckingStatus(false);
    }
  };

  // ── submit ──────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError('');
    setApplicationStatus(null);

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const ok = await checkDriverStatus(
        cred.user.email!,
        cred.user.uid,
        cred.user.displayName
      );
      if (ok) router.push('/driver');
    } catch (err: any) {
      setError(
        err.code === 'auth/invalid-credential'
          ? 'Invalid email or password'
          : err.message
      );
    } finally {
      setLoading(false);
    }
  };

  // ── status screens ──────────────────────────────────────────
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {t.pendingTitle}
          </h1>
          <p className="text-gray-600 mb-6">{t.pendingMessage}</p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-[#55529d] text-white rounded-full font-semibold hover:bg-[#47418a] transition-colors"
          >
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {t.rejectedTitle}
          </h1>
          <p className="text-gray-600 mb-6">{t.rejectedMessage}</p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-[#55529d] text-white rounded-full font-semibold hover:bg-[#47418a] transition-colors"
          >
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {t.noApplicationTitle}
          </h1>
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

  // ── login form ──────────────────────────────────────────────
  return (
    <div className="min-h-screen flex bg-gradient-to-br from-amber-50 via-white to-[#e5e4ff]">
      <div className="flex flex-1 flex-col md:flex-row max-w-6xl mx-auto w-full">
        {/* ── left panel ── */}
        <div className="w-full md:w-1/2 flex flex-col justify-center px-6 sm:px-10 py-10">
          {/* logo + lang toggle */}
          <div className="flex justify-between items-center mb-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-[#55529d] rounded-xl flex items-center justify-center">
                <Image
                  src="/stackbot-icon-purple.png"
                  alt="StackBot"
                  width={28}
                  height={28}
                />
              </div>
              <span className="font-semibold text-lg text-gray-900">
                StackBot Driver
              </span>
            </Link>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setLanguage('en')}
                className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                  language === 'en'
                    ? 'bg-[#55529d] text-white'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('es')}
                className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                  language === 'es'
                    ? 'bg-[#55529d] text-white'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                ES
              </button>
            </div>
          </div>

          <div className="max-w-sm w-full">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Truck className="w-7 h-7 text-[#55529d]" />
              {t.title}
            </h1>
            <p className="text-gray-500 mb-8">{t.subtitle}</p>

            {/* error banner */}
            {error && (
              <div className="mb-5 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* form */}
            <form onSubmit={handleLogin} className="space-y-4">
              {/* email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t.email}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#55529d] focus:border-transparent text-sm"
                  />
                </div>
              </div>

              {/* password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t.password}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    autoComplete="current-password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#55529d] focus:border-transparent text-sm"
                  />
                </div>
              </div>

              {/* forgot password */}
              <div className="flex justify-end">
                <Link
                  href="/driver/forgot-password"
                  className="text-xs sm:text-sm text-[#55529d] hover:underline"
                >
                  {t.forgotPassword}
                </Link>
              </div>

              {/* submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-[#55529d] text-white py-3 rounded-xl font-semibold text-sm hover:bg-[#47418a] transition-colors disabled:opacity-60"
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

            {/* sign-up link – lives OUTSIDE the form, nothing between it and
                the button so there is no overlap / tap-target issue */}
            <p className="mt-6 text-center text-sm text-gray-600">
              {t.noAccount}{' '}
              <Link
                href="/driver/apply"
                className="text-[#55529d] font-semibold hover:underline"
              >
                {t.signUp}
              </Link>
            </p>
          </div>
        </div>

        {/* ── right panel (desktop only) ── */}
        <div className="hidden md:flex flex-col items-center justify-center bg-[#55529d] p-8">
          <Truck className="w-32 h-32 text-white mb-8" />
          <h2 className="text-white text-3xl font-bold text-center mb-4">
            Start Earning Today
          </h2>
          <p className="text-white/80 text-center max-w-sm">
            Join the StackBot driver network and deliver happiness to customers
            in your city.
          </p>
        </div>
      </div>
    </div>
  );
}