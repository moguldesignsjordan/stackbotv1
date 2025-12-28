// src/app/vendor/products/[id]/edit/page.tsx
"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase/config";
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { nanoid } from "nanoid";
import {
  ArrowLeft,
  Trash2,
  Plus,
  GripVertical,
  ImageIcon,
  Package,
  Save,
  X,
  AlertTriangle,
  Loader2,
} from "lucide-react";

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
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Multi-image state
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);

  /* ---------------- AUTH ---------------- */
  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.push("/login");
        return;
      }
      setUser(u);

      // Fetch product
      const snap = await getDoc(
        doc(db, "vendors", u.uid, "products", productId!)
      );

      if (!snap.exists()) {
        router.push("/vendor/products");
        return;
      }

      const data = snap.data() as Product;
      setProduct({ ...data, id: snap.id });
      setExistingImages(data.images || []);
      setLoading(false);
    });
  }, [productId, router]);

  /* ---------------- NEW IMAGE PREVIEWS ---------------- */
  useEffect(() => {
    if (newImages.length === 0) {
      setNewImagePreviews([]);
      return;
    }
    const urls = newImages.map((file) => URL.createObjectURL(file));
    setNewImagePreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [newImages]);

  /* ---------------- IMAGE HANDLERS ---------------- */
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setNewImages([...newImages, ...Array.from(e.target.files)]);
    }
  };

  const removeExistingImage = (index: number) => {
    setExistingImages(existingImages.filter((_, i) => i !== index));
  };

  const removeNewImage = (index: number) => {
    setNewImages(newImages.filter((_, i) => i !== index));
  };

  async function uploadNewImages(): Promise<string[]> {
    if (!user) return [];
    const urls: string[] = [];
    for (const file of newImages) {
      const path = `products/${user.uid}/${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      urls.push(await getDownloadURL(storageRef));
    }
    return urls;
  }

  /* ---------------- OPTION GROUP HELPERS ---------------- */
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

  const removeOptionGroup = (groupIndex: number) => {
    if (!product) return;
    setProduct({
      ...product,
      options: (product.options || []).filter((_, i) => i !== groupIndex),
    });
  };

  const updateOptionGroup = (
    groupIndex: number,
    field: keyof ProductOptionGroup,
    value: any
  ) => {
    if (!product) return;
    const updated = structuredClone(product.options || []);
    (updated[groupIndex] as any)[field] = value;
    setProduct({ ...product, options: updated });
  };

  /* ---------------- OPTION ITEM HELPERS ---------------- */
  const addOptionItem = (groupIndex: number) => {
    if (!product) return;
    const updated = structuredClone(product.options || []);
    updated[groupIndex].options.push({
      id: nanoid(),
      label: "",
      priceDelta: 0,
    });
    setProduct({ ...product, options: updated });
  };

  const removeOptionItem = (groupIndex: number, optionIndex: number) => {
    if (!product) return;
    const updated = structuredClone(product.options || []);
    updated[groupIndex].options.splice(optionIndex, 1);
    setProduct({ ...product, options: updated });
  };

  const updateOptionItem = (
    groupIndex: number,
    optionIndex: number,
    field: keyof ProductOptionItem,
    value: any
  ) => {
    if (!product) return;
    const updated = structuredClone(product.options || []);
    (updated[groupIndex].options[optionIndex] as any)[field] = value;
    setProduct({ ...product, options: updated });
  };

  /* ---------------- SAVE ---------------- */
  async function saveProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !product) return;

    setSaving(true);

    try {
      // Upload any new images
      const uploadedUrls = await uploadNewImages();

      // Combine existing + new images
      const allImages = [...existingImages, ...uploadedUrls];

      await updateDoc(doc(db, "vendors", user.uid, "products", product.id), {
        name: product.name,
        description: product.description || "",
        price: Number(product.price),
        images: allImages,
        options: product.options || [],
        updated_at: serverTimestamp(),
      });

      router.push("/vendor/products");
    } catch (error) {
      console.error("Error saving product:", error);
      alert("Failed to save product. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  /* ---------------- DELETE ---------------- */
  async function confirmDelete() {
    if (!user || !product) return;

    setDeleting(true);
    try {
      await deleteDoc(doc(db, "vendors", user.uid, "products", product.id));
      router.push("/vendor/products");
    } catch (error) {
      console.error("Error deleting product:", error);
      alert("Failed to delete product. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  /* ---------------- LOADING / ERROR STATES ---------------- */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-sb-primary" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">Product not found</p>
      </div>
    );
  }

  const totalImages = existingImages.length + newImages.length;

  return (
    <form onSubmit={saveProduct} className="space-y-6 p-4 md:p-6 max-w-3xl pb-32">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sb-primary hover:underline font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          className="inline-flex items-center gap-2 text-red-600 hover:text-red-700 font-medium"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold">Edit Product</h1>

      {/* Basic Info Card */}
      <div className="bg-white rounded-xl shadow-sm border p-5 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Package className="w-5 h-5 text-sb-primary" />
          Product Details
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Product Name *
            </label>
            <input
              type="text"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sb-primary/20 focus:border-sb-primary transition-colors"
              value={product.name || ""}
              onChange={(e) => setProduct({ ...product, name: e.target.value })}
              placeholder="Product name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Price (RD$) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sb-primary/20 focus:border-sb-primary transition-colors"
              value={product.price ?? ""}
              onChange={(e) =>
                setProduct({
                  ...product,
                  price: e.target.value ? Number(e.target.value) : 0,
                })
              }
              placeholder="0.00"
              required
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description
            </label>
            <textarea
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sb-primary/20 focus:border-sb-primary transition-colors resize-none"
              rows={3}
              value={product.description || ""}
              onChange={(e) =>
                setProduct({ ...product, description: e.target.value })
              }
              placeholder="Describe your product..."
            />
          </div>
        </div>
      </div>

      {/* Image Card - Multi Upload */}
      <div className="bg-white rounded-xl shadow-sm border p-5 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-sb-primary" />
          Product Images
          <span className="text-sm font-normal text-gray-500">
            ({totalImages} image{totalImages !== 1 ? "s" : ""})
          </span>
        </h2>

        {/* Image Previews Grid */}
        {(existingImages.length > 0 || newImagePreviews.length > 0) && (
          <div className="flex flex-wrap gap-3">
            {/* Existing Images */}
            {existingImages.map((url, index) => (
              <div key={`existing-${index}`} className="relative group">
                <img
                  src={url}
                  alt={`Product ${index + 1}`}
                  className="w-24 h-24 object-cover rounded-lg border"
                />
                <button
                  type="button"
                  onClick={() => removeExistingImage(index)}
                  className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                >
                  <X className="w-3 h-3" />
                </button>
                {index === 0 && (
                  <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">
                    Main
                  </span>
                )}
              </div>
            ))}

            {/* New Image Previews */}
            {newImagePreviews.map((url, index) => (
              <div key={`new-${index}`} className="relative group">
                <img
                  src={url}
                  alt={`New ${index + 1}`}
                  className="w-24 h-24 object-cover rounded-lg border border-green-300"
                />
                <button
                  type="button"
                  onClick={() => removeNewImage(index)}
                  className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                >
                  <X className="w-3 h-3" />
                </button>
                <span className="absolute bottom-1 left-1 text-[10px] bg-green-500 text-white px-1.5 py-0.5 rounded">
                  New
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Upload Area */}
        <label className="block border-2 border-dashed border-gray-200 rounded-xl p-6 cursor-pointer hover:border-sb-primary/50 hover:bg-sb-primary/5 transition-colors">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageSelect}
            className="hidden"
          />
          <div className="text-center">
            <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">
              <span className="text-sb-primary font-medium">Click to upload</span>{" "}
              or drag and drop
            </p>
            <p className="text-xs text-gray-400 mt-1">
              PNG, JPG up to 10MB each • First image is the main image
            </p>
          </div>
        </label>
      </div>

      {/* Product Options Card */}
      <div className="bg-white rounded-xl shadow-sm border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Product Options</h2>
          <button
            type="button"
            onClick={addOptionGroup}
            className="flex items-center gap-1.5 text-sm font-medium text-sb-primary hover:text-sb-primary/80 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Group
          </button>
        </div>

        {(!product.options || product.options.length === 0) ? (
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
            <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              No option groups yet. Add groups like &quot;Size&quot;,
              &quot;Color&quot;, or &quot;Add-ons&quot;.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {product.options.map((group, groupIndex) => (
              <div
                key={group.id}
                className="border rounded-xl p-4 space-y-4 bg-gray-50"
              >
                {/* Group Header */}
                <div className="flex items-start gap-3">
                  <GripVertical className="w-5 h-5 text-gray-400 mt-2.5 cursor-grab" />

                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={group.title}
                      onChange={(e) =>
                        updateOptionGroup(groupIndex, "title", e.target.value)
                      }
                      placeholder="Group name (e.g., Size)"
                      className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-sb-primary/20 focus:border-sb-primary"
                    />

                    <select
                      value={group.type || "single"}
                      onChange={(e) =>
                        updateOptionGroup(groupIndex, "type", e.target.value)
                      }
                      className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-sb-primary/20 focus:border-sb-primary"
                    >
                      <option value="single">Single choice</option>
                      <option value="multiple">Multiple choices</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeOptionGroup(groupIndex)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Options List */}
                <div className="pl-8 space-y-2">
                  {group.options.map((option, optionIndex) => (
                    <div key={option.id} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={option.label}
                        onChange={(e) =>
                          updateOptionItem(
                            groupIndex,
                            optionIndex,
                            "label",
                            e.target.value
                          )
                        }
                        placeholder="Option label"
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sb-primary/20 focus:border-sb-primary"
                      />
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                          +RD$
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          value={option.priceDelta || ""}
                          onChange={(e) =>
                            updateOptionItem(
                              groupIndex,
                              optionIndex,
                              "priceDelta",
                              e.target.value ? Number(e.target.value) : 0
                            )
                          }
                          placeholder="0"
                          className="w-28 pl-12 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sb-primary/20 focus:border-sb-primary"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeOptionItem(groupIndex, optionIndex)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => addOptionItem(groupIndex)}
                    className="text-sm text-sb-primary hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Add option
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="fixed bottom-0 left-0 right-0 lg:static bg-white lg:bg-transparent border-t lg:border-0 p-4 lg:p-0 z-40">
        <button
          type="submit"
          disabled={saving}
          className="w-full lg:w-auto inline-flex items-center justify-center gap-2 bg-sb-primary text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-sb-primary/90 disabled:opacity-50 transition-colors"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Save Changes
            </>
          )}
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-semibold">Delete Product?</h3>
            </div>
            <p className="text-gray-600">
              This will permanently delete &quot;{product.name}&quot;. This action cannot
              be undone.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}