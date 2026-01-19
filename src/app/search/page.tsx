"use client";

export const dynamic = "force-dynamic";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
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
  X
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

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
  rating?: number;
  featured?: boolean;
  verified?: boolean;
  status?: string;
  isNew?: boolean;
  address?: string;
  location?: string;
  city?: string;
  state?: string;
  zip?: string;
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
};

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
  const rawQuery = searchParams.get("q") || "";
  const { formatPrice: contextFormatPrice, t } = useLanguage();
  
  // Fallback formatPrice in case context isn't ready
  const formatPrice = contextFormatPrice || ((price: number) => `$${price.toFixed(2)}`);
  
  // Normalize query for better matching
  const searchQuery = rawQuery.trim().toLowerCase();

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const runSearch = async () => {
      if (!searchQuery) {
        setVendors([]);
        setProducts([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        // 1. Fetch ALL vendors (client-side filtering)
        const vendorsPromise = getDocs(collection(db, "vendors"));

        // 2. Fetch ALL products from collectionGroup (NO query constraints)
        // This avoids the index requirement for != operators
        const productsPromise = getDocs(collectionGroup(db, "products"));

        const [vendorsSnap, productsSnap] = await Promise.all([
          vendorsPromise,
          productsPromise
        ]);

        /* ---------------- Process Vendors ---------------- */
        const matchedVendors = vendorsSnap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Vendor))
          .filter((v) => {
            // Only show approved or verified vendors
            const isApproved = v.status === "approved" || v.verified === true;
            const isNotSuspended = v.status !== "suspended" && v.status !== "rejected";
            if (!isApproved || !isNotSuspended) return false;

            // Search in name, description, and categories
            const name = (v.name || v.business_name || "").toLowerCase();
            const desc = (v.description || v.business_description || "").toLowerCase();
            const cat = (v.category || v.categories?.join(" ") || "").toLowerCase();
            
            return name.includes(searchQuery) || desc.includes(searchQuery) || cat.includes(searchQuery);
          });

        setVendors(matchedVendors);

        // Build vendor lookup map for product enrichment
        const vendorMap = new Map<string, Vendor>();
        vendorsSnap.docs.forEach((d) => {
          vendorMap.set(d.id, { id: d.id, ...d.data() } as Vendor);
        });

        /* ---------------- Process Products ---------------- */
        const matchedProducts = productsSnap.docs
          .map((d) => {
            const data = d.data();
            const vendorId = data.vendorId || d.ref.parent.parent?.id;
            const vendor = vendorId ? vendorMap.get(vendorId) : null;
            
            return {
              id: d.id,
              ...data,
              vendorId,
              vendorSlug: vendor?.slug || vendorId,
              vendor_name: data.vendor_name || vendor?.name || vendor?.business_name,
            } as Product;
          })
          .filter((p) => {
            // Filter out inactive products (treat missing active field as active)
            if (p.active === false) return false;
            
            // Search in name and description
            const name = (p.name || "").toLowerCase();
            const desc = (p.description || "").toLowerCase();
            const vendorName = (p.vendor_name || "").toLowerCase();
            
            return name.includes(searchQuery) || desc.includes(searchQuery) || vendorName.includes(searchQuery);
          });

        setProducts(matchedProducts);

      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    };

    runSearch();
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>

          <div className="flex-1 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
            <input
              defaultValue={rawQuery}
              placeholder={t?.("hero.searchPlaceholder") || "Search for food, services, or vendors..."}
              className="w-full pl-12 pr-10 py-3 bg-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const val = (e.target as HTMLInputElement).value;
                  if (val.trim()) {
                    window.location.href = `/search?q=${encodeURIComponent(val.trim())}`;
                  }
                }
              }}
            />
            {rawQuery && (
              <button
                onClick={() => window.location.href = "/search"}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 bg-gray-200/50 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-6xl mx-auto px-4 py-8 min-h-[60vh]">
        {!searchQuery ? (
          <EmptySearch />
        ) : loading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-purple-600 animate-spin mb-4" />
            <p className="text-gray-500 font-medium">Searching marketplace...</p>
          </div>
        ) : (
          <Results vendors={vendors} products={products} query={rawQuery} formatPrice={formatPrice} />
        )}
      </div>
    </div>
  );
}

/* ======================================================
   UI SECTIONS
====================================================== */

function EmptySearch() {
  return (
    <div className="text-center py-20 opacity-50">
      <Search className="w-16 h-16 mx-auto mb-4" />
      <h2 className="text-xl font-semibold">
        Type to search...
      </h2>
    </div>
  );
}

function Results({
  vendors,
  products,
  query,
  formatPrice,
}: {
  vendors: Vendor[];
  products: Product[];
  query: string;
  formatPrice: (price: number) => string;
}) {
  if (!vendors.length && !products.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
          <Search className="w-10 h-10 text-gray-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          No products found
        </h2>
        <p className="text-gray-500 max-w-md">
          We couldn&apos;t find any products matching &quot;{query}&quot;. Try different keywords or browse all products.
        </p>
        <Link
          href="/products"
          className="mt-6 px-6 py-3 bg-purple-600 text-white rounded-full font-semibold hover:bg-purple-700 transition-colors"
        >
          Clear search
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Search Results Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          {products.length + vendors.length} result{products.length + vendors.length !== 1 ? "s" : ""} for &quot;{query}&quot;
        </h1>
      </div>

      {/* Vendors Section */}
      {vendors.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Store className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Stores ({vendors.length})
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
              Products ({products.length})
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
            <Image src={logo} alt={name} width={64} height={64} className="object-cover w-full h-full" />
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
          {vendor.rating && (
            <span className="flex items-center gap-1">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              {vendor.rating.toFixed(1)}
            </span>
          )}
          {(vendor.city || vendor.location) && (
            <span className="flex items-center gap-1 truncate">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              {vendor.city || vendor.location}
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