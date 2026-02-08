# Fix Report: E2E Double Module Evaluation

## Issue
E2E tests were failing due to a "Double Module Evaluation" of the main process entry point (`index.ts`).
This was caused by a circular dependency between the main bundle (`index.ts`) and a dynamically imported chunk (`sessionRecoveryService.ts`).

### The Cycle
1. `index.ts` (Entry) -> imports `projectSetup.ts`
2. `projectSetup.ts` -> dynamically imports `sessionRecoveryService.ts` (creating a separate chunk)
3. `sessionRecoveryService.ts` -> imported `projectLogger` from `./projectLogger`
4. `projectLogger` was bundled in the main entry chunk.
5. Result: Loading `sessionRecoveryService` triggered a re-load of the main chunk, causing `index.ts` logic (like `app.whenReady`) to execute twice.

## Fix Implemented (Phase 1: logger DI)
We applied **Dependency Injection** to break the cycle between `sessionRecoveryService` and `projectLogger`.

## Fix Implemented (Phase 2: Complete Decoupling)
Residual dependencies on `index.js` were identified: `getDefaultMetricsFileWriter`, `SESSION_TEMP_FILE_PATH`, and `IDLE_TIMEOUT_MS`. The following steps were taken to eliminate these:

1.  **Isolated Constants**: Created `src/main/constants/metrics.ts` as a leaf module for all metrics-related constants.
2.  **Full DI for Metrics Stack**:
    *   Updated `MetricsFileWriter` and `MetricsFileReader` to accept `logger` via constructor.
    *   Updated `MetricsService` to require `writer` and `reader` via constructor.
    *   Removed all `getDefault*` and `initDefault*` singleton factory functions.
3.  **Composition Root Wiring**:
    *   Consolidated all service instantiation in `projectSetup.ts`.
    *   Wired `SpecManagerService` and `SessionRecoveryService` with the shared `MetricsService` and `MetricsFileWriter` instances.
4.  **Test Updates**: Updated `specManagerService.test.ts` and `productionServices.test.ts` to use the new DI pattern.

## Verification
*   **Build**: Successfully passed (`task electron:build`).
*   **Code Structure**: `sessionRecoveryService` chunk now only depends on leaf modules or injected objects, eliminating all paths that require `index.js`.

## Next Steps
Run E2E tests to confirm the `SELECTION_IN_PROGRESS` error is resolved.
