/**
 * HumanActivityTracker
 * Tracks user activity for human consumption time measurement
 * Task 3.1: Human activity tracking service
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11
 */

import { IDLE_TIMEOUT_MS } from '../../main/types/metrics';
import type { HumanSessionData } from '../../main/types/metrics';

// =============================================================================
// Types
// =============================================================================

/**
 * Activity event types
 * Requirements: 2.1-2.7
 */
export type ActivityEventType =
  | 'spec-select'         // 2.1: Spec selection
  | 'artifact-tab-change' // 2.2: Artifact tab change
  | 'document-scroll'     // 2.3: Document scroll
  | 'agent-log-scroll'    // 2.4: Agent log scroll
  | 'agent-log-expand'    // 2.5: Agent log expand/collapse
  | 'approval-button'     // 2.6: Approval button click
  | 'link-click'          // 2.7: Link click
  | 'text-select';        // Additional: Text selection

/**
 * Callback type for recording sessions
 */
export type RecordSessionCallback = (session: HumanSessionData) => Promise<void>;

// =============================================================================
// Constants
// =============================================================================

/** Debounce interval for rapid events (100ms) */
const DEBOUNCE_INTERVAL_MS = 100;

// =============================================================================
// HumanActivityTracker
// =============================================================================

/**
 * Service for tracking human activity and measuring consumption time
 * Requirements: 2.1-2.11
 */
export class HumanActivityTracker {
  private _isActive = false;
  private _currentSpecId: string | null = null;
  private sessionStartTime: Date | null = null;
  private lastActivityTime: Date | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private recordSession: RecordSessionCallback;

  constructor(recordSession: RecordSessionCallback) {
    this.recordSession = recordSession;
  }

  // ===========================================================================
  // Getters
  // ===========================================================================

  /**
   * Whether tracking is currently active
   */
  get isActive(): boolean {
    return this._isActive;
  }

  /**
   * Current spec being tracked (null if not tracking)
   */
  get currentSpecId(): string | null {
    return this._currentSpecId;
  }

  // ===========================================================================
  // Lifecycle Methods
  // ===========================================================================

  /**
   * Start tracking activity for a spec
   * Requirement 2.10: Spec change ends current session and starts new one
   */
  start(specId: string): void {
    // If same spec, don't restart
    if (this._currentSpecId === specId) {
      return;
    }

    // If different spec, end current session first (Requirement 2.10)
    if (this._currentSpecId !== null && this.sessionStartTime !== null) {
      this.endSession();
    }

    this._currentSpecId = specId;
    this._isActive = true;
    this.sessionStartTime = null;
    this.lastActivityTime = null;
    this.clearTimers();
  }

  /**
   * Stop tracking activity
   * Records session if there was activity
   */
  stop(): void {
    if (this._currentSpecId !== null && this.sessionStartTime !== null) {
      this.endSession();
    }

    this._isActive = false;
    this._currentSpecId = null;
    this.sessionStartTime = null;
    this.lastActivityTime = null;
    this.clearTimers();
  }

  // ===========================================================================
  // Activity Recording
  // ===========================================================================

  /**
   * Record an activity event
   * Requirements: 2.1-2.7
   * @param _eventType - Type of activity event (unused but kept for future analytics)
   */
  recordActivity(_eventType: ActivityEventType): void {
    if (!this._isActive || !this._currentSpecId) {
      return;
    }

    // Debounce rapid events
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.processActivity();
    }, DEBOUNCE_INTERVAL_MS);

    // Always update last activity time immediately for timer reset
    this.lastActivityTime = new Date();

    // Start session if not started
    if (!this.sessionStartTime) {
      this.sessionStartTime = new Date();
    }

    // Reset idle timer
    this.resetIdleTimer();
  }

  /**
   * Process activity after debounce
   */
  private processActivity(): void {
    // Activity is already tracked via lastActivityTime
    // This method exists for potential future analytics
  }

  // ===========================================================================
  // Focus Handling (Requirement 2.11)
  // ===========================================================================

  /**
   * Handle window focus loss
   * Requirement 2.11: End session on focus loss
   */
  handleFocusLoss(): void {
    if (this._currentSpecId !== null && this.sessionStartTime !== null) {
      this.endSession();
    }

    this.clearTimers();
  }

  /**
   * Handle window focus regain
   * Resumes tracking for current spec
   */
  handleFocusRegain(): void {
    // Reset session start - new activity will start a new session
    this.sessionStartTime = null;
    this.lastActivityTime = null;
  }

  // ===========================================================================
  // Timer Management
  // ===========================================================================

  /**
   * Reset the idle timer
   * Requirements 2.8, 2.9: 45 second idle timeout
   */
  private resetIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }

    this.idleTimer = setTimeout(() => {
      this.handleIdleTimeout();
    }, IDLE_TIMEOUT_MS);
  }

  /**
   * Handle idle timeout
   * Requirement 2.9: End session after 45 seconds of inactivity
   */
  private handleIdleTimeout(): void {
    if (this._currentSpecId !== null && this.sessionStartTime !== null) {
      this.endSession();
    }
  }

  /**
   * Clear all timers
   */
  private clearTimers(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  // ===========================================================================
  // Session Management
  // ===========================================================================

  /**
   * End current session and record it
   */
  private endSession(): void {
    if (!this._currentSpecId || !this.sessionStartTime || !this.lastActivityTime) {
      return;
    }

    const endTime = new Date();
    const ms = endTime.getTime() - this.sessionStartTime.getTime();

    const sessionData: HumanSessionData = {
      specId: this._currentSpecId,
      start: this.sessionStartTime.toISOString(),
      end: endTime.toISOString(),
      ms,
    };

    // Record session asynchronously
    this.recordSession(sessionData).catch((error) => {
      console.error('[HumanActivityTracker] Failed to record session:', error);
    });

    // Reset session state
    this.sessionStartTime = null;
    this.lastActivityTime = null;
    this.clearTimers();
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let defaultTracker: HumanActivityTracker | null = null;

/**
 * Get the default HumanActivityTracker instance
 * Must be initialized with initHumanActivityTracker first
 */
export function getHumanActivityTracker(): HumanActivityTracker | null {
  return defaultTracker;
}

/**
 * Initialize the default HumanActivityTracker with a record callback
 */
export function initHumanActivityTracker(recordSession: RecordSessionCallback): HumanActivityTracker {
  defaultTracker = new HumanActivityTracker(recordSession);
  return defaultTracker;
}
