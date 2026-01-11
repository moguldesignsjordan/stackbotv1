// src/contexts/NotificationContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, db } from '@/lib/firebase/config';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import type { Notification } from '@/lib/types/notifications';

// ============================================================================
// TYPES
// ============================================================================

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

// ============================================================================
// CONTEXT
// ============================================================================

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}

// ============================================================================
// PROVIDER
// ============================================================================

interface NotificationProviderProps {
  children: ReactNode;
  maxNotifications?: number;
}

export function NotificationProvider({
  children,
  maxNotifications = 50,
}: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Listen to auth state
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUserId(user?.uid || null);
      if (!user) {
        setNotifications([]);
        setUnreadCount(0);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Listen to notifications
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(maxNotifications)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const notifs = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            userId: data.userId,
            type: data.type,
            title: data.title,
            message: data.message,
            read: data.read || false,
            priority: data.priority || 'normal',
            data: data.data || {},
            createdAt: data.createdAt?.toDate() || new Date(),
            readAt: data.readAt?.toDate(),
            expiresAt: data.expiresAt?.toDate(),
          } as Notification;
        });

        setNotifications(notifs);
        setUnreadCount(notifs.filter((n) => !n.read).length);
        setLoading(false);
      },
      (error) => {
        console.error('[Notifications] Error fetching notifications:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, maxNotifications]);

  // Mark single notification as read
  const markAsRead = async (notificationId: string) => {
    if (!userId) return;

    try {
      const notifRef = doc(db, 'notifications', notificationId);
      await updateDoc(notifRef, {
        read: true,
        readAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('[Notifications] Error marking as read:', error);
      throw error;
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!userId) return;

    const unreadNotifications = notifications.filter((n) => !n.read);
    if (unreadNotifications.length === 0) return;

    try {
      const batch = writeBatch(db);
      const readAt = Timestamp.now();

      unreadNotifications.forEach((notif) => {
        const notifRef = doc(db, 'notifications', notif.id);
        batch.update(notifRef, { read: true, readAt });
      });

      await batch.commit();
    } catch (error) {
      console.error('[Notifications] Error marking all as read:', error);
      throw error;
    }
  };

  // Delete single notification
  const deleteNotification = async (notificationId: string) => {
    if (!userId) return;

    try {
      await deleteDoc(doc(db, 'notifications', notificationId));
    } catch (error) {
      console.error('[Notifications] Error deleting notification:', error);
      throw error;
    }
  };

  // Clear all notifications
  const clearAll = async () => {
    if (!userId || notifications.length === 0) return;

    try {
      const batch = writeBatch(db);

      notifications.forEach((notif) => {
        const notifRef = doc(db, 'notifications', notif.id);
        batch.delete(notifRef);
      });

      await batch.commit();
    } catch (error) {
      console.error('[Notifications] Error clearing all notifications:', error);
      throw error;
    }
  };

  const value: NotificationContextValue = {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}