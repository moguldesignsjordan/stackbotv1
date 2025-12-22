"use client";

import { useState } from "react";
import { auth } from "@/lib/firebase/config";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Shield, UserPlus, AlertCircle, CheckCircle } from "lucide-react";

type MessageState = {
  type: "success" | "error";
  text: string;
} | null;

export default function AdminsSettingsPage() {
  const [uid, setUid] = useState("");
  const [role, setRole] = useState<"admin" | "vendor" | "customer">("admin");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<MessageState>(null);

  const handleAssignRole = async () => {
    if (!uid.trim()) {
      setMessage({ type: "error", text: "Firebase UID is required" });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("You must be logged in");
      }

      // 🔐 Firebase automatically provides a valid admin token
      const token = await user.getIdToken(true);

      const res = await fetch(
        "https://us-central1-stackbot-a5e78.cloudfunctions.net/setUserRole",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ uid, role }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        let errorMessage = "Failed to assign role";

        if (typeof data?.error === "string") {
          errorMessage = data.error;
        } else if (typeof data?.error?.message === "string") {
          errorMessage = data.error.message;
        } else if (typeof data?.message === "string") {
          errorMessage = data.message;
        }

        throw new Error(errorMessage);
      }

      setMessage({
        type: "success",
        text: `Role '${role}' assigned successfully. User must log out and back in.`,
      });

      setUid("");
    } catch (err: any) {
      console.error("Assign role error:", err);
      setMessage({
        type: "error",
        text: err.message || "Failed to assign role",
      });
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
          <h1 className="text-2xl font-bold text-gray-900">
            Admin Management
          </h1>
          <p className="text-sm text-gray-500">
            Assign roles using Firebase UID
          </p>
        </div>
      </div>

      {/* Form */}
      <Card padding="lg">
        <div className="space-y-4">
          {/* UID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Firebase UID
            </label>
            <input
              value={uid}
              onChange={(e) => setUid(e.target.value)}
              placeholder="e.g. IhI5bpV4ikhhzvQ2FH0BNrJgmTF2"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sb-primary focus:border-sb-primary outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Firebase Console → Authentication → Users
            </p>
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              value={role}
              onChange={(e) =>
                setRole(e.target.value as "admin" | "vendor" | "customer")
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sb-primary focus:border-sb-primary bg-white"
            >
              <option value="admin">Admin</option>
              <option value="vendor">Vendor</option>
              <option value="customer">Customer</option>
            </select>
          </div>

          {/* Message */}
          {message && (
            <div
              className={`flex items-start gap-2 p-4 rounded-xl ${
                message.type === "success"
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {message.type === "success" ? (
                <CheckCircle className="h-5 w-5 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 mt-0.5" />
              )}
              <span className="text-sm">{message.text}</span>
            </div>
          )}

          {/* Button */}
          <Button
            onClick={handleAssignRole}
            disabled={loading || !uid.trim()}
            className="w-full"
          >
            {loading ? (
              "Assigning…"
            ) : (
              <span className="flex items-center justify-center gap-2">
                <UserPlus className="h-4 w-4" />
                Assign Role
              </span>
            )}
          </Button>
        </div>
      </Card>

      {/* Info */}
      <Card padding="md" className="bg-blue-50 border-blue-200">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Important Notes</p>
            <ul className="list-disc list-inside space-y-1">
              <li>User must already exist in Firebase Auth</li>
              <li>User must log out and log back in to receive new role</li>
              <li>Admin role grants full platform access</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
