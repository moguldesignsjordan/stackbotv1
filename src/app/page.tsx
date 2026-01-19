"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/hooks/useAuth";
import { signOut, getIdTokenResult } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { LogOut, User, ChevronDown, ShoppingCart } from "lucide-react";
import { db } from "@/lib/firebase/config";
import {
  collection,
  getDocs,
  query,
  where,
  limit,
} from "firebase/firestore";

import type { Product } from "@/lib/types";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCart } from "@/contexts/CartContext";
import { LanguageToggle } from "@/components/ui/LanguageToggle";

import {
  ArrowRight,
  Store,
  Search,
  Smartphone,
  Bike,
  Utensils,
  Car,
  Brush,
  Shirt,
  Home,
  Map,
  Users,
  Shield,
  Zap,
  Globe,
  Menu,
  X,
  ChevronRight,
  MapPin,
  Star,
  Sparkles,
  TrendingUp,
  Clock,
  BadgeCheck,
} from "lucide-react";

////////////////////////////////////////////////////////////////////////////////
// TYPES
////////////////////////////////////////////////////////////////////////////////

interface Vendor {
  id: string;
  business_name?: string;
  name?: string;
  business_description?: string;
  description?: string;
  business_address?: string;
  address?: string;
  logo_url?: string;
  logoUrl?: string;
  banner_url?: string;
  cover_image_url?: string;
  category?: string;
  categories?: string[];
  rating?: number;
  total_reviews?: number;
  status?: string;
  verified?: boolean;
  slug?: string;
  created_at?: any;
}

interface ProductWithVendor extends Product {
  vendorId?: string;
  vendorSlug?: string;
  vendor_slug?: string;
}

////////////////////////////////////////////////////////////////////////////////
// PERFORMANCE: INTERSECTION OBSERVER HOOK WITH ONCE OPTION
////////////////////////////////////////////////////////////////////////////////

function useInView(options = {}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "50px", ...options }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, isInView };
}

////////////////////////////////////////////////////////////////////////////////
// MAIN HOMEPAGE
////////////////////////////////////////////////////////////////////////////////

export default function HomePage() {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [featured, setFeatured] = useState<ProductWithVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { t } = useLanguage();

  // Memoized search handler
  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  }, [searchQuery, router]);

  useEffect(() => {
    const load = async () => {
      try {
        // First fetch vendors
        const vendorsList = await fetchVendors();
        setVendors(vendorsList);

        // Then fetch products from those vendors
        if (vendorsList.length > 0) {
          const productsList = await fetchProductsFromVendors(vendorsList);
          setFeatured(productsList);
        }
      } catch (err) {
        console.error("Error loading data:", err);
      }
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="min-h-screen bg-[#fafafa] overflow-x-hidden">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap');
        
        :root {
          --sb-primary: #55529d;
          --sb-primary-light: #7c78c9;
          --sb-primary-dark: #433f7a;
          --sb-accent: #f97316;
          --sb-accent-light: #fb923c;
          --sb-dark: #1a1a2e;
          --sb-success: #10b981;
        }

        * {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        body {
          font-family: 'Plus Jakarta Sans', sans-serif;
        }

        .font-display {
          font-family: 'Space Grotesk', sans-serif;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(2deg); }
        }

        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(85, 82, 157, 0.3); }
          50% { box-shadow: 0 0 40px rgba(85, 82, 157, 0.5); }
        }

        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }

        @keyframes badge-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-pulse-glow { animation: pulse-glow 3s ease-in-out infinite; }
        .animate-gradient { 
          background-size: 200% 200%;
          animation: gradient-shift 8s ease infinite;
        }
        .animate-badge-pulse {
          animation: badge-pulse 2s ease-in-out infinite;
        }

        .skeleton {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }

        .animate-on-scroll {
          opacity: 0;
          transform: translateY(30px);
          transition: all 0.6s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .animate-on-scroll.in-view {
          opacity: 1;
          transform: translateY(0);
        }

        .stagger-1 { transition-delay: 0.05s; }
        .stagger-2 { transition-delay: 0.1s; }
        .stagger-3 { transition-delay: 0.15s; }
        .stagger-4 { transition-delay: 0.2s; }
        .stagger-5 { transition-delay: 0.25s; }
        .stagger-6 { transition-delay: 0.3s; }
        .stagger-7 { transition-delay: 0.35s; }
        .stagger-8 { transition-delay: 0.4s; }

        .card-hover {
          transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
          will-change: transform, box-shadow;
        }

        .card-hover:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 40px -12px rgba(85, 82, 157, 0.2);
        }

        .card-hover:active {
          transform: translateY(-2px);
        }

        .btn-hover {
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .btn-hover::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          transform: translateX(-100%);
          transition: transform 0.5s;
        }

        .btn-hover:hover::before {
          transform: translateX(100%);
        }

        .text-gradient {
          background: linear-gradient(135deg, #55529d 0%, #7c78c9 50%, #f97316 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .glass {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }

        .glass-dark {
          background: rgba(26, 26, 46, 0.9);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }

        .noise {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
          opacity: 0.03;
        }

        .img-loading {
          background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
        }

        /* Smooth image loading */
        .img-reveal {
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .img-reveal.loaded {
          opacity: 1;
        }

        /* Better focus states */
        *:focus-visible {
          outline: 2px solid var(--sb-primary);
          outline-offset: 2px;
        }

        /* Reduce motion for accessibility */
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }

        /* Safe area support for iPhone notch */
        @supports (padding-top: env(safe-area-inset-top)) {
          .safe-top {
            padding-top: env(safe-area-inset-top);
          }
          .safe-top-nav {
            padding-top: max(env(safe-area-inset-top), 12px);
          }
        }
      `}</style>

      <Navbar />
      <Hero searchQuery={searchQuery} setSearchQuery={setSearchQuery} handleSearch={handleSearch} />
    
      
      {/* Featured Vendors Section */}
      <SectionWrapper 
        title={t('section.featuredVendors')}
        subtitle={t('section.featuredVendorsSubtitle')}
        link="/vendors"
        icon={<BadgeCheck className="w-5 h-5" />}
      >
        {loading ? (
          <LoadingGrid count={4} type="vendor" />
        ) : vendors.length > 0 ? (
          <Grid>{vendors.map((v, i) => <VendorCard key={v.id} vendor={v} index={i} />)}</Grid>
        ) : (
          <EmptyState 
            message={t('vendors.noVendors')}
            description={t('vendors.noVendors')}
          />
        )}
      </SectionWrapper>


      <OnboardingCards />

      <SectionWrapper 
        title={t('section.featuredProducts')}
        subtitle={t('section.featuredProductsSubtitle')}
        link="/products"
        icon={<Sparkles className="w-5 h-5" />}
        bgColor="bg-white"
      >
        {loading ? (
          <LoadingGrid count={4} type="product" />
        ) : featured.length > 0 ? (
          <Grid>{featured.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}</Grid>
        ) : (
          <EmptyState 
            message={t('products.noProducts')}
            description={t('products.noProducts')}
          />
        )}
      </SectionWrapper>

      <Categories />

      <Footer />
    </div>
  );
}

////////////////////////////////////////////////////////////////////////////////
// DATA FETCHING FUNCTIONS (Optimized)
////////////////////////////////////////////////////////////////////////////////

// imports here...

////////////////////////////////////////////////////////////////////////////////
// DATA FETCHING FUNCTIONS (TOP LEVEL)
////////////////////////////////////////////////////////////////////////////////

async function fetchVendors(): Promise<Vendor[]> {
  // 1. Fetch approved vendors (modern status)
  const approvedSnap = await getDocs(
    query(
      collection(db, "vendors"),
      where("status", "==", "approved"),
      limit(8)
    )
  );

  // Start with the approved list
  let allVendors = approvedSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Vendor));

  // 2. If we don't have a full list of 8, fetch legacy "verified" vendors to fill the gaps
  if (allVendors.length < 8) {
    const legacySnap = await getDocs(
      query(
        collection(db, "vendors"),
        where("verified", "==", true),
        limit(8)
      )
    );

    const legacyVendors = legacySnap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Vendor))
      .filter((v) => {
        // Filter out suspended or deleted vendors
        if (v.status === "suspended" || v.status === "deleted") return false;
        
        // IMPORTANT: Prevent duplicates.
        // If a vendor is both "approved" AND "verified", we already have them in 'allVendors'.
        // This check ensures we don't add them twice.
        const isDuplicate = allVendors.some(existing => existing.id === v.id);
        return !isDuplicate;
      });

    // Combine the lists
    allVendors = [...allVendors, ...legacyVendors];
  }

  // 3. Sort by newest created and ensure we return max 8 items
  return allVendors
    .sort(sortByCreatedAt)
    .slice(0, 8);
}

async function fetchProductsFromVendors(
  vendorsList: Vendor[]
): Promise<ProductWithVendor[]> {
  let allProducts: ProductWithVendor[] = [];

  const productPromises = vendorsList.slice(0, 6).map(async (vendor) => {
    try {
      // 🚫 HARD STOP — skip suspended vendors
      if (vendor.status && vendor.status !== "approved" && vendor.status !== undefined && vendor.verified === false) return [];
      // Note: kept logic generous here to allow legacy verified vendors

      const productsSnap = await getDocs(
        collection(db, "vendors", vendor.id, "products")
      );

      return productsSnap.docs
        .filter((d) => d.data().active !== false)
        .map((d) => {
          const productData = d.data();
          return {
            id: d.id,
            ...productData,
            vendorId: vendor.id,
            vendorSlug: vendor.slug || vendor.id,
            vendor_name:
              productData.vendor_name ||
              vendor.name ||
              vendor.business_name,
          } as ProductWithVendor;
        });
    } catch (err) {
      console.error(
        `Error fetching products for vendor ${vendor.id}`,
        err
      );
      return [];
    }
  });

  const results = await Promise.all(productPromises);
  allProducts = results.flat();

  return allProducts
    .sort(() => Math.random() - 0.5)
    .slice(0, 8);
}

function sortByCreatedAt(a: Vendor, b: Vendor) {
  const aTime =
    a.created_at?.toMillis?.() ||
    a.created_at?.seconds * 1000 ||
    0;

  const bTime =
    b.created_at?.toMillis?.() ||
    b.created_at?.seconds * 1000 ||
    0;

  return bTime - aTime;
}

////////////////////////////////////////////////////////////////////////////////
// NAVBAR (Auth-Aware with Cart + Language Toggle)
////////////////////////////////////////////////////////////////////////////////

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const { user, loading } = useAuth();
  const { itemCount } = useCart();
  const { t, language, setLanguage } = useLanguage();
  const router = useRouter();

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrolled(window.scrollY > 20);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Get user role for proper dashboard redirect
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

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUserMenuOpen(false);
      setMobileOpen(false);
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const getDashboardLink = () => {
    if (userRole === "admin") return "/admin";
    if (userRole === "vendor") return "/vendor";
    return "/account";
  };

  const getDashboardLabel = () => {
    if (userRole === "admin") return t('nav.adminDashboard');
    if (userRole === "vendor") return t('nav.vendorDashboard');
    return t('account.title');
  };

  const getInitials = () => {
    if (user?.displayName) {
      return user.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return user?.email?.charAt(0).toUpperCase() || "U";
  };

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 safe-top-nav ${
          scrolled ? "glass shadow-lg py-2" : "bg-transparent py-3 sm:py-4"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <Image
              src="/stackbot-logo-purp.png"
              alt="StackBot"
              width={120}
              height={36}
              priority
              className="object-contain transition-transform duration-300 group-hover:scale-105 w-[100px] sm:w-[120px]"
            />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            {[
              { href: "/vendors", label: t('nav.vendors') },
              { href: "/vendor-signup", label: t('vendors.becomeVendor') },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-gray-700 hover:text-[var(--sb-primary)] transition-colors relative group"
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[var(--sb-primary)] transition-all duration-300 group-hover:w-full" />
              </Link>
            ))}

            {/* Language Toggle */}
            <LanguageToggle variant="pill" />

            {/* Cart Button */}
            <Link
              href="/cart"
              className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label={t('nav.cart')}
            >
              <ShoppingCart className="w-5 h-5 text-gray-700" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-[var(--sb-accent)] text-white text-xs font-bold rounded-full flex items-center justify-center animate-badge-pulse">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </Link>

            {/* Auth-aware button/menu */}
            {loading ? (
              <div className="w-20 h-10 rounded-full bg-gray-200 animate-pulse" />
            ) : user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 bg-[var(--sb-primary)]/10 hover:bg-[var(--sb-primary)]/20 px-3 py-2 rounded-full transition-all duration-300"
                >
                  <div className="w-8 h-8 rounded-full bg-[var(--sb-primary)] text-white flex items-center justify-center text-sm font-semibold">
                    {getInitials()}
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-[var(--sb-primary)] transition-transform duration-200 ${
                      userMenuOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-fade-in">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {user.displayName || "Welcome!"}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {user.email}
                        </p>
                      </div>
                      <Link
                        href={getDashboardLink()}
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <User className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          {getDashboardLabel()}
                        </span>
                      </Link>
                      <Link
                        href="/account/orders"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        <span className="text-sm font-medium">{t('orders.title')}</span>
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 transition-colors w-full"
                      >
                        <LogOut className="w-4 h-4" />
                        <span className="text-sm font-medium">{t('nav.logout')}</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="btn-hover bg-[var(--sb-primary)] text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-[var(--sb-primary-dark)] transition-all duration-300 shadow-md hover:shadow-xl"
              >
                {t('nav.login')}
              </Link>
            )}
          </div>

          {/* Mobile Right Section */}
          <div className="flex md:hidden items-center gap-2">
            {/* Language Toggle (compact for mobile) */}
            <button
              onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-xs font-semibold text-gray-600"
              aria-label="Toggle language"
            >
              {language === 'en' ? '🇺🇸' : '🇩🇴'}
            </button>

            {/* Cart Button */}
            <Link
              href="/cart"
              className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label={t('nav.cart')}
            >
              <ShoppingCart className="w-5 h-5 text-gray-700" />
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[var(--sb-accent)] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </Link>

            {/* Menu Button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div
        className={`fixed inset-0 z-[60] md:hidden transition-all duration-300 ${
          mobileOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
        <div
          className={`absolute right-0 top-0 bottom-0 w-80 max-w-[85vw] bg-white shadow-2xl transition-transform duration-300 safe-top ${
            mobileOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {/* Close button at top */}
          <div className="flex justify-end p-4 pt-6">
            <button
              onClick={() => setMobileOpen(false)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Close menu"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="px-6 pb-6 space-y-4">
            {/* User info when logged in */}
            {user && (
              <div className="pb-4 mb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[var(--sb-primary)] text-white flex items-center justify-center text-lg font-semibold">
                    {getInitials()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">
                      {user.displayName || "Welcome!"}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Language Selector - Mobile - ENHANCED */}
            <div className="pb-5 mb-4 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                {language === 'en' ? '🌐 Language & Currency' : '🌐 Idioma y Moneda'}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setLanguage('en')}
                  className={`relative flex flex-col items-center justify-center py-4 px-3 rounded-2xl border-2 transition-all duration-200 ${
                    language === 'en'
                      ? 'border-[var(--sb-primary)] bg-[var(--sb-primary)]/10 shadow-md'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {language === 'en' && (
                    <div className="absolute top-2 right-2 w-2 h-2 bg-[var(--sb-primary)] rounded-full" />
                  )}
                  <span className="text-3xl mb-1">🇺🇸</span>
                  <span className={`text-sm font-bold ${language === 'en' ? 'text-[var(--sb-primary)]' : 'text-gray-700'}`}>
                    English
                  </span>
                  <span className={`text-xs mt-0.5 ${language === 'en' ? 'text-[var(--sb-primary)]/70' : 'text-gray-400'}`}>
                    USD ($)
                  </span>
                </button>
                <button
                  onClick={() => setLanguage('es')}
                  className={`relative flex flex-col items-center justify-center py-4 px-3 rounded-2xl border-2 transition-all duration-200 ${
                    language === 'es'
                      ? 'border-[var(--sb-primary)] bg-[var(--sb-primary)]/10 shadow-md'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {language === 'es' && (
                    <div className="absolute top-2 right-2 w-2 h-2 bg-[var(--sb-primary)] rounded-full" />
                  )}
                  <span className="text-3xl mb-1">🇩🇴</span>
                  <span className={`text-sm font-bold ${language === 'es' ? 'text-[var(--sb-primary)]' : 'text-gray-700'}`}>
                    Español
                  </span>
                  <span className={`text-xs mt-0.5 ${language === 'es' ? 'text-[var(--sb-primary)]/70' : 'text-gray-400'}`}>
                    DOP (RD$)
                  </span>
                </button>
              </div>
            </div>

            <Link
              href="/products"
              onClick={() => setMobileOpen(false)}
              className="block text-lg font-medium text-gray-800 hover:text-[var(--sb-primary)] transition-colors py-2"
            >
              {t('nav.products')}
            </Link>
            <Link
              href="/vendors"
              onClick={() => setMobileOpen(false)}
              className="block text-lg font-medium text-gray-800 hover:text-[var(--sb-primary)] transition-colors py-2"
            >
              {t('nav.vendors')}
            </Link>
            <Link
              href="/categories"
              onClick={() => setMobileOpen(false)}
              className="block text-lg font-medium text-gray-800 hover:text-[var(--sb-primary)] transition-colors py-2"
            >
              {t('nav.categories')}
            </Link>
            <Link
              href="/vendor-signup"
              onClick={() => setMobileOpen(false)}
              className="block text-lg font-medium text-gray-800 hover:text-[var(--sb-primary)] transition-colors py-2"
            >
              {t('vendors.becomeVendor')}
            </Link>

            <div className="pt-4 space-y-3">
              {user ? (
                <>
                  <Link
                    href={getDashboardLink()}
                    onClick={() => setMobileOpen(false)}
                    className="block w-full text-center bg-[var(--sb-primary)] text-white px-6 py-3 rounded-full font-semibold"
                  >
                    {getDashboardLabel()}
                  </Link>
                  <Link
                    href="/account/orders"
                    onClick={() => setMobileOpen(false)}
                    className="block w-full text-center border-2 border-gray-200 text-gray-700 px-6 py-3 rounded-full font-semibold hover:bg-gray-50 transition-colors"
                  >
                    {t('orders.title')}
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center justify-center gap-2 w-full text-center border-2 border-red-200 text-red-600 px-6 py-3 rounded-full font-semibold hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    {t('nav.logout')}
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="block w-full text-center bg-[var(--sb-primary)] text-white px-6 py-3 rounded-full font-semibold"
                  >
                    {t('nav.login')}
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setMobileOpen(false)}
                    className="block w-full text-center border-2 border-gray-200 text-gray-700 px-6 py-3 rounded-full font-semibold hover:bg-gray-50 transition-colors"
                  >
                    {t('nav.signUp')}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

////////////////////////////////////////////////////////////////////////////////
// HERO SECTION (Optimized with priority loading)
////////////////////////////////////////////////////////////////////////////////

function Hero({ 
  searchQuery, 
  setSearchQuery, 
  handleSearch 
}: { 
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  handleSearch: (e: React.FormEvent) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-[#55529d] via-[#6b67b5] to-[#7c78c9] animate-gradient">
      {/* Decorative Elements */}
      <div className="absolute inset-0 noise pointer-events-none" />
      <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-400/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "-3s" }} />
      
      {/* Grid Pattern */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
        backgroundSize: '60px 60px'
      }} />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 lg:py-40">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left Content */}
          <div className={`transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm px-4 py-2 rounded-full mb-6 border border-white/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span>
              </span>
              <span className="text-white/90 text-sm font-medium">{t('hero.nowServing')}</span>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-[1.1] tracking-tight">
              {t('hero.allInOne')}
              <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-white via-orange-200 to-orange-400">
                {t('hero.marketplace')}
              </span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-white/80 max-w-lg leading-relaxed">
              {t('hero.heroDescription')}
            </p>

            {/* Search Bar */}
            <div className={`mt-10 transition-all duration-700 delay-200 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
              <form onSubmit={handleSearch} className="relative max-w-xl">
                <div className="absolute inset-0 bg-white rounded-2xl blur-xl opacity-30" />
                <div className="relative flex items-center gap-3 bg-white rounded-2xl p-2 shadow-2xl">
                  <Search className="ml-4 text-gray-400 w-5 h-5 flex-shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('hero.searchPlaceholder')}
                    className="flex-1 py-3 text-gray-900 placeholder-gray-400 focus:outline-none text-base"
                  />
                  <button 
                    type="submit"
                    className="btn-hover bg-[var(--sb-primary)] text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 hover:bg-[var(--sb-primary-dark)] transition-all duration-300 flex-shrink-0"
                  >
                    <span className="hidden sm:inline">{t('common.search')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>

            {/* Stats */}
            <div className={`mt-12 flex flex-wrap gap-8 sm:gap-12 transition-all duration-700 delay-300 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
              {[
                { value: "500+", labelKey: 'hero.vendorPartners', icon: Store },
                { value: "99%", labelKey: 'hero.onTimeDelivery', icon: Clock },
                { value: "24/7", labelKey: 'hero.support', icon: Shield },
              ].map((stat) => (
                <div key={stat.labelKey} className="group flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                    <stat.icon className="w-5 h-5 text-white/80" />
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-bold text-white group-hover:text-orange-300 transition-colors duration-300">
                      {stat.value}
                    </div>
                    <p className="text-white/60 text-xs">{t(stat.labelKey as any)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Image */}
          <div className={`hidden lg:block relative transition-all duration-700 delay-100 ${mounted ? "opacity-100 translate-x-0" : "opacity-0 translate-x-10"}`}>
            <div className="absolute -inset-4 bg-gradient-to-tr from-orange-400/20 to-white/20 rounded-[3rem] blur-2xl" />
            <div className="relative">
              <Image
                src="/girl-phone.jpg"
                alt="User browsing StackBot"
                width={600}
                height={700}
                priority
                className="rounded-[2.5rem] shadow-2xl object-cover w-full h-[550px] animate-pulse-glow"
              />
              {/* Floating Card */}
              <div className="absolute -left-8 bottom-20 bg-white rounded-2xl p-4 shadow-xl animate-float" style={{ animationDelay: "-2s" }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Zap className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{t('hero.fastDelivery')}</p>
                    <p className="text-xs text-gray-500">{t('hero.underMinutes')}</p>
                  </div>
                </div>
              </div>
              
              {/* Second Floating Card */}
              <div className="absolute -right-4 top-20 bg-white rounded-2xl p-4 shadow-xl animate-float" style={{ animationDelay: "-4s" }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">500+ {t('nav.vendors')}</p>
                    <p className="text-xs text-gray-500">{t('hero.andGrowing')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-white/30 rounded-full flex items-start justify-center p-2">
          <div className="w-1 h-2 bg-white/60 rounded-full animate-pulse" />
        </div>
      </div>
    </section>
  );
}

////////////////////////////////////////////////////////////////////////////////
// MARKETPLACE GRID
////////////////////////////////////////////////////////////////////////////////

function MarketplaceGrid() {
  const { ref, isInView } = useInView();
  const { t } = useLanguage();

  const items = useMemo(() => [
    { labelKey: 'marketplace.foodDelivery', icon: Utensils, color: "from-orange-400 to-red-500" },
    { labelKey: 'marketplace.retailShops', icon: Shirt, color: "from-blue-400 to-indigo-500" },
    { labelKey: 'marketplace.taxiTransport', icon: Car, color: "from-yellow-400 to-orange-500" },
    { labelKey: 'marketplace.beautyWellness', icon: Brush, color: "from-pink-400 to-rose-500" },
    { labelKey: 'marketplace.homeServices', icon: Store, color: "from-teal-400 to-cyan-500" },
    { labelKey: 'marketplace.rentals', icon: Home, color: "from-green-400 to-emerald-500" },
    { labelKey: 'marketplace.tours', icon: Map, color: "from-purple-400 to-violet-500" },
    { labelKey: 'marketplace.peerToPeer', icon: Users, color: "from-sky-400 to-blue-500" },
  ], []);

  return (
    <section ref={ref} className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-white relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
      
      <div className="max-w-7xl mx-auto">
        <div className={`text-center mb-16 animate-on-scroll ${isInView ? "in-view" : ""}`}>
          <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-[var(--sb-primary)]/10 text-[var(--sb-primary)] rounded-full text-sm font-semibold mb-4">
            <Sparkles className="w-4 h-4" />
            {t('marketplace.badge')}
          </span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900">
            {t('marketplace.title')}
          </h2>
          <p className="mt-4 text-gray-600 text-lg max-w-2xl mx-auto">
            {t('marketplace.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {items.map((item, i) => (
            <div
              key={item.labelKey}
              className={`animate-on-scroll stagger-${(i % 8) + 1} ${isInView ? "in-view" : ""}`}
            >
              <div className="card-hover group relative p-6 sm:p-8 bg-gray-50 rounded-3xl cursor-pointer overflow-hidden border border-gray-100">
                <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                <div className="relative z-10">
                  <div className="h-14 w-14 flex items-center justify-center rounded-2xl bg-white shadow-sm text-gray-700 group-hover:text-white group-hover:bg-white/20 transition-all duration-300 mb-4">
                    <item.icon className="w-7 h-7" />
                  </div>
                  <h3 className="font-semibold text-gray-800 group-hover:text-white transition-colors duration-300 text-sm sm:text-base">
                    {t(item.labelKey as any)}
                  </h3>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

////////////////////////////////////////////////////////////////////////////////
// WHY STACKBOT
////////////////////////////////////////////////////////////////////////////////

function WhyStackBot() {
  const { ref, isInView } = useInView();
  const { t } = useLanguage();

  const features = useMemo(() => [
    {
      icon: Zap,
      titleKey: 'why.fast',
      descKey: 'why.fastDesc',
      color: "from-yellow-400 to-orange-500",
    },
    {
      icon: Shield,
      titleKey: 'why.secure',
      descKey: 'why.secureDesc',
      color: "from-green-400 to-emerald-500",
    },
    {
      icon: Globe,
      titleKey: 'why.caribbean',
      descKey: 'why.caribbeanDesc',
      color: "from-blue-400 to-indigo-500",
    },
  ], []);

  return (
    <section ref={ref} className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto">
        <div className={`text-center mb-16 animate-on-scroll ${isInView ? "in-view" : ""}`}>
          <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-[var(--sb-accent)]/10 text-[var(--sb-accent)] rounded-full text-sm font-semibold mb-4">
            <BadgeCheck className="w-4 h-4" />
            {t('why.badge')}
          </span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900">
            {t('why.title')}
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
          {features.map((feature, i) => (
            <div
              key={feature.titleKey}
              className={`animate-on-scroll stagger-${i + 1} ${isInView ? "in-view" : ""}`}
            >
              <div className="card-hover group p-8 bg-white rounded-3xl border border-gray-100 shadow-sm h-full">
                <div className={`h-16 w-16 flex items-center justify-center rounded-2xl bg-gradient-to-br ${feature.color} text-white mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-8 h-8" />
                </div>
                <h3 className="font-display text-xl font-bold text-gray-900 mb-3">
                  {t(feature.titleKey as any)}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {t(feature.descKey as any)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

////////////////////////////////////////////////////////////////////////////////
// TRAVELER SECTION
////////////////////////////////////////////////////////////////////////////////

function TravelerSection() {
  const { ref, isInView } = useInView();
  const { t } = useLanguage();

  const bullets = [
    t('traveler.bullet1'),
    t('traveler.bullet2'),
    t('traveler.bullet3'),
  ];

  return (
    <section ref={ref} className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-white relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[var(--sb-primary)]/5 rounded-full blur-3xl" />
      
      <div className="relative max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div className={`animate-on-scroll ${isInView ? "in-view" : ""}`}>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-[var(--sb-accent)]/10 text-[var(--sb-accent)] rounded-full text-sm font-semibold mb-4">
              <Map className="w-4 h-4" />
              {t('traveler.badge')}
            </span>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              {t('traveler.title')}
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed mb-8">
              {t('traveler.description')}
            </p>
            <ul className="space-y-4">
              {bullets.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-[var(--sb-success)]/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-[var(--sb-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className={`animate-on-scroll stagger-2 ${isInView ? "in-view" : ""}`}>
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-tr from-[var(--sb-accent)]/20 to-[var(--sb-primary)]/20 rounded-[3rem] blur-2xl" />
              <Image
                src="/coco.jpg"
                alt="Traveler using StackBot"
                width={600}
                height={700}
                loading="lazy"
                className="relative rounded-[2.5rem] shadow-2xl object-cover w-full h-[500px]"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

////////////////////////////////////////////////////////////////////////////////
// ONBOARDING CARDS
////////////////////////////////////////////////////////////////////////////////

function OnboardingCards() {
  const { ref, isInView } = useInView();
  const { t } = useLanguage();

  const steps = useMemo(() => [
    { number: "1", titleKey: 'onboarding.step1', descKey: 'onboarding.step1Desc', icon: Users },
    { number: "2", titleKey: 'onboarding.step2', descKey: 'onboarding.step2Desc', icon: Search },
    { number: "3", titleKey: 'onboarding.step3', descKey: 'onboarding.step3Desc', icon: MapPin },
  ], []);

  return (
    <section ref={ref} className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className={`text-center mb-16 animate-on-scroll ${isInView ? "in-view" : ""}`}>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900">
            {t('onboarding.title')}
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div
              key={step.number}
              className={`animate-on-scroll stagger-${i + 1} ${isInView ? "in-view" : ""}`}
            >
              <div className="card-hover group relative p-8 bg-white rounded-3xl border border-gray-100 shadow-sm text-center h-full">
                {/* Connector Line */}
                {i < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gray-200 z-10" />
                )}
                <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--sb-primary)] text-white font-display text-2xl font-bold mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  {step.number}
                </div>
                <h3 className="font-display text-xl font-bold text-gray-900 mb-3">
                  {t(step.titleKey as any)}
                </h3>
                <p className="text-gray-600">
                  {t(step.descKey as any)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

////////////////////////////////////////////////////////////////////////////////
// CATEGORIES
////////////////////////////////////////////////////////////////////////////////

function Categories() {
  const { ref, isInView } = useInView();
  const { t } = useLanguage();

  // UPDATED: Use proper category IDs that match /categories/[slug]
  const categories = useMemo(() => [
    { id: "restaurants", titleKey: "categories.restaurants", icon: Utensils },
    { id: "taxi-service", titleKey: "categories.taxiTransport", icon: Car },
    { id: "cleaning-services", titleKey: "categories.cleaningServices", icon: Brush },
    { id: "retail-shops", titleKey: "categories.retailShops", icon: Shirt },
  ], []);

  return (
    <section ref={ref} className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className={`flex items-center justify-between mb-10 animate-on-scroll ${isInView ? "in-view" : ""}`}>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-gray-900">{t('nav.categories')}</h2>
          <Link href="/categories" className="text-[var(--sb-primary)] font-semibold hover:underline flex items-center gap-1">
            {t('common.viewAll')} <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {categories.map((cat, i) => (
            <div
              key={cat.id}
              className={`animate-on-scroll stagger-${i + 1} ${isInView ? "in-view" : ""}`}
            >
              <Link href={`/categories/${cat.id}`}>
                <div className="card-hover group p-6 bg-white rounded-2xl border-2 border-gray-100 hover:border-[var(--sb-primary)] cursor-pointer">
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-14 w-14 flex items-center justify-center rounded-2xl bg-[var(--sb-primary)]/10 text-[var(--sb-primary)] group-hover:bg-[var(--sb-primary)] group-hover:text-white transition-all duration-300">
                      <cat.icon className="w-7 h-7" />
                    </div>
                  </div>
                  <h3 className="font-semibold text-gray-800 text-lg">{t(cat.titleKey as any)}</h3>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

////////////////////////////////////////////////////////////////////////////////
// SECTION WRAPPER & GRID
////////////////////////////////////////////////////////////////////////////////

function SectionWrapper({ 
  title, 
  subtitle,
  link, 
  icon,
  bgColor = "bg-gray-50",
  children 
}: { 
  title: string; 
  subtitle?: string;
  link: string; 
  icon?: React.ReactNode;
  bgColor?: string;
  children: React.ReactNode;
}) {
  const { ref, isInView } = useInView();
  const { t } = useLanguage();

  return (
    <section ref={ref} className={`py-20 px-4 sm:px-6 lg:px-8 ${bgColor}`}>
      <div className="max-w-7xl mx-auto">
        <div className={`flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4 animate-on-scroll ${isInView ? "in-view" : ""}`}>
          <div>
            <div className="flex items-center gap-2 mb-2">
              {icon && <span className="text-[var(--sb-primary)]">{icon}</span>}
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-gray-900">{title}</h2>
            </div>
            {subtitle && <p className="text-gray-500">{subtitle}</p>}
          </div>
          <Link href={link} className="text-[var(--sb-primary)] font-semibold hover:underline flex items-center gap-1 group">
            {t('common.viewAll')}
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        {children}
      </div>
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
      {children}
    </div>
  );
}

////////////////////////////////////////////////////////////////////////////////
// VENDOR CARD (Enhanced)
////////////////////////////////////////////////////////////////////////////////

function VendorCard({ vendor, index }: { vendor: Vendor; index: number }) {
  const { ref, isInView } = useInView();
  const [imageLoaded, setImageLoaded] = useState(false);
  const { t } = useLanguage();
  
  const displayName = vendor.business_name || vendor.name || "Unnamed Vendor";
  const description = vendor.business_description || vendor.description;
// Handle address - could be string or location object
const addressRaw = vendor.business_address || vendor.address;
const address = typeof addressRaw === 'string' 
  ? addressRaw 
  : (addressRaw as any)?.location_address || '';
  const logoUrl = vendor.logo_url || vendor.logoUrl;
  const bannerUrl = vendor.banner_url || vendor.cover_image_url;
  const category = vendor.category || vendor.categories?.[0];
  const vendorLink = vendor.slug ? `/store/${vendor.slug}` : `/store/${vendor.id}`;

  // Use banner first, fallback to logo
  const coverImage = bannerUrl || logoUrl;

  return (
    <div ref={ref} className={`animate-on-scroll stagger-${(index % 4) + 1} ${isInView ? "in-view" : ""}`}>
      <Link href={vendorLink}>
        <div className="card-hover bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer group h-full">
          {/* Banner/Logo Section */}
          <div className="aspect-[16/9] bg-gradient-to-br from-[var(--sb-primary)] to-[var(--sb-primary-light)] overflow-hidden relative">
            {/* Featured Badge */}
            <div className="absolute top-3 left-3 z-10">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-semibold text-[var(--sb-primary)] shadow-sm">
                <Sparkles className="w-3 h-3" />
                {t('products.featured')}
              </span>
            </div>
            
            {coverImage ? (
              <>
                {/* Image fills entire container */}
                <Image
                  src={coverImage}
                  alt={displayName}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  loading="lazy"
                  onLoad={() => setImageLoaded(true)}
                  className={`object-cover group-hover:scale-105 transition-transform duration-500 ${
                    imageLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                />
                
                {/* Loading skeleton */}
                {!imageLoaded && (
                  <div className="absolute inset-0 skeleton" />
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <Store className="w-16 h-16 text-white/50" />
              </div>
            )}
          </div>

          {/* Vendor Info */}
          <div className="p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-gray-900 line-clamp-1 text-lg group-hover:text-[var(--sb-primary)] transition-colors">
                {displayName}
              </h3>
              {vendor.verified && (
                <BadgeCheck className="w-5 h-5 text-[var(--sb-primary)] flex-shrink-0" />
              )}
            </div>
            
            {description && (
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                {description}
              </p>
            )}

            <div className="mt-3 flex items-center justify-between">
              {category && (
                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-[var(--sb-primary)]/10 text-[var(--sb-primary)] rounded-full font-medium">
                  {category}
                </span>
              )}

              {vendor.rating ? (
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-semibold text-gray-700">
                    {vendor.rating.toFixed(1)}
                  </span>
                  {vendor.total_reviews && (
                    <span className="text-xs text-gray-500">
                      ({vendor.total_reviews})
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-xs text-gray-400">{t('common.new')}</span>
              )}
            </div>

            {address && (
              <div className="mt-2 flex items-start gap-1.5 text-xs text-gray-500">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span className="line-clamp-1">{address}</span>
              </div>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}


////////////////////////////////////////////////////////////////////////////////
// PRODUCT CARD (Fixed - Images Fill Container)
////////////////////////////////////////////////////////////////////////////////

function ProductCard({ product, index }: { product: ProductWithVendor; index: number }) {
  const { ref, isInView } = useInView();
  const [imageLoaded, setImageLoaded] = useState(false);
  const { formatCurrency, t } = useLanguage();
  
  const vendorSlug = product.vendorSlug || product.vendor_slug || product.vendorId || product.vendor_id;
  const productLink = vendorSlug 
    ? `/store/${vendorSlug}/product/${product.id}`
    : `/product/${product.id}`;

  const productImage = product.images?.[0];

  return (
    <div ref={ref} className={`animate-on-scroll stagger-${(index % 4) + 1} ${isInView ? "in-view" : ""}`}>
      <Link href={productLink}>
        <div className="card-hover bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer group h-full flex flex-col">
          <div className="aspect-square bg-gray-100 overflow-hidden relative">
            {/* Product Badge */}
            <div className="absolute top-3 left-3 z-10">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[var(--sb-accent)] rounded-full text-xs font-semibold text-white shadow-sm">
                <TrendingUp className="w-3 h-3" />
                {t('common.popular')}
              </span>
            </div>
            
            {productImage ? (
              <>
                <Image
                  src={productImage}
                  alt={product.name}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  loading="lazy"
                  onLoad={() => setImageLoaded(true)}
                  className={`object-cover group-hover:scale-105 transition-transform duration-500 ${
                    imageLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                />
                
                {/* Loading skeleton */}
                {!imageLoaded && (
                  <div className="absolute inset-0 skeleton" />
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <Store className="w-12 h-12" />
              </div>
            )}
          </div>
          <div className="p-4 flex-1 flex flex-col">
            <h3 className="font-semibold text-gray-900 line-clamp-1 group-hover:text-[var(--sb-primary)] transition-colors">
              {product.name}
            </h3>
            <p className="text-sm text-gray-500 mt-1">{product.vendor_name || "Vendor"}</p>
            <div className="mt-auto pt-3 flex items-center justify-between">
              <p className="font-bold text-[var(--sb-primary)] text-lg">
                {formatCurrency(typeof product.price === 'number' ? product.price : 0)}
              </p>
              <span className="text-xs text-gray-400 group-hover:text-[var(--sb-primary)] transition-colors flex items-center gap-1">
                {t('common.view')} <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

////////////////////////////////////////////////////////////////////////////////
// LOADING GRID (Enhanced Skeletons)
////////////////////////////////////////////////////////////////////////////////

function LoadingGrid({ count = 4, type = "vendor" }: { count?: number; type?: "vendor" | "product" }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-100">
          <div className={`${type === "vendor" ? "aspect-[16/9]" : "aspect-square"} skeleton`} />
          <div className="p-4 space-y-3">
            <div className="h-5 skeleton rounded-lg w-3/4" />
            <div className="h-4 skeleton rounded-lg w-1/2" />
            <div className="flex justify-between items-center">
              <div className="h-6 skeleton rounded-lg w-1/4" />
              <div className="h-4 skeleton rounded-full w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

////////////////////////////////////////////////////////////////////////////////
// EMPTY STATE (Enhanced)
////////////////////////////////////////////////////////////////////////////////

function EmptyState({ message, description }: { message: string; description?: string }) {
  return (
    <div className="text-center py-16 px-4">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
        <Store className="w-8 h-8 text-gray-400" />
      </div>
      <p className="text-gray-700 font-medium text-lg">{message}</p>
      {description && <p className="text-gray-500 mt-2">{description}</p>}
    </div>
  );
}

////////////////////////////////////////////////////////////////////////////////
// VENDOR CTA
////////////////////////////////////////////////////////////////////////////////

function VendorCTA() {
  const { ref, isInView } = useInView();
  const { t } = useLanguage();

  return (
    <section ref={ref} className="relative py-24 sm:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#55529d] via-[#6b67b5] to-[#7c78c9] animate-gradient" />
      <div className="absolute inset-0 noise pointer-events-none" />
      
      {/* Decorative Elements */}
      <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
      <div className="absolute bottom-10 right-10 w-48 h-48 bg-orange-400/10 rounded-full blur-2xl" />
      
      <div className={`relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center animate-on-scroll ${isInView ? "in-view" : ""}`}>
        <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/15 backdrop-blur-sm rounded-full text-sm font-semibold text-white mb-6 border border-white/20">
          <Store className="w-4 h-4" />
          {t('vendorCta.badge')}
        </span>
        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
          {t('vendorCta.title')}
        </h2>
        <p className="mt-6 text-lg sm:text-xl text-white/80 max-w-2xl mx-auto">
          {t('vendorCta.subtitle')}
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/vendor-signup"
            className="btn-hover inline-flex items-center justify-center gap-2 bg-white text-[var(--sb-primary)] px-8 py-4 rounded-full font-bold text-lg shadow-2xl hover:shadow-xl hover:bg-gray-50 transition-all duration-300"
          >
            {t('vendorCta.cta')}
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/about"
            className="inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm text-white px-8 py-4 rounded-full font-bold text-lg border border-white/20 hover:bg-white/20 transition-all duration-300"
          >
            {t('vendorCta.learnMore')}
          </Link>
        </div>
      </div>
    </section>
  );
}