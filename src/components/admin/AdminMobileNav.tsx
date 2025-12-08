"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Store,
  Package,
  Users,
  Settings,
} from "lucide-react";

const navItems = [
  {
    href: "/admin",
    icon: LayoutDashboard,
    label: "Home",
    exact: true,
  },
  {
    href: "/admin/vendors",
    icon: Store,
    label: "Vendors",
  },
  {
    href: "/admin/orders",
    icon: Package,
    label: "Orders",
  },
  {
    href: "/admin/customers",
    icon: Users,
    label: "Customers",
  },
  {
    href: "/admin/settings",
    icon: Settings,
    label: "Settings",
  },
];

export default function AdminMobileNav() {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 lg:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const active = isActive(item.href, item.exact);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full px-2 transition-colors ${
                active
                  ? "text-sb-primary"
                  : "text-gray-400 active:text-gray-600"
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-colors ${
                  active ? "bg-sb-primary/10" : ""
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
              </div>
              <span
                className={`text-[10px] mt-0.5 font-medium ${
                  active ? "text-sb-primary" : "text-gray-500"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}