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
} from "lucide-react";

type PageProps = {
  params: Promise<{ slug?: string }>;
};

export default async function VendorStorefront({ params }: PageProps) {
  // ✅ NEXT.JS 15 FIX — await params
  const { slug } = await params;

  // 🔒 SAFETY GUARD
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
        <p className="text-gray-500">This vendor doesn't exist or has been removed.</p>
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
          src={vendor.cover_image_url || vendor.banner_url || "/store-cover-placeholder.jpg"}
          alt={`${vendor.name || vendor.business_name} cover`}
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />

        {/* Back Button */}
        <Link 
          href="/"
          className="absolute top-6 left-6 z-20 inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-white/30 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        <div className="relative z-10 h-full flex items-end">
          <div className="max-w-6xl mx-auto w-full px-6 pb-10 flex flex-col md:flex-row gap-6 md:items-end">
            <div className="bg-white rounded-2xl p-2 shadow-xl w-fit">
              <Image
                src={vendor.logoUrl || vendor.logo_url || "/placeholder.png"}
                width={120}
                height={120}
                alt={vendor.name || vendor.business_name}
                className="rounded-xl object-cover"
              />
            </div>

            <div className="flex-1 text-white space-y-3">
              {(vendor.categories?.[0] || vendor.category) && (
                <span className="inline-block px-4 py-1 rounded-full text-sm font-semibold bg-white/20 backdrop-blur">
                  {vendor.categories?.[0] || vendor.category}
                </span>
              )}

              <h1 className="text-4xl md:text-5xl font-bold">
                {vendor.name || vendor.business_name}
              </h1>

              <div className="flex items-center gap-2 text-white/90">
                <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                <span className="font-semibold">
                  {vendor.rating ? vendor.rating.toFixed(1) : "New"}
                </span>
                {vendor.total_reviews && (
                  <span className="text-sm text-white/70">({vendor.total_reviews} reviews)</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <section className="max-w-6xl mx-auto px-6 mt-10 grid md:grid-cols-3 gap-10">
        {/* LEFT */}
        <div className="md:col-span-2 space-y-6">
          {/* CONTACT */}
          <div className="bg-white rounded-2xl border p-6 space-y-3">
            <h3 className="font-semibold text-lg mb-4">Contact Information</h3>
            
            {/* Address */}
            {(vendor.address || vendor.business_address) && (
              <div className="flex gap-2 items-start">
                <MapPin className="h-5 w-5 mt-0.5 text-gray-500" />
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    vendor.address || vendor.business_address
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-800 hover:text-purple-600 hover:underline transition"
                >
                  {vendor.address || vendor.business_address}
                </a>
              </div>
            )}

            {/* Phone */}
            {vendor.phone && (
              <div className="flex gap-2 items-center">
                <Phone className="h-5 w-5 text-gray-500" />
                <a
                  href={`tel:${vendor.phone}`}
                  className="text-gray-800 hover:text-purple-600 hover:underline transition"
                >
                  {vendor.phone}
                </a>
              </div>
            )}

            {/* Email */}
            {vendor.email && (
              <div className="flex gap-2 items-center">
                <Mail className="h-5 w-5 text-gray-500" />
                <a
                  href={`mailto:${vendor.email}`}
                  className="text-gray-800 hover:text-purple-600 hover:underline transition"
                >
                  {vendor.email}
                </a>
              </div>
            )}

            {/* Website */}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {products.map((product: any) => (
                  <Link
                    key={product.id}
                    href={`/store/${storeSlug}/product/${product.id}`}
                  >
                    <div className="bg-white rounded-2xl shadow border overflow-hidden hover:shadow-xl transition group cursor-pointer h-full">
                      <div className="relative aspect-square overflow-hidden">
                        <Image
                          src={product.images?.[0] || "/placeholder.png"}
                          fill
                          alt={product.name}
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>

                      <div className="p-5">
                        <h3 className="text-lg font-semibold line-clamp-1 group-hover:text-purple-600 transition-colors">
                          {product.name}
                        </h3>

                        <p className="text-purple-600 font-bold mt-1 text-xl">
                          ${typeof product.price === 'number' ? product.price.toFixed(2) : product.price}
                        </p>

                        <span className="inline-block mt-3 text-sm font-semibold text-purple-600">
                          View Product →
                        </span>
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