"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/firebase/config";
import { collection, getDocs, query, where } from "firebase/firestore";
import Footer from "@/components/layout/Footer";

import {
  ArrowLeft,
  Search,
  Utensils,
  Car,
  Brush,
  Shirt,
  Home,
  Smartphone,
  Bike,
  ShoppingBag,
  Scissors,
  Wrench,
  Camera,
  Music,
  Dumbbell,
  Plane,
  Heart,
  BookOpen,
  Palette,
  Coffee,
  Pizza,
  Sparkles,
  Package,
  Store,
  ChevronRight,
  Grid3X3,
  TrendingUp,
  Star,
  MapPin,
} from "lucide-react";

/* ======================================================
   TYPES
====================================================== */

interface CategoryData {
  slug: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  vendorCount: number;
  productCount: number;
  featured?: boolean;
}

interface Vendor {
  id: string;
  name?: string;
  business_name?: string;
  slug?: string;
  status?: string;
  verified?: boolean;
  category?: string;
  categories?: string[];
  logoUrl?: string;
  logo_url?: string;
  rating?: number;
}

/* ======================================================
   CATEGORY DEFINITIONS
====================================================== */

const CATEGORY_CONFIG: Omit<CategoryData, "vendorCount" | "productCount">[] = [
  {
    slug: "food-drinks",
    name: "Food & Drinks",
    description: "Restaurants, cafes, bars, and food delivery",
    icon: Utensils,
    color: "text-orange-600",
    bgColor: "bg-orange-100",
    featured: true,
  },
  {
    slug: "restaurants",
    name: "Restaurants",
    description: "Local dining and takeout options",
    icon: Pizza,
    color: "text-red-600",
    bgColor: "bg-red-100",
    featured: true,
  },
  {
    slug: "taxi-service",
    name: "Taxi Service",
    description: "Transportation and ride services",
    icon: Car,
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
    featured: true,
  },
  {
    slug: "cleaning-service",
    name: "Cleaning Service",
    description: "Home and commercial cleaning",
    icon: Brush,
    color: "text-cyan-600",
    bgColor: "bg-cyan-100",
  },
  {
    slug: "retail-shops",
    name: "Retail Shops",
    description: "General merchandise and shopping",
    icon: ShoppingBag,
    color: "text-pink-600",
    bgColor: "bg-pink-100",
    featured: true,
  },
  {
    slug: "fashion",
    name: "Fashion",
    description: "Clothing, shoes, and accessories",
    icon: Shirt,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
  },
  {
    slug: "electronics",
    name: "Electronics",
    description: "Phones, computers, and gadgets",
    icon: Smartphone,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  {
    slug: "home-garden",
    name: "Home & Garden",
    description: "Furniture, decor, and outdoor",
    icon: Home,
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  {
    slug: "beauty",
    name: "Beauty",
    description: "Salons, spas, and cosmetics",
    icon: Scissors,
    color: "text-rose-600",
    bgColor: "bg-rose-100",
  },
  {
    slug: "services",
    name: "Services",
    description: "Professional and home services",
    icon: Wrench,
    color: "text-slate-600",
    bgColor: "bg-slate-100",
  },
  {
    slug: "sports",
    name: "Sports & Fitness",
    description: "Gyms, equipment, and activewear",
    icon: Dumbbell,
    color: "text-emerald-600",
    bgColor: "bg-emerald-100",
  },
  {
    slug: "automotive",
    name: "Automotive",
    description: "Car parts, repairs, and rentals",
    icon: Car,
    color: "text-gray-600",
    bgColor: "bg-gray-200",
  },
  {
    slug: "health",
    name: "Health & Wellness",
    description: "Pharmacies and health products",
    icon: Heart,
    color: "text-red-500",
    bgColor: "bg-red-100",
  },
  {
    slug: "entertainment",
    name: "Entertainment",
    description: "Events, music, and recreation",
    icon: Music,
    color: "text-violet-600",
    bgColor: "bg-violet-100",
  },
  {
    slug: "travel",
    name: "Travel & Tourism",
    description: "Tours, hotels, and experiences",
    icon: Plane,
    color: "text-sky-600",
    bgColor: "bg-sky-100",
  },
  {
    slug: "education",
    name: "Education",
    description: "Tutoring, courses, and supplies",
    icon: BookOpen,
    color: "text-indigo-600",
    bgColor: "bg-indigo-100",
  },
  {
    slug: "art-crafts",
    name: "Art & Crafts",
    description: "Handmade goods and supplies",
    icon: Palette,
    color: "text-amber-600",
    bgColor: "bg-amber-100",
  },
  {
    slug: "photography",
    name: "Photography",
    description: "Photo services and equipment",
    icon: Camera,
    color: "text-neutral-600",
    bgColor: "bg-neutral-200",
  },
  {
    slug: "delivery",
    name: "Delivery Services",
    description: "Courier and package delivery",
    icon: Bike,
    color: "text-teal-600",
    bgColor: "bg-teal-100",
  },
  {
    slug: "other",
    name: "Other",
    description: "Miscellaneous services and products",
    icon: Package,
    color: "text-gray-500",
    bgColor: "bg-gray-100",
  },
];

/* ======================================================
   MAIN PAGE
====================================================== */

export default function CategoriesPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  /* ---------------- FETCH VENDORS ---------------- */
  useEffect(() => {
    const fetchVendors = async () => {
      try {
        // Try approved vendors first
        const approvedSnap = await getDocs(
          query(collection(db, "vendors"), where("status", "==", "approved"))
        );

        let vendorsList: Vendor[] = [];

        if (!approvedSnap.empty) {
          vendorsList = approvedSnap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Vendor[];
        } else {
          // Fallback to verified
          const verifiedSnap = await getDocs(
            query(collection(db, "vendors"), where("verified", "==", true))
          );
          vendorsList = verifiedSnap.docs
            .map((doc) => ({ id: doc.id, ...doc.data() } as Vendor))
            .filter((v) => v.status !== "suspended" && v.status !== "deleted");
        }

        setVendors(vendorsList);
      } catch (err) {
        console.error("Error fetching vendors:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchVendors();
  }, []);

  /* ---------------- COMPUTE CATEGORY STATS ---------------- */
  const categoriesWithStats = useMemo(() => {
    return CATEGORY_CONFIG.map((cat) => {
      // Count vendors matching this category
      const matchingVendors = vendors.filter((v) => {
        const vendorCategory = v.category?.toLowerCase() || "";
        const vendorCategories = v.categories?.map((c) => c.toLowerCase()) || [];
        const catName = cat.name.toLowerCase();
        const catSlug = cat.slug.toLowerCase();

        return (
          vendorCategory.includes(catName) ||
          vendorCategory.includes(catSlug) ||
          vendorCategories.some(
            (vc) => vc.includes(catName) || vc.includes(catSlug) || catName.includes(vc)
          )
        );
      });

      return {
        ...cat,
        vendorCount: matchingVendors.length,
        productCount: matchingVendors.length * 5, // Estimate ~5 products per vendor
      };
    });
  }, [vendors]);

  /* ---------------- FILTERED CATEGORIES ---------------- */
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categoriesWithStats;

    const query = searchQuery.toLowerCase();
    return categoriesWithStats.filter(
      (cat) =>
        cat.name.toLowerCase().includes(query) ||
        cat.description.toLowerCase().includes(query)
    );
  }, [categoriesWithStats, searchQuery]);

  /* ---------------- FEATURED CATEGORIES ---------------- */
  const featuredCategories = useMemo(() => {
    return categoriesWithStats
      .filter((cat) => cat.featured || cat.vendorCount > 0)
      .sort((a, b) => b.vendorCount - a.vendorCount)
      .slice(0, 4);
  }, [categoriesWithStats]);

  /* ======================================================
     RENDER
  ====================================================== */

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HERO HEADER */}
      <header className="bg-gradient-to-br from-[#55529d] via-[#6563a4] to-[#7574ab] text-white">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
          {/* Back Button */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          {/* Title */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Grid3X3 className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold">Browse Categories</h1>
              <p className="text-white/80 mt-1">
                Discover {vendors.length}+ vendors across {CATEGORY_CONFIG.length} categories
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
            <input
              type="text"
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:bg-white/20 transition-all"
            />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* FEATURED CATEGORIES */}
        {!searchQuery && featuredCategories.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-5 h-5 text-[#55529d]" />
              <h2 className="text-xl font-bold text-gray-900">Popular Categories</h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {featuredCategories.map((cat) => (
                <FeaturedCategoryCard key={cat.slug} category={cat} />
              ))}
            </div>
          </section>
        )}

        {/* ALL CATEGORIES */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {searchQuery ? `Results for "${searchQuery}"` : "All Categories"}
            </h2>
            <span className="text-sm text-gray-500">
              {filteredCategories.length} categories
            </span>
          </div>

          {loading ? (
            <CategoriesLoadingGrid />
          ) : filteredCategories.length === 0 ? (
            <EmptyState
              searchQuery={searchQuery}
              onClear={() => setSearchQuery("")}
            />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredCategories.map((cat) => (
                <CategoryCard key={cat.slug} category={cat} />
              ))}
            </div>
          )}
        </section>

        {/* VENDOR SPOTLIGHT */}
        {!searchQuery && vendors.length > 0 && (
          <VendorSpotlight vendors={vendors.slice(0, 6)} />
        )}
      </main>

      <Footer />
    </div>
  );
}

/* ======================================================
   FEATURED CATEGORY CARD
====================================================== */

function FeaturedCategoryCard({ category }: { category: CategoryData }) {
  const Icon = category.icon;

  return (
    <Link href={`/products?category=${encodeURIComponent(category.name)}`}>
      <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#55529d] to-[#6563a4] p-6 h-44 cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
        {/* Background Pattern */}
        <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/10 rounded-full" />
        <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-white/5 rounded-full" />

        {/* Icon */}
        <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
          <Icon className="w-6 h-6 text-white" />
        </div>

        {/* Content */}
        <h3 className="text-lg font-bold text-white mb-1">{category.name}</h3>
        <p className="text-white/70 text-sm">
          {category.vendorCount} vendor{category.vendorCount !== 1 ? "s" : ""}
        </p>

        {/* Arrow */}
        <div className="absolute right-4 bottom-4 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <ChevronRight className="w-4 h-4 text-white" />
        </div>
      </div>
    </Link>
  );
}

/* ======================================================
   CATEGORY CARD
====================================================== */

function CategoryCard({ category }: { category: CategoryData }) {
  const Icon = category.icon;

  return (
    <Link href={`/products?category=${encodeURIComponent(category.name)}`}>
      <div className="group bg-white rounded-2xl border border-gray-100 p-5 cursor-pointer hover:shadow-lg hover:border-[#55529d]/30 transition-all duration-300 hover:-translate-y-1">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div
            className={`w-14 h-14 ${category.bgColor} ${category.color} rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}
          >
            <Icon className="w-7 h-7" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-[#55529d] transition-colors">
              {category.name}
            </h3>
            <p className="text-sm text-gray-500 line-clamp-2">
              {category.description}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <Store className="w-4 h-4" />
            <span>{category.vendorCount} vendors</span>
          </div>
          {category.vendorCount > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <Package className="w-4 h-4" />
              <span>{category.productCount}+ products</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ======================================================
   VENDOR SPOTLIGHT
====================================================== */

function VendorSpotlight({ vendors }: { vendors: Vendor[] }) {
  return (
    <section className="mt-16 py-12 -mx-4 px-4 bg-white border-y border-gray-100">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              Featured Vendors
            </h2>
            <p className="text-gray-500">Discover top-rated local businesses</p>
          </div>
          <Link
            href="/vendors"
            className="hidden sm:flex items-center gap-1 text-[#55529d] font-semibold hover:underline"
          >
            View all vendors
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {vendors.map((vendor) => (
            <VendorCard key={vendor.id} vendor={vendor} />
          ))}
        </div>

        <Link
          href="/vendors"
          className="sm:hidden flex items-center justify-center gap-1 mt-6 text-[#55529d] font-semibold"
        >
          View all vendors
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}

/* ======================================================
   VENDOR CARD
====================================================== */

function VendorCard({ vendor }: { vendor: Vendor }) {
  const link = vendor.slug ? `/store/${vendor.slug}` : `/store/${vendor.id}`;
  const displayName = vendor.business_name || vendor.name || "Unnamed Vendor";
  const logo = vendor.logoUrl || vendor.logo_url;
  const category = vendor.category || vendor.categories?.[0];

  return (
    <Link href={link}>
      <div className="group bg-gray-50 rounded-2xl p-4 cursor-pointer hover:bg-gray-100 transition-colors">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className="w-16 h-16 rounded-xl bg-white border border-gray-200 overflow-hidden flex-shrink-0">
            {logo ? (
              <Image
                src={logo}
                alt={displayName}
                width={64}
                height={64}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Store className="w-8 h-8 text-gray-300" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate group-hover:text-[#55529d] transition-colors">
              {displayName}
            </h3>
            {category && (
              <span className="inline-block mt-1 px-2 py-0.5 bg-[#55529d]/10 text-[#55529d] text-xs font-medium rounded-full">
                {category}
              </span>
            )}
            {vendor.rating && (
              <div className="flex items-center gap-1 mt-1.5">
                <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                <span className="text-sm text-gray-600">
                  {vendor.rating.toFixed(1)}
                </span>
              </div>
            )}
          </div>

          {/* Arrow */}
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#55529d] transition-colors" />
        </div>
      </div>
    </Link>
  );
}

/* ======================================================
   LOADING STATE
====================================================== */

function CategoriesLoadingGrid() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse"
        >
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-gray-200 rounded-xl" />
            <div className="flex-1 space-y-2">
              <div className="h-5 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-full" />
            </div>
          </div>
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
            <div className="h-4 bg-gray-200 rounded w-20" />
            <div className="h-4 bg-gray-200 rounded w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ======================================================
   EMPTY STATE
====================================================== */

function EmptyState({
  searchQuery,
  onClear,
}: {
  searchQuery: string;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
        <Search className="w-10 h-10 text-gray-400" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        No categories found
      </h2>
      <p className="text-gray-500 mb-6 max-w-md">
        No categories match "{searchQuery}". Try a different search term.
      </p>
      <button
        onClick={onClear}
        className="px-6 py-3 bg-[#55529d] text-white rounded-xl font-medium hover:bg-[#45428d] transition-colors"
      >
        Clear Search
      </button>
    </div>
  );
}