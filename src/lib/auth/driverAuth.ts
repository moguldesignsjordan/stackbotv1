// src/lib/auth/driverAuth.ts
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  query,
  collection,
  where,
  getDocs,
  serverTimestamp,
  limit,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';

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

  // Helper to build the result object
  const buildResult = (driver: DriverProfile): SignInResult => ({
    user: {
      uid: user.uid,
      email: userEmail,
      displayName: user.displayName,
    },
    driver,
  });

  // --------------------------------------------------------------------------
  // 1. Check if driver doc already exists (approved driver)
  // --------------------------------------------------------------------------
  try {
    const driverRef = doc(db, 'drivers', user.uid);
    const driverSnap = await getDoc(driverRef);

    if (driverSnap.exists()) {
      const data = driverSnap.data() as any;
      const status: DriverStatus = (data.status as DriverStatus) || 'approved';

      const driver: DriverProfile = {
        uid: user.uid,
        email: userEmail,
        name: data.name || user.displayName || 'Driver',
        status,
        phone: data.phone,
        city: data.city,
        vehicleType: data.vehicleType,
        vehiclePlate: data.vehiclePlate,
        vehicleColor: data.vehicleColor,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };

      return buildResult(driver);
    }
  } catch (err) {
    console.log(
      'Drivers collection check error:',
      err instanceof Error ? err.message : err
    );
  }

  // --------------------------------------------------------------------------
  // 2. Check approved_drivers (whitelist) collection
  //    → if present, we create a drivers/{uid} doc (allowed by your dev rules)
  // --------------------------------------------------------------------------
  try {
    const emailKey = userEmail.replace(/[.]/g, '_');
    const approvedRef = doc(db, 'approved_drivers', emailKey);
    const approvedSnap = await getDoc(approvedRef);

    if (approvedSnap.exists()) {
      const approvedData = approvedSnap.data() as any;

      try {
        await setDoc(doc(db, 'drivers', user.uid), {
          uid: user.uid,                // 🔐 required by your rules
          userId: user.uid,
          email: userEmail,
          name: approvedData.name || user.displayName || 'Driver',
          phone: approvedData.phone || '',
          city: approvedData.city || '',
          vehicleType: approvedData.vehicleType || 'motorcycle',
          vehiclePlate: approvedData.vehiclePlate || '',
          vehicleColor: approvedData.vehicleColor || '',
          status: 'approved',
          isOnline: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.log(
          'Error creating driver doc from approved_drivers:',
          err instanceof Error ? err.message : err
        );
      }

      const driver: DriverProfile = {
        uid: user.uid,
        email: userEmail,
        name: approvedData.name || user.displayName || 'Driver',
        status: 'approved',
        phone: approvedData.phone,
        city: approvedData.city,
        vehicleType: approvedData.vehicleType,
        vehiclePlate: approvedData.vehiclePlate,
        vehicleColor: approvedData.vehicleColor,
      };

      return buildResult(driver);
    }
  } catch (err) {
    console.log(
      'approved_drivers check error:',
      err instanceof Error ? err.message : err
    );
  }

  // --------------------------------------------------------------------------
  // 3. Check driver_applications (by uid, then by email)
  // --------------------------------------------------------------------------
  let application: any | null = null;

  try {
    // First try: by uid
    let appQuery = query(
      collection(db, 'driver_applications'),
      where('uid', '==', user.uid),
      limit(1)
    );
    let snapshot = await getDocs(appQuery);

    // Fallback: by email
    if (snapshot.empty) {
      const emailQuery = query(
        collection(db, 'driver_applications'),
        where('email', '==', userEmail),
        limit(1)
      );
      snapshot = await getDocs(emailQuery);
    }

    if (!snapshot.empty) {
      application = snapshot.docs[0].data();
      const status: DriverStatus =
        (application.status as DriverStatus) || 'pending';

      // If the application is approved but driver doc wasn't created, create it now
      if (status === 'approved') {
        try {
          await setDoc(doc(db, 'drivers', user.uid), {
            uid: user.uid, // 🔐 required by your rules
            userId: user.uid,
            email: userEmail,
            name: application.fullName || user.displayName || 'Driver',
            phone: application.phone || '',
            city: application.city || '',
            vehicleType: application.vehicleType || 'motorcycle',
            vehiclePlate: application.vehiclePlate || '',
            vehicleColor: application.vehicleColor || '',
            status: 'approved',
            isOnline: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          console.log(
            'Error creating driver doc from application:',
            err instanceof Error ? err.message : err
          );
        }
      }

      const driver: DriverProfile = {
        uid: user.uid,
        email: userEmail,
        name: application.fullName || user.displayName || 'Driver',
        status,
        phone: application.phone,
        city: application.city,
        vehicleType: application.vehicleType,
        vehiclePlate: application.vehiclePlate,
        vehicleColor: application.vehicleColor,
        rejectionReason: application.rejectionReason,
      };

      return buildResult(driver);
    }
  } catch (err) {
    console.log(
      'driver_applications check error:',
      err instanceof Error ? err.message : err
    );
  }

  // --------------------------------------------------------------------------
  // 4. No application found → brand new driver, must apply
  // --------------------------------------------------------------------------
  const driver: DriverProfile = {
    uid: user.uid,
    email: userEmail,
    name: user.displayName || 'Driver',
    status: 'new',
  };

  return buildResult(driver);
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
export async function getDriverStatus(
  uid: string,
  email: string
): Promise<DriverStatus> {
  const userEmail = email.toLowerCase();

  // 1) If driver doc exists → approved
  try {
    const driverRef = doc(db, 'drivers', uid);
    const driverSnap = await getDoc(driverRef);
    if (driverSnap.exists()) {
      return 'approved';
    }
  } catch {}

  // 2) If in approved_drivers → approved
  try {
    const emailKey = userEmail.replace(/[.]/g, '_');
    const approvedRef = doc(db, 'approved_drivers', emailKey);
    const approvedSnap = await getDoc(approvedRef);
    if (approvedSnap.exists()) {
      return 'approved';
    }
  } catch {}

  // 3) Look in driver_applications
  try {
    let snapshot = await getDocs(
      query(
        collection(db, 'driver_applications'),
        where('uid', '==', uid),
        limit(1)
      )
    );

    if (snapshot.empty) {
      snapshot = await getDocs(
        query(
          collection(db, 'driver_applications'),
          where('email', '==', userEmail),
          limit(1)
        )
      );
    }

    if (!snapshot.empty) {
      const status = snapshot.docs[0].data().status as DriverStatus;
      if (status === 'pending') return 'pending';
      if (status === 'rejected') return 'rejected';
      if (status === 'approved') return 'approved';
    }
  } catch {}

  return 'new';
}
