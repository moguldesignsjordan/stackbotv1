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
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";
import Image from "next/image";
import Link from "next/link";

// 1. IMPORT CAPACITOR UTILS
import { Capacitor } from "@capacitor/core";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";

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
    if (intent === "vendor") setMode("signup");
  }, [intent]);

  // --- SHARED REDIRECT LOGIC ---
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
      const onboardingUrl = redirect ? `/onboarding?redirect=${encodeURIComponent(redirect)}` : "/onboarding";
      router.push(onboardingUrl);
      return;
    }

    // Check if onboarding is complete
    try {
      const customerDoc = await getDoc(doc(db, "customers", user.uid));
      if (!customerDoc.exists() || !customerDoc.data()?.onboardingCompleted) {
        const onboardingUrl = redirect ? `/onboarding?redirect=${encodeURIComponent(redirect)}` : "/onboarding";
        router.push(onboardingUrl);
        return;
      }
    } catch (e) {
      console.error(e);
    }

    router.push(redirect || "/account");
  };

  // --- AUTH HANDLERS ---

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await handleRoleBasedRedirect(cred.user, false);
    } catch (err: any) {
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    if (password !== confirmPassword) { setError("Passwords do not match."); setLoading(false); return; }
    
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (name.trim()) await updateProfile(cred.user, { displayName: name.trim() });
      await handleRoleBasedRedirect(cred.user, true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- NATIVE & WEB SOCIAL LOGIN ---

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError("");
    
    try {
      // 1. Check if running in Mobile App
      if (Capacitor.isNativePlatform()) {
        const result = await FirebaseAuthentication.signInWithGoogle();
        const credential = GoogleAuthProvider.credential(result.credential?.idToken);
        const authResult = await signInWithCredential(auth, credential);
        
        const userDoc = await getDoc(doc(db, "customers", authResult.user.uid));
        await handleRoleBasedRedirect(authResult.user, !userDoc.exists());
      } else {
        // 2. Web Fallback
        const result = await signInWithPopup(auth, new GoogleAuthProvider());
        const userDoc = await getDoc(doc(db, "customers", result.user.uid));
        await handleRoleBasedRedirect(result.user, !userDoc.exists());
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleAppleAuth = async () => {
    setLoading(true);
    setError("");
    try {
      if (Capacitor.isNativePlatform()) {
        const result = await FirebaseAuthentication.signInWithApple();
        const provider = new OAuthProvider('apple.com');
        const credential = provider.credential({
          idToken: result.credential?.idToken,
          rawNonce: (result.credential as any)?.rawNonce,
        });
        const authResult = await signInWithCredential(auth, credential);
        const userDoc = await getDoc(doc(db, "customers", authResult.user.uid));
        await handleRoleBasedRedirect(authResult.user, !userDoc.exists());
      } else {
        const provider = new OAuthProvider('apple.com');
        provider.addScope('email');
        provider.addScope('name');
        const result = await signInWithPopup(auth, provider);
        const userDoc = await getDoc(doc(db, "customers", result.user.uid));
        await handleRoleBasedRedirect(result.user, !userDoc.exists());
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const isLogin = mode === "login";

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-white">
      <div className="flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">{isLogin ? "Welcome Back" : "Create Account"}</h1>
          </div>

          {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}

          <form onSubmit={isLogin ? handleLogin : handleSignup} className="space-y-4">
            {!isLogin && <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full Name" className="w-full border p-3 rounded-xl" />}
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full border p-3 rounded-xl" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full border p-3 rounded-xl" />
            {!isLogin && <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm Password" className="w-full border p-3 rounded-xl" />}
            
            <button type="submit" disabled={loading} className="w-full bg-[#55529d] text-white py-3 rounded-xl font-semibold">
              {loading ? "Processing..." : isLogin ? "Sign In" : "Create Account"}
            </button>
          </form>

          <div className="flex justify-center text-sm"><span className="px-4 bg-white text-gray-500">or</span></div>

          <div className="space-y-3">
            <button onClick={handleAppleAuth} className="w-full bg-black text-white py-3 rounded-xl flex justify-center gap-3">
              <span>Continue with Apple</span>
            </button>
            <button onClick={handleGoogleAuth} className="w-full border border-gray-300 py-3 rounded-xl flex justify-center gap-3">
              <Image src="/google-icon.png" alt="G" width={20} height={20} />
              <span>Continue with Google</span>
            </button>
          </div>

          <div className="text-center text-sm mt-4">
            <button onClick={() => setMode(isLogin ? "signup" : "login")} className="text-[#55529d] font-semibold hover:underline">
              {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
            </button>
          </div>
        </div>
      </div>
      <div className="hidden md:flex flex-col items-center justify-center bg-[#55529d] p-8">
        <Image src="/stackbot-logo-white.png" alt="StackBot" width={200} height={200} className="mb-8" />
        <h2 className="text-white text-2xl font-bold">Shop Local, Delivered Fast</h2>
      </div>
    </div>
  );
}