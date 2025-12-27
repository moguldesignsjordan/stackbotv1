"use client";

/* eslint-disable @next/next/no-img-element */
// Note: Using <img> because currentImage can be a blob URL (from preview) 
// or a Firebase Storage URL - both require special handling for next/image

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
  const [newImage, setNewImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  /* ---------------- IMAGE PREVIEW ---------------- */
  useEffect(() => {
    if (!newImage) {
      setImagePreview(null);
      return;
    }
    const url = URL.createObjectURL(newImage);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [newImage]);

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
    const updated = [...(product.options || [])];
    updated.splice(groupIndex, 1);
    setProduct({ ...product, options: updated });
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
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!product || !user) return;

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
          description: product.description || "",
          price: Number(product.price),
          images: imageUrl ? [imageUrl] : [],
          options: product.options || [],
          updated_at: serverTimestamp(),
        }
      );

      router.push("/vendor/products");
    } catch (error) {
      console.error("Error saving product:", error);
      alert("Failed to save product. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  /* ---------------- DELETE PRODUCT ---------------- */
  async function deleteProduct() {
    if (!product || !user) return;
    setDeleting(true);

    try {
      await deleteDoc(doc(db, "vendors", user.uid, "products", product.id));
      router.push("/vendor/products");
    } catch (error) {
      console.error("Error deleting product:", error);
      alert("Failed to delete product. Please try again.");
      setDeleting(false);
    }
  }

  /* ---------------- LOADING STATE ---------------- */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-sb-primary" />
          <p className="text-gray-600">Loading product...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">Product not found</p>
        </div>
      </div>
    );
  }

  const currentImage = imagePreview || product.images?.[0];

  /* ---------------- UI ---------------- */
  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push("/vendor/products")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Back to Products</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Delete</span>
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={save} className="max-w-3xl mx-auto px-4 pt-6 space-y-6">
        {/* Basic Info Card */}
        <div className="bg-white rounded-xl shadow-sm border p-5 space-y-5">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-sb-primary" />
            Product Details
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sb-primary/20 focus:border-sb-primary transition-colors"
                value={product.name}
                onChange={(e) => setProduct({ ...product, name: e.target.value })}
                placeholder="Enter product name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Price <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sb-primary/20 focus:border-sb-primary transition-colors"
                  value={product.price}
                  onChange={(e) =>
                    setProduct({ ...product, price: Number(e.target.value) })
                  }
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div>
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

        {/* Image Card */}
        <div className="bg-white rounded-xl shadow-sm border p-5 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-sb-primary" />
            Product Image
          </h2>

          <div className="flex flex-col sm:flex-row gap-4">
            {/* Current/Preview Image */}
            <div className="w-full sm:w-40 h-40 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
              {currentImage ? (
                <img
                  src={currentImage}
                  alt={product.name || "Product image"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-10 h-10 text-gray-300" />
                </div>
              )}
            </div>

            {/* Upload Area */}
            <div className="flex-1">
              <label className="block border-2 border-dashed border-gray-200 rounded-xl p-6 cursor-pointer hover:border-sb-primary/50 hover:bg-sb-primary/5 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setNewImage(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <div className="text-center">
                  <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    <span className="text-sb-primary font-medium">
                      Click to upload
                    </span>{" "}
                    or drag and drop
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    PNG, JPG up to 10MB
                  </p>
                </div>
              </label>

              {newImage && (
                <div className="mt-2 flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-sm text-gray-600 truncate">
                    {newImage.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setNewImage(null)}
                    className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Product Options Card */}
        <div className="bg-white rounded-xl shadow-sm border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Product Options
            </h2>
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
                No option groups yet. Add groups like "Size", "Color", or
                "Add-ons" to give customers choices.
              </p>
              <button
                type="button"
                onClick={addOptionGroup}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-sb-primary text-white rounded-lg text-sm font-medium hover:bg-sb-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Option Group
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {product.options.map((group, gi) => (
                <div
                  key={group.id}
                  className="border border-gray-200 rounded-xl overflow-hidden"
                >
                  {/* Group Header */}
                  <div className="bg-gray-50 px-4 py-3 flex items-center gap-3 border-b">
                    <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
                    <div className="flex-1 min-w-0">
                      <input
                        className="w-full bg-transparent font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none"
                        placeholder="Group title (e.g., Size, Color)"
                        value={group.title}
                        onChange={(e) =>
                          updateOptionGroup(gi, "title", e.target.value)
                        }
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeOptionGroup(gi)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete group"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Group Body */}
                  <div className="p-4 space-y-4">
                    {/* Group Settings */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Selection Type
                        </label>
                        <select
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sb-primary/20 focus:border-sb-primary"
                          value={group.type}
                          onChange={(e) =>
                            updateOptionGroup(gi, "type", e.target.value)
                          }
                        >
                          <option value="single">Single select</option>
                          <option value="multiple">Multiple select</option>
                        </select>
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                          <input
                            type="checkbox"
                            checked={group.required}
                            onChange={(e) =>
                              updateOptionGroup(gi, "required", e.target.checked)
                            }
                            className="w-4 h-4 text-sb-primary border-gray-300 rounded focus:ring-sb-primary"
                          />
                          <span className="text-sm text-gray-700">Required</span>
                        </label>
                      </div>
                    </div>

                    {/* Options List */}
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-gray-500">
                        Options
                      </label>

                      {group.options.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">
                          No options added yet
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {group.options.map((opt, oi) => (
                            <div
                              key={opt.id}
                              className="flex items-center gap-2 group"
                            >
                              <GripVertical className="w-4 h-4 text-gray-300 cursor-grab flex-shrink-0" />
                              <input
                                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sb-primary/20 focus:border-sb-primary"
                                placeholder="Option label"
                                value={opt.label}
                                onChange={(e) =>
                                  updateOptionItem(gi, oi, "label", e.target.value)
                                }
                              />
                              <div className="relative w-24 flex-shrink-0">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                                  +$
                                </span>
                                <input
                                  type="number"
                                  step="0.01"
                                  className="w-full pl-8 pr-2 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sb-primary/20 focus:border-sb-primary"
                                  placeholder="0"
                                  value={opt.priceDelta || ""}
                                  onChange={(e) =>
                                    updateOptionItem(
                                      gi,
                                      oi,
                                      "priceDelta",
                                      Number(e.target.value)
                                    )
                                  }
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => removeOptionItem(gi, oi)}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                title="Delete option"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => addOptionItem(gi)}
                        className="flex items-center gap-1.5 text-sm text-sb-primary hover:text-sb-primary/80 font-medium mt-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add Option
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="sticky bottom-4 bg-white rounded-xl shadow-lg border p-4">
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-sb-primary text-white py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-sb-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
      </form>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Delete Product
                </h3>
                <p className="text-sm text-gray-500">
                  This action cannot be undone
                </p>
              </div>
            </div>

            <p className="text-gray-600">
              Are you sure you want to delete{" "}
              <span className="font-medium text-gray-900">{product.name}</span>?
              This will permanently remove the product and all its options.
            </p>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={deleteProduct}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}