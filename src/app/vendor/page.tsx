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
  orderBy,
  limit,
} from "firebase/firestore";
import Image from "next/image";
import Link from "next/link";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  Package,
  PlusCircle,
  ShoppingCart,
  DollarSign,
  Star,
  Settings,
  ChevronRight,
  TrendingUp,
  Clock,
  Eye,
  ExternalLink,
} from "lucide-react";

// Types
interface VendorData {
  name: string;
  email: string;
  logoUrl?: string;
  slug?: string;
  total_orders?: number;
  total_revenue?: number;
  rating?: number;
  pending_orders?: number;
  total_products?: number;
  missing?: boolean;
}

interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  status?: string;
  stock?: number;
}

interface Order {
  id: string;
  customer_name?: string;
  total?: number;
  status?: string;
  timestamp?: any;
  items?: any[];
}

export default function VendorDashboard() {
  const [user, setUser] = useState<any>(null);
  const [vendor, setVendor] = useState<VendorData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  /* ---------------- AUTH ---------------- */
  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (u) {
        await u.getIdToken(true);
        setUser(u);
      }
    });
  }, []);

  /* ---------------- LOAD DATA ---------------- */
  const loadDashboard = useCallback(async (u: any) => {
    try {
      // 1. Load vendor profile
      const vendorRef = doc(db, "vendors", u.uid);
      const vendorSnap = await getDoc(vendorRef);

      if (!vendorSnap.exists()) {
        setVendor({ missing: true } as VendorData);
        setLoading(false);
        return;
      }

      const vendorData = vendorSnap.data() as VendorData;
      setVendor(vendorData);

      // 2. Load products from subcollection
      try {
        const productsSnap = await getDocs(
          query(
            collection(db, "vendors", u.uid, "products"),
            orderBy("created_at", "desc"),
            limit(5)
          )
        );
        setProducts(productsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Product)));
      } catch (err) {
        console.error("Products load error:", err);
        setProducts([]);
      }

      // 3. Load orders from subcollection
      try {
        const ordersSnap = await getDocs(
          query(
            collection(db, "vendors", u.uid, "orders"),
            orderBy("timestamp", "desc"),
            limit(5)
          )
        );
        setOrders(ordersSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Order)));
      } catch (err) {
        console.error("Orders load error:", err);
        setOrders([]);
      }

      setLoading(false);
    } catch (err) {
      console.error("Dashboard error:", err);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) loadDashboard(user);
  }, [user, loadDashboard]);

  /* ---------------- STATES ---------------- */
  if (!user) return <LoadingSpinner text="Preparing dashboard..." />;
  if (loading) return <LoadingSpinner text="Loading dashboard..." />;
  if (vendor?.missing) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <p className="text-red-600 font-semibold">Vendor profile not found</p>
          <p className="text-gray-500 text-sm mt-1">Please contact support</p>
        </div>
      </div>
    );
  }

  const pendingOrders = orders.filter((o) => o.status === "pending").length;

  /* ---------------- UI ---------------- */
  return (
    <div className="space-y-5 md:space-y-8 animate-fade-in pb-24 lg:pb-0">
      {/* Header Section */}
      <header className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Image
              src={vendor?.logoUrl || "/placeholder.png"}
              width={56}
              height={56}
              alt="Store Logo"
              className="rounded-xl border border-gray-100 object-cover"
            />
            <div>
              <p className="text-xs font-semibold text-sb-muted tracking-widest uppercase">
                Vendor Portal
              </p>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
                {vendor?.name || "Dashboard"}
              </h1>
            </div>
          </div>

          {vendor?.slug && (
            <Link
              href={`/store/${vendor.slug}`}
              target="_blank"
              className="inline-flex items-center gap-2 px-4 py-2 bg-sb-primary/10 text-sb-primary rounded-xl font-semibold text-sm hover:bg-sb-primary/20 transition-colors"
            >
              <Eye className="h-4 w-4" />
              View Storefront
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        {/* Pending Orders Alert */}
        {pendingOrders > 0 && (
          <Link
            href="/vendor/orders?status=pending"
            className="flex items-center justify-between w-full p-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">
                  {pendingOrders} Pending Order{pendingOrders > 1 ? "s" : ""}
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
          icon={<ShoppingCart className="h-5 w-5" />}
          label="Total Orders"
          value={vendor?.total_orders || 0}
          color="blue"
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          label="Pending"
          value={pendingOrders}
          highlight={pendingOrders > 0}
          color="amber"
        />
        <StatCard
          icon={<DollarSign className="h-5 w-5" />}
          label="Revenue"
          value={`$${(vendor?.total_revenue || 0).toLocaleString()}`}
          color="emerald"
        />
        <StatCard
          icon={<Star className="h-5 w-5" />}
          label="Rating"
          value={vendor?.rating ? `${vendor.rating.toFixed(1)} ⭐` : "N/A"}
          color="violet"
        />
      </div>

      {/* Quick Actions - Horizontal scroll on mobile */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:hidden scrollbar-hide snap-x snap-mandatory">
        <QuickAction href="/vendor/products" icon={<Package className="h-5 w-5" />} label="Products" />
        <QuickAction href="/vendor/products/new" icon={<PlusCircle className="h-5 w-5" />} label="Add New" />
        <QuickAction href="/vendor/orders" icon={<ShoppingCart className="h-5 w-5" />} label="Orders" />
        <QuickAction href="/vendor/settings" icon={<Settings className="h-5 w-5" />} label="Settings" />
      </div>

      {/* Desktop Quick Actions */}
      <div className="hidden md:grid md:grid-cols-4 gap-4">
        <QuickActionDesktop
          href="/vendor/products"
          icon={<Package className="h-5 w-5" />}
          label="Manage Products"
          description="View and edit inventory"
        />
        <QuickActionDesktop
          href="/vendor/products/new"
          icon={<PlusCircle className="h-5 w-5" />}
          label="Add Product"
          description="List a new item"
        />
        <QuickActionDesktop
          href="/vendor/orders"
          icon={<ShoppingCart className="h-5 w-5" />}
          label="View Orders"
          description="Manage customer orders"
        />
        <QuickActionDesktop
          href="/vendor/settings"
          icon={<Settings className="h-5 w-5" />}
          label="Store Settings"
          description="Update your profile"
        />
      </div>

      {/* Recent Sections Grid */}
      <div className="grid lg:grid-cols-2 gap-5 md:gap-6">
        {/* Recent Orders */}
        <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <SectionHeader
            title="Recent Orders"
            count={orders.length}
            href="/vendor/orders"
          />

          {orders.length === 0 ? (
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <ShoppingCart className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-gray-500 text-sm">No orders yet</p>
              <p className="text-gray-400 text-xs mt-1">Orders will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {orders.slice(0, 5).map((order) => (
                <Link
                  key={order.id}
                  href={`/vendor/orders/${order.id}`}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">
                      {order.customer_name || "Customer"}
                    </p>
                    <p className="text-sm text-gray-500">
                      {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        ${order.total?.toFixed(2) || "0.00"}
                      </p>
                      <OrderStatusBadge status={order.status || "pending"} />
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-300" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Recent Products */}
        <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <SectionHeader
            title="Recent Products"
            count={products.length}
            href="/vendor/products"
          />

          {products.length === 0 ? (
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Package className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-gray-500 text-sm">No products yet</p>
              <Link
                href="/vendor/products/new"
                className="inline-flex items-center gap-1 text-sb-primary text-sm font-medium mt-2 hover:underline"
              >
                <PlusCircle className="h-4 w-4" />
                Add your first product
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {products.slice(0, 5).map((product) => (
                <Link
                  key={product.id}
                  href={`/vendor/products/${product.id}/edit`}
                  className="flex items-center gap-3 p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    {product.imageUrl ? (
                      <Image
                        src={product.imageUrl}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-5 w-5 text-gray-300" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">{product.name}</p>
                    <p className="text-sm text-gray-500">${product.price?.toFixed(2) || "0.00"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ProductStatusBadge status={product.status || "active"} />
                    <ChevronRight className="h-5 w-5 text-gray-300" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Performance Insights */}
      <section className="bg-gradient-to-br from-sb-primary/5 to-violet-50 rounded-2xl p-5 md:p-6 border border-sb-primary/10">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-sb-primary/10 rounded-xl">
            <TrendingUp className="h-6 w-6 text-sb-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">Store Performance</h3>
            <p className="text-sm text-gray-600 mt-1">
              {products.length === 0
                ? "Add products to start receiving orders and track your performance."
                : orders.length === 0
                ? "Your products are live! Orders will appear here once customers start buying."
                : `You have ${products.length} product${products.length !== 1 ? "s" : ""} and ${orders.length} recent order${orders.length !== 1 ? "s" : ""}.`}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ============ Sub Components ============ */

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

function QuickActionDesktop({
  href,
  icon,
  label,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl hover:border-sb-primary/30 hover:shadow-sm transition-all group"
    >
      <div className="p-3 bg-sb-primary/10 rounded-xl text-sb-primary group-hover:bg-sb-primary group-hover:text-white transition-colors">
        {icon}
      </div>
      <div>
        <p className="font-semibold text-gray-900">{label}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </Link>
  );
}

function SectionHeader({
  title,
  count,
  href,
}: {
  title: string;
  count?: number;
  href?: string;
}) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-50">
      <div className="flex items-center gap-2">
        <h2 className="font-semibold text-gray-900">{title}</h2>
        {typeof count === "number" && (
          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
            {count}
          </span>
        )}
      </div>
      {href && (
        <Link
          href={href}
          className="text-sm text-sb-primary font-medium hover:underline flex items-center gap-1"
        >
          View all
          <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

function OrderStatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: "bg-amber-100", text: "text-amber-700", label: "Pending" },
    confirmed: { bg: "bg-blue-100", text: "text-blue-700", label: "Confirmed" },
    preparing: { bg: "bg-purple-100", text: "text-purple-700", label: "Preparing" },
    out_for_delivery: { bg: "bg-indigo-100", text: "text-indigo-700", label: "In Transit" },
    delivered: { bg: "bg-green-100", text: "text-green-700", label: "Delivered" },
    cancelled: { bg: "bg-red-100", text: "text-red-700", label: "Cancelled" },
  };

  const c = config[status] || { bg: "bg-gray-100", text: "text-gray-700", label: status };

  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

function ProductStatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    active: { bg: "bg-green-100", text: "text-green-700", label: "Active" },
    draft: { bg: "bg-gray-100", text: "text-gray-700", label: "Draft" },
    out_of_stock: { bg: "bg-red-100", text: "text-red-700", label: "Out of Stock" },
    inactive: { bg: "bg-gray-100", text: "text-gray-500", label: "Inactive" },
  };

  const c = config[status] || { bg: "bg-gray-100", text: "text-gray-700", label: status };

  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}