"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import {
  Shield,
  User,
  Lock,
  Settings as SettingsIcon,
} from "lucide-react";

export default function AdminSettingsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <header className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-sb-primary/10 text-sb-primary">
          <SettingsIcon className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500">
            Manage admin access and platform configuration
          </p>
        </div>
      </header>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Admins */}
        <Link href="/admin/settings/admins">
          <Card padding="lg" hover className="cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-purple-100 text-sb-primary">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Admins</p>
                <p className="text-sm text-gray-500">
                  Promote or remove admin users
                </p>
              </div>
            </div>
          </Card>
        </Link>

        {/* Profile (future-ready) */}
        <Card padding="lg" className="opacity-60">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gray-100 text-gray-500">
              <User className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-gray-700">Profile</p>
              <p className="text-sm text-gray-500">
                Update admin profile (coming soon)
              </p>
            </div>
          </div>
        </Card>

        {/* Security (future-ready) */}
        <Card padding="lg" className="opacity-60">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gray-100 text-gray-500">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-gray-700">Security</p>
              <p className="text-sm text-gray-500">
                Roles & permissions (coming soon)
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
