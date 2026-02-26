// src/app/account/support/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  Loader2,
  Plus,
  HelpCircle,
  Phone,
  MessageCircle,
  Ticket,
  ArrowLeft,
  Clock,
  ExternalLink,
} from 'lucide-react';
import SupportTicketList from '@/components/support/SupportTicketList';
import NewTicketForm from '@/components/support/NewTicketForm';
import SupportChat from '@/components/support/SupportChat';

type View = 'hub' | 'list' | 'new' | 'chat';

const SUPPORT_PHONE = '+18493917763';
const SUPPORT_PHONE_DISPLAY = '+1 (849) 391-7763';
const SUPPORT_WHATSAPP = '18493917763';

const t = {
  en: {
    supportTitle: 'Support',
    howCanWeHelp: 'How can we help you?',
    callUs: 'Call Us',
    callDesc: 'Speak directly with our support team',
    callAction: 'Call Now',
    textUs: 'WhatsApp / Text',
    textDesc: 'Chat with us on WhatsApp for quick help',
    textAction: 'Open WhatsApp',
    submitTicket: 'Submit a Ticket',
    ticketDesc: 'Create a support ticket and we\'ll respond in-app',
    ticketAction: 'View Tickets',
    newTicket: 'New Ticket',
    supportHours: 'Support Hours',
    hoursDetail: 'Mon – Fri, 9:00 AM – 6:00 PM (AST)',
    back: 'Back',
    myTickets: 'My Tickets',
    whatsappMessage: 'Hi! I need help with my StackBot account.',
  },
  es: {
    supportTitle: 'Soporte',
    howCanWeHelp: '¿Cómo podemos ayudarte?',
    callUs: 'Llámanos',
    callDesc: 'Habla directamente con nuestro equipo de soporte',
    callAction: 'Llamar Ahora',
    textUs: 'WhatsApp / Texto',
    textDesc: 'Chatea con nosotros en WhatsApp para ayuda rápida',
    textAction: 'Abrir WhatsApp',
    submitTicket: 'Enviar un Ticket',
    ticketDesc: 'Crea un ticket de soporte y te responderemos en la app',
    ticketAction: 'Ver Tickets',
    newTicket: 'Nuevo',
    supportHours: 'Horario de Soporte',
    hoursDetail: 'Lun – Vie, 9:00 AM – 6:00 PM (AST)',
    back: 'Volver',
    myTickets: 'Mis Tickets',
    whatsappMessage: '¡Hola! Necesito ayuda con mi cuenta de StackBot.',
  },
};

export default function CustomerSupportPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const lang = language === 'es' ? 'es' : 'en';
  const labels = t[lang];

  const [view, setView] = useState<View>('hub');
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

  const whatsappURL = `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(labels.whatsappMessage)}`;

  return (
    <div className="max-w-2xl mx-auto">
      {/* ── Hub View ───────────────────────────────────── */}
      {view === 'hub' && (
        <div className="space-y-4">
          {/* Header */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-[#55529d]" />
                <h1 className="text-lg font-semibold text-gray-900">
                  {labels.supportTitle}
                </h1>
              </div>
              <p className="text-sm text-gray-500 mt-1 ml-7">
                {labels.howCanWeHelp}
              </p>
            </div>

            {/* Support Options */}
            <div className="p-4 space-y-3">
              {/* Call Us */}
              <a
                href={`tel:${SUPPORT_PHONE}`}
                className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:border-[#55529d]/30 hover:bg-[#55529d]/[0.02] active:bg-[#55529d]/[0.05] transition-colors"
              >
                <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm">
                    {labels.callUs}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {labels.callDesc}
                  </p>
                  <p className="text-xs font-medium text-blue-600 mt-1">
                    {SUPPORT_PHONE_DISPLAY}
                  </p>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
              </a>

              {/* WhatsApp / Text */}
              <a
                href={whatsappURL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:border-green-200 hover:bg-green-50/30 active:bg-green-50/50 transition-colors"
              >
                <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm">
                    {labels.textUs}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {labels.textDesc}
                  </p>
                  <p className="text-xs font-medium text-green-600 mt-1">
                    WhatsApp
                  </p>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
              </a>

              {/* Submit a Ticket */}
              <button
                onClick={() => setView('list')}
                className="w-full flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:border-[#55529d]/30 hover:bg-[#55529d]/[0.02] active:bg-[#55529d]/[0.05] transition-colors text-left"
              >
                <div className="w-11 h-11 rounded-xl bg-[#55529d]/10 flex items-center justify-center flex-shrink-0">
                  <Ticket className="w-5 h-5 text-[#55529d]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm">
                    {labels.submitTicket}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {labels.ticketDesc}
                  </p>
                </div>
                <ArrowLeft className="w-4 h-4 text-gray-400 flex-shrink-0 rotate-180" />
              </button>
            </div>
          </div>

          {/* Support Hours */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-2 text-gray-500">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <div className="text-xs">
                <span className="font-medium text-gray-700">{labels.supportHours}: </span>
                {labels.hoursDetail}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Ticket List View ───────────────────────────── */}
      {view === 'list' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setView('hub')}
                className="p-1.5 -ml-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <h1 className="text-lg font-semibold text-gray-900">
                {labels.myTickets}
              </h1>
            </div>
            <button
              onClick={() => setView('new')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#55529d] text-white text-sm rounded-xl font-medium hover:bg-[#444287] transition-colors"
            >
              <Plus className="w-4 h-4" />
              {labels.newTicket}
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