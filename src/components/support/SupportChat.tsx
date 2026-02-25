// src/components/support/SupportChat.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import {
  collection,
  doc,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  Timestamp,
  getDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  ArrowLeft,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  Info,
} from 'lucide-react';
import type {
  SupportTicket,
  SupportMessage,
  SupportSenderRole,
  CreateSupportMessageData,
} from '@/lib/types/support';
import {
  SUPPORT_COLLECTION,
  SUPPORT_MESSAGES_SUBCOLLECTION,
  TICKET_STATUS_LABELS,
  TICKET_STATUS_COLORS,
  TICKET_CATEGORY_LABELS,
} from '@/lib/types/support';

interface SupportChatProps {
  ticketId: string;
  userId: string;
  userName: string;
  userRole: SupportSenderRole;
  language: 'en' | 'es';
  onBack: () => void;
}

export default function SupportChat({
  ticketId,
  userId,
  userName,
  userRole,
  language,
  onBack,
}: SupportChatProps) {
  const lang = language === 'es' ? 'es' : 'en';
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  // ── Listen to ticket doc ────────────────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, SUPPORT_COLLECTION, ticketId),
      (snap) => {
        if (snap.exists()) {
          setTicket({ id: snap.id, ...snap.data() } as SupportTicket);
        }
      },
      (err) => console.error('Ticket listener error:', err)
    );
    return () => unsub();
  }, [ticketId]);

  // ── Listen to messages subcollection ────────────────────────
  useEffect(() => {
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

  // ── Reset unreadByUser when user opens chat ─────────────────
  useEffect(() => {
    if (!ticket || ticket.unreadByUser === 0) return;

    // Only the ticket owner (non-admin) resets unreadByUser
    if (userRole !== 'admin' && ticket.userId === userId) {
      updateDoc(doc(db, SUPPORT_COLLECTION, ticketId), {
        unreadByUser: 0,
      }).catch((err) => console.error('Failed to reset unread:', err));
    }
  }, [ticket, ticketId, userId, userRole]);

  // ── Auto-scroll on new messages ─────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send message ────────────────────────────────────────────
  const handleSend = async () => {
    const text = newMessage.trim();
    if (!text || sending) return;

    // Don't allow messages on closed/resolved tickets
    if (ticket?.status === 'closed' || ticket?.status === 'resolved') return;

    setSending(true);
    setNewMessage('');

    try {
      const msgData: CreateSupportMessageData = {
        senderId: userId,
        senderName: userName,
        senderRole: userRole,
        text,
        imageURL: null,
        type: 'text',
        readByAdmin: userRole === 'admin',
        readByUser: userRole !== 'admin',
        createdAt: Timestamp.now(),
      };

      await addDoc(
        collection(db, SUPPORT_COLLECTION, ticketId, SUPPORT_MESSAGES_SUBCOLLECTION),
        msgData
      );
    } catch (err) {
      console.error('Failed to send message:', err);
      setNewMessage(text); // Restore on failure
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  // ── Keyboard submit ─────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isClosed = ticket?.status === 'closed' || ticket?.status === 'resolved';

  // ── Loading ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-16">
        <Loader2 className="w-7 h-7 animate-spin text-[#55529d]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 -ml-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>

          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-gray-900 truncate">
              {ticket?.subject ?? '...'}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              {ticket && (
                <>
                  <span
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                      TICKET_STATUS_COLORS[ticket.status]
                    }`}
                  >
                    {TICKET_STATUS_LABELS[ticket.status]?.[lang]}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {TICKET_CATEGORY_LABELS[ticket.category]?.[lang]}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Messages ────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg) => {
          const isMe = msg.senderId === userId;
          const isSystem = msg.type === 'system';

          // System message
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

          // Chat bubble
          return (
            <div
              key={msg.id}
              className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] ${isMe ? 'order-1' : 'order-1'}`}>
                {/* Sender name (only for admin replies visible to user) */}
                {!isMe && (
                  <p className="text-[10px] text-gray-400 mb-0.5 ml-1">
                    {msg.senderName}
                    {msg.senderRole === 'admin' && (
                      <span className="ml-1 text-[#55529d] font-medium">
                        • {lang === 'en' ? 'Support' : 'Soporte'}
                      </span>
                    )}
                  </p>
                )}

                <div
                  className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isMe
                      ? 'bg-[#55529d] text-white rounded-br-md'
                      : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md shadow-sm'
                  }`}
                >
                  {/* Image message */}
                  {msg.type === 'image' && msg.imageURL && (
                    <img
                      src={msg.imageURL}
                      alt="Attachment"
                      className="rounded-lg max-w-full max-h-48 object-cover mb-1"
                    />
                  )}

                  {/* Text */}
                  {msg.text && (
                    <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                  )}
                </div>

                {/* Timestamp */}
                <p className={`text-[10px] text-gray-400 mt-0.5 ${isMe ? 'text-right mr-1' : 'ml-1'}`}>
                  {msg.createdAt?.toDate?.()
                    ? msg.createdAt.toDate().toLocaleTimeString(lang === 'en' ? 'en-US' : 'es-DO', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })
                    : ''}
                </p>
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Closed banner ───────────────────────────────────── */}
      {isClosed && (
        <div className="flex-shrink-0 px-4 py-3 bg-gray-100 border-t border-gray-200">
          <div className="flex items-center gap-2 justify-center text-sm text-gray-500">
            <CheckCircle className="w-4 h-4" />
            {lang === 'en'
              ? 'This ticket has been resolved. Need more help? Open a new ticket.'
              : 'Este ticket ha sido resuelto. ¿Necesitas más ayuda? Abre un nuevo ticket.'}
          </div>
        </div>
      )}

      {/* ── Input bar ───────────────────────────────────────── */}
      {!isClosed && (
        <div className="flex-shrink-0 bg-white border-t border-gray-200 px-4 py-3 safe-bottom">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                lang === 'en' ? 'Type a message...' : 'Escribe un mensaje...'
              }
              rows={1}
              maxLength={2000}
              className="flex-1 px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#55529d] focus:border-transparent outline-none resize-none max-h-24 transition-all"
              style={{ minHeight: '42px' }}
            />
            <button
              onClick={handleSend}
              disabled={!newMessage.trim() || sending}
              className="flex-shrink-0 p-2.5 bg-[#55529d] text-white rounded-xl hover:bg-[#444287] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}