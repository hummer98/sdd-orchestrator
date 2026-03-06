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
import { configRouter } from './routers/config';
import { projectRouter } from './routers/project';
import { fileRouter } from './routers/file';

import { specRouter } from './routers/spec';
import { agentRouter } from './routers/agent';
import { autoExecutionRouter } from './routers/autoExecution';
import { gitRouter } from './routers/git';
import { eventsRouter } from './routers/events';
import { mcpRouter } from './routers/mcp';
import { scheduleRouter } from './routers/schedule';
import { cloudflareRouter } from './routers/cloudflare';
import { installRouter } from './routers/install';
import { miscRouter } from './routers/misc';
import { issueRouter } from './routers/issue';

export const appRouter = router({
  system: systemRouter,
  config: configRouter,
  project: projectRouter,
  file: fileRouter,

  spec: specRouter,
  agent: agentRouter,
  autoExecution: autoExecutionRouter,
  git: gitRouter,
  events: eventsRouter,
  mcp: mcpRouter,
  schedule: scheduleRouter,
  cloudflare: cloudflareRouter,
  install: installRouter,
  misc: miscRouter,
  issue: issueRouter,
});

// Export AppRouter type for client-side type inference (Requirements: 2.5)
export type AppRouter = typeof appRouter;
export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
