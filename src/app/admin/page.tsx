"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase/config";
import {
  collection,
  getDocs,
  orderBy,
  query,
  limit,
} from "firebase/firestore";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  Store,
  Clock,
  ShoppingCart,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Package,
  Users,
  ChevronRight,
} from "lucide-react";

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    vendors: 0,
    pending: 0,
    orders: 0,
    revenue: 0,
  });

  const [recentVendors, setRecentVendors] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [pendingVendors, setPendingVendors] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const vendorsSnap = await getDocs(collection(db, "vendors"));
        const vendors = vendorsSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        const pending = vendors.filter((v: any) => !v.verified);

        const ordersSnap = await getDocs(collection(db, "orders"));
        const orders = ordersSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        const revenue = orders.reduce(
          (sum, order: any) => sum + (order.total || 0),
          0
        );

        setStats({
          vendors: vendors.length,
          pending: pending.length,
          orders: orders.length,
          revenue,
        });

        setPendingVendors(pending);

        const rvSnap = await getDocs(
          query(
            collection(db, "vendors"),
            orderBy("created_at", "desc"),
            limit(5)
          )
        );
        setRecentVendors(
          rvSnap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }))
        );

        const roSnap = await getDocs(
          query(
            collection(db, "orders"),
            orderBy("timestamp", "desc"),
            limit(5)
          )
        );
        setRecentOrders(
          roSnap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }))
        );
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };

    load();
  }, []);

  if (loading) return <LoadingSpinner text="Loading Dashboard..." />;

  return (
    <div className="space-y-5 md:space-y-8 animate-fade-in pb-24 lg:pb-0">
      {/* Header Section - Mobile Optimized */}
      <header className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-sb-muted tracking-widest uppercase">
            Overview
          </p>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight mt-1">
            Dashboard
          </h1>
        </div>

        {/* Pending Alert Banner - Full width tap target */}
        {stats.pending > 0 && (
          <Link
            href="/admin/vendors/pending"
            className="flex items-center justify-between w-full p-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">
                  {stats.pending} Pending Vendor{stats.pending > 1 ? "s" : ""}
                </p>
                <p className="text-sm text-white/80">Tap to review</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5" />
          </Link>
        )}
      </header>

      {/* Stats Grid - 2x2 on mobile, 4 cols on desktop */}
      <div className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4">
        <StatCard
          icon={<Store className="h-5 w-5" />}
          label="Vendors"
          value={stats.vendors}
          color="blue"
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          label="Pending"
          value={stats.pending}
          highlight={stats.pending > 0}
          color="amber"
        />
        <StatCard
          icon={<ShoppingCart className="h-5 w-5" />}
          label="Orders"
          value={stats.orders}
          color="emerald"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Revenue"
          value={`$${stats.revenue.toLocaleString()}`}
          color="violet"
        />
      </div>

      {/* Quick Actions - Horizontal scroll on mobile */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:hidden scrollbar-hide snap-x snap-mandatory">
        <QuickAction href="/admin/vendors" icon={<Store className="h-5 w-5" />} label="Vendors" />
        <QuickAction href="/admin/orders" icon={<Package className="h-5 w-5" />} label="Orders" />
        <QuickAction href="/admin/customers" icon={<Users className="h-5 w-5" />} label="Customers" />
        <QuickAction href="/admin/analytics" icon={<TrendingUp className="h-5 w-5" />} label="Analytics" />
      </div>

      {/* Pending Vendors - Horizontal scroll cards on mobile */}
      {pendingVendors.length > 0 && (
        <section>
          <SectionHeader
            title="Pending Applications"
            count={pendingVendors.length}
            href="/admin/vendors/pending"
          />
          
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 lg:mx-0 lg:px-0 lg:grid lg:grid-cols-2 lg:overflow-visible scrollbar-hide snap-x snap-mandatory">
            {pendingVendors.slice(0, 4).map((v: any) => (
              <Link
                key={v.id}
                href={`/admin/vendors/${v.id}`}
                className="flex-shrink-0 w-[280px] lg:w-auto p-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl active:scale-[0.98] transition-transform snap-start"
              >
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-lg shadow-md flex-shrink-0">
                    {v.name?.charAt(0)?.toUpperCase() || "V"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{v.name}</p>
                    <p className="text-sm text-gray-500 truncate">{v.email}</p>
                    <div className="flex items-center gap-1 mt-2 text-amber-600 text-sm font-medium">
                      Review application
                      <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recent Activity - Stacked on mobile, side by side on desktop */}
      <div className="space-y-5 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0">
        {/* Recent Vendors */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <SectionHeader
            title="Recent Vendors"
            href="/admin/vendors"
            inCard
          />
          
          {recentVendors.length === 0 ? (
            <EmptyState
              icon={<Store className="h-8 w-8 text-gray-300" />}
              message="No vendors yet"
            />
          ) : (
            <div className="divide-y divide-gray-50">
              {recentVendors.map((v: any) => (
                <Link
                  key={v.id}
                  href={`/admin/vendors/${v.id}`}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-sb-primary/10 to-sb-primary/5 flex items-center justify-center text-sb-primary font-semibold flex-shrink-0">
                      {v.name?.charAt(0)?.toUpperCase() || "V"}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{v.name}</p>
                      <p className="text-sm text-gray-500 truncate">{v.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    <StatusBadge verified={v.verified} />
                    <ChevronRight className="h-5 w-5 text-gray-300" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Recent Orders */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <SectionHeader
            title="Recent Orders"
            href="/admin/orders"
            inCard
          />
          
          {recentOrders.length === 0 ? (
            <EmptyState
              icon={<ShoppingCart className="h-8 w-8 text-gray-300" />}
              message="No orders yet"
            />
          ) : (
            <div className="divide-y divide-gray-50">
              {recentOrders.map((o: any) => (
                <Link
                  key={o.id}
                  href={`/admin/orders/${o.id}`}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 flex items-center justify-center text-emerald-600 flex-shrink-0">
                      <Package className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900">
                        #{o.orderId || o.id.slice(0, 8)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {o.items?.length || 0} item{(o.items?.length || 0) !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        ${o.total?.toFixed(2) || "0.00"}
                      </p>
                      <OrderStatusBadge status={o.status} />
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-300" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ============ Sub Components ============

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  highlight?: boolean;
  color: "blue" | "amber" | "emerald" | "violet";
}

const colorConfig = {
  blue: {
    bg: "from-blue-500 to-blue-600",
    light: "bg-blue-50",
  },
  amber: {
    bg: "from-amber-500 to-orange-500",
    light: "bg-amber-50",
  },
  emerald: {
    bg: "from-emerald-500 to-emerald-600",
    light: "bg-emerald-50",
  },
  violet: {
    bg: "from-sb-primary to-violet-600",
    light: "bg-violet-50",
  },
};

function StatCard({ icon, label, value, highlight, color }: StatCardProps) {
  const colors = colorConfig[color];

  return (
    <div
      className={`relative overflow-hidden p-4 md:p-5 rounded-2xl border transition-all active:scale-[0.98] ${
        highlight
          ? "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200"
          : "bg-white border-gray-100"
      }`}
    >
      <div className={`inline-flex p-2.5 rounded-xl bg-gradient-to-br ${colors.bg} text-white shadow-lg mb-3`}>
        {icon}
      </div>
      <p className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
        {value}
      </p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
      
      {/* Decorative element */}
      <div className={`absolute -right-6 -bottom-6 w-20 h-20 rounded-full ${colors.light} opacity-50`} />
    </div>
  );
}

function QuickAction({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex-shrink-0 flex flex-col items-center justify-center gap-2 p-4 bg-white border border-gray-100 rounded-2xl min-w-[80px] active:scale-95 active:bg-gray-50 transition-all snap-start"
    >
      <div className="text-sb-primary">{icon}</div>
      <span className="text-xs font-medium text-gray-700">{label}</span>
    </Link>
  );
}

function SectionHeader({
  title,
  count,
  href,
  inCard,
}: {
  title: string;
  count?: number;
  href?: string;
  inCard?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between ${inCard ? "px-4 py-3 border-b border-gray-50" : "mb-3"}`}>
      <div className="flex items-center gap-2">
        <h2 className="font-semibold text-gray-900">{title}</h2>
        {count !== undefined && (
          <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
            {count}
          </span>
        )}
      </div>
      {href && (
        <Link
          href={href}
          className="text-sm font-medium text-sb-primary flex items-center gap-1 p-2 -m-2 active:opacity-70 rounded-lg"
        >
          View all
          <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon}
      <p className="text-sm text-gray-500 mt-2">{message}</p>
    </div>
  );
}

function StatusBadge({ verified }: { verified?: boolean }) {
  if (verified) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-full">
        <CheckCircle2 className="h-3 w-3" />
        <span className="hidden sm:inline">Verified</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 rounded-full">
      <Clock className="h-3 w-3" />
      <span className="hidden sm:inline">Pending</span>
    </span>
  );
}

function OrderStatusBadge({ status }: { status?: string }) {
  const config: Record<string, { label: string; className: string }> = {
    pending: { label: "Pending", className: "text-amber-700 bg-amber-50" },
    confirmed: { label: "Confirmed", className: "text-blue-700 bg-blue-50" },
    preparing: { label: "Preparing", className: "text-violet-700 bg-violet-50" },
    out_for_delivery: { label: "Transit", className: "text-indigo-700 bg-indigo-50" },
    delivered: { label: "Done", className: "text-emerald-700 bg-emerald-50" },
    cancelled: { label: "Cancelled", className: "text-red-700 bg-red-50" },
  };

  const { label, className } = config[status || "pending"] || config.pending;

  return (
    <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${className}`}>
      {label}
    </span>
  );
}