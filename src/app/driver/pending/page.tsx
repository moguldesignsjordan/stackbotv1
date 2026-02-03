// src/app/driver/pending/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import {
  doc,
  getDoc,
  query,
  collection,
  where,
  getDocs,
  onSnapshot,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import {
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  LogOut,
  RefreshCw,
  Mail,
  Phone,
  Truck,
  ArrowRight,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================
type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'not_found';

interface ApplicationData {
  status: ApplicationStatus;
  fullName?: string;
  email?: string;
  phone?: string;
  city?: string;
  rejectionReason?: string;
  createdAt?: any;
}

// ============================================================================
// COMPONENT
// ============================================================================
export default function DriverPendingPage() {
  const router = useRouter();

  const [user, setUser] = useState<{ uid: string; email: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [application, setApplication] = useState<ApplicationData | null>(null);
  const [checking, setChecking] = useState(false);

  // ============================================================================
  // AUTH & APPLICATION CHECK
  // ============================================================================
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        router.push('/driver/login');
        return;
      }

      setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
      });

      // Check driver status
      const email = firebaseUser.email?.toLowerCase();
      if (!email) {
        setAuthLoading(false);
        return;
      }

      // First check if already approved (has drivers doc)
      const driverDoc = await getDoc(doc(db, 'drivers', firebaseUser.uid));
      if (driverDoc.exists()) {
        // Already a driver - go to dashboard
        router.push('/driver');
        return;
      }

      // Check approved_drivers collection
      const emailKey = email.replace(/[.]/g, '_');
      const approvedDoc = await getDoc(doc(db, 'approved_drivers', emailKey));
      if (approvedDoc.exists()) {
        setApplication({ status: 'approved' });
        setAuthLoading(false);
        return;
      }

      // Check driver_applications - use realtime listener
      // Query by uid (not email) to avoid case sensitivity issues with security rules
      const applicationsQuery = query(
        collection(db, 'driver_applications'),
        where('uid', '==', firebaseUser.uid)
      );

      const unsubscribeApp = onSnapshot(applicationsQuery, (snapshot) => {
        if (snapshot.empty) {
          setApplication({ status: 'not_found' });
        } else {
          const appData = snapshot.docs[0].data();
          setApplication({
            status: appData.status as ApplicationStatus,
            fullName: appData.fullName,
            email: appData.email,
            phone: appData.phone,
            city: appData.city,
            rejectionReason: appData.rejectionReason,
            createdAt: appData.createdAt,
          });

          // If approved, can proceed to driver setup
          if (appData.status === 'approved') {
            // Application approved - user can now access driver portal
          }
        }
        setAuthLoading(false);
      });

      return () => unsubscribeApp();
    });

    return () => unsubscribe();
  }, [router]);

  // ============================================================================
  // HANDLERS
  // ============================================================================
  const handleRefresh = async () => {
    setChecking(true);
    
    // Short delay to show loading state
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    // The onSnapshot listener will automatically update
    setChecking(false);
  };

  const handleSignOut = async () => {
    await auth.signOut();
    router.push('/driver/login');
  };

  const handleGoToDashboard = () => {
    router.push('/driver');
  };

  const handleReapply = () => {
    router.push('/driver/apply');
  };

  // ============================================================================
  // LOADING STATE
  // ============================================================================
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0b0b12] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#55529d] mx-auto mb-3" />
          <p className="text-white/70">Checking status...</p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // NOT FOUND STATE
  // ============================================================================
  if (application?.status === 'not_found') {
    return (
      <div className="min-h-screen bg-[#0b0b12] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Truck className="w-10 h-10 text-white/60" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">No Application Found</h1>
          <p className="text-white/60 mb-8">
            You haven't submitted a driver application yet. Complete your application to get started.
          </p>
          <button
            onClick={() => router.push('/driver/apply')}
            className="w-full py-3 bg-[#55529d] text-white font-semibold rounded-xl hover:bg-[#444280] transition-colors flex items-center justify-center gap-2"
          >
            Complete Application
            <ArrowRight className="w-5 h-5" />
          </button>
          <button
            onClick={handleSignOut}
            className="mt-4 text-white/50 hover:text-white/70 text-sm transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // PENDING STATE
  // ============================================================================
  if (application?.status === 'pending') {
    return (
      <div className="min-h-screen bg-[#0b0b12] flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          {/* Status Card */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
            <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock className="w-10 h-10 text-yellow-400" />
            </div>
            
            <h1 className="text-2xl font-bold text-white mb-2">Application Pending</h1>
            <p className="text-white/60 mb-6">
              Your application is being reviewed. This usually takes 1-2 business days.
            </p>

            {/* Application Info */}
            {application.fullName && (
              <div className="bg-white/5 rounded-xl p-4 mb-6 text-left space-y-2">
                <div className="flex items-center gap-2 text-white/80">
                  <span className="text-white/50 text-sm">Name:</span>
                  <span className="font-medium">{application.fullName}</span>
                </div>
                {application.phone && (
                  <div className="flex items-center gap-2 text-white/80">
                    <span className="text-white/50 text-sm">Phone:</span>
                    <span>{application.phone}</span>
                  </div>
                )}
                {application.city && (
                  <div className="flex items-center gap-2 text-white/80">
                    <span className="text-white/50 text-sm">City:</span>
                    <span>{application.city}</span>
                  </div>
                )}
              </div>
            )}

            {/* What's Next */}
            <div className="bg-[#55529d]/10 border border-[#55529d]/30 rounded-xl p-4 mb-6 text-left">
              <h3 className="text-[#55529d] font-semibold mb-3">What's Next?</h3>
              <ol className="space-y-2 text-sm text-white/70">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#55529d] text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                  We review your application
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-white/20 text-white/60 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                  We contact you via WhatsApp
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-white/20 text-white/60 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                  Complete verification
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-white/20 text-white/60 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
                  Start delivering!
                </li>
              </ol>
            </div>

            {/* Actions */}
            <button
              onClick={handleRefresh}
              disabled={checking}
              className="w-full py-3 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/15 transition-colors flex items-center justify-center gap-2 mb-3"
            >
              {checking ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <RefreshCw className="w-5 h-5" />
              )}
              Check Status
            </button>

            <button
              onClick={handleSignOut}
              className="w-full py-3 text-white/50 hover:text-white/70 text-sm transition-colors flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>

          {/* Contact Info */}
          <div className="mt-6 text-center text-white/50 text-sm">
            <p>Questions? Contact us:</p>
            <a href="mailto:support@stackbotglobal.com" className="text-[#55529d] hover:underline">
              support@stackbotglobal.com
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // APPROVED STATE
  // ============================================================================
  if (application?.status === 'approved') {
    return (
      <div className="min-h-screen bg-[#0b0b12] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
            
            <h1 className="text-2xl font-bold text-white mb-2">You're Approved! 🎉</h1>
            <p className="text-white/60 mb-8">
              Congratulations! Your driver application has been approved. You can now access the driver dashboard.
            </p>

            <button
              onClick={handleGoToDashboard}
              className="w-full py-3 bg-[#55529d] text-white font-semibold rounded-xl hover:bg-[#444280] transition-colors flex items-center justify-center gap-2"
            >
              Go to Dashboard
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // REJECTED STATE
  // ============================================================================
  if (application?.status === 'rejected') {
    return (
      <div className="min-h-screen bg-[#0b0b12] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-red-400" />
            </div>
            
            <h1 className="text-2xl font-bold text-white mb-2">Application Not Approved</h1>
            <p className="text-white/60 mb-4">
              Unfortunately, your application was not approved at this time.
            </p>

            {application.rejectionReason && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-left">
                <p className="text-sm text-red-200">
                  <strong>Reason:</strong> {application.rejectionReason}
                </p>
              </div>
            )}

            <p className="text-white/50 text-sm mb-6">
              You may reapply if you believe there was an error or your circumstances have changed.
            </p>

            <div className="space-y-3">
              <button
                onClick={handleReapply}
                className="w-full py-3 bg-[#55529d] text-white font-semibold rounded-xl hover:bg-[#444280] transition-colors"
              >
                Submit New Application
              </button>
              
              <a
                href="mailto:support@stackbotglobal.com"
                className="block w-full py-3 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/15 transition-colors"
              >
                Contact Support
              </a>

              <button
                onClick={handleSignOut}
                className="w-full py-3 text-white/50 hover:text-white/70 text-sm transition-colors flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback
  return null;
}