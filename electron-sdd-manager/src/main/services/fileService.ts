/**
 * File Service
 * Handles file system operations with security validation
 * Requirements: 1.1, 1.2, 2.1, 4.5, 7.4-7.6, 13.4, 13.5, 3.3-3.5
 * Requirements: 8.2 (bugs-worktree-directory-mode) - Use common scanWorktreeEntities helper
 */

import { readdir, readFile, writeFile, mkdir, stat, access } from 'fs/promises';
import { join, resolve, normalize } from 'path';
import type {
  KiroValidation,
  SpecMetadata,
  SpecJson,
  SpecPhase,
  Phase,
  FileError,
  Result,
  ArtifactInfo,
} from '../../renderer/types';
import { scanWorktreeEntities } from './worktreeHelpers';
// spec-event-log: Event logging for approval and phase transitions
import { getDefaultEventLogService } from './eventLogService';
import type { EventLogInput } from '../../shared/types';

/**
 * Check if a path is safe (within base directory, no traversal)
 */
export function isPathSafe(basePath: string, targetPath: string): boolean {
  const normalizedBase = normalize(resolve(basePath));
  const normalizedTarget = normalize(resolve(targetPath));
  return normalizedTarget.startsWith(normalizedBase);
}

/**
 * Validate a path and return Result type
 */
export function validatePath(
  basePath: string,
  targetPath: string
): Result<string, FileError> {
  const normalizedTarget = normalize(resolve(targetPath));

  if (!isPathSafe(basePath, normalizedTarget)) {
    return {
      ok: false,
      error: {
        type: 'INVALID_PATH',
        path: targetPath,
        reason: 'Directory traversal detected or path outside allowed directory',
      },
    };
  }

  return { ok: true, value: normalizedTarget };
}

/**
 * File Service class for file operations
 */
export class FileService {
  // ============================================================
  // spec-event-log: Event Logging Helpers
  // ============================================================

  /**
   * Log an approval event using EventLogService
   * Fire-and-forget pattern: errors are logged but not propagated
   * Requirements: 1.10 (spec-event-log)
   */
  private logApprovalEvent(specPath: string, event: EventLogInput): void {
    // Extract project path and specId from specPath
    const specId = specPath.split('/').pop() || 'unknown';
    const projectPath = specPath.split('.kiro/specs/')[0]?.replace(/\/$/, '') || specPath;

    getDefaultEventLogService().logEvent(
      projectPath,
      specId,
      event
    ).catch(() => {
      // Errors are logged internally by EventLogService
    });
  }

  /**
   * Log a phase transition event using EventLogService
   * Fire-and-forget pattern: errors are logged but not propagated
   * Requirements: 1.11 (spec-event-log)
   */
  private logPhaseTransitionEvent(specPath: string, event: EventLogInput): void {
    // Extract project path and specId from specPath
    const specId = specPath.split('/').pop() || 'unknown';
    const projectPath = specPath.split('.kiro/specs/')[0]?.replace(/\/$/, '') || specPath;

    getDefaultEventLogService().logEvent(
      projectPath,
      specId,
      event
    ).catch(() => {
      // Errors are logged internally by EventLogService
    });
  }

  /**
   * Validate spec name format
   * Only lowercase letters, numbers, and hyphens allowed
   */
  isValidSpecName(name: string): boolean {
    if (!name || name.length === 0) return false;
    return /^[a-z0-9-]+$/.test(name);
  }

  /**
   * Validate .kiro directory structure
   */
  async validateKiroDirectory(dirPath: string): Promise<KiroValidation> {
    try {
      const kiroPath = join(dirPath, '.kiro');
      const specsPath = join(kiroPath, 'specs');
      const steeringPath = join(kiroPath, 'steering');

      let exists = false;
      let hasSpecs = false;
      let hasSteering = false;

      try {
        await access(kiroPath);
        exists = true;
      } catch {
        return { exists: false, hasSpecs: false, hasSteering: false };
      }

      try {
        await access(specsPath);
        hasSpecs = true;
      } catch {
        // specs directory doesn't exist
      }

      try {
        await access(steeringPath);
        hasSteering = true;
      } catch {
        // steering directory doesn't exist
      }

      return { exists, hasSpecs, hasSteering };
    } catch {
      return { exists: false, hasSpecs: false, hasSteering: false };
    }
  }

  /**
   * Read all specs from a project
   * spec-metadata-ssot-refactor: Returns only name (SSOT principle)
   * phase, updatedAt, approvals should be obtained from specJson
   * spec-path-ssot-refactor: Removed path field - path resolution is done via resolveSpecPath
   * spec-worktree-early-creation: Also reads specs from .kiro/worktrees/specs/{specId}/.kiro/specs/{specId}/
   * bugs-worktree-directory-mode (8.2): Uses scanWorktreeEntities for worktree scanning
   */
  async readSpecs(projectPath: string): Promise<Result<SpecMetadata[], FileError>> {
    try {
      const specsPath = join(projectPath, '.kiro', 'specs');
      const specs: SpecMetadata[] = [];
      const seenSpecNames = new Set<string>();

      // 1. Read main specs from .kiro/specs/
      try {
        await access(specsPath);
        const entries = await readdir(specsPath, { withFileTypes: true });

        for (const entry of entries) {
          if (!entry.isDirectory()) continue;

          const specPath = join(specsPath, entry.name);
          const specJsonPath = join(specPath, 'spec.json');

          try {
            // Only check if spec.json exists (no need to read content for metadata)
            await access(specJsonPath);

            // spec-path-ssot-refactor: Return only name
            specs.push({
              name: entry.name,
            });
            seenSpecNames.add(entry.name);
          } catch {
            // Skip specs without valid spec.json
            continue;
          }
        }
      } catch {
        // Main specs directory doesn't exist, continue to check worktrees
      }

      // 2. bugs-worktree-directory-mode (8.2): Use shared scanWorktreeEntities helper
      // Read worktree specs from .kiro/worktrees/specs/{specId}/.kiro/specs/{specId}/
      const worktreeSpecs = await scanWorktreeEntities(projectPath, 'specs');
      for (const wtSpec of worktreeSpecs) {
        // Skip if already found in main specs (main spec takes priority)
        if (seenSpecNames.has(wtSpec.name)) continue;

        // Verify spec.json exists in the worktree entity path
        const worktreeSpecJsonPath = join(wtSpec.path, 'spec.json');
        try {
          await access(worktreeSpecJsonPath);

          // spec-path-ssot-refactor: Return only name
          specs.push({
            name: wtSpec.name,
          });
          seenSpecNames.add(wtSpec.name);
        } catch {
          // Skip worktrees without valid spec.json in the expected location
          continue;
        }
      }

      return { ok: true, value: specs };
    } catch (error) {
      return {
        ok: false,
        error: {
          type: 'NOT_FOUND',
          path: projectPath,
        },
      };
    }
  }

  /**
   * Read a spec.json file
   */
  async readSpecJson(specPath: string): Promise<Result<SpecJson, FileError>> {
    try {
      const specJsonPath = join(specPath, 'spec.json');
      const content = await readFile(specJsonPath, 'utf-8');
      const rawJson = JSON.parse(content);

      // Migrate from old spec-manager format to new CC-SDD format
      const specJson = this.migrateSpecJson(rawJson);

      return { ok: true, value: specJson };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return {
          ok: false,
          error: { type: 'NOT_FOUND', path: specPath },
        };
      }
      return {
        ok: false,
        error: {
          type: 'PARSE_ERROR',
          path: specPath,
          message: String(error),
        },
      };
    }
  }

  /**
   * Migrate spec.json from old spec-manager format to new CC-SDD format
   * document-review-phase Task 5.1: Also migrates documentReviewFlag to permissions['document-review']
   * Requirements: 4.1, 4.2
   */
  private migrateSpecJson(rawJson: any): SpecJson {
    // If already in new format, perform documentReviewFlag migration
    if ('feature_name' in rawJson && 'approvals' in rawJson) {
      // document-review-phase Task 5.1: Migrate documentReviewFlag to permissions['document-review']
      const result = rawJson as SpecJson;
      if (result.autoExecution) {
        const oldFlag = (result.autoExecution as any).documentReviewFlag;
        if (oldFlag !== undefined) {
          // Ensure permissions exists
          if (!result.autoExecution.permissions) {
            result.autoExecution.permissions = {
              requirements: true,
              design: true,
              tasks: true,
              'document-review': oldFlag === 'run', // 'run' -> true, 'pause' -> false
              impl: true,
              inspection: true,
              deploy: true,
            };
          } else if (result.autoExecution.permissions['document-review'] === undefined) {
            // Only set if not already defined
            result.autoExecution.permissions['document-review'] = oldFlag === 'run';
          }
          // Note: documentReviewFlag is kept for backward compatibility
          // It will be ignored by new code
        }
      }
      return result;
    }

    // Old spec-manager format:
    // {
    //   "feature": "...",
    //   "status": { "phase": "requirements", "requirements": "pending", ... },
    //   "metadata": { "created": "...", "updated": "..." }
    // }

    // Determine phase status from old format
    const oldPhase = rawJson.status?.phase || 'requirements';
    const oldRequirements = rawJson.status?.requirements || 'pending';
    const oldDesign = rawJson.status?.design || 'pending';
    const oldTasks = rawJson.status?.tasks || 'pending';

    // Convert status flags to approvals
    // A phase is "generated" if its status is not "pending"
    const approvals = {
      requirements: {
        generated: oldRequirements !== 'pending' || ['design', 'tasks', 'implementation'].includes(oldPhase),
        approved: oldRequirements === 'completed' ||
                  ['design', 'tasks', 'implementation'].includes(oldPhase),
      },
      design: {
        generated: oldDesign !== 'pending' || ['tasks', 'implementation'].includes(oldPhase),
        approved: oldDesign === 'completed' ||
                  ['tasks', 'implementation'].includes(oldPhase),
      },
      tasks: {
        generated: oldTasks !== 'pending' || oldPhase === 'implementation',
        approved: oldTasks === 'completed' ||
                  oldPhase === 'implementation',
      },
    };

    // Map old phase to new phase based on approvals
    let newPhase: SpecPhase;
    if (approvals.tasks.approved) {
      newPhase = 'tasks-generated';
    } else if (approvals.tasks.generated) {
      newPhase = 'tasks-generated';
    } else if (approvals.design.approved) {
      newPhase = 'design-generated';
    } else if (approvals.design.generated) {
      newPhase = 'design-generated';
    } else if (approvals.requirements.approved) {
      newPhase = 'requirements-generated';
    } else if (approvals.requirements.generated) {
      newPhase = 'requirements-generated';
    } else {
      newPhase = 'initialized';
    }

    return {
      feature_name: rawJson.feature || rawJson.feature_name || 'unknown',
      created_at: rawJson.metadata?.created || rawJson.created_at || new Date().toISOString(),
      updated_at: rawJson.metadata?.updated || rawJson.updated_at || new Date().toISOString(),
      language: rawJson.language || 'ja',
      phase: newPhase,
      approvals,
    };
  }

  /**
   * Read an artifact file
   */
  async readArtifact(artifactPath: string): Promise<Result<string, FileError>> {
    try {
      const content = await readFile(artifactPath, 'utf-8');
      return { ok: true, value: content };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return {
          ok: false,
          error: { type: 'NOT_FOUND', path: artifactPath },
        };
      }
      return {
        ok: false,
        error: {
          type: 'PERMISSION_DENIED',
          path: artifactPath,
        },
      };
    }
  }

  /**
   * Get artifact info
   */
  async getArtifactInfo(specPath: string, artifactName: string): Promise<ArtifactInfo | null> {
    try {
      const artifactPath = join(specPath, `${artifactName}.md`);
      const stats = await stat(artifactPath);
      return {
        exists: true,
        updatedAt: stats.mtime.toISOString(),
      };
    } catch {
      return null;
    }
  }

  /**
   * Create a new spec
   */
  async createSpec(
    projectPath: string,
    specName: string,
    description: string
  ): Promise<Result<void, FileError>> {
    if (!this.isValidSpecName(specName)) {
      return {
        ok: false,
        error: {
          type: 'INVALID_PATH',
          path: specName,
          reason: 'Spec name must contain only lowercase letters, numbers, and hyphens',
        },
      };
    }

    const specPath = join(projectPath, '.kiro', 'specs', specName);
    const pathValidation = validatePath(projectPath, specPath);
    if (!pathValidation.ok) {
      return pathValidation;
    }

    try {
      // Create spec directory
      await mkdir(specPath, { recursive: true });

      // Create initial spec.json
      const now = new Date().toISOString();
      const specJson: SpecJson = {
        feature_name: specName,
        created_at: now,
        updated_at: now,
        language: 'ja',
        phase: 'initialized',
        approvals: {
          requirements: { generated: false, approved: false },
          design: { generated: false, approved: false },
          tasks: { generated: false, approved: false },
        },
      };

      await writeFile(
        join(specPath, 'spec.json'),
        JSON.stringify(specJson, null, 2),
        'utf-8'
      );

      // Create initial requirements.md with description
      const requirementsContent = `# Requirements Document

## Project Description (Input)
${description}

## Introduction
(要件定義が生成されます)

## Requirements
(要件が生成されます)
`;
      await writeFile(
        join(specPath, 'requirements.md'),
        requirementsContent,
        'utf-8'
      );

      return { ok: true, value: undefined };
    } catch (error) {
      return {
        ok: false,
        error: {
          type: 'WRITE_ERROR',
          path: specPath,
          message: String(error),
        },
      };
    }
  }

  /**
   * Write file content
   */
  async writeFile(filePath: string, content: string): Promise<Result<void, FileError>> {
    try {
      await writeFile(filePath, content, 'utf-8');
      return { ok: true, value: undefined };
    } catch (error) {
      return {
        ok: false,
        error: {
          type: 'WRITE_ERROR',
          path: filePath,
          message: String(error),
        },
      };
    }
  }

  /**
   * Update approval status in spec.json
   */
  async updateApproval(
    specPath: string,
    phase: Phase,
    approved: boolean
  ): Promise<Result<void, FileError>> {
    try {
      const specJsonPath = join(specPath, 'spec.json');
      const content = await readFile(specJsonPath, 'utf-8');
      const specJson: SpecJson = JSON.parse(content);

      // Validate that the phase has been generated
      if (!specJson.approvals[phase].generated && approved) {
        return {
          ok: false,
          error: {
            type: 'INVALID_PATH',
            path: specPath,
            reason: `Cannot approve ${phase}: phase has not been generated yet`,
          },
        };
      }

      // Update approval status
      specJson.approvals[phase].approved = approved;
      specJson.updated_at = new Date().toISOString();

      // Update phase based on latest approval
      if (approved) {
        if (phase === 'requirements') {
          specJson.phase = 'requirements-generated';
        } else if (phase === 'design') {
          specJson.phase = 'design-generated';
        } else if (phase === 'tasks') {
          specJson.phase = 'tasks-generated';
        }
      }

      await writeFile(specJsonPath, JSON.stringify(specJson, null, 2), 'utf-8');

      // spec-event-log: Log approval:update event (Requirement 1.10)
      this.logApprovalEvent(specPath, {
        type: 'approval:update',
        message: `${phase} ${approved ? 'approved' : 'unapproved'}`,
        phase,
        approved,
      });

      return { ok: true, value: undefined };
    } catch (error) {
      return {
        ok: false,
        error: {
          type: 'WRITE_ERROR',
          path: specPath,
          message: String(error),
        },
      };
    }
  }

  /**
   * Update spec.json with arbitrary updates
   * spec-scoped-auto-execution-state: Generic update method
   *
   * @param specPath - Path to the spec directory
   * @param updates - Object with fields to update (will be merged with existing spec.json)
   */
  async updateSpecJson(
    specPath: string,
    updates: Record<string, unknown>
  ): Promise<Result<void, FileError>> {
    try {
      const specJsonPath = join(specPath, 'spec.json');
      const content = await readFile(specJsonPath, 'utf-8');
      const specJson = JSON.parse(content);

      // Merge updates
      Object.assign(specJson, updates);

      // Update timestamp
      specJson.updated_at = new Date().toISOString();

      await writeFile(specJsonPath, JSON.stringify(specJson, null, 2), 'utf-8');
      return { ok: true, value: undefined };
    } catch (error) {
      return {
        ok: false,
        error: {
          type: 'WRITE_ERROR',
          path: specPath,
          message: String(error),
        },
      };
    }
  }

  /**
   * Update spec.json based on completed phase generation
   * Called when a spec-manager phase completes successfully
   * Requirements: 3.3-3.5
   *
   * @param specPath - Path to the spec directory
   * @param completedPhase - The phase that was completed ('requirements' | 'design' | 'tasks' | 'impl')
   * @param options - Options for the update
   * @param options.skipTimestamp - If true, do not update updated_at (used for UI auto-correction)
   */
  /**
   * CompletedPhase type for updateSpecJsonFromPhase
   * spec-phase-auto-update: Added 'inspection-complete' and 'deploy-complete'
   */
  async updateSpecJsonFromPhase(
    specPath: string,
    completedPhase: 'requirements' | 'design' | 'tasks' | 'impl' | 'impl-complete' | 'inspection-complete' | 'deploy-complete',
    options?: { skipTimestamp?: boolean }
  ): Promise<Result<void, FileError>> {
    try {
      const specJsonPath = join(specPath, 'spec.json');
      const content = await readFile(specJsonPath, 'utf-8');
      const specJson: SpecJson = JSON.parse(content);

      // Track old phase for event logging
      const oldPhase = specJson.phase;

      // Update based on completed phase
      switch (completedPhase) {
        case 'requirements':
          specJson.phase = 'requirements-generated';
          specJson.approvals.requirements.generated = true;
          break;
        case 'design':
          specJson.phase = 'design-generated';
          specJson.approvals.design.generated = true;
          break;
        case 'tasks':
          specJson.phase = 'tasks-generated';
          specJson.approvals.tasks.generated = true;
          break;
        case 'impl':
          // impl case is no-op (implementation-in-progress state was removed)
          break;
        case 'impl-complete':
          // Update phase to implementation-complete when all tasks are done
          specJson.phase = 'implementation-complete';
          break;
        // spec-phase-auto-update: Added new completion phases
        case 'inspection-complete':
          // Update phase when inspection passes (GO judgment)
          specJson.phase = 'inspection-complete';
          break;
        case 'deploy-complete':
          // Update phase when deployment is complete
          specJson.phase = 'deploy-complete';
          break;
      }

      // Update timestamp (unless skipTimestamp is true)
      if (!options?.skipTimestamp) {
        specJson.updated_at = new Date().toISOString();
      }

      await writeFile(specJsonPath, JSON.stringify(specJson, null, 2), 'utf-8');

      // spec-event-log: Log phase:transition event if phase changed (Requirement 1.11)
      if (oldPhase !== specJson.phase) {
        this.logPhaseTransitionEvent(specPath, {
          type: 'phase:transition',
          message: `Phase transitioned: ${oldPhase} -> ${specJson.phase}`,
          oldPhase,
          newPhase: specJson.phase,
        });
      }

      return { ok: true, value: undefined };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return {
          ok: false,
          error: { type: 'NOT_FOUND', path: specPath },
        };
      }
      return {
        ok: false,
        error: {
          type: 'WRITE_ERROR',
          path: specPath,
          message: String(error),
        },
      };
    }
  }

  /**
   * Validate phase transition for spec-phase-auto-update
   * Ensures proper phase ordering: implementation-complete -> inspection-complete -> deploy-complete
   * Requirements: 3.2 (Phase transition validation)
   *
   * @param fromPhase - Current phase
   * @param toPhase - Target phase
   * @returns Result indicating if transition is valid
   */
  validatePhaseTransition(
    fromPhase: SpecPhase,
    toPhase: SpecPhase
  ): Result<void, FileError> {
    // Same phase is always allowed (no-op)
    if (fromPhase === toPhase) {
      return { ok: true, value: undefined };
    }

    // Define phase ordering for validation
    const PHASE_ORDER: SpecPhase[] = [
      'initialized',
      'requirements-generated',
      'design-generated',
      'tasks-generated',
      'implementation-complete',
      'inspection-complete',
      'deploy-complete',
    ];

    const fromIndex = PHASE_ORDER.indexOf(fromPhase);
    const toIndex = PHASE_ORDER.indexOf(toPhase);

    // Unknown phases are not allowed
    if (fromIndex === -1 || toIndex === -1) {
      return {
        ok: false,
        error: {
          type: 'INVALID_TRANSITION',
          path: '',
          message: `Unknown phase: ${fromIndex === -1 ? fromPhase : toPhase}`,
        },
      };
    }

    // Backward transitions are allowed (for reset/rollback scenarios)
    if (toIndex < fromIndex) {
      return { ok: true, value: undefined };
    }

    // Forward transitions must be exactly one step
    if (toIndex === fromIndex + 1) {
      return { ok: true, value: undefined };
    }

    // Skip transitions are not allowed
    return {
      ok: false,
      error: {
        type: 'INVALID_TRANSITION',
        path: '',
        message: `Cannot transition from ${fromPhase} to ${toPhase}. Must go through intermediate phases.`,
      },
    };
  }

  /**
   * Remove worktree field from spec.json
   * worktree-execution-ui FIX-3: Called when deploy completes to reset worktree state
   * Requirements: 5.3, 10.3
   *
   * @param specPath - Path to the spec directory
   * @returns Result indicating success or failure
   */
  async removeWorktreeField(specPath: string): Promise<Result<void, FileError>> {
    try {
      const specJsonPath = join(specPath, 'spec.json');
      const content = await readFile(specJsonPath, 'utf-8');
      const specJson = JSON.parse(content);

      // Check if worktree field exists
      if (!specJson.worktree) {
        // Nothing to remove
        return { ok: true, value: undefined };
      }

      // Remove worktree field
      delete specJson.worktree;

      // Note: Do not update timestamp - this is an automatic cleanup action
      await writeFile(specJsonPath, JSON.stringify(specJson, null, 2), 'utf-8');
      return { ok: true, value: undefined };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return {
          ok: false,
          error: { type: 'NOT_FOUND', path: specPath },
        };
      }
      return {
        ok: false,
        error: {
          type: 'WRITE_ERROR',
          path: specPath,
          message: String(error),
        },
      };
    }
  }

  /**
   * Resolve entity name to actual file system path
   * spec-path-ssot-refactor: SSOT for entity path resolution
   *
   * Priority order:
   * 1. Worktree path: .kiro/worktrees/{entityType}/{entityName}/.kiro/{entityType}/{entityName}/
   * 2. Main path: .kiro/{entityType}/{entityName}/
   * 3. NOT_FOUND error if neither exists
   *
   * Requirements: 1.1, 1.2, 1.4
   *
   * @param projectPath - Project root path
   * @param entityType - 'specs' or 'bugs'
   * @param entityName - Entity name (must be valid: lowercase letters, numbers, hyphens)
   * @returns Result<string, FileError> - Resolved absolute path or error
   */
  async resolveEntityPath(
    projectPath: string,
    entityType: 'specs' | 'bugs',
    entityName: string
  ): Promise<Result<string, FileError>> {
    // Validate entity name format
    if (!this.isValidSpecName(entityName)) {
      return {
        ok: false,
        error: {
          type: 'INVALID_PATH',
          path: entityName,
          reason: 'Entity name must contain only lowercase letters, numbers, and hyphens',
        },
      };
    }

    // Determine the entity JSON file name (spec.json or bug.json)
    const entityJsonFile = entityType === 'specs' ? 'spec.json' : 'bug.json';

    // Priority 1: Check worktree path
    // .kiro/worktrees/{entityType}/{entityName}/.kiro/{entityType}/{entityName}/
    // Must have the entity JSON file (spec.json or bug.json) to be valid
    const worktreePath = join(
      projectPath,
      '.kiro',
      'worktrees',
      entityType,
      entityName,
      '.kiro',
      entityType,
      entityName
    );

    try {
      // Check both directory and entity JSON file exist
      await access(worktreePath);
      await access(join(worktreePath, entityJsonFile));
      return { ok: true, value: worktreePath };
    } catch {
      // Worktree doesn't exist or missing entity JSON, try main path
    }

    // Priority 2: Check main path
    // .kiro/{entityType}/{entityName}/
    // Must have the entity JSON file (spec.json or bug.json) to be valid
    const mainPath = join(projectPath, '.kiro', entityType, entityName);

    try {
      // Check both directory and entity JSON file exist
      await access(mainPath);
      await access(join(mainPath, entityJsonFile));
      return { ok: true, value: mainPath };
    } catch {
      // Main path doesn't exist either or missing entity JSON
    }

    // Priority 3: Neither exists
    return {
      ok: false,
      error: {
        type: 'NOT_FOUND',
        path: `${entityType}/${entityName}`,
      },
    };
  }

  /**
   * Convenience method for spec path resolution
   * spec-path-ssot-refactor: Wrapper for resolveEntityPath with entityType='specs'
   * Requirements: 1.3
   *
   * @param projectPath - Project root path
   * @param specName - Spec name
   * @returns Result<string, FileError> - Resolved absolute path or error
   */
  async resolveSpecPath(
    projectPath: string,
    specName: string
  ): Promise<Result<string, FileError>> {
    return this.resolveEntityPath(projectPath, 'specs', specName);
  }

  /**
   * Convenience method for bug path resolution
   * spec-path-ssot-refactor: Wrapper for resolveEntityPath with entityType='bugs'
   * Requirements: 1.3
   *
   * @param projectPath - Project root path
   * @param bugName - Bug name
   * @returns Result<string, FileError> - Resolved absolute path or error
   */
  async resolveBugPath(
    projectPath: string,
    bugName: string
  ): Promise<Result<string, FileError>> {
    return this.resolveEntityPath(projectPath, 'bugs', bugName);
  }
}
