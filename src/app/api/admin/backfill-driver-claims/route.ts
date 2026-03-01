// src/app/api/admin/backfill-driver-claims/route.ts
// POST — Sets { role: 'driver', driver: true } custom claims on all users
// who have a document in the `drivers` collection.
// Requires: caller must be authenticated with admin custom claim.
// Idempotent — safe to run multiple times.

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

export async function POST(req: NextRequest) {
  try {
    // ── Verify admin caller ────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing auth token' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decoded = await adminAuth.verifyIdToken(idToken);

    // Check admin claim
    if (!decoded.admin && decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // ── Get all driver docs ────────────────────────────────────
    const driversSnap = await adminDb.collection('drivers').get();

    const results: {
      total: number;
      updated: number;
      skipped: number;
      failed: number;
      details: Array<{ uid: string; action: string; name?: string }>;
    } = {
      total: driversSnap.size,
      updated: 0,
      skipped: 0,
      failed: 0,
      details: [],
    };

    // ── Process each driver ────────────────────────────────────
    for (const driverDoc of driversSnap.docs) {
      const uid = driverDoc.id;
      const data = driverDoc.data();
      const driverName = data.name || data.email || uid;

      try {
        // Check if user exists in Firebase Auth
        const userRecord = await adminAuth.getUser(uid);

        // Check existing claims
        const existingClaims = userRecord.customClaims || {};

        if (existingClaims.role === 'driver' && existingClaims.driver === true) {
          results.skipped++;
          results.details.push({ uid, name: driverName, action: 'already_set' });
          continue;
        }

        // Set driver claims — preserve any other existing claims
        await adminAuth.setCustomUserClaims(uid, {
          ...existingClaims,
          role: 'driver',
          driver: true,
        });

        results.updated++;
        results.details.push({ uid, name: driverName, action: 'updated' });
      } catch (err: unknown) {
        const error = err as { code?: string; message?: string };

        // User might exist in Firestore but not in Auth (orphaned doc)
        if (error.code === 'auth/user-not-found') {
          results.failed++;
          results.details.push({ uid, name: driverName, action: 'auth_user_not_found' });
        } else {
          results.failed++;
          results.details.push({
            uid,
            name: driverName,
            action: `error: ${error.message || 'unknown'}`,
          });
        }
      }
    }

    return NextResponse.json(results);
  } catch (err: unknown) {
    const error = err as { message?: string };
    console.error('Backfill driver claims error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
