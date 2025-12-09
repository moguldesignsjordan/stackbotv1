"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  getIdTokenResult,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  updateProfile,
} from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import Image from "next/image";
import Link from "next/link";

/**
 * 🔥 Wrapper required for Vercel
 * useSearchParams() MUST be inside <Suspense> or build will fail.
 */
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading…</div>}>
      <LoginPageInner />
    </Suspense>
  );
}

/**
 * 🔥 Actual Login Component Logic
 */
function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const intent = searchParams.get("intent"); // ?intent=vendor

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

    if (isNewUser && intent === "vendor") {
      router.push("/vendor-signup");
      return;
    }

    if (token.claims.role === "admin") router.push("/admin");
    else if (token.claims.role === "vendor") router.push("/vendor");
    else if (intent === "vendor") router.push("/vendor-signup");
    else router.push("/");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await handleRoleBasedRedirect(cred.user, false);
    } catch (err: any) {
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
      const cred = await createUserWithEmailAndPassword(auth, email, password);

      if (name.trim()) {
        await updateProfile(cred.user, { displayName: name.trim() });
      }

      await handleRoleBasedRedirect(cred.user, true);
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") setError("Email already in use.");
      else if (err.code === "auth/invalid-email") setError("Invalid email.");
      else if (err.code === "auth/weak-password") setError("Weak password.");
      else setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError("");

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      const token = await getIdTokenResult(result.user, true);
      const isNewUser = !token.claims.role;

      await handleRoleBasedRedirect(result.user, isNewUser);
    } catch (err: any) {
      if (err.code === "auth/popup-closed-by-user") setError("Login cancelled.");
      else if (err.code === "auth/popup-blocked") setError("Popup blocked.");
      else setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) return setError("Enter your email first.");

    setLoading(true);
    setError("");

    try {
      await sendPasswordResetEmail(auth, email);
      alert("Password reset email sent!");
    } catch (err: any) {
      if (err.code === "auth/user-not-found") setError("No account with this email.");
      else setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isLogin = mode === "login";

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-white">
      {/* Left Side */}
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
                <label className="block font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border rounded-xl px-4 py-3"
                />
              </div>
            )}

            <div>
              <label className="block font-medium mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border rounded-xl px-4 py-3"
              />
            </div>

            <div>
              <label className="block font-medium mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border rounded-xl px-4 py-3"
              />
            </div>

            {!isLogin && (
              <div>
                <label className="block font-medium mb-1">Confirm Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full border rounded-xl px-4 py-3"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-sb-primary text-white py-3 rounded-xl font-semibold"
            >
              {loading ? "Please wait…" : isLogin ? "Sign In" : "Create Account"}
            </button>
          </form>

          <button
            onClick={handleGoogleAuth}
            disabled={loading}
            className="w-full border py-3 rounded-xl flex items-center justify-center gap-3"
          >
            <Image src="/google-icon.png" alt="Google" width={20} height={20} />
            <span>Continue with Google</span>
          </button>

          <div className="text-center text-sm">
            {isLogin ? (
              <>
                <button
                  onClick={handleForgotPassword}
                  className="text-sb-primary hover:underline"
                >
                  Forgot password?
                </button>
                <p className="mt-2">
                </p>
              </>
            ) : (
              <p>
                Already have an account?{" "}
                <button
                  onClick={() => setMode("login")}
                  className="text-sb-primary font-semibold hover:underline"
                >
                  Sign In
                </button>
              </p>
            )}
          </div>

          {isLogin && intent !== "vendor" && (
            <div className="text-center pt-4 border-t text-sm">
              Want to sell on StackBot?{" "}
              <Link href="/login?intent=vendor" className="text-sb-primary font-semibold">
                Become a Vendor →
              </Link>
            </div>
          )}

        </div>
      </div>

      {/* Right Side Design */}
      <div className="hidden md:flex items-center justify-center bg-sb-primary p-8">
        <Image
          src="/stackbot-logo-white.png"
          alt="StackBot Logo"
          width={200}
          height={200}
          className="object-contain drop-shadow-md"
        />
      </div>
    </div>
  );
}
