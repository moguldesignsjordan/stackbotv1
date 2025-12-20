"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { db, auth } from "@/lib/firebase/config";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  deleteDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import {
  ArrowLeft,
  Store,
  MapPin,
  Phone,
  Globe,
  Mail,
  Package,
  ShieldBan,
  ShieldCheck,
  Pencil,
  Trash2,
} from "lucide-react";

interface Vendor {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  description?: string;
  categories?: string[];
  logoUrl?: string;
  verified?: boolean;
  slug?: string;
  total_orders?: number;
  total_revenue?: number;
  rating?: number;
  stackbot_pin?: string;
  status?: "active" | "suspended";
}

interface Product {
  id: string;
  name: string;
  price?: number;
  active?: boolean;
  images?: string[];
  description?: string;
}

export default function AdminVendorDetailPage() {
  const { id: vendorId } = useParams<{ id: string }>();

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [approving, setApproving] = useState(false);
  const [suspending, setSuspending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isSuspended = useMemo(() => vendor?.status === "suspended", [vendor]);

  useEffect(() => {
    if (!vendorId) return;

    const load = async () => {
      setLoading(true);
      try {
        // Vendor
        const vendorRef = doc(db, "vendors", vendorId);
        const vendorSnap = await getDoc(vendorRef);

        if (!vendorSnap.exists()) {
          setVendor(null);
          setProducts([]);
          return;
        }

        setVendor({ id: vendorSnap.id, ...(vendorSnap.data() as any) });

        // ✅ Products from vendor subcollection
        const prodSnap = await getDocs(collection(db, "vendors", vendorId, "products"));
        setProducts(prodSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      } catch (err) {
        console.error("Error loading admin vendor detail", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [vendorId]);

  async function approveVendor() {
    if (!vendorId) return;

    try {
      setApproving(true);

      const user = auth.currentUser;
      if (!user) return alert("You must be logged in!");

      const token = await user.getIdToken(true);

      const res = await fetch("https://approvevendor-j5kxrjebxa-uc.a.run.app", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ vendorId }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(`Approval failed: ${data.error || "Unknown error"}`);
        return;
      }

      alert(`Vendor approved successfully!\n\nEmail: ${data.email}`);
      window.location.reload();
    } catch (err: any) {
      console.error("Approve error:", err);
      alert("Unable to approve vendor: " + err.message);
    } finally {
      setApproving(false);
    }
  }

  async function toggleSuspension() {
    if (!vendorId || !vendor) return;

    const nextStatus: Vendor["status"] = vendor.status === "suspended" ? "active" : "suspended";
    const confirmMsg =
      nextStatus === "suspended"
        ? "Suspend this vendor? This should block them from operating in the vendor portal."
        : "Unsuspend this vendor and restore access?";

    if (!confirm(confirmMsg)) return;

    try {
      setSuspending(true);
      await updateDoc(doc(db, "vendors", vendorId), {
        status: nextStatus,
        updated_at: serverTimestamp(),
      });
      setVendor({ ...vendor, status: nextStatus });
    } catch (e) {
      console.error("Suspend/unsuspend failed", e);
      alert("Failed to update vendor status.");
    } finally {
      setSuspending(false);
    }
  }

  async function deleteProduct(productId: string) {
    if (!vendorId) return;
    if (!confirm("Delete this product permanently?")) return;

    try {
      setDeletingId(productId);
      await deleteDoc(doc(db, "vendors", vendorId, "products", productId));

      // Update UI immediately
      setProducts((prev) => prev.filter((p) => p.id !== productId));
    } catch (e) {
      console.error("Delete product failed", e);
      alert("Failed to delete product.");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) return <LoadingSpinner text="Loading vendor..." />;

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

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/vendors"
            className="inline-flex items-center text-sb-primary font-medium hover:underline"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Link>

          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Store className="h-7 w-7 text-sb-primary" />
            {vendor.name}
          </h1>

          {vendor.status === "suspended" && (
            <Badge variant="danger" className="ml-2">
              Suspended
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3">
          {!vendor.verified && (
            <Button onClick={approveVendor} loading={approving} variant="primary">
              Approve Vendor
            </Button>
          )}

          <Button
            onClick={toggleSuspension}
            loading={suspending}
            variant={isSuspended ? "secondary" : "danger"}
          >
            {isSuspended ? (
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" /> Unsuspend
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <ShieldBan className="h-4 w-4" /> Suspend
              </span>
            )}
          </Button>

          <Badge variant={vendor.verified ? "success" : "warning"}>
            {vendor.verified ? "Approved" : "Pending"}
          </Badge>
        </div>
      </div>

      {/* PUBLIC STOREFRONT LINK */}
      {vendor.slug && (
        <Link
          href={`/store/${vendor.slug}`}
          className="text-sb-primary font-semibold underline text-sm"
          target="_blank"
        >
          View Public Storefront → /store/{vendor.slug}
        </Link>
      )}

      {/* PROFILE + METRICS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile */}
        <Card padding="lg" className="lg:col-span-2">
          <div className="flex flex-col md:flex-row gap-6">
            {vendor.logoUrl && (
              <div className="flex-shrink-0">
                <Image
                  src={vendor.logoUrl}
                  alt={vendor.name}
                  width={96}
                  height={96}
                  className="rounded-xl object-cover bg-gray-100"
                />
              </div>
            )}

            <div className="flex-1 space-y-3">
              <p className="text-gray-700">{vendor.description || "No description provided."}</p>

              <div className="flex flex-wrap gap-2">
                {vendor.categories?.map((c) => (
                  <Badge key={c} size="sm">
                    {c}
                  </Badge>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-700 mt-4">
                {vendor.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5 text-gray-500" />
                    <span>{vendor.address}</span>
                  </div>
                )}
                {vendor.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span>{vendor.phone}</span>
                  </div>
                )}
                {vendor.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span>{vendor.email}</span>
                  </div>
                )}
                {vendor.website && (
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-gray-500" />
                    <a
                      href={vendor.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sb-primary hover:underline"
                    >
                      {vendor.website}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Metrics */}
        <Card padding="lg">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Vendor Performance</h2>

          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-gray-600">Total Orders</dt>
              <dd className="font-semibold">{vendor.total_orders ?? 0}</dd>
            </div>

            <div className="flex items-center justify-between">
              <dt className="text-gray-600">Total Revenue</dt>
              <dd className="font-semibold">
                ${((vendor.total_revenue ?? 0) as number).toLocaleString()}
              </dd>
            </div>

            <div className="flex items-center justify-between">
              <dt className="text-gray-600">Rating</dt>
              <dd className="font-semibold">{vendor.rating ? `${vendor.rating.toFixed(1)} / 5` : "N/A"}</dd>
            </div>

            {vendor.stackbot_pin && (
              <div className="flex items-center justify-between">
                <dt className="text-gray-600">StackBot PIN</dt>
                <dd className="font-mono font-semibold">{vendor.stackbot_pin}</dd>
              </div>
            )}
          </dl>
        </Card>
      </div>

      {/* PRODUCTS */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Package className="h-5 w-5 text-sb-primary" />
          Products
        </h2>

        {products.length === 0 ? (
          <p className="text-gray-600 text-sm">No products found for this vendor.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {products.map((p) => (
              <Card key={p.id} padding="md">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{p.name}</h3>
                      <p className="text-xs text-gray-500">ID: {p.id}</p>
                    </div>

                    {typeof p.price === "number" && (
                      <span className="text-sm font-semibold text-sb-primary">${p.price.toFixed(2)}</span>
                    )}
                  </div>

                  {p.active !== undefined && (
                    <Badge size="sm" variant={p.active ? "success" : "danger"}>
                      {p.active ? "Active" : "Inactive"}
                    </Badge>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <Link
                      href={`/admin/vendors/${vendorId}/products/${p.id}/edit`}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-sb-primary hover:underline"
                    >
                      <Pencil className="h-4 w-4" /> Edit
                    </Link>

                    <button
                      className="inline-flex items-center gap-2 text-sm font-semibold text-red-600 hover:underline disabled:opacity-50"
                      disabled={deletingId === p.id}
                      onClick={() => deleteProduct(p.id)}
                      type="button"
                    >
                      <Trash2 className="h-4 w-4" />
                      {deletingId === p.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
