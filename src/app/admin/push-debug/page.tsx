// src/app/admin/push-debug/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { collection, getDocs, query, where, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { checkPushStatus, initPushNotifications } from '@/lib/pushNotifications';
import { Card } from '@/components/ui/Card';
import {
  Bell,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Smartphone,
  Database,
  Zap,
} from 'lucide-react';

interface TokenRecord {
  userId: string;
  token: string;
  platform: string;
  updatedAt: { seconds: number } | null;
}

interface FCMError {
  userId: string;
  notificationId: string;
  error: string;
  message: string;
  timestamp: { seconds: number } | null;
}

export default function PushDebugPage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [pushStatus, setPushStatus] = useState<Awaited<ReturnType<typeof checkPushStatus>> | null>(null);
  const [tokenRecord, setTokenRecord] = useState<TokenRecord | null>(null);
  const [recentErrors, setRecentErrors] = useState<FCMError[]>([]);
  const [totalTokens, setTotalTokens] = useState(0);
  const [reinitResult, setReinitResult] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.uid);
      await loadDebugInfo(user.uid);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  async function loadDebugInfo(uid: string) {
    try {
      // Check native push status
      const status = await checkPushStatus();
      setPushStatus(status);

      // Check Firestore token
      const tokenDoc = await getDoc(doc(db, 'pushTokens', uid));
      if (tokenDoc.exists()) {
        setTokenRecord(tokenDoc.data() as TokenRecord);
      }

      // Count total tokens
      const tokensSnap = await getDocs(collection(db, 'pushTokens'));
      setTotalTokens(tokensSnap.size);

      // Get recent FCM errors for this user
      try {
        const errorsQuery = query(
          collection(db, 'fcmErrors'),
          where('userId', '==', uid),
          orderBy('timestamp', 'desc'),
          limit(5)
        );
        const errorsSnap = await getDocs(errorsQuery);
        setRecentErrors(errorsSnap.docs.map((d) => d.data() as FCMError));
      } catch {
        // fcmErrors collection may not exist yet
      }
    } catch (err) {
      console.error('[PushDebug] Error loading info:', err);
    }
  }

  async function handleReinit() {
    setReinitResult(null);
    try {
      const success = await initPushNotifications();
      setReinitResult(success ? '✅ Re-initialized successfully!' : '❌ Re-initialization failed');
      if (userId) await loadDebugInfo(userId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setReinitResult(`❌ Error: ${msg}`);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-sb-primary" />
      </div>
    );
  }

  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Bell className="w-6 h-6" />
        Push Notification Debug
      </h1>

      {/* Platform Info */}
      <Card>
        <div className="p-4 space-y-3">
          <h2 className="font-semibold flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Platform Info
          </h2>
          <div className="space-y-2 text-sm">
            <Row label="Platform" value={platform} />
            <Row label="Is Native" value={isNative ? '✅ Yes' : '❌ No (Web)'} />
            <Row label="User ID" value={userId || 'Not logged in'} />
          </div>
        </div>
      </Card>

      {/* Push Status */}
      <Card>
        <div className="p-4 space-y-3">
          <h2 className="font-semibold flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Push Status (Native)
          </h2>
          {!isNative ? (
            <p className="text-sm text-gray-500">Not running on native platform. Push diagnostics only available in the app.</p>
          ) : pushStatus ? (
            <div className="space-y-2 text-sm">
              <Row label="Supported" value={pushStatus.supported ? '✅ Yes' : '❌ No'} />
              <Row label="Permission" value={pushStatus.permission} />
              <Row label="Enabled" value={pushStatus.enabled ? '✅ Yes' : '❌ No'} />
              {pushStatus.token && <Row label="Token Preview" value={pushStatus.token} />}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Unable to check push status</p>
          )}
        </div>
      </Card>

      {/* Firestore Token */}
      <Card>
        <div className="p-4 space-y-3">
          <h2 className="font-semibold flex items-center gap-2">
            <Database className="w-5 h-5" />
            Firestore Token Record
          </h2>
          {tokenRecord ? (
            <div className="space-y-2 text-sm">
              <Row label="Status" value="✅ Token saved" />
              <Row label="Platform" value={tokenRecord.platform || 'unknown'} />
              <Row label="Token Preview" value={tokenRecord.token?.substring(0, 30) + '...'} />
              <Row
                label="Last Updated"
                value={
                  tokenRecord.updatedAt
                    ? new Date(tokenRecord.updatedAt.seconds * 1000).toLocaleString()
                    : 'unknown'
                }
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <XCircle className="w-4 h-4" />
              No token found for your user! Push notifications will NOT work.
            </div>
          )}
          <Row label="Total Registered Tokens" value={String(totalTokens)} />
        </div>
      </Card>

      {/* Recent FCM Errors */}
      <Card>
        <div className="p-4 space-y-3">
          <h2 className="font-semibold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Recent FCM Errors (Your User)
          </h2>
          {recentErrors.length === 0 ? (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle2 className="w-4 h-4" />
              No recent errors
            </div>
          ) : (
            <div className="space-y-2">
              {recentErrors.map((err, i) => (
                <div key={i} className="text-sm p-2 bg-red-50 rounded-lg border border-red-100">
                  <p className="font-medium text-red-800">{err.error}</p>
                  <p className="text-red-600">{err.message}</p>
                  <p className="text-red-400 text-xs">
                    {err.timestamp ? new Date(err.timestamp.seconds * 1000).toLocaleString() : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Actions */}
      <Card>
        <div className="p-4 space-y-3">
          <h2 className="font-semibold">Actions</h2>
          <button
            onClick={handleReinit}
            className="flex items-center gap-2 px-4 py-2 bg-sb-primary text-white rounded-xl text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            Re-initialize Push Notifications
          </button>
          {reinitResult && (
            <p className="text-sm mt-2">{reinitResult}</p>
          )}
        </div>
      </Card>

      {/* Checklist */}
      <Card>
        <div className="p-4 space-y-3">
          <h2 className="font-semibold">Android Checklist</h2>
          <ul className="text-sm space-y-1 text-gray-700">
            <li>✅ <code>google-services.json</code> in <code>android/app/</code></li>
            <li>✅ <code>firebase-messaging</code> in build.gradle</li>
            <li>✅ Notification channel &quot;default&quot; created in MainActivity</li>
            <li>✅ <code>POST_NOTIFICATIONS</code> permission in AndroidManifest</li>
            <li>✅ <code>FirebaseMessaging</code> plugin in capacitor.config.ts</li>
            <li>✅ FCM token saved to <code>pushTokens/&#123;userId&#125;</code></li>
            <li>✅ Cloud Function triggers on <code>notifications</code> collection</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className="text-right font-mono text-xs break-all ml-4">{value}</span>
    </div>
  );
}