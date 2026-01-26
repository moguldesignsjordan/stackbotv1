// src/app/vendor/products/[id]/edit/page.tsx
'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/config';
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';
import { nanoid } from 'nanoid';
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
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { TranslationKey } from '@/lib/translations';

import type {
  Product,
  ProductOptionGroup,
  ProductOptionItem,
} from '@/lib/types/firestore';

export default function EditProductPage() {
  const { id: productId } = useParams<{ id: string }>();
  const router = useRouter();
  const storage = getStorage();
  const { t, language } = useLanguage();

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
        router.push('/login');
        return;
      }
      setUser(u);

      // Fetch product
      const snap = await getDoc(
        doc(db, 'vendors', u.uid, 'products', productId!)
      );
      if (snap.exists()) {
        const data = snap.data() as Product;
        setProduct({ ...data, id: snap.id });
        setExistingImages(data.images || []);
      }
      setLoading(false);
    });
  }, [router, productId]);

  /* ---------------- NEW IMAGE PREVIEW ---------------- */
  useEffect(() => {
    if (newImages.length === 0) {
      setNewImagePreviews([]);
      return;
    }
    const urls = newImages.map((f) => URL.createObjectURL(f));
    setNewImagePreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [newImages]);

  /* ---------------- IMAGE HANDLERS ---------------- */
  const handleNewImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      const path = `products/${user.uid}/${Date.now()}-${file.name}`;
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
          title: '',
          type: 'single',
          required: false,
          options: [],
        },
      ],
    });
  };

  const removeOptionGroup = (groupIndex: number) => {
    if (!product) return;
    const updated = structuredClone(product.options || []);
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
      label: '',
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

      await updateDoc(doc(db, 'vendors', user.uid, 'products', product.id), {
        name: product.name,
        description: product.description || '',
        price: Number(product.price),
        images: allImages,
        options: product.options || [],
        updated_at: serverTimestamp(),
      });

      router.push('/vendor/products');
    } catch (error) {
      console.error('Error saving product:', error);
      alert(t('vendor.productForm.saveFailed' as TranslationKey));
    } finally {
      setSaving(false);
    }
  }

  /* ---------------- DELETE ---------------- */
  async function confirmDelete() {
    if (!user || !product) return;

    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'vendors', user.uid, 'products', product.id));
      router.push('/vendor/products');
    } catch (error) {
      console.error('Error deleting product:', error);
      alert(t('vendor.productForm.deleteFailed' as TranslationKey));
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
        <p className="text-gray-500">{t('vendor.productForm.productNotFound' as TranslationKey)}</p>
      </div>
    );
  }

  const totalImages = existingImages.length + newImages.length;
  const currencySymbol = language === 'es' ? 'RD$' : '$';

  return (
    <form onSubmit={saveProduct} className="space-y-6 max-w-3xl pb-32">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sb-primary hover:underline font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('vendor.productForm.back' as TranslationKey)}
        </button>

        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          className="inline-flex items-center gap-2 text-red-600 hover:text-red-700 font-medium"
        >
          <Trash2 className="w-4 h-4" />
          {t('vendor.productForm.delete' as TranslationKey)}
        </button>
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold">
        {t('vendor.productForm.editProduct' as TranslationKey)}
      </h1>

      {/* Basic Info Card */}
      <div className="bg-white rounded-xl shadow-sm border p-5 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Package className="w-5 h-5 text-sb-primary" />
          {t('vendor.productForm.productDetails' as TranslationKey)}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('vendor.productForm.productName' as TranslationKey)} *
            </label>
            <input
              type="text"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sb-primary/20 focus:border-sb-primary transition-colors"
              value={product.name || ''}
              onChange={(e) => setProduct({ ...product, name: e.target.value })}
              placeholder={t('vendor.productForm.productNamePlaceholder' as TranslationKey)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('vendor.productForm.price' as TranslationKey)} ({currencySymbol}) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sb-primary/20 focus:border-sb-primary transition-colors"
              value={product.price ?? ''}
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
              {t('vendor.productForm.description' as TranslationKey)}
            </label>
            <textarea
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sb-primary/20 focus:border-sb-primary transition-colors resize-none"
              rows={3}
              value={product.description || ''}
              onChange={(e) =>
                setProduct({ ...product, description: e.target.value })
              }
              placeholder={t('vendor.productForm.descriptionPlaceholder' as TranslationKey)}
            />
          </div>
        </div>
      </div>

      {/* Images Card */}
      <div className="bg-white rounded-xl shadow-sm border p-5 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-sb-primary" />
          {t('vendor.productForm.productImages' as TranslationKey)} ({totalImages})
        </h2>

        {/* Existing Images */}
        {existingImages.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {existingImages.map((url, index) => (
              <div key={url} className="relative group">
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
              </div>
            ))}
          </div>
        )}

        {/* New Image Previews */}
        {newImagePreviews.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {newImagePreviews.map((url, index) => (
              <div key={url} className="relative group">
                <img
                  src={url}
                  alt={`New ${index + 1}`}
                  className="w-24 h-24 object-cover rounded-lg border border-green-300"
                />
                <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-green-500 text-white text-[10px] font-bold rounded">
                  NEW
                </div>
                <button
                  type="button"
                  onClick={() => removeNewImage(index)}
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
            onChange={handleNewImageSelect}
            className="hidden"
          />
          <div className="text-center">
            <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">
              <span className="text-sb-primary font-medium">
                {t('vendor.productForm.clickToUpload' as TranslationKey)}
              </span>{' '}
              {t('vendor.productForm.orDragDrop' as TranslationKey)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {t('vendor.productForm.imageFormats' as TranslationKey)}
            </p>
          </div>
        </label>
      </div>

      {/* Product Options Card */}
      <div className="bg-white rounded-xl shadow-sm border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('vendor.productForm.productOptions' as TranslationKey)}
          </h2>
          <button
            type="button"
            onClick={addOptionGroup}
            className="flex items-center gap-1.5 text-sm font-medium text-sb-primary hover:text-sb-primary/80 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('vendor.productForm.addGroup' as TranslationKey)}
          </button>
        </div>

        {(!product.options || product.options.length === 0) ? (
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
            <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              {t('vendor.productForm.noOptionsYet' as TranslationKey)}
            </p>
            <button
              type="button"
              onClick={addOptionGroup}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-sb-primary text-white rounded-lg text-sm font-medium hover:bg-sb-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('vendor.productForm.addOptionGroup' as TranslationKey)}
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
                      placeholder={t('vendor.productForm.groupTitlePlaceholder' as TranslationKey)}
                      value={group.title}
                      onChange={(e) =>
                        updateOptionGroup(gi, 'title', e.target.value)
                      }
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeOptionGroup(gi)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title={t('vendor.productForm.delete' as TranslationKey)}
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
                        {t('vendor.productForm.selectionType' as TranslationKey)}
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sb-primary/20 focus:border-sb-primary"
                        value={group.type}
                        onChange={(e) =>
                          updateOptionGroup(gi, 'type', e.target.value)
                        }
                      >
                        <option value="single">{t('vendor.productForm.singleSelect' as TranslationKey)}</option>
                        <option value="multiple">{t('vendor.productForm.multipleSelect' as TranslationKey)}</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={group.required}
                          onChange={(e) =>
                            updateOptionGroup(gi, 'required', e.target.checked)
                          }
                          className="w-4 h-4 text-sb-primary border-gray-300 rounded focus:ring-sb-primary"
                        />
                        <span className="text-sm text-gray-700">
                          {t('vendor.productForm.required' as TranslationKey)}
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Options List */}
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-gray-500">
                      {t('vendor.productForm.options' as TranslationKey)}
                    </label>

                    {group.options.length === 0 ? (
                      <p className="text-sm text-gray-400 italic">
                        {t('vendor.productForm.noOptionsAdded' as TranslationKey)}
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
                              placeholder={t('vendor.productForm.optionLabelPlaceholder' as TranslationKey)}
                              value={opt.label}
                              onChange={(e) =>
                                updateOptionItem(gi, oi, 'label', e.target.value)
                              }
                            />
                            <div className="relative w-24 flex-shrink-0">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                                +{currencySymbol}
                              </span>
                              <input
                                type="number"
                                step="0.01"
                                className="w-full pl-10 pr-2 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sb-primary/20 focus:border-sb-primary"
                                placeholder="0"
                                value={opt.priceDelta || ''}
                                onChange={(e) =>
                                  updateOptionItem(
                                    gi,
                                    oi,
                                    'priceDelta',
                                    Number(e.target.value)
                                  )
                                }
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeOptionItem(gi, oi)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                              title={t('vendor.productForm.delete' as TranslationKey)}
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
                      {t('vendor.productForm.addOption' as TranslationKey)}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sticky Save Button */}
      <div className="sticky bottom-4 bg-white rounded-xl shadow-lg border p-4">
        <button
          type="submit"
          disabled={saving || !product.name || !product.price}
          className="w-full bg-sb-primary text-white py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-sb-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {t('vendor.productForm.saving' as TranslationKey)}
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              {t('vendor.productForm.saveChanges' as TranslationKey)}
            </>
          )}
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-semibold">
                {t('vendor.productForm.deleteConfirmTitle' as TranslationKey)}
              </h3>
            </div>
            <p className="text-gray-600">
              {t('vendor.productForm.deleteConfirmMessage' as TranslationKey)}
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                {t('vendor.productForm.cancel' as TranslationKey)}
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('vendor.productForm.deleting' as TranslationKey)}
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    {t('vendor.productForm.deleteProduct' as TranslationKey)}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}