"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase/config";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function VendorSettings() {
  const [vendor, setVendor] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      const snap = await getDoc(doc(db, "vendors", user.uid));
      if (snap.exists()) setVendor(snap.data());

      setLoading(false);
    });
  }, []);

  async function removeLogo() {
    if (!confirm("Remove logo?")) return;
    await updateDoc(doc(db, "vendors", auth.currentUser!.uid), {
      logoUrl: "",
      updated_at: serverTimestamp(),
    });
    setVendor((v: any) => ({ ...v, logoUrl: "" }));
  }

  async function removeCover() {
    if (!confirm("Remove cover image?")) return;
    await updateDoc(doc(db, "vendors", auth.currentUser!.uid), {
      cover_image_url: "",
      updated_at: serverTimestamp(),
    });
    setVendor((v: any) => ({ ...v, cover_image_url: "" }));
  }

  if (loading) return <LoadingSpinner text="Loading settings..." />;

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-3xl font-bold">Store Settings</h1>

      {vendor.slug && (
        <Link
          href={`/store/${vendor.slug}`}
          target="_blank"
          className="text-sb-primary font-semibold underline"
        >
          View Public Storefront →
        </Link>
      )}

      <Card title="Branding">
        <div className="flex gap-6 items-center">
          <Image
            src={vendor.logoUrl || "/placeholder.png"}
            width={96}
            height={96}
            alt="Logo"
            className="rounded-xl border"
          />

          <button
            onClick={removeLogo}
            className="text-red-600 font-semibold"
          >
            Remove Logo
          </button>
        </div>

        {vendor.cover_image_url && (
          <button
            onClick={removeCover}
            className="mt-4 text-red-600 font-semibold"
          >
            Remove Cover Image
          </button>
        )}
      </Card>
    </div>
  );
}
