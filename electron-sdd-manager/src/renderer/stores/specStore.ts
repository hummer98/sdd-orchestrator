/**
 * Spec Store
 * Facade wrapper that maintains backward compatibility
 * Actual implementation is delegated to decomposed stores via specStoreFacade
 * Requirements: 2.1-2.6, 3.1-3.5, 5.2-5.8, spec-store-decomposition
 *
 * execution-store-consolidation: CheckImplResult REMOVED (Req 6.1)
 */

// Re-export types for backward compatibility
export type {
  SpecManagerPhase,
  ImplTaskStatus,
  // execution-store-consolidation: CheckImplResult REMOVED (Req 6.1)
  SpecManagerExecutionState,
  AutoExecutionRuntimeState,
  AutoExecutionRuntimeMap,
  ArtifactType,
} from './spec/types';

// Re-export facade as useSpecStore for backward compatibility
export { useSpecStoreFacade as useSpecStore, initSpecStoreFacade } from './spec/specStoreFacade';
