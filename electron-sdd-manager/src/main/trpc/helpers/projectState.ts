/**
 * Project State Compatibility Layer
 * multi-window-integration Task 3.1: Delegates global getters to
 * WindowManager's focused window state.
 *
 * Previously held global mutable state for single-window architecture.
 * Now delegates getters to WindowManager.getFocusedWindowId() ->
 * getWindowProject() / getWindowServices() for multi-window support.
 *
 * Setters are retained as no-ops (with deprecation logging) during
 * migration period. tRPC context-based access via ctx.services is the
 * primary path; these global functions serve non-tRPC callers (menu.ts,
 * Auto-Execution, etc.) that access the focused window's state.
 *
 * Requirements: 3.4
 */

import { type SpecManagerService } from '../../services/specManagerService';
import { type AutoExecutionCoordinator } from '../../services/autoExecutionCoordinator';
import { type MetricsService } from '../../services/metricsService';
import { getWindowManager } from '../../services/windowManager';
import type { SelectProjectResult } from '../../../renderer/types';

// ============================================================
// Initial state (not per-window; retained for startup flow)
// ============================================================
let initialProjectPath: string | null = null;
let initialSelectResult: SelectProjectResult | null = null;

// ============================================================
// Helper: resolve focused window services
// ============================================================

/**
 * Get the PerWindowServices for the currently focused window.
 * Returns null if no focused window or no services available.
 */
function getFocusedWindowServices() {
  try {
    const wm = getWindowManager();
    const focusedId = wm.getFocusedWindowId();
    if (focusedId === null) return null;
    return wm.getWindowServices(focusedId);
  } catch {
    // WindowManager not available (e.g., test environment)
    return null;
  }
}

// ============================================================
// Getters - Delegated to WindowManager focused window
// ============================================================

/**
 * Get the current project path from the focused window.
 * Returns null if no focused window or no project is set.
 * multi-window-integration Task 3.1: Delegates to WindowManager
 */
export function getCurrentProjectPath(): string | null {
  try {
    const wm = getWindowManager();
    const focusedId = wm.getFocusedWindowId();
    if (focusedId === null) return null;
    return wm.getWindowProject(focusedId);
  } catch {
    // WindowManager not available (e.g., test environment)
    return null;
  }
}

/**
 * Get the SpecManagerService from the focused window.
 * Throws if no focused window or services not initialized.
 * multi-window-integration Task 3.1: Delegates to WindowManager
 */
export function getSpecManagerService(): SpecManagerService {
  const services = getFocusedWindowServices();
  if (!services?.specManagerService) {
    throw new Error('SpecManagerService not initialized. No focused window with services.');
  }
  return services.specManagerService;
}

/**
 * Get the AutoExecutionCoordinator from the focused window.
 * Throws if no focused window or services not initialized.
 * multi-window-integration Task 3.1: Delegates to WindowManager
 */
export function getAutoExecutionCoordinator(): AutoExecutionCoordinator {
  const services = getFocusedWindowServices();
  if (!services?.autoExecutionCoordinator) {
    throw new Error('AutoExecutionCoordinator not initialized. No focused window with services.');
  }
  return services.autoExecutionCoordinator;
}

/**
 * Get the MetricsService from the focused window.
 * Throws if no focused window or services not initialized.
 * multi-window-integration Task 3.1: Delegates to WindowManager
 */
export function getMetricsService(): MetricsService {
  const services = getFocusedWindowServices();
  if (!services?.metricsService) {
    throw new Error('MetricsService not initialized. No focused window with services.');
  }
  return services.metricsService;
}

// ============================================================
// Setters - Deprecated during migration period
// Retained as no-ops to avoid breaking callers.
// ============================================================

/** @deprecated Use WindowManager per-window services instead */
export function setSpecManagerService(_service: SpecManagerService | null): void {
  // No-op: services are now managed per-window by WindowManager
}

/** @deprecated Use WindowManager per-window services instead */
export function setAutoExecutionCoordinator(_coordinator: AutoExecutionCoordinator | null): void {
  // No-op: services are now managed per-window by WindowManager
}

/** @deprecated Use WindowManager per-window services instead */
export function setMetricsService(_service: MetricsService | null): void {
  // No-op: services are now managed per-window by WindowManager
}

/** @deprecated Use WindowManager per-window services instead */
export function setCurrentProjectPath(_path: string | null): void {
  // No-op: project path is now managed per-window by WindowManager
}

// ============================================================
// Initial state functions (not per-window)
// These are used only during startup flow and remain unchanged.
// ============================================================

export function getInitialProjectPath(): string | null {
  return initialProjectPath;
}

export function setInitialProjectPath(path: string | null): void {
  initialProjectPath = path;
}

export function getInitialSelectResult(): SelectProjectResult | null {
  return initialSelectResult;
}

export function setInitialSelectResult(result: SelectProjectResult | null): void {
  initialSelectResult = result;
}

export function clearInitialSelectResult(): void {
  initialSelectResult = null;
}
