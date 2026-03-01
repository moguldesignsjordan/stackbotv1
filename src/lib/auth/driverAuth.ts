// src/lib/auth/driverAuth.ts
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { auth } from '@/lib/firebase/config';

// ============================================================================
// TYPES
// ============================================================================
export type DriverStatus = 'new' | 'pending' | 'approved' | 'rejected';

export interface DriverProfile {
  uid: string;
  email: string;
  name: string;
  status: DriverStatus;
  phone?: string;
  city?: string;
  vehicleType?: string;
  vehiclePlate?: string;
  vehicleColor?: string;
  rejectionReason?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface SignInResult {
  user: {
    uid: string;
    email: string;
    displayName: string | null;
  };
  driver: DriverProfile;
}

// ============================================================================
// INTERNAL: Call the server-side check-status API
// ============================================================================

interface CheckStatusAPIResponse {
  isDriver: boolean;
  status: 'approved' | 'pending' | 'rejected' | 'none';
}

/**
 * Calls POST /api/driver/check-status using the current user's ID token.
 * The server-side route uses Firebase Admin SDK to bypass Firestore rules
 * and check drivers, approved_drivers, and driver_applications collections.
 */
async function callCheckStatusAPI(
  displayName?: string | null,
  phone?: string | null
): Promise<CheckStatusAPIResponse> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('No authenticated user');
  }

  const idToken = await currentUser.getIdToken(true);

  const res = await fetch('/api/driver/check-status', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      displayName: displayName || null,
      phone: phone || null,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `check-status API returned ${res.status}`);
  }

  return res.json();
}

/**
 * Maps API response status to DriverStatus type.
 * The API returns 'none' for no application; we map that to 'new'.
 */
function apiStatusToDriverStatus(
  apiStatus: CheckStatusAPIResponse['status']
): DriverStatus {
  if (apiStatus === 'none') return 'new';
  return apiStatus;
}

// ============================================================================
// CREATE DRIVER ACCOUNT
// ============================================================================

/**
 * Creates a new Firebase Auth account for a driver.
 * Does NOT create any Firestore docs - that happens in the apply / approval step.
 */
export async function createDriverAccount({
  email,
  password,
  displayName,
}: {
  email: string;
  password: string;
  displayName?: string;
}): Promise<{ uid: string; email: string }> {
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email.trim().toLowerCase(),
    password
  );

  const user = userCredential.user;

  if (displayName) {
    await updateProfile(user, { displayName: displayName.trim() });
  }

  return {
    uid: user.uid,
    email: user.email!,
  };
}

// ============================================================================
// SIGN IN DRIVER
// ============================================================================

/**
 * Signs in a driver and returns their status.
 *
 * Status determines where to route them:
 * - 'approved' → driver dashboard
 * - 'new'      → apply page (no application yet)
 * - 'pending'  → pending / awaiting approval page
 * - 'rejected' → pending page (with rejection info)
 *
 * Uses the server-side /api/driver/check-status endpoint (Admin SDK)
 * to bypass Firestore security rules for pre-authorization lookups.
 */
export async function signInDriver(
  email: string,
  password: string
): Promise<SignInResult> {
  // 1) Firebase Auth sign-in
  const userCredential = await signInWithEmailAndPassword(
    auth,
    email.trim().toLowerCase(),
    password
  );

  const user = userCredential.user;
  const userEmail = user.email?.toLowerCase();

  if (!userEmail) {
    throw new Error('No email associated with this account');
  }

  // 2) Check driver status via server-side API
  const apiResult = await callCheckStatusAPI(user.displayName);
  const status = apiStatusToDriverStatus(apiResult.status);

  const driver: DriverProfile = {
    uid: user.uid,
    email: userEmail,
    name: user.displayName || 'Driver',
    status,
  };

  return {
    user: {
      uid: user.uid,
      email: userEmail,
      displayName: user.displayName,
    },
    driver,
  };
}

// ============================================================================
// PASSWORD RESET
// ============================================================================
export async function sendDriverPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim().toLowerCase());
}

// ============================================================================
// LIGHTWEIGHT STATUS CHECK (WITHOUT SIGN-IN)
// ============================================================================

/**
 * Checks driver status for an already-authenticated user.
 * Uses the server-side API endpoint to avoid Firestore permission errors.
 *
 * The uid and email params are kept for API compatibility but the actual
 * lookup is driven by the current auth user's ID token on the server.
 */
export async function getDriverStatus(
  _uid: string,
  _email: string
): Promise<DriverStatus> {
  try {
    const apiResult = await callCheckStatusAPI();
    return apiStatusToDriverStatus(apiResult.status);
  } catch (err) {
    console.error('getDriverStatus error:', err);
    // Fallback: if API call fails and user isn't authenticated yet, return 'new'
    return 'new';
  }
}