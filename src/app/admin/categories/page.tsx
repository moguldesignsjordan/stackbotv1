"use client";

import { useEffect, useState, useMemo } from "react";
import { db } from "@/lib/firebase/config";
import { collection, getDocs, query, where } from "firebase/firestore";
import { 
  getAllCategories, 
  VENDOR_CATEGORIES,
  vendorMatchesCategory,
  PublicCategory 
} from "@/lib/config/categories";
import {
  Search,
  Grid3X3,
  Store,
  TrendingUp,
  Settings,
  Eye,
  Users,
  Package,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

/* ======================================================
   TYPES
====================================================== */

interface CategoryStats extends PublicCategory {
  vendorCount: number;
  activeVendors: number;
  pendingVendors: number;
  suspendedVendors: number;
  productCount: number;
  estimatedRevenue: number;
}

interface Vendor {
  id: string;
  status?: string;
  category?: string;
  categories?: string[];
}

/* ======================================================
   MAIN PAGE
====================================================== */

export default function AdminCategoriesPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "low" | "empty">("all");

  // Fetch all vendors
  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const vendorsSnap = await getDocs(collection(db, "vendors"));
        const vendorsList = vendorsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Vendor[];

        setVendors(vendorsList);
      } catch (err) {
        console.error("Error fetching vendors:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchVendors();
  }, []);

  // Compute category stats
  const categoryStats = useMemo<CategoryStats[]>(() => {
    const allCats = getAllCategories();

    return allCats.map(cat => {
      const matchingVendors = vendors.filter(v => vendorMatchesCategory(v, cat.id));

      const activeVendors = matchingVendors.filter(
        v => v.status === "approved" || (!v.status && v)
      ).length;

      const pendingVendors = matchingVendors.filter(
        v => v.status === "pending" || v.status === "pending_review"
      ).length;

      const suspendedVendors = matchingVendors.filter(
        v => v.status === "suspended" || v.status === "rejected"
      ).length;

      return {
        ...cat,
        vendorCount: matchingVendors.length,
        activeVendors,
        pendingVendors,
        suspendedVendors,
        productCount: activeVendors * 5, // Estimate
        estimatedRevenue: activeVendors * 150, // Estimate
      };
    });
  }, [vendors]);

  // Filter categories
  const filteredCategories = useMemo(() => {
    let result = categoryStats;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        cat =>
          cat.name.toLowerCase().includes(q) ||
          cat.description.toLowerCase().includes(q) ||
          cat.id.includes(q)
      );
    }

    // Status filter
    switch (filterStatus) {
      case "active":
        result = result.filter(cat => cat.activeVendors > 5);
        break;
      case "low":
        result = result.filter(cat => cat.activeVendors > 0 && cat.activeVendors <= 5);
        break;
      case "empty":
        result = result.filter(cat => cat.vendorCount === 0);
        break;
    }

    return result.sort((a, b) => b.vendorCount - a.vendorCount);
  }, [categoryStats, searchQuery, filterStatus]);

  // Overall stats
  const overallStats = useMemo(() => {
    return {
      totalCategories: categoryStats.length,
      activeCategories: categoryStats.filter(c => c.activeVendors > 0).length,
      totalVendors: vendors.length,
      totalActive: categoryStats.reduce((sum, c) => sum + c.activeVendors, 0),
      totalPending: categoryStats.reduce((sum, c) => sum + c.pendingVendors, 0),
    };
  }, [categoryStats, vendors]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#55529d] rounded-xl flex items-center justify-center">
                <Grid3X3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Category Management</h1>
                <p className="text-sm text-gray-500">
                  {overallStats.totalCategories} categories • {overallStats.totalVendors} total vendors
                </p>
              </div>
            </div>

            <Link
              href="/admin"
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* OVERVIEW STATS */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Total Categories"
            value={overallStats.totalCategories}
            icon={Grid3X3}
            color="bg-blue-100 text-blue-600"
          />
          <StatCard
            label="Active Categories"
            value={overallStats.activeCategories}
            icon={CheckCircle2}
            color="bg-green-100 text-green-600"
          />
          <StatCard
            label="Active Vendors"
            value={overallStats.totalActive}
            icon={Store}
            color="bg-purple-100 text-purple-600"
          />
          <StatCard
            label="Pending Approval"
            value={overallStats.totalPending}
            icon={AlertCircle}
            color="bg-yellow-100 text-yellow-600"
          />
        </div>

        {/* FILTERS */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search categories..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#55529d]/20 focus:border-[#55529d] transition-all"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-2">
            {[
              { value: "all", label: "All" },
              { value: "active", label: "Active (5+)" },
              { value: "low", label: "Low (1-5)" },
              { value: "empty", label: "Empty" },
            ].map(option => (
              <button
                key={option.value}
                onClick={() => setFilterStatus(option.value as any)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filterStatus === option.value
                    ? "bg-[#55529d] text-white"
                    : "bg-white text-gray-600 border border-gray-200 hover:border-[#55529d]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* CATEGORIES TABLE */}
        {loading ? (
          <LoadingState />
        ) : filteredCategories.length === 0 ? (
          <EmptyState searchQuery={searchQuery} />
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Vendors
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Products
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredCategories.map(cat => (
                    <CategoryRow key={cat.id} category={cat} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VENDOR CATEGORY CONFIG INFO */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Category Configuration</h3>
              <p className="text-sm text-blue-700 mb-3">
                Categories are configured in <code className="bg-blue-100 px-2 py-0.5 rounded text-xs">/lib/config/categories.ts</code> and <code className="bg-blue-100 px-2 py-0.5 rounded text-xs">/lib/config/vendor-categories.ts</code>
              </p>
              <p className="text-sm text-blue-700">
                To add or modify categories, update the configuration files and redeploy. Each vendor category has specific features like delivery support, service areas, appointment scheduling, etc.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ======================================================
   STAT CARD
====================================================== */

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: any;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500 mt-1">{label}</div>
    </div>
  );
}

/* ======================================================
   CATEGORY ROW
====================================================== */

function CategoryRow({ category }: { category: CategoryStats }) {
  const Icon = category.icon;

  const statusColor =
    category.activeVendors > 5
      ? "text-green-600 bg-green-100"
      : category.activeVendors > 0
      ? "text-yellow-600 bg-yellow-100"
      : "text-gray-400 bg-gray-100";

  const statusLabel =
    category.activeVendors > 5
      ? "Active"
      : category.activeVendors > 0
      ? "Low Activity"
      : "Empty";

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      {/* Category Name & Icon */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 ${category.bgColor} ${category.color} rounded-lg flex items-center justify-center`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <div className="font-semibold text-gray-900">{category.name}</div>
            <div className="text-sm text-gray-500">{category.description}</div>
          </div>
        </div>
      </td>

      {/* Vendor Stats */}
      <td className="px-6 py-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-gray-900">
              {category.activeVendors} active
            </span>
          </div>
          {category.pendingVendors > 0 && (
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              <span className="text-sm text-gray-600">{category.pendingVendors} pending</span>
            </div>
          )}
          {category.suspendedVendors > 0 && (
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm text-gray-600">{category.suspendedVendors} suspended</span>
            </div>
          )}
        </div>
      </td>

      {/* Status */}
      <td className="px-6 py-4">
        <span className={`inline-flex items-center gap-1 px-3 py-1 ${statusColor} rounded-full text-xs font-semibold`}>
          {statusLabel}
        </span>
      </td>

      {/* Products */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Package className="w-4 h-4" />
          ~{category.productCount}
        </div>
      </td>

      {/* Actions */}
      <td className="px-6 py-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <Link
            href={`/categories/${category.id}`}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
          >
            <Eye className="w-4 h-4" />
            View
          </Link>
          <Link
            href={`/vendors?category=${category.id}`}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#55529d]/10 text-[#55529d] rounded-lg hover:bg-[#55529d]/20 transition-colors text-sm font-medium"
          >
            <Users className="w-4 h-4" />
            Vendors
          </Link>
        </div>
      </td>
    </tr>
  );
}

/* ======================================================
   LOADING STATE
====================================================== */

function LoadingState() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8">
      <div className="space-y-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse" />
              <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse" />
            </div>
            <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ======================================================
   EMPTY STATE
====================================================== */

function EmptyState({ searchQuery }: { searchQuery: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
        <Search className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">No categories found</h3>
      <p className="text-gray-500">
        {searchQuery ? `No categories match "${searchQuery}"` : "No categories available"}
      </p>
    </div>
  );
}