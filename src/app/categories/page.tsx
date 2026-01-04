"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { db } from "@/lib/firebase/config";
import { collection, getDocs, query, where } from "firebase/firestore";
import { 
  getAllCategories, 
  getFeaturedCategories, 
  vendorMatchesCategory,
  type CategoryWithId,
} from "@/lib/config/categories";
import Footer from "@/components/layout/Footer";
import {
  ArrowLeft,
  Search,
  Grid3X3,
  TrendingUp,
  Store,
  Star,
  BadgeCheck,
  ChevronRight,
  // Icon components for categories
  Pizza,
  ShoppingBasket,
  Car,
  Sparkles,
  Briefcase,
  Wrench,
  ShoppingBag,
  Smartphone,
  Compass,
  Package,
  type LucideIcon,
} from "lucide-react";

/* ======================================================
   ICON MAPPING
   Maps icon string names to actual Lucide components
====================================================== */

const ICON_MAP: Record<string, LucideIcon> = {
  Pizza,
  ShoppingBasket,
  Car,
  Sparkles,
  Briefcase,
  Wrench,
  ShoppingBag,
  Smartphone,
  Compass,
  Package,
};

function getIcon(iconName: string): LucideIcon {
  return ICON_MAP[iconName] || Package;
}

/* ======================================================
   TYPES
====================================================== */

interface CategoryWithStats extends CategoryWithId {
  vendorCount: number;
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
  cover_image_url?: string;
  address?: string;
  business_address?: string;
  description?: string;
  business_description?: string;
}

/* ======================================================
   MAIN PAGE
====================================================== */

export default function CategoriesPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch vendors
  useEffect(() => {
    const fetchVendors = async () => {
      try {
        // Fetch approved vendors
        const approvedQuery = query(
          collection(db, "vendors"),
          where("status", "==", "approved")
        );
        const approvedSnap = await getDocs(approvedQuery);

        let vendorsList: Vendor[] = approvedSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Vendor[];

        // Fallback to verified if few approved
        if (vendorsList.length < 5) {
          const verifiedQuery = query(
            collection(db, "vendors"),
            where("verified", "==", true)
          );
          const verifiedSnap = await getDocs(verifiedQuery);

          const legacyVendors = verifiedSnap.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as Vendor))
            .filter(
              v =>
                v.status !== "suspended" &&
                v.status !== "rejected" &&
                !vendorsList.find(av => av.id === v.id)
            );

          vendorsList = [...vendorsList, ...legacyVendors];
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

  // Compute category stats
  const categoriesWithStats = useMemo<CategoryWithStats[]>(() => {
    const allCats = getAllCategories();
    return allCats.map(cat => ({
      ...cat,
      vendorCount: vendors.filter(v => vendorMatchesCategory(v, cat.id)).length,
    }));
  }, [vendors]);

  // Filter categories
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categoriesWithStats;

    const q = searchQuery.toLowerCase();
    return categoriesWithStats.filter(
      cat =>
        cat.name.toLowerCase().includes(q) ||
        cat.description.toLowerCase().includes(q)
    );
  }, [categoriesWithStats, searchQuery]);

  // Featured categories
  const featuredCategories = useMemo(() => {
    const featured = getFeaturedCategories();
    return featured
      .map(cat => ({
        ...cat,
        vendorCount: vendors.filter(v => vendorMatchesCategory(v, cat.id)).length,
      }))
      .filter(cat => cat.vendorCount > 0)
      .sort((a, b) => b.vendorCount - a.vendorCount)
      .slice(0, 4);
  }, [vendors]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HERO HEADER */}
      <header className="bg-gradient-to-br from-[#55529d] via-[#6563a4] to-[#7574ab] text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/5" />
        <div className="absolute top-10 right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-white/5 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 py-8 sm:py-12">
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
                Discover {vendors.length}+ vendors across {categoriesWithStats.length} categories
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
              onChange={e => setSearchQuery(e.target.value)}
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
              {featuredCategories.map(cat => (
                <FeaturedCategoryCard key={cat.id} category={cat} />
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
              {filteredCategories.length} categor{filteredCategories.length !== 1 ? "ies" : "y"}
            </span>
          </div>

          {loading ? (
            <CategoriesLoadingGrid />
          ) : filteredCategories.length === 0 ? (
            <EmptyState searchQuery={searchQuery} onClear={() => setSearchQuery("")} />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredCategories.map(cat => (
                <CategoryCard key={cat.id} category={cat} />
              ))}
            </div>
          )}
        </section>

        {/* VENDOR SPOTLIGHT (sample) */}
        {!searchQuery && vendors.length > 0 && (
          <section className="mt-16 pt-8 border-t border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Featured Vendors</h2>
              <Link
                href="/vendors"
                className="text-[#55529d] font-semibold hover:underline flex items-center gap-1"
              >
                View all <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {vendors.slice(0, 6).map(vendor => (
                <VendorSpotlightCard key={vendor.id} vendor={vendor} />
              ))}
            </div>
          </section>
        )}
      </main>

      <div className="bg-[#111827]"> {/* or use your brand color bg-[#55529d] */}
        <Footer />
      </div>
    </div>
  );
}

/* ======================================================
   FEATURED CATEGORY CARD
====================================================== */

function FeaturedCategoryCard({ category }: { category: CategoryWithStats }) {
  const Icon = category.icon;

  return (
    <Link href={`/categories/${category.slug}`}>
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
      </div>
    </Link>
  );
}

/* ======================================================
   CATEGORY CARD
====================================================== */

function CategoryCard({ category }: { category: CategoryWithStats }) {
 const Icon = category.icon;

  return (
    <Link href={`/categories/${category.slug}`}>
      <div className="group p-5 bg-white rounded-2xl border border-gray-200 hover:border-[#55529d] hover:shadow-md transition-all cursor-pointer">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-14 h-14 ${category.bgColor} ${category.color} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
            <Icon className="w-7 h-7" />
          </div>
          <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
            {category.vendorCount}
          </span>
        </div>

        <h3 className="font-bold text-gray-900 text-lg mb-1">{category.name}</h3>
        <p className="text-sm text-gray-500 line-clamp-2">{category.description}</p>

        <div className="mt-4 flex items-center gap-1 text-[#55529d] font-semibold text-sm opacity-0 group-hover:opacity-100 transition-opacity">
          Explore <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </Link>
  );
}

/* ======================================================
   VENDOR SPOTLIGHT CARD
====================================================== */

function VendorSpotlightCard({ vendor }: { vendor: Vendor }) {
  const displayName = vendor.business_name || vendor.name || "Unnamed Vendor";
  const logoUrl = vendor.logo_url || vendor.logoUrl;
  const vendorLink = vendor.slug ? `/store/${vendor.slug}` : `/store/${vendor.id}`;
  const description = vendor.business_description || vendor.description;

  return (
    <Link href={vendorLink}>
      <div className="group bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-[#55529d]/20 transition-all cursor-pointer">
        <div className="flex gap-3">
          <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
            {logoUrl ? (
              <img src={logoUrl} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Store className="w-6 h-6 text-gray-300" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-gray-900 line-clamp-1 group-hover:text-[#55529d] transition-colors">
                {displayName}
              </h3>
              {vendor.verified && (
                <BadgeCheck className="w-4 h-4 text-[#55529d] flex-shrink-0" />
              )}
            </div>

            {description && (
              <p className="text-xs text-gray-500 line-clamp-1 mt-1">{description}</p>
            )}

            {vendor.rating && (
              <div className="flex items-center gap-1 mt-2">
                <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                <span className="text-xs font-semibold text-gray-700">
                  {vendor.rating.toFixed(1)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ======================================================
   LOADING GRID
====================================================== */

function CategoriesLoadingGrid() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 bg-gray-200 rounded-2xl animate-pulse" />
            <div className="h-5 w-8 bg-gray-200 rounded-full animate-pulse" />
          </div>
          <div className="h-5 bg-gray-200 rounded-lg w-3/4 mb-2 animate-pulse" />
          <div className="h-4 bg-gray-200 rounded-lg w-full animate-pulse" />
        </div>
      ))}
    </div>
  );
}

/* ======================================================
   EMPTY STATE
====================================================== */

function EmptyState({ searchQuery, onClear }: { searchQuery: string; onClear: () => void }) {
  return (
    <div className="text-center py-16 px-4">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
        <Search className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        No categories found for &quot;{searchQuery}&quot;
      </h3>
      <p className="text-gray-500 mb-6">Try searching with different keywords</p>
      <button
        onClick={onClear}
        className="inline-flex items-center gap-2 bg-[#55529d] text-white px-6 py-3 rounded-full font-semibold hover:bg-[#433f7a] transition-colors"
      >
        Clear Search
      </button>
    </div>
  );
}