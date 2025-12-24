// src/app/api/admin/customers/route.ts

import { NextRequest, NextResponse } from 'next/server';
import admin from '@/lib/firebase/admin';

interface Customer {
  id: string;
  displayName?: string | null;
  email?: string | null;
  phone?: string | null;
  photoURL?: string | null;
  role?: string;
  createdAt: string | null;
  updatedAt: string | null;
  [key: string]: unknown; // Allow additional fields from Firestore
}

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

    // Check admin role
    if (decodedToken.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    const db = admin.firestore();
    
    // Get query params
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';

    const query: admin.firestore.Query = db.collection('customers')
      .orderBy('createdAt', 'desc')
      .limit(limit);

    const snapshot = await query.get();
    
    let customers: Customer[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
      } as Customer;
    });

    // Client-side search filter (Firestore doesn't support full-text search)
    if (search) {
      const searchLower = search.toLowerCase();
      customers = customers.filter(c => 
        c.displayName?.toLowerCase().includes(searchLower) ||
        c.email?.toLowerCase().includes(searchLower) ||
        c.phone?.toLowerCase().includes(searchLower)
      );
    }

    return NextResponse.json({ customers });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}