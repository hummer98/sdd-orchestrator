/**
 * tRPC Instance initialization
 * Requirements: 2.1
 *
 * Creates the singleton tRPC instance and exports base router/procedure.
 * This file is imported by all router files.
 *
 * Error logging middleware: Design spec requires "ルーター内でtry/catchし、
 * エラーをログ記録後にTRPCErrorとしてスロー". Implemented as global middleware
 * for DRY compliance instead of per-router try/catch.
 */
import { initTRPC } from '@trpc/server';
import type { Context } from './context';
import { projectLogger } from '../services/projectLogger';

const t = initTRPC.context<Context>().create();

/**
 * Error logging middleware.
 * Catches errors from all procedures and logs them via projectLogger
 * before re-throwing for tRPC error handling.
 */
const errorLoggingMiddleware = t.middleware(async ({ path, type, next }) => {
  const result = await next();
  if (!result.ok) {
    projectLogger.error(`[tRPC] ${type} ${path} failed`, {
      code: (result.error as any).code,
      message: result.error.message,
    });
  }
  return result;
});

export const router = t.router;
export const publicProcedure = t.procedure.use(errorLoggingMiddleware);
