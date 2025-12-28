"use client";

/* eslint-disable @next/next/no-img-element */

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { onAuthStateChanged, getIdTokenResult } from "firebase/auth";
import { auth, db, storage } from "@/lib/firebase/config";
import {
  addDoc,
  collection,
  serverTimestamp,
  doc,
  getDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
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
  Loader2,
  Store,
  Shield,
} from "lucide-react";

import type {
  ProductOptionGroup,
  ProductOptionItem,
} from "@/lib/types/firestore";

interface Vendor {
  id: string;
  name?: string;
  business_name?: string;
}

export default function AdminAddProductPage() {
  const router = useRouter();
  const { id: vendorId } = useParams<{ id: string }>();

  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vendor, setVendor] = useState<Vendor | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [price, setPrice] = useState<number | "">("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [options, setOptions] = useState<ProductOptionGroup[]>([]);

  /* ---------------- AUTH + ADMIN CHECK ---------------- */
  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.push("/login");
        return;
      }

      try {
        const tokenResult = await getIdTokenResult(u);
        if (tokenResult.claims.role !== "admin") {
          router.push("/");
          return;
        }
        setIsAdmin(true);
        setUser(u);
      } catch (err) {
        console.error("Error checking admin role:", err);
        router.push("/");
      }
    });
  }, [router]);

  /* ---------------- LOAD VENDOR ---------------- */
  useEffect(() => {
    if (!vendorId || !isAdmin) return;

    const loadVendor = async () => {
      try {
        const vendorDoc = await getDoc(doc(db, "vendors", vendorId));
        if (vendorDoc.exists()) {
          setVendor({
            id: vendorDoc.id,
            ...vendorDoc.data(),
          } as Vendor);
        }
      } catch (err) {
        console.error("Error loading vendor:", err);
      } finally {
        setLoading(false);
      }
    };

    loadVendor();
  }, [vendorId, isAdmin]);

  /* ---------------- IMAGE PREVIEW ---------------- */
  useEffect(() => {
    if (images.length === 0) {
      setImagePreviews([]);
      return;
    }
    const urls = images.map((file) => URL.createObjectURL(file));
    setImagePreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [images]);

  /* ---------------- IMAGE HANDLERS ---------------- */
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImages([...images, ...Array.from(e.target.files)]);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  async function uploadImages(): Promise<string[]> {
    if (!vendorId) return [];
    const urls: string[] = [];
    for (const file of images) {
      const path = `products/${vendorId}/${Date.now()}-${file.name}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      urls.push(await getDownloadURL(storageRef));
    }
    return urls;
  }

  /* ---------------- OPTION GROUP HELPERS ---------------- */
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

  const removeOptionGroup = (groupIndex: number) => {
    setOptions(options.filter((_, i) => i !== groupIndex));
  };

  const updateOptionGroup = (
    groupIndex: number,
    field: keyof ProductOptionGroup,
    value: any
  ) => {
    const updated = structuredClone(options);
    (updated[groupIndex] as any)[field] = value;
    setOptions(updated);
  };

  /* ---------------- OPTION ITEM HELPERS ---------------- */
  const addOptionItem = (groupIndex: number) => {
    const updated = structuredClone(options);
    updated[groupIndex].options.push({
      id: nanoid(),
      label: "",
      priceDelta: 0,
    });
    setOptions(updated);
  };

  const removeOptionItem = (groupIndex: number, optionIndex: number) => {
    const updated = structuredClone(options);
    updated[groupIndex].options.splice(optionIndex, 1);
    setOptions(updated);
  };

  const updateOptionItem = (
    groupIndex: number,
    optionIndex: number,
    field: keyof ProductOptionItem,
    value: any
  ) => {
    const updated = structuredClone(options);
    (updated[groupIndex].options[optionIndex] as any)[field] = value;
    setOptions(updated);
  };

  /* ---------------- SUBMIT ---------------- */
  async function createProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !vendorId || !isAdmin) return;

    setSaving(true);

    try {
      const imageUrls = await uploadImages();

      await addDoc(collection(db, "vendors", vendorId, "products"), {
        name,
        description,
        price: Number(price),
        images: imageUrls,
        vendorId: vendorId,
        vendor_name: vendor?.name || vendor?.business_name || "Unknown Vendor",
        options,
        active: true,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        created_by: user.uid,
        created_by_role: "admin",
      });

      router.push(`/admin/vendors/${vendorId}`);
    } catch (err: any) {
      console.error("Error creating product:", err);
      alert(err.message || "Failed to create product. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  /* ---------------- LOADING STATE ---------------- */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-sb-primary" />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/vendors"
          className="inline-flex items-center text-sb-primary font-medium hover:underline"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Vendors
        </Link>
        <p className="text-red-600">Vendor not found.</p>
      </div>
    );
  }

  const vendorName = vendor.name || vendor.business_name || "Unknown Vendor";

  return (
    <div className="max-w-2xl mx-auto pb-20">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/admin/vendors/${vendorId}`}
          className="inline-flex items-center text-sb-primary hover:underline text-sm font-medium mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to {vendorName}
        </Link>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sb-primary/10 flex items-center justify-center">
            <Store className="w-5 h-5 text-sb-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Add Product</h1>
            <p className="text-sm text-gray-500">
              Adding product to{" "}
              <span className="font-medium text-gray-700">{vendorName}</span>
            </p>
          </div>
        </div>

        {/* Admin Badge */}
        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
          <Shield className="w-4 h-4 text-amber-600" />
          <span className="text-sm text-amber-700 font-medium">
            Admin Action
          </span>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={createProduct} className="space-y-6">
        {/* Basic Info Card */}
        <div className="bg-white rounded-xl shadow-sm border p-5 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-sb-primary" />
            Product Details
          </h2>

          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sb-primary/20 focus:border-sb-primary transition-colors"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter product name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Price (RD$) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                  RD$
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-full pl-14 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sb-primary/20 focus:border-sb-primary transition-colors"
                  value={price}
                  onChange={(e) =>
                    setPrice(e.target.value ? Number(e.target.value) : "")
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
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the product..."
              />
            </div>
          </div>
        </div>

        {/* Image Card */}
        <div className="bg-white rounded-xl shadow-sm border p-5 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-sb-primary" />
            Product Images
          </h2>

          {/* Image Previews */}
          {imagePreviews.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {imagePreviews.map((url, index) => (
                <div key={index} className="relative group">
                  <img
                    src={url}
                    alt={`Preview ${index + 1}`}
                    className="w-24 h-24 object-cover rounded-lg border"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                  >
                    <X className="w-3 h-3" />
                  </button>
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
                <span className="text-sb-primary font-medium">
                  Click to upload
                </span>{" "}
                or drag and drop
              </p>
              <p className="text-xs text-gray-400 mt-1">
                PNG, JPG up to 10MB each
              </p>
            </div>
          </label>
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

          {options.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
              <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">
                No option groups yet. Add groups like &quot;Size&quot;,
                &quot;Color&quot;, or &quot;Add-ons&quot; to give customers
                choices.
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
              {options.map((group, gi) => (
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
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Group Settings */}
                  <div className="px-4 py-3 border-b bg-gray-50/50 flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <span className="text-gray-600">Type:</span>
                      <select
                        className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-sb-primary/20 focus:border-sb-primary"
                        value={group.type}
                        onChange={(e) =>
                          updateOptionGroup(
                            gi,
                            "type",
                            e.target.value as "single" | "multiple"
                          )
                        }
                      >
                        <option value="single">Single Select</option>
                        <option value="multiple">Multi Select</option>
                      </select>
                    </label>

                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 text-sb-primary focus:ring-sb-primary"
                        checked={group.required}
                        onChange={(e) =>
                          updateOptionGroup(gi, "required", e.target.checked)
                        }
                      />
                      <span className="text-gray-600">Required</span>
                    </label>
                  </div>

                  {/* Option Items */}
                  <div className="p-4 space-y-2">
                    {group.options.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-2">
                        No options yet. Add options below.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {group.options.map((opt, oi) => (
                          <div
                            key={opt.id}
                            className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2"
                          >
                            <input
                              className="flex-1 bg-transparent text-sm placeholder:text-gray-400 focus:outline-none"
                              placeholder="Option label"
                              value={opt.label}
                              onChange={(e) =>
                                updateOptionItem(gi, oi, "label", e.target.value)
                              }
                            />
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-400">+RD$</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                className="w-20 text-sm text-right bg-white border border-gray-200 rounded px-2 py-1 focus:ring-1 focus:ring-sb-primary/20"
                                placeholder="0"
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
                              className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
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
              ))}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="sticky bottom-4 bg-white rounded-xl shadow-lg border p-4">
          <button
            type="submit"
            disabled={saving || !name || !price}
            className="w-full bg-sb-primary text-white py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-sb-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating Product...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Create Product for {vendorName}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}