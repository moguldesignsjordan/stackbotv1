"use client";

import { useState } from "react";
import { auth, db, storage } from "@/lib/firebase/config";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useRouter } from "next/navigation";
import { nanoid } from "nanoid";

export default function CreateProductPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [desc, setDesc] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [options, setOptions] = useState<any[]>([]);
  const [customFields, setCustomFields] = useState<any[]>([]);
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

  const addOptionGroup = () => {
    setOptions([
      ...options,
      {
        id: nanoid(),
        title: "",
        type: "single",
        required: false,
        options: [],
      },
    ]);
  };

  const addOptionItem = (groupIndex: number) => {
    const updated = [...options];
    updated[groupIndex].options.push({
      id: nanoid(),
      label: "",
      priceDelta: 0,
    });
    setOptions(updated);
  };

  async function createProduct(e: any) {
    e.preventDefault();
    setLoading(true);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not logged in");

      const imageUrls = await uploadImages(user.uid);

      await addDoc(collection(db, "vendors", user.uid, "products"), {
        name,
        description: desc,
        price: parseFloat(price),
        images: imageUrls,
        vendorId: user.uid,
        options,
        customFields,
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
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold">Add Product</h1>

      <form onSubmit={createProduct} className="space-y-5">

        {/* BASIC INFO */}
        <input
          placeholder="Product name"
          className="w-full p-3 border rounded-xl"
          onChange={(e) => setName(e.target.value)}
          required
        />

        <input
          type="number"
          placeholder="Base price"
          className="w-full p-3 border rounded-xl"
          onChange={(e) => setPrice(e.target.value)}
          required
        />

        <textarea
          placeholder="Description"
          className="w-full p-3 border rounded-xl"
          onChange={(e) => setDesc(e.target.value)}
        />

        <input type="file" multiple onChange={handleImageSelect} />

        {/* OPTIONS BUILDER */}
        <div className="border rounded-xl p-4 space-y-4">
          <h2 className="font-semibold">Product Options</h2>

          {options.map((group, gi) => (
            <div key={group.id} className="border rounded-lg p-3 space-y-2">
              <input
                placeholder="Option Group Title (e.g. Size)"
                className="w-full p-2 border rounded"
                onChange={(e) => {
                  const updated = [...options];
                  updated[gi].title = e.target.value;
                  setOptions(updated);
                }}
              />

              <select
                className="w-full p-2 border rounded"
                onChange={(e) => {
                  const updated = [...options];
                  updated[gi].type = e.target.value;
                  setOptions(updated);
                }}
              >
                <option value="single">Single Select</option>
                <option value="multiple">Multiple Select</option>
              </select>

              {group.options.map((opt: any, oi: number) => (
                <div key={opt.id} className="flex gap-2">
                  <input
                    placeholder="Label"
                    className="flex-1 p-2 border rounded"
                    onChange={(e) => {
                      const updated = [...options];
                      updated[gi].options[oi].label = e.target.value;
                      setOptions(updated);
                    }}
                  />
                  <input
                    type="number"
                    placeholder="+$"
                    className="w-24 p-2 border rounded"
                    onChange={(e) => {
                      const updated = [...options];
                      updated[gi].options[oi].priceDelta = parseFloat(e.target.value);
                      setOptions(updated);
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
          disabled={loading}
          className="w-full bg-sb-primary text-white py-3 rounded-xl font-semibold"
        >
          {loading ? "Saving..." : "Create Product"}
        </button>
      </form>
    </div>
  );
}
