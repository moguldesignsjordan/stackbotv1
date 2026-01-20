"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, Package, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useEffect, useState } from "react";
import { getIdTokenResult } from "firebase/auth";

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  active?: boolean;
}

function NavItem({ icon, label, href, active }: NavItemProps) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-0.5 px-4 py-1 transition-colors ${
        active ? "text-[#55529d]" : "text-gray-400"
      }`}
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { language } = useLanguage();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchRole = async () => {
      if (user) {
        try {
          const token = await getIdTokenResult(user);
          setUserRole((token.claims.role as string) || "customer");
        } catch {
          setUserRole("customer");
        }
      } else {
        setUserRole(null);
      }
    };
    fetchRole();
  }, [user]);

  const getDashboardLink = () => {
    if (userRole === "admin") return "/admin";
    if (userRole === "vendor") return "/vendor";
    return "/account";
  };

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 lg:hidden safe-area-bottom">
      <div className="flex items-center justify-around py-2">
        <NavItem
          icon={<Home className="w-6 h-6" />}
          label={language === "es" ? "Inicio" : "Home"}
          href="/"
          active={isActive("/")}
        />
        <NavItem
          icon={<Compass className="w-6 h-6" />}
          label={language === "es" ? "Explorar" : "Browse"}
          href="/vendors"
          active={isActive("/vendors")}
        />
        <NavItem
          icon={<Package className="w-6 h-6" />}
          label={language === "es" ? "Pedidos" : "Orders"}
          href="/account/orders"
          active={isActive("/account/orders")}
        />
        <NavItem
          icon={<User className="w-6 h-6" />}
          label={language === "es" ? "Perfil" : "Account"}
          href={user ? getDashboardLink() : "/login"}
          active={isActive("/account") && !isActive("/account/orders")}
        />
      </div>
    </nav>
  );
}