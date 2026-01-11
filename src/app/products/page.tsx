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
  DocumentData,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { formatPrice } from "@/lib/utils/currency";
import Footer from "@/components/layout/Footer";
import { VENDOR_CATEGORIES, vendorMatchesCategory } from "@/lib/config/categories";
import {
  Search,
  Package,
  X,
  ChevronDown,
  Grid3X3,
  LayoutList,
  ArrowLeft,
  SlidersHorizontal,
  Store,
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
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-gray-200 rounded-xl animate-pulse" />
            <div className="flex-1">
              <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mt-1" />
            </div>
          </div>
          <div className="h-12 bg-gray-200 rounded-xl animate-pulse" />
        </div>
      </header>
      <main className="flex-1 max-w-7xl mx-auto px-4 py-6 w-full">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductSkeleton key={i} />
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

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest First" },
  { value: "price-low", label: "Price: Low to High" },
  { value: "price-high", label: "Price: High to Low" },
  { value: "name-az", label: "Name: A-Z" },
  { value: "name-za", label: "Name: Z-A" },
];

const CATEGORIES = ["All", ...VENDOR_CATEGORIES];

/* ======================================================
   MAIN PAGE
====================================================== */

function ProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [vendors, setVendors] = useState<Map<string, Vendor>>(new Map());
  const [loading, setLoading] = useState(true);

  // Filters & UI State
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [activeSearch, setActiveSearch] = useState(searchParams.get("q") || "");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "All");
  const [sortBy, setSortBy] = useState<SortOption>((searchParams.get("sort") as SortOption) || "newest");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);

  /* ---------------- FETCH VENDORS (FIXED) ---------------- */
  const fetchVendors = useCallback(async () => {
    const vendorMap = new Map<string, Vendor>();

    try {
      // Run queries in parallel for speed
      const [approvedSnap, verifiedSnap] = await Promise.all([
        getDocs(query(collection(db, "vendors"), where("status", "==", "approved"))),
        getDocs(query(collection(db, "vendors"), where("verified", "==", true))),
      ]);

      // Helper to process docs
      const processDoc = (doc: any) => {
        const data = doc.data();
        // Prevent adding suspended/deleted vendors
        if (data.status === "suspended" || data.status === "rejected") return;
        
        // Add if not already present (approved takes precedence usually, but map handles duplicates by key)
        if (!vendorMap.has(doc.id)) {
          vendorMap.set(doc.id, { id: doc.id, ...data } as Vendor);
        }
      };

      approvedSnap.docs.forEach(processDoc);
      verifiedSnap.docs.forEach(processDoc);
      
    } catch (err) {
      console.error("Error fetching vendors:", err);
    }

    return vendorMap;
  }, []);

  /* ---------------- FETCH PRODUCTS ---------------- */
  const fetchProducts = useCallback(async (vendorMap: Map<string, Vendor>) => {
    setLoading(true);
    try {
      const allProducts: Product[] = [];
      const vendorIds = Array.from(vendorMap.keys());

      // Fetch products from each vendor in parallel
      const productPromises = vendorIds.map(async (vendorId) => {
        const vendor = vendorMap.get(vendorId);
        if (!vendor) return [];

        try {
          const productsSnap = await getDocs(
            collection(db, "vendors", vendorId, "products")
          );

          return productsSnap.docs
            .map((d) => {
              const data = d.data();
              // Only exclude if explicitly inactive
              if (data.active === false) return null;

              return {
                id: d.id,
                ...data,
                vendorId,
                vendorSlug: vendor.slug || vendorId,
                vendor_name: data.vendor_name || vendor.name || vendor.business_name || "Unknown Vendor",
              } as Product;
            })
            .filter((p): p is Product => p !== null);
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
    } catch (err) {
      console.error("Error fetching products:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ---------------- INITIAL LOAD ---------------- */
  useEffect(() => {
    const load = async () => {
      const vendorMap = await fetchVendors();
      setVendors(vendorMap);
      await fetchProducts(vendorMap);
    };
    load();
  }, [fetchVendors, fetchProducts]);

  /* ---------------- FILTERING & SORTING ---------------- */
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Search
    if (activeSearch.trim()) {
      const q = activeSearch.toLowerCase();
      result = result.filter(
        (p) =>
          (p.name || "").toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q) ||
          (p.vendor_name || "").toLowerCase().includes(q)
      );
    }

    // Category
    if (selectedCategory !== "All") {
      result = result.filter((p) => {
        const vendor = vendors.get(p.vendorId);
        // Check vendor categories first, then product category if available
        return vendorMatchesCategory(
          vendor?.category,
          vendor?.categories,
          selectedCategory
        );
      });
    }

    // Price
    result = result.filter(
      (p) => (p.price || 0) >= priceRange[0] && (p.price || 0) <= priceRange[1]
    );

    // Sort
    switch (sortBy) {
      case "price-low":
        result.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case "price-high":
        result.sort((a, b) => (b.price || 0) - (a.price || 0));
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

  /* ---------------- URL SYNC ---------------- */
  const updateURL = (params: Record<string, string | null>) => {
    const current = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([key, value]) => {
      if (value === null) current.delete(key);
      else current.set(key, value);
    });
    const newURL = current.toString() ? `/products?${current.toString()}` : "/products";
    router.push(newURL, { scroll: false });
  };

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

  const clearFilters = () => {
    setSearchQuery("");
    setActiveSearch("");
    setSelectedCategory("All");
    setSortBy("newest");
    setPriceRange([0, 10000]);
    router.push("/products");
  };

  const hasActiveFilters = !!activeSearch || selectedCategory !== "All" || sortBy !== "newest";

  return (
    // Flex-col + min-h-screen ensures footer pushes to bottom
    <div className="min-h-screen flex flex-col bg-gray-50 pb-safe">
      <style jsx global>{`
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up { animation: slide-up 0.3s ease-out; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* STICKY HEADER */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm transition-all duration-200">
        <div className="max-w-7xl mx-auto px-4 py-3 lg:py-4">
          <div className="flex items-center gap-3 lg:gap-4 mb-3">
            <Link
              href="/"
              className="p-2 -ml-2 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </Link>
            
            <div className="flex-1 min-w-0">
              <h1 className="text-lg lg:text-xl font-bold text-gray-900 truncate">
                All Products
              </h1>
              <p className="text-xs lg:text-sm text-gray-500">
                {loading ? "Loading..." : `${filteredProducts.length} items`}
              </p>
            </div>

            {/* Desktop View Toggle */}
            <div className="hidden md:flex items-center bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-md transition-all ${
                  viewMode === "grid" ? "bg-white text-purple-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-md transition-all ${
                  viewMode === "list" ? "bg-white text-purple-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <LayoutList className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            {/* text-base prevents iOS zoom */}
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-10 py-3 bg-gray-100 border-transparent focus:bg-white border focus:border-purple-500/50 rounded-xl text-base outline-none transition-all placeholder:text-gray-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setActiveSearch("");
                  updateURL({ q: null });
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 bg-gray-200/50 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>

          {/* Filters Row */}
          <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
            <button
              onClick={() => setShowFilters(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${
                hasActiveFilters
                  ? "bg-purple-50 text-purple-700 border-purple-100"
                  : "bg-white text-gray-700 border-gray-200"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {hasActiveFilters && (
                <span className="ml-1 w-5 h-5 bg-purple-600 text-white rounded-full text-[10px] flex items-center justify-center font-bold">
                  {(activeSearch ? 1 : 0) + (selectedCategory !== "All" ? 1 : 0)}
                </span>
              )}
            </button>

            {CATEGORIES.slice(0, 5).map((category) => (
              <button
                key={category}
                onClick={() => handleCategoryChange(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${
                  selectedCategory === category
                    ? "bg-purple-600 text-white border-purple-600"
                    : "bg-white text-gray-700 border-gray-200 hover:border-purple-200"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* CONTENT AREA (Flex-1 fills remaining space) */}
      <main className="flex-1 max-w-7xl mx-auto px-4 py-6 w-full">
        
        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="text-sm text-gray-500 font-medium">Active:</span>
            {activeSearch && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm border border-purple-100">
                "{activeSearch}"
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setActiveSearch("");
                    updateURL({ q: null });
                  }}
                  className="ml-1 hover:bg-purple-100 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedCategory !== "All" && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm border border-purple-100">
                {selectedCategory}
                <button
                  onClick={() => handleCategoryChange("All")}
                  className="ml-1 hover:bg-purple-100 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              onClick={clearFilters}
              className="text-sm text-gray-500 hover:text-purple-600 underline decoration-purple-200 underline-offset-2 ml-2"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Content States */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <ProductSkeleton key={i} />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <EmptyState hasFilters={hasActiveFilters} onClear={clearFilters} />
        ) : (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                : "flex flex-col gap-4"
            }
          >
            {filteredProducts.map((product) =>
              viewMode === "grid" ? (
                <ProductCard key={`${product.vendorId}-${product.id}`} product={product} />
              ) : (
                <ProductListItem key={`${product.vendorId}-${product.id}`} product={product} />
              )
            )}
          </div>
        )}
      </main>

      {/* FILTER MODAL */}
      {showFilters && (
        <FilterModal
          categories={CATEGORIES}
          selectedCategory={selectedCategory}
          sortBy={sortBy}
          priceRange={priceRange}
          onCategoryChange={handleCategoryChange}
          onSortChange={(val) => setSortBy(val)}
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
   COMPONENTS
====================================================== */

function ProductCard({ product }: { product: Product }) {
  const productLink = product.vendorSlug
    ? `/store/${product.vendorSlug}/product/${product.id}`
    : `/product/${product.id}`;

  return (
    <Link href={productLink} className="block h-full active:scale-[0.98] transition-transform duration-100">
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300 h-full flex flex-col group">
        <div className="aspect-square bg-gray-50 overflow-hidden relative">
          {product.images?.[0] ? (
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <Package className="w-12 h-12" />
            </div>
          )}
        </div>
        <div className="p-3 lg:p-4 flex flex-col flex-1">
          <h3 className="font-semibold text-gray-900 text-sm lg:text-base line-clamp-2 mb-1 group-hover:text-purple-600 transition-colors">
            {product.name}
          </h3>
          {product.vendor_name && (
            <div className="flex items-center gap-1 mb-2 text-xs text-gray-500">
              <Store className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{product.vendor_name}</span>
            </div>
          )}
          <div className="mt-auto pt-2">
            <p className="text-base lg:text-lg font-bold text-purple-700">
              {formatPrice(product.price)}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}

function ProductListItem({ product }: { product: Product }) {
  const productLink = product.vendorSlug
    ? `/store/${product.vendorSlug}/product/${product.id}`
    : `/product/${product.id}`;

  return (
    <Link href={productLink} className="block active:scale-[0.99] transition-transform">
      <div className="bg-white rounded-2xl border border-gray-100 p-3 flex gap-4 shadow-sm hover:shadow-md transition-all group">
        <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gray-100 rounded-xl overflow-hidden relative flex-shrink-0">
          {product.images?.[0] ? (
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <Package className="w-8 h-8" />
            </div>
          )}
        </div>
        <div className="flex flex-col justify-between flex-1 min-w-0 py-1">
          <div>
            <h3 className="font-semibold text-gray-900 line-clamp-2 mb-1 group-hover:text-purple-600">
              {product.name}
            </h3>
            {product.vendor_name && (
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <Store className="w-3.5 h-3.5" />
                {product.vendor_name}
              </p>
            )}
            {product.description && (
              <p className="text-sm text-gray-500 line-clamp-2 mt-1 hidden sm:block">
                {product.description}
              </p>
            )}
          </div>
          <p className="text-lg font-bold text-purple-700">
            {formatPrice(product.price)}
          </p>
        </div>
      </div>
    </Link>
  );
}

function ProductSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="aspect-square bg-gray-100 animate-pulse" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-100 rounded w-3/4 animate-pulse" />
        <div className="h-3 bg-gray-100 rounded w-1/2 animate-pulse" />
        <div className="h-5 bg-gray-100 rounded w-1/3 animate-pulse pt-2" />
      </div>
    </div>
  );
}

function EmptyState({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
        <ShoppingBag className="w-10 h-10 text-gray-400" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">
        {hasFilters ? "No matches found" : "No products yet"}
      </h2>
      <p className="text-gray-500 mb-8 max-w-sm">
        {hasFilters
          ? "We couldn't find any products matching your filters. Try checking a different category."
          : "Check back later for new arrivals from our vendors."}
      </p>
      {hasFilters && (
        <button
          onClick={onClear}
          className="px-8 py-3 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 active:scale-95 transition-all shadow-lg shadow-purple-500/20"
        >
          Clear Filters
        </button>
      )}
    </div>
  );
}

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
}: any) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[85vh] flex flex-col animate-slide-up shadow-2xl">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Filters</h2>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Categories */}
          <section>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">
              Category
            </h3>
            <div className="flex flex-wrap gap-2">
              {categories.map((category: string) => (
                <button
                  key={category}
                  onClick={() => onCategoryChange(category)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    selectedCategory === category
                      ? "bg-purple-600 text-white shadow-lg shadow-purple-500/30"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </section>

          {/* Sort Options */}
          <section>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">
              Sort By
            </h3>
            <div className="space-y-2">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => onSortChange(option.value)}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${
                    sortBy === option.value
                      ? "bg-purple-50 text-purple-700 border-2 border-purple-600"
                      : "bg-gray-50 text-gray-700 border-2 border-transparent hover:bg-gray-100"
                  }`}
                >
                  {option.label}
                  {sortBy === option.value && <div className="w-2.5 h-2.5 bg-purple-600 rounded-full" />}
                </button>
              ))}
            </div>
          </section>

          {/* Price Range */}
          <section>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">
              Price Range
            </h3>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Min Price</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
                  <input
                    type="number"
                    value={priceRange[0]}
                    onChange={(e) => onPriceChange([Number(e.target.value), priceRange[1]])}
                    className="w-full pl-8 pr-4 py-3 bg-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-500/20 outline-none"
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="flex-1">
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Max Price</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
                  <input
                    type="number"
                    value={priceRange[1]}
                    onChange={(e) => onPriceChange([priceRange[0], Number(e.target.value)])}
                    className="w-full pl-8 pr-4 py-3 bg-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-500/20 outline-none"
                    placeholder="10000"
                  />
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-3 pb-safe">
          <button
            onClick={onClear}
            className="flex-1 px-4 py-3.5 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
          >
            Reset
          </button>
          <button
            onClick={onClose}
            className="flex-[2] px-4 py-3.5 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 active:scale-95 transition-all shadow-lg shadow-purple-500/20"
          >
            Show Results
          </button>
        </div>
      </div>
    </div>
  );
}