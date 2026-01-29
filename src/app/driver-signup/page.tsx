// src/app/driver/signup/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
  OAuthProvider,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
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
  User,
  CheckCircle,
} from 'lucide-react';

const translations = {
  es: {
    title: 'Crear Cuenta de Conductor',
    subtitle: 'Regístrate para comenzar el proceso de aplicación',
    fullName: 'Nombre Completo',
    fullNamePlaceholder: 'Juan Pérez',
    email: 'Correo Electrónico',
    emailPlaceholder: 'conductor@ejemplo.com',
    password: 'Contraseña',
    passwordPlaceholder: '••••••••',
    confirmPassword: 'Confirmar Contraseña',
    confirmPasswordPlaceholder: '••••••••',
    createAccount: 'Crear Cuenta',
    creating: 'Creando cuenta...',
    orSignUpWith: 'o regístrate con',
    google: 'Google',
    apple: 'Apple',
    alreadyHaveAccount: '¿Ya tienes cuenta?',
    signIn: 'Iniciar sesión',
    backToApp: 'Volver a StackBot',
    passwordRequirements: 'Mínimo 6 caracteres',
    passwordsDoNotMatch: 'Las contraseñas no coinciden',
    // Success
    accountCreated: '¡Cuenta Creada!',
    continueToApplication: 'Continúa para completar tu solicitud de conductor.',
    goToApplication: 'Completar Solicitud',
    // Errors
    emailInUse: 'Este correo ya está registrado. Intenta iniciar sesión.',
    weakPassword: 'La contraseña debe tener al menos 6 caracteres.',
    invalidEmail: 'Ingresa un correo válido.',
    networkError: 'Error de conexión. Verifica tu internet.',
    unknownError: 'Ocurrió un error. Intenta de nuevo.',
  },
  en: {
    title: 'Create Driver Account',
    subtitle: 'Sign up to start the application process',
    fullName: 'Full Name',
    fullNamePlaceholder: 'John Doe',
    email: 'Email',
    emailPlaceholder: 'driver@example.com',
    password: 'Password',
    passwordPlaceholder: '••••••••',
    confirmPassword: 'Confirm Password',
    confirmPasswordPlaceholder: '••••••••',
    createAccount: 'Create Account',
    creating: 'Creating account...',
    orSignUpWith: 'or sign up with',
    google: 'Google',
    apple: 'Apple',
    alreadyHaveAccount: 'Already have an account?',
    signIn: 'Sign in',
    backToApp: 'Back to StackBot',
    passwordRequirements: 'Minimum 6 characters',
    passwordsDoNotMatch: 'Passwords do not match',
    // Success
    accountCreated: 'Account Created!',
    continueToApplication: 'Continue to complete your driver application.',
    goToApplication: 'Complete Application',
    // Errors
    emailInUse: 'This email is already registered. Try signing in.',
    weakPassword: 'Password must be at least 6 characters.',
    invalidEmail: 'Please enter a valid email.',
    networkError: 'Connection error. Check your internet.',
    unknownError: 'Something went wrong. Please try again.',
  },
};

type Language = 'es' | 'en';

export default function DriverSignupPage() {
  const router = useRouter();
  const [language, setLanguage] = useState<Language>('es');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

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

  const getErrorMessage = (code: string): string => {
    switch (code) {
      case 'auth/email-already-in-use':
        return t.emailInUse;
      case 'auth/weak-password':
        return t.weakPassword;
      case 'auth/invalid-email':
        return t.invalidEmail;
      case 'auth/network-request-failed':
        return t.networkError;
      default:
        return t.unknownError;
    }
  };

  const createUserDocument = async (uid: string, userEmail: string, userName: string) => {
    // Create a basic user document for the driver
    await setDoc(doc(db, 'users', uid), {
      uid,
      email: userEmail,
      displayName: userName,
      role: 'pending_driver', // Will be upgraded to 'driver' after approval
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) return;

    if (password !== confirmPassword) {
      setError(t.passwordsDoNotMatch);
      return;
    }

    if (password.length < 6) {
      setError(t.weakPassword);
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create Firebase Auth account
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      // Update profile with display name
      await updateProfile(user, {
        displayName: fullName.trim(),
      });

      // Create user document in Firestore
      await createUserDocument(user.uid, user.email!, fullName.trim());

      setSuccess(true);
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(getErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setSocialLoading('google');
    setError('');

    try {
      let userCredential;

      if (isNative) {
        const result = await FirebaseAuthentication.signInWithGoogle();
        if (!result.credential?.idToken) {
          throw new Error('No credential received');
        }
        const credential = GoogleAuthProvider.credential(result.credential.idToken);
        userCredential = await signInWithCredential(auth, credential);
      } else {
        const provider = new GoogleAuthProvider();
        userCredential = await signInWithPopup(auth, provider);
      }

      const user = userCredential.user;

      // Create user document in Firestore
      await createUserDocument(user.uid, user.email!, user.displayName || 'Conductor');

      setSuccess(true);
    } catch (err: any) {
      console.error('Google signup error:', err);
      if (!err.message?.includes('canceled') && !err.message?.includes('cancelled') && !err.message?.includes('popup-closed')) {
        setError(err.code ? getErrorMessage(err.code) : t.unknownError);
      }
    } finally {
      setSocialLoading(null);
    }
  };

  const handleAppleSignup = async () => {
    setSocialLoading('apple');
    setError('');

    try {
      let userCredential;

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
        userCredential = await signInWithCredential(auth, credential);
      } else {
        const provider = new OAuthProvider('apple.com');
        provider.addScope('email');
        provider.addScope('name');
        userCredential = await signInWithPopup(auth, provider);
      }

      const user = userCredential.user;

      // Create user document in Firestore
      await createUserDocument(user.uid, user.email!, user.displayName || 'Conductor');

      setSuccess(true);
    } catch (err: any) {
      console.error('Apple signup error:', err);
      if (!err.message?.includes('canceled') && !err.message?.includes('cancelled') && !err.message?.includes('popup-closed')) {
        setError(err.code ? getErrorMessage(err.code) : t.unknownError);
      }
    } finally {
      setSocialLoading(null);
    }
  };

  // Success screen
  if (success) {
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
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">{t.accountCreated}</h2>
            <p className="text-gray-600 mb-6">{t.continueToApplication}</p>
            <Link
              href="/driver/apply"
              className="block w-full py-3 bg-[#55529d] text-white font-semibold rounded-xl hover:bg-[#444280] transition-colors text-center"
            >
              {t.goToApplication}
              <ArrowRight className="w-5 h-5 inline ml-2" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
        <div className="mb-6 text-center">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
            <Truck className="w-8 h-8 text-[#55529d]" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">{t.title}</h1>
          <p className="text-white/70 text-sm">{t.subtitle}</p>
        </div>

        <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleEmailSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t.fullName}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={t.fullNamePlaceholder}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#55529d]/20 focus:border-[#55529d] transition-colors"
                  required
                />
              </div>
            </div>

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
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">{t.passwordRequirements}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t.confirmPassword}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t.confirmPasswordPlaceholder}
                  className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#55529d]/20 focus:border-[#55529d] transition-colors"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !fullName || !email || !password || !confirmPassword}
              className="w-full py-3 bg-[#55529d] text-white font-semibold rounded-xl hover:bg-[#444280] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t.creating}
                </>
              ) : (
                <>
                  {t.createAccount}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-sm text-gray-500">{t.orSignUpWith}</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleGoogleSignup}
              disabled={socialLoading !== null || loading}
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
              onClick={handleAppleSignup}
              disabled={socialLoading !== null || loading}
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
              {t.alreadyHaveAccount}{' '}
              <Link href="/driver/login" className="text-[#55529d] font-semibold hover:underline">
                {t.signIn}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}