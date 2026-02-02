"use client";

import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/config";
import { Card } from "@/components/ui/Card";
import { Send, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function BroadcastPage() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [url, setUrl] = useState("/");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const sendBroadcast = async () => {
    if (!title.trim() || !message.trim()) {
      setResult({ type: "error", text: "Title and message are required" });
      return;
    }

    if (!confirm(`Send notification to ALL users?\n\nTitle: ${title}\nMessage: ${message}`)) {
      return;
    }

    setSending(true);
    setResult(null);

    try {
      const sendBroadcastNotification = httpsCallable(functions, "sendBroadcastNotification");
      const response = await sendBroadcastNotification({ title, message, url });
      const data = response.data as any;

      setResult({
        type: "success",
        text: `✅ Sent to ${data.successCount}/${data.totalUsers} users`,
      });
      setTitle("");
      setMessage("");
    } catch (err: any) {
      console.error("Broadcast error:", err);
      setResult({
        type: "error",
        text: err.message || "Failed to send broadcast",
      });
    }

    setSending(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">📢 Broadcast Notification</h1>
      <p className="text-gray-600">
        Send a push notification to ALL users with the app installed.
      </p>

      <Card>
        <div className="space-y-4 p-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="🎉 Big Announcement!"
              className="w-full px-4 py-3 border rounded-xl"
              maxLength={50}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Check out our new features..."
              rows={3}
              className="w-full px-4 py-3 border rounded-xl resize-none"
              maxLength={200}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Link (where to go when tapped)
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="/"
              className="w-full px-4 py-3 border rounded-xl"
            />
          </div>

          {result && (
            <div
              className={`p-4 rounded-xl flex items-center gap-2 ${
                result.type === "success"
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {result.type === "success" ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
              {result.text}
            </div>
          )}

          <button
            onClick={sendBroadcast}
            disabled={sending || !title.trim() || !message.trim()}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-sb-primary text-white rounded-xl font-semibold hover:bg-sb-primary/90 disabled:opacity-50"
          >
            {sending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Sending to all users...
              </>
            ) : (
              <>
                <Send className="h-5 w-5" />
                Send to All Users
              </>
            )}
          </button>
        </div>
      </Card>

      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
        <strong>⚠️ Warning:</strong> This will send a notification to every user 
        who has the app installed and notifications enabled. Use sparingly!
      </div>
    </div>
  );
}