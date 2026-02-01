"use client";

export const dynamic = "force-dynamic";

import { Suspense, useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/firebase/config";
import { 
  collection, 
  getDocs, 
  collectionGroup 
} from "firebase/firestore";
import {
  Search,
  Store,
  ArrowLeft,
  Package,
  Star,
  MapPin,
  CheckCircle2,
  Sparkles,
  Loader2,
  X,
  AlertCircle,
  RefreshCw,
  TrendingUp
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatLocation } from "@/lib/utils/formatLocation";

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
  tags?: string[];
  logoUrl?: string;
  logo_url?: string;
  cover_image_url?: string;
  rating?: number;
  featured?: boolean;
  verified?: boolean;
  status?: string;
  isNew?: boolean;
  address?: string;
  location?: string | { lat?: number; lng?: number; location_address?: string; address?: string; [key: string]: any };
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  email?: string;
};

type Product = {
  id: string;
  name?: string;
  description?: string;
  price?: number;
  images?: string[];
  active?: boolean;
  vendorId?: string;
  vendorSlug?: string;
  vendor_slug?: string;
  vendor_name?: string;
  tags?: string[];
  sku?: string;
  category?: string;
};

type SearchState = "idle" | "loading" | "success" | "error";

/* ======================================================
   SEARCH UTILITIES
====================================================== */

// Convert any value into searchable text (handles objects like {lat,lng,location_address})
function toSearchText(value: any): string {
  if (value == null) return "";

  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  if (Array.isArray(value)) {
    return value.map(toSearchText).join(" ");
  }

  // Objects (including Firestore maps)
  if (typeof value === "object") {
    const preferred =
      value.location_address ??
      value.address ??
      value.street ??
      value.city ??
      value.state ??
      value.country ??
      value.name ??
      value.title ??
      "";

    if (typeof preferred === "string" && preferred.trim()) return preferred;

    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }

  return "";
}

// Normalize text for better matching (SAFE for non-strings)
function normalizeText(input: any): string {
  const text = toSearchText(input);

  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^\w\s]/g, " ") // Replace special chars with space
    .replace(/\s+/g, " ") // Collapse multiple spaces
    .trim();
}

// Tokenize search query into words (SAFE)
function tokenize(input: any): string[] {
  return normalizeText(input)
    .split(" ")
    .filter((word) => word.length >= 2); // Ignore single chars
}

// Calculate match score (higher = better match) (SAFE)
function calculateMatchScore(searchTokens: string[], targetValue: any): number {
  if (!searchTokens.length) return 0;

  const normalizedTarget = normalizeText(targetValue);
  if (!normalizedTarget) return 0;

  const targetTokens = tokenize(targetValue);

  let score = 0;

  for (const searchToken of searchTokens) {
    // Exact word match (highest priority)
    if (targetTokens.includes(searchToken)) {
      score += 10;
      continue;
    }

    // Word starts with search token
    if (targetTokens.some((t) => t.startsWith(searchToken))) {
      score += 7;
      continue;
    }

    // Word contains search token
    if (normalizedTarget.includes(searchToken)) {
      score += 5;
      continue;
    }
    // Fuzzy match (guarded) — only for longer tokens (prevents "tea" matching everything)
    if (searchToken.length >= 4) {
      for (const targetToken of targetTokens) {
        const similarity = calculateSimilarity(searchToken, targetToken);
        if (similarity >= 0.75) {
          score += Math.floor(similarity * 4);
          break;
        }
      }
    }
  }

  return score;
}

// Simple Levenshtein-based similarity (0-1)
function calculateSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  
  // Quick check: if length difference is too big, skip expensive calculation
  if (longer.length - shorter.length > 3) return 0;
  
  const distance = levenshteinDistance(shorter, longer);
  return (longer.length - distance) / longer.length;
}

// Levenshtein distance calculation
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

function vendorHasDirectSignal(vendor: Vendor, tokens: string[]): boolean {
  const name = normalizeText(vendor.name || vendor.business_name || "");
  const category = normalizeText(vendor.category || (vendor.categories || []).join(" "));
  const tags = normalizeText((vendor.tags || []).join(" "));
  const city = normalizeText(vendor.city || "");
  const address = normalizeText(vendor.address || "");
  const loc = normalizeText(formatLocation(vendor.location as any) || "");

  return tokens.some((t) =>
    name.includes(t) ||
    category.includes(t) ||
    tags.includes(t) ||
    city.includes(t) ||
    address.includes(t) ||
    loc.includes(t)
  );
}

function vendorNameStrongMatch(vendor: Vendor, tokens: string[]): boolean {
  const name = normalizeText(vendor.name || vendor.business_name || "");
  return tokens.some((t) => name.includes(t));
}

// Score a vendor against search tokens (strict)
function scoreVendor(vendor: Vendor, searchTokens: string[]): number {
  // Hard gate: if no direct signal, do not include vendor at all
  if (!vendorHasDirectSignal(vendor, searchTokens)) return 0;

  const fields = [
    { text: vendor.name || vendor.business_name || "", weight: 4 },
    { text: vendor.category || "", weight: 2.5 },
    { text: vendor.categories?.join(" ") || "", weight: 2 },
    { text: vendor.tags?.join(" ") || "", weight: 2 },
    { text: vendor.description || vendor.business_description || "", weight: 1 },
    { text: vendor.city || "", weight: 1 },
    { text: formatLocation(vendor.location as any) || "", weight: 1 },
    { text: vendor.address || "", weight: 0.75 },
  ];

  let totalScore = 0;
  for (const field of fields) {
    totalScore += calculateMatchScore(searchTokens, field.text) * field.weight;
  }

  // Bonus only when vendor name matches the query (prevents boosting unrelated vendors)
  if (vendorNameStrongMatch(vendor, searchTokens)) {
    if (vendor.verified) totalScore += 4;
    if (vendor.featured) totalScore += 5;
  }

  return totalScore;
}

// Score a product against search tokens
function scoreProduct(product: Product, searchTokens: string[]): number {
  const fields = [
    { text: product.name || "", weight: 3 },
    { text: product.description || "", weight: 1 },
    { text: product.vendor_name || "", weight: 1.5 },
    { text: product.tags?.join(" ") || "", weight: 2 },
    { text: product.category || "", weight: 2 },
    { text: product.sku || "", weight: 1 },
  ];
  
  let totalScore = 0;
  for (const field of fields) {
    totalScore += calculateMatchScore(searchTokens, field.text) * field.weight;
  }
  
  return totalScore;
}

/* ======================================================
   POPULAR SEARCHES
====================================================== */

const POPULAR_SEARCHES = [
  "Pizza",
  "Grocery",
  "Restaurant",
  "Coffee",
  "Delivery",
  "Food",
  "Services",
  "Electronics"
];

/* ======================================================
   PAGE WRAPPER (Suspense Required)
====================================================== */

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchLoadingState />}>
      <SearchPageInner />
    </Suspense>
  );
}

/* ======================================================
   LOADING STATE
====================================================== */

function SearchLoadingState() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8 animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="h-12 bg-gray-200 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden">
              <div className="aspect-video bg-gray-200" />
              <div className="p-4 space-y-3">
                <div className="h-5 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ======================================================
   SEARCH LOGIC
====================================================== */

function SearchPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const rawQuery = searchParams.get("q") || "";
  const { formatCurrency: contextFormatPrice, t } = useLanguage();
  
  // Fallback formatPrice in case context isn't ready
  const formatPrice = contextFormatPrice || ((price: number) => `$${price.toFixed(2)}`);
  
  // Normalize query for better matching (memoized to avoid render loops)
  const searchQuery = useMemo(() => rawQuery.trim(), [rawQuery]);
  const searchTokens = useMemo(() => tokenize(searchQuery), [searchQuery]);

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [allVendors, setAllVendors] = useState<Vendor[]>([]); // For suggestions
  const [searchState, setSearchState] = useState<SearchState>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [inputValue, setInputValue] = useState(rawQuery);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Debounce timer ref
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Prevent duplicate searches for the same query (avoids flicker)
  const lastSearchRef = useRef<string>("");

  // Perform search
  const runSearch = useCallback(async () => {
    if (!searchTokens.length) {
      setVendors([]);
      setProducts([]);
      setSearchState("idle");
      lastSearchRef.current = "";
      return;
    }

    // Avoid re-running search for the same query (prevents flicker)
    if (lastSearchRef.current === searchQuery) return;
    lastSearchRef.current = searchQuery;

    setSearchState("loading");
    setErrorMessage("");

    try {
      // 1. Fetch ALL vendors
      const vendorsSnap = await getDocs(collection(db, "vendors"));
      
      const allVendorData = vendorsSnap.docs.map((d) => ({ 
        id: d.id, 
        ...d.data() 
      } as Vendor));
      
      // Store all vendors for suggestions
      setAllVendors(allVendorData.filter((v) => 
        (v.status === "approved" || v.verified === true) &&
        v.status !== "suspended" && 
        v.status !== "rejected"
      ));

      // Build vendor lookup map for product enrichment
      const vendorMap = new Map<string, Vendor>();
      allVendorData.forEach((v) => vendorMap.set(v.id, v));

      // Score vendors (keep scores; vendor visibility will be decided after products are scored)


      const vendorCandidates = allVendorData


        .filter((v) => {


          const isApproved = v.status === "approved" || v.verified === true;


          const isNotSuspended = v.status !== "suspended" && v.status !== "rejected";


          return isApproved && isNotSuspended;


        });



      const vendorScores = vendorCandidates


        .map((v) => ({ vendor: v, score: scoreVendor(v, searchTokens) }))


        .filter(({ score }) => score > 0)


        .sort((a, b) => b.score - a.score);

      // 2. Fetch ALL products
      let productsSnap;
      try {
        productsSnap = await getDocs(collectionGroup(db, "products"));
      } catch (productErr) {
        // If collectionGroup fails (index issue), try fetching per vendor
        console.warn("CollectionGroup failed, fetching per vendor:", productErr);
        productsSnap = await fetchProductsPerVendor(allVendorData);
      }

      // Score and filter products
      const scoredProducts = productsSnap.docs
        .map((d) => {
          const data = d.data();
          const vendorId = data.vendorId || d.ref.parent.parent?.id;
          const vendor = vendorId ? vendorMap.get(vendorId) : null;
          
          // Skip products from non-approved vendors
          if (vendor && vendor.status !== "approved" && !vendor.verified) {
            return null;
          }
          
          return {
            id: d.id,
            ...data,
            vendorId,
            vendorSlug: vendor?.slug || vendorId,
            vendor_name: data.vendor_name || vendor?.name || vendor?.business_name,
          } as Product;
        })
        .filter((p): p is Product => {
          if (!p) return false;
          if (p.active === false) return false;
          return true;
        })
        .map((p) => ({ product: p, score: scoreProduct(p, searchTokens) }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .map(({ product }) => product);

// Decide which vendors to show:
// - If there are matching products, only show vendors that have matching products,
//   unless the vendor itself is a very strong match (e.g., vendor name contains query).
const vendorIdsWithMatchingProducts = new Set<string>(
  scoredProducts.map((p) => p.vendorId).filter(Boolean) as string[]
);

const VENDOR_MIN_SCORE = searchTokens.length <= 1 ? 35 : 25;
const VENDOR_STRONG_SCORE = 70;
const VENDOR_MAX = 12;

const filteredVendors = vendorScores
  .filter(({ vendor, score }) => {
    if (scoredProducts.length > 0) {
      const hasProducts = vendorIdsWithMatchingProducts.has(vendor.id);
      const isStrong = score >= VENDOR_STRONG_SCORE;
      return hasProducts || isStrong;
    }
    return score >= VENDOR_MIN_SCORE;
  })
  .map(({ vendor }) => vendor)
  .slice(0, VENDOR_MAX);

setVendors(filteredVendors);

      setProducts(scoredProducts);
      setSearchState("success");

    } catch (err) {
      console.error("Search error:", err);
      
      // Don't show error page - show graceful degradation
      setSearchState("success"); // Still show "success" UI but with empty results
      setVendors([]);
      setProducts([]);
      setErrorMessage(
        t?.("search.temporaryIssue") || 
        "We're having trouble searching right now. Please try again."
      );
    }
  }, [searchQuery, searchTokens, t]);

  // Fallback: fetch products per vendor if collectionGroup fails
  async function fetchProductsPerVendor(vendors: Vendor[]) {
    const allDocs: any[] = [];
    
    // Only fetch from first 20 vendors to avoid rate limits
    const vendorsToFetch = vendors
      .filter((v) => v.status === "approved" || v.verified)
      .slice(0, 20);
    
    await Promise.all(
      vendorsToFetch.map(async (vendor) => {
        try {
          const snap = await getDocs(collection(db, "vendors", vendor.id, "products"));
          snap.docs.forEach((doc) => {
            allDocs.push({
              ...doc,
              data: () => ({ ...doc.data(), vendorId: vendor.id }),
              ref: doc.ref
            });
          });
        } catch (e) {
          // Silently continue if a vendor's products can't be fetched
        }
      })
    );
    
    return { docs: allDocs };
  }

  // Run search on query change (avoid effect loop)
  useEffect(() => {
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // Handle search input with debounce
  const handleSearchInput = useCallback((value: string) => {
    setInputValue(value);
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      const next = value.trim();
      const current = rawQuery.trim();

      // Prevent pushing the same query repeatedly (can cause UI flicker)
      if (next === current) return;

      if (next) {
        router.push(`/search?q=${encodeURIComponent(next)}`, { scroll: false });
      } else {
        router.push("/search", { scroll: false });
      }
    }, 400);
  }, [router]);

  // Handle search submit
  const handleSearchSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (inputValue.trim()) {
      router.push(`/search?q=${encodeURIComponent(inputValue.trim())}`);
    }
  };

  // Handle popular search click
  const handlePopularSearch = (term: string) => {
    setInputValue(term);
    router.push(`/search?q=${encodeURIComponent(term)}`);
  };

  // Retry search
  const handleRetry = () => {
    setErrorMessage("");
    runSearch();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-30 shadow-sm safe-area-top">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link 
            href="/" 
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>

          <form onSubmit={handleSearchSubmit} className="flex-1 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
            <input
              ref={searchInputRef}
              type="text"
              value={inputValue}
              onChange={(e) => handleSearchInput(e.target.value)}
              placeholder={t?.("hero.searchPlaceholder") || "Search for food, services, or vendors..."}
              className="w-full pl-12 pr-10 py-3 bg-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500/20 outline-none transition-all text-base"
              autoFocus
            />
            {inputValue && (
              <button
                type="button"
                onClick={() => {
                  setInputValue("");
                  router.push("/search");
                  searchInputRef.current?.focus();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 bg-gray-200/50 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-6xl mx-auto px-4 py-6 min-h-[60vh]">
        {/* Error Banner (non-blocking) */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-amber-800 text-sm">{errorMessage}</p>
            </div>
            <button
              onClick={handleRetry}
              className="flex items-center gap-1.5 text-amber-700 hover:text-amber-900 text-sm font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              {t?.("common.retry") || "Retry"}
            </button>
          </div>
        )}

        {!searchQuery ? (
          <EmptySearch 
            onPopularSearch={handlePopularSearch}
            t={t}
          />
        ) : searchState === "loading" ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-purple-600 animate-spin mb-4" />
            <p className="text-gray-500 font-medium">
              {t?.("search.searching") || "Searching marketplace..."}
            </p>
          </div>
        ) : (
          <Results 
            vendors={vendors} 
            products={products} 
            query={rawQuery} 
            formatPrice={formatPrice}
            allVendors={allVendors}
            onPopularSearch={handlePopularSearch}
            t={t}
          />
        )}
      </div>
    </div>
  );
}

/* ======================================================
   UI SECTIONS
====================================================== */

function EmptySearch({ 
  onPopularSearch,
  t 
}: { 
  onPopularSearch: (term: string) => void;
  t?: (key: string) => string;
}) {
  return (
    <div className="text-center py-12">
      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <Search className="w-10 h-10 text-gray-400" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        {t?.("search.typeToSearch") || "Type to search..."}
      </h2>
      <p className="text-gray-500 mb-8">
        {t?.("search.discoverProducts") || "Discover products, stores, and services"}
      </p>
      
      {/* Popular Searches */}
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-2 justify-center mb-4">
          <TrendingUp className="w-4 h-4 text-purple-500" />
          <span className="text-sm font-medium text-gray-700">
            {t?.("search.popularSearches") || "Popular Searches"}
          </span>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {POPULAR_SEARCHES.map((term) => (
            <button
              key={term}
              onClick={() => onPopularSearch(term)}
              className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700 transition-colors"
            >
              {term}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Results({
  vendors,
  products,
  query,
  formatPrice,
  allVendors,
  onPopularSearch,
  t,
}: {
  vendors: Vendor[];
  products: Product[];
  query: string;
  formatPrice: (price: number) => string;
  allVendors: Vendor[];
  onPopularSearch: (term: string) => void;
  t?: (key: string) => string;
}) {
  const totalResults = vendors.length + products.length;

  if (totalResults === 0) {
    return (
      <NoResults 
        query={query} 
        allVendors={allVendors}
        onPopularSearch={onPopularSearch}
        t={t}
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Search Results Header */}
{/* Search Results Header */}
<div>
  <h1 className="text-xl font-bold text-gray-900">
    Showing {totalResults} result{totalResults !== 1 ? "s" : ""} for &quot;{query}&quot;
  </h1>
</div>


      {/* Vendors Section */}
      {vendors.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Store className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              {t?.("search.stores") || "Stores"} ({vendors.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {vendors.map((vendor) => (
              <VendorCard key={vendor.id} vendor={vendor} />
            ))}
          </div>
        </section>
      )}

      {/* Products Section */}
      {products.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              {t?.("search.products") || "Products"} ({products.length})
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} formatPrice={formatPrice} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function NoResults({
  query,
  allVendors,
  onPopularSearch,
  t,
}: {
  query: string;
  allVendors: Vendor[];
  onPopularSearch: (term: string) => void;
  t?: (key: string) => string;
}) {
  // Generate suggestions based on query
  const suggestions = generateSuggestions(query, allVendors);

  return (
    <div className="py-12">
      <div className="text-center mb-10">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Search className="w-10 h-10 text-gray-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {t?.("search.noResults") || "No results found"}
        </h2>
        <p className="text-gray-500 max-w-md mx-auto">
          {t?.("search.noResultsMessage") || `We couldn't find anything matching "${query}". Try different keywords or browse our suggestions below.`}
        </p>
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="mb-10">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
            {t?.("search.didYouMean") || "Did you mean?"}
          </h3>
          <div className="flex flex-wrap justify-center gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => onPopularSearch(suggestion)}
                className="px-4 py-2 bg-purple-50 border border-purple-200 rounded-full text-sm text-purple-700 hover:bg-purple-100 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Popular Searches */}
      <div className="text-center">
        <div className="flex items-center gap-2 justify-center mb-4">
          <TrendingUp className="w-4 h-4 text-purple-500" />
          <span className="text-sm font-medium text-gray-700">
            {t?.("search.tryPopular") || "Try popular searches"}
          </span>
        </div>
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {POPULAR_SEARCHES.map((term) => (
            <button
              key={term}
              onClick={() => onPopularSearch(term)}
              className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700 transition-colors"
            >
              {term}
            </button>
          ))}
        </div>

        {/* Browse All Link */}
        <Link
          href="/products"
          className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-full font-semibold hover:bg-purple-700 transition-colors"
        >
          <Package className="w-5 h-5" />
          {t?.("search.browseAll") || "Browse All Products"}
        </Link>
      </div>

      {/* Show some featured vendors */}
      {allVendors.length > 0 && (
        <div className="mt-12">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t?.("search.featuredStores") || "Featured Stores"}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allVendors
              .filter((v) => v.featured || v.verified)
              .slice(0, 3)
              .map((vendor) => (
                <VendorCard key={vendor.id} vendor={vendor} />
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Generate search suggestions based on partial matches
function generateSuggestions(query: string, vendors: Vendor[]): string[] {
  const queryTokens = tokenize(query);
  if (!queryTokens.length) return [];

  const suggestions = new Set<string>();
  
  // Check vendor names/categories for similar words
  for (const vendor of vendors) {
    const name = vendor.name || vendor.business_name || "";
    const category = vendor.category || "";
    const categories = vendor.categories?.join(" ") || "";
    
    const allText = `${name} ${category} ${categories}`;
    const tokens = tokenize(allText);
    
    for (const queryToken of queryTokens) {
      for (const token of tokens) {
        // Only suggest if there's some similarity but not exact
        if (token !== queryToken && token.length > 2) {
          const similarity = calculateSimilarity(queryToken, token);
          if (similarity >= 0.5 && similarity < 1) {
            // Capitalize first letter
            suggestions.add(token.charAt(0).toUpperCase() + token.slice(1));
          }
        }
      }
    }
  }
  
  return Array.from(suggestions).slice(0, 5);
}

/* ======================================================
   CARD COMPONENTS
====================================================== */

function VendorCard({ vendor }: { vendor: Vendor }) {
  const logo = vendor.logoUrl || vendor.logo_url;
  const name = vendor.name || vendor.business_name || "Store";
  const slug = vendor.slug || vendor.id;
  const category = vendor.category || vendor.categories?.[0];

  return (
    <Link
      href={`/store/${slug}`}
      className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:border-purple-100 transition-all duration-300"
    >
      {/* Cover/Banner */}
      <div className="h-24 bg-gradient-to-br from-purple-100 to-purple-50 relative">
        {vendor.cover_image_url && (
          <Image
            src={vendor.cover_image_url}
            alt=""
            fill
            className="object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}
        {vendor.featured && (
          <div className="absolute top-2 right-2 bg-amber-400 text-amber-900 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Featured
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 -mt-8 relative">
        {/* Logo */}
        <div className="w-16 h-16 rounded-xl bg-white border-2 border-white shadow-md overflow-hidden mb-3">
          {logo ? (
            <Image 
              src={logo} 
              alt={name} 
              width={64} 
              height={64} 
              className="object-cover w-full h-full"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).parentElement!.innerHTML = `
                  <div class="w-full h-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                    <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                    </svg>
                  </div>
                `;
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
              <Store className="w-6 h-6 text-white" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900 truncate group-hover:text-purple-600 transition-colors">
              {name}
            </h3>
            {category && (
              <p className="text-sm text-gray-500 truncate">{category}</p>
            )}
          </div>
          {vendor.verified && (
            <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0" />
          )}
        </div>

        {/* Rating & Location */}
        <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
          {vendor.rating && vendor.rating > 0 && (
            <span className="flex items-center gap-1">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              {vendor.rating.toFixed(1)}
            </span>
          )}
          {(vendor.city || vendor.location) && (
            <span className="flex items-center gap-1 truncate">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              {vendor.city || formatLocation(vendor.location as any)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function ProductCard({ product, formatPrice }: { product: Product; formatPrice: (price: number) => string }) {
  const image = product.images?.[0];
  const slug = product.vendorSlug || product.vendor_slug || product.vendorId;

  return (
    <Link
      href={`/store/${slug}/product/${product.id}`}
      className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:border-purple-100 transition-all duration-300"
    >
      {/* Image */}
      <div className="aspect-square bg-gray-100 relative overflow-hidden">
        {image ? (
          <Image
            src={image}
            alt={product.name || "Product"}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-12 h-12 text-gray-300" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="font-medium text-gray-900 text-sm line-clamp-2 group-hover:text-purple-600 transition-colors">
          {product.name || "Unnamed Product"}
        </h3>
        {product.vendor_name && (
          <p className="text-xs text-gray-500 mt-1 truncate">{product.vendor_name}</p>
        )}
        <p className="text-purple-600 font-bold mt-2">
          {formatPrice(product.price || 0)}
        </p>
      </div>
    </Link>
  );
}