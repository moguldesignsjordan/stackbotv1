"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/firebase/config";
import { collection, getDocs, query, where } from "firebase/firestore";
import { 
  getPublicCategory, 
  vendorMatchesCategory,
  getAllCategories,
  getCategoryBySlug,
} from "@/lib/config/categories";
import Footer from "@/components/layout/Footer";
import {
  ArrowLeft,
  Store,
  Star,
  MapPin,
  BadgeCheck,
  Search,
  Grid3X3,
  List,
  TrendingUp,
  // Category icons
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

interface Vendor {
  id: string;
  name?: string;
  business_name?: string;
  business_description?: string;
  description?: string;
  business_address?: string;
  address?: string;
  logo_url?: string;
  logoUrl?: string;
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

type SortOption = "newest" | "alphabetical" | "rating";
type ViewMode = "grid" | "list";

/* ======================================================
   MAIN PAGE
====================================================== */

export default function CategoryPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Get category config
  const category = getPublicCategory(slug);
  const categoryMeta = getCategoryBySlug(slug);
  const allCategories = getAllCategories();

  // Redirect if invalid category
  useEffect(() => {
    if (!category && !loading) {
      router.push("/categories");
    }
  }, [category, loading, router]);

  // Fetch vendors
  useEffect(() => {
    const fetchVendors = async () => {
      if (!category) return;
      
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

        // Filter by category using the category NAME (not slug) for proper matching
        const filtered = vendorsList.filter(v => 
          vendorMatchesCategory(v, category.name)
        );
        setVendors(filtered);
      } catch (err) {
        console.error("Error fetching vendors:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchVendors();
  }, [slug, category]);

  // Filtered & sorted vendors
  const displayVendors = useMemo(() => {
    let result = [...vendors];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        v =>
          (v.name || v.business_name || "").toLowerCase().includes(q) ||
          (v.description || v.business_description || "").toLowerCase().includes(q)
      );
    }

    // Sort
    switch (sortBy) {
      case "alphabetical":
        result.sort((a, b) =>
          (a.business_name || a.name || "").localeCompare(b.business_name || b.name || "")
        );
        break;
      case "rating":
        result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "newest":
      default:
        result.sort((a, b) => {
          const aTime = a.created_at?.toMillis?.() || 0;
          const bTime = b.created_at?.toMillis?.() || 0;
          return bTime - aTime;
        });
        break;
    }

    return result;
  }, [vendors, searchQuery, sortBy]);

  if (!category) {
    return null; // Will redirect
  }

  // Get the icon component
// ✅ REPLACE with this:
  const Icon = category.icon;
  const bgColor = categoryMeta?.bgColor || "bg-purple-100";
  const color = categoryMeta?.color || "text-purple-600";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HERO HEADER */}
      <header className="bg-gradient-to-br from-[#55529d] via-[#6563a4] to-[#7574ab] text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10" />
        <div className="absolute top-10 right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-white/5 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 py-8 sm:py-12">
          {/* Back Button */}
          <Link
            href="/categories"
            className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            All Categories
          </Link>

          {/* Title */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Icon className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold">{category.name}</h1>
              <p className="text-white/90 mt-1 text-lg">{category.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-white/80">
            <span className="flex items-center gap-2">
              <Store className="w-4 h-4" />
              {vendors.length} vendor{vendors.length !== 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Active category
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* FILTERS */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search vendors..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#55529d]/20 focus:border-[#55529d] transition-all"
            />
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortOption)}
            className="px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#55529d]/20 focus:border-[#55529d] cursor-pointer"
          >
            <option value="newest">Newest First</option>
            <option value="alphabetical">A-Z</option>
            <option value="rating">Highest Rated</option>
          </select>

          {/* View Mode */}
          <div className="flex gap-2 bg-white border border-gray-200 rounded-xl p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === "grid"
                  ? "bg-[#55529d] text-white"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <Grid3X3 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === "list"
                  ? "bg-[#55529d] text-white"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* VENDORS GRID/LIST */}
        {loading ? (
          <LoadingGrid />
        ) : displayVendors.length === 0 ? (
          <EmptyState category={category.name} hasSearch={!!searchQuery.trim()} />
        ) : (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                : "space-y-4"
            }
          >
            {displayVendors.map(vendor =>
              viewMode === "grid" ? (
                <VendorGridCard key={vendor.id} vendor={vendor} />
              ) : (
                <VendorListCard key={vendor.id} vendor={vendor} />
              )
            )}
          </div>
        )}

        {/* BROWSE OTHER CATEGORIES */}
        {!loading && (
          <section className="mt-16 pt-8 border-t border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Browse Other Categories</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {allCategories
                .filter(c => c.slug !== slug)
                .slice(0, 10)
                .map(cat => {
                const CatIcon = cat.icon;
                  return (
                    <Link
                      key={cat.id}
                      href={`/categories/${cat.slug}`}
                      className="group p-4 bg-white border border-gray-200 rounded-xl hover:border-[#55529d] hover:shadow-md transition-all"
                    >
                      <div className={`w-12 h-12 ${cat.bgColor} ${cat.color} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                        <CatIcon className="w-6 h-6" />
                      </div>
                      <h3 className="font-semibold text-gray-900 text-sm">{cat.name}</h3>
                    </Link>
                  );
                })}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}

/* ======================================================
   VENDOR GRID CARD
====================================================== */

function VendorGridCard({ vendor }: { vendor: Vendor }) {
  const displayName = vendor.business_name || vendor.name || "Unnamed Vendor";
  const description = vendor.business_description || vendor.description;
  const addressRaw = vendor.business_address || vendor.address;
  const address = typeof addressRaw === "string" ? addressRaw : (addressRaw as any)?.location_address || "";
  const logoUrl = vendor.logo_url || vendor.logoUrl;
  const coverUrl = vendor.cover_image_url || logoUrl;
  const category = vendor.category || vendor.categories?.[0];
  const vendorLink = vendor.slug ? `/store/${vendor.slug}` : `/store/${vendor.id}`;

  return (
    <Link href={vendorLink}>
      <div className="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer hover:shadow-lg hover:border-[#55529d]/20 transition-all duration-300 h-full">
        {/* Cover Image */}
        <div className="aspect-[16/9] bg-gray-100 overflow-hidden relative">
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt={displayName}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Store className="w-16 h-16 text-gray-300" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-gray-900 line-clamp-1 text-lg group-hover:text-[#55529d] transition-colors">
              {displayName}
            </h3>
            {vendor.verified && (
              <BadgeCheck className="w-5 h-5 text-[#55529d] flex-shrink-0" />
            )}
          </div>

          {description && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{description}</p>
          )}

          <div className="mt-3 flex items-center justify-between">
            {category && (
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-[#55529d]/10 text-[#55529d] rounded-full font-medium">
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
                  <span className="text-xs text-gray-500">({vendor.total_reviews})</span>
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
  );
}

/* ======================================================
   VENDOR LIST CARD
====================================================== */

function VendorListCard({ vendor }: { vendor: Vendor }) {
  const displayName = vendor.business_name || vendor.name || "Unnamed Vendor";
  const description = vendor.business_description || vendor.description;
  const addressRaw = vendor.business_address || vendor.address;
  const address = typeof addressRaw === "string" ? addressRaw : (addressRaw as any)?.location_address || "";
  const logoUrl = vendor.logo_url || vendor.logoUrl;
  const vendorLink = vendor.slug ? `/store/${vendor.slug}` : `/store/${vendor.id}`;

  return (
    <Link href={vendorLink}>
      <div className="group bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-[#55529d]/20 transition-all cursor-pointer">
        <div className="flex gap-4">
          {/* Logo */}
          <div className="w-20 h-20 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
            {logoUrl ? (
              <Image src={logoUrl} alt={displayName} width={80} height={80} className="w-full h-full object-cover" />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Store className="w-8 h-8 text-gray-300" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-semibold text-gray-900 text-lg group-hover:text-[#55529d] transition-colors">
                {displayName}
              </h3>
              {vendor.verified && (
                <BadgeCheck className="w-5 h-5 text-[#55529d] flex-shrink-0" />
              )}
            </div>

            {description && (
              <p className="text-sm text-gray-600 line-clamp-2 mb-2">{description}</p>
            )}

            <div className="flex flex-wrap items-center gap-3 text-sm">
              {address && (
                <span className="flex items-center gap-1 text-gray-500">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="truncate max-w-xs">{address}</span>
                </span>
              )}

              {vendor.rating && (
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold text-gray-700">{vendor.rating.toFixed(1)}</span>
                  {vendor.total_reviews && (
                    <span className="text-gray-500">({vendor.total_reviews})</span>
                  )}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ======================================================
   LOADING GRID
====================================================== */

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-100">
          <div className="aspect-[16/9] bg-gray-200 animate-pulse" />
          <div className="p-4 space-y-3">
            <div className="h-5 bg-gray-200 rounded-lg w-3/4 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded-lg w-1/2 animate-pulse" />
            <div className="flex justify-between items-center">
              <div className="h-6 bg-gray-200 rounded-lg w-1/4 animate-pulse" />
              <div className="h-4 bg-gray-200 rounded-full w-16 animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ======================================================
   EMPTY STATE
====================================================== */

function EmptyState({ category, hasSearch }: { category: string; hasSearch: boolean }) {
  return (
    <div className="text-center py-16 px-4">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
        <Store className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        {hasSearch ? "No vendors found" : `No ${category} vendors yet`}
      </h3>
      <p className="text-gray-500 mb-6">
        {hasSearch
          ? "Try adjusting your search or filters"
          : "Check back soon as new vendors join the platform"}
      </p>
      <Link
        href="/categories"
        className="inline-flex items-center gap-2 bg-[#55529d] text-white px-6 py-3 rounded-full font-semibold hover:bg-[#433f7a] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Browse All Categories
      </Link>
    </div>
  );
}