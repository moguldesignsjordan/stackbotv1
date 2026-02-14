"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  getIdTokenResult,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signInWithCredential,
  sendPasswordResetEmail,
  updateProfile,
  User,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";
import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

// Capacitor imports
import { Capacitor } from "@capacitor/core";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";

// Email validation
const isValidEmail = (email: string) => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

// Error message mapping - Spanish first
const getAuthErrorMessage = (errorCode: string, lang: 'en' | 'es'): string => {
  const errorMessages: Record<string, { es: string; en: string }> = {
    "auth/invalid-email": {
      es: "Por favor ingresa un correo electrónico válido.",
      en: "Please enter a valid email address."
    },
    "auth/user-disabled": {
      es: "Esta cuenta ha sido deshabilitada.",
      en: "This account has been disabled."
    },
    "auth/user-not-found": {
      es: "No se encontró una cuenta con este correo.",
      en: "No account found with this email."
    },
    "auth/wrong-password": {
      es: "Contraseña incorrecta. Inténtalo de nuevo.",
      en: "Incorrect password. Please try again."
    },
    "auth/invalid-credential": {
      es: "Correo o contraseña inválidos.",
      en: "Invalid email or password."
    },
    "auth/email-already-in-use": {
      es: "Ya existe una cuenta con este correo.",
      en: "An account already exists with this email."
    },
    "auth/weak-password": {
      es: "La contraseña debe tener al menos 6 caracteres.",
      en: "Password must be at least 6 characters."
    },
    "auth/network-request-failed": {
      es: "Error de red. Verifica tu conexión.",
      en: "Network error. Please check your connection."
    },
    "auth/too-many-requests": {
      es: "Demasiados intentos. Inténtalo más tarde.",
      en: "Too many attempts. Please try again later."
    },
    "auth/popup-closed-by-user": {
      es: "Inicio de sesión cancelado.",
      en: "Sign-in was cancelled."
    },
    "auth/cancelled-popup-request": {
      es: "Inicio de sesión cancelado.",
      en: "Sign-in was cancelled."
    },
    "auth/operation-not-allowed": {
      es: "Este método de inicio de sesión no está habilitado.",
      en: "This sign-in method is not enabled."
    },
  };
  
  const message = errorMessages[errorCode];
  if (message) return message[lang];
  return lang === 'es' 
    ? "Ocurrió un error. Inténtalo de nuevo."
    : "An error occurred. Please try again.";
};

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoadingScreen() {
  const { language } = useLanguage();
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[#55529d] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">
          {language === 'en' ? 'Loading...' : 'Cargando...'}
        </p>
      </div>
    </div>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const intent = searchParams.get("intent");
  const redirect = searchParams.get("redirect");
  const { language, setLanguage } = useLanguage();

  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"google" | "apple" | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());
  }, []);

  useEffect(() => {
    if (intent === "vendor") setMode("signup");
  }, [intent]);

  useEffect(() => {
    setError("");
    setSuccess("");
  }, [mode]);

  const handleRoleBasedRedirect = async (user: User, isNewUser = false, explicitName?: string) => {
    try {
      const token = await getIdTokenResult(user, true);
      const role = token.claims.role as string | undefined;

      if (intent === "vendor") {
        router.push("/vendor-signup");
        return;
      }
      if (role === "admin") {
        router.push("/admin");
        return;
      }
      if (role === "vendor") {
        router.push("/vendor");
        return;
      }

      const userRef = doc(db, "customers", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        const displayNameToUse = explicitName || user.displayName || (mode === 'signup' ? name : '') || 'App User';

        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: displayNameToUse,
          role: 'customer',
          onboardingCompleted: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        if (explicitName && (!userSnap.data().displayName || userSnap.data().displayName === 'App User')) {
             await setDoc(userRef, { displayName: explicitName }, { merge: true });
        }
        await setDoc(userRef, { onboardingCompleted: true }, { merge: true });
      }

      router.push(redirect || "/account");
      
    } catch (e) {
      console.error("Error in redirect:", e);
      router.push("/account");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError(language === 'en' 
        ? "Please fill in all fields."
        : "Por favor completa todos los campos.");
      return;
    }
    if (!isValidEmail(email)) {
      setError(language === 'en' 
        ? "Please enter a valid email address."
        : "Por favor ingresa un correo electrónico válido.");
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await handleRoleBasedRedirect(cred.user, false);
    } catch (err: any) {
      console.error("Login error:", err);
      setError(getAuthErrorMessage(err.code, language));
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !confirmPassword) {
      setError(language === 'en' 
        ? "Please fill in all fields."
        : "Por favor completa todos los campos.");
      return;
    }
    if (!isValidEmail(email)) {
      setError(language === 'en' 
        ? "Please enter a valid email address."
        : "Por favor ingresa un correo electrónico válido.");
      return;
    }
    if (password.length < 6) {
      setError(language === 'en' 
        ? "Password must be at least 6 characters."
        : "La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError(language === 'en' 
        ? "Passwords do not match."
        : "Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      
      if (name.trim()) {
        await updateProfile(cred.user, { displayName: name.trim() });
      }
      
      await handleRoleBasedRedirect(cred.user, true, name.trim());
    } catch (err: any) {
      console.error("Signup error:", err);
      setError(getAuthErrorMessage(err.code, language));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError(language === 'en' 
        ? "Please enter your email address."
        : "Por favor ingresa tu correo electrónico.");
      return;
    }
    if (!isValidEmail(email)) {
      setError(language === 'en' 
        ? "Please enter a valid email address."
        : "Por favor ingresa un correo electrónico válido.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");
    
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess(language === 'en' 
        ? "Password reset email sent! Check your inbox."
        : "¡Correo de restablecimiento enviado! Revisa tu bandeja.");
      setEmail("");
    } catch (err: any) {
      console.error("Password reset error:", err);
      setError(getAuthErrorMessage(err.code, language));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setSocialLoading("google");
    setError("");
    
    try {
      if (isNative) {
        const result = await FirebaseAuthentication.signInWithGoogle();
        const credential = GoogleAuthProvider.credential(result.credential?.idToken);
        const userCred = await signInWithCredential(auth, credential);
        await handleRoleBasedRedirect(userCred.user, false);
      } else {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        await handleRoleBasedRedirect(result.user, false);
      }
    } catch (err: any) {
      console.error("Google auth error:", err);
      setError(getAuthErrorMessage(err.code, language));
    } finally {
      setSocialLoading(null);
    }
  };

  const handleAppleAuth = async () => {
    setSocialLoading("apple");
    setError("");
    
    try {
      if (isNative) {
        const result = await FirebaseAuthentication.signInWithApple();
        const appleProvider = new OAuthProvider('apple.com');
        const credential = appleProvider.credential({
          idToken: result.credential?.idToken,
          rawNonce: result.credential?.nonce,
        });
        const userCred = await signInWithCredential(auth, credential);
        await handleRoleBasedRedirect(userCred.user, false);
      } else {
        const provider = new OAuthProvider('apple.com');
        const result = await signInWithPopup(auth, provider);
        await handleRoleBasedRedirect(result.user, false);
      }
    } catch (err: any) {
      console.error("Apple auth error:", err);
      setError(getAuthErrorMessage(err.code, language));
    } finally {
      setSocialLoading(null);
    }
  };

  const isLogin = mode === "login";
  const isSignup = mode === "signup";
  const isForgot = mode === "forgot";
  const isAnyLoading = loading || socialLoading !== null;

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="flex flex-col items-center justify-center p-6 bg-white">
        <div className="w-full max-w-md space-y-6">
          {/* Logo */}
          <div className="text-center">
            <Link href="/" className="inline-block">
              <Image 
                src="/stackbot-logo-purp.png" 
                alt="StackBot" 
                width={180} 
                height={60} 
                className="mx-auto mb-2"
              />
            </Link>
          </div>

          {/* Language Toggle - Top Right */}
          <div className="flex justify-end">
            <button
              onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-sm"
              title={language === 'en' ? 'Cambiar a Español' : 'Switch to English'}
            >
              <span className="text-base">{language === 'en' ? '🇺🇸' : '🇩🇴'}</span>
              <span className="font-medium text-gray-700">{language === 'en' ? 'EN' : 'ES'}</span>
            </button>
          </div>

          {/* Title */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {isForgot 
                ? (language === 'en' ? 'Reset Password' : 'Restablecer Contraseña')
                : isLogin 
                  ? (language === 'en' ? 'Welcome Back' : 'Bienvenido de Nuevo')
                  : (language === 'en' ? 'Create Account' : 'Crear Cuenta')}
            </h1>
            <p className="text-gray-500">
              {isForgot 
                ? (language === 'en' ? 'Enter your email to reset your password' : 'Ingresa tu correo para restablecer tu contraseña')
                : isLogin 
                  ? (language === 'en' ? 'Sign in to continue' : 'Inicia sesión para continuar')
                  : (language === 'en' ? 'Sign up to get started' : 'Regístrate para comenzar')}
            </p>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-start gap-2">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm flex items-start gap-2">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>{success}</span>
            </div>
          )}

          <form 
            onSubmit={isForgot ? handleForgotPassword : isLogin ? handleLogin : handleSignup} 
            className="space-y-4"
          >
            {isSignup && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  {language === 'en' ? 'Full Name' : 'Nombre Completo'}
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={language === 'en' ? 'John Doe' : 'Juan Pérez'}
                  disabled={isAnyLoading}
                  className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-[#55529d] focus:border-transparent outline-none transition disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                {language === 'en' ? 'Email Address' : 'Correo Electrónico'}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={language === 'en' ? 'you@example.com' : 'tu@ejemplo.com'}
                disabled={isAnyLoading}
                autoComplete="email"
                className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-[#55529d] focus:border-transparent outline-none transition disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            {!isForgot && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  {language === 'en' ? 'Password' : 'Contraseña'}
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isAnyLoading}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-[#55529d] focus:border-transparent outline-none transition disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
            )}

            {isSignup && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  {language === 'en' ? 'Confirm Password' : 'Confirmar Contraseña'}
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isAnyLoading}
                  autoComplete="new-password"
                  className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-[#55529d] focus:border-transparent outline-none transition disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
            )}

            {isLogin && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  disabled={isAnyLoading}
                  className="text-sm text-[#55529d] hover:underline disabled:opacity-50"
                >
                  {language === 'en' ? 'Forgot password?' : '¿Olvidaste tu contraseña?'}
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={isAnyLoading}
              className="w-full bg-[#55529d] text-white py-3 rounded-xl font-semibold hover:bg-[#4a478a] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{language === 'en' ? 'Processing...' : 'Procesando...'}</span>
                </>
              ) : isForgot ? (
                language === 'en' ? 'Send Reset Link' : 'Enviar Enlace'
              ) : isLogin ? (
                language === 'en' ? 'Sign In' : 'Iniciar Sesión'
              ) : (
                language === 'en' ? 'Create Account' : 'Crear Cuenta'
              )}
            </button>
          </form>

          {isForgot && (
            <button
              onClick={() => setMode("login")}
              disabled={isAnyLoading}
              className="w-full text-[#55529d] font-semibold hover:underline disabled:opacity-50"
            >
              {language === 'en' ? '← Back to Sign In' : '← Volver a Iniciar Sesión'}
            </button>
          )}

          {!isForgot && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">
                    {language === 'en' ? 'or continue with' : 'o continuar con'}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleAppleAuth}
                  disabled={isAnyLoading}
                  className="w-full bg-black text-white py-3 rounded-xl flex items-center justify-center gap-3 hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {socialLoading === "apple" ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                    </svg>
                  )}
                  <span>{language === 'en' ? 'Continue with Apple' : 'Continuar con Apple'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={isAnyLoading}
                  className="w-full border border-gray-300 py-3 rounded-xl flex items-center justify-center gap-3 hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {socialLoading === "google" ? (
                    <div className="w-5 h-5 border-2 border-[#55529d] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Image src="/google-icon.png" alt="Google" width={20} height={20} />
                  )}
                  <span>{language === 'en' ? 'Continue with Google' : 'Continuar con Google'}</span>
                </button>
              </div>
            </>
          )}

          {!isForgot && (
            <div className="text-center text-sm">
              <button
                onClick={() => setMode(isLogin ? "signup" : "login")}
                disabled={isAnyLoading}
                className="text-[#55529d] font-semibold hover:underline disabled:opacity-50"
              >
                {isLogin 
                  ? (language === 'en' ? "Don't have an account? Sign Up" : "¿No tienes cuenta? Regístrate")
                  : (language === 'en' ? "Already have an account? Sign In" : "¿Ya tienes cuenta? Inicia Sesión")}
              </button>
            </div>
          )}

          {isSignup && (
            <p className="text-xs text-center text-gray-500 mt-4">
              {language === 'en' 
                ? "By creating an account, you agree to our "
                : "Al crear una cuenta, aceptas nuestros "}
              <Link href="/terms" className="text-[#55529d] hover:underline">
                {language === 'en' ? 'Terms of Service' : 'Términos de Servicio'}
              </Link>
              {language === 'en' ? " and " : " y "}
              <Link href="/privacy" className="text-[#55529d] hover:underline">
                {language === 'en' ? 'Privacy Policy' : 'Política de Privacidad'}
              </Link>
            </p>
          )}
        </div>
      </div>

      <div className="hidden md:flex flex-col items-center justify-center bg-[#55529d] p-8">
        <Image 
          src="/stackbot-logo-white.png" 
          alt="StackBot" 
          width={200} 
          height={200} 
          className="mb-8"
        />
        <h2 className="text-white text-3xl font-bold text-center mb-4">
          {language === 'en' ? 'Shop Local, Delivered Fast' : 'Compra Local, Entrega Rápida'}
        </h2>
        <p className="text-white/80 text-center max-w-sm">
          {language === 'en' 
            ? 'Discover amazing local vendors and get your favorites delivered right to your door.'
            : 'Descubre increíbles vendedores locales y recibe tus favoritos en tu puerta.'}
        </p>
      </div>
    </div>
  );
}