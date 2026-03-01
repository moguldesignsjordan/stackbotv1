// src/app/api/admin/backfill-driver-claims/route.ts
import { NextRequest, NextResponse } from 'next/server';
import admin from '@/lib/firebase/admin';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing auth token' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decoded = await admin.auth().verifyIdToken(idToken);

    if (!decoded.admin && decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const driversSnap = await admin.firestore().collection('drivers').get();

    const results = {
      total: driversSnap.size,
      updated: 0,
      skipped: 0,
      failed: 0,
      details: [] as Array<{ uid: string; action: string; name?: string }>,
    };

    for (const driverDoc of driversSnap.docs) {
      const uid = driverDoc.id;
      const data = driverDoc.data();
      const driverName = data.name || data.email || uid;

      try {
        const userRecord = await admin.auth().getUser(uid);
        const existingClaims = userRecord.customClaims || {};

        if (existingClaims.role === 'driver' && existingClaims.driver === true) {
          results.skipped++;
          results.details.push({ uid, name: driverName, action: 'already_set' });
          continue;
        }

        await admin.auth().setCustomUserClaims(uid, {
          ...existingClaims,
          role: 'driver',
          driver: true,
        });

        results.updated++;
        results.details.push({ uid, name: driverName, action: 'updated' });
      } catch (err: unknown) {
        const error = err as { code?: string; message?: string };
        results.failed++;
        results.details.push({
          uid,
          name: driverName,
          action: error.code === 'auth/user-not-found' ? 'auth_user_not_found' : `error: ${error.message}`,
        });
      }
    }

    return NextResponse.json(results);
  } catch (err: unknown) {
    const error = err as { message?: string };
    console.error('Backfill error:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
