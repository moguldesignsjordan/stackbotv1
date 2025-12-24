// src/app/store/[slug]/product/[id]/ProductClient.tsx
"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase/config";
import { useCart } from "@/contexts/CartContext";
import { ShoppingCart, Check, ArrowLeft } from "lucide-react";

interface OptionItem {
  id: string;
  label: string;
  priceDelta?: number;
}

interface OptionGroup {
  id: string;
  title: string;
  type?: string;
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

  const { addItem } = useCart();

  const basePrice = product.price || 0;

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

  const vendorId = vendor.id || slug;

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      vendorId: vendorId,
      vendorName: vendor.name,
      name: product.name,
      price: finalUnitPrice,
      quantity: qty,
      image: product.images?.[0],
    });

    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const buyNow = () => {
    const user = auth.currentUser;

    if (!user) {
      router.push("/login?redirect=" + encodeURIComponent(`/store/${slug}/product/${product.id}`));
      return;
    }

    // Add to cart and redirect to checkout
    addItem({
      productId: product.id,
      vendorId: vendorId,
      vendorName: vendor.name,
      name: product.name,
      price: finalUnitPrice,
      quantity: qty,
      image: product.images?.[0],
    });

    router.push("/cart");
  };

  const images = product.images?.length ? product.images : ["/product-placeholder.jpg"];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 pb-32 lg:pb-10 space-y-8">
      {/* BACK */}
      <Link
        href={`/store/${slug}`}
        className="inline-flex items-center gap-2 text-sm text-[#55529d] hover:underline"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to {vendor.name}
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* IMAGES */}
        <div>
          <div className="relative aspect-square bg-gray-100 rounded-2xl overflow-hidden">
            <Image
              src={images[0]}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          </div>
        </div>

        {/* DETAILS */}
        <div className="space-y-6">
          <h1 className="text-3xl font-bold">{product.name}</h1>

          <p className="text-2xl font-semibold text-[#55529d]">
            ${finalPrice.toFixed(2)}
          </p>

          {product.description && (
            <p className="text-gray-700">{product.description}</p>
          )}

          {/* OPTIONS */}
          {product.options && product.options.length > 0 && (
            <div className="space-y-6">
              {product.options.map((group) => (
                <div key={group.id} className="space-y-2">
                  <p className="font-semibold">{group.title}</p>

                  {group.options.map((opt) => {
                    const active = selected.some((s) => s.optionId === opt.id);

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => toggleOption(group, opt)}
                        className={`w-full flex justify-between p-3 rounded-xl border ${
                          active
                            ? "border-[#55529d] bg-[#55529d]/5"
                            : "border-gray-200"
                        }`}
                      >
                        <span>{opt.label}</span>
                        {opt.priceDelta ? <span>+${opt.priceDelta}</span> : null}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {/* QUANTITY */}
          <div className="flex items-center gap-4">
            <span className="font-medium">Quantity</span>
            <div className="flex items-center border rounded-xl">
              <button
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="px-4 py-2"
              >
                −
              </button>
              <span className="px-4 font-semibold">{qty}</span>
              <button onClick={() => setQty(qty + 1)} className="px-4 py-2">
                +
              </button>
            </div>
          </div>

          {/* DESKTOP BUTTONS */}
          <div className="hidden lg:flex gap-3">
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
                  Added!
                </>
              ) : (
                <>
                  <ShoppingCart className="w-5 h-5" />
                  Add to Cart
                </>
              )}
            </button>

            <button
              onClick={buyNow}
              className="flex-1 bg-[#55529d] text-white py-4 rounded-xl font-semibold hover:bg-[#444287] transition-colors"
            >
              Buy Now
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE STICKY BAR */}
      <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-white border-t p-4 z-50">
        <div className="flex items-center gap-3">
          <span className="font-bold text-lg">${finalPrice.toFixed(2)}</span>

          <button
            onClick={handleAddToCart}
            disabled={addedToCart}
            className={`p-3 rounded-xl border-2 transition-all ${
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
            className="flex-1 bg-[#55529d] text-white px-6 py-3 rounded-xl font-semibold"
          >
            Buy Now
          </button>
        </div>
      </div>
    </div>
  );
}