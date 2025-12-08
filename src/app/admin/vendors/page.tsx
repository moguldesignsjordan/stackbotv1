// src/app/admin/vendors/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { db } from "@/lib/firebase/config";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Store, AlertCircle, CheckCircle2 } from "lucide-react";

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
  total_orders?: number;
  total_revenue?: number;
  rating?: number;
}

export default function VendorsAdminPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDocs(
          query(collection(db, "vendors"), orderBy("created_at", "desc"))
        );
        setVendors(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Vendor[]
        );
      } catch (err) {
        console.error("Error loading vendors", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) return <LoadingSpinner text="Loading vendors..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Store className="h-7 w-7 text-sb-primary" />
          Vendors
        </h1>
        <Link
          href="/admin/vendors/pending"
          className="text-sb-primary font-semibold hover:underline"
        >
          Review Pending Vendors →
        </Link>
      </div>

      {vendors.length === 0 ? (
        <p className="text-gray-600">No vendors found.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {vendors.map((vendor) => (
            <Link key={vendor.id} href={`/admin/vendors/${vendor.id}`}>
              <Card
                padding="lg"
                hover
                className="h-full flex flex-col justify-between"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {vendor.name || "Unnamed Vendor"}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {vendor.address || vendor.email || "No contact details"}
                    </p>
                  </div>
                  <Badge
                    variant={vendor.verified ? "success" : "warning"}
                    size="sm"
                  >
                    {vendor.verified ? (
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Approved
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Pending
                      </span>
                    )}
                  </Badge>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {vendor.categories?.slice(0, 4).map((c) => (
                    <Badge key={c} size="sm">
                      {c}
                    </Badge>
                  ))}
                  {vendor.categories && vendor.categories.length > 4 && (
                    <span className="text-xs text-gray-500">
                      +{vendor.categories.length - 4} more
                    </span>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                  <span>
                    Orders: {vendor.total_orders ?? 0} · Revenue: $
                    {(vendor.total_revenue ?? 0).toLocaleString()}
                  </span>
                  <span className="italic">View details →</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
