"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Badge } from "@/components/ui/Badge";

interface AuditLog {
  id: string;
  action: string;
  vendorId: string;
  vendorName: string;
  adminEmail: string;
  timestamp?: any;
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDocs(
          query(
            collection(db, "admin_audit_logs"),
            orderBy("timestamp", "desc")
          )
        );

        setLogs(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as any),
          }))
        );
      } catch (err) {
        console.error("Failed to load audit logs", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return <LoadingSpinner text="Loading audit logs..." />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Admin Audit Logs</h1>

      {logs.length === 0 ? (
        <p className="text-sm text-gray-600">No audit logs found.</p>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <Card key={log.id} padding="md">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-gray-900">
                    {log.action.replace(/_/g, " ").toUpperCase()}
                  </p>
                  <p className="text-sm text-gray-600">
                    Vendor: {log.vendorName}
                  </p>
                  <p className="text-xs text-gray-500">
                    Admin: {log.adminEmail}
                  </p>
                </div>

<Badge variant="default">
  {log.timestamp?.toDate?.().toLocaleString() || "—"}
</Badge>

              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
