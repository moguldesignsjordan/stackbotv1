// src/app/api/driver/check-status/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Server-side driver status check using Firebase Admin SDK.
// Bypasses Firestore security rules so unauthenticated-as-driver users
// can still look up their application status after Firebase Auth sign-in.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import admin from '@/lib/firebase/admin';

interface CheckStatusRequest {
  displayName?: string | null;
  phone?: string | null;
}

interface ApplicationDetails {
  fullName?: string;
  email?: string;
  phone?: string;
  city?: string;
  rejectionReason?: string;
  createdAt?: string | null;
}

interface CheckStatusResponse {
  isDriver: boolean;
  status: 'approved' | 'pending' | 'rejected' | 'none';
  application?: ApplicationDetails;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<CheckStatusResponse | { error: string }>> {
  try {
    // ── 1. Authenticate via Bearer token ──────────────────────────────
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    let decodedToken: admin.auth.DecodedIdToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const uid = decodedToken.uid;
    const userEmail = (decodedToken.email || '').toLowerCase();

    // Optional body fields
    let displayName: string | null = null;
    let phone: string | null = null;
    try {
      const body: CheckStatusRequest = await request.json();
      displayName = body.displayName || null;
      phone = body.phone || null;
    } catch {
      // Body is optional — proceed with token-only data
    }

    const firestore = admin.firestore();

    // ── 2. Already an active driver → pass through ────────────────────
    const driverSnap = await firestore.collection('drivers').doc(uid).get();
    if (driverSnap.exists) {
      // Backfill verified fields if missing (fixes drivers created before this was added)
      const driverData = driverSnap.data() || {};
      if (driverData.verified !== true || driverData.isVerified !== true) {
        await firestore.collection('drivers').doc(uid).update({
          verified: true,
          isVerified: true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      return NextResponse.json({ isDriver: true, status: 'approved' });
    }

    // ── 3. Check approved_drivers whitelist ────────────────────────────
    if (userEmail) {
      const emailKey = userEmail.replace(/[.]/g, '_');
      const approvedSnap = await firestore
        .collection('approved_drivers')
        .doc(emailKey)
        .get();

      if (approvedSnap.exists) {
        const approvedData = approvedSnap.data() || {};

        // Create driver doc (admin SDK bypasses rules)
        await firestore.collection('drivers').doc(uid).set({
          uid,
          userId: uid,
          email: userEmail,
          name: approvedData.name || displayName || '',
          phone: approvedData.phone || phone || '',
          city: approvedData.city || '',
          vehicleType: approvedData.vehicleType || 'motorcycle',
          vehiclePlate: approvedData.vehiclePlate || '',
          vehicleColor: approvedData.vehicleColor || '',
          status: 'approved',
          isOnline: false,
          verified: true,
          isVerified: true,
          rating: 5.0,
          ratingCount: 0,
          totalDeliveries: 0,
          currentLocation: null,
          currentOrderId: null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return NextResponse.json({ isDriver: true, status: 'approved' });
      }
    }

    // ── 4. Look up driver_applications by uid, then email, then phone ─
    let appDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;

    // By uid
    let appSnap = await firestore
      .collection('driver_applications')
      .where('uid', '==', uid)
      .limit(1)
      .get();

    // Fallback: by email
    if (appSnap.empty && userEmail) {
      appSnap = await firestore
        .collection('driver_applications')
        .where('email', '==', userEmail)
        .limit(1)
        .get();
    }

    // Fallback: by phone
    if (appSnap.empty && phone) {
      appSnap = await firestore
        .collection('driver_applications')
        .where('phone', '==', phone)
        .limit(1)
        .get();
    }

    if (!appSnap.empty) {
      appDoc = appSnap.docs[0];
    }

    // ── 5. No application found ───────────────────────────────────────
    if (!appDoc) {
      return NextResponse.json({ isDriver: false, status: 'none' });
    }

    const appData = appDoc.data();

    // Build application details for the response
    const application: ApplicationDetails = {
      fullName: appData.fullName || '',
      email: appData.email || '',
      phone: appData.phone || '',
      city: appData.city || '',
      rejectionReason: appData.rejectionReason || undefined,
      createdAt: appData.createdAt?.toDate?.()?.toISOString() || null,
    };

    // ── 6. Check application status ───────────────────────────────────
    if (appData.status === 'rejected') {
      return NextResponse.json({
        isDriver: false,
        status: 'rejected',
        application,
      });
    }

    if (appData.status !== 'approved') {
      return NextResponse.json({
        isDriver: false,
        status: 'pending',
        application,
      });
    }

    // ── 7. Approved application → create driver doc ───────────────────
    await firestore.collection('drivers').doc(uid).set({
      uid,
      userId: uid,
      email: userEmail,
      name: appData.fullName || displayName || '',
      phone: appData.phone || phone || '',
      city: appData.city || '',
      vehicleType: appData.vehicleType || 'motorcycle',
      vehiclePlate: appData.vehiclePlate || '',
      vehicleColor: appData.vehicleColor || '',
      status: 'approved',
      isOnline: false,
      verified: true,
      isVerified: true,
      rating: 5.0,
      ratingCount: 0,
      totalDeliveries: 0,
      currentLocation: null,
      currentOrderId: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      isDriver: true,
      status: 'approved',
      application,
    });
  } catch (err: unknown) {
    console.error('POST /api/driver/check-status error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}