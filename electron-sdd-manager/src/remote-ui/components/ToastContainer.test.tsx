/**
 * ToastContainer Tests
 *
 * Task 1.2: ToastContainerコンポーネントの作成
 * Requirements: 4.1 - notify.error()でエラートーストを表示
 *
 * Test coverage:
 * - RemoteNotificationStoreから通知を購読して表示
 * - 各通知タイプに応じたスタイリング
 * - 閉じるボタンでの通知削除
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToastContainer } from './ToastContainer';
import {
  useRemoteNotificationStore,
  resetRemoteNotificationStore,
} from '../stores/remoteNotificationStore';

describe('ToastContainer', () => {
  beforeEach(() => {
    resetRemoteNotificationStore();
  });

  it('should render nothing when there are no notifications', () => {
    const { container } = render(<ToastContainer />);
    expect(container.querySelector('[data-testid="toast-container"]')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('should render notifications from the store', () => {
    // Add a notification to the store
    useRemoteNotificationStore.getState().addNotification({
      type: 'success',
      message: 'Test success message',
      duration: 0, // Prevent auto-removal
    });

    render(<ToastContainer />);

    expect(screen.getByText('Test success message')).toBeInTheDocument();
  });

  it('should render multiple notifications', () => {
    const store = useRemoteNotificationStore.getState();
    store.addNotification({ type: 'success', message: 'Success 1', duration: 0 });
    store.addNotification({ type: 'error', message: 'Error 1', duration: 0 });
    store.addNotification({ type: 'warning', message: 'Warning 1', duration: 0 });

    render(<ToastContainer />);

    expect(screen.getByText('Success 1')).toBeInTheDocument();
    expect(screen.getByText('Error 1')).toBeInTheDocument();
    expect(screen.getByText('Warning 1')).toBeInTheDocument();
  });

  describe('Toast Types Styling', () => {
    it('should apply success styling', () => {
      useRemoteNotificationStore.getState().addNotification({
        type: 'success',
        message: 'Success notification',
        duration: 0,
      });

      render(<ToastContainer />);

      const toast = screen.getByTestId('toast-success');
      expect(toast).toBeInTheDocument();
      expect(toast).toHaveClass('bg-green-50');
    });

    it('should apply error styling', () => {
      useRemoteNotificationStore.getState().addNotification({
        type: 'error',
        message: 'Error notification',
        duration: 0,
      });

      render(<ToastContainer />);

      const toast = screen.getByTestId('toast-error');
      expect(toast).toBeInTheDocument();
      expect(toast).toHaveClass('bg-red-50');
    });

    it('should apply warning styling', () => {
      useRemoteNotificationStore.getState().addNotification({
        type: 'warning',
        message: 'Warning notification',
        duration: 0,
      });

      render(<ToastContainer />);

      const toast = screen.getByTestId('toast-warning');
      expect(toast).toBeInTheDocument();
      expect(toast).toHaveClass('bg-yellow-50');
    });

    it('should apply info styling', () => {
      useRemoteNotificationStore.getState().addNotification({
        type: 'info',
        message: 'Info notification',
        duration: 0,
      });

      render(<ToastContainer />);

      const toast = screen.getByTestId('toast-info');
      expect(toast).toBeInTheDocument();
      expect(toast).toHaveClass('bg-blue-50');
    });
  });

  describe('Close Button', () => {
    it('should remove notification when close button is clicked', () => {
      useRemoteNotificationStore.getState().addNotification({
        type: 'info',
        message: 'Closable notification',
        duration: 0,
      });

      render(<ToastContainer />);

      expect(screen.getByText('Closable notification')).toBeInTheDocument();

      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);

      expect(screen.queryByText('Closable notification')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have role="alert" for notifications', () => {
      useRemoteNotificationStore.getState().addNotification({
        type: 'error',
        message: 'Alert message',
        duration: 0,
      });

      render(<ToastContainer />);

      const alerts = screen.getAllByRole('alert');
      expect(alerts).toHaveLength(1);
    });
  });
});
