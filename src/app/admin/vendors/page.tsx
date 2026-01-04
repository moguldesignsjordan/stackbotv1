// src/app/admin/vendors/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/firebase/config";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Store, AlertCircle, CheckCircle2, Plus, ShieldBan, Search } from "lucide-react";

import { 
  vendorMatchesCategoryFilter, 
  getUniqueCategoriesFromVendors 
} from "@/lib/utils/vendor-filters";
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
  status?: "pending" | "approved" | "suspended";
  total_orders?: number;
  total_revenue?: number;
  rating?: number;
}

export default function VendorsAdminPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "approved" | "pending" | "suspended">("all");

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

  // Filter vendors
  const filteredVendors = vendors.filter((v) => {
    const matchesSearch =
      !searchTerm ||
      v.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.address?.toLowerCase().includes(searchTerm.toLowerCase());

    const vendorStatus = v.status || (v.verified ? "approved" : "pending");
    const matchesStatus = statusFilter === "all" || vendorStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Count by status
  const counts = {
    all: vendors.length,
    approved: vendors.filter((v) => v.status === "approved" || v.verified).length,
    pending: vendors.filter((v) => v.status === "pending" || (!v.status && !v.verified)).length,
    suspended: vendors.filter((v) => v.status === "suspended").length,
  };

  if (loading) return <LoadingSpinner text="Loading vendors..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Store className="h-6 w-6 sm:h-7 sm:w-7 text-sb-primary" />
          Vendors
        </h1>
        <div className="flex items-center gap-3">
          <Link href="/admin/vendors/pending">
            <Button variant="secondary" size="sm">
              <AlertCircle className="h-4 w-4 mr-1" />
              Review Pending ({counts.pending})
            </Button>
          </Link>
          <Link href="/admin/vendors/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Vendor
            </Button>
          </Link>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search vendors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-sb-primary focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "approved", "pending", "suspended"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                statusFilter === status
                  ? "bg-sb-primary text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)} ({counts[status]})
            </button>
          ))}
        </div>
      </div>

      {/* Vendors Grid */}
      {filteredVendors.length === 0 ? (
        <div className="text-center py-12">
          <Store className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">No vendors found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredVendors.map((vendor) => {
            const vendorStatus = vendor.status || (vendor.verified ? "approved" : "pending");
            
            return (
              <Link key={vendor.id} href={`/admin/vendors/${vendor.id}`}>
                <Card
                  padding="lg"
                  hover
                  className="h-full flex flex-col justify-between"
                >
                  <div className="flex items-start gap-4">
                    {/* Logo */}
                    <div className="w-14 h-14 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden">
                      {vendor.logoUrl ? (
                        <Image
                          src={vendor.logoUrl}
                          alt={vendor.name}
                          width={56}
                          height={56}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Store className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {vendor.name || "Unnamed Vendor"}
                        </h3>
                        <Badge
                          variant={
                            vendorStatus === "approved"
                              ? "success"
                              : vendorStatus === "suspended"
                              ? "danger"
                              : "warning"
                          }
                          size="sm"
                        >
                          {vendorStatus === "approved" && (
                            <span className="inline-flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Approved
                            </span>
                          )}
                          {vendorStatus === "pending" && (
                            <span className="inline-flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Pending
                            </span>
                          )}
                          {vendorStatus === "suspended" && (
                            <span className="inline-flex items-center gap-1">
                              <ShieldBan className="h-3 w-3" />
                              Suspended
                            </span>
                          )}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1 truncate">
                        {vendor.email || vendor.phone || vendor.address || "No contact details"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {vendor.categories?.slice(0, 3).map((c) => (
                      <Badge key={c} size="sm">
                        {c}
                      </Badge>
                    ))}
                    {vendor.categories && vendor.categories.length > 3 && (
                      <span className="text-xs text-gray-500">
                        +{vendor.categories.length - 3} more
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                    <span>
                      Orders: {vendor.total_orders ?? 0} · Revenue: $
                      {(vendor.total_revenue ?? 0).toLocaleString()}
                    </span>
                    <span className="text-sb-primary font-medium">View details →</span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}