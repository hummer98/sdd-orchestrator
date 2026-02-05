/**
 * System Router - system-level tRPC procedures
 * Requirements: 6.1, 6.2, 6.3, 6.4
 *
 * Provides healthCheck procedure for verifying tRPC infrastructure.
 */
import { z } from 'zod';
import { router, publicProcedure } from '../trpc';

// Zod schema for healthCheck output (Requirements: 6.4)
export const healthCheckOutputSchema = z.object({
  status: z.literal('ok'),
  timestamp: z.string(),
  version: z.string(),
});

export type HealthCheckOutput = z.infer<typeof healthCheckOutputSchema>;

// Read version from package.json
// Using require for Node.js module resolution at runtime
// eslint-disable-next-line @typescript-eslint/no-var-requires
let appVersion = '0.0.0';
try {
  // In test/build environment, read from package.json
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pkg = require('../../../../package.json');
  appVersion = pkg.version || '0.0.0';
} catch {
  // Fallback if package.json cannot be loaded
  appVersion = '0.0.0';
}

export const systemRouter = router({
  healthCheck: publicProcedure
    .output(healthCheckOutputSchema)
    .query(() => {
      return {
        status: 'ok' as const,
        timestamp: new Date().toISOString(),
        version: appVersion,
      };
    }),
});
