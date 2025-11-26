/**
 * NotificationProvider Component
 * Toast notifications display
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */

import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useNotificationStore } from '../stores';
import { clsx } from 'clsx';
import type { Notification } from '../types';

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const COLORS = {
  success: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800',
    text: 'text-green-800 dark:text-green-200',
    icon: 'text-green-500',
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-800 dark:text-red-200',
    icon: 'text-red-500',
  },
  warning: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    border: 'border-yellow-200 dark:border-yellow-800',
    text: 'text-yellow-800 dark:text-yellow-200',
    icon: 'text-yellow-500',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-800 dark:text-blue-200',
    icon: 'text-blue-500',
  },
};

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { notifications, removeNotification } = useNotificationStore();

  return (
    <>
      {children}

      {/* Toast container */}
      <div className="fixed top-4 right-4 z-50 space-y-2 w-80">
        {notifications.map((notification) => (
          <Toast
            key={notification.id}
            notification={notification}
            onClose={() => removeNotification(notification.id)}
          />
        ))}
      </div>
    </>
  );
}

interface ToastProps {
  notification: Notification;
  onClose: () => void;
}

function Toast({ notification, onClose }: ToastProps) {
  const Icon = ICONS[notification.type];
  const colors = COLORS[notification.type];

  return (
    <div
      className={clsx(
        'flex items-start gap-3 p-4 rounded-lg shadow-lg border',
        'animate-in slide-in-from-right',
        colors.bg,
        colors.border
      )}
      role="alert"
    >
      <Icon className={clsx('w-5 h-5 flex-shrink-0 mt-0.5', colors.icon)} />

      <div className="flex-1 min-w-0">
        <p className={clsx('text-sm font-medium', colors.text)}>
          {notification.message}
        </p>

        {notification.action && (
          <button
            onClick={notification.action.onClick}
            className={clsx(
              'mt-2 text-sm font-medium underline',
              colors.text,
              'hover:opacity-80'
            )}
          >
            {notification.action.label}
          </button>
        )}
      </div>

      <button
        onClick={onClose}
        className={clsx(
          'p-1 rounded hover:bg-black/10',
          colors.text
        )}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
