/**
 * Spec Stores barrel exports
 * Re-exports all decomposed spec stores
 *
 * execution-store-consolidation: specManagerExecutionStore REMOVED (Req 5.1)
 * specManagerExecution state is now derived from agentStore via specStoreFacade
 */

// Types
export * from './types';

// Stores
export { useSpecListStore } from './specListStore';
export { useSpecDetailStore } from './specDetailStore';
export { useAutoExecutionStore } from './autoExecutionStore';
// execution-store-consolidation: specManagerExecutionStore REMOVED (Req 5.1)
// export { useSpecManagerExecutionStore } from './specManagerExecutionStore';

// Facade
export { useSpecStoreFacade, initSpecStoreFacade } from './specStoreFacade';
