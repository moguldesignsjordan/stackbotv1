"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { auth } from "@/lib/firebase/config";
import { signOut } from "firebase/auth";
import { Shield } from "lucide-react";

import {
  LayoutDashboard,
  Store,
  ShoppingCart,
  Settings,
  LogOut,
  Users,
  BarChart3,
  Tags,
} from "lucide-react";

const navItems = [
  {
    href: "/admin",
    icon: LayoutDashboard,
    label: "Dashboard",
    exact: true,
  },
  {
    href: "/admin/vendors",
    icon: Store,
    label: "Vendors",
  },
  {
    href: "/admin/orders",
    icon: ShoppingCart,
    label: "Orders",
  },
  {
    href: "/admin/customers",
    icon: Users,
    label: "Customers",
  },
  {
    href: "/admin/categories",
    icon: Tags,
    label: "Categories",
  },
  {
    href: "/admin/analytics",
    icon: BarChart3,
    label: "Analytics",
  },

  // 🔐 Admin management (deep route)
  {
    href: "/admin/settings/admins",
    icon: Shield,
    label: "Admins",
  },

  // ⚙️ Settings hub (exact only)
  {
    href: "/admin/settings",
    icon: Settings,
    label: "Settings",
    exact: true,
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-100 min-h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-50">
        <Link href="/admin" className="flex flex-col items-center gap-2">
          <Image
            src="/stackbot-logo-purp.png"
            alt="StackBot"
            width={140}
            height={40}
            priority
          />
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
                  ? "bg-sb-primary/10 text-sb-primary"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
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
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-red-500 hover:bg-red-50 transition-all w-full"
        >
          <LogOut className="h-5 w-5" />
          Logout
        </button>
      </div>
    </aside>
  );
}