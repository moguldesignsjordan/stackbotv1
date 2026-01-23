// src/app/store/[slug]/product/[id]/ProductClient.tsx
"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase/config";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  ShoppingCart,
  Check,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Store,
  Minus,
  Plus,
  X,
  ZoomIn,
  Share2,
  Heart,
  CheckCircle2,
} from "lucide-react";

interface OptionItem {
  id: string;
  label: string;
  priceDelta?: number;
}

interface OptionGroup {
  id: string;
  title: string;
  type?: string;
  required?: boolean;
  options: OptionItem[];
}

interface SelectedOption {
  groupId: string;
  groupTitle: string;
  optionId: string;
  label: string;
  priceDelta: number;
}

interface ProductClientProps {
  slug: string;
  vendor: {
    id?: string;
    name: string;
    logoUrl?: string;
    verified?: boolean;
  };
  product: {
    id: string;
    name: string;
    price: number;
    description?: string;
    images?: string[];
    options?: OptionGroup[];
  };
}

export default function ProductClient({ slug, vendor, product }: ProductClientProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<SelectedOption[]>([]);
  const [qty, setQty] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);
  const [saved, setSaved] = useState(false);

  const { addItem } = useCart();
  const { t, formatCurrency, language } = useLanguage();

  const basePrice = product.price || 0;
  const images = product.images?.length ? product.images : ["/product-placeholder.jpg"];
  const hasMultipleImages = images.length > 1;

  const finalUnitPrice = useMemo(() => {
    return basePrice + selected.reduce((sum, opt) => sum + (opt.priceDelta || 0), 0);
  }, [selected, basePrice]);

  const finalPrice = finalUnitPrice * qty;

  const buildSelection = (group: OptionGroup, option: OptionItem): SelectedOption => ({
    groupId: group.id,
    groupTitle: group.title,
    optionId: option.id,
    label: option.label,
    priceDelta: option.priceDelta || 0,
  });

  const toggleOption = (group: OptionGroup, option: OptionItem) => {
    setSelected((prev) => {
      const exists = prev.find(
        (o) => o.groupId === group.id && o.optionId === option.id
      );

      if (group.type === "multiple") {
        return exists
          ? prev.filter((o) => o.optionId !== option.id)
          : [...prev, buildSelection(group, option)];
      }

      if (exists) {
        return prev.filter((o) => o.optionId !== option.id);
      }

      return [
        ...prev.filter((o) => o.groupId !== group.id),
        buildSelection(group, option),
      ];
    });
  };

  // ✅ Validation Logic with i18n
  const validateSelections = (): boolean => {
    if (!product.options) return true;

    for (const group of product.options) {
      if (group.required) {
        const hasSelection = selected.some((s) => s.groupId === group.id);
        if (!hasSelection) {
          const message = language === 'en' 
            ? `Please select an option for: ${group.title}`
            : `Por favor selecciona una opción para: ${group.title}`;
          alert(message);
          return false;
        }
      }
    }
    return true;
  };

  const vendorId = vendor.id || slug;

  const handleAddToCart = () => {
    if (!validateSelections()) return;

    addItem({
      productId: product.id,
      vendorId: vendorId,
      vendorName: vendor.name,
      name: product.name,
      price: finalUnitPrice,
      quantity: qty,
      imageUrl: product.images?.[0],
    });

    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2500);
  };

  const buyNow = () => {
    if (!validateSelections()) return;

    const user = auth.currentUser;

    if (!user) {
      router.push("/login?redirect=" + encodeURIComponent(`/store/${slug}/product/${product.id}`));
      return;
    }

    addItem({
      productId: product.id,
      vendorId: vendorId,
      vendorName: vendor.name,
      name: product.name,
      price: finalUnitPrice,
      quantity: qty,
      imageUrl: product.images?.[0],
    });

    router.push("/cart");
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleShare = async () => {
    const url = window.location.href;
    const shareText = language === 'en'
      ? `Check out ${product.name} from ${vendor.name}!`
      : `¡Mira ${product.name} de ${vendor.name}!`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: shareText,
          url,
        });
      } catch (err) {}
    } else {
      await navigator.clipboard.writeText(url);
      alert(t('product.linkCopied'));
    }
  };

  return (
    <>
      <div className="bg-gray-50 min-h-screen pb-32 lg:pb-10 pt-[64px]">
        <div className="max-w-7xl mx-auto px-4 py-6 lg:py-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            
            {/* IMAGE GALLERY */}
            <div className="space-y-4">
              {/* Main Image Container */}
              <div className="relative aspect-square bg-white rounded-2xl overflow-hidden shadow-sm group">
                <Image
                  src={images[currentImageIndex]}
                  alt={`${product.name} - ${language === 'en' ? 'Image' : 'Imagen'} ${currentImageIndex + 1}`}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover cursor-zoom-in"
                  priority
                  onClick={() => setShowLightbox(true)}
                />

                {/* ✅ BACK BUTTON (On Picture, Top Left) */}
                <Link
                  href={`/store/${slug}`}
                  className="absolute top-4 left-4 z-20 inline-flex items-center justify-center bg-white/90 text-gray-700 w-10 h-10 rounded-full hover:bg-white transition shadow-md"
                  title={t('product.backToStore')}
                >
                  <ArrowLeft className="w-5 h-5" />
                </Link>

                {/* ZOOM BUTTON (On Picture, Top Right) */}
                <button
                  onClick={() => setShowLightbox(true)}
                  className="absolute top-4 right-4 z-20 p-2 bg-white/90 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                  title={language === 'en' ? 'Zoom' : 'Ampliar'}
                >
                  <ZoomIn className="w-5 h-5 text-gray-700" />
                </button>

                {/* Navigation Arrows */}
                {hasMultipleImages && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-3 top-1/2 -translate-y-1/2 z-10 p-2 bg-white/90 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                    >
                      <ChevronLeft className="w-5 h-5 text-gray-700" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-2 bg-white/90 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                    >
                      <ChevronRight className="w-5 h-5 text-gray-700" />
                    </button>

                    {/* Image Counter */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 bg-black/60 text-white text-sm font-medium rounded-full">
                      {currentImageIndex + 1} / {images.length}
                    </div>
                  </>
                )}
              </div>

              {/* Thumbnail Strip */}
              {hasMultipleImages && (
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden transition-all ${
                        idx === currentImageIndex
                          ? "ring-2 ring-[#55529d] ring-offset-2"
                          : "opacity-70 hover:opacity-100"
                      }`}
                    >
                      <Image
                        src={img}
                        alt={`${language === 'en' ? 'Thumbnail' : 'Miniatura'} ${idx + 1}`}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* PRODUCT DETAILS */}
            <div className="space-y-6">
              {/* Vendor Link */}
              <Link
                href={`/store/${slug}`}
                className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-[#55529d] transition-colors"
              >
                {vendor.logoUrl ? (
                  <Image
                    src={vendor.logoUrl}
                    alt={vendor.name}
                    width={24}
                    height={24}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                ) : (
                  <Store className="w-5 h-5" />
                )}
                <span>{vendor.name}</span>
                {vendor.verified && (
                  <CheckCircle2 className="w-4 h-4 text-blue-500" />
                )}
              </Link>

              {/* Title & Actions */}
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {product.name}
                </h1>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={handleShare}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                    title={t('common.share')}
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setSaved(!saved)}
                    className={`p-2 rounded-full transition-colors ${
                      saved
                        ? "text-red-500 bg-red-50"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                    }`}
                    title={language === 'en' ? 'Save' : 'Guardar'}
                  >
                    <Heart className={`w-5 h-5 ${saved ? "fill-current" : ""}`} />
                  </button>
                </div>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-[#55529d]">
                  {formatCurrency(finalPrice)}
                </span>
                {qty > 1 && (
                  <span className="text-sm text-gray-500">
                    ({formatCurrency(finalUnitPrice)} {language === 'en' ? 'each' : 'c/u'})
                  </span>
                )}
              </div>

              {/* Description */}
              {product.description && (
                <div className="prose prose-gray max-w-none">
                  <p className="text-gray-600 leading-relaxed">{product.description}</p>
                </div>
              )}

              {/* Options */}
              {product.options && product.options.length > 0 && (
                <div className="space-y-5 pt-2">
                  {product.options.map((group) => (
                    <div key={group.id} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{group.title}</span>
                        {group.required && (
                          <span className="text-xs text-red-500 font-medium">
                            {t('common.required')}
                          </span>
                        )}
                        {group.type === "multiple" && (
                          <span className="text-xs text-gray-500">
                            ({language === 'en' ? 'Select multiple' : 'Selección múltiple'})
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {group.options.map((opt) => {
                          const active = selected.some((s) => s.optionId === opt.id);

                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => toggleOption(group, opt)}
                              className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                                active
                                  ? "border-[#55529d] bg-[#55529d]/5"
                                  : "border-gray-200 hover:border-gray-300"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                    active
                                      ? "border-[#55529d] bg-[#55529d]"
                                      : "border-gray-300"
                                  }`}
                                >
                                  {active && <Check className="w-3 h-3 text-white" />}
                                </div>
                                <span className={active ? "font-medium" : ""}>{opt.label}</span>
                              </div>
                              {opt.priceDelta ? (
                                <span className="text-sm text-gray-500">
                                  +{formatCurrency(opt.priceDelta)}
                                </span>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Quantity */}
              <div className="flex items-center gap-4 pt-2">
                <span className="font-semibold text-gray-900">{t('products.quantity')}</span>
                <div className="flex items-center border-2 border-gray-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    className="px-4 py-2.5 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    disabled={qty <= 1}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-5 py-2.5 font-semibold text-gray-900 min-w-[60px] text-center border-x-2 border-gray-200">
                    {qty}
                  </span>
                  <button
                    onClick={() => setQty(qty + 1)}
                    className="px-4 py-2.5 text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Desktop Buttons */}
              <div className="hidden lg:flex gap-3 pt-4">
                <button
                  onClick={handleAddToCart}
                  disabled={addedToCart}
                  className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl font-semibold border-2 transition-all ${
                    addedToCart
                      ? "bg-green-500 border-green-500 text-white"
                      : "border-[#55529d] text-[#55529d] hover:bg-[#55529d]/5"
                  }`}
                >
                  {addedToCart ? (
                    <>
                      <Check className="w-5 h-5" />
                      {t('product.addedToCart')}
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-5 h-5" />
                      {t('products.addToCart')}
                    </>
                  )}
                </button>

                <button
                  onClick={buyNow}
                  className="flex-1 bg-[#55529d] text-white py-4 rounded-xl font-semibold hover:bg-[#444287] transition-colors shadow-lg shadow-[#55529d]/25"
                >
                  {t('product.buyNow')}
                </button>
              </div>

              {/* Trust Badges */}
              <div className="flex flex-wrap items-center gap-4 pt-4 border-t text-sm text-gray-500">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>{t('product.secureCheckout')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>{t('product.qualityGuaranteed')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Sticky Bar */}
        <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-white border-t shadow-lg p-4 z-50">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <p className="text-xs text-gray-500">{t('cart.total')}</p>
              <p className="font-bold text-lg text-gray-900">{formatCurrency(finalPrice)}</p>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={addedToCart}
              className={`p-3 rounded-xl border-2 transition-all flex-shrink-0 ${
                addedToCart
                  ? "bg-green-500 border-green-500 text-white"
                  : "border-[#55529d] text-[#55529d]"
              }`}
            >
              {addedToCart ? (
                <Check className="w-5 h-5" />
              ) : (
                <ShoppingCart className="w-5 h-5" />
              )}
            </button>

            <button
              onClick={buyNow}
              className="flex-1 bg-[#55529d] text-white px-6 py-3.5 rounded-xl font-semibold shadow-lg"
            >
              {t('product.buyNow')}
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {showLightbox && (
        <div
          className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center"
          onClick={() => setShowLightbox(false)}
        >
          {/* Close Button */}
          <button
            onClick={() => setShowLightbox(false)}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white transition-colors z-10"
          >
            <X className="w-8 h-8" />
          </button>

          {/* Image Counter */}
          <div className="absolute top-4 left-4 text-white/80 font-medium">
            {currentImageIndex + 1} / {images.length}
          </div>

          {/* Main Image */}
          <div
            className="relative w-full h-full max-w-5xl max-h-[80vh] mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={images[currentImageIndex]}
              alt={`${product.name} - ${language === 'en' ? 'Image' : 'Imagen'} ${currentImageIndex + 1}`}
              fill
              className="object-contain"
              sizes="100vw"
            />
          </div>

          {/* Navigation */}
          {hasMultipleImages && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  prevImage();
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              >
                <ChevronLeft className="w-8 h-8 text-white" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  nextImage();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              >
                <ChevronRight className="w-8 h-8 text-white" />
              </button>
            </>
          )}

          {/* Thumbnail Strip */}
          {hasMultipleImages && (
            <div
              className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 p-2 bg-black/50 rounded-xl"
              onClick={(e) => e.stopPropagation()}
            >
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImageIndex(idx)}
                  className={`relative w-16 h-16 rounded-lg overflow-hidden transition-all ${
                    idx === currentImageIndex
                      ? "ring-2 ring-white"
                      : "opacity-50 hover:opacity-100"
                  }`}
                >
                  <Image
                    src={img}
                    alt={`${language === 'en' ? 'Thumbnail' : 'Miniatura'} ${idx + 1}`}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}