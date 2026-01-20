// src/components/customer/CustomerMobileNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { Home, Compass, Package, User } from "lucide-react";

const navItems = [
  {
    href: "/",
    icon: Home,
    labelEn: "Home",
    labelEs: "Inicio",
    exact: true,
  },
  {
    href: "/vendors",
    icon: Compass,
    labelEn: "Browse",
    labelEs: "Explorar",
  },
  {
    href: "/account",
    icon: Package,
    labelEn: "Orders",
    labelEs: "Pedidos",
  },
  {
    href: "/account/settings",
    icon: User,
    labelEn: "Account",
    labelEs: "Perfil",
  },
];

export default function CustomerMobileNav() {
  const pathname = usePathname();
  const { language } = useLanguage();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) {
      return pathname === href;
    }
    // Special case for /account - only exact match, not /account/settings
    if (href === "/account") {
      return pathname === "/account" || pathname.startsWith("/account/orders");
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 lg:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href, item.exact);
          const label = language === "es" ? item.labelEs : item.labelEn;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full px-2 transition ${
                active ? "text-[#55529d]" : "text-gray-400"
              }`}
            >
              <div
                className={`p-1.5 rounded-xl ${
                  active ? "bg-[#55529d]/10" : ""
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
              </div>
              <span className="text-[10px] mt-0.5 font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}