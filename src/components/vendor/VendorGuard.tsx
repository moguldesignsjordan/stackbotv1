"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase/config";
import { onAuthStateChanged, getIdTokenResult } from "firebase/auth";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface VendorGuardProps {
  children: React.ReactNode;
  fallbackPath?: string;
}

export default function VendorGuard({ 
  children, 
  fallbackPath = "/login" 
}: VendorGuardProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "allowed" | "denied">("loading");
  const [debugInfo, setDebugInfo] = useState<string>("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        console.log("VendorGuard: No user, redirecting to login");
        setStatus("denied");
        router.replace(fallbackPath);
        return;
      }

      try {
        // Force refresh to get latest claims
        const token = await getIdTokenResult(user, true);
        
        console.log("=== VENDOR GUARD DEBUG ===");
        console.log("User:", user.email);
        console.log("UID:", user.uid);
        console.log("Role claim:", token.claims.role);
        
        setDebugInfo(`${user.email} | Role: ${token.claims.role || "none"}`);

        // Allow both vendors AND admins to access vendor pages
        // (admins might want to view vendor dashboard for testing)
        if (token.claims.role === "vendor" || token.claims.role === "admin") {
          setStatus("allowed");
        } else {
          console.log("VendorGuard: User is not vendor, redirecting");
          setStatus("denied");
          router.replace("/");
        }
      } catch (error) {
        console.error("VendorGuard: Error checking role", error);
        setStatus("denied");
        router.replace(fallbackPath);
      }
    });

    return () => unsubscribe();
  }, [router, fallbackPath]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner text="Verifying vendor access..." />
          {debugInfo && (
            <p className="text-xs text-gray-400 mt-2">{debugInfo}</p>
          )}
        </div>
      </div>
    );
  }

  if (status === "denied") {
    return null; // Will redirect
  }

  return <>{children}</>;
}