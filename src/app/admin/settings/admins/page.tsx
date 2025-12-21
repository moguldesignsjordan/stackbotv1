"use client";

import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions, auth } from "@/lib/firebase/config";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Shield, UserPlus, AlertCircle, CheckCircle } from "lucide-react";

export default function AdminsSettingsPage() {
  const [uid, setUid] = useState("");
  const [role, setRole] = useState<"admin" | "vendor" | "customer">("admin");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleAssignRole = async () => {
    if (!uid.trim()) {
      setMessage({ type: "error", text: "Firebase UID is required" });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // ⭐ CRITICAL: Force refresh the token BEFORE calling the function
      // This ensures the callable receives a token with current admin claims
      const user = auth.currentUser;
      if (!user) {
        setMessage({ type: "error", text: "You must be logged in" });
        setLoading(false);
        return;
      }

      console.log("=== SET USER ROLE DEBUG ===");
      console.log("Current user:", user.email);
      console.log("Target UID:", uid);
      console.log("Target role:", role);

      // Force token refresh to get latest claims
      const freshToken = await user.getIdToken(true);
      console.log("Token refreshed successfully");

      // Now call the function with the fresh token
      const setUserRole = httpsCallable(functions, "setUserRole");
      const result = await setUserRole({ uid, role });

      console.log("Result:", result.data);

      setMessage({
        type: "success",
        text: `Role '${role}' assigned successfully! User must log out and back in for changes to take effect.`,
      });
      setUid("");
    } catch (err: any) {
      console.error("setUserRole error:", err);

      // Extract meaningful error message
      let errorMsg = "Failed to assign role";
      if (err.code === "functions/permission-denied") {
        errorMsg = "Permission denied. Your admin token may be stale - try logging out and back in.";
      } else if (err.message) {
        errorMsg = err.message;
      }

      setMessage({ type: "error", text: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-sb-primary/10 text-sb-primary">
          <Shield className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Management</h1>
          <p className="text-sm text-gray-500">
            Assign roles using Firebase UID
          </p>
        </div>
      </div>

      {/* Card */}
      <Card padding="lg">
        <div className="space-y-4">
          {/* UID Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Firebase UID
            </label>
            <input
              value={uid}
              onChange={(e) => setUid(e.target.value)}
              placeholder="e.g. IhI5bpV4ikhhzvQ2FH0BNrJgmTF2"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sb-primary focus:border-sb-primary outline-none transition-colors"
            />
            <p className="text-xs text-gray-500 mt-1">
              Find this in Firebase Console → Authentication → Users
            </p>
          </div>

          {/* Role Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              value={role}
              onChange={(e) =>
                setRole(e.target.value as "admin" | "vendor" | "customer")
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sb-primary focus:border-sb-primary outline-none transition-colors bg-white"
            >
              <option value="admin">Admin</option>
              <option value="vendor">Vendor</option>
              <option value="customer">Customer</option>
            </select>
          </div>

          {/* Status Message */}
          {message && (
            <div
              className={`flex items-start gap-2 p-4 rounded-xl ${
                message.type === "success"
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {message.type === "success" ? (
                <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              )}
              <span className="text-sm">{message.text}</span>
            </div>
          )}

          {/* Submit Button */}
          <Button
            onClick={handleAssignRole}
            disabled={loading || !uid.trim()}
            className="w-full"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Assigning Role...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <UserPlus className="h-4 w-4" />
                Assign Role
              </span>
            )}
          </Button>
        </div>
      </Card>

      {/* Help Info */}
      <Card padding="md" className="bg-blue-50 border-blue-200">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Important Notes:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>Users must log out and back in after role changes</li>
              <li>Only existing Firebase Auth users can be assigned roles</li>
              <li>Admin role grants full platform access</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}