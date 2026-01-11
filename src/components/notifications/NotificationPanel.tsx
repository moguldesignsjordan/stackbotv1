// src/components/notifications/NotificationPanel.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Bell,
  CheckCheck,
  ChevronRight,
  Loader2,
  X,
} from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';
import { NotificationItem } from './NotificationItem';
import type { Notification } from '@/lib/types/notifications';

interface NotificationPanelProps {
  /** Maximum notifications to show */
  maxItems?: number;
  /** Show as compact card vs full panel */
  variant?: 'card' | 'panel';
  /** Title override */
  title?: string;
  /** Filter by notification types */
  filterTypes?: string[];
  /** Link to full notifications page */
  viewAllLink?: string;
}

export function NotificationPanel({
  maxItems = 5,
  variant = 'card',
  title = 'Recent Notifications',
  filterTypes,
  viewAllLink = '/notifications',
}: NotificationPanelProps) {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const [isMarkingAll, setIsMarkingAll] = useState(false);

  // Filter notifications if filterTypes provided
  const filteredNotifications = filterTypes
    ? notifications.filter((n) => filterTypes.some((t) => n.type.startsWith(t)))
    : notifications;

  const displayedNotifications = filteredNotifications.slice(0, maxItems);
  const filteredUnread = filteredNotifications.filter((n) => !n.read).length;

  const handleMarkAllRead = async () => {
    setIsMarkingAll(true);
    try {
      await markAllAsRead();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      try {
        await markAsRead(notification.id);
      } catch (err) {
        console.error('Failed to mark as read:', err);
      }
    }

    if (notification.data?.url) {
      router.push(notification.data.url);
    } else if (notification.data?.orderId) {
      router.push(`/account`);
    }
  };

  const handleDelete = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    try {
      await deleteNotification(notificationId);
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  if (variant === 'card') {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#55529d]" />
            <h2 className="font-semibold text-gray-900">{title}</h2>
            {filteredUnread > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-600 rounded-full">
                {filteredUnread}
              </span>
            )}
          </div>
          {filteredUnread > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={isMarkingAll}
              className="text-xs text-[#55529d] hover:text-[#444287] font-medium disabled:opacity-50 flex items-center gap-1"
            >
              {isMarkingAll ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <CheckCheck className="w-3 h-3" />
              )}
              Mark all read
            </button>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-[#55529d]" />
          </div>
        ) : displayedNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
              <Bell className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">No notifications</p>
            <p className="text-gray-400 text-sm mt-1">You&apos;re all caught up!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {displayedNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onClick={() => handleNotificationClick(notification)}
                onDelete={(e) => handleDelete(e, notification.id)}
              />
            ))}
          </div>
        )}

        {/* Footer */}
        {filteredNotifications.length > maxItems && (
          <Link
            href={viewAllLink}
            className="flex items-center justify-center gap-1 px-4 py-3 bg-gray-50 text-[#55529d] hover:text-[#444287] text-sm font-medium border-t border-gray-100 transition-colors"
          >
            View all notifications
            <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>
    );
  }

  // Panel variant (sidebar style)
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <Bell className="w-5 h-5 text-[#55529d]" />
          {title}
          {filteredUnread > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-600 rounded-full">
              {filteredUnread}
            </span>
          )}
        </h2>
        {filteredUnread > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={isMarkingAll}
            className="text-xs text-[#55529d] hover:text-[#444287] font-medium disabled:opacity-50"
          >
            Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-[#55529d]" />
        </div>
      ) : displayedNotifications.length === 0 ? (
        <div className="bg-gray-50 rounded-xl py-8 text-center">
          <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">No notifications</p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayedNotifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`p-3 rounded-xl cursor-pointer transition-colors ${
                notification.read ? 'bg-white' : 'bg-blue-50'
              } hover:bg-gray-50 border border-gray-100`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium truncate ${
                    notification.read ? 'text-gray-700' : 'text-gray-900'
                  }`}>
                    {notification.title}
                  </p>
                  <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                    {notification.message}
                  </p>
                </div>
                {!notification.read && (
                  <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-1.5" />
                )}
              </div>
            </div>
          ))}

          {filteredNotifications.length > maxItems && (
            <Link
              href={viewAllLink}
              className="block text-center py-2 text-[#55529d] hover:text-[#444287] text-sm font-medium"
            >
              View all →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Compact notification badge for headers/nav
 */
export function NotificationBadge() {
  const { unreadCount } = useNotifications();

  if (unreadCount === 0) return null;

  return (
    <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
      {unreadCount > 99 ? '99+' : unreadCount}
    </span>
  );
}