// src/app/vendor/layout.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { auth } from '@/lib/firebase/config';
import { signOut } from 'firebase/auth';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Settings,
  LogOut,
} from 'lucide-react';
import VendorMobileNav from '@/components/vendor/VendorMobileNav';
import VendorTopbar from '@/components/vendor/VendorTopbar';

const navItems = [
  { href: '/vendor', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { href: '/vendor/products', icon: Package, label: 'Products' },
  { href: '/vendor/orders', icon: ShoppingCart, label: 'Orders' },
  { href: '/vendor/settings', icon: Settings, label: 'Settings' },
];

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const logout = async () => {
    await signOut(auth);
    router.replace('/login');
  };

  return (
    <div className="flex min-h-screen bg-sb-bg">
      {/* ================= DESKTOP SIDEBAR ================= */}
      <aside className="hidden lg:flex lg:flex-shrink-0 w-64 bg-white border-r border-gray-100 fixed h-full z-30">
        <div className="flex flex-col w-full">
          {/* Logo */}
          <div className="p-6 border-b border-gray-50">
            <Link href="/vendor" className="flex flex-col items-center gap-2">
              <Image
                src="/stackbot-logo-purp.png"
                alt="StackBot"
                width={140}
                height={40}
                priority
              />
              <p className="text-sm font-semibold text-gray-600">Vendor Portal</p>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => {
              const active = isActive(item.href, item.exact);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                    active
                      ? 'bg-sb-primary/10 text-sb-primary'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-gray-50">
            <button
              onClick={logout}
              className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-red-500 hover:bg-red-50 transition-all w-full"
            >
              <LogOut className="h-5 w-5" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* ================= MAIN CONTENT AREA ================= */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        {/* Topbar with Notification Bell - SINGLE SOURCE OF TRUTH */}
        <VendorTopbar />

        {/* Main Content with proper padding */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto pb-24 lg:pb-8">
          {children}
        </main>
      </div>

      {/* ================= MOBILE BOTTOM NAV ================= */}
      <VendorMobileNav />
    </div>
  );
}