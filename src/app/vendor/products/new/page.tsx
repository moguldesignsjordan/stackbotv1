// src/app/vendor/products/new/page.tsx
'use client';

/* eslint-disable @next/next/no-img-element */
// Note: Using <img> because imagePreviews are blob URLs from URL.createObjectURL
// which don't work well with next/image without additional configuration

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db, storage } from '@/lib/firebase/config';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
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
  Loader2,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { TranslationKey } from '@/lib/translations';

import type {
  ProductOptionGroup,
  ProductOptionItem,
} from '@/lib/types/firestore';

export default function CreateProductPage() {
  const router = useRouter();
  const { t, language } = useLanguage();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [options, setOptions] = useState<ProductOptionGroup[]>([]);

  /* ---------------- AUTH ---------------- */
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      if (!u) router.push('/login');
      else {
        setUser(u);
        setLoading(false);
      }
    });
  }, [router]);

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

  async function uploadImages(vendorId: string): Promise<string[]> {
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
        title: '',
        type: 'single',
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
      label: '',
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
    if (!user) return;

    setSaving(true);

    try {
      const imageUrls = await uploadImages(user.uid);

      await addDoc(collection(db, 'vendors', user.uid, 'products'), {
        name,
        description,
        price: Number(price),
        images: imageUrls,
        vendorId: user.uid,
        options,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });

      router.push('/vendor/products');
    } catch (err: any) {
      console.error('Error creating product:', err);
      alert(t('vendor.productForm.createFailed' as TranslationKey));
      setSaving(false);
    }
  }

  /* ---------------- LOADING STATE ---------------- */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-sb-primary" />
          <p className="text-gray-600">{t('vendor.productForm.loading' as TranslationKey)}</p>
        </div>
      </div>
    );
  }

  // Currency symbol based on language
  const currencySymbol = language === 'es' ? 'RD$' : '$';

  /* ---------------- UI ---------------- */
  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push('/vendor/products')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">
              {t('vendor.productForm.backToProducts' as TranslationKey)}
            </span>
          </button>

          <h1 className="text-lg font-semibold text-gray-900">
            {t('vendor.productForm.newProduct' as TranslationKey)}
          </h1>

          <div className="w-20" /> {/* Spacer for centering */}
        </div>
      </div>

      <form onSubmit={createProduct} className="max-w-3xl mx-auto px-4 pt-6 space-y-6">
        {/* Basic Info Card */}
        <div className="bg-white rounded-xl shadow-sm border p-5 space-y-5">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-sb-primary" />
            {t('vendor.productForm.productDetails' as TranslationKey)}
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t('vendor.productForm.productName' as TranslationKey)} <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sb-primary/20 focus:border-sb-primary transition-colors"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('vendor.productForm.productNamePlaceholder' as TranslationKey)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t('vendor.productForm.price' as TranslationKey)} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sb-primary/20 focus:border-sb-primary transition-colors"
                  value={price}
                  onChange={(e) =>
                    setPrice(e.target.value ? Number(e.target.value) : '')
                  }
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t('vendor.productForm.description' as TranslationKey)}
              </label>
              <textarea
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sb-primary/20 focus:border-sb-primary transition-colors resize-none"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('vendor.productForm.descriptionPlaceholder' as TranslationKey)}
              />
            </div>
          </div>
        </div>

        {/* Image Card */}
        <div className="bg-white rounded-xl shadow-sm border p-5 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-sb-primary" />
            {t('vendor.productForm.productImages' as TranslationKey)}
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

          {options.length === 0 ? (
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
                {t('vendor.productForm.creatingProduct' as TranslationKey)}
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                {t('vendor.productForm.createProduct' as TranslationKey)}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}