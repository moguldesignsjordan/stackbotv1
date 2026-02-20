// src/app/driver/layout.tsx
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { auth, db } from '@/lib/firebase/config';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
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
  RefreshCw,
  WifiOff,
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
    connectionError: 'Error de conexión',
    connectionErrorDesc: 'No se pudo verificar tu cuenta. Revisa tu conexión a internet.',
    retry: 'Reintentar',
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
    connectionError: 'Connection Error',
    connectionErrorDesc: 'Could not verify your account. Check your internet connection.',
    retry: 'Retry',
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

// Auth timeout in ms — prevents infinite spinner
const AUTH_CHECK_TIMEOUT = 10000;

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [language, setLanguage] = useState<Language>('es');
  // 'loading'        → waiting for onAuthStateChanged
  // 'checking'       → user is signed in, waiting for /drivers/{uid} doc check
  // 'authenticated'  → /drivers/{uid} exists, render children
  // 'unauthenticated'→ no user, redirecting to login
  // 'unauthorized'   → user exists but no driver doc OR rules denied
  // 'error'          → timeout or network error during verification
  const [authState, setAuthState] = useState<
    'loading' | 'checking' | 'authenticated' | 'unauthenticated' | 'unauthorized' | 'error'
  >('loading');

  const [userId, setUserId] = useState<string | null>(null);
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hasActiveDelivery, setHasActiveDelivery] = useState(false);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snapshotUnsubRef = useRef<(() => void) | null>(null);

  const t = translations[language];

  const publicRoutes = ['/driver/apply', '/driver/login'];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  // ── language pref (safe for restricted WebViews) ───────────────
  useEffect(() => {
    try {
      const savedLang = localStorage.getItem('stackbot-driver-lang') as Language;
      if (savedLang && (savedLang === 'es' || savedLang === 'en')) {
        setLanguage(savedLang);
      }
    } catch {
      // localStorage may be restricted in some iPad WebView contexts
    }
  }, []);

  const toggleLanguage = () => {
    const newLang = language === 'es' ? 'en' : 'es';
    setLanguage(newLang);
    try {
      localStorage.setItem('stackbot-driver-lang', newLang);
    } catch {
      // Silently ignore if localStorage is restricted
    }
  };

  // ── Clear timeout helper ───────────────────────────────────────
  const clearAuthTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // ── Fallback: getDoc if onSnapshot is slow ─────────────────────
  const fallbackGetDoc = useCallback(async (uid: string) => {
    try {
      const driverRef = doc(db, 'drivers', uid);
      const driverSnap = await getDoc(driverRef);

      if (driverSnap.exists()) {
        const data = driverSnap.data();
        setDriver({
          id: driverSnap.id,
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
        setDriver(null);
        setAuthState('unauthorized');
      }
    } catch (err) {
      console.error('Fallback getDoc failed:', err);
      setAuthState('error');
    }
  }, []);

  // ── 1. auth state listener ─────────────────────────────────────
  useEffect(() => {
    if (isPublicRoute) {
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
      setAuthState('checking');
    });

    return () => unsubscribe();
  }, [router, isPublicRoute]);

  // ── 2. driver doc listener + timeout ───────────────────────────
  useEffect(() => {
    if (!userId || isPublicRoute) return;

    // Only set up listener when entering 'checking' state
    if (authState !== 'checking') return;

    clearAuthTimeout();

    // Cleanup previous snapshot listener if any
    if (snapshotUnsubRef.current) {
      snapshotUnsubRef.current();
      snapshotUnsubRef.current = null;
    }

    let resolved = false;
    const driverRef = doc(db, 'drivers', userId);

    // ── Timeout: if onSnapshot doesn't fire within threshold,
    //    try a one-shot getDoc as fallback ─────────────────────
    timeoutRef.current = setTimeout(() => {
      if (!resolved) {
        console.warn('Auth check timeout — falling back to getDoc');
        fallbackGetDoc(userId);
      }
    }, AUTH_CHECK_TIMEOUT);

    const unsubscribe = onSnapshot(
      driverRef,
      (docSnap) => {
        resolved = true;
        clearAuthTimeout();

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
          setDriver(null);
          setAuthState('unauthorized');
        }
      },
      (err) => {
        resolved = true;
        clearAuthTimeout();
        console.error('drivers/{uid} snapshot error:', err);

        // Don't immediately go to unauthorized — could be transient
        // Try fallback getDoc
        fallbackGetDoc(userId);

        try {
          unsubscribe();
        } catch {}
      }
    );

    snapshotUnsubRef.current = unsubscribe;

    return () => {
      clearAuthTimeout();
      unsubscribe();
      snapshotUnsubRef.current = null;
    };
  }, [userId, isPublicRoute, authState, clearAuthTimeout, fallbackGetDoc]);

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

  // ── retry from error state ─────────────────────────────────────
  const handleRetry = () => {
    if (userId) {
      setAuthState('checking'); // Re-triggers the listener useEffect
    } else {
      setAuthState('loading');
      // Force re-check auth
      const user = auth.currentUser;
      if (user) {
        setUserId(user.uid);
        setAuthState('checking');
      } else {
        router.replace('/driver/login');
      }
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

  // ── error state — connection/timeout recovery ──────────────────
  if (authState === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <WifiOff className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">{t.connectionError}</h1>
          <p className="text-gray-600 mb-6">{t.connectionErrorDesc}</p>
          <button
            onClick={handleRetry}
            className="inline-flex items-center justify-center gap-2 bg-[#55529d] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#444280] transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
            {t.retry}
          </button>
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
                <span>
                  {driver.status === 'online'
                    ? t.online
                    : driver.status === 'busy'
                    ? t.busy
                    : t.offline}
                </span>
              </div>
            )}

            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              aria-label="Toggle language"
            >
              <Globe className="w-4 h-4 text-gray-600" />
            </button>

            {/* Hamburger Menu */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              aria-label="Menu"
            >
              {menuOpen ? (
                <X className="w-5 h-5 text-gray-600" />
              ) : (
                <Menu className="w-5 h-5 text-gray-600" />
              )}
            </button>
          </div>
        </div>

        {/* ── Slide-down Menu ─────────────────────────────────────── */}
        {menuOpen && (
          <div className="absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-50">
            <div className="p-4 space-y-1">
              {driver && (
                <div className="flex items-center gap-3 p-3 mb-3 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 bg-[#55529d] rounded-full flex items-center justify-center text-white font-bold">
                    {driver.name?.charAt(0) || 'D'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{driver.name}</p>
                    <p className="text-sm text-gray-500 truncate">{driver.email}</p>
                  </div>
                  {driver.verified && (
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  )}
                </div>
              )}

              <Link
                href="/driver/account"
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Settings className="w-5 h-5 text-gray-500" />
                  <span className="font-medium text-gray-700">{t.settings}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </Link>

              <button
                onClick={() => {
                  setMenuOpen(false);
                  handleLogout();
                }}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 transition-colors w-full text-left"
              >
                <LogOut className="w-5 h-5 text-red-500" />
                <span className="font-medium text-red-600">{t.logout}</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ── Main Content ──────────────────────────────────────────── */}
      <main>{children}</main>

      {/* ── Bottom Navigation ─────────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-bottom">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const active = isActive(item.href, item.exact);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors relative ${
                  active ? 'text-[#55529d]' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
                {item.badge && (
                  <span className="absolute -top-0.5 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ── Click-away for menu ────────────────────────────────────── */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setMenuOpen(false)}
        />
      )}
    </div>
  );
}