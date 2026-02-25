"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { auth } from "@/lib/firebase/config";
import { signOut } from "firebase/auth";
import {
  LayoutDashboard,
  Store,
  ShoppingCart,
  Users,
  Truck,
  Tags,
  BarChart3,
  MessageSquare,
  Shield,
  Settings,
  LogOut,
} from "lucide-react";

/* ────────────────────────────────────────────────────────────
   NAV STRUCTURE — grouped for visual clarity
   ──────────────────────────────────────────────────────────── */

interface NavItem {
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  exact?: boolean;
}

const mainNav: NavItem[] = [
  { href: "/admin", icon: LayoutDashboard, label: "Dashboard", exact: true },
  { href: "/admin/vendors", icon: Store, label: "Vendors" },
  { href: "/admin/orders", icon: ShoppingCart, label: "Orders" },
  { href: "/admin/customers", icon: Users, label: "Customers" },
  { href: "/admin/drivers", icon: Truck, label: "Drivers" },
  { href: "/admin/categories", icon: Tags, label: "Categories" },
];

const toolsNav: NavItem[] = [
  { href: "/admin/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/admin/support", icon: MessageSquare, label: "Support" },
];

const systemNav: NavItem[] = [
  { href: "/admin/settings/admins", icon: Shield, label: "Admins" },
  { href: "/admin/settings", icon: Settings, label: "Settings", exact: true },
];

/* ────────────────────────────────────────────────────────────
   COMPONENT
   ──────────────────────────────────────────────────────────── */

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const renderNavItem = (item: NavItem) => {
    const active = isActive(item.href, item.exact);
    const Icon = item.icon;

    return (
      <Link
        key={item.href}
        href={item.href}
        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
          active
            ? "bg-sb-primary/10 text-sb-primary"
            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        }`}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.5 : 1.8} />
        {item.label}
      </Link>
    );
  };

  const SectionLabel = ({ children }: { children: string }) => (
    <p className="px-4 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
      {children}
    </p>
  );

  return (
    <aside className="w-64 bg-white border-r border-gray-100 min-h-screen flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-gray-50">
        <Link href="/admin" className="flex flex-col items-center gap-1.5">
          <Image
            src="/stackbot-logo-purp.png"
            alt="StackBot"
            width={130}
            height={36}
            priority
          />
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
            Admin
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 pb-4 overflow-y-auto">
        {/* Main */}
        <SectionLabel>Manage</SectionLabel>
        <div className="space-y-0.5">{mainNav.map(renderNavItem)}</div>

        {/* Tools */}
        <SectionLabel>Tools</SectionLabel>
        <div className="space-y-0.5">{toolsNav.map(renderNavItem)}</div>

        {/* System */}
        <SectionLabel>System</SectionLabel>
        <div className="space-y-0.5">{systemNav.map(renderNavItem)}</div>
      </nav>

      {/* Logout */}
      <div className="px-3 py-3 border-t border-gray-50">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-medium text-red-500 hover:bg-red-50 transition-all w-full"
        >
          <LogOut className="h-[18px] w-[18px]" strokeWidth={1.8} />
          Logout
        </button>
      </div>
    </aside>
  );
}