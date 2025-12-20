"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/firebase/config";
import { collection, getDocs, query, where } from "firebase/firestore";
import { ArrowLeft, Search, Store, MapPin, Star } from "lucide-react";

interface Vendor {
  id: string;
  business_name: string;
  business_description?: string;
  business_address?: string;
  logo_url?: string;
  banner_url?: string;
  category?: string;
  rating?: number;
  total_reviews?: number;
  status: string;
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");

  useEffect(() => {
    const fetchVendors = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, "vendors"),
          where("status", "==", "approved")
        );
        
        const snapshot = await getDocs(q);
        const allVendors = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as Vendor));

        // Client-side filtering by vendor name
        const searchTerm = searchParams.get("q")?.toLowerCase() || "";
        const filtered = searchTerm
          ? allVendors.filter((vendor) =>
              vendor.business_name.toLowerCase().includes(searchTerm)
            )
          : allVendors;

        setVendors(filtered);
      } catch (error) {
        console.error("Error fetching vendors:", error);
      }
      setLoading(false);
    };

    fetchVendors();
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap');
        
        :root {
          --sb-primary: #55529d;
          --sb-primary-light: #7c78c9;
          --sb-accent: #f97316;
        }

        body {
          font-family: 'Plus Jakarta Sans', sans-serif;
        }

        .font-display {
          font-family: 'Space Grotesk', sans-serif;
        }
      `}</style>

      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            
            <form onSubmit={handleSearch} className="flex-1 max-w-2xl">
              <div className="relative flex items-center gap-3 bg-gray-100 rounded-full px-4 py-3">
                <Search className="text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search vendors by name..."
                  className="flex-1 bg-transparent text-gray-900 placeholder-gray-500 focus:outline-none"
                  autoFocus
                />
                <button
                  type="submit"
                  className="bg-[var(--sb-primary)] text-white px-6 py-2 rounded-full font-semibold hover:bg-[var(--sb-primary-light)] transition-colors"
                >
                  Search
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Results Header */}
        <div className="mb-6">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-gray-900">
            {searchParams.get("q") ? (
              <>
                Search results for "{searchParams.get("q")}"
              </>
            ) : (
              "All Vendors"
            )}
          </h1>
          <p className="text-gray-600 mt-2">
            {loading ? "Searching..." : `${vendors.length} vendor${vendors.length !== 1 ? "s" : ""} found`}
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
                <div className="aspect-[16/9] bg-gray-200" />
                <div className="p-4 space-y-3">
                  <div className="h-5 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-full" />
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No Results */}
        {!loading && vendors.length === 0 && (
          <div className="text-center py-20">
            <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No vendors found</h2>
            <p className="text-gray-600">
              {searchParams.get("q")
                ? `Try searching with different keywords`
                : "No vendors available at the moment"}
            </p>
            <Link
              href="/"
              className="inline-block mt-6 px-6 py-3 bg-[var(--sb-primary)] text-white rounded-full font-semibold hover:bg-[var(--sb-primary-light)] transition-colors"
            >
              Back to Home
            </Link>
          </div>
        )}

        {/* Vendor Grid */}
        {!loading && vendors.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {vendors.map((vendor) => (
              <Link key={vendor.id} href={`/store/${vendor.id}`}>
                <div className="group bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-xl hover:-translate-y-2 transition-all duration-300 cursor-pointer">
                  {/* Banner/Logo */}
                  <div className="aspect-[16/9] bg-gradient-to-br from-[var(--sb-primary)] to-[var(--sb-primary-light)] overflow-hidden relative">
                    {vendor.banner_url ? (
                      <Image
                        src={vendor.banner_url}
                        alt={vendor.business_name}
                        width={400}
                        height={225}
                        className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : vendor.logo_url ? (
                      <div className="flex items-center justify-center h-full p-8">
                        <Image
                          src={vendor.logo_url}
                          alt={vendor.business_name}
                          width={120}
                          height={120}
                          className="object-contain max-h-full"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Store className="w-16 h-16 text-white/50" />
                      </div>
                    )}
                  </div>

                  {/* Vendor Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 text-lg group-hover:text-[var(--sb-primary)] transition-colors line-clamp-1">
                      {vendor.business_name}
                    </h3>

                    {vendor.business_description && (
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                        {vendor.business_description}
                      </p>
                    )}

                    <div className="mt-3 flex items-center justify-between">
                      {vendor.category && (
                        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-[var(--sb-primary)]/10 text-[var(--sb-primary)] rounded-full font-medium">
                          {vendor.category}
                        </span>
                      )}

                      {vendor.rating && (
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-semibold text-gray-700">
                            {vendor.rating.toFixed(1)}
                          </span>
                          {vendor.total_reviews && (
                            <span className="text-xs text-gray-500">
                              ({vendor.total_reviews})
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {vendor.business_address && (
                      <div className="mt-3 flex items-start gap-1.5 text-xs text-gray-500">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        <span className="line-clamp-1">{vendor.business_address}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}