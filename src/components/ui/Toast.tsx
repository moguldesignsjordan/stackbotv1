"use client";

import {
  createContext,
  useContext,
  useCallback,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { parseError, StackBotError } from "@/lib/utils/errors";

// ============================================================================
// TYPES
// ============================================================================

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  // Convenience methods
  success: (message: string, title?: string) => string;
  error: (error: unknown, title?: string) => string;
  warning: (message: string, title?: string) => string;
  info: (message: string, title?: string) => string;
}

// ============================================================================
// CONTEXT
// ============================================================================

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

// ============================================================================
// PROVIDER
// ============================================================================

interface ToastProviderProps {
  children: ReactNode;
  maxToasts?: number;
  defaultDuration?: number;
}

export function ToastProvider({
  children,
  maxToasts = 5,
  defaultDuration = 5000,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const newToast: Toast = {
        ...toast,
        id,
        duration: toast.duration ?? defaultDuration,
      };

      setToasts((prev) => {
        // Remove oldest if at max
        const updated = prev.length >= maxToasts ? prev.slice(1) : prev;
        return [...updated, newToast];
      });

      // Auto-remove after duration
      if (newToast.duration && newToast.duration > 0) {
        setTimeout(() => removeToast(id), newToast.duration);
      }

      return id;
    },
    [defaultDuration, maxToasts, removeToast]
  );

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods
  const success = useCallback(
    (message: string, title?: string) =>
      addToast({ type: "success", message, title }),
    [addToast]
  );

  const error = useCallback(
    (err: unknown, title?: string) => {
      const parsed = parseError(err);
      return addToast({
        type: "error",
        message: parsed.userMessage,
        title: title ?? "Error",
        duration: 7000, // Errors show longer
      });
    },
    [addToast]
  );

  const warning = useCallback(
    (message: string, title?: string) =>
      addToast({ type: "warning", message, title }),
    [addToast]
  );

  const info = useCallback(
    (message: string, title?: string) =>
      addToast({ type: "info", message, title }),
    [addToast]
  );

  return (
    <ToastContext.Provider
      value={{
        toasts,
        addToast,
        removeToast,
        clearToasts,
        success,
        error,
        warning,
        info,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

// ============================================================================
// TOAST CONTAINER
// ============================================================================

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Notifications"
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

// ============================================================================
// TOAST ITEM
// ============================================================================

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleRemove = () => {
    setIsLeaving(true);
    setTimeout(() => onRemove(toast.id), 200);
  };

  const config = {
    success: {
      icon: CheckCircle,
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      iconColor: "text-green-500",
      titleColor: "text-green-800",
      messageColor: "text-green-700",
    },
    error: {
      icon: AlertCircle,
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      iconColor: "text-red-500",
      titleColor: "text-red-800",
      messageColor: "text-red-700",
    },
    warning: {
      icon: AlertTriangle,
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200",
      iconColor: "text-yellow-500",
      titleColor: "text-yellow-800",
      messageColor: "text-yellow-700",
    },
    info: {
      icon: Info,
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      iconColor: "text-blue-500",
      titleColor: "text-blue-800",
      messageColor: "text-blue-700",
    },
  };

  const { icon: Icon, bgColor, borderColor, iconColor, titleColor, messageColor } =
    config[toast.type];

  return (
    <div
      role="alert"
      className={`
        pointer-events-auto
        ${bgColor} ${borderColor}
        border rounded-xl shadow-lg
        p-4
        transform transition-all duration-200 ease-out
        ${isVisible && !isLeaving ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}
      `}
    >
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 ${iconColor} flex-shrink-0 mt-0.5`} />

        <div className="flex-1 min-w-0">
          {toast.title && (
            <p className={`text-sm font-semibold ${titleColor}`}>{toast.title}</p>
          )}
          <p className={`text-sm ${messageColor} ${toast.title ? "mt-0.5" : ""}`}>
            {toast.message}
          </p>

          {toast.action && (
            <button
              onClick={toast.action.onClick}
              className={`mt-2 text-sm font-medium ${iconColor} hover:underline`}
            >
              {toast.action.label}
            </button>
          )}
        </div>

        <button
          onClick={handleRemove}
          className="flex-shrink-0 p-1 rounded-lg hover:bg-black/5 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// STANDALONE HOOK (without provider)
// ============================================================================

/**
 * Simple toast state for components that can't use provider
 */
export function useToastState() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = `toast-${Date.now()}`;
    setToasts((prev) => [...prev.slice(-4), { ...toast, id }]);

    if (toast.duration !== 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, toast.duration ?? 5000);
    }

    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}