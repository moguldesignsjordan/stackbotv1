"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { db, functions } from "@/lib/firebase/config";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { AlertCircle, Store, CheckCircle2 } from "lucide-react";

interface Vendor {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  description?: string;
  categories?: string[];
  logoUrl?: string;
  verified?: boolean;
}

export default function PendingVendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const loadPending = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "vendors"),
        where("verified", "==", false)
      );

      const snap = await getDocs(q);

      setVendors(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }))
      );
    } catch (err) {
      console.error("Error loading pending vendors", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPending();
  }, []);

  // 🔥 NEW APPROVE FUNCTION — calls Cloud Function approveVendor
  const handleApprove = async (vendorId: string) => {
    try {
      setApprovingId(vendorId);

      const approveFn = httpsCallable(functions, "approveVendor");
      const res: any = await approveFn({ vendorId });

      alert(
        `Vendor Approved!\n\nEmail: ${res.data.email}\nPassword: ${res.data.password}`
      );

      await loadPending();
    } catch (err: any) {
      console.error("Error approving vendor", err);
      alert("Failed to approve vendor: " + err.message);
    } finally {
      setApprovingId(null);
    }
  };

  if (loading) return <LoadingSpinner text="Loading pending vendors..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <AlertCircle className="h-7 w-7 text-yellow-500" />
          Pending Vendors
        </h1>

        <Link
          href="/admin/vendors"
          className="text-sb-primary font-semibold hover:underline"
        >
          Back to Vendors →
        </Link>
      </div>

      {vendors.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="h-10 w-10" />}
          title="No pending vendor applications"
          description="All vendor applications have been reviewed."
        />
      ) : (
        <div className="space-y-4">
          {vendors.map((vendor) => (
            <Card
              key={vendor.id}
              padding="lg"
              className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
            >
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Store className="h-5 w-5 text-sb-primary" />
                  {vendor.name}
                </h3>

                <p className="text-sm text-gray-600 mt-1">
                  {vendor.email} · {vendor.phone}
                </p>

                {vendor.address && (
                  <p className="text-xs text-gray-500 mt-1">{vendor.address}</p>
                )}

                {vendor.description && (
                  <p className="text-sm text-gray-700 mt-2 line-clamp-2">
                    {vendor.description}
                  </p>
                )}

                <div className="mt-2 flex flex-wrap gap-2">
                  {vendor.categories?.slice(0, 4).map((c) => (
                    <span
                      key={c}
                      className="inline-flex px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => handleApprove(vendor.id)}
                  loading={approvingId === vendor.id}
                >
                  Approve Vendor
                </Button>

                <Link
                  href={`/admin/vendors/${vendor.id}`}
                  className="text-sm text-sb-primary font-medium hover:underline"
                >
                  View full profile →
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
