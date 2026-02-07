// src/app/driver/layout.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { auth, db } from '@/lib/firebase/config';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import {
  Home,
  Package,
  Clock,
  DollarSign,
  User,
  Menu,
  X,
  LogOut,
  Globe,
  Settings,
  ChevronRight,
  Loader2,
  Car,
  CheckCircle,
} from 'lucide-react';

const translations = {
  es: {
    appName: 'StackBot Conductor',
    dashboard: 'Inicio',
    activeDelivery: 'Entrega Activa',
    history: 'Historial',
    earnings: 'Ganancias',
    account: 'Cuenta',
    settings: 'Ajustes',
    online: 'En Línea',
    offline: 'Desconectado',
    busy: 'Ocupado',
    goOnline: 'Conectarse',
    goOffline: 'Desconectarse',
    logout: 'Cerrar Sesión',
    notAuthorized: 'No autorizado',
    notAuthorizedDesc: 'Necesitas ser un conductor aprobado para acceder.',
    applyNow: 'Aplicar Ahora',
    loading: 'Cargando...',
  },
  en: {
    appName: 'StackBot Driver',
    dashboard: 'Home',
    activeDelivery: 'Active Delivery',
    history: 'History',
    earnings: 'Earnings',
    account: 'Account',
    settings: 'Settings',
    online: 'Online',
    offline: 'Offline',
    busy: 'Busy',
    goOnline: 'Go Online',
    goOffline: 'Go Offline',
    logout: 'Log Out',
    notAuthorized: 'Not Authorized',
    notAuthorizedDesc: 'You need to be an approved driver to access this area.',
    applyNow: 'Apply Now',
    loading: 'Loading...',
  },
};

type Language = 'es' | 'en';

interface DriverProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  photoURL?: string;
  status: 'online' | 'offline' | 'busy' | 'break';
  vehicleType?: string;
  vehiclePlate?: string;
  verified?: boolean;
  totalDeliveries?: number;
  rating?: number;
}

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [language, setLanguage] = useState<Language>('es');
  // 'loading'        → waiting for onAuthStateChanged
  // 'checking'       → user is signed in, waiting for /drivers/{uid} doc check
  // 'authenticated'  → /drivers/{uid} exists, render children
  // 'unauthenticated'→ no user, redirecting to login
  // 'unauthorized'   → user exists but no driver doc OR rules denied
  const [authState, setAuthState] = useState<
    'loading' | 'checking' | 'authenticated' | 'unauthenticated' | 'unauthorized'
  >('loading');

  const [userId, setUserId] = useState<string | null>(null);
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hasActiveDelivery, setHasActiveDelivery] = useState(false);

  const t = translations[language];

  const publicRoutes = ['/driver/apply', '/driver/login'];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  // ── language pref ──────────────────────────────────────────────
  useEffect(() => {
    const savedLang = localStorage.getItem('stackbot-driver-lang') as Language;
    if (savedLang && (savedLang === 'es' || savedLang === 'en')) {
      setLanguage(savedLang);
    }
  }, []);

  const toggleLanguage = () => {
    const newLang = language === 'es' ? 'en' : 'es';
    setLanguage(newLang);
    localStorage.setItem('stackbot-driver-lang', newLang);
  };

  // ── 1. auth state listener ─────────────────────────────────────
  useEffect(() => {
    if (isPublicRoute) {
      // public routes render without auth gating
      setAuthState('authenticated');
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setUserId(null);
        setAuthState('unauthenticated');
        router.replace('/driver/login');
        return;
      }
      setUserId(user.uid);
      setAuthState('checking'); // hand off to the driver-doc listener
    });

    return () => unsubscribe();
  }, [router, isPublicRoute]);

  // ── 2. driver doc listener ─────────────────────────────────────
  useEffect(() => {
    if (!userId || isPublicRoute) return;

    const driverRef = doc(db, 'drivers', userId);

    let unsubscribe = () => {};
    unsubscribe = onSnapshot(
      driverRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setDriver({
            id: docSnap.id,
            name: data.name || '',
            email: data.email || '',
            phone: data.phone,
            photoURL: data.photoURL,
            status: data.status || 'offline',
            vehicleType: data.vehicleType,
            vehiclePlate: data.vehiclePlate,
            verified: data.verified,
            totalDeliveries: data.totalDeliveries || 0,
            rating: data.rating,
          });
          setAuthState('authenticated');
        } else {
          // Doc doesn't exist → not an approved driver
          setDriver(null);
          setAuthState('unauthorized');
        }
      },
      (err) => {
        console.error('drivers/{uid} snapshot error:', err);
        // Prevent Firestore internal assertion crash loops:
        setDriver(null);
        setAuthState('unauthorized');
        try {
          unsubscribe();
        } catch {}
      }
    );

    return () => unsubscribe();
  }, [userId, isPublicRoute]);

  // ── 3. active delivery indicator ───────────────────────────────
  useEffect(() => {
    if (!userId || authState !== 'authenticated' || isPublicRoute) return;

    const activeRef = doc(db, 'driver_active_deliveries', userId);

    let unsubscribe = () => {};
    unsubscribe = onSnapshot(
      activeRef,
      (docSnap) => {
        setHasActiveDelivery(docSnap.exists());
      },
      (err) => {
        console.error('driver_active_deliveries/{uid} snapshot error:', err);
        setHasActiveDelivery(false);
        try {
          unsubscribe();
        } catch {}
      }
    );

    return () => unsubscribe();
  }, [userId, authState, isPublicRoute]);

  // ── logout ─────────────────────────────────────────────────────
  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace('/driver/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // ── nav items ──────────────────────────────────────────────────
  const navItems = [
    { href: '/driver', icon: Home, label: t.dashboard, exact: true },
    { href: '/driver/delivery', icon: Package, label: t.activeDelivery, badge: hasActiveDelivery },
    { href: '/driver/history', icon: Clock, label: t.history },
    { href: '/driver/earnings', icon: DollarSign, label: t.earnings },
    { href: '/driver/account', icon: User, label: t.account },
  ];

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  // ── public routes bypass everything ────────────────────────────
  if (isPublicRoute) {
    return <div className="min-h-screen bg-gray-50">{children}</div>;
  }

  // ── loading / checking spinner ─────────────────────────────────
  if (authState === 'loading' || authState === 'checking') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-[#55529d] mx-auto mb-4" />
          <p className="text-gray-600">{t.loading}</p>
        </div>
      </div>
    );
  }

  // ── unauthorized screen ────────────────────────────────────────
  if (authState === 'unauthorized') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">{t.notAuthorized}</h1>
          <p className="text-gray-600 mb-6">{t.notAuthorizedDesc}</p>
          <Link
            href="/driver/apply"
            className="inline-flex items-center justify-center gap-2 bg-[#55529d] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#444280] transition-colors"
          >
            <Car className="w-5 h-5" />
            {t.applyNow}
          </Link>
        </div>
      </div>
    );
  }

  // ── authenticated — full layout with nav ───────────────────────
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 safe-top">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#55529d] rounded-lg flex items-center justify-center">
              <Car className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-900">{t.appName}</span>
          </div>

          <div className="flex items-center gap-2">
            {driver && (
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                  driver.status === 'online'
                    ? 'bg-green-100 text-green-700'
                    : driver.status === 'busy'
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    driver.status === 'online'
                      ? 'bg-green-500'
                      : driver.status === 'busy'
                      ? 'bg-orange-500'
                      : 'bg-gray-400'
                  }`}
                />
                {driver.status === 'online'
                  ? t.online
                  : driver.status === 'busy'
                  ? t.busy
                  : t.offline}
              </div>
            )}

            <button
              onClick={toggleLanguage}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Globe className="w-5 h-5 text-gray-600" />
            </button>

            <button
              onClick={() => setMenuOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </header>

      <main className="pb-4">{children}</main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-bottom">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-4 py-1 transition-colors ${
                  active ? 'text-[#55529d]' : 'text-gray-400'
                }`}
              >
                <div className="relative">
                  <item.icon className="w-6 h-6" />
                  {item.badge && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
                  )}
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Slide-out menu */}
      <div
        className={`fixed inset-0 z-[100] transition-opacity duration-300 ${
          menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => setMenuOpen(false)}
        />

        <div
          className={`absolute right-0 top-0 bottom-0 w-80 max-w-[85vw] bg-white shadow-2xl transition-transform duration-300 safe-top ${
            menuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex justify-end p-4 pt-6">
            <button
              onClick={() => setMenuOpen(false)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="px-6 pb-6 space-y-4">
            {driver && (
              <div className="pb-4 mb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#55529d]">
                    {driver.photoURL ? (
                      <img src={driver.photoURL} alt={driver.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-[#55529d] text-white font-semibold flex items-center justify-center">
                        {driver.name?.charAt(0).toUpperCase() || 'D'}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">{driver.name}</p>
                    {driver.verified && (
                      <span className="flex items-center gap-1 text-sm text-green-600">
                        <CheckCircle className="w-3.5 h-3.5" />
                        {language === 'es' ? 'Verificado' : 'Verified'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            <nav className="space-y-1">
              <Link
                href="/driver/account"
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-between px-4 py-3 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5" />
                  <span className="font-medium">{t.account}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </Link>

              <Link
                href="/driver/settings"
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-between px-4 py-3 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Settings className="w-5 h-5" />
                  <span className="font-medium">{t.settings}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </Link>
            </nav>

            <div className="pt-4 border-t border-gray-100">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-colors w-full"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">{t.logout}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
