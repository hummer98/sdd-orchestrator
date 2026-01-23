/**
 * useHumanActivity Hook
 * Task 3.3: React hook for tracking human activity in UI components
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.11
 */

import { useCallback, useRef } from 'react';
import {
  getHumanActivityTracker,
  initHumanActivityTracker,
  type ActivityEventType,
  type HumanActivityTracker,
} from '../services/humanActivityTracker';

// =============================================================================
// Types
// =============================================================================

/**
 * Return type of useHumanActivity hook
 */
export interface UseHumanActivityReturn {
  /** Record a user activity event */
  recordActivity: (eventType: ActivityEventType) => void;
  /** Start tracking for a spec */
  startTracking: (specId: string) => void;
  /** Stop tracking */
  stopTracking: () => void;
  /** Whether tracking is active */
  isActive: boolean;
}

// =============================================================================
// Initialization
// =============================================================================

/**
 * Ensure tracker is initialized with IPC callback
 * Called once on first hook usage
 */
function ensureTrackerInitialized(): HumanActivityTracker {
  let tracker = getHumanActivityTracker();
  if (!tracker) {
    // Initialize with IPC callback to send session data to Main process
    tracker = initHumanActivityTracker(async (session) => {
      try {
        await window.electronAPI.recordHumanSession(session);
      } catch (error) {
        console.error('[useHumanActivity] Failed to record session:', error);
      }
    });

    // Set up window focus listeners (Requirement 2.11)
    window.addEventListener('blur', () => {
      tracker?.handleFocusLoss();
    });

    window.addEventListener('focus', () => {
      tracker?.handleFocusRegain();
    });
  }
  return tracker;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * React hook for tracking human activity
 * Requirements: 2.1-2.7, 2.11
 */
export function useHumanActivity(): UseHumanActivityReturn {
  const trackerRef = useRef<HumanActivityTracker | null>(null);

  // Initialize tracker on first render
  if (!trackerRef.current) {
    trackerRef.current = ensureTrackerInitialized();
  }

  const recordActivity = useCallback((eventType: ActivityEventType) => {
    trackerRef.current?.recordActivity(eventType);
  }, []);

  const startTracking = useCallback((specId: string) => {
    trackerRef.current?.start(specId);
  }, []);

  const stopTracking = useCallback(() => {
    trackerRef.current?.stop();
  }, []);

  const isActive = trackerRef.current?.isActive ?? false;

  return {
    recordActivity,
    startTracking,
    stopTracking,
    isActive,
  };
}

// =============================================================================
// Component Event Helpers
// =============================================================================

/**
 * Create scroll handler for tracking document/log scroll events
 * @param recordActivity - The recordActivity function from useHumanActivity
 * @param eventType - The type of scroll event
 */
export function createScrollHandler(
  recordActivity: (eventType: ActivityEventType) => void,
  eventType: ActivityEventType = 'document-scroll'
): React.UIEventHandler {
  return () => {
    recordActivity(eventType);
  };
}

/**
 * Create click handler that also tracks activity
 * @param recordActivity - The recordActivity function from useHumanActivity
 * @param eventType - The type of activity event
 * @param originalHandler - The original click handler to call after recording
 */
export function createClickHandler(
  recordActivity: (eventType: ActivityEventType) => void,
  eventType: ActivityEventType,
  originalHandler?: () => void
): () => void {
  return () => {
    recordActivity(eventType);
    originalHandler?.();
  };
}
