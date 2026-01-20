"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/firebase/config";
import { collection, getDocs, query, where } from "firebase/firestore";
import {
  Store,
  ArrowLeft,
  Star,
  MapPin,
  CheckCircle2,
  Sparkles,
  Search,
  SlidersHorizontal,
  X,
  Filter,
} from "lucide-react";
import MobileBottomNav from "@/components/layout/MobileBottomNav";

/* ======================================================
   TYPES
====================================================== */

type Vendor = {
  id: string;
  slug?: string;
  name?: string;
  business_name?: string;
  description?: string;
  business_description?: string;
  category?: string;
  categories?: string[];
  logoUrl?: string;
  logo_url?: string;
  cover_image_url?: string;
  banner_url?: string;
  rating?: number;
  featured?: boolean;
  verified?: boolean;
  isNew?: boolean;
  address?: string | { location_address?: string; lat?: number; lng?: number };
  location?: string | { location_address?: string; lat?: number; lng?: number };
  city?: string;
  state?: string;
  zip?: string;
  status?: "pending" | "approved" | "rejected" | "suspended";
  created_at?: { toMillis?: () => number };
};

type SortOption = "newest" | "alphabetical" | "rating";

/* ======================================================
   HELPER: Extract string from address/location field
====================================================== */

function extractAddressString(
  value:
    | string
    | { location_address?: string; lat?: number; lng?: number }
    | undefined
): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value.location_address) {
    return value.location_address;
  }
  return "";
}

/* ======================================================
   MAIN PAGE COMPONENT
====================================================== */

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [showFilters, setShowFilters] = useState(false);

  /* ---------------- Fetch All Vendors (Fixed Logic) ---------------- */
  useEffect(() => {
    const fetchVendors = async () => {
      setLoading(true);
      try {
        // 1. Fetch vendors with status="approved"
        const approvedQuery = query(
          collection(db, "vendors"),
          where("status", "==", "approved")
        );
        const approvedSnap = await getDocs(approvedQuery);

        let allVendors: Vendor[] = approvedSnap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Vendor, "id">),
        }));

        // 2. Also fetch vendors with verified=true (legacy)
        const verifiedQuery = query(
          collection(db, "vendors"),
          where("verified", "==", true)
        );
        const verifiedSnap = await getDocs(verifiedQuery);

        const verifiedVendors: Vendor[] = verifiedSnap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Vendor, "id">),
        }));

        // 3. Merge unique vendors
        const existingIds = new Set(allVendors.map((v) => v.id));
        for (const v of verifiedVendors) {
          if (!existingIds.has(v.id)) {
            allVendors.push(v);
          }
        }

        setVendors(allVendors);
      } catch (error) {
        console.error("Error fetching vendors:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVendors();
  }, []);

  /* ---------------- Unique Categories ---------------- */
  const uniqueCategories = useMemo(() => {
    const catSet = new Set<string>();

    vendors.forEach((v) => {
      if (v.category) catSet.add(v.category);
      if (v.categories) {
        v.categories.forEach((c) => catSet.add(c));
      }
    });

    return Array.from(catSet).sort();
  }, [vendors]);

  /* ---------------- Filter + Sort Vendors ---------------- */
  const filteredVendors = useMemo(() => {
    let result = [...vendors];

    // Search
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter((v) => {
        const name = (v.name || v.business_name || "").toLowerCase();
        const desc = (v.description || v.business_description || "").toLowerCase();
        const cat = (v.category || "").toLowerCase();
        const cats = (v.categories || []).join(" ").toLowerCase();
        const addr = extractAddressString(v.address || v.location).toLowerCase();

        return (
          name.includes(term) ||
          desc.includes(term) ||
          cat.includes(term) ||
          cats.includes(term) ||
          addr.includes(term)
        );
      });
    }

    // Category filter
    if (selectedCategory !== "all") {
      result = result.filter((v) => {
        if (v.category === selectedCategory) return true;
        if (v.categories?.includes(selectedCategory)) return true;
        return false;
      });
    }

    // Sort
    switch (sortBy) {
      case "alphabetical":
        result.sort((a, b) => {
          const aName = a.name || a.business_name || "";
          const bName = b.name || b.business_name || "";
          return aName.localeCompare(bName);
        });
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

    // Featured vendors first
    result.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));

    return result;
  }, [vendors, searchTerm, selectedCategory, sortBy]);

  const activeFiltersCount =
    (selectedCategory !== "all" ? 1 : 0) + (searchTerm ? 1 : 0);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Sticky Header */}
      <div className="bg-white sticky top-0 pt-10 z-30 shadow-sm transition-all duration-200">
        <div className="max-w-6xl mx-auto px-4 py-6 lg:py-8">
          <div className="flex items-center gap-3 lg:gap-4">
            <Link
              href="/"
              className="p-2 -ml-2 hover:bg-gray-100 active:bg-gray-200 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </Link>

            <div className="flex-1 min-w-0">
              <h1 className="text-lg lg:text-xl font-bold text-gray-900 truncate">
                All Vendors
              </h1>
              <p className="text-xs lg:text-sm text-gray-500 truncate">
                {loading
                  ? "Loading..."
                  : `${filteredVendors.length} store${
                      filteredVendors.length !== 1 ? "s" : ""
                    } available`}
              </p>
            </div>

            {/* Mobile Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`lg:hidden p-2.5 rounded-xl transition-all active:scale-95 relative ${
                showFilters || activeFiltersCount > 0
                  ? "bg-purple-50 text-purple-600"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {showFilters ? (
                <X className="w-5 h-5" />
              ) : (
                <SlidersHorizontal className="w-5 h-5" />
              )}
              {activeFiltersCount > 0 && !showFilters && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-purple-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

          {/* Desktop Filters (always visible) */}
          <div className="hidden lg:flex items-center gap-4 mt-6">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search vendors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border-0 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500/20 transition-all"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2.5 bg-gray-100 border-0 rounded-xl focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
            >
              <option value="all">All Categories</option>
              {uniqueCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-4 py-2.5 bg-gray-100 border-0 rounded-xl focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="alphabetical">A-Z</option>
              <option value="rating">Top Rated</option>
            </select>
          </div>

          {/* Mobile Filters (collapsible) */}
          {showFilters && (
            <div className="lg:hidden mt-4 pt-4 border-t border-gray-100 space-y-4 animate-fade-in">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search vendors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-100 border-0 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500/20 transition-all"
                />
              </div>

              <div className="flex gap-3">
                {/* Category */}
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="flex-1 px-3 py-3 bg-gray-100 border-0 rounded-xl focus:ring-2 focus:ring-purple-500/20"
                >
                  <option value="all">All Categories</option>
                  {uniqueCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>

                {/* Sort */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="flex-1 px-3 py-3 bg-gray-100 border-0 rounded-xl focus:ring-2 focus:ring-purple-500/20"
                >
                  <option value="newest">Newest</option>
                  <option value="alphabetical">A-Z</option>
                  <option value="rating">Top Rated</option>
                </select>
              </div>

              {/* Clear Filters */}
              {activeFiltersCount > 0 && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedCategory("all");
                  }}
                  className="w-full py-2.5 text-purple-600 font-medium text-sm hover:bg-purple-50 rounded-xl transition-colors"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Vendors Grid */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {loading ? (
          <LoadingGrid />
        ) : filteredVendors.length === 0 ? (
          <EmptyState
            hasFilters={activeFiltersCount > 0}
            onClearFilters={() => {
              setSelectedCategory("all");
              setSearchTerm("");
            }}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            {filteredVendors.map((vendor) => (
              <VendorCard key={vendor.id} vendor={vendor} />
            ))}
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation - Using Shared Component */}
      <MobileBottomNav />
    </div>
  );
}

/* ======================================================
   LOADING STATE
====================================================== */

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl overflow-hidden shadow-sm animate-pulse"
        >
          <div className="h-32 bg-gray-200" />
          <div className="p-4 space-y-3">
            <div className="h-5 bg-gray-200 rounded w-2/3" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
            <div className="h-4 bg-gray-200 rounded w-3/4" />
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
  hasFilters,
  onClearFilters,
}: {
  hasFilters: boolean;
  onClearFilters: () => void;
}) {
  return (
    <div className="text-center py-16">
      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Store className="w-10 h-10 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        No vendors found
      </h3>
      <p className="text-gray-500 mb-6">
        {hasFilters
          ? "Try adjusting your filters or search terms"
          : "There are no vendors available at this time"}
      </p>
      {hasFilters && (
        <button
          onClick={onClearFilters}
          className="px-6 py-2.5 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 transition-colors"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

/* ======================================================
   VENDOR CARD
====================================================== */

function VendorCard({ vendor }: { vendor: Vendor }) {
  const displayName = vendor.name || vendor.business_name || "Unnamed Store";
  const displayDesc =
    vendor.description || vendor.business_description || "";
  const logoUrl = vendor.logoUrl || vendor.logo_url;
  const coverUrl = vendor.cover_image_url || vendor.banner_url;
  const addressStr = extractAddressString(vendor.address || vendor.location);
  const vendorLink = vendor.slug ? `/store/${vendor.slug}` : `/vendor/${vendor.id}`;

  return (
    <Link href={vendorLink} className="group block">
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 h-full">
        {/* Cover Image */}
        <div className="relative h-32 bg-gradient-to-br from-purple-100 to-purple-50">
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt={displayName}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Store className="w-12 h-12 text-purple-300" />
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-3 left-3 flex gap-2">
            {vendor.featured && (
              <span className="px-2.5 py-1 bg-yellow-400 text-yellow-900 text-[10px] font-bold rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Featured
              </span>
            )}
            {vendor.isNew && (
              <span className="px-2.5 py-1 bg-green-500 text-white text-[10px] font-bold rounded-full">
                New
              </span>
            )}
          </div>

          {/* Logo */}
          {logoUrl && (
            <div className="absolute -bottom-6 left-4">
              <div className="w-14 h-14 rounded-xl bg-white shadow-md overflow-hidden border-2 border-white">
                <Image
                  src={logoUrl}
                  alt={displayName}
                  width={56}
                  height={56}
                  className="object-cover w-full h-full"
                />
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className={`p-4 ${logoUrl ? "pt-8" : "pt-4"}`}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate group-hover:text-purple-600 transition-colors flex items-center gap-1.5">
                {displayName}
                {vendor.verified && (
                  <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                )}
              </h3>
              {vendor.category && (
                <p className="text-sm text-gray-500 truncate">{vendor.category}</p>
              )}
            </div>

            {/* Rating */}
            {vendor.rating && vendor.rating > 0 && (
              <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-lg flex-shrink-0">
                <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                <span className="text-sm font-semibold text-gray-700">
                  {vendor.rating.toFixed(1)}
                </span>
              </div>
            )}
          </div>

          {/* Description */}
          {displayDesc && (
            <p className="text-sm text-gray-600 mt-2 line-clamp-2">{displayDesc}</p>
          )}

          {/* Address */}
          {addressStr && (
            <div className="flex items-center gap-1.5 mt-3 text-sm text-gray-500">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{addressStr}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}