/**
 * ContextProvider Module
 * renderer-unified-logging feature
 * Requirements: 4.1, 4.2, 4.3
 *
 * Provides automatic context extraction from stores for logging.
 * Extracts specId and bugName from current application state.
 */

import { useSpecDetailStore } from '../stores/spec/specDetailStore';
import { useBugStore } from '../stores/bugStore';

/**
 * Context object for logging
 * Contains optional specId and bugName fields
 */
export interface LogContext {
  /** Currently selected Spec ID (if any) */
  specId?: string;
  /** Currently selected Bug name (if any) */
  bugName?: string;
  /** Additional context properties */
  [key: string]: unknown;
}

/**
 * Get automatic context from stores for logging
 * Requirements: 4.1, 4.2, 4.3
 *
 * - 4.1: Include specId when spec is selected
 * - 4.2: Include bugName when bug is selected
 * - 4.3: Return empty object when nothing selected
 *
 * @returns Context object with specId and/or bugName if selected
 */
export function getAutoContext(): LogContext {
  const context: LogContext = {};

  try {
    // Requirement 4.1: Get specId from specDetailStore
    const specDetail = useSpecDetailStore.getState().specDetail;
    if (specDetail?.metadata?.name) {
      context.specId = specDetail.metadata.name;
    }

    // Requirement 4.2: Get bugName from bugStore
    const selectedBug = useBugStore.getState().selectedBug;
    if (selectedBug?.name) {
      context.bugName = selectedBug.name;
    }
  } catch {
    // Requirement 4.3: Return empty object on error (store not initialized)
    // This handles cases where stores are not yet initialized
    return {};
  }

  // Requirement 4.3: Return empty object when nothing selected
  return context;
}
