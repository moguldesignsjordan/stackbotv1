"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase/config";
import { collection, getDocs } from "firebase/firestore";
import Link from "next/link";

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const user = auth.currentUser;
      if (!user) return;

      // ✨ READ FROM SUBCOLLECTION
      const snap = await getDocs(collection(db, "vendors", user.uid, "products"));

      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }

    load();
  }, []);

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
            <Link
              href={`/vendor/products/${p.id}`}
              key={p.id}
              className="bg-white shadow rounded-xl p-4 border hover:shadow-lg transition"
            >
              {p.images?.[0] && (
                <img src={p.images[0]} className="w-full h-40 rounded-lg object-cover" />
              )}

              <h3 className="font-semibold text-lg mt-2">{p.name}</h3>
              <p className="text-sb-primary font-bold">${p.price}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
