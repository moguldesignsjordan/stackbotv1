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
} from 'firebase/firestore';
import {
  Bell,
  LogOut,
  Check,
  Settings,
  ChevronDown,
  Eye,
  ExternalLink,
} from 'lucide-react';

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

function formatTimeAgo(date: Date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

export default function VendorTopbar() {
  const router = useRouter();
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

  // Fetch notifications from MAIN notifications collection
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', currentUser.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const notifs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Notification[];

        const newUnread = notifs.filter((n) => !n.read).length;
        
        // Trigger animation only when count increases
        if (newUnread > prevUnreadCount.current) {
          setIsNew(true);
          setTimeout(() => setIsNew(false), 1000);
        }
        prevUnreadCount.current = newUnread;

        setNotifications(notifs);
        setUnreadCount(newUnread);
      },
      (error) => {
        console.error('Notification listener error:', error);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id: string, notification: Notification) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
      if (notification.data?.url) {
        router.push(notification.data.url);
      } else if (notification.data?.orderId) {
        router.push(`/vendor/orders/${notification.data.orderId}`);
      }
      setShowNotifications(false);
    } catch (error) {
      console.error('Error marking read:', error);
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    for (const id of unreadIds) {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const getTimestamp = (createdAt: Notification['createdAt']): Date | null => {
    if (!createdAt) return null;
    if ('toDate' in createdAt && typeof createdAt.toDate === 'function') {
      return createdAt.toDate();
    }
    if ('seconds' in createdAt) {
      return new Date(createdAt.seconds * 1000);
    }
    return null;
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100 pt-10 lg:pt-0">
      <div className="flex items-center justify-between h-16 px-4 lg:px-8">
        {/* Left: Logo on Mobile */}
        <Link href="/vendor" className="lg:hidden">
          <Image
            src="/stackbot-logo-purp.png"
            alt="StackBot"
            width={120}
            height={32}
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
            <p className="text-xs text-gray-500 font-medium">Vendor Portal</p>
            <p className="font-semibold text-gray-900">{vendor?.name || 'Dashboard'}</p>
          </div>
        </div>

        {/* Right: View Store, Notifications & Menu */}
        <div className="flex items-center gap-2">
          {/* View Store Button */}
          {vendor?.slug && (
            <Link
              href={`/store/${vendor.slug}`}
              target="_blank"
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-sb-primary/10 text-sb-primary rounded-xl font-medium text-sm hover:bg-sb-primary/20 transition-colors"
            >
              <Eye className="h-4 w-4" />
              <span className="hidden md:inline">View Store</span>
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
                    <h3 className="font-semibold text-gray-900">Notifications</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {unreadCount > 0
                        ? `You have ${unreadCount} unread`
                        : 'All caught up!'}
                    </p>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs flex items-center gap-1 text-sb-primary hover:text-sb-primary/80 font-medium px-2 py-1 hover:bg-purple-50 rounded-lg transition"
                    >
                      <Check className="w-3 h-3" />
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-[60vh] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center flex flex-col items-center">
                      <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                        <Bell className="h-6 w-6 text-gray-300" />
                      </div>
                      <p className="text-gray-900 font-medium">No notifications</p>
                      <p className="text-xs text-gray-500 mt-1">
                        We&apos;ll notify you when orders come in.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {notifications.map((notification) => {
                        const timestamp = getTimestamp(notification.createdAt);
                        return (
                          <div
                            key={notification.id}
                            onClick={() => markAsRead(notification.id, notification)}
                            className={`group p-4 hover:bg-gray-50 transition-all cursor-pointer relative ${
                              !notification.read
                                ? 'bg-purple-50/40 hover:bg-purple-50/70'
                                : ''
                            }`}
                          >
                            <div className="flex gap-3">
                              <div
                                className={`mt-1.5 h-2.5 w-2.5 rounded-full flex-shrink-0 transition-transform ${
                                  !notification.read
                                    ? 'bg-sb-primary scale-100'
                                    : 'bg-gray-200 scale-75'
                                }`}
                              />
                              <div className="flex-1 space-y-1 min-w-0">
                                <div className="flex justify-between items-start gap-2">
                                  <p
                                    className={`text-sm truncate ${
                                      !notification.read
                                        ? 'font-semibold text-gray-900'
                                        : 'text-gray-700'
                                    }`}
                                  >
                                    {notification.title}
                                  </p>
                                  <span className="text-[10px] text-gray-400 whitespace-nowrap flex-shrink-0">
                                    {timestamp ? formatTimeAgo(timestamp) : 'Just now'}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-500 line-clamp-2">
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

          {/* Profile Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-2 p-1.5 pr-3 hover:bg-gray-50 active:bg-gray-100 rounded-xl transition"
            >
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-sb-primary to-violet-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                {vendor?.name?.charAt(0)?.toUpperCase() || 'V'}
              </div>
              <ChevronDown className="h-4 w-4 text-gray-400 hidden sm:block" />
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50">
                  {vendor?.slug && (
                    <Link
                      href={`/store/${vendor.slug}`}
                      target="_blank"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 sm:hidden"
                      onClick={() => setShowMenu(false)}
                    >
                      <Eye className="h-4 w-4" />
                      View Store
                    </Link>
                  )}
                  <Link
                    href="/vendor/settings"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setShowMenu(false)}
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}