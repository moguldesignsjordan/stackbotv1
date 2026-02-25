// src/components/support/NewTicketForm.tsx
'use client';

import { useState } from 'react';
import {
  collection,
  addDoc,
  doc,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  ArrowLeft,
  Send,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import type {
  SupportTicketCategory,
  SupportUserRole,
  CreateSupportTicketData,
  CreateSupportMessageData,
} from '@/lib/types/support';
import { TICKET_CATEGORY_LABELS, SUPPORT_COLLECTION, SUPPORT_MESSAGES_SUBCOLLECTION } from '@/lib/types/support';

interface NewTicketFormProps {
  userId: string;
  userName: string;
  userRole: SupportUserRole;
  userPhotoURL: string | null;
  language: 'en' | 'es';
  onBack: () => void;
  onCreated: (ticketId: string) => void;
}

export default function NewTicketForm({
  userId,
  userName,
  userRole,
  userPhotoURL,
  language,
  onBack,
  onCreated,
}: NewTicketFormProps) {
  const lang = language === 'es' ? 'es' : 'en';

  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<SupportTicketCategory>('general');
  const [message, setMessage] = useState('');
  const [relatedOrderId, setRelatedOrderId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const categories = Object.entries(TICKET_CATEGORY_LABELS) as [SupportTicketCategory, { en: string; es: string }][];

  const handleSubmit = async () => {
    // Validation
    const trimSubject = subject.trim();
    const trimMessage = message.trim();

    if (!trimSubject) {
      setError(lang === 'en' ? 'Subject is required' : 'El asunto es obligatorio');
      return;
    }
    if (trimSubject.length < 3) {
      setError(lang === 'en' ? 'Subject must be at least 3 characters' : 'El asunto debe tener al menos 3 caracteres');
      return;
    }
    if (!trimMessage) {
      setError(lang === 'en' ? 'Please describe your issue' : 'Por favor describe tu problema');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const now = Timestamp.now();

      // 1. Create the ticket document
      const ticketData: CreateSupportTicketData = {
        userId,
        userName,
        userRole,
        userPhotoURL,
        subject: trimSubject,
        category,
        status: 'open',
        priority: 'normal',
        relatedOrderId: relatedOrderId.trim() || null,
        assignedAdmin: null,
        lastMessage: trimMessage.substring(0, 100),
        lastMessageAt: now,
        unreadByAdmin: 1,
        unreadByUser: 0,
        createdAt: now,
        updatedAt: now,
      };

      const ticketRef = await addDoc(collection(db, SUPPORT_COLLECTION), ticketData);

      // 2. Add the first message to the subcollection
      const messageData: CreateSupportMessageData = {
        senderId: userId,
        senderName: userName,
        senderRole: userRole,
        text: trimMessage,
        imageURL: null,
        type: 'text',
        readByAdmin: false,
        readByUser: true,
        createdAt: now,
      };

      await addDoc(
        collection(db, SUPPORT_COLLECTION, ticketRef.id, SUPPORT_MESSAGES_SUBCOLLECTION),
        messageData
      );

      // Navigate to the new chat
      onCreated(ticketRef.id);
    } catch (err) {
      console.error('Error creating support ticket:', err);
      setError(
        lang === 'en'
          ? 'Failed to create ticket. Please try again.'
          : 'Error al crear el ticket. Inténtalo de nuevo.'
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white">
        <button
          onClick={onBack}
          className="p-1.5 -ml-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h2 className="text-lg font-semibold text-gray-900">
          {lang === 'en' ? 'New Support Ticket' : 'Nuevo Ticket de Soporte'}
        </h2>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Subject */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {lang === 'en' ? 'Subject' : 'Asunto'} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={lang === 'en' ? 'Brief description of your issue' : 'Descripción breve de tu problema'}
            maxLength={200}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#55529d] focus:border-transparent outline-none transition-all"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {lang === 'en' ? 'Category' : 'Categoría'}
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as SupportTicketCategory)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#55529d] focus:border-transparent outline-none transition-all bg-white"
          >
            {categories.map(([value, label]) => (
              <option key={value} value={value}>
                {label[lang]}
              </option>
            ))}
          </select>
        </div>

        {/* Related Order (optional) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {lang === 'en' ? 'Related Order ID (optional)' : 'ID de Pedido Relacionado (opcional)'}
          </label>
          <input
            type="text"
            value={relatedOrderId}
            onChange={(e) => setRelatedOrderId(e.target.value)}
            placeholder={lang === 'en' ? 'e.g. ABC123...' : 'ej. ABC123...'}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#55529d] focus:border-transparent outline-none transition-all"
          />
        </div>

        {/* Message */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {lang === 'en' ? 'Describe your issue' : 'Describe tu problema'} <span className="text-red-500">*</span>
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={
              lang === 'en'
                ? 'Tell us what happened and how we can help...'
                : 'Cuéntanos qué pasó y cómo podemos ayudarte...'
            }
            rows={5}
            maxLength={2000}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#55529d] focus:border-transparent outline-none transition-all resize-none"
          />
          <p className="text-xs text-gray-400 mt-1 text-right">
            {message.length}/2000
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="px-4 py-3 border-t border-gray-200 bg-white safe-bottom">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 py-3 bg-[#55529d] text-white rounded-xl font-semibold hover:bg-[#444287] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Send className="w-4 h-4" />
              {lang === 'en' ? 'Submit Ticket' : 'Enviar Ticket'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}