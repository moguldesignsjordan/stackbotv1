"use client";

import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import Image from "next/image";

export default function CartPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);

  const auth = getAuth();
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;

    const loadCart = async () => {
      const snap = await getDocs(
        collection(db, "carts", user.uid, "items")
      );

      setItems(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))
      );
      setLoading(false);
    };

    loadCart();
  }, [user]);

  const total = items.reduce(
    (sum, i) => sum + i.finalPrice * i.quantity,
    0
  );

  const checkout = async () => {
    if (!user) return alert("Login required");

    setCheckingOut(true);

    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.uid,
        items,
      }),
    });

    const data = await res.json();
    window.location.href = data.url;
  };

  if (!user) return <p className="p-6">Please log in</p>;
  if (loading) return <p className="p-6">Loading cart...</p>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Your Cart</h1>

      {items.length === 0 && (
        <p className="text-gray-500">Your cart is empty</p>
      )}

      {items.map((item) => (
        <div
          key={item.id}
          className="flex gap-4 border rounded-xl p-4"
        >
          <div className="relative w-20 h-20 rounded overflow-hidden">
            <Image
              src={item.image}
              alt={item.name}
              fill
              sizes="80px"
              className="object-cover"
            />
          </div>

          <div className="flex-1">
            <h3 className="font-semibold">{item.name}</h3>

            {item.selectedOptions?.map((o: any, i: number) => (
              <p key={i} className="text-xs text-gray-500">
                {o.groupTitle}: {o.label}
              </p>
            ))}

            <p className="text-sm mt-1">
              Qty: {item.quantity}
            </p>
          </div>

          <div className="font-semibold">
            ${(item.finalPrice * item.quantity).toFixed(2)}
          </div>
        </div>
      ))}

      {/* CHECKOUT */}
      {items.length > 0 && (
        <div className="border-t pt-6 space-y-4">
          <div className="flex justify-between font-semibold text-lg">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>

          <button
            onClick={checkout}
            disabled={checkingOut}
            className="w-full bg-sb-primary text-white py-4 rounded-xl font-semibold"
          >
            {checkingOut ? "Redirecting…" : "Checkout"}
          </button>
        </div>
      )}
    </div>
  );
}
