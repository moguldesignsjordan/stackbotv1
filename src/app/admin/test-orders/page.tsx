'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function TestOrdersPage() {
  const { user } = useAuth();
  const functions = getFunctions();
  
  const [vendorId, setVendorId] = useState('');
  const [status, setStatus] = useState<string>('pending');
  const [amount, setAmount] = useState(500);
  const [items, setItems] = useState(2);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  // Listen to test orders
  useState(() => {
    const q = query(
      collection(db, 'orders'),
      where('isTest', '==', true),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecentOrders(orders);
    });
    
    return () => unsubscribe();
  });

  const handleCreateTestOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const createTestOrder = httpsCallable(functions, 'createTestOrder');
      const response = await createTestOrder({
        vendorId,
        status,
        amount: Number(amount),
        items: Number(items)
      });

      setResult(response.data);
    } catch (error: any) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      const updateOrderStatus = httpsCallable(functions, 'updateOrderStatus');
      await updateOrderStatus({ orderId, status: newStatus });
    } catch (error: any) {
      console.error('Failed to update status:', error);
    }
  };

  const handleDeleteTestOrders = async () => {
    if (!confirm('Delete all test orders?')) return;

    try {
      const deleteTestOrders = httpsCallable(functions, 'deleteTestOrders');
      const response = await deleteTestOrders({});
      alert((response.data as any).message);
    } catch (error: any) {
      alert('Failed: ' + error.message);
    }
  };

  const statuses = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'];

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Test Order Creator</h1>
        <button
          onClick={handleDeleteTestOrders}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Delete All Test Orders
        </button>
      </div>

      <form onSubmit={handleCreateTestOrder} className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Vendor ID *</label>
          <input
            type="text"
            value={vendorId}
            onChange={(e) => setVendorId(e.target.value)}
            placeholder="vendor-uid-here"
            className="w-full px-3 py-2 border rounded-lg"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Amount (DOP)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Items Count</label>
            <input
              type="number"
              value={items}
              onChange={(e) => setItems(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Initial Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          >
            {statuses.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={loading || !vendorId}
          className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300"
        >
          {loading ? 'Creating...' : 'Create Test Order'}
        </button>
      </form>

      {result && (
        <div className={`p-4 rounded-lg ${result.error ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
          <pre className="text-xs overflow-auto">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-bold mb-4">Recent Test Orders ({recentOrders.length})</h2>
        <div className="space-y-2">
          {recentOrders.map(order => (
            <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <div className="font-medium">{order.id}</div>
                <div className="text-sm text-gray-600">
                  {order.vendorName} · DOP {order.total?.toFixed(2)} · {order.items?.length} items
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 text-xs font-medium rounded ${
                  order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                  order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {order.status}
                </span>
                <select
                  value={order.status}
                  onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                  className="text-xs px-2 py-1 border rounded"
                >
                  {statuses.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}