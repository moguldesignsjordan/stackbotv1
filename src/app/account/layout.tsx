// src/app/account/layout.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { NotificationBell } from '@/components/notifications';
import { 
  Package, 
  MapPin, 
  User, 
  LogOut, 
  Home as HomeIcon,
  Loader2,
  Menu,
  X,
  ChevronRight,
  HelpCircle,
  Compass,
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';

const navItems = [
  { href: '/account', label: 'My Orders', icon: Package, exact: true },
  { href: '/account/addresses', label: 'Addresses', icon: MapPin },
  { href: '/account/settings', label: 'Settings', icon: User },
];

// Mobile bottom navigation items
const mobileNavItems = [
  {
    href: '/',
    icon: HomeIcon,
    labelEn: 'Home',
    labelEs: 'Inicio',
    exact: true,
  },
  {
    href: '/vendors',
    icon: Compass,
    labelEn: 'Browse',
    labelEs: 'Explorar',
  },
  {
    href: '/account',
    icon: Package,
    labelEn: 'Orders',
    labelEs: 'Pedidos',
  },
  {
    href: '/account/settings',
    icon: User,
    labelEn: 'Account',
    labelEs: 'Perfil',
  },
];

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const { language, setLanguage } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>('');

  // Real-time listener for profile data
  useEffect(() => {
    if (!user) return;

    // Set initial values from Firebase Auth
    setProfilePhoto(user.photoURL);
    setDisplayName(user.displayName || '');

    // Listen to Firestore for real-time updates
    const unsubscribe = onSnapshot(
      doc(db, 'customers', user.uid),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          // Prefer Firestore data over Auth data (more up-to-date)
          if (data.photoURL) setProfilePhoto(data.photoURL);
          if (data.displayName) setDisplayName(data.displayName);
        }
      },
      (error) => {
        console.error('Error listening to profile:', error);
      }
    );

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?redirect=/account');
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  const isActiveRoute = (href: string, exact?: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  // Check if mobile nav item is active
  const isMobileNavActive = (href: string, exact?: boolean) => {
    if (exact) {
      return pathname === href;
    }
    // Special case for /account - only exact match, not /account/settings
    if (href === '/account') {
      return pathname === '/account' || pathname.startsWith('/account/orders');
    }
    return pathname.startsWith(href);
  };

  const getInitials = (name: string, email: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return email?.charAt(0).toUpperCase() || 'U';
  };

  // Reusable Avatar component
  const Avatar = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
    const sizeClasses = {
      sm: 'w-8 h-8 text-sm',
      md: 'w-10 h-10 text-base',
      lg: 'w-12 h-12 text-lg',
    };

    return profilePhoto ? (
      <Image
        src={profilePhoto}
        alt={displayName || 'User'}
        width={size === 'sm' ? 32 : size === 'md' ? 40 : 48}
        height={size === 'sm' ? 32 : size === 'md' ? 40 : 48}
        className={`${sizeClasses[size]} rounded-full object-cover border-2 border-gray-100`}
      />
    ) : (
      <div className={`${sizeClasses[size]} rounded-full bg-[#55529d] text-white font-semibold flex items-center justify-center border-2 border-gray-100`}>
        {getInitials(displayName, user?.email || '')}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#55529d]" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 lg:pb-0">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        {/* UPDATED PADDING: 
           Changed 'py-2' to 'pt-5 pb-3 lg:py-4'
           'pt-5' adds extra top space (20px) on mobile to clear the status bar/time.
           'lg:py-4' keeps it balanced on desktop.
        */}
        <div className="max-w-7xl mx-auto px-4 pt-9 pb-3 lg:py-4">
          <div className="flex items-center justify-between">
            {/* Left: Logo/Back */}
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2">
                <Image
                  src="/stackbot-logo-purp.png"
                  alt="StackBot"
                  width={120}
                  height={32}
                  priority
                />
              </Link>
            </div>

            {/* Right: Notification Bell + Mobile Menu */}
            <div className="flex items-center gap-3">
              {/* Notification Bell */}
              <NotificationBell />
              
              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>

              {/* Desktop Profile */}
              <div className="hidden lg:flex items-center gap-3">
                <Avatar size="md" />
                <div className="text-sm">
                  <p className="font-medium text-gray-900">{displayName || 'Customer'}</p>
                  <p className="text-gray-500 text-xs">{user.email}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Slide-out Drawer Menu */}
      <div
        className={`fixed inset-0 z-[60] lg:hidden transition-all duration-300 ${
          mobileMenuOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
        
        {/* Drawer */}
        <div
          className={`absolute right-0 top-0 bottom-0 w-80 max-w-[85vw] bg-white shadow-2xl transition-transform duration-300 safe-top ${
            mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Close button */}
          <div className="flex justify-end p-4 pt-6">
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Close menu"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="px-6 pb-6 space-y-4">
            {/* User Profile Card */}
            <div className="pb-4 mb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <Avatar size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 truncate">
                    {displayName || 'Customer'}
                  </p>
                  <p className="text-sm text-gray-500 truncate">{user.email}</p>
                </div>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = isActiveRoute(item.href, item.exact);
                const label = language === 'en' ? item.label : 
                  item.label === 'My Orders' ? 'Mis Pedidos' :
                  item.label === 'Addresses' ? 'Direcciones' :
                  item.label === 'Settings' ? 'Configuración' : item.label;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${
                      isActive
                        ? 'bg-[#55529d] text-white'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{label}</span>
                    </div>
                    <ChevronRight className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                  </Link>
                );
              })}
            </nav>

            {/* Divider */}
            <div className="border-t border-gray-100 pt-4">
              {/* Language Toggle */}
              <div className="mb-3">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide px-4 mb-2">
                  {language === 'en' ? 'Language & Currency' : 'Idioma y Moneda'}
                </p>
                <div className="grid grid-cols-2 gap-2 px-4">
                  <button
                    onClick={() => setLanguage('en')}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 transition-all ${
                      language === 'en'
                        ? 'border-[#55529d] bg-[#55529d]/10 text-[#55529d]'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-lg">🇺🇸</span>
                    <span className="text-sm font-medium">USD</span>
                  </button>
                  <button
                    onClick={() => setLanguage('es')}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 transition-all ${
                      language === 'es'
                        ? 'border-[#55529d] bg-[#55529d]/10 text-[#55529d]'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-lg">🇩🇴</span>
                    <span className="text-sm font-medium">DOP</span>
                  </button>
                </div>
              </div>

              {/* Support Link */}
              <a
                href="https://stackbotglobal.com/support"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
              >
                <HelpCircle className="w-5 h-5" />
                <span className="font-medium">{language === 'en' ? 'Support' : 'Soporte'}</span>
              </a>

              {/* Home Link */}
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
              >
                <HomeIcon className="w-5 h-5" />
                <span className="font-medium">{language === 'en' ? 'Back to Home' : 'Volver al Inicio'}</span>
              </Link>

              {/* Logout */}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors mt-1"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">{language === 'en' ? 'Logout' : 'Cerrar Sesión'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <nav className="bg-white rounded-xl shadow-sm overflow-hidden sticky top-[140px]">
              {/* Profile Card */}
              <Link 
                href="/account/settings"
                className="block p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Avatar size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">
                      {displayName || 'Customer'}
                    </p>
                    <p className="text-sm text-gray-500 truncate">{user.email}</p>
                  </div>
                </div>
              </Link>

              {/* Navigation */}
              <div className="p-2">
                {navItems.map((item) => {
                  const isActive = isActiveRoute(item.href, item.exact);
                  const label = language === 'en' ? item.label : 
                    item.label === 'My Orders' ? 'Mis Pedidos' :
                    item.label === 'Addresses' ? 'Direcciones' :
                    item.label === 'Settings' ? 'Configuración' : item.label;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-[#55529d] text-white'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{label}</span>
                    </Link>
                  );
                })}

                {/* Support Link */}
                <a
                  href="https://stackbotglobal.com/support"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <HelpCircle className="w-5 h-5" />
                  <span className="font-medium">{language === 'en' ? 'Support' : 'Soporte'}</span>
                </a>
              </div>

              {/* Language Toggle - Desktop */}
              <div className="p-4 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                  {language === 'en' ? 'Currency' : 'Moneda'}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setLanguage('en')}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-lg border transition-all text-sm ${
                      language === 'en'
                        ? 'border-[#55529d] bg-[#55529d]/10 text-[#55529d]'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <span>🇺🇸</span>
                    <span className="font-medium">USD</span>
                  </button>
                  <button
                    onClick={() => setLanguage('es')}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-lg border transition-all text-sm ${
                      language === 'es'
                        ? 'border-[#55529d] bg-[#55529d]/10 text-[#55529d]'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <span>🇩🇴</span>
                    <span className="font-medium">DOP</span>
                  </button>
                </div>
              </div>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 lg:hidden safe-area-bottom">
        <div className="flex items-center justify-around h-16">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const active = isMobileNavActive(item.href, item.exact);
            const label = language === 'es' ? item.labelEs : item.labelEn;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center flex-1 h-full px-2 transition ${
                  active ? 'text-[#55529d]' : 'text-gray-400'
                }`}
              >
                <div
                  className={`p-1.5 rounded-xl ${
                    active ? 'bg-[#55529d]/10' : ''
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
    </div>
  );
}