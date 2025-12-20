"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { getAuth } from "firebase/auth";

export default function ProductClient({
  slug,
  vendor,
  product,
}: any) {
  const [selected, setSelected] = useState<any[]>([]);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);

  const basePrice = product.price || 0;

  const finalUnitPrice = useMemo(() => {
    return (
      basePrice +
      selected.reduce((sum, opt) => sum + (opt.priceDelta || 0), 0)
    );
  }, [selected, basePrice]);

  const finalPrice = finalUnitPrice * qty;

  const toggleOption = (group: any, option: any) => {
    setSelected((prev) => {
      if (group.type === "multiple") {
        const exists = prev.find((o) => o.optionId === option.id);
        return exists
          ? prev.filter((o) => o.optionId !== option.id)
          : [...prev, buildSelection(group, option)];
      }

      return [
        ...prev.filter((o) => o.groupId !== group.id),
        buildSelection(group, option),
      ];
    });
  };

  const buildSelection = (group: any, option: any) => ({
    groupId: group.id,
    groupTitle: group.title,
    optionId: option.id,
    label: option.label,
    priceDelta: option.priceDelta || 0,
  });

  const buyNow = async () => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      alert("Please log in to continue");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.uid,
        items: [
          {
            productId: product.id,
            name: product.name,
            image: product.images?.[0],
            quantity: qty,
            finalPrice: finalUnitPrice,
            selectedOptions: selected.map((o) => ({
              groupTitle: o.groupTitle,
              label: o.label,
              priceDelta: o.priceDelta,
            })),
          },
        ],
      }),
    });

    const data = await res.json();
    window.location.href = data.url;
  };

  const images = product.images?.length
    ? product.images
    : ["/product-placeholder.jpg"];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 pb-32 lg:pb-10 space-y-8">
      {/* BACK */}
      <Link
        href={`/store/${slug}`}
        className="text-sm text-sb-primary hover:underline"
      >
        ← Back to {vendor.name}
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

          <p className="text-2xl font-semibold text-sb-primary">
            ${finalPrice.toFixed(2)}
          </p>

          {product.description && (
            <p className="text-gray-700">{product.description}</p>
          )}

          {/* OPTIONS */}
          {product.options?.length > 0 && (
            <div className="space-y-6">
              {product.options.map((group: any) => (
                <div key={group.id} className="space-y-2">
                  <p className="font-semibold">{group.title}</p>

                  {group.options.map((opt: any) => {
                    const active = selected.some(
                      (s) => s.optionId === opt.id
                    );

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => toggleOption(group, opt)}
                        className={`w-full flex justify-between p-3 rounded-xl border ${
                          active
                            ? "border-sb-primary bg-sb-primary/5"
                            : "border-gray-200"
                        }`}
                      >
                        <span>{opt.label}</span>
                        {opt.priceDelta ? (
                          <span>+${opt.priceDelta}</span>
                        ) : null}
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
              <button
                onClick={() => setQty(qty + 1)}
                className="px-4 py-2"
              >
                +
              </button>
            </div>
          </div>

          {/* DESKTOP BUY NOW */}
          <button
            onClick={buyNow}
            disabled={loading}
            className="hidden lg:block w-full bg-sb-primary text-white py-4 rounded-xl font-semibold"
          >
            {loading ? "Redirecting…" : "Buy Now"}
          </button>
        </div>
      </div>

      {/* MOBILE STICKY BAR */}
      <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-white border-t p-4">
        <div className="flex justify-between items-center">
          <span className="font-bold">${finalPrice.toFixed(2)}</span>
          <button
            onClick={buyNow}
            disabled={loading}
            className="bg-sb-primary text-white px-6 py-3 rounded-xl font-semibold"
          >
            Buy Now
          </button>
        </div>
      </div>
    </div>
  );
}
