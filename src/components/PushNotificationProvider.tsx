// src/components/PushNotificationProvider.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, X } from 'lucide-react';
import { useNativePush } from '@/hooks/useNativePush';

interface ToastNotification {
  id: string;
  title?: string;
  body?: string;
  url?: string;
}

/**
 * Push Notification Provider
 * 
 * Add this to your root layout to enable native push notifications:
 * 
 * ```tsx
 * // src/app/layout.tsx
 * import { PushNotificationProvider } from '@/components/PushNotificationProvider';
 * 
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <PushNotificationProvider>
 *           {children}
 *         </PushNotificationProvider>
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */
export function PushNotificationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { lastNotification, clearNotification, isNative } = useNativePush();
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  // Show toast when foreground notification received
  useEffect(() => {
    if (lastNotification) {
      const toast: ToastNotification = {
        id: Date.now().toString(),
        title: lastNotification.title,
        body: lastNotification.body,
        url: lastNotification.data?.url as string | undefined,
      };

      setToasts((prev) => [...prev, toast]);
      clearNotification();

      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, 5000);
    }
  }, [lastNotification, clearNotification]);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleToastClick = (toast: ToastNotification) => {
    if (toast.url) {
      router.push(toast.url);
    }
    dismissToast(toast.id);
  };

  return (
    <>
      {children}

      {/* Foreground Notification Toast Container */}
      {isNative && toasts.length > 0 && (
        <div className="fixed top-0 left-0 right-0 z-[9999] p-4 pointer-events-none">
          <div className="max-w-md mx-auto space-y-2">
            {toasts.map((toast) => (
              <div
                key={toast.id}
                onClick={() => handleToastClick(toast)}
                className="pointer-events-auto bg-white rounded-xl shadow-lg border border-gray-200 p-4 flex items-start gap-3 cursor-pointer transform transition-all duration-300 animate-slide-down"
              >
                {/* Icon */}
                <div className="flex-shrink-0 w-10 h-10 bg-[#55529d]/10 rounded-full flex items-center justify-center">
                  <Bell className="w-5 h-5 text-[#55529d]" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {toast.title && (
                    <p className="font-semibold text-gray-900 text-sm truncate">
                      {toast.title}
                    </p>
                  )}
                  {toast.body && (
                    <p className="text-gray-600 text-sm line-clamp-2 mt-0.5">
                      {toast.body}
                    </p>
                  )}
                </div>

                {/* Dismiss */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    dismissToast(toast.id);
                  }}
                  className="flex-shrink-0 p-1 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Animation styles */}
      <style jsx global>{`
        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-100%);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }
      `}</style>
    </>
  );
}