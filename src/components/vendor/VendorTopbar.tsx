// src/components/vendor/VendorTopbar.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { auth, db } from '@/lib/firebase/config';
import { signOut, User } from 'firebase/auth';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  getDoc,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import {
  Bell,
  LogOut,
  Check,
  Settings,
  ChevronDown,
  Eye,
  ExternalLink,
  Globe,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { TranslationKey } from '@/lib/translations';

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: Timestamp | { seconds: number } | null;
  type?: string;
  data?: { url?: string; orderId?: string };
}

interface VendorData {
  name?: string;
  slug?: string;
  logoUrl?: string;
}

function formatTimeAgo(date: Date, t: (key: TranslationKey, replacements?: Record<string, string | number>) => string) {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return t('vendor.orders.justNow' as TranslationKey);
  if (diffInSeconds < 3600) {
    const mins = Math.floor(diffInSeconds / 60);
    return t('vendor.orders.minutesAgo' as TranslationKey, { count: mins });
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return t('vendor.orders.hoursAgo' as TranslationKey, { count: hours });
  }
  if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return t('vendor.orders.daysAgo' as TranslationKey, { count: days });
  }
  return date.toLocaleDateString();
}

export default function VendorTopbar() {
  const router = useRouter();
  const { t, language, setLanguage } = useLanguage();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNew, setIsNew] = useState(false);
  const [vendor, setVendor] = useState<VendorData | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const notificationRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const prevUnreadCount = useRef(0);

  // Auth listener
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Fetch vendor data for store link
  useEffect(() => {
    if (!currentUser) return;

    const fetchVendor = async () => {
      try {
        const vendorDoc = await getDoc(doc(db, 'vendors', currentUser.uid));
        if (vendorDoc.exists()) {
          setVendor(vendorDoc.data() as VendorData);
        }
      } catch (err) {
        console.error('Error fetching vendor:', err);
      }
    };

    fetchVendor();
  }, [currentUser]);

  // =========================================================================
  // FIX: Query the ROOT 'notifications' collection filtered by userId
  // instead of the vendor subcollection 'vendors/{uid}/notifications'.
  // All notification writers (Cloud Functions, Stripe webhook, client helpers)
  // write to the root collection. The subcollection is rarely populated.
  // =========================================================================
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', currentUser.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs: Notification[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Notification[];

      setNotifications(notifs);

      const unread = notifs.filter((n) => !n.read).length;
      if (unread > prevUnreadCount.current && prevUnreadCount.current !== 0) {
        setIsNew(true);
        setTimeout(() => setIsNew(false), 3000);
      }
      setUnreadCount(unread);
      prevUnreadCount.current = unread;
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // =========================================================================
  // FIX: Mark all as read in the ROOT 'notifications' collection
  // =========================================================================
  const markAllAsRead = async () => {
    if (!currentUser || notifications.length === 0) return;

    const batch = writeBatch(db);
    notifications
      .filter((n) => !n.read)
      .forEach((n) => {
        const ref = doc(db, 'notifications', n.id);
        batch.update(ref, { read: true, readAt: Timestamp.now() });
      });

    await batch.commit();
  };

  // =========================================================================
  // FIX: Mark single notification as read in the ROOT collection
  // =========================================================================
  const handleNotificationClick = async (notification: Notification) => {
    if (!currentUser) return;

    // Mark as read
    if (!notification.read) {
      await updateDoc(
        doc(db, 'notifications', notification.id),
        { read: true, readAt: Timestamp.now() }
      );
    }

    // Navigate if URL provided
    if (notification.data?.url) {
      router.push(notification.data.url);
    } else if (notification.data?.orderId) {
      router.push(`/vendor/orders/${notification.data.orderId}`);
    }

    setShowNotifications(false);
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.replace('/login');
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'es' : 'en');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100 pt-13 pb-2">
      <div className="flex items-center justify-between px-4 py-3 lg:px-6">
        {/* Mobile Logo */}
        <Link href="/vendor" className="lg:hidden">
          <Image
            src="/stackbot-logo-purp.png"
            alt="StackBot"
            width={70}
            height={30}
            priority
          />
        </Link>

        {/* Desktop: Vendor info */}
        <div className="hidden lg:flex items-center gap-3">
          {vendor?.logoUrl && (
            <Image
              src={vendor.logoUrl}
              alt="Store"
              width={36}
              height={36}
              className="rounded-lg border border-gray-100"
            />
          )}
          <div>
            <p className="text-xs text-gray-500 font-medium">
              {t('vendor.portal' as TranslationKey)}
            </p>
            <p className="font-semibold text-gray-900">
              {vendor?.name || t('vendor.nav.dashboard' as TranslationKey)}
            </p>
          </div>
        </div>

        {/* Right: Language, View Store, Notifications & Menu */}
        <div className="flex items-center gap-2">
          {/* Language Toggle - Visible on all screen sizes */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-2 sm:px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-xl font-medium text-sm transition-colors"
            title={language === 'en' ? 'Cambiar a Español' : 'Switch to English'}
          >
            <Globe className="h-4 w-4" />
            <span className="uppercase">{language}</span>
          </button>

          {/* View Store Button */}
          {vendor?.slug && (
            <Link
              href={`/store/${vendor.slug}`}
              target="_blank"
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-sb-primary/10 text-sb-primary rounded-xl font-medium text-sm hover:bg-sb-primary/20 transition-colors"
            >
              <Eye className="h-4 w-4" />
              <span className="hidden md:inline">
                {t('vendor.nav.viewStore' as TranslationKey)}
              </span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          )}

          {/* Notifications Bell */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`relative p-2.5 rounded-xl transition-all duration-300 group ${
                showNotifications
                  ? 'bg-purple-50 text-sb-primary'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <Bell
                className={`h-5 w-5 sm:h-6 sm:w-6 transition-transform duration-300 group-hover:rotate-12 ${
                  isNew ? 'animate-bounce text-sb-primary' : ''
                }`}
              />

              {unreadCount > 0 && (
                <>
                  <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white ring-2 ring-white z-10">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                  <span className="absolute top-1 right-1 h-5 w-5 rounded-full bg-red-500 animate-ping opacity-75" />
                </>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-3 w-[calc(100vw-2rem)] sm:w-80 md:w-96 max-w-[400px] bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
                <div className="px-4 py-3 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {t('vendor.notifications.title' as TranslationKey)}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {unreadCount > 0
                        ? t('vendor.notifications.unread' as TranslationKey, { count: unreadCount })
                        : t('vendor.notifications.allCaughtUp' as TranslationKey)}
                    </p>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs flex items-center gap-1 text-sb-primary hover:text-sb-primary/80 font-medium px-2 py-1 hover:bg-purple-50 rounded-lg transition"
                    >
                      <Check className="w-3 h-3" />
                      {t('vendor.notifications.markAllRead' as TranslationKey)}
                    </button>
                  )}
                </div>

                <div className="max-h-[60vh] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center flex flex-col items-center">
                      <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                        <Bell className="h-6 w-6 text-gray-300" />
                      </div>
                      <p className="text-gray-900 font-medium">
                        {t('vendor.notifications.empty' as TranslationKey)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {t('vendor.notifications.emptyDesc' as TranslationKey)}
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {notifications.map((notification) => {
                        const timestamp = notification.createdAt
                          ? 'seconds' in notification.createdAt
                            ? new Date(notification.createdAt.seconds * 1000)
                            : (notification.createdAt as unknown) instanceof Timestamp
                            ? (notification.createdAt as Timestamp).toDate()
                            : null
                          : null;

                        return (
                          <div
                            key={notification.id}
                            onClick={() => handleNotificationClick(notification)}
                            className={`px-4 py-3 hover:bg-gray-50 cursor-pointer transition ${
                              !notification.read ? 'bg-purple-50/30' : ''
                            }`}
                          >
                            <div className="flex gap-3">
                              <div
                                className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                                  !notification.read ? 'bg-sb-primary' : 'bg-transparent'
                                }`}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <p
                                    className={`text-sm line-clamp-1 ${
                                      !notification.read
                                        ? 'font-semibold text-gray-900'
                                        : 'text-gray-700'
                                    }`}
                                  >
                                    {notification.title}
                                  </p>
                                  <span className="text-[10px] text-gray-400 whitespace-nowrap flex-shrink-0">
                                    {timestamp ? formatTimeAgo(timestamp, t) : ''}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                                  {notification.message}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Desktop: Settings & Logout Menu */}
          <div className="hidden lg:block relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className={`flex items-center gap-1.5 p-2.5 rounded-xl transition-all ${
                showMenu
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <Settings className="h-5 w-5" />
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showMenu ? 'rotate-180' : ''}`} />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                <Link
                  href="/vendor/settings"
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => setShowMenu(false)}
                >
                  <Settings className="h-4 w-4" />
                  {t('vendor.nav.settings' as TranslationKey)}
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 w-full"
                >
                  <LogOut className="h-4 w-4" />
                  {t('vendor.nav.logout' as TranslationKey)}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}