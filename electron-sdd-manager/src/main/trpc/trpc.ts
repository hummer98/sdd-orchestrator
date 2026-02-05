/**
 * tRPC Instance initialization
 * Requirements: 2.1
 *
 * Creates the singleton tRPC instance and exports base router/procedure.
 * This file is imported by all router files.
 */
import { initTRPC } from '@trpc/server';
import type { Context } from './context';

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
