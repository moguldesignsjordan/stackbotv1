"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase/config";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import Image from "next/image";
import { Package, Plus, Edit, Trash2, Loader2 } from "lucide-react";
import { formatPrice } from "@/lib/utils/currency";

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) return setLoading(false);

      const snap = await getDocs(
        collection(db, "vendors", user.uid, "products")
      );

      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, []);

  async function deleteProduct(productId: string) {
    if (!confirm("Delete this product permanently?")) return;
    const user = auth.currentUser;
    if (!user) return;

    setDeleting(productId);
    try {
      await deleteDoc(doc(db, "vendors", user.uid, "products", productId));
      setProducts((prev) => prev.filter((p) => p.id !== productId));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Your Products</h1>

        <Link
          href="/vendor/products/new"
          className="inline-flex items-center gap-2 bg-sb-primary text-white px-5 py-2.5 rounded-xl font-medium hover:bg-sb-primary/90 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Product
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-sb-primary" />
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No products yet</h2>
          <p className="text-gray-500 mb-6">Add your first product to start selling.</p>
          <Link
            href="/vendor/products/new"
            className="inline-flex items-center gap-2 bg-sb-primary text-white px-6 py-3 rounded-xl font-medium hover:bg-sb-primary/90 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Your First Product
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => (
            <div key={p.id} className="bg-white border rounded-xl overflow-hidden hover:shadow-md transition-shadow">
              {/* Product Image */}
              <div className="relative aspect-[4/3] bg-gray-100">
                {p.images?.[0] ? (
                  <Image
                    src={p.images[0]}
                    alt={p.name || "Product image"}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Package className="w-12 h-12 text-gray-300" />
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="p-4">
                <h3 className="font-semibold text-lg text-gray-900 line-clamp-1">{p.name}</h3>
                <p className="text-sb-primary font-bold text-lg mt-1">
                  {formatPrice(typeof p.price === "number" ? p.price : 0)}
                </p>

                {/* Actions */}
                <div className="flex gap-3 mt-4 pt-4 border-t">
                  <Link
                    href={`/vendor/products/${p.id}/edit`}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sb-primary bg-purple-50 rounded-lg font-medium hover:bg-purple-100 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </Link>

                  <button
                    onClick={() => deleteProduct(p.id)}
                    disabled={deleting === p.id}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-red-600 bg-red-50 rounded-lg font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    {deleting === p.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}