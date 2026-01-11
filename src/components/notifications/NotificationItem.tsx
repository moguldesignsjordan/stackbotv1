// src/components/notifications/NotificationItem.tsx
'use client';

import { memo } from 'react';
import {
  ShoppingCart,
  CheckCircle,
  CheckCircle2,
  XCircle,
  Package,
  Store,
  BadgeCheck,
  Star,
  CreditCard,
  Info,
  Gift,
  ChefHat,
  PackageX,
  Trash2,
} from 'lucide-react';
import type { Notification, NotificationType } from '@/lib/types/notifications';
import { formatDistanceToNow } from '@/lib/utils/formatDate';

// ============================================================================
// ICON MAPPING
// ============================================================================

const ICON_MAP: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  order_placed: ShoppingCart,
  order_confirmed: CheckCircle,
  order_preparing: ChefHat,
  order_ready: Package,
  order_delivered: CheckCircle2,
  order_cancelled: XCircle,
  vendor_application: Store,
  vendor_approved: BadgeCheck,
  vendor_rejected: XCircle,
  product_approved: Package,
  product_rejected: PackageX,
  new_review: Star,
  payment_received: CreditCard,
  payment_failed: CreditCard,
  system: Info,
  promo: Gift,
};

const COLOR_MAP: Record<NotificationType, { icon: string; bg: string }> = {
  order_placed: { icon: 'text-blue-600', bg: 'bg-blue-100' },
  order_confirmed: { icon: 'text-green-600', bg: 'bg-green-100' },
  order_preparing: { icon: 'text-orange-600', bg: 'bg-orange-100' },
  order_ready: { icon: 'text-purple-600', bg: 'bg-purple-100' },
  order_delivered: { icon: 'text-green-600', bg: 'bg-green-100' },
  order_cancelled: { icon: 'text-red-600', bg: 'bg-red-100' },
  vendor_application: { icon: 'text-blue-600', bg: 'bg-blue-100' },
  vendor_approved: { icon: 'text-green-600', bg: 'bg-green-100' },
  vendor_rejected: { icon: 'text-red-600', bg: 'bg-red-100' },
  product_approved: { icon: 'text-green-600', bg: 'bg-green-100' },
  product_rejected: { icon: 'text-red-600', bg: 'bg-red-100' },
  new_review: { icon: 'text-yellow-600', bg: 'bg-yellow-100' },
  payment_received: { icon: 'text-green-600', bg: 'bg-green-100' },
  payment_failed: { icon: 'text-red-600', bg: 'bg-red-100' },
  system: { icon: 'text-gray-600', bg: 'bg-gray-100' },
  promo: { icon: 'text-pink-600', bg: 'bg-pink-100' },
};

// ============================================================================
// COMPONENT
// ============================================================================

interface NotificationItemProps {
  notification: Notification;
  onClick?: () => void;
  onDelete?: (e: React.MouseEvent) => void;
  showDelete?: boolean;
}

export const NotificationItem = memo(function NotificationItem({
  notification,
  onClick,
  onDelete,
  showDelete = true,
}: NotificationItemProps) {
  const Icon = ICON_MAP[notification.type] || Info;
  const colors = COLOR_MAP[notification.type] || COLOR_MAP.system;

  const timeAgo = formatDistanceToNow(notification.createdAt);

  return (
    <div
      onClick={onClick}
      className={`group relative px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer ${
        !notification.read ? 'bg-blue-50/50' : ''
      }`}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div
          className={`flex-shrink-0 w-10 h-10 rounded-full ${colors.bg} flex items-center justify-center`}
        >
          <Icon className={`w-5 h-5 ${colors.icon}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p
              className={`text-sm font-medium ${
                !notification.read ? 'text-gray-900' : 'text-gray-700'
              }`}
            >
              {notification.title}
            </p>
            {!notification.read && (
              <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-1.5" />
            )}
          </div>
          
          <p className="text-sm text-gray-600 line-clamp-2 mt-0.5">
            {notification.message}
          </p>
          
          <p className="text-xs text-gray-400 mt-1">{timeAgo}</p>
        </div>

        {/* Delete Button */}
        {showDelete && onDelete && (
          <button
            onClick={onDelete}
            className="absolute right-2 top-2 p-1.5 opacity-0 group-hover:opacity-100 hover:bg-gray-200 rounded-full transition-all"
            aria-label="Delete notification"
          >
            <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
          </button>
        )}
      </div>
    </div>
  );
});