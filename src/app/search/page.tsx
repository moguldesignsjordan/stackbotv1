"use client";

export const dynamic = "force-dynamic";

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { collection, collectionGroup, getDocs } from "firebase/firestore";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  MapPin,
  Package,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  Store,
  TrendingUp,
  X,
} from "lucide-react";

import { db } from "@/lib/firebase/config";
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
  address?: string;
  city?: string;
  location?: any; // can be string OR object {lat,lng,location_address}
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

type SearchState = "idle" | "loading" | "success";

/* ======================================================
   SEARCH SETTINGS
====================================================== */

const POPULAR_SEARCHES = ["Tea", "Coffee", "Pizza", "Burger", "Grocery", "Restaurant", "Taxi", "Electronics"];

// Vendor relevance thresholds
const VENDOR_TOP_LIMIT = 12;
const PRODUCT_TOP_LIMIT = 24;

const VENDOR_MIN_SCORE_SHORT = 45; // for 1 token searches like "tea"
const VENDOR_MIN_SCORE_LONG = 28;  // for 2+ tokens
const VENDOR_STRONG_SCORE = 80;    // allow vendor even if no matching products (name/category strong)

/* ======================================================
   SEARCH UTILITIES (SAFE)
====================================================== */

function toSearchText(value: any): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  if (Array.isArray(value)) return value.map(toSearchText).join(" ");

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

function normalizeText(input: any): string {
  const text = toSearchText(input);
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(input: any): string[] {
  return normalizeText(input)
    .split(" ")
    .filter(Boolean)
    .filter((w) => w.length >= 2);
}

// Levenshtein distance
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) matrix[i][j] = matrix[i - 1][j - 1];
      else matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    }
  }
  return matrix[b.length][a.length];
}

function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;

  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  if (longer.length - shorter.length > 3) return 0;

  const dist = levenshteinDistance(shorter, longer);
  return (longer.length - dist) / longer.length;
}

function calculateMatchScore(searchTokens: string[], targetValue: any): number {
  if (!searchTokens.length) return 0;

  const target = normalizeText(targetValue);
  if (!target) return 0;

  const targetTokens = tokenize(targetValue);
  let score = 0;

  for (const token of searchTokens) {
    // Exact token match
    if (targetTokens.includes(token)) {
      score += 12;
      continue;
    }

    // Prefix match
    if (targetTokens.some((t) => t.startsWith(token))) {
      score += 9;
      continue;
    }

    // Substring match
    if (target.includes(token)) {
      score += 6;
      continue;
    }

    // Fuzzy matching ONLY for longer tokens (prevents "tea" matching everything)
    if (token.length >= 4) {
      for (const tt of targetTokens) {
        const sim = similarity(token, tt);
        if (sim >= 0.78) {
          score += Math.floor(sim * 5);
          break;
        }
      }
    }
  }

  return score;
}

function vendorHasDirectSignal(v: Vendor, tokens: string[]) {
  const name = normalizeText(v.name || v.business_name || "");
  const category = normalizeText(v.category || (v.categories || []).join(" "));
  const tags = normalizeText((v.tags || []).join(" "));
  const city = normalizeText(v.city || "");
  const address = normalizeText(v.address || "");
  const loc = normalizeText(formatLocation(v.location));

  return tokens.some((t) => name.includes(t) || category.includes(t) || tags.includes(t) || city.includes(t) || address.includes(t) || loc.includes(t));
}

function vendorNameStrongMatch(v: Vendor, tokens: string[]) {
  const name = normalizeText(v.name || v.business_name || "");
  return tokens.some((t) => name.includes(t));
}

function scoreVendor(v: Vendor, tokens: string[]): number {
  // HARD GATE: no direct signal = do not show vendor
  if (!vendorHasDirectSignal(v, tokens)) return 0;

  const fields = [
    { text: v.name || v.business_name || "", weight: 4.5 },
    { text: v.category || "", weight: 2.7 },
    { text: (v.categories || []).join(" "), weight: 2.2 },
    { text: (v.tags || []).join(" "), weight: 2.2 },
    { text: v.description || v.business_description || "", weight: 1.0 },
    { text: v.city || "", weight: 1.1 },
    { text: formatLocation(v.location), weight: 1.0 },
    { text: v.address || "", weight: 0.8 },
  ];

  let total = 0;
  for (const f of fields) total += calculateMatchScore(tokens, f.text) * f.weight;

  // Bonuses ONLY if vendor name strongly matches query (prevents boosting random vendors)
  if (vendorNameStrongMatch(v, tokens)) {
    if (v.verified) total += 6;
    if (v.featured) total += 7;
  }

  return total;
}

function scoreProduct(p: Product, tokens: string[]): number {
  const fields = [
    { text: p.name || "", weight: 4 },
    { text: p.category || "", weight: 2.2 },
    { text: (p.tags || []).join(" "), weight: 2.0 },
    { text: p.vendor_name || "", weight: 1.4 },
    { text: p.description || "", weight: 1.0 },
    { text: p.sku || "", weight: 0.8 },
  ];

  let total = 0;
  for (const f of fields) total += calculateMatchScore(tokens, f.text) * f.weight;
  return total;
}

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
   MAIN PAGE
====================================================== */

function SearchPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawQuery = searchParams.get("q") || "";

  const { formatCurrency: contextFormatPrice } = useLanguage();
  const formatPrice = contextFormatPrice || ((price: number) => `$${Number(price || 0).toFixed(2)}`);

  const searchQuery = useMemo(() => rawQuery.trim(), [rawQuery]);
  const searchTokens = useMemo(() => tokenize(searchQuery), [searchQuery]);

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [allVendors, setAllVendors] = useState<Vendor[]>([]);
  const [searchState, setSearchState] = useState<SearchState>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [inputValue, setInputValue] = useState(rawQuery);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastSearchRef = useRef<string>("");

  // Keep input synced when URL changes
  useEffect(() => {
    setInputValue(rawQuery);
  }, [rawQuery]);

  // Fallback: fetch per vendor if collectionGroup fails
  async function fetchProductsPerVendor(vs: Vendor[]) {
    const allDocs: any[] = [];
    const vendorsToFetch = vs.slice(0, 20);

    await Promise.all(
      vendorsToFetch.map(async (v) => {
        try {
          const snap = await getDocs(collection(db, "vendors", v.id, "products"));
          snap.docs.forEach((doc) => {
            allDocs.push({
              id: doc.id,
              data: () => ({ ...doc.data(), vendorId: v.id }),
              ref: doc.ref,
            });
          });
        } catch {
          // ignore
        }
      })
    );

    return { docs: allDocs };
  }

  const runSearch = useCallback(async () => {
    // No query -> reset
    if (!searchTokens.length) {
      lastSearchRef.current = "";
      setVendors([]);
      setProducts([]);
      setAllVendors([]);
      setSearchState("idle");
      setErrorMessage("");
      return;
    }

    // Prevent re-running for same query (stops flicker)
    if (lastSearchRef.current === searchQuery) return;
    lastSearchRef.current = searchQuery;

    setSearchState("loading");
    setErrorMessage("");

    try {
      // 1) Vendors
      const vendorsSnap = await getDocs(collection(db, "vendors"));
      const allVendorData = vendorsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Vendor[];

      const approvedVendors = allVendorData.filter((v) => {
        const isApproved = v.status === "approved" || v.verified === true;
        const notSuspended = v.status !== "suspended" && v.status !== "rejected";
        return isApproved && notSuspended;
      });

      setAllVendors(approvedVendors);

      // Vendor lookup for product enrichment
      const vendorMap = new Map<string, Vendor>();
      approvedVendors.forEach((v) => vendorMap.set(v.id, v));

      // 2) Products
      let productsSnap: any;
      try {
        productsSnap = await getDocs(collectionGroup(db, "products"));
      } catch (e) {
        productsSnap = await fetchProductsPerVendor(approvedVendors);
      }

      const scoredProducts = productsSnap.docs
        .map((d: any) => {
          const data = d.data();
          const vendorId = data.vendorId || d.ref?.parent?.parent?.id;
          const vendor = vendorId ? vendorMap.get(vendorId) : undefined;

          // Only products from approved vendors
          if (!vendor) return null;

          return {
            id: d.id,
            ...data,
            vendorId,
            vendorSlug: vendor.slug || vendorId,
            vendor_name: data.vendor_name || vendor.name || vendor.business_name,
          } as Product;
        })
        .filter((p: any): p is Product => !!p && p.active !== false)
        .map((p: Product) => ({ product: p, score: scoreProduct(p, searchTokens) }))
        .filter(({ score }: { score: number }) => score > 0)
        .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
        .slice(0, PRODUCT_TOP_LIMIT)
        .map(({ product }: { product: Product }) => product);

      setProducts(scoredProducts);

      // Vendor IDs that actually have matching products
      const vendorIdsWithMatchingProducts = new Set(
        scoredProducts.map((p: Product) => p.vendorId).filter(Boolean) as string[]
      );

      // 3) Vendors relevance
      const minVendorScore = searchTokens.length <= 1 ? VENDOR_MIN_SCORE_SHORT : VENDOR_MIN_SCORE_LONG;

      const scoredVendors = approvedVendors
        .map((v) => ({ vendor: v, score: scoreVendor(v, searchTokens) }))
        .filter(({ vendor, score }) => {
          if (score <= 0) return false;

          // If products matched, restrict vendors to those product vendors
          // OR allow only very strong vendor matches (e.g. vendor name contains query)
          if (scoredProducts.length > 0) {
            const hasMatchingProducts = vendorIdsWithMatchingProducts.has(vendor.id);
            const isStrong = score >= VENDOR_STRONG_SCORE;
            return hasMatchingProducts || isStrong;
          }

          // If no products matched, use a score threshold
          return score >= minVendorScore;
        })
        .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
        .slice(0, VENDOR_TOP_LIMIT)
        .map(({ vendor }) => vendor);

      setVendors(scoredVendors);

      setSearchState("success");
    } catch (err) {
      console.error("Search error:", err);
      setVendors([]);
      setProducts([]);
      setSearchState("success");
      setErrorMessage("We're having trouble searching right now. Please try again.");
    }
  }, [searchQuery, searchTokens]);

  // Run search ONLY when query changes (prevents loop)
  useEffect(() => {
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const handleSearchInput = useCallback(
    (value: string) => {
      setInputValue(value);

      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(() => {
        const next = value.trim();
        const current = rawQuery.trim();

        // prevent pushing the same query repeatedly (prevents flicker)
        if (next === current) return;

        if (next) router.push(`/search?q=${encodeURIComponent(next)}`, { scroll: false });
        else router.push("/search", { scroll: false });
      }, 350);
    },
    [router, rawQuery]
  );

  const handleSearchSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const next = inputValue.trim();
    if (!next) {
      router.push("/search");
      return;
    }
    router.push(`/search?q=${encodeURIComponent(next)}`);
  };

  const handlePopularSearch = (term: string) => {
    setInputValue(term);
    router.push(`/search?q=${encodeURIComponent(term)}`);
  };

  const handleRetry = () => {
    lastSearchRef.current = "";
    runSearch();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-30 shadow-sm safe-area-top">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="p-2 hover:bg-gray-100 rounded-xl transition-colors flex-shrink-0">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>

          <form onSubmit={handleSearchSubmit} className="flex-1 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
            <input
              ref={searchInputRef}
              type="text"
              value={inputValue}
              onChange={(e) => handleSearchInput(e.target.value)}
              placeholder="Search for products or vendors..."
              className="w-full pl-12 pr-10 py-3 bg-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500/20 outline-none transition-all text-base"
              autoFocus
            />

            {inputValue && (
              <button
                type="button"
                onClick={() => {
                  setInputValue("");
                  router.push("/search", { scroll: false });
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
            <button onClick={handleRetry} className="flex items-center gap-1.5 text-amber-700 hover:text-amber-900 text-sm font-medium">
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        )}

        {!searchQuery ? (
          <EmptySearch onPopularSearch={handlePopularSearch} />
        ) : searchState === "loading" ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-purple-600 animate-spin mb-4" />
            <p className="text-gray-500 font-medium">Searching marketplace...</p>
          </div>
        ) : (
          <Results vendors={vendors} products={products} query={rawQuery} formatPrice={formatPrice} allVendors={allVendors} onPopularSearch={handlePopularSearch} />
        )}
      </div>
    </div>
  );
}

/* ======================================================
   UI COMPONENTS
====================================================== */

function EmptySearch({ onPopularSearch }: { onPopularSearch: (term: string) => void }) {
  return (
    <div className="text-center py-12">
      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <Search className="w-10 h-10 text-gray-400" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Type to search…</h2>
      <p className="text-gray-500 mb-8">Discover products, stores, and services</p>

      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-2 justify-center mb-4">
          <TrendingUp className="w-4 h-4 text-purple-500" />
          <span className="text-sm font-medium text-gray-700">Popular searches</span>
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
}: {
  vendors: Vendor[];
  products: Product[];
  query: string;
  formatPrice: (price: number) => string;
  allVendors: Vendor[];
  onPopularSearch: (term: string) => void;
}) {
  const totalResults = vendors.length + products.length;

  if (totalResults === 0) {
    return <NoResults query={query} allVendors={allVendors} onPopularSearch={onPopularSearch} />;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          Showing {totalResults} result{totalResults !== 1 ? "s" : ""} for &quot;{query}&quot;
        </h1>
      </div>

      {/* Products first (better UX for searches like "tea") */}
      {products.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">Products ({products.length})</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} formatPrice={formatPrice} />
            ))}
          </div>
        </section>
      )}

      {vendors.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Store className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">Stores ({vendors.length})</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {vendors.map((v) => (
              <VendorCard key={v.id} vendor={v} />
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
}: {
  query: string;
  allVendors: Vendor[];
  onPopularSearch: (term: string) => void;
}) {
  const suggestions = generateSuggestions(query, allVendors);

  return (
    <div className="py-12">
      <div className="text-center mb-10">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Search className="w-10 h-10 text-gray-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">No results found</h2>
        <p className="text-gray-500 max-w-md mx-auto">
          We couldn&apos;t find anything matching &quot;{query}&quot;. Try different keywords or browse suggestions below.
        </p>
      </div>

      {suggestions.length > 0 && (
        <div className="mb-10">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">Did you mean?</h3>
          <div className="flex flex-wrap justify-center gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => onPopularSearch(s)}
                className="px-4 py-2 bg-purple-50 border border-purple-200 rounded-full text-sm text-purple-700 hover:bg-purple-100 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="text-center">
        <div className="flex items-center gap-2 justify-center mb-4">
          <TrendingUp className="w-4 h-4 text-purple-500" />
          <span className="text-sm font-medium text-gray-700">Try popular searches</span>
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

        <Link
          href="/products"
          className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-full font-semibold hover:bg-purple-700 transition-colors"
        >
          <Package className="w-5 h-5" />
          Browse All Products
        </Link>
      </div>
    </div>
  );
}

function generateSuggestions(query: string, vendors: Vendor[]): string[] {
  const qTokens = tokenize(query);
  if (!qTokens.length) return [];

  const suggestions = new Set<string>();

  for (const v of vendors) {
    const text = `${v.name || v.business_name || ""} ${v.category || ""} ${(v.categories || []).join(" ")} ${(v.tags || []).join(" ")}`;
    const tokens = tokenize(text);

    for (const qt of qTokens) {
      for (const tk of tokens) {
        if (tk === qt) continue;
        if (tk.length <= 2) continue;
        const sim = similarity(qt, tk);
        if (sim >= 0.55 && sim < 1) {
          suggestions.add(tk.charAt(0).toUpperCase() + tk.slice(1));
        }
      }
    }
  }

  return Array.from(suggestions).slice(0, 6);
}

/* ======================================================
   CARDS
====================================================== */

function VendorCard({ vendor }: { vendor: Vendor }) {
  const logo = vendor.logoUrl || vendor.logo_url;
  const name = vendor.name || vendor.business_name || "Store";
  const slug = vendor.slug || vendor.id;
  const category = vendor.category || vendor.categories?.[0];
  const displayLocation = vendor.city || formatLocation(vendor.location);

  return (
    <Link
      href={`/store/${slug}`}
      className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:border-purple-100 transition-all duration-300"
    >
      <div className="h-24 bg-gradient-to-br from-purple-100 to-purple-50 relative">
        {vendor.cover_image_url && (
          <Image
            src={vendor.cover_image_url}
            alt=""
            fill
            className="object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
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

      <div className="p-4 -mt-8 relative">
        <div className="w-16 h-16 rounded-xl bg-white border-2 border-white shadow-md overflow-hidden mb-3">
          {logo ? (
            <Image
              src={logo}
              alt={name}
              width={64}
              height={64}
              className="object-cover w-full h-full"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
              <Store className="w-6 h-6 text-white" />
            </div>
          )}
        </div>

        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900 truncate group-hover:text-purple-600 transition-colors">{name}</h3>
            {category && <p className="text-sm text-gray-500 truncate">{category}</p>}
          </div>
          {vendor.verified && <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0" />}
        </div>

        <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
          {vendor.rating && vendor.rating > 0 && (
            <span className="flex items-center gap-1">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              {vendor.rating.toFixed(1)}
            </span>
          )}
          {displayLocation && (
            <span className="flex items-center gap-1 truncate">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              {displayLocation}
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
      <div className="aspect-square bg-gray-100 relative overflow-hidden">
        {image ? (
          <Image
            src={image}
            alt={product.name || "Product"}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-12 h-12 text-gray-300" />
          </div>
        )}
      </div>

      <div className="p-3">
        <h3 className="font-medium text-gray-900 text-sm line-clamp-2 group-hover:text-purple-600 transition-colors">
          {product.name || "Unnamed Product"}
        </h3>
        {product.vendor_name && <p className="text-xs text-gray-500 mt-1 truncate">{product.vendor_name}</p>}
        <p className="text-purple-600 font-bold mt-2">{formatPrice(product.price || 0)}</p>
      </div>
    </Link>
  );
}
