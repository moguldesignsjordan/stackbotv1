"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { auth, db } from "@/lib/firebase/config";
import { signOut } from "firebase/auth";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  doc, 
  updateDoc 
} from "firebase/firestore";
import {
  Menu,
  Bell,
  Search,
  X,
  LogOut,
  User,
  Settings,
  ChevronDown,
  Check
} from "lucide-react";

// Define the shape of a notification
interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: any;
  link?: string;
  type?: string;
}

// Helper to format time (replaces date-fns)
function formatTimeAgo(date: Date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

export default function AdminTopbar() {
  const router = useRouter();
  const [showSearch, setShowSearch] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNew, setIsNew] = useState(false);
  
  const notificationRef = useRef<HTMLDivElement>(null);

  // Fetch notifications
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        const q = query(
          collection(db, "notifications"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc"),
          limit(20)
        );

        const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
          const notifs = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Notification[];

          const newUnread = notifs.filter((n) => !n.read).length;
          if (newUnread > unreadCount) {
             setIsNew(true);
             setTimeout(() => setIsNew(false), 1000); 
          }

          setNotifications(notifs);
          setUnreadCount(newUnread);
        });

        return () => unsubscribeSnapshot();
      }
    });

    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      unsubscribeAuth();
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [unreadCount]);

  const markAsRead = async (id: string, link?: string) => {
    try {
      await updateDoc(doc(db, "notifications", id), { read: true });
      if (link) router.push(link);
      setShowNotifications(false);
    } catch (error) {
      console.error("Error marking read:", error);
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    unreadIds.forEach(async (id) => {
      await updateDoc(doc(db, "notifications", id), { read: true });
    });
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/admin/search?q=${encodeURIComponent(searchQuery)}`);
      setShowSearch(false);
      setSearchQuery("");
    }
  };

  return (
    <>
      {/* Changed pt-4 to py-4 to add bottom padding matching the top */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 py-6 lg:py-0 transition-all">
        <div className="flex items-center justify-between h-8 px-4 lg:px-8">
          {/* Left: Logo/Search */}
          <div className="flex items-center gap-4">
            <Link href="/admin" className="lg:hidden">
              <Image
                src="/stackbot-logo-purp.png"
                alt="StackBot"
                width={120}
                height={32}
                priority
              />
            </Link>

            <form onSubmit={handleSearch} className="hidden lg:flex items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search vendors, orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 xl:w-80 pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:bg-white focus:border-sb-primary focus:ring-2 focus:ring-sb-primary/20 outline-none transition"
                />
              </div>
            </form>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSearch(true)}
              className="lg:hidden p-2.5 text-gray-500 hover:bg-gray-50 active:bg-gray-100 rounded-xl transition"
            >
              <Search className="h-5 w-5" />
            </button>

            {/* --- NOTIFICATIONS BELL --- */}
            <div className="relative" ref={notificationRef}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className={`relative p-2.5 rounded-xl transition-all duration-300 group ${
                  showNotifications ? "bg-purple-50 text-sb-primary" : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                <Bell className={`h-6 w-6 transition-transform duration-300 group-hover:rotate-12 ${
                  isNew ? "animate-bounce text-sb-primary" : ""
                }`} />

                {unreadCount > 0 && (
                  <>
                    <span className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white ring-2 ring-white z-10 animate-in zoom-in duration-300">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                    <span className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-red-500 animate-ping opacity-75"></span>
                  </>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
                  <div className="px-4 py-3 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                    <div>
                      <h3 className="font-semibold text-gray-900">Notifications</h3>
                      <p className="text-xs text-gray-500 mt-0.5">You have {unreadCount} unread messages</p>
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

                  <div className="max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center flex flex-col items-center">
                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                          <Bell className="h-6 w-6 text-gray-300" />
                        </div>
                        <p className="text-gray-900 font-medium">No notifications</p>
                        <p className="text-xs text-gray-500 mt-1">We'll let you know when updates arrive.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {notifications.map((notification) => (
                          <div 
                            key={notification.id}
                            onClick={() => markAsRead(notification.id, notification.link)}
                            className={`group p-4 hover:bg-gray-50 transition-all cursor-pointer relative ${
                              !notification.read ? "bg-purple-50/40 hover:bg-purple-50/70" : ""
                            }`}
                          >
                            <div className="flex gap-3">
                              <div className={`mt-1.5 h-2.5 w-2.5 rounded-full flex-shrink-0 transition-transform ${
                                !notification.read ? "bg-sb-primary scale-100" : "bg-gray-200 scale-75"
                              }`} />
                              <div className="flex-1 space-y-1">
                                <div className="flex justify-between items-start">
                                  <p className={`text-sm ${!notification.read ? "font-semibold text-gray-900" : "text-gray-700"}`}>
                                    {notification.title}
                                  </p>
                                  <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">
                                    {notification.createdAt?.seconds 
                                      ? formatTimeAgo(new Date(notification.createdAt.seconds * 1000))
                                      : "Just now"}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-500 line-clamp-2 group-hover:text-gray-700 transition-colors">
                                  {notification.message}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="flex items-center gap-2 p-1.5 pr-3 hover:bg-gray-50 active:bg-gray-100 rounded-xl transition"
              >
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-sb-primary to-violet-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                  A
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400 hidden sm:block" />
              </button>

              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-fade-in">
                    <div className="px-4 py-3 border-b border-gray-50">
                      <p className="font-medium text-gray-900">Admin User</p>
                      <p className="text-sm text-gray-500 truncate">
                        support@stackbotglobal.com
                      </p>
                    </div>

                    <div className="py-1">
                      <Link
                        href="/admin/profile"
                        onClick={() => setShowMenu(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition"
                      >
                        <User className="h-4 w-4 text-gray-400" />
                        Profile
                      </Link>
                      <Link
                        href="/admin/settings"
                        onClick={() => setShowMenu(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition"
                      >
                        <Settings className="h-4 w-4 text-gray-400" />
                        Settings
                      </Link>
                    </div>

                    <div className="border-t border-gray-50 pt-1">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-red-600 hover:bg-red-50 active:bg-red-100 transition"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Search Overlay */}
      {showSearch && (
        <div className="fixed inset-0 z-50 bg-white lg:hidden animate-fade-in">
          <div className="flex items-center gap-3 p-4 border-b border-gray-100">
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search vendors, orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50 rounded-2xl text-base focus:bg-white focus:ring-2 focus:ring-sb-primary/20 outline-none transition"
                />
              </div>
            </form>
            <button
              onClick={() => {
                setShowSearch(false);
                setSearchQuery("");
              }}
              className="p-2.5 text-gray-500 hover:bg-gray-50 rounded-xl"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}