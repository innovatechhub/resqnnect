import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle, Info, X, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

// Module-level store for toasts
let toasts: Toast[] = [];
let listeners: Set<(toasts: Toast[]) => void> = new Set();
let toastIdCounter = 0;

function notifyListeners() {
  listeners.forEach((listener) => listener([...toasts]));
}

function addToast(toast: Toast) {
  if (toasts.length >= 5) {
    toasts.shift();
  }
  toasts.push(toast);
  notifyListeners();

  const duration = toast.type === 'error' ? 6000 : 4000;
  setTimeout(() => {
    removeToast(toast.id);
  }, duration);
}

function removeToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  notifyListeners();
}

export function useToast() {
  return {
    success: (title: string, description?: string) => {
      addToast({ id: `toast-${toastIdCounter++}`, type: 'success', title, description });
    },
    error: (title: string, description?: string) => {
      addToast({ id: `toast-${toastIdCounter++}`, type: 'error', title, description });
    },
    warning: (title: string, description?: string) => {
      addToast({ id: `toast-${toastIdCounter++}`, type: 'warning', title, description });
    },
    info: (title: string, description?: string) => {
      addToast({ id: `toast-${toastIdCounter++}`, type: 'info', title, description });
    },
  };
}

interface ToastItemProps {
  toast: Toast;
  onClose: (id: string) => void;
}

function ToastItem({ toast, onClose }: ToastItemProps) {
  const Icon = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  }[toast.type];

  const bgColor = {
    success: 'bg-emerald-50 border-emerald-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-amber-50 border-amber-200',
    info: 'bg-blue-50 border-blue-200',
  }[toast.type];

  const textColor = {
    success: 'text-emerald-900',
    error: 'text-red-900',
    warning: 'text-amber-900',
    info: 'text-blue-900',
  }[toast.type];

  const iconColor = {
    success: 'text-emerald-600',
    error: 'text-red-600',
    warning: 'text-amber-600',
    info: 'text-blue-600',
  }[toast.type];

  return (
    <div
      className={cn('animate-slide-in rounded-lg border px-4 py-3 shadow-lg', bgColor)}
      role="alert"
      aria-live="polite"
    >
      <div className="flex gap-3">
        <Icon className={cn('h-5 w-5 shrink-0 mt-0.5', iconColor)} />
        <div className="flex-1">
          <p className={cn('text-sm font-medium', textColor)}>{toast.title}</p>
          {toast.description && (
            <p className={cn('text-sm mt-1 opacity-90', textColor)}>{toast.description}</p>
          )}
        </div>
        <button
          onClick={() => onClose(toast.id)}
          className={cn('shrink-0 p-1 hover:opacity-70 transition-opacity', textColor)}
          aria-label="Close notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function ToastContainer() {
  const [displayedToasts, setDisplayedToasts] = useState<Toast[]>([]);

  useEffect(() => {
    listeners.add(setDisplayedToasts);
    setDisplayedToasts([...toasts]);
    return () => {
      listeners.delete(setDisplayedToasts);
    };
  }, []);

  const handleClose = useCallback((id: string) => {
    removeToast(id);
  }, []);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm pointer-events-none">
      {displayedToasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onClose={handleClose} />
        </div>
      ))}
    </div>,
    document.body
  );
}
