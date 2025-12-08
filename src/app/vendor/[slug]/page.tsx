import { db } from "@/lib/firebase/config";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import Image from "next/image";
import Link from "next/link";

export default async function VendorStorefront({ params }: any) {
  const slug = params.slug;

  // Query vendor by slug
  const vendorQuery = await getDocs(
    query(collection(db, "vendors"), where("slug", "==", slug))
  );

  if (vendorQuery.empty) {
    return (
      <div className="p-10 text-center text-gray-600">
        <h1 className="text-3xl font-bold">Vendor Not Found</h1>
        <p className="mt-2 text-sm">This vendor may have been removed or is pending approval.</p>
      </div>
    );
  }

  const vendor = vendorQuery.docs[0].data();
  const vendorId = vendorQuery.docs[0].id;

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 space-y-14">
      
      {/* ===== Hero / Header Section ===== */}
      <div className="flex flex-col md:flex-row md:items-center gap-6 bg-white p-6 rounded-2xl shadow border">
        <Image
          src={vendor.logoUrl || "/placeholder.png"}
          width={140}
          height={140}
          alt={vendor.name}
          className="rounded-xl object-cover border"
        />

        <div className="flex-1">
          <h1 className="text-4xl font-bold text-gray-900">{vendor.name}</h1>

          {vendor.categories && (
            <div className="flex flex-wrap gap-2 mt-3">
              {vendor.categories.map((cat: string) => (
                <span
                  key={cat}
                  className="px-3 py-1 bg-sb-primary text-white rounded-full text-xs font-medium"
                >
                  {cat}
                </span>
              ))}
            </div>
          )}

          <p className="text-gray-500 mt-4">{vendor.address}</p>

          {/* Action Buttons */}
          <div className="flex gap-4 mt-5">
            {vendor.phone && (
              <a
                href={`tel:${vendor.phone}`}
                className="px-5 py-2 bg-sb-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 transition"
              >
                Call Now
              </a>
            )}

            {vendor.website && (
              <a
                href={vendor.website}
                target="_blank"
                className="px-5 py-2 bg-gray-100 border border-gray-300 rounded-xl text-sm font-semibold hover:bg-gray-200 transition"
              >
                Visit Website
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ===== About Section ===== */}
      <section className="bg-white p-6 rounded-2xl shadow border">
        <h2 className="text-2xl font-semibold mb-3">About {vendor.name}</h2>
        <p className="text-gray-700 leading-relaxed">{vendor.description}</p>
      </section>

      {/* ===== Products Section ===== */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Products</h2>

        {/* If they have no products */}
        {!vendor.products || vendor.products.length === 0 ? (
          <p className="text-gray-600 bg-white p-6 rounded-xl border text-sm">
            This vendor has not added any products yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {vendor.products.map((p: any) => (
              <div
                key={p.id}
                className="bg-white rounded-2xl shadow p-4 border hover:shadow-lg hover:-translate-y-1 transition"
              >
                <Image
                  src={p.image}
                  width={500}
                  height={350}
                  alt={p.name}
                  className="rounded-xl object-cover mb-4"
                />

                <h3 className="font-semibold text-lg text-gray-900">{p.name}</h3>
                <p className="text-sb-primary font-bold mt-1">${p.price}</p>

                <Link
                  href={`/product/${p.id}`}
                  className="mt-3 inline-block text-sm font-semibold text-sb-primary hover:underline"
                >
                  View Product →
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ===== Footer ===== */}
      <footer className="text-center text-gray-400 text-sm py-10">
        Powered by <span className="text-sb-primary font-semibold">StackBot Marketplace</span>
      </footer>

    </div>
  );
}
