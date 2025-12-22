"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/firebase/config";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
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
  address?: string;
  location?: string;
  city?: string;
  state?: string;
  zip?: string;
  status?: "pending" | "approved" | "rejected" | "suspended";
  created_at?: { toMillis?: () => number };
};

type SortOption = "newest" | "alphabetical" | "rating";

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

  /* ---------------- Fetch All Approved Vendors ---------------- */
  useEffect(() => {
    const fetchVendors = async () => {
      setLoading(true);
      try {
        // Try status-based query first (modern vendors)
        const approvedQuery = query(
          collection(db, "vendors"),
          where("status", "==", "approved")
        );
        const approvedSnap = await getDocs(approvedQuery);

        let allVendors: Vendor[] = approvedSnap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Vendor, "id">),
        }));

        // Also fetch legacy verified vendors if status-based returned few results
        if (allVendors.length < 5) {
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
        }

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
          (v.description || v.business_description || "").toLowerCase().includes(q) ||
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900">All Vendors</h1>
              <p className="text-sm text-gray-500">
                {loading
                  ? "Loading..."
                  : `${filteredVendors.length} vendor${
                      filteredVendors.length !== 1 ? "s" : ""
                    }`}
              </p>
            </div>

            {/* Mobile Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-xl transition-colors relative"
            >
              <SlidersHorizontal className="w-5 h-5" />
              {(selectedCategory !== "all" || searchTerm) && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-purple-600 rounded-full" />
              )}
            </button>
          </div>

          {/* Search Bar */}
          <div className="mt-4 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search vendors..."
              className="w-full pl-12 pr-4 py-3 bg-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>

          {/* Desktop Filters */}
          <div className="hidden lg:flex items-center gap-4 mt-4">
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 bg-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-500/20 outline-none cursor-pointer"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-4 py-2 bg-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-500/20 outline-none cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="alphabetical">A-Z</option>
              <option value="rating">Top Rated</option>
            </select>

            {/* Clear Filters */}
            {(selectedCategory !== "all" || searchTerm) && (
              <button
                onClick={() => {
                  setSelectedCategory("all");
                  setSearchTerm("");
                }}
                className="px-4 py-2 text-sm font-medium text-purple-600 hover:bg-purple-50 rounded-xl transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Mobile Filters Panel */}
          {showFilters && (
            <div className="lg:hidden mt-4 p-4 bg-gray-50 rounded-xl space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20 outline-none"
                >
                  <option value="all">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20 outline-none"
                >
                  <option value="newest">Newest First</option>
                  <option value="alphabetical">A-Z</option>
                  <option value="rating">Top Rated</option>
                </select>
              </div>

              {(selectedCategory !== "all" || searchTerm) && (
                <button
                  onClick={() => {
                    setSelectedCategory("all");
                    setSearchTerm("");
                    setShowFilters(false);
                  }}
                  className="w-full px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <LoadingGrid />
        ) : filteredVendors.length === 0 ? (
          <EmptyState
            hasFilters={selectedCategory !== "all" || !!searchTerm}
            onClearFilters={() => {
              setSelectedCategory("all");
              setSearchTerm("");
            }}
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl overflow-hidden animate-pulse"
        >
          <div className="aspect-[4/3] bg-gray-200" />
          <div className="p-4 space-y-3">
            <div className="h-5 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
            <div className="h-8 bg-gray-200 rounded-full w-24" />
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
    <div className="text-center py-20">
      <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h2 className="text-xl font-semibold text-gray-700 mb-2">
        {hasFilters ? "No vendors match your filters" : "No vendors available"}
      </h2>
      <p className="text-gray-500 mb-6">
        {hasFilters
          ? "Try adjusting your search or filters"
          : "Check back soon for new vendors"}
      </p>
      {hasFilters && (
        <button
          onClick={onClearFilters}
          className="px-6 py-3 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 transition-colors"
        >
          Clear Filters
        </button>
      )}
    </div>
  );
}

/* ======================================================
   VENDOR CARD (Matching Search/Homepage Design)
====================================================== */

function VendorCard({ vendor }: { vendor: Vendor }) {
  const link = vendor.slug ? `/store/${vendor.slug}` : `/store/${vendor.id}`;
  const displayName = vendor.business_name || vendor.name || "Unnamed Vendor";
  const description = vendor.business_description || vendor.description;
  const category = vendor.category || vendor.categories?.[0];
  const logoUrl = vendor.logoUrl || vendor.logo_url;
  const coverUrl = vendor.cover_image_url || vendor.banner_url;

  // Build location string
  const locationParts = [vendor.address, vendor.city, vendor.state, vendor.zip].filter(
    Boolean
  );
  const locationString = vendor.location || locationParts.join(", ");

  const hasBackgroundImage = coverUrl || logoUrl;

  return (
    <Link href={link} className="block group">
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300 hover:-translate-y-1">
        {/* Image/Logo Section */}
        <div className="relative aspect-[4/3] bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center overflow-hidden">
          {/* Background Image */}
          {hasBackgroundImage && (
            <Image
              src={coverUrl || logoUrl || ""}
              alt={displayName}
              fill
              className="object-cover"
            />
          )}

          {/* Featured Badge */}
          {vendor.featured && (
            <div className="absolute top-3 left-3 z-10">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/95 backdrop-blur-sm rounded-full text-sm font-medium text-purple-700 shadow-sm">
                <Sparkles className="w-4 h-4" />
                Featured
              </span>
            </div>
          )}

          {/* New Badge */}
          {vendor.isNew && !vendor.featured && (
            <div className="absolute top-3 left-3 z-10">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white rounded-full text-sm font-medium shadow-sm">
                New
              </span>
            </div>
          )}

          {/* Placeholder when no image */}
          {!hasBackgroundImage && (
            <div className="w-24 h-24 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
              <Store className="w-12 h-12 text-white/60" />
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="p-4 space-y-3">
          {/* Name & Verified Badge */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-gray-900 text-lg leading-tight group-hover:text-purple-700 transition-colors">
              {displayName}
            </h3>
            {vendor.verified && (
              <CheckCircle2 className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            )}
          </div>

          {/* Description */}
          {description && (
            <p className="text-gray-600 text-sm line-clamp-2">{description}</p>
          )}

          {/* Category */}
          {category && (
            <span className="inline-flex px-3 py-1 bg-purple-50 text-purple-700 text-sm font-medium rounded-full">
              {category}
            </span>
          )}

          {/* Location */}
          {locationString && (
            <div className="flex items-center gap-1.5 text-gray-500 text-sm">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{locationString}</span>
            </div>
          )}

          {/* Rating */}
          {vendor.rating && vendor.rating > 0 && (
            <div className="flex items-center gap-1 text-sm">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span className="font-medium text-gray-700">
                {vendor.rating.toFixed(1)}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}