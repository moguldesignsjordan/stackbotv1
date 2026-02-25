// src/app/admin/support/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase/config';
import { onAuthStateChanged, getIdTokenResult } from 'firebase/auth';
import {
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronRight,
  Search,
  User,
  Store,
  Car,
  Filter,
  Inbox,
} from 'lucide-react';
import type {
  SupportTicket,
  SupportTicketStatus,
  SupportTicketPriority,
  SupportUserRole,
} from '@/lib/types/support';
import {
  TICKET_STATUS_LABELS,
  TICKET_STATUS_COLORS,
  TICKET_PRIORITY_LABELS,
  TICKET_PRIORITY_COLORS,
  TICKET_CATEGORY_LABELS,
} from '@/lib/types/support';

/* ============================================================
   CONSTANTS
============================================================ */

const STATUS_TABS: { value: SupportTicketStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

const ROLE_FILTERS: { value: SupportUserRole | 'all'; label: string; icon: typeof User }[] = [
  { value: 'all', label: 'All Roles', icon: User },
  { value: 'customer', label: 'Customers', icon: User },
  { value: 'vendor', label: 'Vendors', icon: Store },
  { value: 'driver', label: 'Drivers', icon: Car },
];

const STATUS_ICONS: Record<SupportTicketStatus, React.ReactNode> = {
  open: <AlertCircle className="w-3.5 h-3.5" />,
  in_progress: <Clock className="w-3.5 h-3.5" />,
  resolved: <CheckCircle className="w-3.5 h-3.5" />,
  closed: <CheckCircle className="w-3.5 h-3.5" />,
};

const ROLE_ICONS: Record<SupportUserRole, React.ReactNode> = {
  customer: <User className="w-3.5 h-3.5" />,
  vendor: <Store className="w-3.5 h-3.5" />,
  driver: <Car className="w-3.5 h-3.5" />,
};

function timeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* ============================================================
   COMPONENT
============================================================ */

export default function AdminSupportInbox() {
  const router = useRouter();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminUid, setAdminUid] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<SupportTicketStatus | 'all'>('all');
  const [roleFilter, setRoleFilter] = useState<SupportUserRole | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMyAssigned, setShowMyAssigned] = useState(false);

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
      } catch {
        router.push('/login');
      }
    });
    return () => unsub();
  }, [router]);

  // ── Real-time ticket listener ─────────────────────────────
  useEffect(() => {
    if (!adminUid) return;

    // Base query: all tickets sorted by last activity
    const q = query(
      collection(db, 'supportTickets'),
      orderBy('lastMessageAt', 'desc')
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
        console.error('Admin support tickets error:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [adminUid]);

  // ── Client-side filtering ─────────────────────────────────
  const filteredTickets = tickets.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (roleFilter !== 'all' && t.userRole !== roleFilter) return false;
    if (showMyAssigned && t.assignedAdmin !== adminUid) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        t.subject.toLowerCase().includes(q) ||
        t.userName.toLowerCase().includes(q) ||
        t.lastMessage?.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // ── Stats ─────────────────────────────────────────────────
  const totalUnread = tickets.reduce((sum, t) => sum + (t.unreadByAdmin || 0), 0);
  const openCount = tickets.filter((t) => t.status === 'open').length;
  const inProgressCount = tickets.filter((t) => t.status === 'in_progress').length;
  const myAssignedCount = tickets.filter((t) => t.assignedAdmin === adminUid).length;

  // ── Loading ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-sb-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ── Header ───────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Support Inbox</h1>
        <p className="text-sm text-gray-500 mt-1">
          {tickets.length} total tickets • {totalUnread} unread
        </p>
      </div>

      {/* ── Quick Stats ──────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => { setStatusFilter('all'); setShowMyAssigned(false); }}
          className={`bg-white rounded-xl p-4 text-left shadow-sm border transition-colors ${
            statusFilter === 'all' && !showMyAssigned ? 'border-sb-primary ring-1 ring-sb-primary/20' : 'border-gray-100'
          }`}
        >
          <p className="text-2xl font-bold text-gray-900">{tickets.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">All Tickets</p>
        </button>
        <button
          onClick={() => { setStatusFilter('open'); setShowMyAssigned(false); }}
          className={`bg-white rounded-xl p-4 text-left shadow-sm border transition-colors ${
            statusFilter === 'open' ? 'border-blue-400 ring-1 ring-blue-200' : 'border-gray-100'
          }`}
        >
          <p className="text-2xl font-bold text-blue-600">{openCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Open</p>
        </button>
        <button
          onClick={() => { setStatusFilter('in_progress'); setShowMyAssigned(false); }}
          className={`bg-white rounded-xl p-4 text-left shadow-sm border transition-colors ${
            statusFilter === 'in_progress' ? 'border-yellow-400 ring-1 ring-yellow-200' : 'border-gray-100'
          }`}
        >
          <p className="text-2xl font-bold text-yellow-600">{inProgressCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">In Progress</p>
        </button>
        <button
          onClick={() => { setShowMyAssigned(true); setStatusFilter('all'); }}
          className={`bg-white rounded-xl p-4 text-left shadow-sm border transition-colors ${
            showMyAssigned ? 'border-purple-400 ring-1 ring-purple-200' : 'border-gray-100'
          }`}
        >
          <p className="text-2xl font-bold text-purple-600">{myAssignedCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">My Assigned</p>
        </button>
      </div>

      {/* ── Search + Filters ─────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by subject, user, or ticket ID..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-sb-primary focus:border-transparent outline-none"
          />
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap gap-2">
          {/* Status tabs */}
          <div className="flex gap-1 overflow-x-auto">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => { setStatusFilter(tab.value); setShowMyAssigned(false); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  statusFilter === tab.value && !showMyAssigned
                    ? 'bg-sb-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Role filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as SupportUserRole | 'all')}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-sb-primary outline-none"
          >
            {ROLE_FILTERS.map((rf) => (
              <option key={rf.value} value={rf.value}>
                {rf.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Ticket List ──────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {filteredTickets.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Inbox className="w-7 h-7 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-700">No tickets found</p>
            <p className="text-xs text-gray-400 mt-1">
              {searchQuery ? 'Try adjusting your search or filters' : 'No support tickets yet'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filteredTickets.map((ticket) => {
              const hasUnread = (ticket.unreadByAdmin || 0) > 0;
              const createdDate = ticket.lastMessageAt?.toDate?.() ?? ticket.createdAt?.toDate?.() ?? new Date();

              return (
                <button
                  key={ticket.id}
                  onClick={() => router.push(`/admin/support/${ticket.id}`)}
                  className="w-full flex items-start gap-3 px-4 py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  {/* Unread indicator */}
                  <div className="pt-1.5 w-3 flex-shrink-0">
                    {hasUnread && (
                      <span className="block w-2.5 h-2.5 rounded-full bg-sb-primary" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Top row: subject + time */}
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <h4 className={`text-sm truncate ${hasUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                        {ticket.subject}
                      </h4>
                      <span className="text-[10px] text-gray-400 flex-shrink-0 whitespace-nowrap">
                        {timeAgo(createdDate)}
                      </span>
                    </div>

                    {/* User info */}
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-xs text-gray-500 truncate">{ticket.userName}</span>
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-gray-100 text-[10px] font-medium text-gray-500">
                        {ROLE_ICONS[ticket.userRole]}
                        {ticket.userRole}
                      </span>
                      {hasUnread && (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-sb-primary text-white text-[10px] font-bold">
                          {ticket.unreadByAdmin}
                        </span>
                      )}
                    </div>

                    {/* Preview */}
                    <p className="text-xs text-gray-400 truncate mb-1.5">
                      {ticket.lastMessage || 'No messages'}
                    </p>

                    {/* Badges */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${TICKET_STATUS_COLORS[ticket.status]}`}>
                        {STATUS_ICONS[ticket.status]}
                        {TICKET_STATUS_LABELS[ticket.status]?.en}
                      </span>
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${TICKET_PRIORITY_COLORS[ticket.priority]}`}>
                        {TICKET_PRIORITY_LABELS[ticket.priority]?.en}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {TICKET_CATEGORY_LABELS[ticket.category]?.en}
                      </span>
                      {ticket.assignedAdmin && (
                        <span className="text-[10px] text-purple-500 font-medium">
                          {ticket.assignedAdmin === adminUid ? '• Assigned to me' : '• Assigned'}
                        </span>
                      )}
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-gray-300 mt-1.5 flex-shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}