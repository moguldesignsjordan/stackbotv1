"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
  addDoc,
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
  slug?: string;
  total_orders?: number;
  total_revenue?: number;
  rating?: number;
  stackbot_pin?: string;
  status?: "approved" | "suspended" | "pending";
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
  const router = useRouter();

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [working, setWorking] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);

  const isSuspended = useMemo(
    () => vendor?.status === "suspended",
    [vendor]
  );

  /* ===============================
     LOAD VENDOR + PRODUCTS
  =============================== */
  useEffect(() => {
    if (!vendorId) return;

    const load = async () => {
      setLoading(true);
      try {
        const vendorRef = doc(db, "vendors", vendorId);
        const vendorSnap = await getDoc(vendorRef);

        if (!vendorSnap.exists()) {
          setVendor(null);
          setProducts([]);
          return;
        }

        const vendorData = {
          id: vendorSnap.id,
          ...(vendorSnap.data() as any),
        } as Vendor;

        setVendor(vendorData);

        const prodSnap = await getDocs(
          collection(db, "vendors", vendorId, "products")
        );

        setProducts(
          prodSnap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as any),
          }))
        );
      } catch (err) {
        console.error("Admin vendor load error:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [vendorId]);

  /* ===============================
     AUDIT LOG
  =============================== */
  async function logAudit(action: string) {
    const admin = auth.currentUser;
    if (!admin || !vendor) return;

    await addDoc(collection(db, "admin_audit_logs"), {
      action,
      vendorId: vendor.id,
      vendorName: vendor.name,
      adminUid: admin.uid,
      adminEmail: admin.email,
      timestamp: serverTimestamp(),
    });
  }

  /* ===============================
     SUSPEND / REINSTATE
  =============================== */
  async function toggleSuspension() {
    if (!vendorId || !vendor) return;

    const nextStatus =
      vendor.status === "suspended" ? "approved" : "suspended";

    const confirmMsg =
      nextStatus === "suspended"
        ? "Suspend this vendor? They will be hidden everywhere and unable to log in."
        : "Reinstate this vendor and restore access?";

    if (!confirm(confirmMsg)) return;

    try {
      setWorking(true);

      await updateDoc(doc(db, "vendors", vendorId), {
        status: nextStatus,
        updated_at: serverTimestamp(),
      });

      await fetch(
        `/api/admin/${nextStatus === "suspended" ? "disable-user" : "enable-user"}`,
        {
          method: "POST",
          body: JSON.stringify({ uid: vendorId }),
        }
      );

      await logAudit(
        nextStatus === "suspended"
          ? "suspend_vendor"
          : "reinstate_vendor"
      );

      setVendor({ ...vendor, status: nextStatus });
    } catch (e) {
      console.error("Suspend/Reinstate failed:", e);
      alert("Failed to update vendor status.");
    } finally {
      setWorking(false);
    }
  }

  /* ===============================
     DELETE PRODUCT
  =============================== */
  async function deleteProduct(productId: string) {
    if (!vendorId) return;
    if (!confirm("Delete this product permanently?")) return;

    try {
      setDeletingProductId(productId);
      await deleteDoc(
        doc(db, "vendors", vendorId, "products", productId)
      );
      setProducts((prev) => prev.filter((p) => p.id !== productId));
    } catch (e) {
      console.error("Delete product failed:", e);
      alert("Failed to delete product.");
    } finally {
      setDeletingProductId(null);
    }
  }

  /* ===============================
     DELETE VENDOR (CASCADE)
  =============================== */
  async function deleteVendor() {
    if (!vendorId || !vendor) return;

    if (
      !confirm(
        "This will permanently delete the vendor, all products, disable auth, and remove storage files. This cannot be undone."
      )
    )
      return;

    try {
      setWorking(true);

      await fetch("/api/admin/delete-vendor", {
        method: "POST",
        body: JSON.stringify({ vendorId }),
      });

      await logAudit("delete_vendor");

      router.push("/admin/vendors");
    } catch (e) {
      console.error("Delete vendor failed:", e);
      alert("Failed to delete vendor.");
    } finally {
      setWorking(false);
    }
  }

  /* ===============================
     UI STATES
  =============================== */
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
            <Badge variant="danger">Suspended</Badge>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={toggleSuspension}
            loading={working}
            variant={isSuspended ? "secondary" : "danger"}
          >
            {isSuspended ? (
              <>
                <ShieldCheck className="h-4 w-4 mr-1" />
                Reinstate
              </>
            ) : (
              <>
                <ShieldBan className="h-4 w-4 mr-1" />
                Suspend
              </>
            )}
          </Button>

          <Button
            onClick={deleteVendor}
            loading={working}
            variant="danger"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete Vendor
          </Button>
        </div>
      </div>

      {/* PUBLIC LINK */}
      {vendor.slug && (
        <Link
          href={`/store/${vendor.slug}`}
          className="text-sb-primary font-semibold underline text-sm"
          target="_blank"
        >
          View Public Storefront →
        </Link>
      )}

      {/* PROFILE + METRICS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card padding="lg" className="lg:col-span-2">
          <div className="flex gap-6">
            {vendor.logoUrl && (
              <Image
                src={vendor.logoUrl}
                alt={vendor.name}
                width={96}
                height={96}
                className="rounded-xl bg-gray-100"
              />
            )}

            <div className="space-y-3">
              <p>{vendor.description || "No description provided."}</p>

              <div className="flex flex-wrap gap-2">
                {vendor.categories?.map((c) => (
                  <Badge key={c} size="sm">
                    {c}
                  </Badge>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {vendor.address && (
                  <div className="flex gap-2">
                    <MapPin className="h-4 w-4" />
                    {vendor.address}
                  </div>
                )}
                {vendor.phone && (
                  <div className="flex gap-2">
                    <Phone className="h-4 w-4" />
                    {vendor.phone}
                  </div>
                )}
                {vendor.email && (
                  <div className="flex gap-2">
                    <Mail className="h-4 w-4" />
                    {vendor.email}
                  </div>
                )}
                {vendor.website && (
                  <a
                    href={vendor.website}
                    target="_blank"
                    rel="noreferrer"
                    className="flex gap-2 text-sb-primary underline"
                  >
                    <Globe className="h-4 w-4" />
                    Website
                  </a>
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card padding="lg">
          <h2 className="font-semibold mb-3">Performance</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Total Orders</span>
              <strong>{vendor.total_orders ?? 0}</strong>
            </div>
            <div className="flex justify-between">
              <span>Total Revenue</span>
              <strong>${(vendor.total_revenue ?? 0).toLocaleString()}</strong>
            </div>
            <div className="flex justify-between">
              <span>Rating</span>
              <strong>{vendor.rating ?? "N/A"}</strong>
            </div>
          </div>
        </Card>
      </div>

      {/* PRODUCTS */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Package className="h-5 w-5" /> Products
        </h2>

        {products.length === 0 ? (
          <p className="text-sm text-gray-600">No products found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {products.map((p) => (
              <Card key={p.id} padding="md">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <strong>{p.name}</strong>
                    {typeof p.price === "number" && (
                      <span>${p.price.toFixed(2)}</span>
                    )}
                  </div>

                  {p.active !== undefined && (
                    <Badge size="sm" variant={p.active ? "success" : "danger"}>
                      {p.active ? "Active" : "Inactive"}
                    </Badge>
                  )}

                  <div className="flex gap-3 pt-2">
                    <Link
                      href={`/admin/vendors/${vendorId}/products/${p.id}/edit`}
                      className="text-sm text-sb-primary underline"
                    >
                      <Pencil className="h-4 w-4 inline mr-1" />
                      Edit
                    </Link>

                    <button
                      disabled={deletingProductId === p.id}
                      onClick={() => deleteProduct(p.id)}
                      className="text-sm text-red-600 underline disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4 inline mr-1" />
                      {deletingProductId === p.id
                        ? "Deleting..."
                        : "Delete"}
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
