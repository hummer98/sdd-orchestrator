/**
 * File Router - file operations tRPC procedures
 * Task 4.2: fileルーターとZodスキーマを実装する
 * Requirements: 3.1, 3.2, 3.3
 *
 * Provides file operation procedures:
 * - readSpecs (query): Read all specs from a project
 * - readSpecJson (query): Read spec.json for a specific spec
 * - readArtifact (query): Read artifact file content
 * - writeArtifact (mutation): Write artifact file content
 * - listMarkdownFilesInSpec (query): List markdown files in spec/bug directory
 * - writeFile (mutation): Direct file write
 * - getArtifactPath (query): Resolve artifact path
 * - readFileContent (query): Read file content with metadata (code/image/binary)
 * - projectFileList (query): List CLAUDE.md and steering files
 * - projectFileRead (query): Read project file content
 * - projectFileWrite (mutation): Write project file content
 *
 * All services accessed via ctx.services for testability (DD-006).
 * Legacy handlers: fileHandlers.ts, projectFileHandlers.ts, specHandlers.ts (readSpecs/readSpecJson),
 *                  gitHandlers.ts (readFileContent)
 */
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from '../trpc';

// ============================================================
// Zod Schemas (Task 4.2: Requirements 3.3)
// ============================================================

// --- Entity type for spec/bug discrimination ---
export const entityTypeSchema = z.enum(['spec', 'bug']).default('spec');

// --- readSpecs ---
export const readSpecsInputSchema = z.object({
  projectPath: z.string().min(1),
});
export const specMetadataSchema = z.object({
  name: z.string(),
});
export const readSpecsOutputSchema = z.array(specMetadataSchema);

// --- readSpecJson ---
export const readSpecJsonInputSchema = z.object({
  specName: z.string().min(1),
});

// --- readArtifact / writeArtifact / getArtifactPath ---
export const artifactInputSchema = z.object({
  name: z.string().min(1),
  filename: z.string().min(1),
  entityType: entityTypeSchema,
});

export const writeArtifactInputSchema = z.object({
  name: z.string().min(1),
  filename: z.string().min(1),
  content: z.string(),
  entityType: entityTypeSchema,
});

// --- listMarkdownFilesInSpec ---
export const listMarkdownFilesInputSchema = z.object({
  name: z.string().min(1),
  entityType: entityTypeSchema,
});

// --- writeFile ---
export const writeFileInputSchema = z.object({
  filePath: z.string().min(1),
  content: z.string(),
});

// --- readFileContent ---
export const readFileContentInputSchema = z.object({
  projectPath: z.string().min(1),
  filePath: z.string().min(1),
});
export const fileContentOutputSchema = z.object({
  content: z.string(),
  isBase64: z.boolean(),
  fileType: z.enum(['code', 'markdown', 'image', 'binary']),
  language: z.string().optional(),
});

// --- projectFileRead ---
export const projectFileReadInputSchema = z.object({
  filePath: z.string().min(1),
});

// --- projectFileWrite ---
export const projectFileWriteInputSchema = z.object({
  filePath: z.string().min(1),
  content: z.string(),
});

// ============================================================
// Helper: resolve entity path (spec or bug)
// ============================================================

async function resolveEntityPath(
  fileService: any,
  currentProjectPath: string,
  name: string,
  entityType: 'spec' | 'bug',
): Promise<string> {
  const pathResult = entityType === 'bug'
    ? await fileService.resolveBugPath(currentProjectPath, name)
    : await fileService.resolveSpecPath(currentProjectPath, name);

  if (!pathResult.ok) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: `${entityType === 'bug' ? 'Bug' : 'Spec'} not found: ${name}`,
    });
  }

  return pathResult.value;
}

// ============================================================
// File Router
// ============================================================

export const fileRouter = router({
  // ============================================================
  // readSpecs (query)
  // Legacy: READ_SPECS (specHandlers.ts)
  // ============================================================

  /**
   * Read all specs from a project.
   * Returns array of { name } objects.
   */
  readSpecs: publicProcedure
    .input(readSpecsInputSchema)
    .output(readSpecsOutputSchema)
    .query(async ({ ctx, input }) => {
      const fileService = ctx.services.fileService;
      if (!fileService) {
        return [];
      }
      const result = await fileService.readSpecs(input.projectPath);
      if (!result.ok) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to read specs: ${result.error.type}`,
        });
      }
      return result.value;
    }),

  // ============================================================
  // readSpecJson (query)
  // Legacy: READ_SPEC_JSON (specHandlers.ts)
  // ============================================================

  /**
   * Read spec.json for a specific spec.
   * Resolves spec path using getCurrentProjectPath and resolveSpecPath.
   */
  readSpecJson: publicProcedure
    .input(readSpecJsonInputSchema)
    .query(async ({ ctx, input }) => {
      const currentProjectPath = ctx.services.getCurrentProjectPath();
      if (!currentProjectPath) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Project not selected',
        });
      }

      const fileService = ctx.services.fileService;
      if (!fileService) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'FileService not initialized',
        });
      }

      const specPath = await resolveEntityPath(fileService, currentProjectPath, input.specName, 'spec');
      const result = await fileService.readSpecJson(specPath);
      if (!result.ok) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to read spec.json: ${result.error.type}`,
        });
      }
      return result.value;
    }),

  // ============================================================
  // readArtifact (query)
  // Legacy: READ_ARTIFACT (fileHandlers.ts)
  // ============================================================

  /**
   * Read artifact file content (spec or bug).
   * Resolves path via resolveSpecPath/resolveBugPath + filename.
   */
  readArtifact: publicProcedure
    .input(artifactInputSchema)
    .query(async ({ ctx, input }) => {
      const currentProjectPath = ctx.services.getCurrentProjectPath();
      if (!currentProjectPath) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Project not selected',
        });
      }

      const fileService = ctx.services.fileService;
      if (!fileService) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'FileService not initialized',
        });
      }

      const entityPath = await resolveEntityPath(
        fileService,
        currentProjectPath,
        input.name,
        input.entityType,
      );

      // Join entity path and filename using / (Node.js path.join equivalent)
      const artifactPath = `${entityPath}/${input.filename}`;
      const result = await fileService.readArtifact(artifactPath);
      if (!result.ok) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Failed to read artifact: ${result.error.type}`,
        });
      }
      return result.value;
    }),

  // ============================================================
  // writeArtifact (mutation)
  // Legacy: WRITE_ARTIFACT (fileHandlers.ts)
  // ============================================================

  /**
   * Write artifact file content (spec or bug).
   */
  writeArtifact: publicProcedure
    .input(writeArtifactInputSchema)
    .mutation(async ({ ctx, input }) => {
      const currentProjectPath = ctx.services.getCurrentProjectPath();
      if (!currentProjectPath) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Project not selected',
        });
      }

      const fileService = ctx.services.fileService;
      if (!fileService) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'FileService not initialized',
        });
      }

      const entityPath = await resolveEntityPath(
        fileService,
        currentProjectPath,
        input.name,
        input.entityType,
      );

      const artifactPath = `${entityPath}/${input.filename}`;
      const result = await fileService.writeFile(artifactPath, input.content);
      if (!result.ok) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to write artifact: ${result.error.type}`,
        });
      }
    }),

  // ============================================================
  // listMarkdownFilesInSpec (query)
  // Legacy: LIST_MARKDOWN_FILES_IN_SPEC (fileHandlers.ts)
  // ============================================================

  /**
   * List markdown files in a spec or bug directory.
   */
  listMarkdownFilesInSpec: publicProcedure
    .input(listMarkdownFilesInputSchema)
    .query(async ({ ctx, input }) => {
      const currentProjectPath = ctx.services.getCurrentProjectPath();
      if (!currentProjectPath) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Project not selected',
        });
      }

      const fileService = ctx.services.fileService;
      if (!fileService) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'FileService not initialized',
        });
      }

      const entityPath = await resolveEntityPath(
        fileService,
        currentProjectPath,
        input.name,
        input.entityType,
      );

      const result = await fileService.listMarkdownFilesInSpec(entityPath, input.entityType);
      if (!result.ok) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to list markdown files: ${result.error.type}`,
        });
      }
      return result.value;
    }),

  // ============================================================
  // writeFile (mutation)
  // Legacy: WRITE_FILE (fileHandlers.ts)
  // ============================================================

  /**
   * Write file content to a given path.
   */
  writeFile: publicProcedure
    .input(writeFileInputSchema)
    .mutation(async ({ ctx, input }) => {
      const fileService = ctx.services.fileService;
      if (!fileService) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'FileService not initialized',
        });
      }

      const result = await fileService.writeFile(input.filePath, input.content);
      if (!result.ok) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to write file: ${result.error.type}`,
        });
      }
    }),

  // ============================================================
  // getArtifactPath (query)
  // Legacy: GET_ARTIFACT_PATH (fileHandlers.ts)
  // ============================================================

  /**
   * Resolve and return artifact path (spec or bug entity + filename).
   */
  getArtifactPath: publicProcedure
    .input(artifactInputSchema)
    .query(async ({ ctx, input }) => {
      const currentProjectPath = ctx.services.getCurrentProjectPath();
      if (!currentProjectPath) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Project not selected',
        });
      }

      const fileService = ctx.services.fileService;
      if (!fileService) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'FileService not initialized',
        });
      }

      const entityPath = await resolveEntityPath(
        fileService,
        currentProjectPath,
        input.name,
        input.entityType,
      );

      return `${entityPath}/${input.filename}`;
    }),

  // ============================================================
  // readFileContent (query)
  // Legacy: READ_FILE_CONTENT (gitHandlers.ts)
  // ============================================================

  /**
   * Read file content with metadata (fileType, language, isBase64).
   * Used for git diff source view.
   */
  readFileContent: publicProcedure
    .input(readFileContentInputSchema)
    .query(async ({ ctx, input }) => {
      const fileService = ctx.services.fileService;
      if (!fileService) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'FileService not initialized',
        });
      }

      const result = await fileService.readFileContent(input.projectPath, input.filePath);
      if (!result.ok) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Failed to read file content: ${result.error.type}`,
        });
      }
      return result.value;
    }),

  // ============================================================
  // projectFileList (query)
  // Legacy: PROJECT_FILE_LIST (projectFileHandlers.ts)
  // ============================================================

  /**
   * List CLAUDE.md and steering files for current project.
   */
  projectFileList: publicProcedure
    .query(async ({ ctx }) => {
      const currentProjectPath = ctx.services.getCurrentProjectPath();
      if (!currentProjectPath) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Project not selected',
        });
      }

      return ctx.services.listProjectFiles(currentProjectPath);
    }),

  // ============================================================
  // projectFileRead (query)
  // Legacy: PROJECT_FILE_READ (projectFileHandlers.ts)
  // ============================================================

  /**
   * Read project file content.
   * Path is validated to be within project directory.
   */
  projectFileRead: publicProcedure
    .input(projectFileReadInputSchema)
    .query(async ({ ctx, input }) => {
      const currentProjectPath = ctx.services.getCurrentProjectPath();
      if (!currentProjectPath) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Project not selected',
        });
      }

      return ctx.services.readProjectFile(currentProjectPath, input.filePath);
    }),

  // ============================================================
  // projectFileWrite (mutation)
  // Legacy: PROJECT_FILE_WRITE (projectFileHandlers.ts)
  // ============================================================

  /**
   * Write project file content.
   * Path is validated to be within project directory.
   */
  projectFileWrite: publicProcedure
    .input(projectFileWriteInputSchema)
    .mutation(async ({ ctx, input }) => {
      const currentProjectPath = ctx.services.getCurrentProjectPath();
      if (!currentProjectPath) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Project not selected',
        });
      }

      return ctx.services.writeProjectFile(currentProjectPath, input.filePath, input.content);
    }),
});
