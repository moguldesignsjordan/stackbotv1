"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, ShoppingCart, Settings } from "lucide-react";

const navItems = [
  {
    href: "/vendor",
    icon: LayoutDashboard,
    label: "Home",
    exact: true,
  },
  {
    href: "/vendor/products",
    icon: Package,
    label: "Products",
  },
  {
    href: "/vendor/orders",
    icon: ShoppingCart,
    label: "Orders",
  },
  {
    href: "/vendor/settings",
    icon: Settings,
    label: "Settings",
  },
];

export default function VendorMobileNav() {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) => {
    return exact ? pathname === href : pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 lg:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href, item.exact);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full px-2 transition ${
                active ? "text-sb-primary" : "text-gray-400"
              }`}
            >
              <div
                className={`p-1.5 rounded-xl ${
                  active ? "bg-sb-primary/10" : ""
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
              </div>
              <span className="text-[10px] mt-0.5 font-medium">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
