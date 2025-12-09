"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { db, auth } from "@/lib/firebase/config";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
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
}

interface Product {
  id: string;
  name: string;
  price?: number;
  imageUrl?: string;
  active?: boolean;
}

export default function VendorDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const vendorId = params?.id;

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    if (!vendorId) return;

    const load = async () => {
      setLoading(true);
      try {
        // Load vendor
        const vendorRef = doc(db, "vendors", vendorId);
        const vendorSnap = await getDoc(vendorRef);

        if (vendorSnap.exists()) {
          setVendor({
            id: vendorSnap.id,
            ...(vendorSnap.data() as any),
          });
        } else {
          setVendor(null);
        }

        // Load products for this vendor
        const productsRef = collection(db, "products");
        const q = query(productsRef, where("vendorId", "==", vendorId));
        const prodSnap = await getDocs(q);

        setProducts(
          prodSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
        );
      } catch (err) {
        console.error("Error loading vendor detail", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [vendorId]);

  // 🔥 APPROVE VENDOR FUNCTION - Using HTTP endpoint
  async function approveVendor() {
    if (!vendorId) return;

    try {
      setApproving(true);

      const user = auth.currentUser;
      if (!user) {
        alert("You must be logged in!");
        return;
      }

      // Get fresh token
      const token = await user.getIdToken(true);

      console.log("=== APPROVE VENDOR DEBUG ===");
      console.log("Vendor ID:", vendorId);

      // Make HTTP request to Cloud Function
      const res = await fetch(
        "https://approvevendor-j5kxrjebxa-uc.a.run.app",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ vendorId }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(`Approval failed: ${data.error}`);
        return;
      }

      alert(`Vendor approved successfully!\n\nEmail: ${data.email}`);

      // Reload the page to show updated status
      window.location.reload();
    } catch (err: any) {
      console.error("Approve error:", err);
      alert("Unable to approve vendor: " + err.message);
    } finally {
      setApproving(false);
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
      {/* ===== HEADER ===== */}
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
        </div>

        <div className="flex items-center gap-3">
          {/* APPROVE BUTTON — only when NOT approved */}
          {!vendor.verified && (
            <Button onClick={approveVendor} loading={approving} variant="primary">
              Approve Vendor
            </Button>
          )}

          <Badge variant={vendor.verified ? "success" : "warning"}>
            {vendor.verified ? "Approved" : "Pending"}
          </Badge>
        </div>
      </div>

      {/* ===== LINK TO PUBLIC SHOP PAGE ===== */}
      {vendor.slug && (
        <Link
          href={`/vendors/${vendor.slug}`}
          className="text-sb-primary font-semibold underline text-sm"
          target="_blank"
        >
          View Public Storefront → /vendors/{vendor.slug}
        </Link>
      )}

      {/* ===== PROFILE & METRICS ===== */}
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
              <p className="text-gray-700">
                {vendor.description || "No description provided."}
              </p>

              <div className="flex flex-wrap gap-2">
                {vendor.categories?.map((c) => (
                  <Badge key={c} size="sm">
                    {c}
                  </Badge>
                ))}
              </div>

              {/* Contact Info */}
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
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Vendor Performance
          </h2>

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
              <dd className="font-semibold">
                {vendor.rating ? `${vendor.rating.toFixed(1)} / 5` : "N/A"}
              </dd>
            </div>

            {vendor.stackbot_pin && (
              <div className="flex items-center justify-between">
                <dt className="text-gray-600">StackBot PIN</dt>
                <dd className="font-mono font-semibold">
                  {vendor.stackbot_pin}
                </dd>
              </div>
            )}
          </dl>
        </Card>
      </div>

      {/* ===== PRODUCTS ===== */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Package className="h-5 w-5 text-sb-primary" />
          Products
        </h2>

        {products.length === 0 ? (
          <p className="text-gray-600 text-sm">
            No products found for this vendor.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {products.map((p) => (
              <Card key={p.id} padding="md">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">{p.name}</h3>
                    {typeof p.price === "number" && (
                      <span className="text-sm font-semibold text-sb-primary">
                        ${p.price.toFixed(2)}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-500">ID: {p.id}</p>

                  {p.active !== undefined && (
                    <Badge
                      size="sm"
                      variant={p.active ? "success" : "danger"}
                    >
                      {p.active ? "Active" : "Inactive"}
                    </Badge>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}