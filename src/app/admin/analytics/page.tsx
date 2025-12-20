"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase/config";
import {
  collection,
  collectionGroup,
  getCountFromServer,
} from "firebase/firestore";
import { Card } from "@/components/ui/Card";

export default function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    vendors: 0,
    products: 0,
    orders: 0,
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const vendorsCount = await getCountFromServer(collection(db, "vendors"));
        const productsCount = await getCountFromServer(collectionGroup(db, "products"));

        // If you have a root "orders" collection, this will work.
        // If you don't, it will error — so we guard it.
        let orders = 0;
        try {
          const ordersCount = await getCountFromServer(collection(db, "orders"));
          orders = ordersCount.data().count;
        } catch {
          orders = 0;
        }

        setStats({
          vendors: vendorsCount.data().count,
          products: productsCount.data().count,
          orders,
        });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Analytics</h1>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          <Card padding="lg">
            <p className="text-sm text-gray-500">Vendors</p>
            <p className="text-3xl font-bold">{stats.vendors}</p>
          </Card>

          <Card padding="lg">
            <p className="text-sm text-gray-500">Products</p>
            <p className="text-3xl font-bold">{stats.products}</p>
          </Card>

          <Card padding="lg">
            <p className="text-sm text-gray-500">Orders</p>
            <p className="text-3xl font-bold">{stats.orders}</p>
          </Card>
        </div>
      )}

      <p className="text-sm text-gray-500">
        Next: add revenue totals + charts once we confirm your orders schema.
      </p>
    </div>
  );
}
