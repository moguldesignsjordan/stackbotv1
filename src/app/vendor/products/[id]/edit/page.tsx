// MOBILE-FRIENDLY EDIT PAGE
// (Only changed UI, logic stays same)

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db, auth } from "@/lib/firebase/config";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const productId = params?.id;
  const router = useRouter();
  const storage = getStorage();

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [newImage, setNewImage] = useState<File | null>(null);

  useEffect(() => {
    async function load() {
      const snap = await getDoc(doc(db, "products", productId));
      if (snap.exists()) setProduct(snap.data());
      setLoading(false);
    }
    load();
  }, [productId]);

  const handleSave = async (e: any) => {
    e.preventDefault();
    setLoading(true);

    let imageUrl = product.images?.[0] || "";

    if (newImage) {
      const imgRef = ref(
        storage,
        `products/${auth.currentUser?.uid}/${Date.now()}-${newImage.name}`
      );
      await uploadBytes(imgRef, newImage);
      imageUrl = await getDownloadURL(imgRef);
    }

    await updateDoc(doc(db, "products", productId), {
      ...product,
      images: [imageUrl],
      updated_at: serverTimestamp(),
    });

    router.push("/vendor/products");
  };

  if (loading) return <p>Loading...</p>;
  if (!product) return <p>Product not found.</p>;

  return (
    <div className="max-w-xl mx-auto p-4 md:p-6 bg-white rounded-xl shadow">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">Edit Product</h1>

      <form onSubmit={handleSave} className="space-y-5">
        <div>
          <label className="font-medium">Name</label>
          <input
            className="mt-1 p-3 border w-full rounded-xl"
            value={product.name}
            onChange={(e) => setProduct({ ...product, name: e.target.value })}
          />
        </div>

        <div>
          <label className="font-medium">Price</label>
          <input
            className="mt-1 p-3 border w-full rounded-xl"
            type="number"
            value={product.price}
            onChange={(e) =>
              setProduct({ ...product, price: e.target.value })
            }
          />
        </div>

        <div>
          <label className="font-medium">Description</label>
          <textarea
            className="mt-1 p-3 border w-full rounded-xl"
            rows={4}
            value={product.description}
            onChange={(e) =>
              setProduct({ ...product, description: e.target.value })
            }
          ></textarea>
        </div>

        <div>
          <p className="font-medium mb-2">Current Image:</p>
          {product.images?.[0] && (
            <img
              src={product.images[0]}
              className="w-32 h-32 rounded-lg object-cover mb-3"
            />
          )}
          <input
            type="file"
            onChange={(e) => setNewImage(e.target.files?.[0] || null)}
          />
        </div>

        <button
          className="bg-sb-primary text-white p-3 rounded-xl font-semibold w-full active:scale-95"
        >
          Save Changes
        </button>
      </form>
    </div>
  );
}
