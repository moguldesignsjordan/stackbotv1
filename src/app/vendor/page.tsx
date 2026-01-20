// src/app/vendor/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/config';
import {
  doc,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  onSnapshot,
  where,
  getCountFromServer,
} from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  Package,
  PlusCircle,
  ShoppingCart,
  Star,
  Settings,
  ChevronRight,
  TrendingUp,
  Clock,
  Eye,
  ExternalLink,
} from 'lucide-react';

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
  customerInfo?: { name?: string };
  total?: number;
  status?: string;
  createdAt?: unknown;
  items?: unknown[];
}

export default function VendorDashboard() {
  const [user, setUser] = useState<unknown>(null);
  const [vendor, setVendor] = useState<VendorData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalOrderCount, setTotalOrderCount] = useState(0);

  const router = useRouter();

  /* ---------------- AUTH ---------------- */
  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (u) {
        await u.getIdToken(true);
        setUser(u);
      } else {
        router.replace('/login');
      }
    });
  }, [router]);

  /* ---------------- REAL-TIME ORDERS ---------------- */
  useEffect(() => {
    if (!user) return;
    const uid = (user as { uid: string }).uid;

    const ordersQuery = query(
      collection(db, 'orders'),
      where('vendorId', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        setOrders(
          snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Order))
        );
      },
      (error) => {
        console.error('Orders listener error:', error);
      }
    );

    return () => unsubscribe();
  }, [user]);

  /* ---------------- FETCH TOTAL ORDER COUNT ---------------- */
  useEffect(() => {
    if (!user) return;
    const uid = (user as { uid: string }).uid;

    const fetchTotalCount = async () => {
      try {
        const q = query(
          collection(db, 'orders'),
          where('vendorId', '==', uid)
        );
        const snapshot = await getCountFromServer(q);
        setTotalOrderCount(snapshot.data().count);
      } catch (err) {
        console.error('Error counting orders:', err);
      }
    };

    fetchTotalCount();
  }, [user]);

  /* ---------------- REAL-TIME VENDOR DATA ---------------- */
  useEffect(() => {
    if (!user) return;
    const uid = (user as { uid: string }).uid;

    const unsubscribe = onSnapshot(doc(db, 'vendors', uid), (doc) => {
      if (doc.exists()) {
        setVendor(doc.data() as VendorData);
      } else {
        setVendor({ missing: true } as VendorData);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  /* ---------------- LOAD PRODUCTS ---------------- */
  const loadProducts = useCallback(async (u: { uid: string }) => {
    try {
      const productsSnap = await getDocs(
        query(
          collection(db, 'vendors', u.uid, 'products'),
          orderBy('created_at', 'desc'),
          limit(5)
        )
      );
      setProducts(
        productsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Product))
      );
    } catch (err) {
      console.error('Products load error:', err);
      setProducts([]);
    }
  }, []);

  useEffect(() => {
    if (user) loadProducts(user as { uid: string });
  }, [user, loadProducts]);

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

  const pendingOrders = orders.filter((o) => o.status === 'pending').length;

  /* ---------------- UI ---------------- */
  return (
    <div className="space-y-5 md:space-y-6 animate-fade-in pb-10 lg:pb-0">
      {/* Simple Store Header - No notification bell, that's in VendorTopbar */}


      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          icon={<ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />}
          label="Orders"
          value={totalOrderCount || vendor?.total_orders || 0}
          color="blue"
        />
        <StatCard
          icon={<Clock className="h-4 w-4 sm:h-5 sm:w-5" />}
          label="Pending"
          value={pendingOrders}
          highlight={pendingOrders > 0}
          color="amber"
        />
        <StatCard
          icon={<Star className="h-4 w-4 sm:h-5 sm:w-5" />}
          label="Rating"
          value={vendor?.rating ? `${vendor.rating.toFixed(1)}` : 'N/A'}
          color="violet"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        <QuickAction
          href="/vendor/products/new"
          icon={<PlusCircle className="h-5 w-5 sm:h-6 sm:w-6" />}
          label="Add Product"
        />
        <QuickAction
          href="/vendor/orders"
          icon={<ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6" />}
          label="Orders"
        />
        <QuickAction
          href="/vendor/products"
          icon={<Package className="h-5 w-5 sm:h-6 sm:w-6" />}
          label="Products"
        />
        <QuickAction
          href="/vendor/settings"
          icon={<Settings className="h-5 w-5 sm:h-6 sm:w-6" />}
          label="Settings"
        />
      </div>

      {/* Recent Activity Grid */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Recent Orders */}
        <section className="bg-white rounded-xl border border-gray-100 overflow-hidden">
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
              <p className="text-gray-500">No orders yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Orders will appear here when customers buy
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {orders.slice(0, 5).map((order) => (
                <Link
                  key={order.id}
                  href={`/vendor/orders/${order.id}`}
                  className="flex items-center gap-3 p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-sb-primary/10 to-sb-primary/5 flex items-center justify-center text-sb-primary font-semibold flex-shrink-0">
                    {(order.customer_name || order.customerInfo?.name || 'C')
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">
                      {order.customer_name || order.customerInfo?.name || 'Customer'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {order.items?.length || 0} item
                      {(order.items?.length || 0) !== 1 ? 's' : ''} · $
                      {order.total?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    <OrderStatusBadge status={order.status || 'pending'} />
                    <ChevronRight className="h-5 w-5 text-gray-300" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Recent Products */}
        <section className="bg-white rounded-xl border border-gray-100 overflow-hidden">
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
              <p className="text-gray-500">No products yet</p>
              <Link
                href="/vendor/products/new"
                className="inline-flex items-center gap-1.5 text-sb-primary text-sm font-medium mt-2 hover:underline"
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
                  <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
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
                    <p className="font-medium text-gray-900 truncate">
                      {product.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      ${product.price?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ProductStatusBadge status={product.status || 'active'} />
                    <ChevronRight className="h-5 w-5 text-gray-300" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Performance Insights */}
      <section className="bg-gradient-to-br from-sb-primary/5 to-violet-50 rounded-xl p-4 sm:p-5 border border-sb-primary/10">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-sb-primary/10 rounded-xl flex-shrink-0">
            <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-sb-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900">Store Performance</h3>
            <p className="text-sm text-gray-600 mt-1">
              {products.length === 0
                ? 'Add products to start receiving orders.'
                : orders.length === 0
                ? 'Your products are live! Orders will appear soon.'
                : `${products.length} product${
                    products.length !== 1 ? 's' : ''
                  } · ${totalOrderCount || orders.length} order${
                    (totalOrderCount || orders.length) !== 1 ? 's' : ''
                  }`}
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
  color: 'blue' | 'amber' | 'emerald' | 'violet';
}

const colorConfig = {
  blue: {
    bg: 'from-blue-500 to-blue-600',
    light: 'bg-blue-50',
  },
  amber: {
    bg: 'from-amber-500 to-orange-500',
    light: 'bg-amber-50',
  },
  emerald: {
    bg: 'from-emerald-500 to-emerald-600',
    light: 'bg-emerald-50',
  },
  violet: {
    bg: 'from-sb-primary to-violet-600',
    light: 'bg-violet-50',
  },
};

function StatCard({ icon, label, value, highlight, color }: StatCardProps) {
  const colors = colorConfig[color];

  return (
    <div
      className={`relative overflow-hidden p-3.5 sm:p-4 rounded-xl border transition-all ${
        highlight
          ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200'
          : 'bg-white border-gray-100'
      }`}
    >
      <div
        className={`inline-flex p-2 rounded-lg bg-gradient-to-br ${colors.bg} text-white shadow-md mb-2`}
      >
        {icon}
      </div>
      <p className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
        {value}
      </p>
      <p className="text-xs sm:text-sm text-gray-500">{label}</p>

      {/* Decorative element */}
      <div
        className={`absolute -right-4 -bottom-4 w-14 h-14 rounded-full ${colors.light} opacity-50`}
      />
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
      className="flex flex-col items-center justify-center gap-2 p-3.5 sm:p-4 bg-white border border-gray-100 rounded-xl active:scale-95 active:bg-gray-50 transition-all hover:border-sb-primary/30 hover:shadow-sm"
    >
      <div className="text-sb-primary">{icon}</div>
      <span className="text-xs sm:text-sm font-medium text-gray-700 text-center leading-tight">
        {label}
      </span>
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
        {typeof count === 'number' && (
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
    pending: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pending' },
    confirmed: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Confirmed' },
    preparing: {
      bg: 'bg-purple-100',
      text: 'text-purple-700',
      label: 'Preparing',
    },
    out_for_delivery: {
      bg: 'bg-indigo-100',
      text: 'text-indigo-700',
      label: 'In Transit',
    },
    delivered: {
      bg: 'bg-green-100',
      text: 'text-green-700',
      label: 'Delivered',
    },
    cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelled' },
  };

  const c = config[status] || {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    label: status,
  };

  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}
    >
      {c.label}
    </span>
  );
}

function ProductStatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    active: { bg: 'bg-green-100', text: 'text-green-700', label: 'Active' },
    draft: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Draft' },
    out_of_stock: {
      bg: 'bg-red-100',
      text: 'text-red-700',
      label: 'Out of Stock',
    },
    inactive: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Inactive' },
  };

  const c = config[status] || {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    label: status,
  };

  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}
    >
      {c.label}
    </span>
  );
}