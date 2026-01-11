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

        // 2. ALWAYS fetch legacy verified vendors to ensure full list
        const legacyQuery = query(
          collection(db, "vendors"),
          where("verified", "==", true)
        );
        const legacySnap = await getDocs(legacyQuery);

        const legacyVendors = legacySnap.docs
          .map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Vendor, "id">),
          }))
          .filter(
            (v) =>
              v.status !== "suspended" &&
              v.status !== "rejected" &&
              !allVendors.find((av) => av.id === v.id)
          );

        allVendors = [...allVendors, ...legacyVendors];

        setVendors(allVendors);
      } catch (err) {
        console.error("Error fetching vendors:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchVendors();
  }, []);

  /* ---------------- Extract Unique Categories ---------------- */
  const categories = useMemo(() => {
    const catSet = new Set<string>();
    vendors.forEach((v) => {
      if (v.category) catSet.add(v.category);
      v.categories?.forEach((c) => catSet.add(c));
    });
    return Array.from(catSet).sort();
  }, [vendors]);

  /* ---------------- Filter & Sort Vendors ---------------- */
  const filteredVendors = useMemo(() => {
    let result = [...vendors];

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (v) =>
          (v.name || v.business_name || "").toLowerCase().includes(q) ||
          (v.description || v.business_description || "")
            .toLowerCase()
            .includes(q) ||
          (v.category || v.categories?.[0] || "").toLowerCase().includes(q)
      );
    }

    // Category filter
    if (selectedCategory !== "all") {
      result = result.filter(
        (v) =>
          v.category === selectedCategory ||
          v.categories?.includes(selectedCategory)
      );
    }

    // Sort
    switch (sortBy) {
      case "alphabetical":
        result.sort((a, b) =>
          (a.business_name || a.name || "").localeCompare(
            b.business_name || b.name || ""
          )
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

    // Featured vendors first
    result.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));

    return result;
  }, [vendors, searchTerm, selectedCategory, sortBy]);

  const activeFiltersCount =
    (selectedCategory !== "all" ? 1 : 0) + (searchTerm ? 1 : 0);

  return (
    <div className="min-h-screen bg-gray-50 pb-safe">
      {/* Sticky Header */}
      <div className="bg-white border-b sticky top-0 z-30 shadow-sm transition-all duration-200">
        <div className="max-w-6xl mx-auto px-4 py-3 lg:py-4">
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
              {!showFilters && activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-purple-600 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

          {/* Search Bar & Desktop Filters Row */}
          <div className="mt-3 flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search stores & services..."
                className="w-full pl-11 pr-10 py-3 bg-gray-100/80 border-transparent focus:bg-white border focus:border-purple-500/50 rounded-xl text-base outline-none transition-all placeholder:text-gray-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 bg-gray-200/50 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Desktop Filters (Hidden on Mobile) */}
            <div className="hidden lg:flex items-center gap-3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-3 bg-gray-100 hover:bg-gray-200/70 border-r-[12px] border-transparent rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-500/20 outline-none cursor-pointer transition-colors"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-4 py-3 bg-gray-100 hover:bg-gray-200/70 border-r-[12px] border-transparent rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-500/20 outline-none cursor-pointer transition-colors"
              >
                <option value="newest">Newest</option>
                <option value="alphabetical">Name (A-Z)</option>
                <option value="rating">Top Rated</option>
              </select>

              {(selectedCategory !== "all" || searchTerm) && (
                <button
                  onClick={() => {
                    setSelectedCategory("all");
                    setSearchTerm("");
                  }}
                  className="px-4 py-3 text-sm font-semibold text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors whitespace-nowrap"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Mobile Filters Drawer (Collapsible) */}
          <div
            className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out ${
              showFilters ? "max-h-[300px] opacity-100 mt-4" : "max-h-0 opacity-0"
            }`}
          >
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-4 shadow-inner">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">
                  Category
                </label>
                <div className="relative">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 bg-white border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-purple-500/20 outline-none appearance-none"
                  >
                    <option value="all">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <Filter className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">
                  Sort By
                </label>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="w-full pl-4 pr-10 py-3 bg-white border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-purple-500/20 outline-none appearance-none"
                  >
                    <option value="newest">Newest Added</option>
                    <option value="alphabetical">Alphabetical (A-Z)</option>
                    <option value="rating">Highest Rated</option>
                  </select>
                  <SlidersHorizontal className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {(selectedCategory !== "all" || searchTerm) && (
                <button
                  onClick={() => {
                    setSelectedCategory("all");
                    setSearchTerm("");
                    setShowFilters(false);
                  }}
                  className="w-full py-3 text-sm font-semibold text-purple-600 bg-white border border-purple-100 hover:bg-purple-50 rounded-xl transition-colors active:scale-[0.98]"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid */}
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
          className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
        >
          <div className="aspect-[4/3] bg-gray-200 animate-pulse" />
          <div className="p-4 space-y-3">
            <div className="h-5 bg-gray-200 rounded w-3/4 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
            <div className="flex gap-2 pt-2">
              <div className="h-6 bg-gray-200 rounded-full w-20 animate-pulse" />
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

function EmptyState({
  hasFilters,
  onClearFilters,
}: {
  hasFilters: boolean;
  onClearFilters: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <Store className="w-10 h-10 text-gray-400" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">
        {hasFilters ? "No matches found" : "No vendors available"}
      </h2>
      <p className="text-gray-500 max-w-sm mb-8">
        {hasFilters
          ? "We couldn't find any vendors matching your search. Try adjusting your filters."
          : "Check back soon! New vendors are being added."}
      </p>
      {hasFilters && (
        <button
          onClick={onClearFilters}
          className="px-8 py-3 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 active:bg-purple-800 transition-all active:scale-95 shadow-lg shadow-purple-500/20"
        >
          Clear Search
        </button>
      )}
    </div>
  );
}

/* ======================================================
   VENDOR CARD
====================================================== */

function VendorCard({ vendor }: { vendor: Vendor }) {
  const link = vendor.slug ? `/store/${vendor.slug}` : `/store/${vendor.id}`;
  const displayName = vendor.business_name || vendor.name || "Unnamed Vendor";
  const description = vendor.business_description || vendor.description;
  const category = vendor.category || vendor.categories?.[0];
  const logoUrl = vendor.logoUrl || vendor.logo_url;
  const coverUrl = vendor.cover_image_url || vendor.banner_url;

  const addressStr = extractAddressString(vendor.address);
  const locationStr = extractAddressString(vendor.location);
  const locationParts = [
    addressStr,
    vendor.city,
    vendor.state,
    vendor.zip,
  ].filter(Boolean);
  const locationString = locationStr || locationParts.join(", ");

  const hasBackgroundImage = coverUrl || logoUrl;

  return (
    <Link
      href={link}
      className="block group active:scale-[0.99] transition-transform duration-200"
    >
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300">
        {/* Image/Logo Section */}
        <div className="relative aspect-[4/3] bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center overflow-hidden">
          {hasBackgroundImage ? (
            <Image
              src={coverUrl || logoUrl || ""}
              alt={displayName}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="text-purple-200">
              <Store className="w-16 h-16" />
            </div>
          )}

          {/* Badges Container */}
          <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
            {vendor.featured && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/95 backdrop-blur-md rounded-lg text-xs font-bold text-purple-700 shadow-sm border border-purple-100">
                <Sparkles className="w-3.5 h-3.5" />
                Featured
              </span>
            )}
            {vendor.isNew && !vendor.featured && (
              <span className="inline-flex items-center px-2.5 py-1 bg-green-500/95 backdrop-blur-md rounded-lg text-xs font-bold text-white shadow-sm">
                New
              </span>
            )}
          </div>

          {/* Rating Badge (Overlaid on Image) */}
          {vendor.rating && vendor.rating > 0 && (
            <div className="absolute bottom-3 right-3 z-10">
              <div className="flex items-center gap-1 px-2 py-1 bg-white/95 backdrop-blur-md rounded-lg text-xs font-bold text-gray-800 shadow-sm">
                <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                <span>{vendor.rating.toFixed(1)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-bold text-gray-900 text-lg leading-snug group-hover:text-purple-600 transition-colors line-clamp-1">
              {displayName}
            </h3>
            {vendor.verified && (
              <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0" />
            )}
          </div>

          {description && (
            <p className="text-gray-500 text-sm line-clamp-2 mb-3 h-10">
              {description}
            </p>
          )}

          <div className="flex items-center justify-between pt-1 border-t border-gray-50 mt-auto">
            <div className="flex flex-col gap-1">
              {category && (
                <span className="text-xs font-medium text-purple-600">
                  {category}
                </span>
              )}
              {locationString && (
                <div className="flex items-center gap-1 text-gray-400 text-xs">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate max-w-[150px]">
                    {locationString}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}