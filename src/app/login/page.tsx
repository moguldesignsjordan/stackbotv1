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

// Capacitor imports
import { Capacitor } from "@capacitor/core";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";

// Email validation
const isValidEmail = (email: string) => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

// Error message mapping
const getAuthErrorMessage = (errorCode: string): string => {
  const errorMessages: Record<string, string> = {
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/user-disabled": "This account has been disabled.",
    "auth/user-not-found": "No account found with this email.",
    "auth/wrong-password": "Incorrect password. Please try again.",
    "auth/invalid-credential": "Invalid email or password.",
    "auth/email-already-in-use": "An account already exists with this email.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/network-request-failed": "Network error. Please check your connection.",
    "auth/too-many-requests": "Too many attempts. Please try again later.",
    "auth/popup-closed-by-user": "Sign-in was cancelled.",
    "auth/cancelled-popup-request": "Sign-in was cancelled.",
    "auth/operation-not-allowed": "This sign-in method is not enabled.",
  };
  return errorMessages[errorCode] || "An error occurred. Please try again.";
};

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[#55529d] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const intent = searchParams.get("intent");
  const redirect = searchParams.get("redirect");

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

  // MODIFIED: Accepts explicitName to ensure we save the name before redirecting
  const handleRoleBasedRedirect = async (user: User, isNewUser = false, explicitName?: string) => {
    try {
      const token = await getIdTokenResult(user, true);
      const role = token.claims.role as string | undefined;

      // 1. Check for Special Roles
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

      // 2. CUSTOMER LOGIC - BYPASS ONBOARDING
      // We check if the profile exists. If not, we create it immediately.
      const userRef = doc(db, "customers", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        // Determine the best display name available
        const displayNameToUse = explicitName || user.displayName || (mode === 'signup' ? name : '') || 'App User';

        // Create the profile in the background
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: displayNameToUse,
          role: 'customer',
          onboardingCompleted: true, // Mark as done so we never see the onboarding page
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        // If profile exists, just ensure onboarding is marked true
        if (explicitName && (!userSnap.data().displayName || userSnap.data().displayName === 'App User')) {
             await setDoc(userRef, { displayName: explicitName }, { merge: true });
        }
        await setDoc(userRef, { onboardingCompleted: true }, { merge: true });
      }

      // 3. Redirect DIRECTLY to dashboard/account
      router.push(redirect || "/account");
      
    } catch (e) {
      console.error("Error in redirect:", e);
      router.push("/account");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await handleRoleBasedRedirect(cred.user, false);
    } catch (err: any) {
      console.error("Login error:", err);
      setError(getAuthErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      
      if (name.trim()) {
        await updateProfile(cred.user, { displayName: name.trim() });
      }
      
      // Pass the name from the form to the redirect handler
      await handleRoleBasedRedirect(cred.user, true, name.trim());
    } catch (err: any) {
      console.error("Signup error:", err);
      setError(getAuthErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess("Password reset email sent! Check your inbox.");
      setTimeout(() => setMode("login"), 3000);
    } catch (err: any) {
      console.error("Password reset error:", err);
      setError(getAuthErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  // Google Sign-In
  const handleGoogleAuth = async () => {
    setSocialLoading("google");
    setError("");
    
    try {
      let user: User;
      let isNewUser = false;
      let googleName = "";
      
      // Only use native plugin on iOS - Android Credential Manager is broken in Capacitor 8
      const useNativePlugin = isNative && /iPad|iPhone|iPod/i.test(navigator.userAgent);
      if (useNativePlugin) {
        console.log("Starting native Google Sign-In...");
        const result = await FirebaseAuthentication.signInWithGoogle();
        
        if (!result.credential?.idToken) {
          throw new Error("No credential received from Google Sign-In");
        }
        
        const credential = GoogleAuthProvider.credential(result.credential.idToken);
        const authResult = await signInWithCredential(auth, credential);
        
        user = authResult.user;
        isNewUser = result.additionalUserInfo?.isNewUser ?? false;
        // Try to capture name from native result
        if (result.user?.displayName) googleName = result.user.displayName;

      } else {
        const provider = new GoogleAuthProvider();
        provider.addScope('email');
        provider.addScope('profile');
        
        const result = await signInWithPopup(auth, provider);
        user = result.user;
        
        const userDoc = await getDoc(doc(db, "customers", user.uid));
        isNewUser = !userDoc.exists();
        // Capture name from web result
        if (user.displayName) googleName = user.displayName;
      }
      
      await handleRoleBasedRedirect(user, isNewUser, googleName);
    } catch (err: any) {
      console.error("Google Auth Error:", err);
      if (err.message?.includes("canceled") || 
          err.message?.includes("cancelled") ||
          err.code === "auth/popup-closed-by-user") {
        setSocialLoading(null);
        return;
      }
      setError(getAuthErrorMessage(err.code) || err.message || "Google sign-in failed");
    } finally {
      setSocialLoading(null);
    }
  };

  // Apple Sign-In
  const handleAppleAuth = async () => {
    setSocialLoading("apple");
    setError("");
    
    try {
      let user: User;
      let isNewUser = false;
      let capturedName = ""; 
      


      if (isNative) {
        console.log("Starting native Apple Sign-In...");
        const result = await FirebaseAuthentication.signInWithApple();
        
        if (!result.credential?.idToken) {
          throw new Error("No credential received from Apple Sign-In");
        }
        
        // CAPTURE NAME (Native)
        // FIX: Cast to any to avoid TypeScript error on 'name' property
        const appleUser = result.user as any;
        if (appleUser?.name?.givenName) {
          capturedName = `${appleUser.name.givenName} ${appleUser.name.familyName || ''}`.trim();
        }

        const idToken = result.credential.idToken;
        const rawNonce = result.credential.nonce;
        
        const provider = new OAuthProvider('apple.com');
        const credential = provider.credential({
          idToken: idToken,
          rawNonce: rawNonce,
        });
        
        const authResult = await signInWithCredential(auth, credential);
        user = authResult.user;
        isNewUser = result.additionalUserInfo?.isNewUser ?? false;

      } else {
        const provider = new OAuthProvider('apple.com');
        provider.addScope('email');
        provider.addScope('name');
        
        const result = await signInWithPopup(auth, provider);
        user = result.user;
        
        // CAPTURE NAME (Web) - Apple puts it in _tokenResponse on the very first login
        // @ts-ignore
        const appleProfile = result?._tokenResponse; 
        if (appleProfile?.firstName) {
            capturedName = `${appleProfile.firstName} ${appleProfile.lastName || ''}`.trim();
        }

        const userDoc = await getDoc(doc(db, "customers", user.uid));
        isNewUser = !userDoc.exists();
      }
      
      // Update Firebase Profile immediately if we have the name
      if (user && capturedName) {
        await updateProfile(user, { displayName: capturedName });
      }

      // Pass the captured name to the redirect function so it saves to Firestore
      await handleRoleBasedRedirect(user, isNewUser, capturedName);

    } catch (err: any) {
      console.error("Apple Auth Error:", err);
      if (err.message?.includes("canceled") || 
          err.message?.includes("cancelled") ||
          err.message?.includes("1000") ||
          err.message?.includes("1001")) {
        setSocialLoading(null);
        return;
      }
      const errorMessage = err.message || err.code || "Apple sign-in failed";
      setError(getAuthErrorMessage(err.code) || errorMessage);
    } finally {
      setSocialLoading(null);
    }
  };

  const isLogin = mode === "login";
  const isForgot = mode === "forgot";
  const isSignup = mode === "signup";
  const isAnyLoading = loading || socialLoading !== null;

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-white">
      <div className="flex items-center justify-center p-6 md:p-10 pt-safe">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <div className="md:hidden mb-6">
              <Image 
                src="/stackbot-logo-purp.png" 
                alt="StackBot" 
                width={60} 
                height={60} 
                className="mx-auto"
              />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isForgot ? "Reset Password" : isLogin ? "Welcome Back" : "Create Account"}
            </h1>
            <p className="text-gray-600 mt-2">
              {isForgot 
                ? "Enter your email to receive a reset link" 
                : isLogin 
                  ? "Sign in to continue to StackBot" 
                  : "Join StackBot today"}
            </p>
          </div>

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
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  disabled={isAnyLoading}
                  className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-[#55529d] focus:border-transparent outline-none transition disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={isAnyLoading}
                autoComplete="email"
                className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-[#55529d] focus:border-transparent outline-none transition disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            {!isForgot && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
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
                  Confirm Password
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
                  Forgot password?
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
                  <span>Processing...</span>
                </>
              ) : isForgot ? (
                "Send Reset Link"
              ) : isLogin ? (
                "Sign In"
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          {isForgot && (
            <button
              onClick={() => setMode("login")}
              disabled={isAnyLoading}
              className="w-full text-[#55529d] font-semibold hover:underline disabled:opacity-50"
            >
              ← Back to Sign In
            </button>
          )}

          {!isForgot && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">or continue with</span>
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
                  <span>Continue with Apple</span>
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
                  <span>Continue with Google</span>
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
                {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
              </button>
            </div>
          )}

          {isSignup && (
            <p className="text-xs text-center text-gray-500 mt-4">
              By creating an account, you agree to our{" "}
              <Link href="/terms" className="text-[#55529d] hover:underline">Terms of Service</Link>
              {" "}and{" "}
              <Link href="/privacy" className="text-[#55529d] hover:underline">Privacy Policy</Link>
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
          Shop Local, Delivered Fast
        </h2>
        <p className="text-white/80 text-center max-w-sm">
          Discover amazing local vendors and get your favorites delivered right to your door.
        </p>
      </div>
    </div>
  );
}