"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase/config";
import { doc, getDoc, collection, getDocs, orderBy, query, limit } from "firebase/firestore";
import Image from "next/image";
import { Card } from "@/components/ui/Card";
import { ShoppingCart, DollarSign } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function VendorDashboard() {
  const [vendor, setVendor] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const user = auth.currentUser;
      if (!user) return;

      // Load vendor profile
      const vendorRef = doc(db, "vendors", user.uid);
      const vendorSnap = await getDoc(vendorRef);
      setVendor(vendorSnap.data());

      // Load vendor orders
      const ordersRef = collection(db, "vendors", user.uid, "orders");
      const ordersSnap = await getDocs(
        query(ordersRef, orderBy("timestamp", "desc"), limit(5))
      );

      setOrders(ordersSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    };

    load();
  }, []);

  if (loading) return <LoadingSpinner text="Loading your dashboard..." />;

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex items-center gap-4">
        <Image
          src={vendor.logoUrl || "/placeholder.png"}
          alt="Vendor Logo"
          width={80}
          height={80}
          className="rounded-xl object-cover border"
        />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{vendor.name}</h1>
          <p className="text-gray-600">{vendor.email}</p>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title="Total Orders">
          <div className="flex items-center gap-3 text-2xl font-bold text-gray-900">
            <ShoppingCart className="h-7 w-7 text-sb-primary" />
            {vendor.total_orders || 0}
          </div>
        </Card>

        <Card title="Total Revenue">
          <div className="flex items-center gap-3 text-2xl font-bold text-gray-900">
            <DollarSign className="h-7 w-7 text-sb-primary" />
            ${(vendor.total_revenue || 0).toLocaleString()}
          </div>
        </Card>

        <Card title="Rating">
          <p className="text-2xl font-bold text-gray-900">{vendor.rating || 0} ⭐</p>
        </Card>
      </div>

      {/* RECENT ORDERS */}
      <Card title="Recent Orders">
        {orders.length === 0 ? (
          <p className="text-gray-600">No orders yet.</p>
        ) : (
          <ul className="space-y-3">
            {orders.map((o) => (
              <li
                key={o.id}
                className="p-4 bg-gray-50 rounded-xl border flex justify-between"
              >
                <div>
                  <p className="font-semibold text-gray-900">Order #{o.orderId}</p>
                  <p className="text-sm text-gray-600">${o.total}</p>
                </div>
                <p className="text-sb-primary font-medium">{o.status}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
