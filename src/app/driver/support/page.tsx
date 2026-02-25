// src/app/driver/support/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import { Loader2, Plus, HelpCircle } from 'lucide-react';
import SupportTicketList from '@/components/support/SupportTicketList';
import NewTicketForm from '@/components/support/NewTicketForm';
import SupportChat from '@/components/support/SupportChat';

type View = 'list' | 'new' | 'chat';

export default function DriverSupportPage() {
  const router = useRouter();

  // Driver layout uses inline language state; default to 'es' for DR market
  const [lang, setLang] = useState<'en' | 'es'>('es');
  const [view, setView] = useState<View>('list');
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [driverName, setDriverName] = useState('');
  const [driverPhoto, setDriverPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Detect language from localStorage (driver layout pattern)
    const stored = localStorage.getItem('stackbot_driver_lang');
    if (stored === 'en' || stored === 'es') setLang(stored);

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/driver/login');
        return;
      }

      setUserId(user.uid);
      setDriverName(user.displayName || user.email || 'Driver');
      setDriverPhoto(user.photoURL);

      // Fetch driver profile for name + photo
      try {
        const driverSnap = await getDoc(doc(db, 'drivers', user.uid));
        if (driverSnap.exists()) {
          const data = driverSnap.data();
          if (data.name) setDriverName(data.name);
          if (data.fullName) setDriverName(data.fullName);
          if (data.photoURL) setDriverPhoto(data.photoURL);
        }
      } catch {
        // Fall back to auth data
      }

      setLoading(false);
    });

    return () => unsub();
  }, [router]);

  if (loading || !userId) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-7 h-7 animate-spin text-[#55529d]" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      {/* ── List View ──────────────────────────────────── */}
      {view === 'list' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
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

          <SupportTicketList
            userId={userId}
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
            userId={userId}
            userName={driverName}
            userRole="driver"
            userPhotoURL={driverPhoto}
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
        <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ height: 'calc(100vh - 220px)', minHeight: '400px' }}>
          <SupportChat
            ticketId={activeTicketId}
            userId={userId}
            userName={driverName}
            userRole="driver"
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