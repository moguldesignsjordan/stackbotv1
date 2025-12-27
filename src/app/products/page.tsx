"use client";

import { Suspense, useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/firebase/config";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  DocumentData,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { formatPrice } from "@/lib/utils/currency";
import Footer from "@/components/layout/Footer";

import {
  Search,
  Package,
  Filter,
  X,
  ChevronDown,
  ArrowUpDown,
  Grid3X3,
  LayoutList,
  ArrowLeft,
  SlidersHorizontal,
  Store,
  Star,
  Loader2,
  ShoppingBag,
} from "lucide-react";

/* ======================================================
   SUSPENSE WRAPPER
====================================================== */

export default function ProductsPageWrapper() {
  return (
    <Suspense fallback={<ProductsPageLoading />}>
      <ProductsPage />
    </Suspense>
  );
}

function ProductsPageLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-gray-200 rounded-xl animate-pulse" />
            <div>
              <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mt-1" />
            </div>
          </div>
          <div className="h-12 bg-gray-200 rounded-xl animate-pulse" />
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
              <div className="aspect-square bg-gray-200" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
                <div className="h-5 bg-gray-200 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

/* ======================================================
   TYPES
====================================================== */

interface Vendor {
  id: string;
  name?: string;
  business_name?: string;
  slug?: string;
  status?: string;
  verified?: boolean;
  category?: string;
  categories?: string[];
}

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  images?: string[];
  active?: boolean;
  vendorId: string;
  vendorSlug?: string;
  vendor_name?: string;
  category?: string;
  created_at?: any;
}

type SortOption = "newest" | "price-low" | "price-high" | "name-az" | "name-za";
type ViewMode = "grid" | "list";

const PRODUCTS_PER_PAGE = 24;

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest First" },
  { value: "price-low", label: "Price: Low to High" },
  { value: "price-high", label: "Price: High to Low" },
  { value: "name-az", label: "Name: A-Z" },
  { value: "name-za", label: "Name: Z-A" },
];

const CATEGORIES = [
  "All",
  "Food & Drinks",
  "Electronics",
  "Fashion",
  "Home & Garden",
  "Beauty",
  "Services",
  "Sports",
  "Automotive",
  "Other",
];

/* ======================================================
   MAIN PAGE
====================================================== */

function ProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [vendors, setVendors] = useState<Map<string, Vendor>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);

  // Filters & UI State
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [activeSearch, setActiveSearch] = useState(searchParams.get("q") || "");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "All");
  const [sortBy, setSortBy] = useState<SortOption>((searchParams.get("sort") as SortOption) || "newest");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);

  /* ---------------- FETCH VENDORS ---------------- */
  const fetchVendors = useCallback(async () => {
    const vendorMap = new Map<string, Vendor>();

    try {
      const approvedSnap = await getDocs(
        query(collection(db, "vendors"), where("status", "==", "approved"))
      );

      if (!approvedSnap.empty) {
        approvedSnap.docs.forEach((doc) => {
          vendorMap.set(doc.id, { id: doc.id, ...doc.data() } as Vendor);
        });
      } else {
        // Fallback: verified vendors
        const verifiedSnap = await getDocs(
          query(collection(db, "vendors"), where("verified", "==", true))
        );
        verifiedSnap.docs.forEach((doc) => {
          const data = doc.data();
          if (data.status !== "suspended" && data.status !== "deleted") {
            vendorMap.set(doc.id, { id: doc.id, ...data } as Vendor);
          }
        });
      }
    } catch (err) {
      console.error("Error fetching vendors:", err);
    }

    return vendorMap;
  }, []);

  /* ---------------- FETCH PRODUCTS ---------------- */
  const fetchProducts = useCallback(async (vendorMap: Map<string, Vendor>, reset = false) => {
    if (reset) {
      setLoading(true);
      setLastDoc(null);
    } else {
      setLoadingMore(true);
    }

    try {
      const allProducts: Product[] = [];
      const vendorIds = Array.from(vendorMap.keys());

      // Fetch products from each vendor's subcollection
      const productPromises = vendorIds.map(async (vendorId) => {
        const vendor = vendorMap.get(vendorId);
        if (!vendor) return [];

        try {
          const productsSnap = await getDocs(
            collection(db, "vendors", vendorId, "products")
          );

          return productsSnap.docs
            .filter((d) => d.data().active !== false)
            .map((d) => {
              const data = d.data();
              return {
                id: d.id,
                ...data,
                vendorId,
                vendorSlug: vendor.slug || vendorId,
                vendor_name: data.vendor_name || vendor.name || vendor.business_name,
              } as Product;
            });
        } catch (err) {
          console.error(`Error fetching products for vendor ${vendorId}:`, err);
          return [];
        }
      });

      const results = await Promise.all(productPromises);
      results.forEach((vendorProducts) => {
        allProducts.push(...vendorProducts);
      });

      setProducts(allProducts);
      setHasMore(false); // All products loaded at once for client-side filtering
    } catch (err) {
      console.error("Error fetching products:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  /* ---------------- INITIAL LOAD ---------------- */
  useEffect(() => {
    const load = async () => {
      const vendorMap = await fetchVendors();
      setVendors(vendorMap);
      await fetchProducts(vendorMap, true);
    };
    load();
  }, [fetchVendors, fetchProducts]);

  /* ---------------- FILTERED & SORTED PRODUCTS ---------------- */
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Search filter
    if (activeSearch.trim()) {
      const searchLower = activeSearch.toLowerCase();
      result = result.filter(
        (p) =>
          p.name?.toLowerCase().includes(searchLower) ||
          p.description?.toLowerCase().includes(searchLower) ||
          p.vendor_name?.toLowerCase().includes(searchLower)
      );
    }

    // Category filter
    if (selectedCategory !== "All") {
      result = result.filter((p) => {
        const vendor = vendors.get(p.vendorId);
        const productCategory = p.category?.toLowerCase();
        const vendorCategory = vendor?.category?.toLowerCase();
        const vendorCategories = vendor?.categories?.map((c) => c.toLowerCase()) || [];
        const categoryLower = selectedCategory.toLowerCase();

        return (
          productCategory === categoryLower ||
          vendorCategory === categoryLower ||
          vendorCategories.includes(categoryLower)
        );
      });
    }

    // Price filter
    result = result.filter(
      (p) => p.price >= priceRange[0] && p.price <= priceRange[1]
    );

    // Sorting
    switch (sortBy) {
      case "price-low":
        result.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        result.sort((a, b) => b.price - a.price);
        break;
      case "name-az":
        result.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        break;
      case "name-za":
        result.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
        break;
      case "newest":
      default:
        result.sort((a, b) => {
          const aTime = a.created_at?.toMillis?.() || a.created_at?.seconds * 1000 || 0;
          const bTime = b.created_at?.toMillis?.() || b.created_at?.seconds * 1000 || 0;
          return bTime - aTime;
        });
        break;
    }

    return result;
  }, [products, activeSearch, selectedCategory, sortBy, priceRange, vendors]);

  /* ---------------- HANDLERS ---------------- */
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(searchQuery);
    updateURL({ q: searchQuery || null });
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    updateURL({ category: category === "All" ? null : category });
    setShowFilters(false);
  };

  const handleSortChange = (sort: SortOption) => {
    setSortBy(sort);
    updateURL({ sort: sort === "newest" ? null : sort });
  };

  const clearFilters = () => {
    setSearchQuery("");
    setActiveSearch("");
    setSelectedCategory("All");
    setSortBy("newest");
    setPriceRange([0, 10000]);
    router.push("/products");
  };

  const updateURL = (params: Record<string, string | null>) => {
    const current = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([key, value]) => {
      if (value === null) {
        current.delete(key);
      } else {
        current.set(key, value);
      }
    });
    const newURL = current.toString() ? `/products?${current.toString()}` : "/products";
    router.push(newURL, { scroll: false });
  };

  const hasActiveFilters = activeSearch || selectedCategory !== "All" || sortBy !== "newest";

  /* ======================================================
     RENDER
  ====================================================== */

  return (
    <div className="min-h-screen bg-gray-50">
      {/* CSS Animation for Filter Modal */}
      <style jsx global>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          {/* Top Row: Back + Title */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="p-2 -ml-2 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">All Products</h1>
                <p className="text-sm text-gray-500">
                  {loading ? "Loading..." : `${filteredProducts.length} products`}
                </p>
              </div>
            </div>

            {/* View Toggle (Desktop) */}
            <div className="hidden md:flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === "grid"
                    ? "bg-white text-[#55529d] shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === "list"
                    ? "bg-white text-[#55529d] shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <LayoutList className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-100 rounded-xl text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#55529d]/30 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setActiveSearch("");
                  updateURL({ q: null });
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            )}
          </form>

          {/* Filter Row */}
          <div className="flex items-center gap-3 mt-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {/* Filter Button (Mobile) */}
            <button
              onClick={() => setShowFilters(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium whitespace-nowrap transition-colors ${
                hasActiveFilters
                  ? "bg-[#55529d] text-white border-[#55529d]"
                  : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {hasActiveFilters && (
                <span className="w-5 h-5 bg-white text-[#55529d] rounded-full text-xs flex items-center justify-center font-bold">
                  {(activeSearch ? 1 : 0) + (selectedCategory !== "All" ? 1 : 0)}
                </span>
              )}
            </button>

            {/* Category Pills */}
            {CATEGORIES.slice(0, 5).map((category) => (
              <button
                key={category}
                onClick={() => handleCategoryChange(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === category
                    ? "bg-[#55529d] text-white"
                    : "bg-white text-gray-700 border border-gray-200 hover:border-[#55529d] hover:text-[#55529d]"
                }`}
              >
                {category}
              </button>
            ))}

            {/* Sort Dropdown */}
            <div className="relative ml-auto">
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value as SortOption)}
                className="appearance-none pl-4 pr-10 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 cursor-pointer hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#55529d]/30"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="text-sm text-gray-500">Active filters:</span>
            {activeSearch && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#55529d]/10 text-[#55529d] rounded-full text-sm">
                Search: "{activeSearch}"
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setActiveSearch("");
                    updateURL({ q: null });
                  }}
                  className="ml-1 hover:bg-[#55529d]/20 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedCategory !== "All" && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#55529d]/10 text-[#55529d] rounded-full text-sm">
                {selectedCategory}
                <button
                  onClick={() => handleCategoryChange("All")}
                  className="ml-1 hover:bg-[#55529d]/20 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              onClick={clearFilters}
              className="text-sm text-gray-500 hover:text-[#55529d] underline"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <ProductSkeleton key={i} />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          /* Empty State */
          <EmptyState
            hasFilters={hasActiveFilters}
            onClear={clearFilters}
          />
        ) : (
          /* Products Grid/List */
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                : "flex flex-col gap-4"
            }
          >
            {filteredProducts.map((product) => (
              viewMode === "grid" ? (
                <ProductCard key={`${product.vendorId}-${product.id}`} product={product} />
              ) : (
                <ProductListItem key={`${product.vendorId}-${product.id}`} product={product} />
              )
            ))}
          </div>
        )}

        {/* Load More (if paginated) */}
        {hasMore && !loading && filteredProducts.length > 0 && (
          <div className="flex justify-center mt-8">
            <button
              onClick={() => {}}
              disabled={loadingMore}
              className="px-6 py-3 bg-[#55529d] text-white rounded-xl font-medium hover:bg-[#45428d] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loadingMore ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading...
                </>
              ) : (
                "Load More"
              )}
            </button>
          </div>
        )}
      </main>

      {/* FILTER MODAL (Mobile) */}
      {showFilters && (
        <FilterModal
          categories={CATEGORIES}
          selectedCategory={selectedCategory}
          sortBy={sortBy}
          priceRange={priceRange}
          onCategoryChange={handleCategoryChange}
          onSortChange={handleSortChange}
          onPriceChange={setPriceRange}
          onClose={() => setShowFilters(false)}
          onClear={clearFilters}
        />
      )}

      <Footer />
    </div>
  );
}

/* ======================================================
   PRODUCT CARD (Grid View)
====================================================== */

function ProductCard({ product }: { product: Product }) {
  const productLink = product.vendorSlug
    ? `/store/${product.vendorSlug}/product/${product.id}`
    : `/product/${product.id}`;

  return (
    <Link href={productLink}>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer group h-full flex flex-col">
        {/* Image */}
        <div className="aspect-square bg-gray-100 overflow-hidden relative">
          {product.images?.[0] ? (
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-12 h-12 text-gray-300" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col flex-1">
          <h3 className="font-semibold text-gray-900 line-clamp-2 mb-1 group-hover:text-[#55529d] transition-colors">
            {product.name}
          </h3>
          {product.vendor_name && (
            <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
              <Store className="w-3 h-3" />
              {product.vendor_name}
            </p>
          )}
          <div className="mt-auto">
            <p className="text-lg font-bold text-[#55529d]">
              {formatPrice(product.price)}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ======================================================
   PRODUCT LIST ITEM (List View)
====================================================== */

function ProductListItem({ product }: { product: Product }) {
  const productLink = product.vendorSlug
    ? `/store/${product.vendorSlug}/product/${product.id}`
    : `/product/${product.id}`;

  return (
    <Link href={productLink}>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group flex">
        {/* Image */}
        <div className="w-32 h-32 sm:w-40 sm:h-40 bg-gray-100 overflow-hidden relative flex-shrink-0">
          {product.images?.[0] ? (
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              sizes="160px"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-10 h-10 text-gray-300" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col justify-between flex-1 min-w-0">
          <div>
            <h3 className="font-semibold text-gray-900 line-clamp-2 mb-1 group-hover:text-[#55529d] transition-colors">
              {product.name}
            </h3>
            {product.vendor_name && (
              <p className="text-sm text-gray-500 flex items-center gap-1 mb-2">
                <Store className="w-3.5 h-3.5" />
                {product.vendor_name}
              </p>
            )}
            {product.description && (
              <p className="text-sm text-gray-600 line-clamp-2">
                {product.description}
              </p>
            )}
          </div>
          <p className="text-xl font-bold text-[#55529d] mt-2">
            {formatPrice(product.price)}
          </p>
        </div>
      </div>
    </Link>
  );
}

/* ======================================================
   PRODUCT SKELETON
====================================================== */

function ProductSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
      <div className="aspect-square bg-gray-200" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="h-5 bg-gray-200 rounded w-1/3" />
      </div>
    </div>
  );
}

/* ======================================================
   EMPTY STATE
====================================================== */

function EmptyState({
  hasFilters,
  onClear,
}: {
  hasFilters: boolean;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
        <ShoppingBag className="w-10 h-10 text-gray-400" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        {hasFilters ? "No products found" : "No products available"}
      </h2>
      <p className="text-gray-500 mb-6 max-w-md">
        {hasFilters
          ? "Try adjusting your search or filters to find what you're looking for."
          : "Products from our vendors will appear here. Check back soon!"}
      </p>
      {hasFilters && (
        <button
          onClick={onClear}
          className="px-6 py-3 bg-[#55529d] text-white rounded-xl font-medium hover:bg-[#45428d] transition-colors"
        >
          Clear Filters
        </button>
      )}
    </div>
  );
}

/* ======================================================
   FILTER MODAL (Mobile)
====================================================== */

function FilterModal({
  categories,
  selectedCategory,
  sortBy,
  priceRange,
  onCategoryChange,
  onSortChange,
  onPriceChange,
  onClose,
  onClear,
}: {
  categories: string[];
  selectedCategory: string;
  sortBy: SortOption;
  priceRange: [number, number];
  onCategoryChange: (cat: string) => void;
  onSortChange: (sort: SortOption) => void;
  onPriceChange: (range: [number, number]) => void;
  onClose: () => void;
  onClear: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
      <div
        className="absolute inset-0"
        onClick={onClose}
      />
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[85vh] overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Filters</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-8 pb-32">
          {/* Categories */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
              Category
            </h3>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => onCategoryChange(category)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? "bg-[#55529d] text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Sort */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
              Sort By
            </h3>
            <div className="space-y-2">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => onSortChange(option.value)}
                  className={`w-full px-4 py-3 rounded-xl text-left text-sm font-medium transition-colors ${
                    sortBy === option.value
                      ? "bg-[#55529d]/10 text-[#55529d] border-2 border-[#55529d]"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-transparent"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
              Price Range
            </h3>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">Min</label>
                <input
                  type="number"
                  value={priceRange[0]}
                  onChange={(e) =>
                    onPriceChange([Number(e.target.value), priceRange[1]])
                  }
                  className="w-full px-4 py-3 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#55529d]/30"
                  placeholder="$0"
                />
              </div>
              <span className="text-gray-400 mt-5">—</span>
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">Max</label>
                <input
                  type="number"
                  value={priceRange[1]}
                  onChange={(e) =>
                    onPriceChange([priceRange[0], Number(e.target.value)])
                  }
                  className="w-full px-4 py-3 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#55529d]/30"
                  placeholder="$10000"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-3">
          <button
            onClick={onClear}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            Clear All
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-[#55529d] text-white rounded-xl font-medium hover:bg-[#45428d] transition-colors"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}