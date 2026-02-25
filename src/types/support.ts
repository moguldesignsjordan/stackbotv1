// src/lib/types/support.ts

import { Timestamp } from "firebase/firestore";

/* ============================================================
   ENUMS / UNION TYPES
============================================================ */

export type SupportTicketStatus = "open" | "in_progress" | "resolved" | "closed";

export type SupportTicketPriority = "low" | "normal" | "high" | "urgent";

export type SupportTicketCategory =
  | "order_issue"
  | "payment"
  | "account"
  | "delivery"
  | "general";

export type SupportUserRole = "customer" | "vendor" | "driver";

export type SupportSenderRole = SupportUserRole | "admin";

export type SupportMessageType = "text" | "image" | "system";

/* ============================================================
   SUPPORT TICKET (parent document)
============================================================ */

export interface SupportTicket {
  id: string; // Firestore doc ID
  userId: string; // Firebase UID of requester
  userName: string;
  userRole: SupportUserRole;
  userPhotoURL: string | null;
  subject: string;
  category: SupportTicketCategory;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  relatedOrderId: string | null; // optional link to an order
  assignedAdmin: string | null; // admin UID if claimed
  lastMessage: string; // preview text for inbox list
  lastMessageAt: Timestamp;
  unreadByAdmin: number;
  unreadByUser: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/* ============================================================
   SUPPORT MESSAGE (subcollection document)
============================================================ */

export interface SupportMessage {
  id: string; // Firestore doc ID
  senderId: string; // UID of sender
  senderName: string;
  senderRole: SupportSenderRole;
  text: string;
  imageURL: string | null; // Firebase Storage URL for screenshots
  type: SupportMessageType;
  readByAdmin: boolean;
  readByUser: boolean;
  createdAt: Timestamp;
}

/* ============================================================
   CREATE PAYLOADS (for writing to Firestore — no `id` field)
============================================================ */

export interface CreateSupportTicketData {
  userId: string;
  userName: string;
  userRole: SupportUserRole;
  userPhotoURL: string | null;
  subject: string;
  category: SupportTicketCategory;
  status: "open"; // always starts open
  priority: "normal"; // always starts normal
  relatedOrderId: string | null;
  assignedAdmin: null; // unassigned on creation
  lastMessage: string; // first message text
  lastMessageAt: Timestamp;
  unreadByAdmin: 1; // admin hasn't seen it yet
  unreadByUser: 0; // user just created it
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreateSupportMessageData {
  senderId: string;
  senderName: string;
  senderRole: SupportSenderRole;
  text: string;
  imageURL: string | null;
  type: SupportMessageType;
  readByAdmin: boolean;
  readByUser: boolean;
  createdAt: Timestamp;
}

/* ============================================================
   UI HELPERS
============================================================ */

/** Label maps for rendering badges/dropdowns in both EN and ES */
export const TICKET_STATUS_LABELS: Record<SupportTicketStatus, { en: string; es: string }> = {
  open: { en: "Open", es: "Abierto" },
  in_progress: { en: "In Progress", es: "En Proceso" },
  resolved: { en: "Resolved", es: "Resuelto" },
  closed: { en: "Closed", es: "Cerrado" },
};

export const TICKET_PRIORITY_LABELS: Record<SupportTicketPriority, { en: string; es: string }> = {
  low: { en: "Low", es: "Baja" },
  normal: { en: "Normal", es: "Normal" },
  high: { en: "High", es: "Alta" },
  urgent: { en: "Urgent", es: "Urgente" },
};

export const TICKET_CATEGORY_LABELS: Record<SupportTicketCategory, { en: string; es: string }> = {
  order_issue: { en: "Order Issue", es: "Problema con Pedido" },
  payment: { en: "Payment", es: "Pago" },
  account: { en: "Account", es: "Cuenta" },
  delivery: { en: "Delivery", es: "Entrega" },
  general: { en: "General", es: "General" },
};

/** Tailwind color classes for status badges */
export const TICKET_STATUS_COLORS: Record<SupportTicketStatus, string> = {
  open: "bg-blue-100 text-blue-700",
  in_progress: "bg-yellow-100 text-yellow-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-500",
};

/** Tailwind color classes for priority badges */
export const TICKET_PRIORITY_COLORS: Record<SupportTicketPriority, string> = {
  low: "bg-gray-100 text-gray-600",
  normal: "bg-blue-100 text-blue-600",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

/** Firestore collection paths */
export const SUPPORT_COLLECTION = "supportTickets" as const;
export const SUPPORT_MESSAGES_SUBCOLLECTION = "messages" as const;

/** Firebase Storage path builder for support images */
export function getSupportImagePath(ticketId: string, messageId: string, ext = "jpg"): string {
  return `support/${ticketId}/${messageId}.${ext}`;
}