'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2 } from 'lucide-react';

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  orderId: string;
  total: number;
  customerInfo?: {
    name?: string;
    email?: string;
  };
  items: OrderItem[];
}

export default function OrderConfirmationClient() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const orderId = searchParams.get('order_id');

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId && !orderId) {
      setError('Missing order reference');
      setLoading(false);
      return;
    }

    async function fetchOrder() {
      try {
        const res = await fetch('/api/orders/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, orderId }),
        });

        if (!res.ok) throw new Error('Failed to load order');

        const data = await res.json();
        setOrder(data.order);
      } catch (err) {
        setError('Unable to load order details');
      } finally {
        setLoading(false);
      }
    }

    fetchOrder();
  }, [sessionId, orderId]);

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-3" />
        <p>Loading order details…</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-8 text-center text-red-600">
        {error || 'Order not found'}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="text-center mb-8">
        <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold">Order Confirmed</h1>
        <p className="text-gray-600">Thank you for your purchase!</p>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <p className="text-sm text-gray-500">Order ID</p>
        <p className="font-mono font-semibold">{order.orderId}</p>

        {order.customerInfo?.name && (
          <p className="mt-2 text-sm">
            Customer: <strong>{order.customerInfo.name}</strong>
          </p>
        )}
      </div>

      <div className="divide-y border rounded-lg mb-6">
        {order.items.map((item, idx) => (
          <div key={idx} className="flex justify-between p-4">
            <div>
              <p className="font-medium">{item.name}</p>
              <p className="text-sm text-gray-500">
                Qty {item.quantity}
              </p>
            </div>
            <p className="font-semibold">
              ${(item.price * item.quantity).toFixed(2)}
            </p>
          </div>
        ))}
      </div>

      <div className="flex justify-between text-lg font-bold mb-8">
        <span>Total</span>
        <span>${order.total.toFixed(2)}</span>
      </div>

      <div className="text-center">
        <Link
          href="/"
          className="text-sb-primary font-semibold hover:underline"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
