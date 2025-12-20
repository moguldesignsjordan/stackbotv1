"use client";

import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/config";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Shield, UserPlus } from "lucide-react";

export default function AdminsSettingsPage() {
  const [uid, setUid] = useState("");
  const [role, setRole] = useState<"admin" | "vendor" | "customer">("admin");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleAssignRole = async () => {
    if (!uid.trim()) {
      setMessage("❌ Firebase UID is required");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const setUserRole = httpsCallable(functions, "setUserRole");
      await setUserRole({ uid, role });

      setMessage(`✅ Role '${role}' assigned successfully`);
      setUid("");
    } catch (err: any) {
      console.error(err);
      setMessage(err.message || "❌ Failed to assign role");
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

      {/* Card */}
      <Card padding="lg">
        <div className="space-y-4">
          {/* UID */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Firebase UID
            </label>
            <input
              value={uid}
              onChange={(e) => setUid(e.target.value)}
              placeholder="IhI5bpV4ikhhzvQ2FH0BNrJgmTF2"
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-sb-primary outline-none"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Assign Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-sb-primary outline-none"
            >
              <option value="admin">Admin</option>
              <option value="vendor">Vendor</option>
              <option value="customer">Customer</option>
            </select>
          </div>

          {/* Button */}
          <Button
            onClick={handleAssignRole}
            loading={loading}
            variant="primary"
            size="lg"
            className="w-full flex items-center justify-center gap-2"
          >
            <UserPlus className="h-5 w-5" />
            Assign Role
          </Button>

          {message && (
            <p className="text-sm text-center font-medium">{message}</p>
          )}
        </div>
      </Card>
    </div>
  );
}
