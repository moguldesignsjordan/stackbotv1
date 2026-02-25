// src/components/support/SupportTicketList.tsx
'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronRight,
  Plus,
} from 'lucide-react';
import type {
  SupportTicket,
  SupportTicketStatus,
} from '@/lib/types/support';
import {
  TICKET_STATUS_LABELS,
  TICKET_STATUS_COLORS,
  TICKET_CATEGORY_LABELS,
} from '@/lib/types/support';

interface SupportTicketListProps {
  userId: string;
  language: 'en' | 'es';
  onSelectTicket: (ticketId: string) => void;
  onNewTicket: () => void;
}

const STATUS_ICONS: Record<SupportTicketStatus, React.ReactNode> = {
  open: <AlertCircle className="w-4 h-4" />,
  in_progress: <Clock className="w-4 h-4" />,
  resolved: <CheckCircle className="w-4 h-4" />,
  closed: <CheckCircle className="w-4 h-4" />,
};

function timeAgo(date: Date, lang: 'en' | 'es'): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (diffMin < 1) return lang === 'en' ? 'Just now' : 'Ahora';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHrs < 24) return `${diffHrs}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString(lang === 'en' ? 'en-US' : 'es-DO', {
    month: 'short',
    day: 'numeric',
  });
}

export default function SupportTicketList({
  userId,
  language,
  onSelectTicket,
  onNewTicket,
}: SupportTicketListProps) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, 'supportTickets'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: SupportTicket[] = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as SupportTicket[];
        setTickets(list);
        setLoading(false);
      },
      (err) => {
        console.error('Error loading support tickets:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [userId]);

  const lang = language === 'es' ? 'es' : 'en';

  // Loading
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-7 h-7 animate-spin text-[#55529d]" />
      </div>
    );
  }

  // Empty state
  if (tickets.length === 0) {
    return (
      <div className="text-center py-16 px-4">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <MessageSquare className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          {lang === 'en' ? 'No support tickets yet' : 'No tienes tickets de soporte'}
        </h3>
        <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
          {lang === 'en'
            ? 'Need help? Open a ticket and our team will get back to you.'
            : '¿Necesitas ayuda? Abre un ticket y nuestro equipo te responderá.'}
        </p>
        <button
          onClick={onNewTicket}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#55529d] text-white rounded-xl font-medium hover:bg-[#444287] transition-colors"
        >
          <Plus className="w-4 h-4" />
          {lang === 'en' ? 'New Ticket' : 'Nuevo Ticket'}
        </button>
      </div>
    );
  }

  // Ticket list
  return (
    <div className="divide-y divide-gray-100">
      {tickets.map((ticket) => {
        const hasUnread = ticket.unreadByUser > 0;
        const statusLabel = TICKET_STATUS_LABELS[ticket.status]?.[lang] ?? ticket.status;
        const statusColor = TICKET_STATUS_COLORS[ticket.status] ?? 'bg-gray-100 text-gray-600';
        const categoryLabel = TICKET_CATEGORY_LABELS[ticket.category]?.[lang] ?? ticket.category;
        const createdDate = ticket.lastMessageAt?.toDate?.() ?? ticket.createdAt?.toDate?.() ?? new Date();

        return (
          <button
            key={ticket.id}
            onClick={() => onSelectTicket(ticket.id)}
            className="w-full flex items-start gap-3 px-4 py-4 text-left hover:bg-gray-50 transition-colors"
          >
            {/* Unread dot */}
            <div className="pt-1.5 w-3 flex-shrink-0">
              {hasUnread && (
                <span className="block w-2.5 h-2.5 rounded-full bg-[#55529d]" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <h4 className={`text-sm truncate ${hasUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                  {ticket.subject}
                </h4>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {timeAgo(createdDate, lang)}
                </span>
              </div>

              <p className="text-xs text-gray-500 truncate mb-1.5">
                {ticket.lastMessage || (lang === 'en' ? 'No messages yet' : 'Sin mensajes')}
              </p>

              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColor}`}>
                  {STATUS_ICONS[ticket.status]}
                  {statusLabel}
                </span>
                <span className="text-[10px] text-gray-400">
                  {categoryLabel}
                </span>
              </div>
            </div>

            <ChevronRight className="w-4 h-4 text-gray-300 mt-1.5 flex-shrink-0" />
          </button>
        );
      })}
    </div>
  );
}