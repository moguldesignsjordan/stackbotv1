import { functions } from './config';
import { httpsCallable } from 'firebase/functions';
import type { Vendor } from '@/lib/types';

// Approve Vendor
export async function approveVendor(vendorId: string) {
  const fn = httpsCallable(functions, 'approveVendor');
  return await fn({ vendorId });
}

// Set User Role
export async function setUserRole(uid: string, role: string) {
  const fn = httpsCallable(functions, 'setUserRole');
  return await fn({ uid, role });
}

// Create Vendor
export async function createVendor(data: Partial<Vendor>) {
  const fn = httpsCallable(functions, 'createVendor');
  return await fn(data);
}

// Create Order
export async function createOrder(orderData: {
  vendorId: string;
  items: any[];
  subtotal: number;
  delivery_fee: number;
  total: number;
}) {
  const fn = httpsCallable(functions, 'createOrder');
  return await fn(orderData);
}

// Update Order Status
export async function updateOrderStatus(
  orderId: string, 
  vendorId: string, 
  status: string
) {
  const fn = httpsCallable(functions, 'updateOrderStatus');
  return await fn({ orderId, vendorId, status });
}