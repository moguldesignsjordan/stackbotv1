// src/app/store/[slug]/page.tsx
import { db } from "@/lib/firebase/config";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import Image from "next/image";
import Link from "next/link";
import {
  MapPin,
  Phone,
  Globe,
  Star,
  Mail,
  MessageCircle,
  ArrowLeft,
  Store,
  ShoppingBag,
  ChevronRight,
} from "lucide-react";
import StorefrontActions from "./StorefrontActions";
import { formatPrice } from "@/lib/utils/currency";

type PageProps = {
  params: Promise<{ slug?: string }>;
};

export default async function VendorStorefront({ params }: PageProps) {
  const { slug } = await params;

  if (!slug) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        <h1 className="text-xl font-semibold">Invalid store URL</h1>
      </div>
    );
  }

  /* ===============================
     1️⃣ FIND VENDOR BY SLUG OR ID
  =============================== */
  let vendorDoc: any = null;
  let vendor: any = null;
  let vendorId: string = "";

  // First, try to find by slug
  const vendorQuery = await getDocs(
    query(
      collection(db, "vendors"),
      where("slug", "==", slug)
    )
  );

  if (!vendorQuery.empty) {
    vendorDoc = vendorQuery.docs[0];
    vendor = vendorDoc.data();
    vendorId = vendorDoc.id;
  } else {
    // Fallback: Try to find by document ID
    const vendorRef = doc(db, "vendors", slug);
    const vendorSnap = await getDoc(vendorRef);
    
    if (vendorSnap.exists()) {
      vendorDoc = vendorSnap;
      vendor = vendorSnap.data();
      vendorId = vendorSnap.id;
    }
  }

  // If still not found, show error
  if (!vendor) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-gray-600 gap-4">
        <Store className="w-16 h-16 text-gray-300" />
        <h1 className="text-2xl font-bold">Store Not Found</h1>
        <p className="text-gray-500">This vendor doesn&apos;t exist or has been removed.</p>
        <Link 
          href="/" 
          className="mt-4 inline-flex items-center gap-2 text-purple-600 font-semibold hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </div>
    );
  }

  // Use slug for product links, fallback to vendorId
  const storeSlug = vendor.slug || vendorId;

  /* ===============================
     2️⃣ LOAD PRODUCTS (VENDOR SUBCOLLECTION)
  =============================== */
  const productsSnap = await getDocs(
    collection(db, "vendors", vendorId, "products")
  );

  const products = productsSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((p: any) => p.active !== false);

  /* ===============================
     3️⃣ RENDER STOREFRONT
  =============================== */
  return (
    <div className="bg-gray-50 min-h-screen pb-24">
      {/* HERO */}
      <section className="relative h-[340px] md:h-[420px] w-full overflow-hidden">
        <Image
          src={vendor.cover_image_url || vendor.logoUrl || "/placeholder-cover.jpg"}
          alt={vendor.name}
          fill
          className="object-cover"
          priority
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        
        {/* Back button */}
        <Link
          href="/"
          className="absolute top-4 left-4 z-10 inline-flex items-center gap-2 bg-white/15 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-white/25 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back</span>
        </Link>

        {/* Store Actions */}
        <div className="absolute top-4 right-4 z-10">
          <StorefrontActions 
            storeName={vendor.name} 
            storeSlug={storeSlug}
            phone={vendor.phone}
          />
        </div>

        {/* Hero Content */}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
          <div className="max-w-7xl mx-auto flex items-end gap-6">
            {/* Logo */}
            <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden border-4 border-white shadow-xl flex-shrink-0 bg-white">
              <Image
                src={vendor.logoUrl || "/placeholder.png"}
                alt={vendor.name}
                fill
                className="object-cover"
              />
            </div>
            
            {/* Info */}
            <div className="flex-1 text-white pb-1">
              <h1 className="text-3xl md:text-4xl font-bold drop-shadow-lg">
                {vendor.name}
              </h1>
              
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-white/90 text-sm">
                {vendor.category && (
                  <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                    {vendor.category}
                  </span>
                )}
                
                {vendor.rating > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span>{vendor.rating.toFixed(1)}</span>
                  </div>
                )}
                
                {vendor.city && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>{vendor.city}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN CONTENT */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 py-8 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
        {/* LEFT: INFO + PRODUCTS */}
        <div className="space-y-8">
          {/* CONTACT INFO */}
          <div className="bg-white rounded-2xl border p-6 space-y-3">
            {vendor.address && (
              <div className="flex gap-2 items-start">
                <MapPin className="h-5 w-5 text-gray-500 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">{vendor.address}</span>
              </div>
            )}
            {vendor.phone && (
              <div className="flex gap-2 items-center">
                <Phone className="h-5 w-5 text-gray-500" />
                <a href={`tel:${vendor.phone}`} className="text-purple-600 hover:underline">
                  {vendor.phone}
                </a>
              </div>
            )}
            {vendor.email && (
              <div className="flex gap-2 items-center">
                <Mail className="h-5 w-5 text-gray-500" />
                <a href={`mailto:${vendor.email}`} className="text-purple-600 hover:underline">
                  {vendor.email}
                </a>
              </div>
            )}
            {vendor.website && (
              <div className="flex gap-2 items-center">
                <Globe className="h-5 w-5 text-gray-500" />
                <a
                  href={vendor.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-600 underline"
                >
                  {vendor.website}
                </a>
              </div>
            )}
          </div>

          {/* DESCRIPTION */}
          {(vendor.description || vendor.business_description) && (
            <div className="bg-white rounded-2xl border p-6">
              <h3 className="font-semibold text-lg mb-3">About</h3>
              <p className="text-gray-600 leading-relaxed">
                {vendor.description || vendor.business_description}
              </p>
            </div>
          )}

          {/* PRODUCTS */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold">Products</h2>
              <span className="text-gray-500 text-sm">{products.length} items</span>
            </div>

            {products.length === 0 ? (
              <div className="bg-white p-12 rounded-xl border text-center">
                <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">This vendor has not added any products yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {products.map((product: any) => (
                  <Link
                    key={product.id}
                    href={`/store/${storeSlug}/product/${product.id}`}
                    className="group"
                  >
                    <div className="bg-white rounded-2xl border overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                      <div className="flex gap-4 p-4">
                        {/* Product Image */}
                        <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                          <Image
                            src={product.images?.[0] || "/placeholder.png"}
                            fill
                            alt={product.name}
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          {/* View Details Overlay */}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white px-3 py-1.5 rounded-full text-sm font-medium text-gray-900">
                              View Details
                            </span>
                          </div>
                        </div>

                        {/* Product Info */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                          <div>
                            <h3 className="font-semibold text-[#55529d] group-hover:text-purple-700 transition-colors line-clamp-1">
                              {product.name}
                            </h3>
                            {product.description && (
                              <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                                {product.description}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-[#55529d] font-bold text-lg">
                              {formatPrice(typeof product.price === 'number' ? product.price : 0)}
                            </p>
                            <span className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 group-hover:text-[#55529d] transition-colors">
                              View
                              <ChevronRight className="w-4 h-4" />
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT SIDEBAR */}
        <div className="space-y-4">
          {vendor.phone && (
            <a
              href={`tel:${vendor.phone}`}
              className="block w-full text-center bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-semibold transition"
            >
              Call Now
            </a>
          )}
          {vendor.phone && (
            <a
              href={`https://wa.me/${vendor.phone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-semibold flex justify-center items-center gap-2 transition"
            >
              <MessageCircle className="h-5 w-5" />
              WhatsApp
            </a>
          )}
          
          {/* Store Hours Placeholder */}
          <div className="bg-white rounded-2xl border p-6">
            <h3 className="font-semibold mb-3">Store Hours</h3>
            <p className="text-gray-500 text-sm">Contact vendor for hours</p>
          </div>
        </div>
      </section>
    </div>
  );
}