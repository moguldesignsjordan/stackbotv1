// src/app/admin/customers/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  Trash2,
  Save,
  Loader2,
  Package,
  DollarSign,
  ShoppingBag,
  AlertCircle,
  CheckCircle,
  Plus,
} from 'lucide-react';

interface Customer {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  phone?: string;
  defaultAddress?: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
    instructions?: string;
  };
  stripeCustomerId?: string;
  onboardingCompleted?: boolean;
  status?: string;
  createdAt: string;
  updatedAt?: string;
}

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

interface Order {
  id: string;
  orderId: string;
  vendorName: string;
  total: number;
  status: string;
  createdAt: string;
}

interface StripeData {
  id: string;
  email: string;
  name: string;
  created: number;
  balance: number;
}

export default function AdminCustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const customerId = params.id as string;
  
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [stripeData, setStripeData] = useState<StripeData | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState({ totalOrders: 0, totalSpent: 0 });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingStripe, setCreatingStripe] = useState(false);
  const [deletingPayment, setDeletingPayment] = useState<string | null>(null);
  
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    postalCode: '',
    country: '',
    instructions: '',
  });

  const fetchCustomer = async () => {
    if (!user || !customerId) return;

    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/customers/${customerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        router.push('/admin/customers');
        return;
      }

      const data = await res.json();
      setCustomer(data.customer);
      setStripeData(data.stripe);
      setPaymentMethods(data.paymentMethods || []);
      setOrders(data.orders || []);
      setStats(data.stats || { totalOrders: 0, totalSpent: 0 });

      // Set form data
      setFormData({
        displayName: data.customer.displayName || '',
        email: data.customer.email || '',
        phone: data.customer.phone || '',
        street: data.customer.defaultAddress?.street || '',
        city: data.customer.defaultAddress?.city || '',
        postalCode: data.customer.defaultAddress?.postalCode || '',
        country: data.customer.defaultAddress?.country || 'Dominican Republic',
        instructions: data.customer.defaultAddress?.instructions || '',
      });
    } catch (error) {
      console.error('Failed to fetch customer:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomer();
  }, [user, customerId]);

  const handleSave = async () => {
    if (!user || !customer) return;

    setSaving(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/customers/${customerId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          displayName: formData.displayName,
          email: formData.email,
          phone: formData.phone,
          defaultAddress: {
            street: formData.street,
            city: formData.city,
            postalCode: formData.postalCode,
            country: formData.country,
            instructions: formData.instructions,
          },
        }),
      });

      if (res.ok) {
        setEditMode(false);
        fetchCustomer();
      }
    } catch (error) {
      console.error('Failed to save customer:', error);
    } finally {
      setSaving(false);
    }
  };

  const createStripeCustomer = async () => {
    if (!user || !customer) return;

    setCreatingStripe(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/customers/${customerId}/stripe`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        fetchCustomer();
      }
    } catch (error) {
      console.error('Failed to create Stripe customer:', error);
    } finally {
      setCreatingStripe(false);
    }
  };

  const deletePaymentMethod = async (paymentMethodId: string) => {
    if (!user) return;

    setDeletingPayment(paymentMethodId);
    try {
      const token = await user.getIdToken();
      const res = await fetch(
        `/api/admin/customers/${customerId}/stripe?paymentMethodId=${paymentMethodId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        setPaymentMethods(prev => prev.filter(pm => pm.id !== paymentMethodId));
      }
    } catch (error) {
      console.error('Failed to delete payment method:', error);
    } finally {
      setDeletingPayment(null);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      confirmed: 'bg-blue-100 text-blue-700',
      preparing: 'bg-orange-100 text-orange-700',
      delivered: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#55529d]" />
      </div>
    );
  }

  if (!customer) return null;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        href="/admin/customers"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Customers
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-[#55529d]/10 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-[#55529d]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {customer.displayName || 'Unnamed Customer'}
              </h1>
              <p className="text-gray-500">{customer.email}</p>
              <div className="flex items-center gap-2 mt-1">
                {customer.status === 'deleted' ? (
                  <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                    Deleted
                  </span>
                ) : customer.onboardingCompleted ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                    <CheckCircle className="w-3 h-3" />
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
                    <AlertCircle className="w-3 h-3" />
                    Incomplete Profile
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {editMode ? (
              <>
                <button
                  onClick={() => setEditMode(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-[#55529d] text-white rounded-lg hover:bg-[#444287] disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Changes
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditMode(true)}
                className="px-4 py-2 bg-[#55529d] text-white rounded-lg hover:bg-[#444287]"
              >
                Edit Customer
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <ShoppingBag className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-xl">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Spent</p>
              <p className="text-2xl font-bold text-gray-900">${stats.totalSpent.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-xl">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Member Since</p>
              <p className="text-lg font-bold text-gray-900">
                {new Date(customer.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Customer Info */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h2>
          
          {editMode ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#55529d] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#55529d] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#55529d] focus:border-transparent"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-gray-400" />
                <span className="text-gray-900">{customer.displayName || 'Not set'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-400" />
                <span className="text-gray-900">{customer.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gray-400" />
                <span className="text-gray-900">{customer.phone || 'Not set'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Address */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Default Address</h2>
          
          {editMode ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Street</label>
                <input
                  type="text"
                  value={formData.street}
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#55529d] focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#55529d] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                  <input
                    type="text"
                    value={formData.postalCode}
                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#55529d] focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Instructions</label>
                <textarea
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#55529d] focus:border-transparent resize-none"
                />
              </div>
            </div>
          ) : customer.defaultAddress ? (
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-gray-900">{customer.defaultAddress.street}</p>
                <p className="text-gray-600">
                  {customer.defaultAddress.city}, {customer.defaultAddress.postalCode}
                </p>
                <p className="text-gray-600">{customer.defaultAddress.country}</p>
                {customer.defaultAddress.instructions && (
                  <p className="text-sm text-gray-500 mt-1 italic">
                    "{customer.defaultAddress.instructions}"
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-gray-500">No address set</p>
          )}
        </div>
      </div>

      {/* Payment Methods */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Payment Methods</h2>
          
          {!stripeData && (
            <button
              onClick={createStripeCustomer}
              disabled={creatingStripe}
              className="flex items-center gap-2 px-4 py-2 bg-[#55529d] text-white rounded-lg hover:bg-[#444287] disabled:opacity-50"
            >
              {creatingStripe ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Create Stripe Customer
            </button>
          )}
        </div>

        {stripeData ? (
          <div className="space-y-4">
            {/* Stripe Info */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-800">Stripe Customer</span>
              </div>
              <p className="text-sm text-blue-700 font-mono">{stripeData.id}</p>
            </div>

            {/* Payment Methods List */}
            {paymentMethods.length > 0 ? (
              <div className="space-y-3">
                {paymentMethods.map((pm) => (
                  <div
                    key={pm.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <CreditCard className="w-6 h-6 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 capitalize">
                          {pm.brand} •••• {pm.last4}
                        </p>
                        <p className="text-sm text-gray-500">
                          Expires {pm.expMonth}/{pm.expYear}
                        </p>
                      </div>
                      {pm.isDefault && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                          Default
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => deletePaymentMethod(pm.id)}
                      disabled={deletingPayment === pm.id}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {deletingPayment === pm.id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Trash2 className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No payment methods saved</p>
            )}
          </div>
        ) : (
          <p className="text-gray-500">Customer not linked to Stripe yet</p>
        )}
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Orders</h2>
        
        {orders.length > 0 ? (
          <div className="space-y-3">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/admin/orders/${order.id}`}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Package className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-mono font-medium text-[#55529d]">{order.orderId}</p>
                    <p className="text-sm text-gray-500">{order.vendorName}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">${order.total.toFixed(2)}</p>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No orders yet</p>
        )}
      </div>
    </div>
  );
}