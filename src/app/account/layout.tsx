// src/app/account/layout.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { 
  Package, 
  MapPin, 
  User, 
  LogOut, 
  Home,
  Loader2,
  Menu,
  X,
  ChevronRight
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';

const navItems = [
  { href: '/account', label: 'My Orders', icon: Package, exact: true },
  { href: '/account/addresses', label: 'Addresses', icon: MapPin },
  { href: '/account/settings', label: 'Settings', icon: User },
];

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
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
      sm: 'w-9 h-9 text-sm',
      md: 'w-12 h-12 text-lg',
      lg: 'w-16 h-16 text-xl',
    };
    const imgSizes = {
      sm: 36,
      md: 48,
      lg: 64,
    };

    return (
      <div className={`${sizeClasses[size]} rounded-full overflow-hidden bg-[#55529d]/10 flex items-center justify-center`}>
        {profilePhoto ? (
          <Image
            src={profilePhoto}
            alt="Profile"
            width={imgSizes[size]}
            height={imgSizes[size]}
            className="w-full h-full object-cover"
            unoptimized
          />
        ) : (
          <span className={`font-bold text-[#55529d]`}>
            {getInitials(displayName, user?.email || '')}
          </span>
        )}
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-[#55529d] hover:text-[#444287] transition-colors">
                <Home className="w-6 h-6" />
              </Link>
              <div className="hidden sm:block h-6 w-px bg-gray-200" />
              <h1 className="text-xl font-bold text-gray-900">My Account</h1>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* Desktop user info */}
            <div className="hidden lg:flex items-center gap-4">
              <Link 
                href="/account/settings"
                className="flex items-center gap-3 hover:bg-gray-50 rounded-lg px-3 py-2 -mr-3 transition-colors"
              >
                <Avatar size="sm" />
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {displayName || 'Customer'}
                  </p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
              </Link>

              <div className="h-8 w-px bg-gray-200" />
              
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-gray-600 hover:text-red-600 transition-colors px-3 py-2"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">Logout</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 bg-white">
            {/* Mobile profile header */}
            <div className="px-4 py-4 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-3">
                <Avatar size="md" />
                <div>
                  <p className="font-medium text-gray-900">
                    {displayName || 'Customer'}
                  </p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
              </div>
            </div>

            <nav className="px-2 py-2">
              {navItems.map((item) => {
                const isActive = isActiveRoute(item.href, item.exact);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-[#55529d]/10 text-[#55529d]'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </div>
                    <ChevronRight className={`w-4 h-4 ${isActive ? 'text-[#55529d]' : 'text-gray-400'}`} />
                  </Link>
                );
              })}
              
              <div className="my-2 mx-4 border-t border-gray-100" />
              
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Logout</span>
              </button>
            </nav>
          </div>
        )}
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <nav className="bg-white rounded-xl shadow-sm overflow-hidden sticky top-24">
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
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}