"use client";

import { useState } from "react";
import { auth, db, storage } from "@/lib/firebase/config";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useRouter } from "next/navigation";

export default function CreateProductPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [desc, setDesc] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  const handleImageSelect = (e: any) => {
    setImages([...e.target.files]);
  };

  async function uploadImages(vendorId: string) {
    const urls: string[] = [];

    for (let file of images) {
      const path = `products/${vendorId}/${Date.now()}-${file.name}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      urls.push(await getDownloadURL(storageRef));
    }

    return urls;
  }

  async function createProduct(e: any) {
    e.preventDefault();
    setLoading(true);

    try {
      const user = auth.currentUser;
      if (!user) return alert("You must be logged in");

      const vendorId = user.uid;
      const imageUrls = await uploadImages(vendorId);

      // ✨ WRITE TO SUBCOLLECTION
      await addDoc(collection(db, "vendors", vendorId, "products"), {
        name,
        description: desc,
        price: parseFloat(price),
        images: imageUrls,
        vendorId,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });

      router.push("/vendor/products");
    } catch (err: any) {
      alert(err.message);
    }

    setLoading(false);
  }

  return (
    <div className="max-w-xl mx-auto p-4 md:p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">Add New Product</h1>

      <form className="space-y-5" onSubmit={createProduct}>
        <div>
          <label className="block font-medium mb-1">Product Name</label>
          <input
            className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-sb-primary"
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block font-medium mb-1">Price (USD)</label>
          <input
            type="number"
            className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-sb-primary"
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block font-medium mb-1">Description</label>
          <textarea
            rows={4}
            className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-sb-primary"
            onChange={(e) => setDesc(e.target.value)}
          />
        </div>

        <div>
          <label className="block font-medium mb-1">Product Images</label>
          <input type="file" multiple accept="image/*" onChange={handleImageSelect} />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-sb-primary text-white py-3 rounded-xl font-semibold shadow-md active:scale-95"
        >
          {loading ? "Creating..." : "Create Product"}
        </button>
      </form>
    </div>
  );
}
