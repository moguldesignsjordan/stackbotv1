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
  where,
} from "firebase/firestore";
import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import {
  ShoppingCart,
  DollarSign,
  Star,
  PlusCircle,
  Settings,
  Package,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function VendorDashboard() {
  /** --------------------------------------------------------
   *  ALL HOOKS MUST ALWAYS RUN IN THE SAME ORDER
   *  --------------------------------------------------------
   */
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [vendor, setVendor] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  /** --------------------------------------------------------
   *  AUTH HYDRATION LISTENER — ALWAYS FIRST useEffect
   *  --------------------------------------------------------
   */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
    });
    return () => unsub();
  }, []);

  /** --------------------------------------------------------
   *  DASHBOARD LOADING FUNCTION
   *  --------------------------------------------------------
   */
  const loadDashboard = useCallback(
    async (user: any) => {
      try {
        // Vendor profile
        const vendorRef = doc(db, "vendors", user.uid);
        const vendorSnap = await getDoc(vendorRef);

        if (!vendorSnap.exists()) {
          setVendor({ missing: true });
          setLoading(false);
          return;
        }

        const vendorData = vendorSnap.data();
        setVendor(vendorData);

        // Orders
        const ordersRef = collection(db, "vendors", user.uid, "orders");
        const ordersSnap = await getDocs(
          query(ordersRef, orderBy("timestamp", "desc"), limit(5))
        );
        setOrders(ordersSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

        // Products
        const productsRef = collection(db, "products");
        const productsSnap = await getDocs(
          query(productsRef, where("vendorId", "==", user.uid))
        );
        setProducts(productsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

        setLoading(false);
      } catch (err) {
        console.error("Dashboard Load Error:", err);
        setLoading(false);
      }
    },
    [db]
  );

  /** --------------------------------------------------------
   *  MAIN DATA LOADING EFFECT
   *  --------------------------------------------------------
   */
  useEffect(() => {
    if (!firebaseUser) return; // wait for auth hydration
    loadDashboard(firebaseUser);
  }, [firebaseUser, loadDashboard]);

  /** --------------------------------------------------------
   *  AFTER ALL HOOKS ARE DECLARED → NOW WE CAN RETURN JSX
   *  --------------------------------------------------------
   */
  if (!firebaseUser) {
    return <LoadingSpinner text="Preparing your dashboard..." />;
  }

  if (loading) {
    return <LoadingSpinner text="Loading your dashboard..." />;
  }

  if (vendor?.missing) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold text-red-600">Vendor profile missing</h1>
        <p className="text-gray-600 mt-2">
          Your vendor profile was not found. Please contact support.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-fade-in">
      {/* HEADER */}
      <div className="flex items-center gap-4">
        <Image
          src={vendor.logoUrl || "/placeholder.png"}
          alt="Vendor Logo"
          width={80}
          height={80}
          className="rounded-xl object-cover border shadow-sm"
        />
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            {vendor.name}
          </h1>
          <p className="text-gray-500">{vendor.email}</p>
        </div>
      </div>

      {/* STATUS BADGE */}
      <div>
        {vendor.verified ? (
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-sm font-medium">
            <CheckCircle className="h-4 w-4" /> Verified Vendor
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-sm font-medium">
            <AlertCircle className="h-4 w-4" /> Pending Approval
          </span>
        )}
      </div>

      {/* QUICK ACTIONS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <QuickAction href="/vendor/products" icon={<Package />} label="Manage Products" />
        <QuickAction href="/vendor/products/new" icon={<PlusCircle />} label="Add Product" />
        <QuickAction href="/vendor/orders" icon={<ShoppingCart />} label="View Orders" />
        <QuickAction href="/vendor/settings" icon={<Settings />} label="Store Settings" />
      </div>

      {/* METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          icon={<ShoppingCart className="h-7 w-7 text-sb-primary" />}
          label="Total Orders"
          value={vendor.total_orders || 0}
        />

        <MetricCard
          icon={<DollarSign className="h-7 w-7 text-sb-primary" />}
          label="Total Revenue"
          value={`$${(vendor.total_revenue || 0).toLocaleString()}`}
        />

        <MetricCard
          icon={<Star className="h-7 w-7 text-sb-primary" />}
          label="Rating"
          value={`${vendor.rating || 0} ⭐`}
        />
      </div>

      {/* RECENT ORDERS */}
      <Card title="Recent Orders">
        {orders.length === 0 ? (
          <p className="text-gray-600 text-sm">No orders yet.</p>
        ) : (
          <ul className="space-y-3">
            {orders.map((o) => (
              <li
                key={o.id}
                className="p-4 bg-gray-50 border rounded-xl flex justify-between"
              >
                <div>
                  <p className="font-semibold text-gray-900">
                    Order #{o.orderId}
                  </p>
                  <p className="text-sm text-gray-500">${o.total}</p>
                </div>
                <p className="text-sb-primary font-medium capitalize">{o.status}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* RECENT PRODUCTS */}
      <Card title="Your Products">
        {products.length === 0 ? (
          <p className="text-gray-600 text-sm">No products added yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {products.slice(0, 4).map((p) => (
              <div key={p.id} className="p-4 bg-white border rounded-xl shadow-sm">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-gray-900">{p.name}</h3>
                  <span className="text-sb-primary font-semibold">
                    ${p.price}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">ID: {p.id}</p>
              </div>
            ))}
          </div>
        )}

        <Link
          href="/vendor/products"
          className="block text-sb-primary mt-4 font-medium hover:underline"
        >
          View all products →
        </Link>
      </Card>
    </div>
  );
}

/* ------------------ SUB COMPONENTS ------------------ */

function QuickAction({ href, icon, label }: any) {
  return (
    <Link
      href={href}
      className="p-4 bg-white border rounded-xl shadow-sm flex flex-col items-center justify-center gap-2 hover:border-sb-primary transition"
    >
      <div className="text-sb-primary">{icon}</div>
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </Link>
  );
}

function MetricCard({ icon, label, value }: any) {
  return (
    <Card>
      <div className="flex items-center gap-3 text-2xl font-bold text-gray-900">
        {icon}
        {value}
      </div>
      <p className="text-gray-500 text-sm mt-2">{label}</p>
    </Card>
  );
}
