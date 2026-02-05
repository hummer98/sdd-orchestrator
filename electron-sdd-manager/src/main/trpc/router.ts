/**
 * Root Router - Application-wide tRPC router definition
 * Requirements: 2.2, 2.3, 2.5
 *
 * Aggregates all domain-specific sub-routers into a single root router.
 * Exports AppRouter type for client-side type inference.
 */
import { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import { router } from './trpc';
import { systemRouter } from './routers/system';

export const appRouter = router({
  system: systemRouter,
});

// Export AppRouter type for client-side type inference (Requirements: 2.5)
export type AppRouter = typeof appRouter;
export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
