"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/firebase/config";
import { collection, getDocs, orderBy, limit, query } from "firebase/firestore";
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
} from "lucide-react";

////////////////////////////////////////////////////////////////////////////////
// INTERSECTION OBSERVER HOOK FOR SCROLL ANIMATIONS
////////////////////////////////////////////////////////////////////////////////

function useInView(options = {}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsInView(true);
        observer.disconnect();
      }
    }, { threshold: 0.1, ...options });

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return { ref, isInView };
}

////////////////////////////////////////////////////////////////////////////////
// MAIN HOMEPAGE
////////////////////////////////////////////////////////////////////////////////

export default function HomePage() {
  const [featured, setFeatured] = useState<Product[]>([]);
  const [popular, setPopular] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const featuredSnap = await getDocs(
          query(collection(db, "products"), orderBy("created_at", "desc"), limit(4))
        );
        const popularSnap = await getDocs(
          query(collection(db, "products"), orderBy("views", "desc"), limit(8))
        );
        setFeatured(featuredSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Product)));
        setPopular(popularSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Product)));
      } catch (err) {
        console.error(err);
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
          --sb-accent: #f97316;
          --sb-dark: #1a1a2e;
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

        @keyframes slide-up {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slide-in-left {
          from { opacity: 0; transform: translateX(-40px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes slide-in-right {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }

        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-pulse-glow { animation: pulse-glow 3s ease-in-out infinite; }
        .animate-gradient { 
          background-size: 200% 200%;
          animation: gradient-shift 8s ease infinite;
        }

        .animate-on-scroll {
          opacity: 0;
          transform: translateY(40px);
          transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .animate-on-scroll.in-view {
          opacity: 1;
          transform: translateY(0);
        }

        .stagger-1 { transition-delay: 0.1s; }
        .stagger-2 { transition-delay: 0.2s; }
        .stagger-3 { transition-delay: 0.3s; }
        .stagger-4 { transition-delay: 0.4s; }
        .stagger-5 { transition-delay: 0.5s; }
        .stagger-6 { transition-delay: 0.6s; }
        .stagger-7 { transition-delay: 0.7s; }
        .stagger-8 { transition-delay: 0.8s; }

        .card-hover {
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .card-hover:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 25px 50px -12px rgba(85, 82, 157, 0.25);
        }

        .btn-hover {
          position: relative;
          overflow: hidden;
        }

        .btn-hover::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          transform: translateX(-100%);
          transition: transform 0.6s;
        }

        .btn-hover:hover::after {
          transform: translateX(100%);
        }

        .text-gradient {
          background: linear-gradient(135deg, #55529d 0%, #7c78c9 50%, #f97316 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .glass {
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }

        .noise {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
          opacity: 0.03;
        }
      `}</style>

      <Navbar />
      <Hero />
      <MarketplaceGrid />
      <WhyStackBot />
      <TravelerSection />
      <OnboardingCards />

      <SectionWrapper title="Featured" link="/products">
        {loading ? (
          <LoadingRow />
        ) : featured.length > 0 ? (
          <Grid>{featured.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}</Grid>
        ) : (
          <EmptyMessage message="No featured products yet" />
        )}
      </SectionWrapper>

      <Categories />

      <SectionWrapper title="Popular" link="/products">
        {loading ? (
          <LoadingRow />
        ) : popular.length > 0 ? (
          <Grid>{popular.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}</Grid>
        ) : (
          <EmptyMessage message="No popular products yet" />
        )}
      </SectionWrapper>

      <VendorCTA />
      <Footer />
    </div>
  );
}

////////////////////////////////////////////////////////////////////////////////
// NAVBAR
////////////////////////////////////////////////////////////////////////////////

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? "glass shadow-lg py-3" : "bg-transparent py-5"
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <Image
              src="/stackbot-logo-purp.png"
              alt="StackBot"
              width={140}
              height={40}
              className="object-contain transition-transform duration-300 group-hover:scale-105"
            />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/products" className="text-sm font-medium text-gray-700 hover:text-[var(--sb-primary)] transition-colors relative group">
              Browse
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[var(--sb-primary)] transition-all duration-300 group-hover:w-full" />
            </Link>
            <Link href="/vendor-signup" className="text-sm font-medium text-gray-700 hover:text-[var(--sb-primary)] transition-colors relative group">
              Become a Vendor
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[var(--sb-primary)] transition-all duration-300 group-hover:w-full" />
            </Link>
            <Link
              href="/login"
              className="btn-hover bg-[var(--sb-primary)] text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-[var(--sb-primary-light)] transition-all duration-300 shadow-md hover:shadow-xl"
            >
              Login
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button 
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div className={`fixed inset-0 z-40 md:hidden transition-all duration-500 ${
        mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
        <div className={`absolute right-0 top-0 bottom-0 w-80 bg-white shadow-2xl transition-transform duration-500 ${
          mobileOpen ? "translate-x-0" : "translate-x-full"
        }`}>
          <div className="p-6 pt-20 space-y-6">
            <Link href="/products" className="block text-lg font-medium text-gray-800 hover:text-[var(--sb-primary)] transition-colors">
              Browse Products
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
// HERO SECTION
////////////////////////////////////////////////////////////////////////////////

function Hero() {
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
          <div className={`transition-all duration-1000 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-white/90 text-sm font-medium">Now serving the Caribbean</span>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-[1.1] tracking-tight">
              The All-in-One
              <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-white via-orange-200 to-orange-400">
                Marketplace
              </span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-white/80 max-w-lg leading-relaxed">
              Order food, shop local businesses, book services, and connect with trusted vendors — powered by AI-driven delivery.
            </p>

            {/* Search Bar */}
            <div className={`mt-10 transition-all duration-1000 delay-300 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
              <div className="relative max-w-xl">
                <div className="absolute inset-0 bg-white rounded-2xl blur-xl opacity-30" />
                <div className="relative flex items-center gap-3 bg-white rounded-2xl p-2 shadow-2xl">
                  <Search className="ml-4 text-gray-400 w-5 h-5 flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="Search restaurants, shops, services…"
                    className="flex-1 py-3 text-gray-900 placeholder-gray-400 focus:outline-none text-base"
                  />
                  <button className="btn-hover bg-[var(--sb-primary)] text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 hover:bg-[var(--sb-primary-light)] transition-all duration-300 flex-shrink-0">
                    <span className="hidden sm:inline">Search</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className={`mt-12 flex flex-wrap gap-8 sm:gap-12 transition-all duration-1000 delay-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
              {[
                { value: "500+", label: "Vendor Partners" },
                { value: "99%", label: "On-Time Delivery" },
                { value: "24/7", label: "Support" },
              ].map((stat) => (
                <div key={stat.label} className="group">
                  <div className="text-3xl sm:text-4xl font-bold text-white group-hover:text-orange-300 transition-colors duration-300">
                    {stat.value}
                  </div>
                  <p className="text-white/60 text-sm mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right Image */}
          <div className={`hidden lg:block relative transition-all duration-1000 delay-200 ${mounted ? "opacity-100 translate-x-0" : "opacity-0 translate-x-10"}`}>
            <div className="absolute -inset-4 bg-gradient-to-tr from-orange-400/20 to-white/20 rounded-[3rem] blur-2xl" />
            <div className="relative">
              <Image
                src="/girl-phone.jpg"
                alt="User browsing StackBot"
                width={600}
                height={700}
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

  const items = [
    { label: "Food Delivery", icon: <Utensils className="w-7 h-7" />, color: "from-orange-400 to-red-500" },
    { label: "Retail & Shops", icon: <Shirt className="w-7 h-7" />, color: "from-blue-400 to-indigo-500" },
    { label: "Taxi & Transport", icon: <Car className="w-7 h-7" />, color: "from-yellow-400 to-orange-500" },
    { label: "Beauty & Wellness", icon: <Brush className="w-7 h-7" />, color: "from-pink-400 to-rose-500" },
    { label: "Home Services", icon: <Store className="w-7 h-7" />, color: "from-teal-400 to-cyan-500" },
    { label: "Rentals & Real Estate", icon: <Home className="w-7 h-7" />, color: "from-green-400 to-emerald-500" },
    { label: "Tours & Tourism", icon: <Map className="w-7 h-7" />, color: "from-purple-400 to-violet-500" },
    { label: "Peer-to-Peer", icon: <Users className="w-7 h-7" />, color: "from-sky-400 to-blue-500" },
  ];

  return (
    <section ref={ref} className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-white relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
      
      <div className="max-w-7xl mx-auto">
        <div className={`text-center mb-16 animate-on-scroll ${isInView ? "in-view" : ""}`}>
          <span className="inline-block px-4 py-1.5 bg-[var(--sb-primary)]/10 text-[var(--sb-primary)] rounded-full text-sm font-semibold mb-4">
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
              className={`animate-on-scroll stagger-${i + 1} ${isInView ? "in-view" : ""}`}
            >
              <div className="card-hover group relative p-6 sm:p-8 bg-gray-50 rounded-3xl cursor-pointer overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className="relative z-10">
                  <div className="mb-4 h-14 w-14 sm:h-16 sm:w-16 flex items-center justify-center rounded-2xl bg-white shadow-sm text-[var(--sb-primary)] group-hover:text-white group-hover:bg-white/20 transition-all duration-500">
                    {item.icon}
                  </div>
                  <p className="font-semibold text-gray-900 group-hover:text-white transition-colors duration-500 text-sm sm:text-base">
                    {item.label}
                  </p>
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

  const features = [
    {
      icon: <Zap className="w-8 h-8" />,
      title: "AI-Powered Logistics",
      desc: "PIN-secure deliveries, optimized routing, and real-time tracking for every order.",
      gradient: "from-yellow-400 to-orange-500",
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Verified Vendors",
      desc: "Every business is screened and verified to ensure quality and trust.",
      gradient: "from-green-400 to-emerald-500",
    },
    {
      icon: <Globe className="w-8 h-8" />,
      title: "All-in-One Platform",
      desc: "Food, shopping, tourism, rentals, and services — all in one app.",
      gradient: "from-blue-400 to-indigo-500",
    },
  ];

  return (
    <section ref={ref} className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white relative">
      <div className="max-w-6xl mx-auto">
        <div className={`text-center mb-16 animate-on-scroll ${isInView ? "in-view" : ""}`}>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900">
            Why Choose <span className="text-gradient">StackBot</span>?
          </h2>
          <p className="mt-4 text-gray-600 text-lg max-w-2xl mx-auto">
            Built for the Caribbean, designed for reliability.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className={`animate-on-scroll stagger-${i + 1} ${isInView ? "in-view" : ""}`}
            >
              <div className="card-hover h-full p-8 bg-white rounded-3xl border border-gray-100 shadow-sm">
                <div className={`mb-6 h-16 w-16 flex items-center justify-center rounded-2xl bg-gradient-to-br ${feature.gradient} text-white shadow-lg`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.desc}</p>
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

  const features = [
    "Book taxis & transportation",
    "Discover nightlife & restaurants",
    "Book beauty & wellness appointments",
    "Request trusted home services",
    "Explore local rentals & experiences",
  ];

  return (
    <section ref={ref} className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div className={`animate-on-scroll ${isInView ? "in-view" : ""}`}>
            <span className="inline-block px-4 py-1.5 bg-orange-100 text-orange-600 rounded-full text-sm font-semibold mb-4">
              For Travelers
            </span>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight">
              Visiting the <span className="text-gradient">Caribbean</span>?
            </h2>
            <p className="mt-6 text-gray-600 text-lg max-w-md leading-relaxed">
              Discover trusted local businesses, book tours, order food, and explore safely — all in one app.
            </p>

            <ul className="mt-8 space-y-4">
              {features.map((feature, i) => (
                <li
                  key={feature}
                  className={`flex items-center gap-4 animate-on-scroll stagger-${i + 1} ${isInView ? "in-view" : ""}`}
                >
                  <div className="h-10 w-10 flex items-center justify-center rounded-full bg-[var(--sb-primary)]/10">
                    <ChevronRight className="w-5 h-5 text-[var(--sb-primary)]" />
                  </div>
                  <span className="text-gray-700 font-medium">{feature}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/login"
              className="btn-hover mt-10 inline-flex items-center gap-2 bg-[var(--sb-primary)] text-white px-8 py-4 rounded-full font-semibold shadow-lg hover:shadow-xl hover:bg-[var(--sb-primary-light)] transition-all duration-300"
            >
              Get Started
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          <div className={`relative animate-on-scroll stagger-2 ${isInView ? "in-view" : ""}`}>
            <div className="absolute -inset-4 bg-gradient-to-tr from-[var(--sb-primary)]/20 to-orange-400/20 rounded-[3rem] blur-2xl" />
            <Image
              src="/coco.jpg"
              alt="Traveler using StackBot"
              width={600}
              height={700}
              className="relative rounded-[2rem] object-cover shadow-2xl w-full h-[500px] lg:h-[600px]"
            />
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

  const cards = [
    {
      icon: <Bike className="w-10 h-10" />,
      title: "Become a Driver",
      desc: "Earn money delivering across the Caribbean on your schedule.",
      link: "/login?intent=driver",
      linkText: "Start earning",
      gradient: "from-green-400 to-emerald-500",
    },
    {
      icon: <Store className="w-10 h-10" />,
      title: "Become a Vendor",
      desc: "Grow your business with smart logistics and a large customer base.",
      link: "/vendor-signup",
      linkText: "Sign up",
      gradient: "from-[var(--sb-primary)] to-[var(--sb-primary-light)]",
    },
    {
      icon: <Smartphone className="w-10 h-10" />,
      title: "Order with StackBot",
      desc: "Discover restaurants, shops, markets & more — delivered fast.",
      link: "/",
      linkText: "Get the app",
      gradient: "from-orange-400 to-red-500",
    },
  ];

  return (
    <section ref={ref} className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className={`text-center mb-16 animate-on-scroll ${isInView ? "in-view" : ""}`}>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900">
            Join the Network
          </h2>
          <p className="mt-4 text-gray-600 text-lg">
            Whether you're delivering, selling, or shopping — there's a place for you.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {cards.map((card, i) => (
            <div
              key={card.title}
              className={`animate-on-scroll stagger-${i + 1} ${isInView ? "in-view" : ""}`}
            >
              <div className="card-hover group h-full p-8 bg-white rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className="relative z-10">
                  <div className="mb-6 h-16 w-16 flex items-center justify-center rounded-2xl bg-gray-100 text-[var(--sb-primary)] group-hover:bg-white/20 group-hover:text-white transition-all duration-500">
                    {card.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 group-hover:text-white transition-colors duration-500">
                    {card.title}
                  </h3>
                  <p className="text-gray-600 mt-3 mb-6 group-hover:text-white/80 transition-colors duration-500">
                    {card.desc}
                  </p>
                  <Link
                    href={card.link}
                    className="inline-flex items-center gap-2 text-[var(--sb-primary)] font-semibold group-hover:text-white transition-colors duration-500"
                  >
                    {card.linkText}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
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
// CATEGORIES
////////////////////////////////////////////////////////////////////////////////

function Categories() {
  const { ref, isInView } = useInView();

  const categories = [
    { title: "Restaurants", icon: <Utensils className="w-8 h-8" /> },
    { title: "Taxi Service", icon: <Car className="w-8 h-8" /> },
    { title: "Cleaning Service", icon: <Brush className="w-8 h-8" /> },
    { title: "Retail Shops", icon: <Shirt className="w-8 h-8" /> },
  ];

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
              <div className="card-hover group p-6 bg-white rounded-2xl border-2 border-gray-100 hover:border-[var(--sb-primary)] cursor-pointer">
                <div className="h-14 w-14 flex items-center justify-center rounded-2xl bg-[var(--sb-primary)]/10 text-[var(--sb-primary)] mb-4 group-hover:bg-[var(--sb-primary)] group-hover:text-white transition-all duration-500">
                  {cat.icon}
                </div>
                <h3 className="font-semibold text-gray-800 text-lg">{cat.title}</h3>
              </div>
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

function SectionWrapper({ title, link, children }: { title: string; link: string; children: React.ReactNode }) {
  const { ref, isInView } = useInView();

  return (
    <section ref={ref} className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className={`flex items-center justify-between mb-10 animate-on-scroll ${isInView ? "in-view" : ""}`}>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-gray-900">{title}</h2>
          <Link href={link} className="text-[var(--sb-primary)] font-semibold hover:underline flex items-center gap-1">
            View All <ChevronRight className="w-4 h-4" />
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
// PRODUCT CARD
////////////////////////////////////////////////////////////////////////////////

function ProductCard({ product, index }: { product: Product; index: number }) {
  const { ref, isInView } = useInView();

  return (
    <div ref={ref} className={`animate-on-scroll stagger-${(index % 4) + 1} ${isInView ? "in-view" : ""}`}>
      <div className="card-hover bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer">
        <div className="aspect-square bg-gray-100 overflow-hidden">
          {product.images?.[0] ? (
            <Image
              src={product.images[0]}
              alt={product.name}
              width={300}
              height={300}
              className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              No Image
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 line-clamp-1">{product.name}</h3>
          <p className="text-sm text-gray-500 mt-1">{product.vendor_name || "Vendor"}</p>
          <p className="font-bold text-[var(--sb-primary)] mt-2 text-lg">${product.price}</p>
        </div>
      </div>
    </div>
  );
}

////////////////////////////////////////////////////////////////////////////////
// LOADING & EMPTY STATES
////////////////////////////////////////////////////////////////////////////////

function LoadingRow() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
          <div className="aspect-square bg-gray-200" />
          <div className="p-4 space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
            <div className="h-5 bg-gray-200 rounded w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyMessage({ message }: { message: string }) {
  return (
    <div className="text-center py-16 text-gray-500 text-lg">{message}</div>
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
      
      <div className={`relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center animate-on-scroll ${isInView ? "in-view" : ""}`}>
        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
          Grow Your Business With StackBot
        </h2>
        <p className="mt-6 text-lg sm:text-xl text-white/80 max-w-2xl mx-auto">
          Join hundreds of local restaurants, shops, and service providers earning more with StackBot's marketplace and logistics tools.
        </p>
        <Link
          href="/vendor-signup"
          className="btn-hover mt-10 inline-flex items-center gap-2 bg-white text-[var(--sb-primary)] px-10 py-4 rounded-full font-bold text-lg shadow-2xl hover:shadow-xl hover:bg-gray-50 transition-all duration-300"
        >
          Become a Vendor
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    </section>
  );
}

////////////////////////////////////////////////////////////////////////////////
// FOOTER
////////////////////////////////////////////////////////////////////////////////

function Footer() {
  const links = {
    "Get to Know Us": ["About", "Careers", "Blog", "Newsroom"],
    "Let Us Help You": ["Account", "Order History", "Support"],
    "Do Business With Us": ["Become a Driver", "Become a Vendor"],
  };

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
              <button className="w-full bg-white/10 hover:bg-white/20 transition-all duration-300 rounded-xl p-3 text-sm font-medium">
                App Store
              </button>
              <button className="w-full bg-white/10 hover:bg-white/20 transition-all duration-300 rounded-xl p-3 text-sm font-medium">
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