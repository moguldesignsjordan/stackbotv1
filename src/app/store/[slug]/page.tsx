import { db } from "@/lib/firebase/config";
import {
  collection,
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
} from "lucide-react";

type PageProps = {
  params: Promise<{ slug?: string }>;
};

export default async function VendorStorefront({ params }: PageProps) {
  // ✅ NEXT.JS 16 FIX — await params
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
     1️⃣ FIND VENDOR BY SLUG
  =============================== */
  const vendorQuery = await getDocs(
    query(
      collection(db, "vendors"),
      where("slug", "==", slug)
    )
  );

  if (vendorQuery.empty) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        <h1 className="text-3xl font-bold">Vendor Not Found</h1>
      </div>
    );
  }

  const vendorDoc = vendorQuery.docs[0];
  const vendor = vendorDoc.data();
  const vendorId = vendorDoc.id;

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
          src={vendor.cover_image_url || "/store-cover-placeholder.jpg"}
          alt={`${vendor.name} cover`}
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/60" />

        <div className="relative z-10 h-full flex items-end">
          <div className="max-w-6xl mx-auto w-full px-6 pb-10 flex flex-col md:flex-row gap-6 md:items-end">
            <div className="bg-white rounded-2xl p-2 shadow-xl w-fit">
              <Image
                src={vendor.logoUrl || "/placeholder.png"}
                width={120}
                height={120}
                alt={vendor.name}
                className="rounded-xl object-cover"
              />
            </div>

            <div className="flex-1 text-white space-y-3">
              {vendor.categories?.[0] && (
                <span className="inline-block px-4 py-1 rounded-full text-sm font-semibold bg-white/20 backdrop-blur">
                  {vendor.categories[0]}
                </span>
              )}

              <h1 className="text-4xl md:text-5xl font-bold">
                {vendor.name}
              </h1>

              <div className="flex items-center gap-2 text-white/90">
                <Star className="h-5 w-5 text-yellow-400" />
                <span className="font-semibold">
                  {vendor.rating ? vendor.rating.toFixed(1) : "4.9"}
                </span>
                <span className="text-sm text-white/70">(120 reviews)</span>
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
  {/* Address */}
  {vendor.address && (
    <div className="flex gap-2 items-start">
      <MapPin className="h-5 w-5 mt-0.5 text-gray-500" />
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          vendor.address
        )}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-gray-800 hover:text-purple-600 hover:underline transition"
      >
        {vendor.address}
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


          {/* PRODUCTS */}
          <div>
            <h2 className="text-3xl font-bold mb-6">Products</h2>

            {products.length === 0 ? (
              <p className="bg-white p-6 rounded-xl border">
                This vendor has not added any products yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                {products.map((product: any) => (
                  <div
                    key={product.id}
                    className="bg-white rounded-2xl shadow border overflow-hidden hover:shadow-xl transition"
                  >
                    <Image
                      src={product.images?.[0] || "/placeholder.png"}
                      width={600}
                      height={400}
                      alt={product.name}
                      className="h-52 w-full object-cover"
                    />

                    <div className="p-5">
                      <h3 className="text-lg font-semibold">
                        {product.name}
                      </h3>

                      <p className="text-purple-600 font-bold mt-1">
                        ${product.price}
                      </p>

                      <Link
                        href={`/store/${slug}/product/${product.id}`}
                        className="inline-block mt-3 text-sm font-semibold text-purple-600 hover:underline"
                      >
                        View Product →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT */}
        <div className="space-y-4">
          {vendor.phone && (
            <a
              href={`tel:${vendor.phone}`}
              className="block w-full text-center bg-purple-600 text-white py-3 rounded-xl font-semibold"
            >
              Call Now
            </a>
          )}
          {vendor.phone && (
            <a
              href={`https://wa.me/${vendor.phone.replace(/\D/g, "")}`}
              target="_blank"
              className="block w-full text-center bg-green-500 text-white py-3 rounded-xl font-semibold flex justify-center gap-2"
            >
              <MessageCircle className="h-5 w-5" />
              WhatsApp
            </a>
          )}
        </div>
      </section>
    </div>
  );
}
