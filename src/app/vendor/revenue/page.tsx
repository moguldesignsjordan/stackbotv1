"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase/config";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Lock, DollarSign, TrendingUp, Calendar, Eye, EyeOff } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

// Default password - change this in production
const REVENUE_PASSWORD = "stackbot2026";

export default function RevenuePage() {
  const router = useRouter();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Revenue data
  const [orders, setOrders] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    thisMonth: 0,
    lastMonth: 0,
    orderCount: 0,
  });

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === REVENUE_PASSWORD) {
      setIsUnlocked(true);
      setError("");
      loadRevenue();
    } else {
      setError("Incorrect password");
      setPassword("");
    }
  };

  const loadRevenue = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setLoading(true);
    try {
      const ordersSnap = await getDocs(
        query(
          collection(db, "vendors", user.uid, "orders"),
          where("paymentStatus", "==", "paid")
        )
      );

      // FIX: Added 'as any[]' to prevent TypeScript errors
      const orderData = ordersSnap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as any[];

      setOrders(orderData);

      // Calculate stats
      const total = orderData.reduce((sum, o) => sum + (o.total || 0), 0);
      
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      const thisMonth = orderData
        .filter(o => {
          const date = o.createdAt?.toDate?.() || new Date(o.createdAt);
          return date >= thisMonthStart;
        })
        .reduce((sum, o) => sum + (o.total || 0), 0);

      const lastMonth = orderData
        .filter(o => {
          const date = o.createdAt?.toDate?.() || new Date(o.createdAt);
          return date >= lastMonthStart && date <= lastMonthEnd;
        })
        .reduce((sum, o) => sum + (o.total || 0), 0);

      setStats({
        totalRevenue: total,
        thisMonth,
        lastMonth,
        orderCount: orderData.length,
      });
    } catch (err) {
      console.error("Failed to load revenue:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isUnlocked) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-lg">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-[#55529d]/10 rounded-full flex items-center justify-center">
                <Lock className="w-8 h-8 text-[#55529d]" />
              </div>
            </div>
            
            <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
              Revenue Dashboard
            </h2>
            <p className="text-center text-gray-500 text-sm mb-6">
              Enter password to view financial data
            </p>

            <form onSubmit={handleUnlock} className="space-y-4">
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#55529d] focus:border-transparent outline-none"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>

              {error && (
                <p className="text-red-600 text-sm text-center">{error}</p>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-[#55529d] text-white font-semibold rounded-xl hover:bg-[#444287] transition-colors"
              >
                Unlock
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner text="Loading revenue data..." />;
  }

  const percentChange = stats.lastMonth > 0
    ? ((stats.thisMonth - stats.lastMonth) / stats.lastMonth) * 100
    : 0;

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Revenue Dashboard</h1>
        <button
          onClick={() => setIsUnlocked(false)}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Lock className="w-4 h-4" />
          Lock
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm text-gray-500">Total Revenue</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            ${stats.totalRevenue.toFixed(2)}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm text-gray-500">This Month</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            ${stats.thisMonth.toFixed(2)}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-sm text-gray-500">Last Month</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            ${stats.lastMonth.toFixed(2)}
          </p>
          {percentChange !== 0 && (
            <p className={`text-sm mt-1 ${percentChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {percentChange > 0 ? '+' : ''}{percentChange.toFixed(1)}% vs last month
            </p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-orange-600" />
            </div>
            <span className="text-sm text-gray-500">Paid Orders</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {stats.orderCount}
          </p>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Recent Paid Orders</h3>
        </div>
        
        {orders.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No paid orders yet
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {orders.slice(0, 10).map((order) => (
              <div key={order.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                <div>
                  <p className="font-medium text-gray-900">
                    {order.customerInfo?.name || order.customer_name || "Customer"}
                  </p>
                  <p className="text-sm text-gray-500">
                    Order {order.orderId || order.id}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">
                    ${order.total?.toFixed(2) || "0.00"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {order.createdAt?.toDate?.().toLocaleDateString() || "N/A"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
