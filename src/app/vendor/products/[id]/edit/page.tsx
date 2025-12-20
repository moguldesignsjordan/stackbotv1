"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase/config";
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const productId = params?.id;
  const router = useRouter();
  const storage = getStorage();

  const [user, setUser] = useState<any>(null);
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newImage, setNewImage] = useState<File | null>(null);

  /* ---------------- AUTH ---------------- */
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.push("/login");
        return;
      }
      setUser(u);
    });
  }, [router]);

  /* ---------------- LOAD PRODUCT ---------------- */
  useEffect(() => {
    if (!user || !productId) return;

    async function loadProduct() {
      setLoading(true);

      const productRef = doc(
        db,
        "vendors",
        user.uid,
        "products",
        productId
      );

      const snap = await getDoc(productRef);

      if (!snap.exists()) {
        alert("Product not found");
        router.push("/vendor/products");
        return;
      }

      setProduct({ id: snap.id, ...snap.data() });
      setLoading(false);
    }

    loadProduct();
  }, [user, productId, router]);

  /* ---------------- SAVE ---------------- */
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !product) return;

    setSaving(true);

    try {
      let imageUrl = product.images?.[0] || "";

      if (newImage) {
        const imgRef = ref(
          storage,
          `products/${user.uid}/${Date.now()}-${newImage.name}`
        );
        await uploadBytes(imgRef, newImage);
        imageUrl = await getDownloadURL(imgRef);
      }

      await updateDoc(
        doc(db, "vendors", user.uid, "products", product.id),
        {
          name: product.name,
          price: Number(product.price),
          description: product.description || "",
          images: imageUrl ? [imageUrl] : [],
          updated_at: serverTimestamp(),
        }
      );

      alert("Product updated");
      router.push("/vendor/products");
    } catch (err) {
      console.error(err);
      alert("Failed to save product");
    }

    setSaving(false);
  }

  /* ---------------- STATES ---------------- */
  if (loading) return <p className="p-6">Loading…</p>;
  if (!product) return null;

  /* ---------------- UI ---------------- */
  return (
    <div className="max-w-xl mx-auto p-4 md:p-6 bg-white rounded-xl shadow">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">
        Edit Product
      </h1>

      <form onSubmit={handleSave} className="space-y-5">
        <div>
          <label className="font-medium">Product Name</label>
          <input
            className="mt-1 p-3 border w-full rounded-xl"
            value={product.name}
            onChange={(e) =>
              setProduct({ ...product, name: e.target.value })
            }
            required
          />
        </div>

        <div>
          <label className="font-medium">Price</label>
          <input
            type="number"
            className="mt-1 p-3 border w-full rounded-xl"
            value={product.price}
            onChange={(e) =>
              setProduct({ ...product, price: e.target.value })
            }
            required
          />
        </div>

        <div>
          <label className="font-medium">Description</label>
          <textarea
            rows={4}
            className="mt-1 p-3 border w-full rounded-xl"
            value={product.description || ""}
            onChange={(e) =>
              setProduct({ ...product, description: e.target.value })
            }
          />
        </div>

        <div>
          <p className="font-medium mb-2">Current Image</p>
          {product.images?.[0] && (
            <img
              src={product.images[0]}
              className="w-32 h-32 rounded-lg object-cover mb-3"
            />
          )}

          <input
            type="file"
            accept="image/*"
            onChange={(e) =>
              setNewImage(e.target.files?.[0] || null)
            }
          />
        </div>

        <button
          disabled={saving}
          className="bg-sb-primary text-white p-3 rounded-xl font-semibold w-full active:scale-95 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
