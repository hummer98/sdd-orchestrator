/**
 * ToastContainer Component
 *
 * Task 1.2: ToastContainerコンポーネントの作成
 * Requirements: 4.1 - notify.error()でエラートーストを表示
 *
 * RemoteNotificationStoreから通知を購読して表示するコンテナコンポーネント。
 * 各通知タイプに応じたスタイリングとアニメーションを提供。
 */

import React from 'react';
import { X, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import { clsx } from 'clsx';
import {
  useRemoteNotificationStore,
  type RemoteNotification,
} from '../stores/remoteNotificationStore';

// =============================================================================
// Types
// =============================================================================

export interface ToastContainerProps {
  /** Test ID for E2E testing */
  testId?: string;
}

// =============================================================================
// Style Configuration
// =============================================================================

const typeStyles: Record<RemoteNotification['type'], {
  containerClass: string;
  iconClass: string;
  Icon: typeof CheckCircle;
}> = {
  success: {
    containerClass: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800',
    iconClass: 'text-green-600 dark:text-green-400',
    Icon: CheckCircle,
  },
  error: {
    containerClass: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800',
    iconClass: 'text-red-600 dark:text-red-400',
    Icon: XCircle,
  },
  warning: {
    containerClass: 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800',
    iconClass: 'text-yellow-600 dark:text-yellow-400',
    Icon: AlertTriangle,
  },
  info: {
    containerClass: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800',
    iconClass: 'text-blue-600 dark:text-blue-400',
    Icon: Info,
  },
};

// =============================================================================
// Toast Item Component
// =============================================================================

interface ToastItemProps {
  notification: RemoteNotification;
  onClose: () => void;
}

function ToastItem({ notification, onClose }: ToastItemProps): React.ReactElement {
  const { type, message } = notification;
  const styles = typeStyles[type];
  const { Icon } = styles;

  return (
    <div
      role="alert"
      data-testid={`toast-${type}`}
      className={clsx(
        'flex items-start gap-3 p-4 rounded-lg border shadow-lg',
        'animate-in slide-in-from-right-5 fade-in-0 duration-300',
        styles.containerClass
      )}
    >
      <Icon className={clsx('w-5 h-5 shrink-0 mt-0.5', styles.iconClass)} />
      <p className="flex-1 text-sm text-gray-800 dark:text-gray-200">
        {message}
      </p>
      <button
        onClick={onClose}
        className={clsx(
          'shrink-0 p-1 rounded-md transition-colors',
          'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
          'hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
        )}
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// =============================================================================
// ToastContainer Component
// =============================================================================

/**
 * ToastContainer - Notification toast display container
 *
 * Renders notifications from RemoteNotificationStore.
 * Should be placed at the root level of the application (e.g., in App.tsx).
 *
 * Features:
 * - Subscribes to RemoteNotificationStore
 * - Displays notifications with type-specific styling
 * - Supports close button for manual dismissal
 * - Accessible with role="alert"
 */
export function ToastContainer({
  testId = 'toast-container',
}: ToastContainerProps): React.ReactElement {
  const notifications = useRemoteNotificationStore((state) => state.notifications);
  const removeNotification = useRemoteNotificationStore((state) => state.removeNotification);

  return (
    <div
      data-testid={testId}
      className={clsx(
        'fixed top-4 right-4 z-50',
        'flex flex-col gap-2',
        'max-w-sm w-full',
        'pointer-events-none'
      )}
    >
      {notifications.map((notification) => (
        <div key={notification.id} className="pointer-events-auto">
          <ToastItem
            notification={notification}
            onClose={() => removeNotification(notification.id)}
          />
        </div>
      ))}
    </div>
  );
}

export default ToastContainer;
