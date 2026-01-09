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
  query, 
  where, 
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
  Loader2
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
  logo_url?: string; // Handle both cases
  cover_image_url?: string;
  rating?: number;
  featured?: boolean;
  verified?: boolean;
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
  vendor_slug?: string; // Handle both cases
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
   SEARCH LOGIC (OPTIMIZED)
====================================================== */

function SearchPageInner() {
  const searchParams = useSearchParams();
  const rawQuery = searchParams.get("q") || "";
  
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
        // 1. Search Vendors (Client-side filtering for flexibility on small datasets)
        // Note: For large datasets, use Algolia or multiple Firestore 'where' queries
        const vendorsPromise = getDocs(collection(db, "vendors"));

        // 2. Search Products (Global search across all vendors)
        // We fetch products that might match, then filter strictly in JS
        const productsQuery = query(
          collectionGroup(db, "products"),
          // Simple optimization: only get items that are likely matches 
          // Note: This 'starts with' query requires case-sensitive match in Firestore usually
          where("active", "!=", false) 
        );
        const productsPromise = getDocs(productsQuery);

        const [vendorsSnap, productsSnap] = await Promise.all([
          vendorsPromise,
          productsPromise
        ]);

        /* ---------------- Process Vendors ---------------- */
        const matchedVendors = vendorsSnap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Vendor))
          .filter((v) => {
             // Search in name, description, and categories
             const name = (v.name || v.business_name || "").toLowerCase();
             const desc = (v.description || v.business_description || "").toLowerCase();
             const cat = (v.category || v.categories?.join(" ") || "").toLowerCase();
             
             return name.includes(searchQuery) || desc.includes(searchQuery) || cat.includes(searchQuery);
          });

        setVendors(matchedVendors);

        /* ---------------- Process Products ---------------- */
        const matchedProducts = productsSnap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              ...data,
              // Fallback for vendor info if missing on product doc
              vendorId: data.vendorId || d.ref.parent.parent?.id, 
            } as Product;
          })
          .filter((p) => {
            const name = (p.name || "").toLowerCase();
            const desc = (p.description || "").toLowerCase();
            return name.includes(searchQuery) || desc.includes(searchQuery);
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
              placeholder="Search for food, services, or vendors..."
              className="w-full pl-12 pr-4 py-3 bg-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const val = (e.target as HTMLInputElement).value;
                  if (val.trim()) {
                     window.location.href = `/search?q=${encodeURIComponent(val.trim())}`;
                  }
                }
              }}
            />
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
          <Results vendors={vendors} products={products} query={rawQuery} />
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
}: {
  vendors: Vendor[];
  products: Product[];
  query: string;
}) {
  if (!vendors.length && !products.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
          <Search className="w-10 h-10 text-gray-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          No matches found
        </h2>
        <p className="text-gray-500 max-w-md">
          We couldn't find any vendors or products matching "{query}". Try checking your spelling or using a different keyword.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      {/* VENDORS SECTION */}
      {vendors.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-2">
            <Store className="w-5 h-5 text-purple-600" />
            <h2 className="text-xl font-bold text-gray-900">Vendors</h2>
            <span className="ml-auto text-xs font-semibold bg-gray-100 px-2 py-1 rounded-full text-gray-600">
              {vendors.length}
            </span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {vendors.map((v) => (
              <VendorCard key={v.id} vendor={v} />
            ))}
          </div>
        </section>
      )}

      {/* PRODUCTS SECTION */}
      {products.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-2">
            <Package className="w-5 h-5 text-purple-600" />
            <h2 className="text-xl font-bold text-gray-900">Products & Services</h2>
            <span className="ml-auto text-xs font-semibold bg-gray-100 px-2 py-1 rounded-full text-gray-600">
              {products.length}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
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
  
  // Clean location string
  const locationParts = [vendor.address, vendor.city].filter(Boolean);
  const locationString = vendor.location || (locationParts.length > 0 ? locationParts.join(", ") : null);

  const hasImage = vendor.cover_image_url || vendor.logoUrl || vendor.logo_url;

  return (
    <Link href={link} className="block group h-full">
      <div className="bg-white h-full rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:shadow-purple-500/5 transition-all duration-300 hover:-translate-y-1 flex flex-col">
        {/* Image Section */}
        <div className="relative aspect-[16/9] bg-gray-100 overflow-hidden">
          {hasImage ? (
            <Image
              src={hasImage}
              alt={displayName}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-purple-50">
              <Store className="w-12 h-12 text-purple-200" />
            </div>
          )}

          {/* Featured Badge */}
          {vendor.featured && (
            <div className="absolute top-3 left-3 z-10">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/95 backdrop-blur-sm rounded-full text-[10px] font-bold uppercase tracking-wider text-purple-700 shadow-sm">
                <Sparkles className="w-3 h-3" />
                Featured
              </span>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="p-5 flex-1 flex flex-col">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-bold text-gray-900 text-lg leading-tight group-hover:text-purple-700 transition-colors line-clamp-1">
              {displayName}
            </h3>
            {vendor.verified && (
              <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0" />
            )}
          </div>

          {category && (
            <div className="mb-3">
              <span className="inline-block px-2.5 py-0.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-md">
                {category}
              </span>
            </div>
          )}

          {description && (
            <p className="text-gray-500 text-sm line-clamp-2 mb-4 flex-1">
              {description}
            </p>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-gray-50 mt-auto">
            {vendor.rating ? (
               <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg">
                <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                <span className="text-xs font-bold text-yellow-700">
                  {vendor.rating.toFixed(1)}
                </span>
              </div>
            ) : (
              <span className="text-xs text-gray-400 font-medium">New</span>
            )}

            {locationString && (
              <div className="flex items-center gap-1 text-gray-400 text-xs">
                <MapPin className="w-3.5 h-3.5" />
                <span className="max-w-[100px] truncate">{locationString}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ======================================================
   PRODUCT CARD
====================================================== */

function ProductCard({ product }: { product: Product }) {
  // Safe link generation
  const vendorSlug = product.vendorSlug || product.vendor_slug || product.vendorId;
  const link = vendorSlug 
    ? `/store/${vendorSlug}/product/${product.id}` 
    : '#';

  const price = typeof product.price === 'number' ? product.price : parseFloat(product.price || '0');

  return (
    <Link href={link} className="block group h-full">
      <div className="bg-white h-full rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:shadow-purple-500/5 transition-all duration-300 hover:-translate-y-1 flex flex-col">
        <div className="relative aspect-square bg-gray-50 overflow-hidden">
          {product.images?.[0] ? (
            <Image
              src={product.images[0]}
              alt={product.name || "Product"}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Package className="w-10 h-10 text-gray-300" />
            </div>
          )}
          
          {/* Add Cart Button Overlay could go here */}
        </div>
        
        <div className="p-4 flex-1 flex flex-col">
          <div className="mb-1 text-xs text-gray-400 font-medium truncate">
            {product.vendor_name || "Available Now"}
          </div>
          <h3 className="font-semibold text-gray-900 line-clamp-2 mb-2 group-hover:text-purple-700 transition-colors">
            {product.name}
          </h3>
          <div className="mt-auto flex items-center justify-between">
            <p className="text-lg font-bold text-gray-900">
              ${price.toFixed(2)}
            </p>
            <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-purple-100 group-hover:text-purple-600 transition-colors">
              <ArrowLeft className="w-4 h-4 rotate-180" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}