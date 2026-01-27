/**
 * GitView Store (Renderer Re-export)
 * Re-exports shared gitViewStore for backward compatibility
 * Requirements: 4.1, 4.2, 10.3, 10.4
 *
 * This file re-exports the shared gitViewStore and provides
 * a backward-compatible alias `useGitViewStore` for existing code.
 */

// Re-export shared store
export {
  useSharedGitViewStore,
  resetSharedGitViewStore,
  getSharedGitViewStore,
} from '@shared/stores/gitViewStore';

// Backward-compatible alias
// Existing code uses useGitViewStore, so we alias it
import { useSharedGitViewStore } from '@shared/stores/gitViewStore';
export const useGitViewStore = useSharedGitViewStore;
