// src/app/support/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, getIdTokenResult } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import {
  ArrowLeft,
  LifeBuoy,
  Mail,
  Phone,
  Clock,
  HelpCircle,
  CheckCircle,
  MessageSquare,
  Plus,
  LogIn,
  Loader2,
} from 'lucide-react';
import SupportTicketList from '@/components/support/SupportTicketList';
import NewTicketForm from '@/components/support/NewTicketForm';
import SupportChat from '@/components/support/SupportChat';
import type { SupportUserRole } from '@/lib/types/support';

type View = 'list' | 'new' | 'chat';

export default function SupportPage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState<SupportUserRole>('customer');
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Ticket views
  const [view, setView] = useState<View>('list');
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);

  // Language — detect from localStorage or default 'en'
  const [lang, setLang] = useState<'en' | 'es'>('en');

  useEffect(() => {
    // Try to read language preference
    try {
      const stored = localStorage.getItem('stackbot_language') || localStorage.getItem('language');
      if (stored === 'es') setLang('es');
    } catch {}

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setUserId(null);
        setAuthChecked(true);
        return;
      }

      setUserId(user.uid);
      setUserName(user.displayName || user.email || 'User');
      setUserPhoto(user.photoURL);

      // Determine role from claims
      try {
        const token = await getIdTokenResult(user);
        const role = (token.claims.role as string) || 'customer';
        if (role === 'vendor' || role === 'driver' || role === 'customer') {
          setUserRole(role as SupportUserRole);
        }
      } catch {
        setUserRole('customer');
      }

      // Fetch richer display name from Firestore
      try {
        // Try customers first, then vendors, then drivers
        const customerSnap = await getDoc(doc(db, 'customers', user.uid));
        if (customerSnap.exists()) {
          const data = customerSnap.data();
          if (data.displayName) setUserName(data.displayName);
          else if (data.firstName && data.lastName) setUserName(`${data.firstName} ${data.lastName}`);
          if (data.photoURL) setUserPhoto(data.photoURL);
        } else {
          const vendorSnap = await getDoc(doc(db, 'vendors', user.uid));
          if (vendorSnap.exists()) {
            const data = vendorSnap.data();
            if (data.name) setUserName(data.name);
            if (data.logoUrl) setUserPhoto(data.logoUrl);
          } else {
            const driverSnap = await getDoc(doc(db, 'drivers', user.uid));
            if (driverSnap.exists()) {
              const data = driverSnap.data();
              if (data.name || data.fullName) setUserName(data.fullName || data.name);
              if (data.photoURL) setUserPhoto(data.photoURL);
            }
          }
        }
      } catch {
        // Fall back to auth data — already set above
      }

      setAuthChecked(true);
    });

    return () => unsub();
  }, []);

  const isLoggedIn = !!userId;

  return (
    <main className="min-h-screen bg-gray-50">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="bg-[#1a1a2e] text-white py-12 sm:py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            {lang === 'en' ? 'Back to Home' : 'Volver al Inicio'}
          </Link>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-[#55529d]/20 flex items-center justify-center">
              <LifeBuoy className="w-6 h-6 text-[#7c78c9]" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold">
              {lang === 'en' ? 'Support' : 'Soporte'}
            </h1>
          </div>

          <p className="text-gray-400">
            {lang === 'en'
              ? "We're here to help you with any questions or issues."
              : 'Estamos aquí para ayudarte con cualquier pregunta o problema.'}
          </p>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12 space-y-6">

        {/* ══════════════════════════════════════════════════════
            IN-APP SUPPORT — Logged-in users
        ══════════════════════════════════════════════════════ */}
        {!authChecked ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#55529d]" />
          </div>
        ) : isLoggedIn ? (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {/* ── Ticket List ────────────────────────────── */}
            {view === 'list' && (
              <>
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-[#55529d]" />
                    <h2 className="text-lg font-semibold text-gray-900">
                      {lang === 'en' ? 'My Support Tickets' : 'Mis Tickets de Soporte'}
                    </h2>
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
                  userId={userId!}
                  language={lang}
                  onSelectTicket={(id) => {
                    setActiveTicketId(id);
                    setView('chat');
                  }}
                  onNewTicket={() => setView('new')}
                />
              </>
            )}

            {/* ── New Ticket Form ────────────────────────── */}
            {view === 'new' && (
              <div className="min-h-[50vh]">
                <NewTicketForm
                  userId={userId!}
                  userName={userName}
                  userRole={userRole}
                  userPhotoURL={userPhoto}
                  language={lang}
                  onBack={() => setView('list')}
                  onCreated={(ticketId) => {
                    setActiveTicketId(ticketId);
                    setView('chat');
                  }}
                />
              </div>
            )}

            {/* ── Chat View ──────────────────────────────── */}
            {view === 'chat' && activeTicketId && (
              <div style={{ height: 'min(70vh, 600px)' }}>
                <SupportChat
                  ticketId={activeTicketId}
                  userId={userId!}
                  userName={userName}
                  userRole={userRole}
                  language={lang}
                  onBack={() => {
                    setActiveTicketId(null);
                    setView('list');
                  }}
                />
              </div>
            )}
          </div>
        ) : (
          /* ═══════════════════════════════════════════════════
             NOT LOGGED IN — CTA to sign in
          ═══════════════════════════════════════════════════ */
          <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#55529d]/10 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-6 h-6 text-[#55529d]" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900 mb-1">
                  {lang === 'en' ? 'In-App Support Chat' : 'Chat de Soporte en la App'}
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  {lang === 'en'
                    ? 'Sign in to open a support ticket and chat with our team in real-time. Track your tickets and get push notifications when we reply.'
                    : 'Inicia sesión para abrir un ticket de soporte y chatear con nuestro equipo en tiempo real. Sigue tus tickets y recibe notificaciones cuando respondamos.'}
                </p>
                <Link
                  href="/login?redirect=/support"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#55529d] text-white rounded-xl font-medium hover:bg-[#444287] transition-colors text-sm"
                >
                  <LogIn className="w-4 h-4" />
                  {lang === 'en' ? 'Sign In to Chat' : 'Iniciar Sesión para Chatear'}
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            STATIC CONTENT — Always visible
        ══════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8 space-y-10">
          {/* How We Can Help */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <HelpCircle className="w-5 h-5 text-[#55529d]" />
              <h2 className="text-xl font-semibold text-gray-900">
                {lang === 'en' ? 'How We Can Help' : 'Cómo Podemos Ayudarte'}
              </h2>
            </div>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                {lang === 'en' ? 'Account access and login issues' : 'Problemas de acceso y inicio de sesión'}
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                {lang === 'en' ? 'Orders, payments, and billing questions' : 'Preguntas sobre pedidos, pagos y facturación'}
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                {lang === 'en' ? 'Vendor and marketplace support' : 'Soporte de vendedores y marketplace'}
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                {lang === 'en' ? 'Technical issues or app bugs' : 'Problemas técnicos o errores de la app'}
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                {lang === 'en' ? 'Delivery and driver questions' : 'Preguntas sobre entregas y conductores'}
              </li>
            </ul>
          </section>

          {/* Support Hours */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-[#55529d]" />
              <h2 className="text-xl font-semibold text-gray-900">
                {lang === 'en' ? 'Support Hours' : 'Horario de Soporte'}
              </h2>
            </div>
            <p className="text-gray-600">
              {lang === 'en' ? 'Our support team is available:' : 'Nuestro equipo de soporte está disponible:'}
            </p>
            <p className="text-gray-700 font-medium mt-2">
              {lang === 'en'
                ? 'Monday – Friday, 9:00 AM – 6:00 PM (AST)'
                : 'Lunes – Viernes, 9:00 AM – 6:00 PM (AST)'}
            </p>
          </section>

          {/* Contact Methods */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {lang === 'en' ? 'Contact Support' : 'Contactar Soporte'}
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Email */}
              <a
                href="mailto:support@stackbotglobal.com"
                className="flex items-center gap-3 border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition"
              >
                <div className="w-10 h-10 rounded-lg bg-[#55529d]/10 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-[#55529d]" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {lang === 'en' ? 'Email Support' : 'Soporte por Email'}
                  </p>
                  <p className="text-sm text-gray-600">
                    support@stackbotglobal.com
                  </p>
                </div>
              </a>

              {/* Phone */}
              <a
                href="tel:+18493917763"
                className="flex items-center gap-3 border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition"
              >
                <div className="w-10 h-10 rounded-lg bg-[#55529d]/10 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-[#55529d]" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {lang === 'en' ? 'Phone Support' : 'Soporte Telefónico'}
                  </p>
                  <p className="text-sm text-gray-600">
                    +1 (849) 391-7763
                  </p>
                </div>
              </a>
            </div>
          </section>

          {/* App Review / Legal Note */}
          <section className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm text-gray-600 leading-relaxed">
              {lang === 'en'
                ? 'If you are contacting us regarding an App Store review or account access issue, please include your email address and a brief description of the problem so we can assist you promptly.'
                : 'Si nos contactas por una reseña de la App Store o un problema de acceso a tu cuenta, incluye tu dirección de correo electrónico y una breve descripción del problema para que podamos ayudarte rápidamente.'}
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}