// src/components/vendor/VendorMobileNav.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, ShoppingCart, Settings } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { TranslationKey } from '@/lib/translations';

const navItems: {
  href: string;
  icon: typeof LayoutDashboard;
  labelKey: TranslationKey;
  exact?: boolean;
}[] = [
  {
    href: '/vendor',
    icon: LayoutDashboard,
    labelKey: 'vendor.nav.dashboard',
    exact: true,
  },
  {
    href: '/vendor/products',
    icon: Package,
    labelKey: 'vendor.nav.products',
  },
  {
    href: '/vendor/orders',
    icon: ShoppingCart,
    labelKey: 'vendor.nav.orders',
  },
  {
    href: '/vendor/settings',
    icon: Settings,
    labelKey: 'vendor.nav.settings',
  },
];

export default function VendorMobileNav() {
  const pathname = usePathname();
  const { t } = useLanguage();

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
                active ? 'text-sb-primary' : 'text-gray-400'
              }`}
            >
              <div
                className={`p-1.5 rounded-xl ${
                  active ? 'bg-sb-primary/10' : ''
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
              </div>
              <span className="text-[10px] mt-0.5 font-medium">
                {t(item.labelKey)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}