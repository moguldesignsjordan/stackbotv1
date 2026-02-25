// src/app/admin/support/[ticketId]/page.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  collection,
  doc,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase/config';
import { onAuthStateChanged, getIdTokenResult } from 'firebase/auth';
import {
  ArrowLeft,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  Info,
  User,
  Store,
  Car,
  Shield,
  ChevronDown,
  ExternalLink,
} from 'lucide-react';
import type {
  SupportTicket,
  SupportMessage,
  SupportTicketStatus,
  SupportTicketPriority,
  CreateSupportMessageData,
} from '@/lib/types/support';
import {
  SUPPORT_COLLECTION,
  SUPPORT_MESSAGES_SUBCOLLECTION,
  TICKET_STATUS_LABELS,
  TICKET_STATUS_COLORS,
  TICKET_PRIORITY_LABELS,
  TICKET_PRIORITY_COLORS,
  TICKET_CATEGORY_LABELS,
} from '@/lib/types/support';

/* ============================================================
   COMPONENT
============================================================ */

export default function AdminTicketDetail() {
  const router = useRouter();
  const params = useParams();
  const ticketId = params.ticketId as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adminUid, setAdminUid] = useState<string | null>(null);
  const [adminName, setAdminName] = useState('Admin');
  const [showActions, setShowActions] = useState(false);
  const [updatingTicket, setUpdatingTicket] = useState(false);

  // ── Auth check ────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }
      try {
        const token = await getIdTokenResult(user, true);
        if (token.claims.role !== 'admin') {
          router.push('/');
          return;
        }
        setAdminUid(user.uid);
        setAdminName(user.displayName || user.email || 'Admin');
      } catch {
        router.push('/login');
      }
    });
    return () => unsub();
  }, [router]);

  // ── Listen to ticket doc ────────────────────────────────────
  useEffect(() => {
    if (!ticketId) return;

    const unsub = onSnapshot(
      doc(db, SUPPORT_COLLECTION, ticketId),
      (snap) => {
        if (snap.exists()) {
          setTicket({ id: snap.id, ...snap.data() } as SupportTicket);
        } else {
          router.push('/admin/support');
        }
      },
      (err) => console.error('Ticket listener error:', err)
    );
    return () => unsub();
  }, [ticketId, router]);

  // ── Listen to messages ────────────────────────────────────
  useEffect(() => {
    if (!ticketId) return;

    const q = query(
      collection(db, SUPPORT_COLLECTION, ticketId, SUPPORT_MESSAGES_SUBCOLLECTION),
      orderBy('createdAt', 'asc')
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const msgs: SupportMessage[] = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as SupportMessage[];
        setMessages(msgs);
        setLoading(false);
      },
      (err) => {
        console.error('Messages listener error:', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [ticketId]);

  // ── Reset unreadByAdmin when admin opens ──────────────────
  useEffect(() => {
    if (!ticket || !adminUid || ticket.unreadByAdmin === 0) return;

    updateDoc(doc(db, SUPPORT_COLLECTION, ticketId), {
      unreadByAdmin: 0,
    }).catch((err) => console.error('Failed to reset admin unread:', err));
  }, [ticket, ticketId, adminUid]);

  // ── Auto-scroll ───────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send message ──────────────────────────────────────────
  const handleSend = async () => {
    const text = newMessage.trim();
    if (!text || sending || !adminUid) return;

    setSending(true);
    setNewMessage('');

    try {
      const msgData: CreateSupportMessageData = {
        senderId: adminUid,
        senderName: adminName,
        senderRole: 'admin',
        text,
        imageURL: null,
        type: 'text',
        readByAdmin: true,
        readByUser: false,
        createdAt: Timestamp.now(),
      };

      await addDoc(
        collection(db, SUPPORT_COLLECTION, ticketId, SUPPORT_MESSAGES_SUBCOLLECTION),
        msgData
      );

      // Auto-claim ticket if unassigned
      if (ticket && !ticket.assignedAdmin) {
        await updateDoc(doc(db, SUPPORT_COLLECTION, ticketId), {
          assignedAdmin: adminUid,
          status: ticket.status === 'open' ? 'in_progress' : ticket.status,
          updatedAt: Timestamp.now(),
        });
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setNewMessage(text);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Ticket actions ────────────────────────────────────────
  const updateTicketField = async (field: string, value: string) => {
    if (!ticketId || updatingTicket) return;
    setUpdatingTicket(true);
    try {
      await updateDoc(doc(db, SUPPORT_COLLECTION, ticketId), {
        [field]: value,
        updatedAt: Timestamp.now(),
      });
    } catch (err) {
      console.error(`Failed to update ${field}:`, err);
    } finally {
      setUpdatingTicket(false);
      setShowActions(false);
    }
  };

  const claimTicket = async () => {
    if (!adminUid) return;
    await updateTicketField('assignedAdmin', adminUid);
  };

  const ROLE_ICONS: Record<string, React.ReactNode> = {
    customer: <User className="w-4 h-4" />,
    vendor: <Store className="w-4 h-4" />,
    driver: <Car className="w-4 h-4" />,
    admin: <Shield className="w-4 h-4" />,
  };

  // ── Loading ───────────────────────────────────────────────
  if (loading || !adminUid) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-sb-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] lg:h-[calc(100vh-100px)] bg-white rounded-xl shadow-sm overflow-hidden">
      {/* ══════════════════════════════════════════════════════
          HEADER
      ══════════════════════════════════════════════════════ */}
      <div className="flex-shrink-0 border-b border-gray-200">
        {/* Top row */}
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => router.push('/admin/support')}
            className="p-1.5 -ml-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>

          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-gray-900 truncate">
              {ticket?.subject ?? 'Loading...'}
            </h2>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {ticket && (
                <>
                  {/* User badge */}
                  <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                    {ROLE_ICONS[ticket.userRole]}
                    {ticket.userName}
                  </span>
                  <span className="text-gray-300">•</span>
                  {/* Status */}
                  <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${TICKET_STATUS_COLORS[ticket.status]}`}>
                    {TICKET_STATUS_LABELS[ticket.status]?.en}
                  </span>
                  {/* Priority */}
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${TICKET_PRIORITY_COLORS[ticket.priority]}`}>
                    {TICKET_PRIORITY_LABELS[ticket.priority]?.en}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Actions button */}
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              disabled={updatingTicket}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-700 transition-colors disabled:opacity-50"
            >
              {updatingTicket ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  Actions
                  <ChevronDown className="w-3.5 h-3.5" />
                </>
              )}
            </button>

            {/* Actions dropdown */}
            {showActions && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowActions(false)} />
                <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl shadow-lg border border-gray-200 z-50 py-1">
                  {/* Claim */}
                  {ticket && ticket.assignedAdmin !== adminUid && (
                    <button
                      onClick={claimTicket}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-gray-50 transition-colors"
                    >
                      <Shield className="w-4 h-4 text-purple-500" />
                      Claim Ticket
                    </button>
                  )}

                  {/* Status changes */}
                  <div className="px-3 py-2 border-t border-gray-100">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Status</p>
                    {(['open', 'in_progress', 'resolved', 'closed'] as SupportTicketStatus[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => updateTicketField('status', s)}
                        disabled={ticket?.status === s}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-left transition-colors ${
                          ticket?.status === s
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${
                          s === 'open' ? 'bg-blue-400' :
                          s === 'in_progress' ? 'bg-yellow-400' :
                          s === 'resolved' ? 'bg-green-400' : 'bg-gray-400'
                        }`} />
                        {TICKET_STATUS_LABELS[s]?.en}
                      </button>
                    ))}
                  </div>

                  {/* Priority changes */}
                  <div className="px-3 py-2 border-t border-gray-100">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Priority</p>
                    {(['low', 'normal', 'high', 'urgent'] as SupportTicketPriority[]).map((p) => (
                      <button
                        key={p}
                        onClick={() => updateTicketField('priority', p)}
                        disabled={ticket?.priority === p}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-left transition-colors ${
                          ticket?.priority === p
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${
                          p === 'low' ? 'bg-gray-400' :
                          p === 'normal' ? 'bg-blue-400' :
                          p === 'high' ? 'bg-orange-400' : 'bg-red-500'
                        }`} />
                        {TICKET_PRIORITY_LABELS[p]?.en}
                      </button>
                    ))}
                  </div>

                  {/* Related order */}
                  {ticket?.relatedOrderId && (
                    <div className="border-t border-gray-100">
                      <button
                        onClick={() => {
                          router.push(`/admin/orders/${ticket.relatedOrderId}`);
                          setShowActions(false);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-gray-50 transition-colors text-blue-600"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View Order
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Ticket metadata bar */}
        {ticket && (
          <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 text-xs text-gray-500 overflow-x-auto">
            <span>{TICKET_CATEGORY_LABELS[ticket.category]?.en}</span>
            <span className="text-gray-300">•</span>
            <span>
              {ticket.assignedAdmin
                ? ticket.assignedAdmin === adminUid
                  ? 'Assigned to you'
                  : `Assigned to ${ticket.assignedAdmin.slice(0, 8)}...`
                : 'Unassigned'}
            </span>
            {ticket.relatedOrderId && (
              <>
                <span className="text-gray-300">•</span>
                <span>Order: {ticket.relatedOrderId.slice(0, 8)}...</span>
              </>
            )}
            <span className="text-gray-300">•</span>
            <span>
              Created {ticket.createdAt?.toDate?.()?.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════
          MESSAGES
      ══════════════════════════════════════════════════════ */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
        {messages.map((msg) => {
          const isAdmin = msg.senderRole === 'admin';
          const isSystem = msg.type === 'system';

          if (isSystem) {
            return (
              <div key={msg.id} className="flex justify-center my-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full">
                  <Info className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-gray-500">{msg.text}</span>
                </div>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
            >
              <div className="max-w-[80%]">
                {!isAdmin && (
                  <p className="text-[10px] text-gray-400 mb-0.5 ml-1 flex items-center gap-1">
                    {ROLE_ICONS[msg.senderRole]}
                    {msg.senderName}
                    <span className="text-gray-300">({msg.senderRole})</span>
                  </p>
                )}

                <div
                  className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isAdmin
                      ? 'bg-sb-primary text-white rounded-br-md'
                      : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md shadow-sm'
                  }`}
                >
                  {msg.type === 'image' && msg.imageURL && (
                    <img
                      src={msg.imageURL}
                      alt="Attachment"
                      className="rounded-lg max-w-full max-h-48 object-cover mb-1"
                    />
                  )}
                  {msg.text && (
                    <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                  )}
                </div>

                <p className={`text-[10px] text-gray-400 mt-0.5 ${isAdmin ? 'text-right mr-1' : 'ml-1'}`}>
                  {msg.createdAt?.toDate?.()?.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                  }) ?? ''}
                </p>
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* ══════════════════════════════════════════════════════
          INPUT BAR
      ══════════════════════════════════════════════════════ */}
      <div className="flex-shrink-0 bg-white border-t border-gray-200 px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Reply as admin..."
            rows={1}
            maxLength={2000}
            className="flex-1 px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-sb-primary focus:border-transparent outline-none resize-none max-h-24 transition-all"
            style={{ minHeight: '42px' }}
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className="flex-shrink-0 p-2.5 bg-sb-primary text-white rounded-xl hover:bg-sb-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {sending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}