// src/app/account/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  Package, 
  MapPin, 
  User,
  ChevronRight,
  Loader2,
  Clock,
  CheckCircle,
  Truck,
} from 'lucide-react';

interface RecentOrder {
  id: string;
  orderId: string;
  vendorName: string;
  total: number;
  status: string;
  createdAt: string;
}

interface DashboardStats {
  totalOrders: number;
  activeOrders: number;
  savedAddresses: number;
}

const getStatusConfig = (language: 'en' | 'es'): Record<string, { label: string; color: string; icon: React.ElementType }> => ({
  pending: { label: language === 'en' ? 'Pending' : 'Pendiente', color: 'text-yellow-600 bg-yellow-50', icon: Clock },
  confirmed: { label: language === 'en' ? 'Confirmed' : 'Confirmado', color: 'text-blue-600 bg-blue-50', icon: CheckCircle },
  preparing: { label: language === 'en' ? 'Preparing' : 'Preparando', color: 'text-orange-600 bg-orange-50', icon: Package },
  out_for_delivery: { label: language === 'en' ? 'On the way' : 'En camino', color: 'text-indigo-600 bg-indigo-50', icon: Truck },
  delivered: { label: language === 'en' ? 'Delivered' : 'Entregado', color: 'text-green-600 bg-green-50', icon: CheckCircle },
});

export default function AccountDashboardPage() {
  const { user } = useAuth();
  const { language, formatCurrency } = useLanguage();
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [stats, setStats] = useState<DashboardStats>({ totalOrders: 0, activeOrders: 0, savedAddresses: 0 });
  const [loading, setLoading] = useState(true);

  const statusConfig = getStatusConfig(language);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      try {
        const token = await user.getIdToken();
        
        // Fetch recent orders
        const ordersRes = await fetch('/api/orders?limit=3', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const ordersData = await ordersRes.json();
        setRecentOrders(ordersData.orders || []);
        
        // Calculate stats from orders
        const allOrders = ordersData.orders || [];
        const activeStatuses = ['pending', 'confirmed', 'preparing', 'out_for_delivery'];
        setStats({
          totalOrders: ordersData.total || allOrders.length,
          activeOrders: allOrders.filter((o: RecentOrder) => activeStatuses.includes(o.status)).length,
          savedAddresses: 0, // Will be fetched separately if needed
        });
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === 'en' ? 'en-US' : 'es-DO', {
      month: 'short',
      day: 'numeric',
    });
  };

  const quickLinks = [
    {
      href: '/account/orders',
      icon: Package,
      label: language === 'en' ? 'My Orders' : 'Mis Pedidos',
      description: language === 'en' ? 'View order history' : 'Ver historial de pedidos',
      stat: stats.totalOrders > 0 ? `${stats.totalOrders} ${language === 'en' ? 'orders' : 'pedidos'}` : null,
    },
    {
      href: '/account/addresses',
      icon: MapPin,
      label: language === 'en' ? 'Addresses' : 'Direcciones',
      description: language === 'en' ? 'Manage delivery addresses' : 'Administrar direcciones',
      stat: null,
    },
    {
      href: '/account/settings',
      icon: User,
      label: language === 'en' ? 'Settings' : 'Configuración',
      description: language === 'en' ? 'Account preferences' : 'Preferencias de cuenta',
      stat: null,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#55529d]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          {language === 'en' ? 'My Account' : 'Mi Cuenta'}
        </h2>
        <p className="text-gray-600 mt-1">
          {language === 'en' ? 'Manage your orders and account settings' : 'Administra tus pedidos y configuración'}
        </p>
      </div>

      {/* Quick Stats - Mobile Only */}
      {stats.activeOrders > 0 && (
        <div className="lg:hidden bg-[#55529d]/10 border border-[#55529d]/20 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#55529d] rounded-full flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-[#55529d]">
                {stats.activeOrders} {language === 'en' ? 'Active Order' : 'Pedido Activo'}{stats.activeOrders > 1 ? 's' : ''}
              </p>
              <p className="text-sm text-gray-600">
                {language === 'en' ? 'Track your deliveries' : 'Rastrea tus entregas'}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-[#55529d] ml-auto" />
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="grid gap-3">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center gap-4 bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all active:scale-[0.99]"
          >
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <link.icon className="w-6 h-6 text-[#55529d]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900">{link.label}</p>
              <p className="text-sm text-gray-500">{link.description}</p>
            </div>
            {link.stat && (
              <span className="text-sm font-medium text-[#55529d] bg-[#55529d]/10 px-2 py-1 rounded-lg">
                {link.stat}
              </span>
            )}
            <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
          </Link>
        ))}
      </div>

      {/* Recent Orders */}
      {recentOrders.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">
              {language === 'en' ? 'Recent Orders' : 'Pedidos Recientes'}
            </h3>
            <Link
              href="/account/orders"
              className="text-sm font-medium text-[#55529d] hover:underline"
            >
              {language === 'en' ? 'View All' : 'Ver Todos'}
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {recentOrders.map((order) => {
              const status = statusConfig[order.status] || statusConfig.pending;
              const StatusIcon = status.icon;

              return (
                <Link
                  key={order.id}
                  href={`/account/orders/${order.id}`}
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${status.color}`}>
                    <StatusIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{order.vendorName}</p>
                    <p className="text-sm text-gray-500">
                      {order.orderId} · {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold text-gray-900">{formatCurrency(order.total)}</p>
                    <p className={`text-xs font-medium ${status.color.split(' ')[0]}`}>
                      {status.label}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}