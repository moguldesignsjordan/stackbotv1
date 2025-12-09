"use client";

import { useState, useEffect } from "react";
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

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Check if user is coming from "Become a Vendor" link
  const intent = searchParams.get("intent"); // ?intent=vendor
  
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // If coming from vendor signup, default to signup mode
  useEffect(() => {
    if (intent === "vendor") {
      setMode("signup");
    }
  }, [intent]);

  /**
   * Handle role-based redirect after login/signup
   */
  const handleRoleBasedRedirect = async (user: any, isNewUser = false) => {
    // Force token refresh to get latest custom claims
    const token = await getIdTokenResult(user, true);

    console.log("=== AUTH DEBUG ===");
    console.log("User:", user.email);
    console.log("UID:", user.uid);
    console.log("Role:", token.claims.role);
    console.log("Is New User:", isNewUser);
    console.log("Intent:", intent);

    // If this is a new user with vendor intent, go to vendor signup form
    if (isNewUser && intent === "vendor") {
      router.push("/vendor-signup");
      return;
    }

    // Route based on role
    if (token.claims.role === "admin") {
      router.push("/admin");
    } else if (token.claims.role === "vendor") {
      router.push("/vendor");
    } else {
      // No role - could be new user or customer
      // If they came with vendor intent, send to vendor signup
      if (intent === "vendor") {
        router.push("/vendor-signup");
      } else {
        router.push("/");
      }
    }
  };

  /**
   * Handle Login
   */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await handleRoleBasedRedirect(cred.user, false);
    } catch (err: any) {
      console.error("Login error:", err);

      if (err.code === "auth/invalid-credential") {
        setError("Invalid email or password. Please try again.");
      } else if (err.code === "auth/user-not-found") {
        setError("No account found with this email. Please sign up first.");
      } else if (err.code === "auth/wrong-password") {
        setError("Incorrect password. Please try again.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many failed attempts. Please try again later.");
      } else {
        setError(err.message || "Login failed");
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle Signup
   */
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    // Validate password strength
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }

    try {
      // Create the user account
      const cred = await createUserWithEmailAndPassword(auth, email, password);

      // Update display name if provided
      if (name.trim()) {
        await updateProfile(cred.user, { displayName: name.trim() });
      }

      console.log("Account created successfully:", cred.user.uid);

      await handleRoleBasedRedirect(cred.user, true);
    } catch (err: any) {
      console.error("Signup error:", err);

      if (err.code === "auth/email-already-in-use") {
        setError("This email is already registered. Please log in instead.");
      } else if (err.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (err.code === "auth/weak-password") {
        setError("Password is too weak. Use at least 6 characters.");
      } else {
        setError(err.message || "Signup failed");
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle Google Login/Signup
   */
  const handleGoogleAuth = async () => {
    setLoading(true);
    setError("");

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      // Check if this is a new user (Google doesn't tell us directly, but we can check claims)
      const token = await getIdTokenResult(result.user, true);
      const isNewUser = !token.claims.role; // No role means likely new

      await handleRoleBasedRedirect(result.user, isNewUser);
    } catch (err: any) {
      console.error("Google auth error:", err);

      if (err.code === "auth/popup-closed-by-user") {
        setError("Login cancelled. Please try again.");
      } else if (err.code === "auth/popup-blocked") {
        setError("Popup was blocked. Please allow popups for this site.");
      } else {
        setError(err.message || "Google authentication failed");
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle Forgot Password
   */
  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email first.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await sendPasswordResetEmail(auth, email);
      alert("Password reset link sent to your email!");
    } catch (err: any) {
      if (err.code === "auth/user-not-found") {
        setError("No account found with this email.");
      } else {
        setError(err.message || "Failed to send reset email");
      }
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
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">
              {isLogin ? "Welcome Back" : "Create Account"}
            </h1>
            <p className="text-gray-600 mt-2">
              {isLogin
                ? "Sign in to continue"
                : intent === "vendor"
                ? "Create an account to become a vendor"
                : "Sign up to get started"}
            </p>
          </div>

          {/* Vendor Intent Banner */}
          {intent === "vendor" && (
            <div className="bg-purple-50 border border-purple-200 text-purple-700 px-4 py-3 rounded-xl text-sm">
              🏪 You're signing up to become a vendor. After creating your account, you'll fill out your business details.
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={isLogin ? handleLogin : handleSignup} className="space-y-4">
            {/* Name Field (Signup Only) */}
            {!isLogin && (
              <div>
                <label className="block text-gray-700 font-medium mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="Enter your name"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-800 focus:ring-2 focus:ring-sb-primary focus:outline-none"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                />
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-gray-700 font-medium mb-1">
                Email
              </label>
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-800 focus:ring-2 focus:ring-sb-primary focus:outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-gray-700 font-medium mb-1">
                Password
              </label>
              <input
                type="password"
                placeholder={isLogin ? "Enter your password" : "Create a password"}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-800 focus:ring-2 focus:ring-sb-primary focus:outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            {/* Confirm Password (Signup Only) */}
            {!isLogin && (
              <div>
                <label className="block text-gray-700 font-medium mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  placeholder="Confirm your password"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-800 focus:ring-2 focus:ring-sb-primary focus:outline-none"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-sb-primary text-white py-3 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? isLogin
                  ? "Signing in..."
                  : "Creating account..."
                : isLogin
                ? "Sign In"
                : "Create Account"}
            </button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">
                Or continue with
              </span>
            </div>
          </div>

          {/* Google Button */}
          <button
            onClick={handleGoogleAuth}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 border border-gray-300 py-3 rounded-xl font-semibold hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
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
            <span>Google</span>
          </button>

          {/* Toggle Login/Signup */}
          <div className="text-center space-y-2">
            {isLogin ? (
              <>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={loading}
                  className="text-sb-primary text-sm hover:underline disabled:opacity-50"
                >
                  Forgot Password?
                </button>
                <p className="text-gray-600 text-sm">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className="text-sb-primary font-semibold hover:underline"
                  >
                    Sign Up
                  </button>
                </p>
              </>
            ) : (
              <p className="text-gray-600 text-sm">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="text-sb-primary font-semibold hover:underline"
                >
                  Sign In
                </button>
              </p>
            )}
          </div>

          {/* Become a Vendor Link (only show on login mode, not when already in vendor flow) */}
          {isLogin && intent !== "vendor" && (
            <div className="text-center pt-4 border-t border-gray-200">
              <p className="text-gray-600 text-sm">
                Want to sell on StackBot?{" "}
                <Link
                  href="/login?intent=vendor"
                  className="text-sb-primary font-semibold hover:underline"
                >
                  Become a Vendor →
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Right Side - Branding */}
      <div className="hidden md:flex items-center justify-center bg-sb-primary">
        <div className="text-center">
          <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl font-bold text-sb-primary">SB</span>
          </div>
          <h2 className="text-white text-2xl font-bold">StackBot</h2>
          <p className="text-purple-200 mt-2">
            Smart Logistics for the Caribbean
          </p>

          {intent === "vendor" && (
            <div className="mt-6 bg-white/10 rounded-xl p-4 max-w-xs mx-auto">
              <p className="text-white text-sm">
                Join our growing network of vendors and reach more customers across the Caribbean.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}