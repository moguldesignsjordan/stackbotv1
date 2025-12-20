"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase/config";
import {
  collection,
  getDocs,
  query,
  where,
  limit,
} from "firebase/firestore";

import type { Product } from "@/lib/types";

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
      `}</style>

      <Navbar />
      <Hero searchQuery={searchQuery} setSearchQuery={setSearchQuery} handleSearch={handleSearch} />
      <MarketplaceGrid />
      
      {/* Featured Vendors Section */}
      <SectionWrapper 
        title="Featured Vendors" 
        subtitle="Discover top-rated local businesses"
        link="/vendors"
        icon={<BadgeCheck className="w-5 h-5" />}
      >
        {loading ? (
          <LoadingGrid count={4} type="vendor" />
        ) : vendors.length > 0 ? (
          <Grid>{vendors.map((v, i) => <VendorCard key={v.id} vendor={v} index={i} />)}</Grid>
        ) : (
          <EmptyState 
            message="No vendors available yet" 
            description="Check back soon for amazing local businesses"
          />
        )}
      </SectionWrapper>

      <WhyStackBot />
      <TravelerSection />
      <OnboardingCards />

      <SectionWrapper 
        title="Featured Products" 
        subtitle="Handpicked items just for you"
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
            message="No products available yet" 
            description="Products from our vendors will appear here"
          />
        )}
      </SectionWrapper>

      <Categories />
      <VendorCTA />
      <Footer />
    </div>
  );
}

////////////////////////////////////////////////////////////////////////////////
// DATA FETCHING FUNCTIONS (Optimized)
////////////////////////////////////////////////////////////////////////////////

async function fetchVendors(): Promise<Vendor[]> {
  let vendorsList: Vendor[] = [];

  // Try status == "approved" first
  const approvedSnap = await getDocs(
    query(collection(db, "vendors"), where("status", "==", "approved"), limit(8))
  );

  if (approvedSnap.docs.length > 0) {
    vendorsList = approvedSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Vendor));
  } else {
    // Fallback: Try verified == true
    const verifiedSnap = await getDocs(
      query(collection(db, "vendors"), where("verified", "==", true), limit(8))
    );

    if (verifiedSnap.docs.length > 0) {
      vendorsList = verifiedSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Vendor));
    } else {
      // Last fallback: Get all vendors
      const allVendorsSnap = await getDocs(query(collection(db, "vendors"), limit(8)));
      vendorsList = allVendorsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Vendor));
    }
  }

  // Sort by created_at
  return vendorsList.sort((a, b) => {
    const aTime = a.created_at?.toMillis?.() || a.created_at?.seconds * 1000 || 0;
    const bTime = b.created_at?.toMillis?.() || b.created_at?.seconds * 1000 || 0;
    return bTime - aTime;
  });
}

async function fetchProductsFromVendors(vendorsList: Vendor[]): Promise<ProductWithVendor[]> {
  let allProducts: ProductWithVendor[] = [];

  // Fetch products directly from each vendor's subcollection
  // This ensures we only get real products from real vendors
  const productPromises = vendorsList.slice(0, 6).map(async (vendor) => {
    try {
      const productsSnap = await getDocs(
        collection(db, "vendors", vendor.id, "products")
      );
      
      return productsSnap.docs
        .filter(d => d.data().active !== false)
        .map((d) => {
          const productData = d.data();
          return {
            id: d.id,
            ...productData,
            vendorId: vendor.id,
            vendorSlug: vendor.slug || vendor.id,
            vendor_name: productData.vendor_name || vendor.name || vendor.business_name,
          } as ProductWithVendor;
        });
    } catch (err) {
      console.log(`Error fetching products for vendor ${vendor.id}:`, err);
      return [];
    }
  });

  const results = await Promise.all(productPromises);
  allProducts = results.flat();

  console.log(`Fetched ${allProducts.length} products from ${vendorsList.length} vendors`);
  
  // Shuffle and limit to 8 products for variety
  return allProducts
    .sort(() => Math.random() - 0.5)
    .slice(0, 8);
}

////////////////////////////////////////////////////////////////////////////////
// NAVBAR (Optimized)
////////////////////////////////////////////////////////////////////////////////

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "glass shadow-lg py-3" : "bg-transparent py-5"
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <Image
              src="/stackbot-logo-purp.png"
              alt="StackBot"
              width={140}
              height={40}
              priority
              className="object-contain transition-transform duration-300 group-hover:scale-105"
            />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {[
              { href: "/products", label: "Browse" },
              { href: "/vendors", label: "Vendors" },
              { href: "/vendor-signup", label: "Become a Vendor" },
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
            <Link
              href="/login"
              className="btn-hover bg-[var(--sb-primary)] text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-[var(--sb-primary-dark)] transition-all duration-300 shadow-md hover:shadow-xl"
            >
              Login
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button 
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div className={`fixed inset-0 z-40 md:hidden transition-all duration-300 ${
        mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
        <div className={`absolute right-0 top-0 bottom-0 w-80 bg-white shadow-2xl transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "translate-x-full"
        }`}>
          <div className="p-6 pt-20 space-y-6">
            <Link href="/products" className="block text-lg font-medium text-gray-800 hover:text-[var(--sb-primary)] transition-colors">
              Browse Products
            </Link>
            <Link href="/vendors" className="block text-lg font-medium text-gray-800 hover:text-[var(--sb-primary)] transition-colors">
              Browse Vendors
            </Link>
            <Link href="/vendor-signup" className="block text-lg font-medium text-gray-800 hover:text-[var(--sb-primary)] transition-colors">
              Become a Vendor
            </Link>
            <Link href="/login" className="block w-full text-center bg-[var(--sb-primary)] text-white px-6 py-3 rounded-full font-semibold">
              Login
            </Link>
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
              <span className="text-white/90 text-sm font-medium">Now serving the Caribbean</span>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-[1.1] tracking-tight">
              The All-in-One
              <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-white via-orange-200 to-orange-400">
                Marketplace
              </span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-white/80 max-w-lg leading-relaxed">
              Order food, shop local businesses, book services, and connect with trusted vendors powered by AI-driven delivery.
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
                    placeholder="Search vendors, products..."
                    className="flex-1 py-3 text-gray-900 placeholder-gray-400 focus:outline-none text-base"
                  />
                  <button 
                    type="submit"
                    className="btn-hover bg-[var(--sb-primary)] text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 hover:bg-[var(--sb-primary-dark)] transition-all duration-300 flex-shrink-0"
                  >
                    <span className="hidden sm:inline">Search</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>

            {/* Stats */}
            <div className={`mt-12 flex flex-wrap gap-8 sm:gap-12 transition-all duration-700 delay-300 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
              {[
                { value: "500+", label: "Vendor Partners", icon: Store },
                { value: "99%", label: "On-Time Delivery", icon: Clock },
                { value: "24/7", label: "Support", icon: Shield },
              ].map((stat) => (
                <div key={stat.label} className="group flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                    <stat.icon className="w-5 h-5 text-white/80" />
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-bold text-white group-hover:text-orange-300 transition-colors duration-300">
                      {stat.value}
                    </div>
                    <p className="text-white/60 text-xs">{stat.label}</p>
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
                    <p className="text-sm font-semibold text-gray-900">Fast Delivery</p>
                    <p className="text-xs text-gray-500">Under 30 minutes</p>
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
                    <p className="text-sm font-semibold text-gray-900">500+ Vendors</p>
                    <p className="text-xs text-gray-500">And growing</p>
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

  const items = useMemo(() => [
    { label: "Food Delivery", icon: Utensils, color: "from-orange-400 to-red-500" },
    { label: "Retail & Shops", icon: Shirt, color: "from-blue-400 to-indigo-500" },
    { label: "Taxi & Transport", icon: Car, color: "from-yellow-400 to-orange-500" },
    { label: "Beauty & Wellness", icon: Brush, color: "from-pink-400 to-rose-500" },
    { label: "Home Services", icon: Store, color: "from-teal-400 to-cyan-500" },
    { label: "Rentals & Real Estate", icon: Home, color: "from-green-400 to-emerald-500" },
    { label: "Tours & Tourism", icon: Map, color: "from-purple-400 to-violet-500" },
    { label: "Peer-to-Peer", icon: Users, color: "from-sky-400 to-blue-500" },
  ], []);

  return (
    <section ref={ref} className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-white relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
      
      <div className="max-w-7xl mx-auto">
        <div className={`text-center mb-16 animate-on-scroll ${isInView ? "in-view" : ""}`}>
          <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-[var(--sb-primary)]/10 text-[var(--sb-primary)] rounded-full text-sm font-semibold mb-4">
            <Sparkles className="w-4 h-4" />
            Everything You Need
          </span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900">
            One App, Endless Possibilities
          </h2>
          <p className="mt-4 text-gray-600 text-lg max-w-2xl mx-auto">
            From daily essentials to special occasions, StackBot connects you to the best local businesses.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {items.map((item, i) => (
            <div
              key={item.label}
              className={`animate-on-scroll stagger-${(i % 8) + 1} ${isInView ? "in-view" : ""}`}
            >
              <div className="card-hover group relative p-6 sm:p-8 bg-gray-50 rounded-3xl cursor-pointer overflow-hidden border border-gray-100">
                <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                <div className="relative z-10">
                  <div className="h-14 w-14 flex items-center justify-center rounded-2xl bg-white shadow-sm text-gray-700 group-hover:text-white group-hover:bg-white/20 transition-all duration-300 mb-4">
                    <item.icon className="w-7 h-7" />
                  </div>
                  <h3 className="font-semibold text-gray-800 group-hover:text-white transition-colors duration-300 text-sm sm:text-base">
                    {item.label}
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

  const features = useMemo(() => [
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "AI-optimized routes ensure your order arrives in record time",
      color: "from-yellow-400 to-orange-500",
    },
    {
      icon: Shield,
      title: "Secure & Trusted",
      description: "End-to-end encryption and verified vendors for peace of mind",
      color: "from-green-400 to-emerald-500",
    },
    {
      icon: Globe,
      title: "Caribbean-Wide",
      description: "Connecting communities across the Caribbean islands",
      color: "from-blue-400 to-indigo-500",
    },
  ], []);

  return (
    <section ref={ref} className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto">
        <div className={`text-center mb-16 animate-on-scroll ${isInView ? "in-view" : ""}`}>
          <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-[var(--sb-accent)]/10 text-[var(--sb-accent)] rounded-full text-sm font-semibold mb-4">
            <BadgeCheck className="w-4 h-4" />
            Why Choose Us
          </span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900">
            Built For the Caribbean
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className={`animate-on-scroll stagger-${i + 1} ${isInView ? "in-view" : ""}`}
            >
              <div className="card-hover group p-8 bg-white rounded-3xl border border-gray-100 shadow-sm h-full">
                <div className={`h-16 w-16 flex items-center justify-center rounded-2xl bg-gradient-to-br ${feature.color} text-white mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-8 h-8" />
                </div>
                <h3 className="font-display text-xl font-bold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
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

  return (
    <section ref={ref} className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-white relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[var(--sb-primary)]/5 rounded-full blur-3xl" />
      
      <div className="relative max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div className={`animate-on-scroll ${isInView ? "in-view" : ""}`}>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-[var(--sb-accent)]/10 text-[var(--sb-accent)] rounded-full text-sm font-semibold mb-4">
              <Map className="w-4 h-4" />
              For Travelers
            </span>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Your Caribbean Adventure Starts Here
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed mb-8">
              Discover authentic local experiences, book tours, find the best restaurants, and navigate with ease. StackBot is your essential travel companion across the islands.
            </p>
            <ul className="space-y-4">
              {[
                "Curated local experiences and hidden gems",
                "Real-time translations and local guides",
                "Secure bookings and verified reviews",
              ].map((item) => (
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
                src="/girl-phone.jpg"
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

  const steps = useMemo(() => [
    { number: "1", title: "Create Account", description: "Quick signup with email or social", icon: Users },
    { number: "2", title: "Browse & Order", description: "Explore vendors and place orders", icon: Search },
    { number: "3", title: "Track Delivery", description: "Real-time tracking to your door", icon: MapPin },
  ], []);

  return (
    <section ref={ref} className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className={`text-center mb-16 animate-on-scroll ${isInView ? "in-view" : ""}`}>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900">
            Get Started in 3 Simple Steps
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
                  {step.title}
                </h3>
                <p className="text-gray-600">
                  {step.description}
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

  const categories = useMemo(() => [
    { title: "Restaurants", icon: Utensils, count: "150+" },
    { title: "Taxi Service", icon: Car, count: "80+" },
    { title: "Cleaning Service", icon: Brush, count: "45+" },
    { title: "Retail Shops", icon: Shirt, count: "200+" },
  ], []);

  return (
    <section ref={ref} className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className={`flex items-center justify-between mb-10 animate-on-scroll ${isInView ? "in-view" : ""}`}>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-gray-900">Categories</h2>
          <Link href="/categories" className="text-[var(--sb-primary)] font-semibold hover:underline flex items-center gap-1">
            View all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {categories.map((cat, i) => (
            <div
              key={cat.title}
              className={`animate-on-scroll stagger-${i + 1} ${isInView ? "in-view" : ""}`}
            >
              <Link href={`/categories/${cat.title.toLowerCase().replace(/ /g, '-')}`}>
                <div className="card-hover group p-6 bg-white rounded-2xl border-2 border-gray-100 hover:border-[var(--sb-primary)] cursor-pointer">
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-14 w-14 flex items-center justify-center rounded-2xl bg-[var(--sb-primary)]/10 text-[var(--sb-primary)] group-hover:bg-[var(--sb-primary)] group-hover:text-white transition-all duration-300">
                      <cat.icon className="w-7 h-7" />
                    </div>
                    <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                      {cat.count}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-800 text-lg">{cat.title}</h3>
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
            View All 
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
  
  const displayName = vendor.business_name || vendor.name || "Unnamed Vendor";
  const description = vendor.business_description || vendor.description;
  const address = vendor.business_address || vendor.address;
  const logoUrl = vendor.logo_url || vendor.logoUrl;
  const bannerUrl = vendor.banner_url || vendor.cover_image_url;
  const category = vendor.category || vendor.categories?.[0];
  const vendorLink = vendor.slug ? `/store/${vendor.slug}` : `/store/${vendor.id}`;

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
                Featured
              </span>
            </div>
            
            {bannerUrl ? (
              <Image
                src={bannerUrl}
                alt={displayName}
                width={400}
                height={225}
                loading="lazy"
                onLoad={() => setImageLoaded(true)}
                className={`object-cover w-full h-full group-hover:scale-105 transition-transform duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
              />
            ) : logoUrl ? (
              <div className="flex items-center justify-center h-full p-8 bg-gradient-to-br from-[var(--sb-primary)] to-[var(--sb-primary-light)]">
                <Image
                  src={logoUrl}
                  alt={displayName}
                  width={120}
                  height={120}
                  loading="lazy"
                  className="object-contain max-h-full drop-shadow-lg"
                />
              </div>
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
                <span className="text-xs text-gray-400">New</span>
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
// PRODUCT CARD (Enhanced)
////////////////////////////////////////////////////////////////////////////////

function ProductCard({ product, index }: { product: ProductWithVendor; index: number }) {
  const { ref, isInView } = useInView();
  const [imageLoaded, setImageLoaded] = useState(false);
  
  const vendorSlug = product.vendorSlug || product.vendor_slug || product.vendorId || product.vendor_id;
  const productLink = vendorSlug 
    ? `/store/${vendorSlug}/product/${product.id}`
    : `/product/${product.id}`;

  return (
    <div ref={ref} className={`animate-on-scroll stagger-${(index % 4) + 1} ${isInView ? "in-view" : ""}`}>
      <Link href={productLink}>
        <div className="card-hover bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer group h-full flex flex-col">
          <div className="aspect-square bg-gray-100 overflow-hidden relative">
            {/* Product Badge */}
            <div className="absolute top-3 left-3 z-10">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[var(--sb-accent)] rounded-full text-xs font-semibold text-white shadow-sm">
                <TrendingUp className="w-3 h-3" />
                Popular
              </span>
            </div>
            
            {product.images?.[0] ? (
              <Image
                src={product.images[0]}
                alt={product.name}
                width={300}
                height={300}
                loading="lazy"
                onLoad={() => setImageLoaded(true)}
                className={`object-cover w-full h-full group-hover:scale-105 transition-transform duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
              />
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
                ${typeof product.price === 'number' ? product.price.toFixed(2) : product.price}
              </p>
              <span className="text-xs text-gray-400 group-hover:text-[var(--sb-primary)] transition-colors flex items-center gap-1">
                View <ArrowRight className="w-3 h-3" />
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
          For Business Owners
        </span>
        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
          Grow Your Business With StackBot
        </h2>
        <p className="mt-6 text-lg sm:text-xl text-white/80 max-w-2xl mx-auto">
          Join hundreds of local restaurants, shops, and service providers earning more with StackBot's marketplace and logistics tools.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/vendor-signup"
            className="btn-hover inline-flex items-center justify-center gap-2 bg-white text-[var(--sb-primary)] px-8 py-4 rounded-full font-bold text-lg shadow-2xl hover:shadow-xl hover:bg-gray-50 transition-all duration-300"
          >
            Become a Vendor
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/about"
            className="inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm text-white px-8 py-4 rounded-full font-bold text-lg border border-white/20 hover:bg-white/20 transition-all duration-300"
          >
            Learn More
          </Link>
        </div>
      </div>
    </section>
  );
}

////////////////////////////////////////////////////////////////////////////////
// FOOTER
////////////////////////////////////////////////////////////////////////////////

function Footer() {
  const links = useMemo(() => ({
    "Get to Know Us": ["About", "Careers", "Blog", "Newsroom"],
    "Let Us Help You": ["Account", "Order History", "Support"],
    "Do Business With Us": ["Become a Driver", "Become a Vendor"],
  }), []);

  return (
    <footer className="bg-[var(--sb-dark)] text-white py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
          {Object.entries(links).map(([title, items]) => (
            <div key={title}>
              <h4 className="font-semibold mb-4 text-white/90">{title}</h4>
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item}>
                    <Link href="#" className="text-gray-400 hover:text-white transition-colors text-sm">
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h4 className="font-semibold mb-4 text-white/90">Download App</h4>
            <div className="space-y-3">
              <button className="w-full bg-white/10 hover:bg-white/20 transition-all duration-300 rounded-xl p-3 text-sm font-medium flex items-center justify-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                App Store
              </button>
              <button className="w-full bg-white/10 hover:bg-white/20 transition-all duration-300 rounded-xl p-3 text-sm font-medium flex items-center justify-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                </svg>
                Google Play
              </button>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-sm">© 2026 StackBot. All rights reserved.</p>
          <div className="flex gap-6 text-sm text-gray-400">
            <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}