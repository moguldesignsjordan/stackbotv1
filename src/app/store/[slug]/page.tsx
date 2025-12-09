import { db } from "@/lib/firebase/config";
import { collection, getDocs, query, where } from "firebase/firestore";
import Image from "next/image";
import Link from "next/link";

export default async function VendorStorefront(props: any) {
  // Next.js 16 bug: params is a Promise → must await it
  const params = await props.params;
  const slug = params.slug;

  // Load vendor by slug
  const vendorQuery = await getDocs(
    query(collection(db, "vendors"), where("slug", "==", slug))
  );

  if (vendorQuery.empty) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        <div>
          <h1 className="text-3xl font-bold text-center">Vendor Not Found</h1>
          <p className="text-center mt-2">This vendor may not exist or was removed.</p>
        </div>
      </div>
    );
  }

  const vendorDoc = vendorQuery.docs[0];
  const vendor = vendorDoc.data();
  const vendorId = vendorDoc.id;

  // Load products
  const productsSnap = await getDocs(
    query(collection(db, "products"), where("vendorId", "==", vendorId))
  );

  const products = productsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      {/* HEADER */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center gap-10">
          <div className="flex-shrink-0">
            <Image
              src={vendor.logoUrl || "/placeholder.png"}
              width={160}
              height={160}
              alt={vendor.name}
              className="rounded-2xl border shadow-md object-cover"
            />
          </div>

          <div className="flex-1">
            <h1 className="text-4xl font-bold text-gray-900">{vendor.name}</h1>

            <div className="flex flex-wrap gap-2 mt-3">
              {vendor.categories?.map((cat: string) => (
                <span
                  key={cat}
                  className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium"
                >
                  {cat}
                </span>
              ))}
            </div>

            <p className="text-gray-600 mt-4">{vendor.address}</p>

            <div className="flex gap-4 mt-5">
              {vendor.phone && (
                <a
                  href={`tel:${vendor.phone}`}
                  className="px-6 py-2 bg-purple-600 text-white rounded-xl shadow hover:bg-purple-700 transition font-semibold"
                >
                  Call Now
                </a>
              )}

              {vendor.website && (
                <a
                  href={vendor.website}
                  target="_blank"
                  className="px-6 py-2 bg-white border border-gray-300 rounded-xl shadow-sm hover:bg-gray-100 transition font-semibold"
                >
                  Visit Website
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ABOUT */}
      <div className="max-w-6xl mx-auto px-6 mt-10">
        <div className="bg-white p-8 rounded-2xl shadow border">
          <h2 className="text-2xl font-bold mb-3">About {vendor.name}</h2>
          <p className="text-gray-700 text-lg leading-relaxed">{vendor.description}</p>
        </div>
      </div>

      {/* PRODUCTS */}
      <div className="max-w-6xl mx-auto px-6 mt-12">
        <h2 className="text-3xl font-bold mb-6">Products</h2>

        {products.length === 0 ? (
          <p className="text-gray-600 bg-white p-6 rounded-xl border text-sm shadow">
            This vendor has not added any products yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10">
            {products.map((product: any) => (
              <div
                key={product.id}
                className="bg-white rounded-2xl shadow-md overflow-hidden border hover:shadow-xl transition"
              >
                <Image
                  src={product.imageUrl || "/placeholder.png"}
                  width={600}
                  height={400}
                  alt={product.name}
                  className="h-52 w-full object-cover"
                />

                <div className="p-5">
                  <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
                  {product.price && (
                    <p className="text-purple-600 font-bold mt-1">${product.price}</p>
                  )}

                  <Link
                    href={`/product/${product.id}`}
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
  );
}
