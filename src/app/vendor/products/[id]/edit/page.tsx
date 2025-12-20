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
import { nanoid } from "nanoid";

import type {
  Product,
  ProductOptionGroup,
  ProductOptionItem,
} from "@/lib/types/firestore";

export default function EditProductPage() {
  const { id: productId } = useParams<{ id: string }>();
  const router = useRouter();
  const storage = getStorage();

  const [user, setUser] = useState<any>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newImage, setNewImage] = useState<File | null>(null);

  /* ---------------- AUTH ---------------- */
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      if (!u) router.push("/login");
      else setUser(u);
    });
  }, [router]);

  /* ---------------- LOAD PRODUCT ---------------- */
  useEffect(() => {
    if (!user || !productId) return;

    async function load() {
      const refDoc = doc(db, "vendors", user.uid, "products", productId);
      const snap = await getDoc(refDoc);

      if (!snap.exists()) {
        alert("Product not found");
        router.push("/vendor/products");
        return;
      }

      setProduct({
        id: snap.id,
        ...(snap.data() as Omit<Product, "id">),
      });

      setLoading(false);
    }

    load();
  }, [user, productId, router]);

  /* ---------------- OPTION HELPERS ---------------- */
  const addOptionGroup = () => {
    if (!product) return;
    setProduct({
      ...product,
      options: [
        ...(product.options || []),
        {
          id: nanoid(),
          title: "",
          type: "single",
          required: false,
          options: [],
        },
      ],
    });
  };

  const addOptionItem = (gi: number) => {
    if (!product) return;
    const updated = structuredClone(product.options || []);
    updated[gi].options.push({
      id: nanoid(),
      label: "",
      priceDelta: 0,
    });
    setProduct({ ...product, options: updated });
  };

  /* ---------------- SAVE ---------------- */
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!product || !user) return;

    setSaving(true);

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
        description: product.description || "",
        price: Number(product.price),
        images: imageUrl ? [imageUrl] : [],
        options: product.options || [],
        updated_at: serverTimestamp(),
      }
    );

    router.push("/vendor/products");
  }

  if (loading || !product) return <p className="p-6">Loading…</p>;

  /* ---------------- UI ---------------- */
  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow space-y-6">
      <h1 className="text-3xl font-bold">Edit Product</h1>

      <form onSubmit={save} className="space-y-5">

        <input
          className="w-full p-3 border rounded-xl"
          value={product.name}
          onChange={(e) =>
            setProduct({ ...product, name: e.target.value })
          }
          placeholder="Product name"
        />

        <input
          type="number"
          className="w-full p-3 border rounded-xl"
          value={product.price}
          onChange={(e) =>
            setProduct({ ...product, price: Number(e.target.value) })
          }
          placeholder="Price"
        />

        <textarea
          className="w-full p-3 border rounded-xl"
          value={product.description || ""}
          onChange={(e) =>
            setProduct({ ...product, description: e.target.value })
          }
          placeholder="Description"
        />

        {product.images?.[0] && (
          <img
            src={product.images[0]}
            className="w-32 h-32 object-cover rounded-lg"
          />
        )}

        <input
          type="file"
          accept="image/*"
          onChange={(e) => setNewImage(e.target.files?.[0] || null)}
        />

        {/* OPTIONS */}
        <div className="border rounded-xl p-4 space-y-4">
          <h2 className="font-semibold">Product Options</h2>

          {(product.options || []).map((group, gi) => (
            <div key={group.id} className="border rounded-lg p-3 space-y-2">
              <input
                className="w-full p-2 border rounded"
                placeholder="Group title"
                value={group.title}
                onChange={(e) => {
                  const updated = structuredClone(product.options || []);
                  updated[gi].title = e.target.value;
                  setProduct({ ...product, options: updated });
                }}
              />

              <select
                className="w-full p-2 border rounded"
                value={group.type}
                onChange={(e) => {
                  const updated = structuredClone(product.options || []);
                  updated[gi].type = e.target.value as any;
                  setProduct({ ...product, options: updated });
                }}
              >
                <option value="single">Single select</option>
                <option value="multiple">Multiple select</option>
              </select>

              <label className="flex gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={group.required}
                  onChange={(e) => {
                    const updated = structuredClone(product.options || []);
                    updated[gi].required = e.target.checked;
                    setProduct({ ...product, options: updated });
                  }}
                />
                Required
              </label>

              {group.options.map((opt, oi) => (
                <div key={opt.id} className="flex gap-2">
                  <input
                    className="flex-1 p-2 border rounded"
                    placeholder="Label"
                    value={opt.label}
                    onChange={(e) => {
                      const updated = structuredClone(product.options || []);
                      updated[gi].options[oi].label = e.target.value;
                      setProduct({ ...product, options: updated });
                    }}
                  />
                  <input
                    type="number"
                    className="w-24 p-2 border rounded"
                    placeholder="+$"
                    value={opt.priceDelta}
                    onChange={(e) => {
                      const updated = structuredClone(product.options || []);
                      updated[gi].options[oi].priceDelta = Number(e.target.value);
                      setProduct({ ...product, options: updated });
                    }}
                  />
                </div>
              ))}

              <button
                type="button"
                onClick={() => addOptionItem(gi)}
                className="text-sm text-sb-primary"
              >
                + Add Option
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={addOptionGroup}
            className="text-sb-primary font-semibold"
          >
            + Add Option Group
          </button>
        </div>

        <button
          disabled={saving}
          className="w-full bg-sb-primary text-white py-3 rounded-xl font-semibold"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
