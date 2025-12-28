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
  addDoc,
  collection,
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
  ShieldCheck,
} from "lucide-react";

import type {
  Product,
  ProductOptionGroup,
  ProductOptionItem,
} from "@/lib/types/firestore";

export default function AdminEditProductPage() {
  const { id: vendorId, productId } = useParams<{ id: string; productId: string }>();
  const router = useRouter();
  const storage = getStorage();

  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [vendorName, setVendorName] = useState<string>("");
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [newImage, setNewImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  /* ---------------- AUTH + ADMIN CHECK ---------------- */
  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.push("/login");
        return;
      }

      // Check for admin claim
      const tokenResult = await u.getIdTokenResult(true);
      if (tokenResult.claims.role !== "admin") {
        router.push("/");
        return;
      }

      setUser(u);
      setIsAdmin(true);
    });
  }, [router]);

  /* ---------------- LOAD VENDOR + PRODUCT ---------------- */
  useEffect(() => {
    if (!isAdmin || !vendorId || !productId) return;

    async function load() {
      try {
        // Load vendor name for breadcrumb
        const vendorSnap = await getDoc(doc(db, "vendors", vendorId));
        if (vendorSnap.exists()) {
          const vendorData = vendorSnap.data();
          setVendorName(vendorData.business_name || vendorData.name || "Vendor");
        }

        // Load product
        const productSnap = await getDoc(
          doc(db, "vendors", vendorId, "products", productId)
        );

        if (!productSnap.exists()) {
          alert("Product not found");
          router.push(`/admin/vendors/${vendorId}`);
          return;
        }

        setProduct({
          id: productSnap.id,
          ...(productSnap.data() as Omit<Product, "id">),
        });
      } catch (err) {
        console.error("Error loading product:", err);
        alert("Failed to load product");
        router.push(`/admin/vendors/${vendorId}`);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [isAdmin, vendorId, productId, router]);

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

  /* ---------------- AUDIT LOG ---------------- */
  async function logAudit(action: string, details?: Record<string, any>) {
    if (!user || !vendorId) return;

    try {
      await addDoc(collection(db, "admin_audit_logs"), {
        action,
        vendorId,
        productId,
        productName: product?.name,
        adminUid: user.uid,
        adminEmail: user.email,
        details,
        timestamp: serverTimestamp(),
      });
    } catch (err) {
      console.error("Failed to log audit:", err);
    }
  }

  /* ---------------- SAVE ---------------- */
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!product || !user || !vendorId) return;

    setSaving(true);

    try {
      let imageUrl = product.images?.[0] || "";

      if (newImage) {
        // Use vendorId for storage path to keep files organized under vendor
        const imgRef = ref(
          storage,
          `products/${vendorId}/${Date.now()}-${newImage.name}`
        );
        await uploadBytes(imgRef, newImage);
        imageUrl = await getDownloadURL(imgRef);
      }

      await updateDoc(
        doc(db, "vendors", vendorId, "products", product.id),
        {
          name: product.name,
          description: product.description || "",
          price: Number(product.price),
          images: imageUrl ? [imageUrl] : [],
          options: product.options || [],
          updated_at: serverTimestamp(),
          updated_by_admin: user.uid,
        }
      );

      await logAudit("admin_edit_product", {
        changes: {
          name: product.name,
          price: product.price,
        },
      });

      router.push(`/admin/vendors/${vendorId}`);
    } catch (error) {
      console.error("Error saving product:", error);
      alert("Failed to save product. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  /* ---------------- DELETE PRODUCT ---------------- */
  async function deleteProduct() {
    if (!product || !user || !vendorId) return;
    setDeleting(true);

    try {
      await deleteDoc(doc(db, "vendors", vendorId, "products", product.id));
      await logAudit("admin_delete_product");
      router.push(`/admin/vendors/${vendorId}`);
    } catch (error) {
      console.error("Error deleting product:", error);
      alert("Failed to delete product. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  /* ---------------- COMPUTED ---------------- */
  const currentImage = imagePreview || product?.images?.[0] || null;

  /* ---------------- LOADING STATE ---------------- */
  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-sb-primary mx-auto mb-3" />
          <p className="text-gray-500">Loading product...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Product not found</p>
          <button
            onClick={() => router.push(`/admin/vendors/${vendorId}`)}
            className="mt-4 text-sb-primary underline"
          >
            Back to Vendor
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/admin/vendors/${vendorId}`)}
              className="p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-semibold text-gray-900">Edit Product</h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                  <ShieldCheck className="w-3 h-3" />
                  Admin
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Editing as admin for: {vendorName}
              </p>
            </div>
          </div>

          <button
            type="submit"
            form="product-form"
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-sb-primary text-white rounded-lg text-sm font-medium hover:bg-sb-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </header>

      {/* Form */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        <form id="product-form" onSubmit={save} className="space-y-5">
          {/* Product Details Card */}
          <div className="bg-white rounded-xl shadow-sm border p-5 space-y-4">
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
                    alt="Product preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-12 h-12 text-gray-300" />
                  </div>
                )}
              </div>

              {/* Upload Controls */}
              <div className="flex-1 space-y-3">
                <label className="block">
                  <span className="sr-only">Choose product image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setNewImage(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-gray-500
                      file:mr-3 file:py-2 file:px-4
                      file:rounded-lg file:border-0
                      file:text-sm file:font-medium
                      file:bg-sb-primary/10 file:text-sb-primary
                      hover:file:bg-sb-primary/20
                      cursor-pointer"
                  />
                </label>

                {newImage && (
                  <button
                    type="button"
                    onClick={() => setNewImage(null)}
                    className="inline-flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                    Remove new image
                  </button>
                )}

                <p className="text-xs text-gray-500">
                  Recommended: Square image, at least 500x500px. Max 5MB.
                </p>
              </div>
            </div>
          </div>

          {/* Options Card */}
          <div className="bg-white rounded-xl shadow-sm border p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-sb-primary" />
                Product Options
              </h2>
              {(product.options?.length || 0) > 0 && (
                <button
                  type="button"
                  onClick={addOptionGroup}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-sb-primary hover:bg-purple-50 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Group
                </button>
              )}
            </div>

            {!product.options?.length ? (
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
                <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">
                  No option groups yet. Add groups like &quot;Size&quot;, &quot;Color&quot;, or
                  &quot;Add-ons&quot; to give customers choices.
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
                            No options yet. Add at least one.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {group.options.map((opt, oi) => (
                              <div
                                key={opt.id}
                                className="flex items-center gap-2"
                              >
                                <input
                                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sb-primary/20 focus:border-sb-primary"
                                  placeholder="Option label"
                                  value={opt.label}
                                  onChange={(e) =>
                                    updateOptionItem(gi, oi, "label", e.target.value)
                                  }
                                />
                                <div className="relative w-24">
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                                    +$
                                  </span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    className="w-full pl-7 pr-2 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sb-primary/20 focus:border-sb-primary"
                                    placeholder="0.00"
                                    value={opt.priceDelta || ""}
                                    onChange={(e) =>
                                      updateOptionItem(
                                        gi,
                                        oi,
                                        "priceDelta",
                                        Number(e.target.value) || 0
                                      )
                                    }
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeOptionItem(gi, oi)}
                                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
                          className="inline-flex items-center gap-1.5 text-sm text-sb-primary hover:text-sb-primary/80"
                        >
                          <Plus className="w-4 h-4" />
                          Add option
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Danger Zone */}
          <div className="bg-white rounded-xl shadow-sm border border-red-200 p-5">
            <h2 className="text-lg font-semibold text-red-600 flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5" />
              Danger Zone
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Permanently delete this product. This action cannot be undone.
            </p>

            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete Product
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={deleteProduct}
                  disabled={deleting}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {deleting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  {deleting ? "Deleting..." : "Confirm Delete"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}