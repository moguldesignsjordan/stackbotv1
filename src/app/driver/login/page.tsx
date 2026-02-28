'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithCredential,
  signInWithPhoneNumber,
  GoogleAuthProvider,
  OAuthProvider,
  RecaptchaVerifier,
  ConfirmationResult,
  PhoneAuthProvider,
} from 'firebase/auth';
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
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { Capacitor } from '@capacitor/core';
import {
  Loader2,
  Mail,
  Lock,
  ArrowRight,
  Truck,
  AlertTriangle,
  Phone,
  ArrowLeft,
} from 'lucide-react';

// ============================================================================
// TRANSLATIONS
// ============================================================================
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
    pendingMessage:
      "Your application is under review. We'll notify you soon.",
    rejectedTitle: 'Application Not Approved',
    rejectedMessage:
      'Unfortunately, your application was not approved at this time.',
    noApplicationTitle: 'No Application Found',
    noApplicationMessage:
      "We couldn't find a driver application for your account.",
    applyNow: 'Apply Now',
    backHome: 'Back to Home',
    // Phone / WhatsApp
    phoneTitle: 'Sign in with WhatsApp',
    phoneSubtitle: 'Enter your phone number to receive a code',
    phoneNumber: 'Phone Number',
    phonePlaceholder: '+1 (809) 000-0000',
    sendCode: 'Send Code via WhatsApp',
    sendingCode: 'Sending...',
    verifyCode: 'Verify Code',
    verifying: 'Verifying...',
    otpLabel: 'Verification Code',
    otpPlaceholder: '000000',
    otpSent: 'We sent a 6-digit code to',
    resendCode: 'Resend code',
    resendIn: 'Resend in',
    changeNumber: 'Change number',
    back: 'Back',
    continueWithWhatsApp: 'Continue with WhatsApp',
    continueWithGoogle: 'Continue with Google',
    continueWithApple: 'Continue with Apple',
    invalidPhone: 'Enter a valid phone number (e.g. +18091234567)',
    invalidOtp: 'Enter the 6-digit code',
    otpFailed: 'Invalid code. Please try again.',
    phoneFailed: 'Could not send code. Check the number and try again.',
    connecting: 'Connecting...',
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
    pendingMessage:
      'Tu solicitud está en revisión. Te notificaremos pronto.',
    rejectedTitle: 'Solicitud No Aprobada',
    rejectedMessage:
      'Lamentablemente, tu solicitud no fue aprobada en este momento.',
    noApplicationTitle: 'Solicitud No Encontrada',
    noApplicationMessage:
      'No encontramos una solicitud de conductor para tu cuenta.',
    applyNow: 'Aplicar Ahora',
    backHome: 'Volver al Inicio',
    // Phone / WhatsApp
    phoneTitle: 'Inicia sesión con WhatsApp',
    phoneSubtitle: 'Ingresa tu número para recibir un código',
    phoneNumber: 'Número de Teléfono',
    phonePlaceholder: '+1 (809) 000-0000',
    sendCode: 'Enviar Código por WhatsApp',
    sendingCode: 'Enviando...',
    verifyCode: 'Verificar Código',
    verifying: 'Verificando...',
    otpLabel: 'Código de Verificación',
    otpPlaceholder: '000000',
    otpSent: 'Enviamos un código de 6 dígitos a',
    resendCode: 'Reenviar código',
    resendIn: 'Reenviar en',
    changeNumber: 'Cambiar número',
    back: 'Volver',
    continueWithWhatsApp: 'Continuar con WhatsApp',
    continueWithGoogle: 'Continuar con Google',
    continueWithApple: 'Continuar con Apple',
    invalidPhone: 'Ingresa un número válido (ej. +18091234567)',
    invalidOtp: 'Ingresa el código de 6 dígitos',
    otpFailed: 'Código inválido. Inténtalo de nuevo.',
    phoneFailed: 'No se pudo enviar el código. Verifica el número.',
    connecting: 'Conectando...',
  },
};

type Lang = 'en' | 'es';
type SocialProvider = 'google' | 'apple' | 'phone' | null;
type PhoneStep = 'input' | 'otp';

// ============================================================================
// COMPONENT
// ============================================================================
export default function DriverLoginPage() {
  const router = useRouter();

  // ── Language (syncs with driver/layout.tsx pattern) ─────────────
  const [language, setLanguage] = useState<Lang>('es');
  useEffect(() => {
    try {
      const saved = localStorage.getItem('stackbot-driver-lang') as Lang;
      if (saved === 'en' || saved === 'es') setLanguage(saved);
    } catch {
      // localStorage restricted in some WebView contexts
    }
  }, []);
  const t = translations[language];

  // ── Core auth state ────────────────────────────────────────────
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [error, setError] = useState('');
  const [applicationStatus, setApplicationStatus] = useState<
    'pending' | 'rejected' | 'none' | null
  >(null);
  const [socialLoading, setSocialLoading] = useState<SocialProvider>(null);
  const [isNative, setIsNative] = useState(false);

  // ── Phone / WhatsApp OTP state ─────────────────────────────────
  const [showPhoneLogin, setShowPhoneLogin] = useState(false);
  const [phoneStep, setPhoneStep] = useState<PhoneStep>('input');
  const [phoneNumber, setPhoneNumber] = useState('+1');
  const [otpCode, setOtpCode] = useState('');
  const [confirmationResult, setConfirmationResult] =
    useState<ConfirmationResult | null>(null);
  const [resendTimer, setResendTimer] = useState(0);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);
  const nativeVerificationIdRef = useRef<string | null>(null);

  // ── Platform detection ─────────────────────────────────────────
  useEffect(() => {
    try {
      setIsNative(Capacitor.isNativePlatform());
    } catch {
      setIsNative(false);
    }
  }, []);

  // ── Resend countdown timer ─────────────────────────────────────
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  // ── Cleanup reCAPTCHA + Capacitor listeners on unmount ────────
  useEffect(() => {
    return () => {
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch {
          // ignore
        }
        recaptchaVerifierRef.current = null;
      }
      // Clean up Capacitor phone auth listeners
      try {
        FirebaseAuthentication.removeAllListeners();
      } catch {
        // ignore — may not be available on web
      }
    };
  }, []);

  // ══════════════════════════════════════════════════════════════════
  // CHECK DRIVER STATUS
  // FIX: Now also checks `approved_drivers` whitelist collection
  //      (matching driverAuth.ts logic)
  // ══════════════════════════════════════════════════════════════════
  const checkDriverStatus = useCallback(
    async (
      userEmail: string,
      uid: string,
      displayName: string | null,
      phone?: string | null
    ): Promise<boolean> => {
      setCheckingStatus(true);
      try {
        const normalizedEmail = userEmail.toLowerCase();

        // 1. Already an active driver → pass through
        const driverDoc = await getDoc(doc(db, 'drivers', uid));
        if (driverDoc.exists()) {
          return true;
        }

        // 2. Check approved_drivers whitelist (matching driverAuth.ts)
        try {
          const emailKey = normalizedEmail.replace(/[.]/g, '_');
          const approvedRef = doc(db, 'approved_drivers', emailKey);
          const approvedSnap = await getDoc(approvedRef);
          if (approvedSnap.exists()) {
            const approvedData = approvedSnap.data();
            await setDoc(doc(db, 'drivers', uid), {
              uid,
              userId: uid,
              email: normalizedEmail,
              name: approvedData?.name || displayName || '',
              phone: approvedData?.phone || phone || '',
              city: approvedData?.city || '',
              vehicleType: approvedData?.vehicleType || 'motorcycle',
              vehiclePlate: approvedData?.vehiclePlate || '',
              vehicleColor: approvedData?.vehicleColor || '',
              status: 'approved',
              isOnline: false,
              currentLocation: null,
              currentOrderId: null,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            return true;
          }
        } catch (err) {
          console.error('approved_drivers check error:', err);
        }

        // 3. Look up driver_applications by uid, fall back to email
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
              where('email', '==', normalizedEmail),
              limit(1)
            )
          );
        }

        // Also try by phone if we have it
        if (appSnap.empty && phone) {
          appSnap = await getDocs(
            query(
              collection(db, 'driver_applications'),
              where('phone', '==', phone),
              limit(1)
            )
          );
        }

        // 4. No application found
        if (appSnap.empty) {
          setApplicationStatus('none');
          return false;
        }

        const appData = appSnap.docs[0].data();

        // 5. Check application status
        if (appData.status === 'rejected') {
          setApplicationStatus('rejected');
          return false;
        }
        if (appData.status !== 'approved') {
          setApplicationStatus('pending');
          return false;
        }

        // 6. Approved application → create driver document
        await setDoc(doc(db, 'drivers', uid), {
          uid,
          userId: uid,
          email: normalizedEmail,
          name: appData.fullName || displayName || '',
          phone: appData.phone || phone || '',
          city: appData.city || '',
          vehicleType: appData.vehicleType || 'motorcycle',
          vehiclePlate: appData.vehiclePlate || '',
          vehicleColor: appData.vehicleColor || '',
          status: 'approved',
          isOnline: false,
          currentLocation: null,
          currentOrderId: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        return true;
      } catch (err) {
        console.error('checkDriverStatus error:', err);
        setError(
          language === 'es'
            ? 'Error al verificar tu cuenta. Inténtalo de nuevo.'
            : 'Failed to verify driver status. Please try again.'
        );
        return false;
      } finally {
        setCheckingStatus(false);
      }
    },
    [language]
  );

  // ══════════════════════════════════════════════════════════════════
  // EMAIL / PASSWORD LOGIN
  // ══════════════════════════════════════════════════════════════════
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError('');
    setApplicationStatus(null);

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const isDriver = await checkDriverStatus(
        cred.user.email!,
        cred.user.uid,
        cred.user.displayName
      );
      if (isDriver) router.push('/driver');
    } catch (err: any) {
      setError(
        err.code === 'auth/invalid-credential'
          ? language === 'es'
            ? 'Correo o contraseña inválidos'
            : 'Invalid email or password'
          : err.message
      );
    } finally {
      setLoading(false);
    }
  };

  // ══════════════════════════════════════════════════════════════════
  // GOOGLE LOGIN
  // ══════════════════════════════════════════════════════════════════
  const handleGoogleLogin = async () => {
    setSocialLoading('google');
    setError('');
    setApplicationStatus(null);
    try {
      let cred;
      if (isNative) {
        const result = await FirebaseAuthentication.signInWithGoogle();
        const credential = GoogleAuthProvider.credential(
          result.credential?.idToken
        );
        cred = await signInWithCredential(auth, credential);
      } else {
        cred = await signInWithPopup(auth, new GoogleAuthProvider());
      }
      const isDriver = await checkDriverStatus(
        cred.user.email!,
        cred.user.uid,
        cred.user.displayName
      );
      if (isDriver) router.push('/driver');
    } catch (err: any) {
      if (!err.message?.includes('canceled'))
        setError(
          language === 'es'
            ? 'Error con Google. Inténtalo de nuevo.'
            : 'Google sign-in failed'
        );
    } finally {
      setSocialLoading(null);
    }
  };

  // ══════════════════════════════════════════════════════════════════
  // APPLE LOGIN
  // ══════════════════════════════════════════════════════════════════
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
      const isDriver = await checkDriverStatus(
        cred.user.email!,
        cred.user.uid,
        cred.user.displayName
      );
      if (isDriver) router.push('/driver');
    } catch (err: any) {
      if (!err.message?.includes('canceled'))
        setError(
          language === 'es'
            ? 'Error con Apple. Inténtalo de nuevo.'
            : 'Apple sign-in failed'
        );
    } finally {
      setSocialLoading(null);
    }
  };

  // ══════════════════════════════════════════════════════════════════
  // PHONE / WHATSAPP LOGIN — Step 1: Send OTP
  // ══════════════════════════════════════════════════════════════════
  const initRecaptcha = () => {
    if (recaptchaVerifierRef.current) {
      try {
        recaptchaVerifierRef.current.clear();
      } catch {
        // ignore
      }
    }

    recaptchaVerifierRef.current = new RecaptchaVerifier(
      auth,
      'recaptcha-container',
      {
        size: 'invisible',
        callback: () => {
          // reCAPTCHA solved
        },
        'expired-callback': () => {
          setError(
            language === 'es'
              ? 'Verificación expirada. Inténtalo de nuevo.'
              : 'Verification expired. Please try again.'
          );
        },
      }
    );
  };

  const handleSendOtp = async () => {
    // Validate phone number — must start with + and have 10-15 digits
    const cleaned = phoneNumber.replace(/[\s()-]/g, '');
    if (!/^\+\d{10,15}$/.test(cleaned)) {
      setError(t.invalidPhone);
      return;
    }

    setSocialLoading('phone');
    setError('');
    setApplicationStatus(null);

    try {
      // Native (Capacitor) → use listener-based phone auth (v6+ API)
      if (isNative) {
        // Remove any previous listeners to avoid duplicates
        await FirebaseAuthentication.removeAllListeners();

        // Listen for the verification code being sent
        await FirebaseAuthentication.addListener('phoneCodeSent', (event) => {
          const verificationId = event.verificationId;
          nativeVerificationIdRef.current = verificationId;
          setConfirmationResult({
            verificationId,
            confirm: async (code: string) => {
              const credential = PhoneAuthProvider.credential(
                verificationId,
                code
              );
              return signInWithCredential(auth, credential);
            },
          } as any);
          setPhoneStep('otp');
          setResendTimer(60);
          setTimeout(() => otpInputRef.current?.focus(), 200);
          setSocialLoading(null);
        });

        // Listen for auto-verification (Android instant verify / auto-retrieve)
        await FirebaseAuthentication.addListener(
          'phoneVerificationCompleted',
          async (event) => {
            try {
              const credential = PhoneAuthProvider.credential(
                nativeVerificationIdRef.current || '',
                event.verificationCode || ''
              );
              const cred = await signInWithCredential(auth, credential);
              const user = cred.user;
              const isDriver = await checkDriverStatus(
                user.email || '',
                user.uid,
                user.displayName,
                user.phoneNumber
              );
              if (isDriver) router.push('/driver');
            } catch (err) {
              console.error('Auto-verify error:', err);
              setError(t.otpFailed);
            } finally {
              setSocialLoading(null);
            }
          }
        );

        // Listen for verification failure
        await FirebaseAuthentication.addListener(
          'phoneVerificationFailed',
          (event) => {
            console.error('Phone verification failed:', event.message);
            setError(t.phoneFailed);
            setSocialLoading(null);
          }
        );

        // Trigger the phone auth flow (returns void in v6+)
        await FirebaseAuthentication.signInWithPhoneNumber({
          phoneNumber: cleaned,
        });

        // Don't clear socialLoading here — listeners handle it
        return;
      } else {
        // Web → use reCAPTCHA + signInWithPhoneNumber
        initRecaptcha();
        const confirmation = await signInWithPhoneNumber(
          auth,
          cleaned,
          recaptchaVerifierRef.current!
        );
        setConfirmationResult(confirmation);
        setPhoneStep('otp');
        setResendTimer(60);
        setTimeout(() => otpInputRef.current?.focus(), 200);
      }
    } catch (err: any) {
      console.error('Phone OTP error:', err);
      // Clean up reCAPTCHA on error
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch {
          // ignore
        }
        recaptchaVerifierRef.current = null;
      }
      setError(t.phoneFailed);
    } finally {
      setSocialLoading(null);
    }
  };

  // ══════════════════════════════════════════════════════════════════
  // PHONE / WHATSAPP LOGIN — Step 2: Verify OTP
  // ══════════════════════════════════════════════════════════════════
  const handleVerifyOtp = async () => {
    const code = otpCode.replace(/\s/g, '');
    if (!/^\d{6}$/.test(code)) {
      setError(t.invalidOtp);
      return;
    }
    if (!confirmationResult) {
      setError(t.phoneFailed);
      return;
    }

    setSocialLoading('phone');
    setError('');

    try {
      const cred = await confirmationResult.confirm(code);
      const user = cred.user;
      const isDriver = await checkDriverStatus(
        user.email || '',
        user.uid,
        user.displayName,
        user.phoneNumber
      );
      if (isDriver) router.push('/driver');
    } catch (err: any) {
      console.error('OTP verify error:', err);
      setError(t.otpFailed);
    } finally {
      setSocialLoading(null);
    }
  };

  const handleResendOtp = () => {
    if (resendTimer > 0) return;
    setOtpCode('');
    setPhoneStep('input');
    setConfirmationResult(null);
    setError('');
  };

  const handlePhoneBack = () => {
    setShowPhoneLogin(false);
    setPhoneStep('input');
    setPhoneNumber('+1');
    setOtpCode('');
    setConfirmationResult(null);
    nativeVerificationIdRef.current = null;
    setError('');
    setApplicationStatus(null);
    // Cleanup reCAPTCHA
    if (recaptchaVerifierRef.current) {
      try {
        recaptchaVerifierRef.current.clear();
      } catch {
        // ignore
      }
      recaptchaVerifierRef.current = null;
    }
    // Cleanup Capacitor phone auth listeners
    try {
      FirebaseAuthentication.removeAllListeners();
    } catch {
      // ignore — may not be available on web
    }
  };

  // ══════════════════════════════════════════════════════════════════
  // DERIVED STATE
  // ══════════════════════════════════════════════════════════════════
  const anyLoading = loading || socialLoading !== null;

  // ══════════════════════════════════════════════════════════════════
  // STATUS SCREENS (Checking / Pending / Rejected / None)
  // ══════════════════════════════════════════════════════════════════
  if (checkingStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#55529d]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-white animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">
            {language === 'es'
              ? 'Verificando tu cuenta...'
              : 'Verifying your account...'}
          </p>
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
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            {t.pendingTitle}
          </h1>
          <p className="text-gray-600 mb-8">{t.pendingMessage}</p>
          <Link
            href="/"
            className="inline-block px-8 py-3 bg-[#55529d] text-white rounded-full font-semibold hover:bg-[#47418a] transition-colors shadow-lg"
          >
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
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            {t.rejectedTitle}
          </h1>
          <p className="text-gray-600 mb-8">{t.rejectedMessage}</p>
          <Link
            href="/"
            className="inline-block px-8 py-3 bg-[#55529d] text-white rounded-full font-semibold hover:bg-[#47418a] transition-colors shadow-lg"
          >
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
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            {t.noApplicationTitle}
          </h1>
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

  // ══════════════════════════════════════════════════════════════════
  // PHONE / WHATSAPP LOGIN SCREEN
  // ══════════════════════════════════════════════════════════════════
  if (showPhoneLogin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#55529d] p-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg">
                <Phone className="w-7 h-7 text-[#55529d]" />
              </div>
              <span className="font-bold text-xl text-white">
                StackBot Driver
              </span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {t.phoneTitle}
            </h1>
            <p className="text-white/80">{t.phoneSubtitle}</p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            {error && (
              <div className="mb-6 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {phoneStep === 'input' ? (
              /* ── Phone Number Input ──────────────────────────── */
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t.phoneNumber}
                  </label>
                  <div className="relative">
                    <Phone className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-gray-200 focus:outline-none focus:border-[#55529d] transition-colors text-gray-900 text-lg"
                      placeholder={t.phonePlaceholder}
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-2 ml-1">
                    {language === 'es'
                      ? 'Incluye código de país (+1 para DR/US)'
                      : 'Include country code (+1 for DR/US)'}
                  </p>
                </div>

                <button
                  onClick={handleSendOtp}
                  disabled={socialLoading === 'phone'}
                  className="w-full flex items-center justify-center gap-3 bg-[#25D366] text-white py-3.5 rounded-2xl font-semibold hover:bg-[#1da851] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  {socialLoading === 'phone' ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {t.sendingCode}
                    </>
                  ) : (
                    <>
                      {/* WhatsApp Icon */}
                      <svg
                        className="w-5 h-5"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                      {t.sendCode}
                    </>
                  )}
                </button>
              </div>
            ) : (
              /* ── OTP Verification ───────────────────────────── */
              <div className="space-y-4">
                <div className="text-center mb-2">
                  <p className="text-sm text-gray-500">
                    {t.otpSent}{' '}
                    <span className="font-semibold text-gray-900">
                      {phoneNumber}
                    </span>
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t.otpLabel}
                  </label>
                  <input
                    ref={otpInputRef}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    className="w-full text-center text-2xl tracking-[0.5em] py-3.5 rounded-2xl border-2 border-gray-200 focus:outline-none focus:border-[#55529d] transition-colors text-gray-900 font-mono"
                    placeholder={t.otpPlaceholder}
                    value={otpCode}
                    onChange={(e) =>
                      setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && otpCode.length === 6)
                        handleVerifyOtp();
                    }}
                  />
                </div>

                <button
                  onClick={handleVerifyOtp}
                  disabled={socialLoading === 'phone' || otpCode.length !== 6}
                  className="w-full flex items-center justify-center gap-2 bg-[#55529d] text-white py-3.5 rounded-2xl font-semibold hover:bg-[#47418a] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  {socialLoading === 'phone' ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {t.verifying}
                    </>
                  ) : (
                    <>
                      {t.verifyCode}
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>

                {/* Resend / Change number */}
                <div className="flex items-center justify-between text-sm pt-2">
                  <button
                    onClick={() => {
                      setPhoneStep('input');
                      setOtpCode('');
                      setError('');
                    }}
                    className="text-[#55529d] hover:underline font-medium"
                  >
                    {t.changeNumber}
                  </button>
                  {resendTimer > 0 ? (
                    <span className="text-gray-400">
                      {t.resendIn} {resendTimer}s
                    </span>
                  ) : (
                    <button
                      onClick={handleResendOtp}
                      className="text-[#55529d] hover:underline font-medium"
                    >
                      {t.resendCode}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Back button */}
            <button
              onClick={handlePhoneBack}
              className="mt-6 w-full flex items-center justify-center gap-2 text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {t.back}
            </button>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-white/70 hover:text-white text-sm transition-colors"
            >
              ← Back to StackBot
            </Link>
          </div>
        </div>

        {/* Invisible reCAPTCHA container — required by Firebase Phone Auth on web */}
        <div id="recaptcha-container" ref={recaptchaContainerRef} />
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // MAIN LOGIN SCREEN
  // ══════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#55529d] p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg">
              <Truck className="w-7 h-7 text-[#55529d]" />
            </div>
            <span className="font-bold text-xl text-white">
              StackBot Driver
            </span>
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

          {/* Email / Password Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t.email}
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-gray-200 focus:outline-none focus:border-[#55529d] transition-colors text-gray-900"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t.password}
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-gray-200 focus:outline-none focus:border-[#55529d] transition-colors text-gray-900"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Link
                href="/driver/forgot-password"
                className="text-sm text-[#55529d] hover:underline font-medium"
              >
                {t.forgotPassword}
              </Link>
            </div>

            <button
              type="submit"
              disabled={anyLoading}
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

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t-2 border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500 font-medium">
                {t.orContinueWith}
              </span>
            </div>
          </div>

          {/* Social Buttons */}
          <div className="space-y-3">
            {/* ── WhatsApp / Phone ────────────────────────────── */}
            <button
              onClick={() => {
                setError('');
                setApplicationStatus(null);
                setShowPhoneLogin(true);
              }}
              disabled={anyLoading}
              className="w-full flex items-center justify-center gap-3 bg-[#25D366] text-white rounded-2xl py-3.5 font-semibold hover:bg-[#1da851] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              <span>{t.continueWithWhatsApp}</span>
            </button>

            {/* ── Google ──────────────────────────────────────── */}
            <button
              onClick={handleGoogleLogin}
              disabled={anyLoading}
              className="w-full flex items-center justify-center gap-3 border-2 border-gray-200 rounded-2xl py-3.5 font-semibold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {socialLoading === 'google' ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{t.connecting}</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span>{t.continueWithGoogle}</span>
                </>
              )}
            </button>

            {/* ── Apple ───────────────────────────────────────── */}
            <button
              onClick={handleAppleLogin}
              disabled={anyLoading}
              className="w-full flex items-center justify-center gap-3 border-2 border-gray-200 rounded-2xl py-3.5 font-semibold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {socialLoading === 'apple' ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{t.connecting}</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                  <span>{t.continueWithApple}</span>
                </>
              )}
            </button>
          </div>

          {/* Sign-up link */}
          <div className="mt-6 text-center text-sm text-gray-600">
            {t.noAccount}{' '}
            <Link
              href="/driver/apply"
              className="text-[#55529d] font-semibold hover:underline"
            >
              {t.signUp}
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-white/70 hover:text-white text-sm transition-colors"
          >
            ← Back to StackBot
          </Link>
        </div>
      </div>

      {/* Invisible reCAPTCHA container (must be in DOM for phone auth on web) */}
      <div id="recaptcha-container" ref={recaptchaContainerRef} />
    </div>
  );
}