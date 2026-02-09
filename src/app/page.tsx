"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/hooks/useAuth";
import { signOut, getIdTokenResult } from "firebase/auth";
import { auth, db } from "@/lib/firebase/config";
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
import { vendorMatchesCategoryFilter } from "@/lib/utils/vendor-filters";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import {
  ArrowRight,
  Store,
  Search,
  Utensils,
  Car,
  Brush,
  Shirt,
  Home as HomeIcon,
  Menu,
  X,
  ChevronRight,
  MapPin,
  Star,
  Sparkles,
  TrendingUp,
  Clock,
  BadgeCheck,
  Bell,
  ShoppingCart,
  User,
  LogOut,
  ChevronDown,
  Heart,
  Compass,
  Package,
  Percent,
  Coffee,
  Salad,
  Pizza,
  Gift,
  Truck,
  Shield,
  Zap,
  ShoppingBasket,
  Briefcase,
  Wrench,
  Smartphone,
  Gem,
} from "lucide-react";
import LocationSelector, { LocationButton } from "@/components/location/LocationSelector";

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
  delivery_time?: string;
  delivery_fee?: number;
}

interface ProductWithVendor extends Product {
  vendorId?: string;
  vendorSlug?: string;
  vendor_slug?: string;
}

////////////////////////////////////////////////////////////////////////////////
// INTERSECTION OBSERVER HOOK
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
  const { user, loading: authLoading } = useAuth();
  const { itemCount } = useCart();
  const { t, language, setLanguage, formatCurrency } = useLanguage();  

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [allVendorsForCount, setAllVendorsForCount] = useState<Vendor[]>([]);
  const [featured, setFeatured] = useState<ProductWithVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [userLocation, setUserLocation] = useState<string>("Sosúa, Puerto Plata");
  const searchRef = useRef<HTMLDivElement>(null);

  // Get user's first name
  const userName = user?.displayName?.split(" ")[0] || "";

  // Search handler
  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (searchQuery.trim()) {
        setShowSuggestions(false);
        router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      }
    },
    [searchQuery, router]
  );

  // Generate search suggestions
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const q = searchQuery.toLowerCase();
    const suggestions = new Set<string>();

    featured.forEach((product) => {
      const name = product.name?.toLowerCase() || "";
      const vendor = product.vendor_name?.toLowerCase() || "";
      const category = product.category?.toLowerCase() || "";

      if (name.includes(q)) suggestions.add(product.name || "");
      if (vendor.includes(q)) suggestions.add(product.vendor_name || "");
      if (category.includes(q)) suggestions.add(product.category || "");
    });

    vendors.forEach((vendor) => {
      const name = (vendor.business_name || vendor.name || "").toLowerCase();
      const category = (vendor.category || "").toLowerCase();
      if (name.includes(q)) suggestions.add(vendor.business_name || vendor.name || "");
      if (category.includes(q)) suggestions.add(vendor.category || "");
    });

    const suggestionsArray = Array.from(suggestions).slice(0, 5);
    setSearchSuggestions(suggestionsArray);
    setShowSuggestions(suggestionsArray.length > 0);
  }, [searchQuery, featured, vendors]);

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
    router.push(`/search?q=${encodeURIComponent(suggestion)}`);
  };

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch user role
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


  // Load data
  useEffect(() => {
    const load = async () => {
      try {
        // Fetch display vendors (limited) and ALL vendors for category counts
        const [vendorsList, allVendorsList] = await Promise.all([
          fetchVendors(),
          fetchAllVendorsForCounts(),
        ]);
        setVendors(vendorsList);
        setAllVendorsForCount(allVendorsList);

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

  const getDashboardLink = () => {
    if (userRole === "admin") return "/admin";
    if (userRole === "vendor") return "/vendor";
    return "/account";
  };
  
 // Handle location change from LocationSelector
  const handleLocationChange = useCallback((location: string) => {
    setUserLocation(location);
  }, []);

  return (
    <div className="min-h-screen bg-[#fafafa] pb-20 lg:pb-0">
      {/* Global Styles */}
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
        
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        .safe-area-top {
          padding-top: env(safe-area-inset-top, 0px);
        }
        .safe-area-bottom {
          padding-bottom: env(safe-area-inset-bottom, 0px);
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

        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-pulse-glow { animation: pulse-glow 3s ease-in-out infinite; }
        .animate-gradient { 
          background-size: 200% 200%;
          animation: gradient-shift 8s ease infinite;
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

        .card-hover {
          transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .card-hover:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 40px -12px rgba(85, 82, 157, 0.2);
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

        .noise {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
          opacity: 0.03;
        }

        .animate-fade-in {
          animation: fade-in-up 0.3s ease-out;
        }

        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }

        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }

        /* Reduce motion for accessibility */
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>

      {/* Desktop Navbar */}
      <DesktopNavbar
        user={user}
        userRole={userRole}
        itemCount={itemCount}
        language={language}
        setLanguage={setLanguage}
        getDashboardLink={getDashboardLink}
        t={t}
        userLocation={userLocation}
        onLocationClick={() => setShowLocationModal(true)}
      />

      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-50 bg-white border-b border-gray-100">
        {/* Top padding for safe area + extra spacing (50px) */}
        <div className="pt-[50px] safe-area-top" />
        
        {/* Logo & Actions Row */}
        <div className="px-3 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/stackbot-logo-purp.png"
              alt="StackBot"
              width={80}
              height={30}
              className="object-contain"
              priority
            />
          </Link>

          <div className="flex items-center gap-1">
            {/* Language Toggle */}
            <button
              onClick={() => setLanguage(language === "en" ? "es" : "en")}
              className="p-2 hover:bg-gray-100 rounded-full text-sm font-medium"
            >
              {language === "en" ? "🇺🇸" : "🇩🇴"}
            </button>

            <Link href="/cart" className="p-2 hover:bg-gray-100 rounded-full relative">
              <ShoppingCart className="w-5 h-5 text-gray-700" />
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-[var(--sb-primary)] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {itemCount > 9 ? "9+" : itemCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Location Bar - Clickable */}
        <div className="px-4 pb-2">
          <LocationButton
            currentLocation={userLocation}
            onClick={() => setShowLocationModal(true)}
          />
        </div>

        {/* Search Bar - Enhanced */}
        <div className="px-4 pb-4" ref={searchRef}>
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  language === "es"
                    ? "Buscar comida, tiendas, productos..."
                    : "Search food, stores, products..."
                }
                className="w-full pl-12 pr-4 py-3.5 bg-gray-100 rounded-full text-base placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--sb-primary)]/30 focus:bg-white border border-transparent focus:border-[var(--sb-primary)]/40 transition-all shadow-sm"
              />

              {/* Search Suggestions */}
              {showSuggestions && searchSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-fade-in">
                  {searchSuggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full px-4 py-3.5 text-left hover:bg-gray-50 flex items-center gap-3 text-sm border-b border-gray-50 last:border-0 active:bg-gray-100"
                    >
                      <Search className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700 font-medium">{suggestion}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </form>
        </div>
      </header>

      {/* Location Selector Modal */}
      <LocationSelector
        user={user}
        language={language}
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        currentLocation={userLocation}
        onLocationChange={handleLocationChange}
      />

      {/* Main Content */}
      <main>
        {/* Welcome Section (Mobile) */}
        <section className="lg:hidden px-4 pt-4">
          {userName && (
            <h1 className="text-xl font-bold text-gray-900 mb-1">
              {language === "es" ? `¡Hola, ${userName}!` : `Hi, ${userName}!`}
            </h1>
          )}
          <p className="text-gray-500 text-sm mb-4">
            {language === "es"
              ? "¿Qué te gustaría pedir hoy?"
              : "What would you like to order today?"}
          </p>
        </section>

        {/* Desktop Hero Section */}
        <DesktopHero
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          handleSearch={handleSearch}
          showSuggestions={showSuggestions}
          searchSuggestions={searchSuggestions}
          handleSuggestionClick={handleSuggestionClick}
          searchRef={searchRef}
          language={language}
          t={t}
        />

        {/* Browse Categories */}
        <section className="px-4 py-6 lg:py-12 lg:max-w-7xl lg:mx-auto lg:px-8">
          <div className="flex items-center justify-between mb-5 lg:mb-8">
            <div>
              <h2 className="text-lg lg:text-2xl font-bold text-gray-900">
                {language === "es" ? "Explorar categorías" : "Browse Categories"}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5 hidden lg:block">
                {language === "es"
                  ? "Encuentra exactamente lo que necesitas"
                  : "Find exactly what you need"}
              </p>
            </div>
            <Link
              href="/categories"
              className="flex items-center text-[var(--sb-primary)] text-sm font-semibold hover:underline"
            >
              {language === "es" ? "Ver todo" : "See all"}
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4">
            <CategoryCardStyled
              icon={<Utensils className="w-7 h-7" />}
              label={language === "es" ? "Restaurantes" : "Restaurants"}
              count={allVendorsForCount.filter((v) => vendorMatchesCategoryFilter(v, "Restaurants")).length}
              href="/categories/restaurants"
            />
            <CategoryCardStyled
              icon={<ShoppingBasket className="w-7 h-7" />}
              label={language === "es" ? "Despensa" : "Groceries"}
              count={allVendorsForCount.filter((v) => vendorMatchesCategoryFilter(v, "Groceries")).length}
              href="/categories/groceries"
            />
            <CategoryCardStyled
              icon={<Car className="w-7 h-7" />}
              label={language === "es" ? "Taxi" : "Taxi Service"}
              count={allVendorsForCount.filter((v) => vendorMatchesCategoryFilter(v, "Taxi Service")).length}
              href="/categories/taxi-service"
            />
            <CategoryCardStyled
              icon={<Gem className="w-7 h-7" />}
              label={language === "es" ? "Belleza" : "Beauty & Wellness"}
              count={allVendorsForCount.filter((v) => vendorMatchesCategoryFilter(v, "Beauty & Wellness")).length}
              href="/categories/beauty-wellness"
            />
            <CategoryCardStyled
              icon={<Compass className="w-7 h-7" />}
              label={language === "es" ? "Tours" : "Tours & Activities"}
              count={allVendorsForCount.filter((v) => vendorMatchesCategoryFilter(v, "Tours & Activities")).length}
              href="/categories/tours-activities"
            />
            <CategoryCardStyled
              icon={<Briefcase className="w-7 h-7" />}
              label={language === "es" ? "Profesional" : "Professional Services"}
              count={allVendorsForCount.filter((v) => vendorMatchesCategoryFilter(v, "Professional Services")).length}
              href="/categories/professional-services"
            />
            <CategoryCardStyled
              icon={<Wrench className="w-7 h-7" />}
              label={language === "es" ? "Reparación" : "Home Repair"}
              count={allVendorsForCount.filter((v) => vendorMatchesCategoryFilter(v, "Home Repair & Maintenance")).length}
              href="/categories/home-repair"
            />
            <CategoryCardStyled
              icon={<Shirt className="w-7 h-7" />}
              label={language === "es" ? "Tiendas" : "Retail Shops"}
              count={allVendorsForCount.filter((v) => vendorMatchesCategoryFilter(v, "Retail Shops")).length}
              href="/categories/retail-shops"
            />
            <CategoryCardStyled
              icon={<Smartphone className="w-7 h-7" />}
              label={language === "es" ? "Electrónica" : "Electronics"}
              count={allVendorsForCount.filter((v) => vendorMatchesCategoryFilter(v, "Electronics & Gadgets")).length}
              href="/categories/electronics"
            />
            <CategoryCardStyled
              icon={<Sparkles className="w-7 h-7" />}
              label={language === "es" ? "Limpieza" : "Cleaning Services"}
              count={allVendorsForCount.filter((v) => vendorMatchesCategoryFilter(v, "Cleaning Services")).length}
              href="/categories/cleaning-services"
            />
          </div>
        </section>

        {/* Featured Vendors */}
        <section className="px-4 py-6 lg:py-12 lg:max-w-7xl lg:mx-auto lg:px-8">
          <div className="flex items-center justify-between mb-4 lg:mb-6">
            <h2 className="text-lg lg:text-2xl font-bold text-gray-900">
              {language === "es" ? "Tiendas destacadas" : "Featured Stores"}
            </h2>
            <Link
              href="/vendors"
              className="flex items-center text-[var(--sb-primary)] text-sm font-semibold hover:underline"
            >
              {language === "es" ? "Ver todo" : "See all"}
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <VendorCardSkeleton key={i} />
              ))}
            </div>
          ) : vendors.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              {vendors.slice(0, 6).map((vendor, index) => (
                <VendorCard key={vendor.id} vendor={vendor} index={index} language={language} formatCurrency={formatCurrency} />
              ))}
            </div>
          ) : (
            <EmptyState
              message={
                language === "es"
                  ? "No hay tiendas disponibles"
                  : "No stores available"
              }
            />
          )}
        </section>


        {/* Promo Banners */}
        <section className="px-4 py-6 lg:py-12 lg:max-w-7xl lg:mx-auto lg:px-8">
          <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0">
            <div className="flex gap-4 min-w-max lg:grid lg:grid-cols-2 lg:min-w-0 lg:gap-6">
              <PromoBanner
                title={
                  language === "es"
                    ? "Hasta 15% de descuento"
                    : "Up to 15% off"
                }
                subtitle={
                  language === "es"
                    ? "En tus restaurantes favoritos"
                    : "Your favorite restaurants"
                }
                cta={language === "es" ? "Ordenar ahora" : "Order now"}
                bgColor="bg-gradient-to-r from-[#6C5CE7] to-[#a29bfe]"
                href="/categories/deals"
              />
              <PromoBanner
                title={language === "es" ? "Envío gratis" : "Free delivery"}
                subtitle={
                  language === "es"
                    ? "En tu primer pedido"
                    : "On your first order"
                }
                cta={language === "es" ? "Ver más" : "Learn more"}
                bgColor="bg-gradient-to-r from-[#ff7675] to-[#fd79a8]"
                href="/signup"
              />
            </div>
          </div>
        </section>

        {/* Featured Products */}
        <section className="px-4 py-6 lg:py-12 lg:max-w-7xl lg:mx-auto lg:px-8">
          <div className="flex items-center justify-between mb-4 lg:mb-6">
            <h2 className="text-lg lg:text-2xl font-bold text-gray-900">
              {language === "es" ? "Productos populares" : "Popular Products"}
            </h2>
            <Link
              href="/products"
              className="flex items-center text-[var(--sb-primary)] text-sm font-semibold hover:underline"
            >
              {language === "es" ? "Ver todo" : "See all"}
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : featured.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-6">
              {featured.slice(0, 8).map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} formatCurrency={formatCurrency} t={t} />
              ))}
            </div>
          ) : (
            <EmptyState
              message={
                language === "es"
                  ? "No hay productos disponibles"
                  : "No products available"
              }
            />
          )}
        </section>

        {/* How It Works */}
        <HowItWorks language={language} />

        {/* Become a Vendor CTA */}
        <VendorCTA language={language} />
      </main>

      {/* Footer - shown on all devices */}
      <Footer />

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 lg:hidden safe-area-bottom">
        <div className="flex items-center justify-around py-2">
          <NavItem
            icon={<HomeIcon className="w-6 h-6" />}
            label={language === "es" ? "Inicio" : "Home"}
            href="/"
            active
          />
          <NavItem
            icon={<Compass className="w-6 h-6" />}
            label={language === "es" ? "Explorar" : "Browse"}
            href="/vendors"
          />
          <NavItem
            icon={<Package className="w-6 h-6" />}
            label={language === "es" ? "Pedidos" : "Orders"}
            href="/account/orders"
          />
          <NavItem
            icon={<User className="w-6 h-6" />}
            label={language === "es" ? "Perfil" : "Account"}
            href={user ? getDashboardLink() : "/login"}
          />
        </div>
      </nav>

      {/* Floating Cart Button */}
      {itemCount > 0 && (
        <Link
          href="/cart"
          className="fixed bottom-24 left-4 right-4 lg:bottom-6 lg:left-auto lg:right-6 lg:w-auto bg-[var(--sb-primary)] text-white rounded-full py-3.5 px-6 flex items-center justify-between shadow-lg shadow-[var(--sb-primary)]/30 z-40 hover:bg-[var(--sb-primary-dark)] transition-colors lg:hidden"
        >
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <span className="font-semibold text-sm">
              {language === "es" ? "Ver carrito" : "View Cart"}
            </span>
          </div>
          <span className="font-bold">{itemCount}</span>
        </Link>
      )}
    </div>
  );
}

////////////////////////////////////////////////////////////////////////////////
// DATA FETCHING FUNCTIONS
////////////////////////////////////////////////////////////////////////////////

async function fetchVendors(): Promise<Vendor[]> {
  const approvedSnap = await getDocs(
    query(collection(db, "vendors"), where("status", "==", "approved"), limit(12))
  );

  let allVendors = approvedSnap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as Vendor[];

  if (allVendors.length < 12) {
    const legacySnap = await getDocs(
      query(collection(db, "vendors"), where("verified", "==", true), limit(12))
    );

    const legacyVendors = legacySnap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as Vendor)
      .filter((v) => {
        if (v.status === "suspended" || v.status === "deleted") return false;
        return !allVendors.some((existing) => existing.id === v.id);
      });

    allVendors = [...allVendors, ...legacyVendors];
  }

  return allVendors.sort(sortByCreatedAt).slice(0, 12);
}

/**
 * Fetch ALL vendors (no limit) for accurate category counts.
 * Combines approved + legacy verified vendors.
 */
async function fetchAllVendorsForCounts(): Promise<Vendor[]> {
  const approvedSnap = await getDocs(
    query(collection(db, "vendors"), where("status", "==", "approved"))
  );

  let all = approvedSnap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as Vendor[];

  // Also include legacy verified vendors
  const legacySnap = await getDocs(
    query(collection(db, "vendors"), where("verified", "==", true))
  );

  const legacyVendors = legacySnap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Vendor)
    .filter((v) => {
      if (v.status === "suspended" || v.status === "deleted" || v.status === "rejected") return false;
      return !all.some((existing) => existing.id === v.id);
    });

  return [...all, ...legacyVendors];
}

async function fetchProductsFromVendors(
  vendorsList: Vendor[]
): Promise<ProductWithVendor[]> {
  const productPromises = vendorsList.slice(0, 8).map(async (vendor) => {
    try {
      if (
        vendor.status &&
        vendor.status !== "approved" &&
        vendor.verified === false
      )
        return [];

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
              productData.vendor_name || vendor.name || vendor.business_name,
          } as ProductWithVendor;
        });
    } catch (err) {
      console.error(`Error fetching products for vendor ${vendor.id}`, err);
      return [];
    }
  });

  const results = await Promise.all(productPromises);
  const allProducts = results.flat();

  return allProducts.sort(() => Math.random() - 0.5).slice(0, 12);
}

function sortByCreatedAt(a: Vendor, b: Vendor) {
  const aTime = a.created_at?.toMillis?.() || a.created_at?.seconds * 1000 || 0;
  const bTime = b.created_at?.toMillis?.() || b.created_at?.seconds * 1000 || 0;
  return bTime - aTime;
}

////////////////////////////////////////////////////////////////////////////////
// DESKTOP NAVBAR
////////////////////////////////////////////////////////////////////////////////

function DesktopNavbar({
  user,
  userRole,
  itemCount,
  language,
  setLanguage,
  getDashboardLink,
  t,
  userLocation,
  onLocationClick,
}: {
  user: any;
  userRole: string | null;
  itemCount: number;
  language: string;
  setLanguage: (lang: "en" | "es") => void;
  getDashboardLink: () => string;
  t: any;
  userLocation: string;
  onLocationClick: () => void;
}) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    setUserMenuOpen(false);
    router.push("/");
  };

  const getInitials = () => {
    if (user?.displayName) {
      return user.displayName
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return user?.email?.charAt(0).toUpperCase() || "U";
  };

  return (
    <nav className="hidden lg:block sticky top-0 z-50 bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center">
            <Image
              src="/stackbot-logo-purp.png"
              alt="StackBot"
              width={130}
              height={40}
              className="object-contain"
              priority
            />
          </Link>

          {/* Location - Clickable */}
          <button 
            onClick={onLocationClick}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
          >
            <MapPin className="w-4 h-4 text-[var(--sb-primary)]" />
            <span className="text-sm font-semibold text-gray-700 max-w-[180px] truncate">
              {userLocation}
            </span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/vendors"
            className="text-sm font-medium text-gray-700 hover:text-[var(--sb-primary)] transition-colors"
          >
            {language === "es" ? "Tiendas" : "Stores"}
          </Link>
          <Link
            href="/vendor-signup"
            className="text-sm font-medium text-gray-700 hover:text-[var(--sb-primary)] transition-colors"
          >
            {language === "es" ? "Conviértete en vendedor" : "Become A Vendor"}
          </Link>

          {/* Language Toggle */}
          <button
            onClick={() => setLanguage(language === "en" ? "es" : "en")}
            className="px-3 py-1.5 bg-gray-100 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            {language === "en" ? "🇺🇸 EN" : "🇩🇴 ES"}
          </button>

          {/* Cart */}
          <Link
            href="/cart"
            className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ShoppingCart className="w-5 h-5 text-gray-700" />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-[var(--sb-primary)] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {itemCount > 9 ? "9+" : itemCount}
              </span>
            )}
          </Link>

          {/* User Menu */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 bg-[var(--sb-primary)]/10 hover:bg-[var(--sb-primary)]/20 px-3 py-2 rounded-full transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-[var(--sb-primary)] text-white flex items-center justify-center text-sm font-semibold">
                  {getInitials()}
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-[var(--sb-primary)] transition-transform ${
                    userMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

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
                        {language === "es" ? "Mi Cuenta" : "My Account"}
                      </span>
                    </Link>
                    <Link
                      href="/account/orders"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Package className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        {language === "es" ? "Mis Pedidos" : "My Orders"}
                      </span>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 transition-colors w-full"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        {language === "es" ? "Cerrar sesión" : "Logout"}
                      </span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="bg-[var(--sb-primary)] text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-[var(--sb-primary-dark)] transition-colors"
            >
              {language === "es" ? "Iniciar sesión" : "Sign In"}
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

////////////////////////////////////////////////////////////////////////////////
// DESKTOP HERO
////////////////////////////////////////////////////////////////////////////////

function DesktopHero({
  searchQuery,
  setSearchQuery,
  handleSearch,
  showSuggestions,
  searchSuggestions,
  handleSuggestionClick,
  searchRef,
  language,
  t,
}: {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  handleSearch: (e: React.FormEvent) => void;
  showSuggestions: boolean;
  searchSuggestions: string[];
  handleSuggestionClick: (s: string) => void;
  searchRef: React.RefObject<HTMLDivElement | null>;
  language: string;
  t: any;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section className="hidden lg:flex relative min-h-[90vh] items-center overflow-hidden bg-gradient-to-br from-[#55529d] via-[#6b67b5] to-[#7c78c9] animate-gradient">
      {/* Decorative Elements */}
      <div className="absolute inset-0 noise pointer-events-none" />
      <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-400/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "-3s" }} />
      
      {/* Grid Pattern */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
        backgroundSize: '60px 60px'
      }} />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left Content */}
          <div className={`transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/15 backdrop-blur-sm rounded-full text-sm font-semibold text-white mb-6 border border-white/20">
              <Sparkles className="w-4 h-4" />
              {language === "es" ? "Tu Mercado Local" : "Your Local Marketplace"}
            </span>
            
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight">
              {language === "es" 
                ? "El Todo-en-Uno Marketplace"
                : "The All-in-One Marketplace"}
            </h1>
            
            <p className="mt-6 text-lg sm:text-xl text-white/80 max-w-lg">
              {language === "es"
                ? "Conectamos compradores con vendedores locales. Restaurantes, tiendas, servicios y más."
                : "We connect buyers with local vendors. Restaurants, shops, services, and more."}
            </p>

            {/* Search Bar */}
            <div className="mt-10 relative" ref={searchRef}>
              <form onSubmit={handleSearch}>
                <div className="flex items-center bg-white rounded-full p-2 shadow-2xl">
                  <Search className="ml-4 text-gray-400 w-6 h-6" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      language === "es"
                        ? "Buscar comida, tiendas, productos..."
                        : "Search food, stores, products..."
                    }
                    className="flex-1 px-4 py-4 text-gray-900 placeholder:text-gray-400 focus:outline-none text-lg"
                  />
                  <button
                    type="submit"
                    className="btn-hover bg-[var(--sb-primary)] text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-[var(--sb-primary-dark)] transition-colors shadow-lg"
                  >
                    {language === "es" ? "Buscar" : "Search"}
                  </button>
                </div>

                {/* Suggestions */}
                {showSuggestions && searchSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-fade-in">
                    {searchSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="w-full px-6 py-4 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors"
                      >
                        <Search className="w-5 h-5 text-gray-400" />
                        <span className="text-gray-700 font-medium">{suggestion}</span>
                      </button>
                    ))}
                  </div>
                )}
              </form>
            </div>

            {/* Stats */}
            <div className={`mt-12 flex flex-wrap gap-8 sm:gap-12 transition-all duration-700 delay-300 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
              {[
                { value: "500+", label: language === "es" ? "Tiendas" : "Stores", icon: Store },
                { value: "99%", label: language === "es" ? "Entrega a tiempo" : "On-time delivery", icon: Clock },
                { value: "24/7", label: language === "es" ? "Soporte" : "Support", icon: Shield },
              ].map((stat) => (
                <div key={stat.label} className="group flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                    <stat.icon className="w-6 h-6 text-white/80" />
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-bold text-white group-hover:text-orange-300 transition-colors duration-300">
                      {stat.value}
                    </div>
                    <p className="text-white/60 text-sm">{stat.label}</p>
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
              
              {/* Floating Card - Fast Delivery */}
              <div className="absolute -left-8 bottom-20 bg-white rounded-2xl p-4 shadow-xl animate-float" style={{ animationDelay: "-2s" }}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <Zap className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      {language === "es" ? "Entrega Rápida" : "Fast Delivery"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {language === "es" ? "En menos de 30 min" : "Under 30 minutes"}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Floating Card - Growing */}
              <div className="absolute -right-4 top-20 bg-white rounded-2xl p-4 shadow-xl animate-float" style={{ animationDelay: "-4s" }}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">500+ {language === "es" ? "Tiendas" : "Stores"}</p>
                    <p className="text-xs text-gray-500">
                      {language === "es" ? "Y creciendo" : "And growing"}
                    </p>
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
// UI COMPONENTS
////////////////////////////////////////////////////////////////////////////////

function PromoBanner({
  title,
  subtitle,
  cta,
  bgColor,
  href,
}: {
  title: string;
  subtitle: string;
  cta: string;
  bgColor: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={`${bgColor} rounded-2xl p-5 min-w-[280px] lg:min-w-0 flex-1 hover:opacity-95 transition-opacity`}
    >
      <div className="text-white">
        <p className="font-bold text-lg leading-tight">{title}</p>
        <p className="text-sm opacity-90 mt-1">{subtitle}</p>
        <span className="inline-block mt-3 bg-white/20 backdrop-blur-sm text-white text-sm font-semibold px-4 py-1.5 rounded-full">
          {cta}
        </span>
      </div>
    </Link>
  );
}

////////////////////////////////////////////////////////////////////////////////
// RESTYLED CATEGORY CARD
////////////////////////////////////////////////////////////////////////////////

function CategoryCardStyled({
  icon,
  label,
  count,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  count?: number;
  href: string;
}) {
  return (
    <Link href={href} className="block group">
      <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 lg:p-5 hover:shadow-lg hover:border-[var(--sb-primary)]/20 transition-all duration-300 h-full">
        {/* Gradient accent strip at top */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--sb-primary)] to-[var(--sb-primary-light)] opacity-60 group-hover:opacity-100 transition-opacity" />
        
        {/* Icon */}
        <div className="bg-[var(--sb-primary)]/10 text-[var(--sb-primary)] w-12 h-12 lg:w-14 lg:h-14 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-[var(--sb-primary)]/15 transition-all duration-300">
          {icon}
        </div>

        {/* Label */}
        <h3 className="font-bold text-gray-900 text-sm lg:text-base leading-tight group-hover:text-[var(--sb-primary)] transition-colors">
          {label}
        </h3>

        {/* Count */}
        {count !== undefined && count > 0 && (
          <p className="text-xs text-gray-400 mt-1 font-medium">
            {count} {count === 1 ? "store" : "stores"}
          </p>
        )}

        {/* Arrow */}
        <div className="absolute bottom-4 right-4 lg:bottom-5 lg:right-5 w-7 h-7 rounded-full bg-gray-100 group-hover:bg-[var(--sb-primary)] flex items-center justify-center transition-all duration-300">
          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
        </div>
      </div>
    </Link>
  );
}

function NavItem({
  icon,
  label,
  href,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-0.5 px-4 py-1 ${
        active ? "text-[var(--sb-primary)]" : "text-gray-400"
      }`}
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12 bg-gray-50 rounded-2xl">
      <Store className="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500 text-sm">{message}</p>
    </div>
  );
}

////////////////////////////////////////////////////////////////////////////////
// VENDOR CARD
////////////////////////////////////////////////////////////////////////////////

function VendorCard({
  vendor,
  index,
  language,
  formatCurrency,
}: {
  vendor: Vendor;
  index: number;
  language: string;
  formatCurrency: (n: number) => string;
}) {
  const displayName = vendor.business_name || vendor.name || "Store";
  const logoUrl = vendor.logo_url || vendor.logoUrl;
  const bannerUrl = vendor.banner_url || vendor.cover_image_url;
  const category = vendor.category || vendor.categories?.[0];
  const vendorLink = vendor.slug ? `/store/${vendor.slug}` : `/store/${vendor.id}`;
  const coverImage = bannerUrl || logoUrl;
  const deliveryTime = vendor.delivery_time || "15-30 min";
  const deliveryFee = vendor.delivery_fee;

  return (
    <Link href={vendorLink} className="block group">
      <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-lg transition-all">
        {/* Image */}
        <div className="aspect-[2/1] bg-gray-100 relative overflow-hidden">
          {coverImage ? (
            <Image
              src={coverImage}
              alt={displayName}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[var(--sb-primary)] to-[var(--sb-primary-light)] flex items-center justify-center">
              <Store className="w-12 h-12 text-white/50" />
            </div>
          )}

          {/* Verified Badge */}
          {vendor.verified && (
            <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm rounded-full px-2.5 py-1 flex items-center gap-1 shadow-sm">
              <BadgeCheck className="w-3.5 h-3.5 text-[var(--sb-primary)]" />
              <span className="text-[10px] font-semibold text-gray-700">
                {language === "es" ? "Verificado" : "Verified"}
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate group-hover:text-[var(--sb-primary)] transition-colors">
                {displayName}
              </h3>
              {category && (
                <p className="text-sm text-gray-500 truncate">{category}</p>
              )}
            </div>

            {/* Rating */}
            {vendor.rating && (
              <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-md flex-shrink-0">
                <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                <span className="text-sm font-semibold text-gray-700">
                  {vendor.rating.toFixed(1)}
                </span>
              </div>
            )}
          </div>

          {/* Delivery Info */}
          <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {deliveryTime}
            </span>
            <span className="w-1 h-1 rounded-full bg-gray-300" />
            {deliveryFee !== undefined ? (
              <span>
                {deliveryFee === 0
                  ? language === "es"
                    ? "Envío gratis"
                    : "Free delivery"
                  : formatCurrency(deliveryFee)}
              </span>
            ) : (
              <span>{language === "es" ? "Ver precios" : "See prices"}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

function VendorCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100">
      <div className="aspect-[2/1] skeleton" />
      <div className="p-4 space-y-3">
        <div className="h-5 skeleton rounded w-3/4" />
        <div className="h-4 skeleton rounded w-1/2" />
        <div className="h-3 skeleton rounded w-2/3" />
      </div>
    </div>
  );
}

////////////////////////////////////////////////////////////////////////////////
// PRODUCT CARD
////////////////////////////////////////////////////////////////////////////////

function ProductCard({
  product,
  index,
  formatCurrency,
  t,
}: {
  product: ProductWithVendor;
  index: number;
  formatCurrency: (n: number) => string;
  t: any;
}) {
  const vendorSlug =
    product.vendorSlug || product.vendor_slug || product.vendorId || product.vendor_id;
  const productLink = vendorSlug
    ? `/store/${vendorSlug}/product/${product.id}`
    : `/product/${product.id}`;
  const productImage = product.images?.[0];

  return (
    <Link href={productLink} className="block group">
      <div className="bg-white rounded-xl overflow-hidden border border-gray-100 hover:shadow-md transition-all h-full">
        <div className="aspect-square bg-gray-100 relative overflow-hidden">
          {productImage ? (
            <Image
              src={productImage}
              alt={product.name || "Product"}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-10 h-10 text-gray-300" />
            </div>
          )}

          {/* Popular Badge */}
          {index < 4 && (
            <div className="absolute top-2 left-2 bg-[var(--sb-accent)] text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Popular
            </div>
          )}
        </div>

        <div className="p-3">
          <h3 className="font-medium text-gray-900 text-sm line-clamp-2 leading-tight group-hover:text-[var(--sb-primary)] transition-colors">
            {product.name || "Product"}
          </h3>
          <p className="text-xs text-gray-500 mt-1 truncate">
            {product.vendor_name}
          </p>
          <p className="text-[var(--sb-primary)] font-bold text-sm mt-2">
            {formatCurrency(typeof product.price === "number" ? product.price : 0)}
          </p>
        </div>
      </div>
    </Link>
  );
}

function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-xl overflow-hidden border border-gray-100">
      <div className="aspect-square skeleton" />
      <div className="p-3 space-y-2">
        <div className="h-4 skeleton rounded w-3/4" />
        <div className="h-3 skeleton rounded w-1/2" />
        <div className="h-4 skeleton rounded w-1/3" />
      </div>
    </div>
  );
}

////////////////////////////////////////////////////////////////////////////////
// HOW IT WORKS
////////////////////////////////////////////////////////////////////////////////

function HowItWorks({ language }: { language: string }) {
  const { ref, isInView } = useInView();

  const steps = [
    {
      icon: <Search className="w-6 h-6" />,
      title: language === "es" ? "Busca" : "Search",
      desc:
        language === "es"
          ? "Encuentra tiendas y productos cerca de ti"
          : "Find stores and products near you",
    },
    {
      icon: <ShoppingCart className="w-6 h-6" />,
      title: language === "es" ? "Ordena" : "Order",
      desc:
        language === "es"
          ? "Agrega productos a tu carrito y paga"
          : "Add items to cart and checkout",
    },
    {
      icon: <Truck className="w-6 h-6" />,
      title: language === "es" ? "Recibe" : "Receive",
      desc:
        language === "es"
          ? "Recibe tu pedido en minutos"
          : "Get your order in minutes",
    },
  ];

  return (
    <section
      ref={ref}
      className="py-16 lg:py-24 bg-white"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center mb-12 animate-on-scroll ${isInView ? "in-view" : ""}`}>
          <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-[var(--sb-primary)]/10 text-[var(--sb-primary)] rounded-full text-sm font-semibold mb-4">
            <Sparkles className="w-4 h-4" />
            {language === "es" ? "Fácil y rápido" : "Easy & Fast"}
          </span>
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-gray-900">
            {language === "es" ? "¿Cómo funciona?" : "How It Works"}
          </h2>
          <p className="text-gray-500 mt-3 text-lg max-w-2xl mx-auto">
            {language === "es"
              ? "Ordenar nunca ha sido tan fácil"
              : "Ordering has never been easier"}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div
              key={i}
              className={`card-hover text-center p-8 bg-gray-50 rounded-3xl border border-gray-100 animate-on-scroll stagger-${i + 1} ${
                isInView ? "in-view" : ""
              }`}
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--sb-primary)] to-[var(--sb-primary-light)] text-white flex items-center justify-center mx-auto mb-6 shadow-lg">
                {step.icon}
              </div>
              <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[var(--sb-accent)] text-white font-bold text-sm mb-4">
                {i + 1}
              </div>
              <h3 className="font-display font-bold text-gray-900 text-xl">{step.title}</h3>
              <p className="text-gray-500 mt-3">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

////////////////////////////////////////////////////////////////////////////////
// VENDOR CTA
////////////////////////////////////////////////////////////////////////////////

function VendorCTA({ language }: { language: string }) {
  const { ref, isInView } = useInView();

  return (
    <section ref={ref} className="relative py-20 sm:py-28 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#55529d] via-[#6b67b5] to-[#7c78c9] animate-gradient" />
      <div className="absolute inset-0 noise pointer-events-none" />
      
      {/* Decorative Elements */}
      <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
      <div className="absolute bottom-10 right-10 w-48 h-48 bg-orange-400/10 rounded-full blur-2xl" />
      
      <div className={`relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center animate-on-scroll ${isInView ? "in-view" : ""}`}>
        <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/15 backdrop-blur-sm rounded-full text-sm font-semibold text-white mb-6 border border-white/20">
          <Store className="w-4 h-4" />
          {language === "es" ? "Para Negocios" : "For Businesses"}
        </span>
        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
          {language === "es"
            ? "Haz crecer tu negocio con StackBot"
            : "Grow your business with StackBot"}
        </h2>
        <p className="mt-6 text-lg sm:text-xl text-white/80 max-w-2xl mx-auto">
          {language === "es"
            ? "Únete a cientos de vendedores y llega a más clientes en tu comunidad"
            : "Join hundreds of vendors and reach more customers in your community"}
        </p>

        {/* Features */}
        <div className="mt-8 flex flex-wrap justify-center gap-6">
          <div className="flex items-center gap-2 text-white/90">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium">
              {language === "es" ? "Pagos seguros" : "Secure payments"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-white/90">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium">
              {language === "es" ? "Fácil configuración" : "Easy setup"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-white/90">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium">
              {language === "es" ? "Aumenta ventas" : "Boost sales"}
            </span>
          </div>
        </div>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/vendor-signup"
            className="btn-hover inline-flex items-center justify-center gap-2 bg-white text-[var(--sb-primary)] px-8 py-4 rounded-full font-bold text-lg shadow-2xl hover:shadow-xl hover:bg-gray-50 transition-all duration-300"
          >
            {language === "es" ? "Comenzar gratis" : "Get started free"}
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/about"
            className="inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm text-white px-8 py-4 rounded-full font-bold text-lg border border-white/20 hover:bg-white/20 transition-all duration-300"
          >
            {language === "es" ? "Saber más" : "Learn more"}
          </Link>
        </div>
      </div>
    </section>
  );
}