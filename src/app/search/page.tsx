"use client";

/**
 * 🚨 REQUIRED FOR NEXT.JS 15/16 + VERCEL
 * Prevents static prerendering of /search
 */
export const dynamic = "force-dynamic";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/firebase/config";
import { collection, getDocs } from "firebase/firestore";
import { Search, Store, ArrowLeft, Package, Star } from "lucide-react";

/**
 * 🔥 Page-level Suspense wrapper
 */
export default function SearchPage() {
  return (
    <Suspense fallback={<SearchLoadingState />}>
      <SearchPageInner />
    </Suspense>
  );
}

/**
 * Loading state while suspense resolves
 */
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

/**
 * 🔥 Actual Search Logic
 */
function SearchPageInner() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q") || "";

  const [vendors, setVendors] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const search = async () => {
      if (!searchQuery.trim()) {
        setVendors([]);
        setProducts([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const vendorsSnap = await getDocs(collection(db, "vendors"));
        const matchedVendors = vendorsSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((v: any) => {
            const q = searchQuery.toLowerCase();
            return (
              (v.name || v.business_name || "").toLowerCase().includes(q) ||
              (v.description || v.business_description || "").toLowerCase().includes(q) ||
              (v.category || v.categories?.[0] || "").toLowerCase().includes(q)
            );
          });

        setVendors(matchedVendors);

        const allProducts: any[] = [];
        for (const vendor of matchedVendors.slice(0, 5)) {
          const productsSnap = await getDocs(
            collection(db, "vendors", vendor.id, "products")
          );
          allProducts.push(
            ...productsSnap.docs
              .map((d) => ({
                id: d.id,
                ...d.data(),
                vendorId: vendor.id,
                vendorSlug: vendor.slug || vendor.id,
                vendor_name: vendor.name || vendor.business_name,
              }))
              .filter((p: any) => p.active !== false)
          );
        }

        setProducts(
          allProducts.filter((p) =>
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

    search();
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

/* ===================== UI SECTIONS ===================== */

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

function Results({ vendors, products, query }: any) {
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
          <h2 className="text-xl font-bold mb-4 flex gap-2">
            <Store className="w-5 h-5 text-purple-600" />
            Vendors
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {vendors.map((v: any) => (
              <VendorCard key={v.id} vendor={v} />
            ))}
          </div>
        </section>
      )}

      {products.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4 flex gap-2">
            <Package className="w-5 h-5 text-purple-600" />
            Products
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {products.map((p: any) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* ===================== CARDS ===================== */

function VendorCard({ vendor }: any) {
  const link = vendor.slug ? `/store/${vendor.slug}` : `/store/${vendor.id}`;

  return (
    <Link href={link}>
      <div className="bg-white rounded-2xl border hover:shadow-lg transition">
        <div className="aspect-video bg-purple-600 flex items-center justify-center">
          {vendor.logo_url ? (
            <Image src={vendor.logo_url} alt="" width={80} height={80} />
          ) : (
            <Store className="w-12 h-12 text-white/50" />
          )}
        </div>
        <div className="p-4">
          <h3 className="font-semibold">{vendor.business_name || vendor.name}</h3>
          {vendor.rating && (
            <div className="flex gap-1 text-sm text-yellow-500">
              <Star className="w-4 h-4 fill-yellow-400" />
              {vendor.rating.toFixed(1)}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

function ProductCard({ product }: any) {
  const link = `/store/${product.vendorSlug}/product/${product.id}`;

  return (
    <Link href={link}>
      <div className="bg-white rounded-2xl border hover:shadow-lg transition">
        <div className="aspect-square bg-gray-100 flex items-center justify-center">
          {product.images?.[0] ? (
            <Image src={product.images[0]} alt="" fill className="object-cover" />
          ) : (
            <Package className="w-10 h-10 text-gray-300" />
          )}
        </div>
        <div className="p-3">
          <h3 className="font-medium text-sm">{product.name}</h3>
          <p className="text-purple-600 font-bold">
            ${Number(product.price).toFixed(2)}
          </p>
        </div>
      </div>
    </Link>
  );
}
