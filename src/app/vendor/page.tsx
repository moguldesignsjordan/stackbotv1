"use client";

import { useEffect, useState, useCallback } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase/config";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  Package,
  PlusCircle,
  ShoppingCart,
  DollarSign,
  Star,
  Settings,
  ImageIcon,
} from "lucide-react";

export default function VendorDashboard() {
  const [user, setUser] = useState<any>(null);
  const [vendor, setVendor] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [savingCover, setSavingCover] = useState(false);

  /* ---------------- AUTH ---------------- */
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      if (u) setUser(u);
    });
  }, []);

  /* ---------------- LOAD DATA ---------------- */
  const loadDashboard = useCallback(async (u: any) => {
    const vendorRef = doc(db, "vendors", u.uid);
    const vendorSnap = await getDoc(vendorRef);

    if (!vendorSnap.exists()) {
      setVendor({ missing: true });
      setLoading(false);
      return;
    }

    const vendorData = vendorSnap.data();
    setVendor(vendorData);

    const productsSnap = await getDocs(
      query(collection(db, "products"), where("vendorId", "==", u.uid))
    );
    setProducts(productsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

    const ordersSnap = await getDocs(
      query(
        collection(db, "vendors", u.uid, "orders"),
        orderBy("timestamp", "desc"),
        limit(5)
      )
    );
    setOrders(ordersSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) loadDashboard(user);
  }, [user, loadDashboard]);

  /* ---------------- COVER IMAGE ---------------- */
  const selectCover = (file: File) => {
    setCoverFile(file);
    const reader = new FileReader();
    reader.onload = () => setCoverPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const saveCover = async () => {
    if (!user || !coverFile) return;
    setSavingCover(true);

    const storage = getStorage();
    const safeName = coverFile.name.replace(/\s+/g, "-");
    const path = `vendors/covers/${user.uid}/${Date.now()}-${safeName}`;

    const coverRef = ref(storage, path);
    await uploadBytes(coverRef, coverFile);
    const url = await getDownloadURL(coverRef);

    await updateDoc(doc(db, "vendors", user.uid), {
      cover_image_url: url,
      updated_at: serverTimestamp(),
    });

    setVendor((v: any) => ({ ...v, cover_image_url: url }));
    setCoverFile(null);
    setCoverPreview(null);
    setSavingCover(false);
  };

  const removeCover = async () => {
    if (!confirm("Remove cover image?")) return;
    await updateDoc(doc(db, "vendors", user.uid), {
      cover_image_url: "",
      updated_at: serverTimestamp(),
    });
    setVendor((v: any) => ({ ...v, cover_image_url: "" }));
  };

  /* ---------------- STATES ---------------- */
  if (!user) return <LoadingSpinner text="Preparing dashboard..." />;
  if (loading) return <LoadingSpinner text="Loading dashboard..." />;
  if (vendor?.missing) return <p className="text-red-600">Vendor not found</p>;

  /* ---------------- UI ---------------- */
  return (
    <div className="space-y-8 animate-fade-in">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Image
          src={vendor.logoUrl || "/placeholder.png"}
          width={64}
          height={64}
          alt="Logo"
          className="rounded-xl border"
        />
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{vendor.name}</h1>
          <p className="text-sm text-gray-500">{vendor.email}</p>

          {vendor.slug && (
            <Link
              href={`/store/${vendor.slug}`}
              target="_blank"
              className="text-sm text-sb-primary font-semibold underline"
            >
              View Storefront →
            </Link>
          )}
        </div>
      </div>

      {/* COVER IMAGE */}
      <Card title="Storefront Cover">
        <div className="space-y-4">
          <div className="relative h-44 rounded-xl overflow-hidden border">
            <Image
              src={
                coverPreview ||
                vendor.cover_image_url ||
                "/store-cover-placeholder.jpg"
              }
              alt="Cover"
              fill
              className="object-cover"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <label className="cursor-pointer px-4 py-2 border rounded-xl text-sm flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Change
              <input
                hidden
                type="file"
                accept="image/*"
                onChange={(e) =>
                  e.target.files && selectCover(e.target.files[0])
                }
              />
            </label>

            <button
              onClick={saveCover}
              disabled={!coverFile || savingCover}
              className="px-4 py-2 rounded-xl bg-sb-primary text-white disabled:opacity-50"
            >
              Save
            </button>

            {vendor.cover_image_url && (
              <button
                onClick={removeCover}
                className="px-4 py-2 rounded-xl text-red-600 font-semibold"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* QUICK ACTIONS — MOBILE SCROLL */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:grid md:grid-cols-4 md:overflow-visible scrollbar-hide snap-x snap-mandatory">
        <Action href="/vendor/products" icon={<Package />} label="Products" />
        <Action href="/vendor/products/new" icon={<PlusCircle />} label="Add Product" />
        <Action href="/vendor/orders" icon={<ShoppingCart />} label="Orders" />
        <Action href="/vendor/settings" icon={<Settings />} label="Settings" />
      </div>

      {/* METRICS */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Metric icon={<ShoppingCart />} label="Orders" value={vendor.total_orders || 0} />
        <Metric
          icon={<DollarSign />}
          label="Revenue"
          value={`$${(vendor.total_revenue || 0).toLocaleString()}`}
        />
        <Metric icon={<Star />} label="Rating" value={`${vendor.rating || 0} ⭐`} />
      </div>
    </div>
  );
}

/* ---------------- SUB COMPONENTS ---------------- */

function Action({ href, icon, label }: any) {
  return (
    <Link
      href={href}
      className="flex-shrink-0 min-w-[90px] p-4 bg-white border rounded-xl
                 flex flex-col items-center gap-2
                 active:scale-95 transition snap-start touch-feedback tap-target"
    >
      <div className="text-sb-primary">{icon}</div>
      <span className="text-xs font-medium">{label}</span>
    </Link>
  );
}

function Metric({ icon, label, value }: any) {
  return (
    <Card>
      <div className="flex items-center gap-3 text-xl font-bold">
        <span className="text-sb-primary">{icon}</span>
        {value}
      </div>
      <p className="text-gray-500 text-sm mt-1">{label}</p>
    </Card>
  );
}
