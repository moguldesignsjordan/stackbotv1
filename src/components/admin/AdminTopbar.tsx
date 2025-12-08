"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { auth } from "@/lib/firebase/config";
import { signOut } from "firebase/auth";
import {
  Menu,
  Bell,
  Search,
  X,
  LogOut,
  User,
  Settings,
  ChevronDown,
} from "lucide-react";

export default function AdminTopbar() {
  const router = useRouter();
  const [showSearch, setShowSearch] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/admin/search?q=${encodeURIComponent(searchQuery)}`);
      setShowSearch(false);
      setSearchQuery("");
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between h-16 px-4 lg:px-8">
          {/* Left: Logo (mobile) / Search (desktop) */}
          <div className="flex items-center gap-4">
            {/* Mobile Logo */}
            <Link href="/admin" className="lg:hidden">
              <Image
                src="/stackbot-logo-purp.png"
                alt="StackBot"
                width={120}
                height={32}
                priority
              />
            </Link>

            {/* Desktop Search */}
            <form
              onSubmit={handleSearch}
              className="hidden lg:flex items-center"
            >
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search vendors, orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 xl:w-80 pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:bg-white focus:border-sb-primary focus:ring-2 focus:ring-sb-primary/20 outline-none transition"
                />
              </div>
            </form>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Mobile Search Toggle */}
            <button
              onClick={() => setShowSearch(true)}
              className="lg:hidden p-2.5 text-gray-500 hover:bg-gray-50 active:bg-gray-100 rounded-xl transition"
            >
              <Search className="h-5 w-5" />
            </button>

            {/* Notifications */}
            <button className="relative p-2.5 text-gray-500 hover:bg-gray-50 active:bg-gray-100 rounded-xl transition">
              <Bell className="h-5 w-5" />
              {/* Notification dot */}
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            {/* Profile Menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="flex items-center gap-2 p-1.5 pr-3 hover:bg-gray-50 active:bg-gray-100 rounded-xl transition"
              >
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-sb-primary to-violet-600 flex items-center justify-center text-white font-semibold text-sm">
                  A
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400 hidden sm:block" />
              </button>

              {/* Dropdown Menu */}
              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-fade-in">
                    <div className="px-4 py-3 border-b border-gray-50">
                      <p className="font-medium text-gray-900">Admin User</p>
                      <p className="text-sm text-gray-500 truncate">
                        admin@stackbot.com
                      </p>
                    </div>

                    <div className="py-1">
                      <Link
                        href="/admin/profile"
                        onClick={() => setShowMenu(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition"
                      >
                        <User className="h-4 w-4 text-gray-400" />
                        Profile
                      </Link>
                      <Link
                        href="/admin/settings"
                        onClick={() => setShowMenu(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition"
                      >
                        <Settings className="h-4 w-4 text-gray-400" />
                        Settings
                      </Link>
                    </div>

                    <div className="border-t border-gray-50 pt-1">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-red-600 hover:bg-red-50 active:bg-red-100 transition"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Search Overlay */}
      {showSearch && (
        <div className="fixed inset-0 z-50 bg-white lg:hidden animate-fade-in">
          <div className="flex items-center gap-3 p-4 border-b border-gray-100">
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search vendors, orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50 rounded-2xl text-base focus:bg-white focus:ring-2 focus:ring-sb-primary/20 outline-none transition"
                />
              </div>
            </form>
            <button
              onClick={() => {
                setShowSearch(false);
                setSearchQuery("");
              }}
              className="p-2.5 text-gray-500 hover:bg-gray-50 rounded-xl"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Quick Links */}
          <div className="p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Quick Links
            </p>
            <div className="space-y-1">
              {[
                { label: "All Vendors", href: "/admin/vendors" },
                { label: "Pending Approvals", href: "/admin/vendors/pending" },
                { label: "All Orders", href: "/admin/orders" },
                { label: "Customers", href: "/admin/customers" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setShowSearch(false)}
                  className="block px-4 py-3 text-gray-700 hover:bg-gray-50 active:bg-gray-100 rounded-xl transition"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}