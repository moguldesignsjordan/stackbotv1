"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase/config";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

    await deleteDoc(doc(db, "vendors", user.uid, "products", productId));
    setProducts((prev) => prev.filter((p) => p.id !== productId));
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Your Products</h1>

        <Link
          href="/vendor/products/new"
          className="bg-sb-primary text-white px-5 py-2.5 rounded-xl font-medium"
        >
          + Add Product
        </Link>
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : products.length === 0 ? (
        <p>No products yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {products.map((p) => (
            <div key={p.id} className="bg-white border rounded-xl p-4">
              {p.images?.[0] && (
                <img
                  src={p.images[0]}
                  className="w-full h-40 rounded-lg object-cover"
                />
              )}

              <h3 className="font-semibold text-lg mt-2">{p.name}</h3>
              <p className="text-sb-primary font-bold">${p.price}</p>

              <div className="flex gap-4 mt-3 text-sm">
                {/* ✅ FIXED EDIT ROUTE */}
                <Link
                  href={`/vendor/products/${p.id}/edit`}
                  className="text-sb-primary font-semibold"
                >
                  Edit
                </Link>

                <button
                  onClick={() => deleteProduct(p.id)}
                  className="text-red-600 font-semibold"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
