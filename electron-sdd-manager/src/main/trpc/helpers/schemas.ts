/**
 * Common Zod schemas shared across multiple tRPC routers.
 * DRY: projectPathInputSchema was duplicated in 5 router files.
 */
import { z } from 'zod';

export const projectPathInputSchema = z.object({
  projectPath: z.string().min(1),
});
