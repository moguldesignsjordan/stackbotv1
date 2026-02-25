// src/app/account/support/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Loader2, Plus, HelpCircle } from 'lucide-react';
import SupportTicketList from '@/components/support/SupportTicketList';
import NewTicketForm from '@/components/support/NewTicketForm';
import SupportChat from '@/components/support/SupportChat';

type View = 'list' | 'new' | 'chat';

export default function CustomerSupportPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const lang = language === 'es' ? 'es' : 'en';

  const [view, setView] = useState<View>('list');
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Fetch customer display name from Firestore
  useEffect(() => {
    if (!user) return;

    // Start with Auth data
    setDisplayName(user.displayName || user.email || 'Customer');
    setPhotoURL(user.photoURL);

    // Try Firestore for richer data
    getDoc(doc(db, 'customers', user.uid))
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.displayName) setDisplayName(data.displayName);
          if (data.firstName && data.lastName) setDisplayName(`${data.firstName} ${data.lastName}`);
          if (data.photoURL) setPhotoURL(data.photoURL);
        }
      })
      .catch(() => {})
      .finally(() => setProfileLoading(false));
  }, [user]);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/account/support');
    }
  }, [user, authLoading, router]);

  if (authLoading || !user || profileLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-7 h-7 animate-spin text-[#55529d]" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* ── List View ──────────────────────────────────── */}
      {view === 'list' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-[#55529d]" />
              <h1 className="text-lg font-semibold text-gray-900">
                {lang === 'en' ? 'Support' : 'Soporte'}
              </h1>
            </div>
            <button
              onClick={() => setView('new')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#55529d] text-white text-sm rounded-xl font-medium hover:bg-[#444287] transition-colors"
            >
              <Plus className="w-4 h-4" />
              {lang === 'en' ? 'New Ticket' : 'Nuevo'}
            </button>
          </div>

          {/* Ticket list */}
          <SupportTicketList
            userId={user.uid}
            language={lang}
            onSelectTicket={(id) => {
              setActiveTicketId(id);
              setView('chat');
            }}
            onNewTicket={() => setView('new')}
          />
        </div>
      )}

      {/* ── New Ticket Form ────────────────────────────── */}
      {view === 'new' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden min-h-[60vh]">
          <NewTicketForm
            userId={user.uid}
            userName={displayName}
            userRole="customer"
            userPhotoURL={photoURL}
            language={lang}
            onBack={() => setView('list')}
            onCreated={(ticketId) => {
              setActiveTicketId(ticketId);
              setView('chat');
            }}
          />
        </div>
      )}

      {/* ── Chat View ──────────────────────────────────── */}
      {view === 'chat' && activeTicketId && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ height: 'calc(100vh - 200px)', minHeight: '400px' }}>
          <SupportChat
            ticketId={activeTicketId}
            userId={user.uid}
            userName={displayName}
            userRole="customer"
            language={lang}
            onBack={() => {
              setActiveTicketId(null);
              setView('list');
            }}
          />
        </div>
      )}
    </div>
  );
}