"use client";

export const dynamic = "force-dynamic";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/firebase/config";
import { collection, getDocs } from "firebase/firestore";
import {
  Search,
  Store,
  ArrowLeft,
  Package,
  Star,
  MapPin,
  CheckCircle2,
  Sparkles,
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
  vendorId: string;
  vendorSlug: string;
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
  const searchQuery = searchParams.get("q") || "";

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const runSearch = async () => {
      if (!searchQuery.trim()) {
        setVendors([]);
        setProducts([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        /* ---------------- Vendors ---------------- */

        const vendorsSnap = await getDocs(collection(db, "vendors"));

        const matchedVendors: Vendor[] = vendorsSnap.docs
          .map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Vendor, "id">),
          }))
          .filter((v) => {
            const q = searchQuery.toLowerCase();
            return (
              (v.name || v.business_name || "").toLowerCase().includes(q) ||
              (v.description || v.business_description || "")
                .toLowerCase()
                .includes(q) ||
              (v.category || v.categories?.[0] || "")
                .toLowerCase()
                .includes(q)
            );
          });

        setVendors(matchedVendors);

        /* ---------------- Products ---------------- */

        const collectedProducts: Product[] = [];

        for (const vendor of matchedVendors.slice(0, 5)) {
          const productsSnap = await getDocs(
            collection(db, "vendors", vendor.id, "products")
          );

          productsSnap.docs.forEach((d) => {
            const data = d.data() as any;

            if (data.active === false) return;

            collectedProducts.push({
              id: d.id,
              ...data,
              vendorId: vendor.id,
              vendorSlug: vendor.slug || vendor.id,
              vendor_name: vendor.name || vendor.business_name,
            });
          });
        }

        setProducts(
          collectedProducts.filter((p) =>
            (p.name || p.description || "")
              .toLowerCase()
              .includes(searchQuery.toLowerCase())
          )
        );
      } catch (err) {
        console.error("Search error:", err);
      }

      setLoading(false);
    };

    runSearch();
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-gray-100 rounded-xl">
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              defaultValue={searchQuery}
              placeholder="Search vendors, products..."
              className="w-full pl-12 pr-4 py-3 bg-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500/20 outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  window.location.href = `/search?q=${encodeURIComponent(
                    (e.target as HTMLInputElement).value
                  )}`;
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {!searchQuery ? (
          <EmptySearch />
        ) : loading ? (
          <SearchLoadingState />
        ) : (
          <Results vendors={vendors} products={products} query={searchQuery} />
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
    <div className="text-center py-20">
      <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h2 className="text-xl font-semibold text-gray-700">
        Search for vendors and products
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
      <div className="text-center py-20">
        <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-700">
          No results for "{query}"
        </h2>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {vendors.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Store className="w-5 h-5 text-purple-600" />
            Vendors
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {vendors.map((v) => (
              <VendorCard key={v.id} vendor={v} />
            ))}
          </div>
        </section>
      )}

      {products.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-purple-600" />
            Products
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
   VENDOR CARD (Matching Homepage Design)
====================================================== */

function VendorCard({ vendor }: { vendor: Vendor }) {
  const link = vendor.slug ? `/store/${vendor.slug}` : `/store/${vendor.id}`;
  const displayName = vendor.business_name || vendor.name || "Unnamed Vendor";
  const description = vendor.business_description || vendor.description;
  const category = vendor.category || vendor.categories?.[0];
  
  // Build location string
  const locationParts = [
    vendor.address,
    vendor.city,
    vendor.state,
    vendor.zip,
  ].filter(Boolean);
  const locationString = vendor.location || locationParts.join(", ");

  // Use cover image as background, or logo, or fallback to gradient
  const hasBackgroundImage = vendor.cover_image_url || vendor.logoUrl;

  return (
    <Link href={link} className="block group">
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300 hover:-translate-y-1">
        {/* Image/Logo Section */}
        <div className="relative aspect-[4/3] bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center overflow-hidden">
          {/* Background Image (cover or logo) */}
          {hasBackgroundImage && (
            <Image
              src={vendor.cover_image_url || vendor.logoUrl || ""}
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

          {/* Centered Logo (only show if no background image, or as overlay) */}
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

          {/* Category & New Badge Row */}
          <div className="flex items-center justify-between gap-2">
            {category && (
              <span className="inline-flex px-3 py-1 bg-purple-50 text-purple-700 text-sm font-medium rounded-full">
                {category}
              </span>
            )}
            {vendor.isNew && (
              <span className="text-sm text-gray-400 font-medium">New</span>
            )}
          </div>

          {/* Location */}
          {locationString && (
            <div className="flex items-center gap-1.5 text-gray-500 text-sm">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{locationString}</span>
            </div>
          )}

          {/* Rating (if exists) */}
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

/* ======================================================
   PRODUCT CARD
====================================================== */

function ProductCard({ product }: { product: Product }) {
  const link = `/store/${product.vendorSlug}/product/${product.id}`;

  return (
    <Link href={link}>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
        <div className="relative aspect-square bg-gray-100">
          {product.images?.[0] ? (
            <Image
              src={product.images[0]}
              alt={product.name || "Product"}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Package className="w-10 h-10 text-gray-300" />
            </div>
          )}
        </div>
        <div className="p-3">
          <h3 className="font-medium text-sm text-gray-900 line-clamp-2">
            {product.name}
          </h3>
          <p className="text-purple-600 font-bold mt-1">
            ${Number(product.price || 0).toFixed(2)}
          </p>
        </div>
      </div>
    </Link>
  );
}