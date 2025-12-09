import { db } from "@/lib/firebase/config";
import { collection, getDocs, query, where } from "firebase/firestore";
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

export default async function VendorStorefront(props: any) {
  const params = await props.params;
  const slug = params.slug;

  // Fetch vendor
  const vendorQuery = await getDocs(
    query(collection(db, "vendors"), where("slug", "==", slug))
  );

  if (vendorQuery.empty) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Vendor Not Found</h1>
          <p className="mt-2">This vendor may not exist or was removed.</p>
        </div>
      </div>
    );
  }

  const vendorDoc = vendorQuery.docs[0];
  const vendor = vendorDoc.data();
  const vendorId = vendorDoc.id;

  // Fetch products
  const productsSnap = await getDocs(
    query(collection(db, "products"), where("vendorId", "==", vendorId))
  );

  const products = productsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      {/* HEADER SECTION */}
<section className="bg-white border-b">
  <div className="max-w-6xl mx-auto px-6 py-12 flex flex-col md:flex-row gap-10">

    {/* LEFT: LOGO */}
    <div className="flex-shrink-0">
      <Image
        src={vendor.logoUrl || "/placeholder.png"}
        width={150}
        height={150}
        alt={vendor.name}
        className="rounded-2xl shadow-lg object-cover"
      />
    </div>

    {/* RIGHT: MAIN INFO */}
    <div className="flex-1 space-y-4">

      {/* NAME */}
      <h1 className="text-4xl font-bold text-gray-900">{vendor.name}</h1>

      {/* CATEGORY BADGE */}
      {vendor.categories?.[0] && (
        <span className="inline-block px-4 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">
          {vendor.categories[0]}
        </span>
      )}

      {/* RATING */}
      <div className="flex items-center gap-2 pt-1 text-gray-700">
        <Star className="text-yellow-500 h-5 w-5" />
        <span className="font-semibold text-gray-900">
          {vendor.rating ? vendor.rating.toFixed(1) : "4.9"}
        </span>
        <span className="text-gray-500 text-sm">(120 reviews)</span>
      </div>

      {/* CONTACT + ADDRESS */}
      <div className="space-y-2 text-gray-700">

        {/* Address */}
        {vendor.address && (
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-gray-500" />
            <span>{vendor.address}</span>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                vendor.address
              )}`}
              target="_blank"
              className="text-purple-600 underline text-sm"
            >
              View on Map
            </a>
          </div>
        )}

        {/* Phone */}
        {vendor.phone && (
          <div className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-gray-500" />
            <span>{vendor.phone}</span>
          </div>
        )}

        {/* Email */}
        {vendor.email && (
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-gray-500" />
            <span>{vendor.email}</span>
          </div>
        )}

        {/* Website */}
        {vendor.website && (
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-gray-500" />
            <a
              href={vendor.website}
              target="_blank"
              className="text-purple-600 underline"
            >
              {vendor.website}
            </a>
          </div>
        )}

        {/* Hours */}
        <p className="pt-2 text-gray-700">
          <strong className="font-semibold">Hours:</strong>{" "}
          {vendor.business_hours || "Open 7 days a week"}
        </p>

      </div>

      {/* ACTION BUTTONS */}
      <div className="flex flex-wrap gap-4 pt-4">

        {vendor.phone && (
          <a
            href={`tel:${vendor.phone}`}
            className="px-8 py-3 bg-purple-600 text-white rounded-xl font-semibold shadow hover:bg-purple-700 transition"
          >
            Call Now
          </a>
        )}

        {vendor.phone && (
          <a
            href={`https://wa.me/${vendor.phone.replace(/\D/g, "")}`}
            target="_blank"
            className="px-8 py-3 bg-green-500 text-white rounded-xl font-semibold shadow hover:bg-green-600 transition flex items-center gap-2"
          >
            <MessageCircle className="h-5 w-5" /> WhatsApp
          </a>
        )}

        {vendor.website && (
          <a
            href={vendor.website}
            target="_blank"
            className="px-8 py-3 bg-white border border-gray-300 text-gray-800 rounded-xl font-semibold shadow hover:bg-gray-100 transition"
          >
            Website
          </a>
        )}

      </div>

    </div>
  </div>
</section>


      {/* PRODUCTS */}
      <div className="max-w-6xl mx-auto px-6 mt-12">
        <h2 className="text-3xl font-bold mb-6">Products</h2>

        {products.length === 0 ? (
          <p className="text-gray-600 bg-white p-6 rounded-xl border text-sm shadow">
            This vendor has not added any products yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10">
            {products.map((product: any) => {
              // FIX PRODUCT IMAGE URL
              const img =
                product.imageUrl ||
                product.images?.[0] ||
                "/placeholder.png";

              return (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl shadow-md overflow-hidden border hover:shadow-xl transition"
                >
                  <Image
                    src={img}
                    width={600}
                    height={400}
                    alt={product.name}
                    className="h-52 w-full object-cover"
                  />
                  <div className="p-5">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {product.name}
                    </h3>

                    {product.price && (
                      <p className="text-purple-600 font-bold mt-1">
                        ${product.price}
                      </p>
                    )}

                    <Link
                      href={`/product/${product.id}`}
                      className="inline-block mt-3 text-sm font-semibold text-purple-600 hover:underline"
                    >
                      View Product →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
