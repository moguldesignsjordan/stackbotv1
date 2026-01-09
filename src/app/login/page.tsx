// src/app/login/page.tsx
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
  sendPasswordResetEmail,
  updateProfile,
  // sendEmailVerification, // Removed
  // signOut, // Removed (only used for forcing logout on unverified emails)
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";
import Image from "next/image";
import Link from "next/link";

// Strict Email Validation Regex
const isValidEmail = (email: string) => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading…</div>}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const intent = searchParams.get("intent");
  const redirect = searchParams.get("redirect");

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (intent === "vendor") {
      setMode("signup");
    }
  }, [intent]);

  const handleRoleBasedRedirect = async (user: any, isNewUser = false) => {
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

    if (isNewUser) {
      const onboardingUrl = redirect
        ? `/onboarding?redirect=${encodeURIComponent(redirect)}`
        : "/onboarding";
      router.push(onboardingUrl);
      return;
    }

    try {
      const customerDoc = await getDoc(doc(db, "customers", user.uid));
      if (!customerDoc.exists() || !customerDoc.data()?.onboardingCompleted) {
        const onboardingUrl = redirect
          ? `/onboarding?redirect=${encodeURIComponent(redirect)}`
          : "/onboarding";
        router.push(onboardingUrl);
        return;
      }
    } catch (error) {
      console.error("Error checking customer profile:", error);
    }

    router.push(redirect || "/account");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 1. Sign In
      const cred = await signInWithEmailAndPassword(auth, email, password);

      // 2. Redirect (Removed emailVerified check)
      await handleRoleBasedRedirect(cred.user, false);
    } catch (err: any) {
      console.error("Login error:", err.code, err.message);
      if (err.code === "auth/invalid-credential") setError("Invalid email or password.");
      else if (err.code === "auth/user-not-found") setError("No account found with this email.");
      else if (err.code === "auth/wrong-password") setError("Incorrect password.");
      else if (err.code === "auth/too-many-requests") setError("Too many attempts. Try again later.");
      else setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // 1. Strict Email Format Check
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address (e.g., name@example.com).");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }

    try {
      // 2. Create User
      const cred = await createUserWithEmailAndPassword(auth, email, password);

      // 3. Update Name
      if (name.trim()) {
        await updateProfile(cred.user, { displayName: name.trim() });
      }

      // 4. Redirect immediately (No verification email sent)
      await handleRoleBasedRedirect(cred.user, true);

    } catch (err: any) {
      console.error("Signup error:", err.code, err.message);
      if (err.code === "auth/email-already-in-use") setError("Email already in use. Try logging in instead.");
      else if (err.code === "auth/invalid-email") setError("Invalid email address.");
      else if (err.code === "auth/weak-password") setError("Password must be at least 6 characters.");
      else setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialAuth = async (provider: any) => {
    setLoading(true);
    setError("");
    try {
      const result = await signInWithPopup(auth, provider);
      const customerDoc = await getDoc(doc(db, "customers", result.user.uid));
      const isNewUser = !customerDoc.exists();
      await handleRoleBasedRedirect(result.user, isNewUser);
    } catch (err: any) {
      console.error("Auth error:", err.code, err.message);
      if (err.code === "auth/popup-closed-by-user") setError("Login cancelled.");
      else if (err.code === "auth/popup-blocked") setError("Popup blocked. Please allow popups.");
      else setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAppleAuth = () => {
    const provider = new OAuthProvider('apple.com');
    provider.addScope('email');
    provider.addScope('name');
    handleSocialAuth(provider);
  };

  const handleGoogleAuth = () => {
    handleSocialAuth(new GoogleAuthProvider());
  };

  const handleForgotPassword = async () => {
    if (!email) return setError("Enter your email first.");
    setLoading(true);
    setError("");
    try {
      await sendPasswordResetEmail(auth, email);
      alert("Password reset email sent! Check your inbox.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isLogin = mode === "login";

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-white">
      {/* Left Side - Form */}
      <div className="flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">
              {isLogin ? "Welcome Back" : "Create Account"}
            </h1>
            <p className="text-gray-600 mt-2">
              {isLogin
                ? "Sign in to continue"
                : intent === "vendor"
                ? "Create your vendor account"
                : "Sign up to get started"}
            </p>
          </div>

          {intent === "vendor" && (
            <div className="bg-purple-50 border border-purple-200 text-purple-700 px-4 py-3 rounded-xl text-sm">
              🏪 You're signing up to become a vendor.
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <form onSubmit={isLogin ? handleLogin : handleSignup} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block font-medium mb-1 text-gray-700">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#55529d] focus:border-transparent"
                />
              </div>
            )}

            <div>
              <label className="block font-medium mb-1 text-gray-700">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#55529d] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block font-medium mb-1 text-gray-700">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#55529d] focus:border-transparent"
              />
            </div>

            {!isLogin && (
              <div>
                <label className="block font-medium mb-1 text-gray-700">Confirm Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#55529d] focus:border-transparent"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#55529d] text-white py-3 rounded-xl font-semibold hover:bg-[#444287] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Please wait…" : isLogin ? "Sign In" : "Create Account"}
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">or</span>
            </div>
          </div>

          {/* Social Sign In Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleAppleAuth}
              disabled={loading}
              className="w-full bg-black text-white py-3 rounded-xl flex items-center justify-center gap-3 hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74 1.18 0 2.45-1.02 3.93-.83 1.25.1 2.37.66 3.01 1.62-2.67 1.62-2.22 5.56.34 6.71-.52 1.34-1.22 2.7-2.36 4.73zM12.04 5.16c.55-1.54 1.84-2.6 3.32-2.6.24 1.65-1.54 3.12-3.32 2.6z" />
              </svg>
              <span className="font-medium">Continue with Apple</span>
            </button>

            <button
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full border border-gray-300 py-3 rounded-xl flex items-center justify-center gap-3 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Image 
                src="/google-icon.png" 
                alt="Google" 
                width={20} 
                height={20}
                className="w-5 h-auto"
              />
              <span className="font-medium">Continue with Google</span>
            </button>
          </div>

          <div className="text-center text-sm">
            {isLogin ? (
              <>
                <button
                  onClick={handleForgotPassword}
                  disabled={loading}
                  className="text-[#55529d] hover:underline"
                >
                  Forgot password?
                </button>
                <p className="mt-3">
                  Don't have an account?{" "}
                  <button
                    onClick={() => setMode("signup")}
                    className="text-[#55529d] font-semibold hover:underline"
                  >
                    Sign Up
                  </button>
                </p>
              </>
            ) : (
              <p>
                Already have an account?{" "}
                <button
                  onClick={() => setMode("login")}
                  className="text-[#55529d] font-semibold hover:underline"
                >
                  Sign In
                </button>
              </p>
            )}
          </div>

          {isLogin && intent !== "vendor" && (
            <div className="text-center pt-4 border-t text-sm">
              Want to sell on StackBot?{" "}
              <Link href="/login?intent=vendor" className="text-[#55529d] font-semibold hover:underline">
                Become a Vendor →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Right Side - Branding */}
      <div className="hidden md:flex flex-col items-center justify-center bg-[#55529d] p-8">
        <Image
          src="/stackbot-logo-white.png"
          alt="StackBot Logo"
          width={200}
          height={200}
          className="object-contain drop-shadow-lg mb-8 w-auto h-auto"
          priority
        />
        <h2 className="text-white text-2xl font-bold text-center mb-3">
          Shop Local, Delivered Fast
        </h2>
        <p className="text-white/80 text-center max-w-sm">
          Discover amazing vendors in your area and get your favorites delivered right to your door.
        </p>
      </div>
    </div>
  );
}