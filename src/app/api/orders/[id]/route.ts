// src/app/api/orders/route.ts

import { NextRequest, NextResponse } from 'next/server';
import admin from '@/lib/firebase/admin';

export async function GET(request: NextRequest) {
  try {
    // Get auth token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const uid = decodedToken.uid;
    const role = decodedToken.role || 'customer';
    const db = admin.firestore();

    // Get query params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    let ordersQuery: admin.firestore.Query = db.collection('orders');

    // Filter based on role
    if (role === 'admin') {
      // Admin sees all orders
    } else if (role === 'vendor') {
      // Vendor sees only their orders
      ordersQuery = ordersQuery.where('vendorId', '==', uid);
    } else {
      // Customer sees only their orders
      ordersQuery = ordersQuery.where('customerId', '==', uid);
    }

    // Filter by status if provided
    if (status && status !== 'all') {
      ordersQuery = ordersQuery.where('status', '==', status);
    }

    // Order by date and limit
    ordersQuery = ordersQuery.orderBy('createdAt', 'desc').limit(limit);

    const snapshot = await ordersQuery.get();
    
    const orders = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null,
    }));

    return NextResponse.json({ orders, role });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}