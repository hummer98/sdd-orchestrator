/**
 * Bug Service
 * Handles bug file system operations
 * Requirements: 3.1, 6.1, 6.3
 * Requirements: 1.1, 2.1, 2.2, 2.3, 2.4, 2.5, 3.5, 11.1, 11.2 (bugs-worktree-support)
 */

import { readdir, readFile, writeFile, stat, access, mkdir, cp } from 'fs/promises';
import { join, resolve } from 'path';
import type {
  BugMetadata,
  BugDetail,
  BugPhase,
  BugArtifactInfo,
  FileError,
  Result,
  BugJson,
  BugWorktreeConfig,
} from '../../renderer/types';
import { isBugWorktreeConfig } from '../../renderer/types/bugJson';
import { scanWorktreeEntities } from './worktreeHelpers';
import { logger } from './logger';

/**
 * Result type for readBugs with warnings support
 * Bug fix: empty bug directory handling
 */
export interface ReadBugsResult {
  bugs: BugMetadata[];
  warnings: string[];
}

/**
 * Determine bug phase from existing files
 * Requirements: 3.1
 */
function determineBugPhaseFromFiles(artifacts: BugDetail['artifacts']): BugPhase {
  if (artifacts.verification?.exists) return 'verified';
  if (artifacts.fix?.exists) return 'fixed';
  if (artifacts.analysis?.exists) return 'analyzed';
  return 'reported';
}

/**
 * Bug Service class for bug-related file operations
 */
export class BugService {
  /**
   * Read all bugs from a project (including worktree bugs)
   * Requirements: 6.1, 6.3
   * Requirements: 3.1, 3.2, 3.3 (bugs-worktree-directory-mode)
   * Bug fix: empty bug directory handling - returns warnings for skipped directories
   */
  async readBugs(projectPath: string): Promise<Result<ReadBugsResult, FileError>> {
    try {
      const bugs: BugMetadata[] = [];
      const warnings: string[] = [];
      const seenNames = new Set<string>();

      // Step 1: Read bugs from main project (.kiro/bugs/)
      const bugsPath = join(projectPath, '.kiro', 'bugs');
      try {
        await access(bugsPath);
        const entries = await readdir(bugsPath, { withFileTypes: true });

        for (const entry of entries) {
          if (!entry.isDirectory()) continue;

          const bugPath = join(bugsPath, entry.name);
          const result = await this.readSingleBug(bugPath, entry.name);
          if (result.metadata) {
            bugs.push(result.metadata);
            seenNames.add(entry.name); // Track name for deduplication
          }
          if (result.warning) {
            warnings.push(result.warning);
          }
        }
      } catch {
        // Main bugs directory doesn't exist, continue to worktrees
      }

      // Step 2: Read bugs from worktree directories (.kiro/worktrees/bugs/)
      // Requirements: 3.1, 3.2, 3.3 (bugs-worktree-directory-mode)
      const worktreeBugs = await scanWorktreeEntities(projectPath, 'bugs');
      for (const wtBug of worktreeBugs) {
        // Skip if already found in main project (main takes priority)
        if (seenNames.has(wtBug.name)) continue;

        const result = await this.readSingleBug(wtBug.path, wtBug.name, wtBug.worktreeBasePath);
        if (result.metadata) {
          bugs.push(result.metadata);
          seenNames.add(wtBug.name);
        }
        if (result.warning) {
          warnings.push(result.warning);
        }
      }

      // Sort by updatedAt descending (most recent first)
      bugs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      return { ok: true, value: { bugs, warnings } };
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
   * Read a single bug's metadata
   * Internal helper to avoid code duplication
   * bug-deploy-phase: Requirements 2.2, 2.3 - phase field priority with artifact fallback
   * Bug fix: empty bug directory handling - returns warning for empty directories
   * @param bugPath - Full path to bug directory
   * @param bugName - Bug name (directory name)
   * @param worktreeBasePath - Optional worktree base path for directory mode bugs
   * @returns Object with metadata and optional warning
   */
  private async readSingleBug(
    bugPath: string,
    bugName: string,
    worktreeBasePath?: string
  ): Promise<{ metadata: BugMetadata | null; warning: string | null }> {
    try {
      // Get artifact information to determine phase (fallback)
      const artifacts = await this.getBugArtifacts(bugPath);
      const artifactPhase = determineBugPhaseFromFiles(artifacts);

      // Get the latest update time from all artifact files
      const updateTimes: Date[] = [];
      for (const artifact of Object.values(artifacts)) {
        if (artifact?.exists && artifact.updatedAt) {
          updateTimes.push(new Date(artifact.updatedAt));
        }
      }

      // Bug fix: Check if directory is completely empty (no bug.json and no artifacts)
      const hasBugJson = await this.hasBugJson(bugPath);
      const hasAnyArtifact = Object.values(artifacts).some((a) => a?.exists);

      if (!hasBugJson && !hasAnyArtifact) {
        // Completely empty directory - skip with warning
        const warning = `Empty bug directory skipped: ${bugName}`;
        logger.warn('[BugService] ' + warning, { bugPath });
        return { metadata: null, warning };
      }

      // Use bug.json if available, otherwise use directory creation time
      let reportedAt = new Date().toISOString();
      let updatedAt = new Date().toISOString();
      // bugs-worktree-support: Read worktree field from bug.json
      let worktree: BugWorktreeConfig | undefined;
      // bug-deploy-phase: Read phase field from bug.json (priority over artifact detection)
      let phase: BugPhase = artifactPhase;

      try {
        const bugJsonPath = join(bugPath, 'bug.json');
        const bugJsonContent = await readFile(bugJsonPath, 'utf-8');
        const bugJson = JSON.parse(bugJsonContent);
        reportedAt = bugJson.created_at || bugJson.reportedAt || reportedAt;
        updatedAt = bugJson.updated_at || updatedAt;
        // bugs-worktree-support: Map worktree field to BugMetadata
        if (isBugWorktreeConfig(bugJson.worktree)) {
          worktree = bugJson.worktree;
        }
        // bug-deploy-phase: Requirements 2.2 - phase field takes priority
        if (bugJson.phase) {
          phase = bugJson.phase;
        }
      } catch {
        // No bug.json, use file stats
        const dirStats = await stat(bugPath);
        reportedAt = dirStats.birthtime.toISOString();
      }

      // Use the latest artifact update time if available
      if (updateTimes.length > 0) {
        updateTimes.sort((a, b) => b.getTime() - a.getTime());
        updatedAt = updateTimes[0].toISOString();
      }

      // spec-path-ssot-refactor: Removed path field - path resolution is done via resolveBugPath
      return {
        metadata: {
          name: bugName,
          phase,
          updatedAt,
          reportedAt,
          // bugs-worktree-support: Include worktree in BugMetadata
          ...(worktree && { worktree }),
          // bugs-worktree-directory-mode: Include worktreeBasePath for directory mode bugs
          ...(worktreeBasePath && { worktreeBasePath }),
        },
        warning: null,
      };
    } catch {
      // Bug is unreadable
      return { metadata: null, warning: null };
    }
  }

  /**
   * Check if bug.json exists in bug directory
   * Bug fix: empty bug directory handling
   */
  private async hasBugJson(bugPath: string): Promise<boolean> {
    try {
      await access(join(bugPath, 'bug.json'));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Read bug detail including artifacts
   * Requirements: 6.3
   */
  async readBugDetail(bugPath: string): Promise<Result<BugDetail, FileError>> {
    try {
      const bugName = bugPath.split('/').pop() || '';

      // Get artifact information
      const artifacts = await this.getBugArtifacts(bugPath);
      const phase = determineBugPhaseFromFiles(artifacts);

      // Get metadata
      let reportedAt = new Date().toISOString();
      let updatedAt = new Date().toISOString();
      // bugs-worktree-support: Read worktree field from bug.json
      let worktree: BugWorktreeConfig | undefined;

      try {
        const bugJsonPath = join(bugPath, 'bug.json');
        const bugJsonContent = await readFile(bugJsonPath, 'utf-8');
        const bugJson = JSON.parse(bugJsonContent);
        reportedAt = bugJson.created_at || bugJson.reportedAt || reportedAt;
        updatedAt = bugJson.updated_at || updatedAt;
        // bugs-worktree-support: Map worktree field to BugMetadata
        if (isBugWorktreeConfig(bugJson.worktree)) {
          worktree = bugJson.worktree;
        }
      } catch {
        const dirStats = await stat(bugPath);
        reportedAt = dirStats.birthtime.toISOString();
      }

      // spec-path-ssot-refactor: Removed path field - path resolution is done via resolveBugPath
      const metadata: BugMetadata = {
        name: bugName,
        phase,
        updatedAt,
        reportedAt,
        // bugs-worktree-support: Include worktree in BugMetadata
        ...(worktree && { worktree }),
      };

      return {
        ok: true,
        value: {
          metadata,
          artifacts,
        },
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return {
          ok: false,
          error: { type: 'NOT_FOUND', path: bugPath },
        };
      }
      return {
        ok: false,
        error: {
          type: 'PARSE_ERROR',
          path: bugPath,
          message: String(error),
        },
      };
    }
  }

  /**
   * Get bug artifacts (report.md, analysis.md, fix.md, verification.md)
   */
  private async getBugArtifacts(bugPath: string): Promise<BugDetail['artifacts']> {
    const getArtifact = async (name: string): Promise<BugArtifactInfo | null> => {
      try {
        const filePath = join(bugPath, `${name}.md`);
        const stats = await stat(filePath);
        const content = await readFile(filePath, 'utf-8');
        return {
          exists: true,
          path: filePath,
          updatedAt: stats.mtime.toISOString(),
          content,
        };
      } catch {
        return null;
      }
    };

    const [report, analysis, fix, verification] = await Promise.all([
      getArtifact('report'),
      getArtifact('analysis'),
      getArtifact('fix'),
      getArtifact('verification'),
    ]);

    return { report, analysis, fix, verification };
  }

  /**
   * Read artifact content
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

  // ============================================================
  // bugs-workflow-footer Task 3.2: Check if bug exists
  // Requirements: 5.2
  // ============================================================

  /**
   * Check if a bug directory exists
   * @param bugPath - Path to bug directory
   * @returns true if bug directory exists
   */
  async bugExists(bugPath: string): Promise<Result<boolean, FileError>> {
    try {
      await access(bugPath);
      const stats = await stat(bugPath);
      return { ok: true, value: stats.isDirectory() };
    } catch {
      return { ok: true, value: false };
    }
  }

  // ============================================================
  // bugs-worktree-support Task 2.1: bug.json CRUD operations
  // Requirements: 1.1, 2.1, 2.2, 2.4, 2.5
  // ============================================================

  /**
   * Create bug.json for a new bug
   * Requirements: 1.1, 2.1
   *
   * @param bugPath - Path to bug directory
   * @param bugName - Bug name (directory name)
   * @returns Created BugJson on success
   */
  async createBugJson(bugPath: string, bugName: string): Promise<Result<BugJson, FileError>> {
    try {
      const now = new Date().toISOString();
      const bugJson: BugJson = {
        bug_name: bugName,
        created_at: now,
        updated_at: now,
      };

      const bugJsonPath = join(bugPath, 'bug.json');
      await writeFile(bugJsonPath, JSON.stringify(bugJson, null, 2), 'utf-8');

      return { ok: true, value: bugJson };
    } catch (error) {
      return {
        ok: false,
        error: {
          type: 'WRITE_ERROR',
          path: bugPath,
          message: String(error),
        },
      };
    }
  }

  /**
   * Read bug.json
   * Requirements: 2.5
   *
   * @param bugPath - Path to bug directory
   * @returns BugJson on success, null if not exists
   */
  async readBugJson(bugPath: string): Promise<Result<BugJson | null, FileError>> {
    try {
      const bugJsonPath = join(bugPath, 'bug.json');
      const content = await readFile(bugJsonPath, 'utf-8');
      const bugJson = JSON.parse(content) as BugJson;
      return { ok: true, value: bugJson };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // bug.json not found - return null for backward compatibility
        return { ok: true, value: null };
      }
      return {
        ok: false,
        error: {
          type: 'PARSE_ERROR',
          path: bugPath,
          message: String(error),
        },
      };
    }
  }

  /**
   * Update bug.json timestamps
   * Requirements: 2.2, 2.4
   *
   * @param bugPath - Path to bug directory
   * @returns void on success
   */
  async updateBugJsonTimestamp(bugPath: string): Promise<Result<void, FileError>> {
    const readResult = await this.readBugJson(bugPath);
    if (!readResult.ok) {
      return readResult;
    }

    if (readResult.value === null) {
      return {
        ok: false,
        error: {
          type: 'NOT_FOUND',
          path: join(bugPath, 'bug.json'),
        },
      };
    }

    const bugJson = readResult.value;
    bugJson.updated_at = new Date().toISOString();

    try {
      const bugJsonPath = join(bugPath, 'bug.json');
      await writeFile(bugJsonPath, JSON.stringify(bugJson, null, 2), 'utf-8');
      return { ok: true, value: undefined };
    } catch (error) {
      return {
        ok: false,
        error: {
          type: 'WRITE_ERROR',
          path: bugPath,
          message: String(error),
        },
      };
    }
  }

  // ============================================================
  // bug-deploy-phase Task 2.2: phase field update
  // Requirements: 2.4
  // ============================================================

  /**
   * Update bug.json phase field
   * Requirements: 2.4 - phase update with updated_at timestamp
   *
   * @param bugPath - Path to bug directory
   * @param phase - New phase value
   * @returns void on success
   */
  async updateBugJsonPhase(bugPath: string, phase: BugPhase): Promise<Result<void, FileError>> {
    const readResult = await this.readBugJson(bugPath);
    if (!readResult.ok) {
      return readResult;
    }

    if (readResult.value === null) {
      return {
        ok: false,
        error: {
          type: 'NOT_FOUND',
          path: join(bugPath, 'bug.json'),
        },
      };
    }

    const bugJson = readResult.value;
    bugJson.phase = phase;
    bugJson.updated_at = new Date().toISOString();

    try {
      const bugJsonPath = join(bugPath, 'bug.json');
      await writeFile(bugJsonPath, JSON.stringify(bugJson, null, 2), 'utf-8');
      return { ok: true, value: undefined };
    } catch (error) {
      return {
        ok: false,
        error: {
          type: 'WRITE_ERROR',
          path: bugPath,
          message: String(error),
        },
      };
    }
  }

  // ============================================================
  // bugs-worktree-support Task 2.2: worktree field operations
  // Requirements: 2.3, 3.5, 3.7, 4.7
  // ============================================================

  /**
   * Add worktree field to bug.json
   * Requirements: 2.3, 3.5
   *
   * @param bugPath - Path to bug directory
   * @param worktreeConfig - Worktree configuration
   * @returns void on success
   */
  async addWorktreeField(bugPath: string, worktreeConfig: BugWorktreeConfig): Promise<Result<void, FileError>> {
    const readResult = await this.readBugJson(bugPath);
    if (!readResult.ok) {
      return readResult;
    }

    if (readResult.value === null) {
      return {
        ok: false,
        error: {
          type: 'NOT_FOUND',
          path: join(bugPath, 'bug.json'),
        },
      };
    }

    const bugJson = readResult.value;
    bugJson.worktree = worktreeConfig;
    bugJson.updated_at = new Date().toISOString();

    try {
      const bugJsonPath = join(bugPath, 'bug.json');
      await writeFile(bugJsonPath, JSON.stringify(bugJson, null, 2), 'utf-8');
      return { ok: true, value: undefined };
    } catch (error) {
      return {
        ok: false,
        error: {
          type: 'WRITE_ERROR',
          path: bugPath,
          message: String(error),
        },
      };
    }
  }

  /**
   * Remove worktree field from bug.json
   * Requirements: 4.7
   *
   * @param bugPath - Path to bug directory
   * @returns void on success
   */
  async removeWorktreeField(bugPath: string): Promise<Result<void, FileError>> {
    const readResult = await this.readBugJson(bugPath);
    if (!readResult.ok) {
      return readResult;
    }

    if (readResult.value === null) {
      return {
        ok: false,
        error: {
          type: 'NOT_FOUND',
          path: join(bugPath, 'bug.json'),
        },
      };
    }

    const bugJson = readResult.value;
    delete bugJson.worktree;
    bugJson.updated_at = new Date().toISOString();

    try {
      const bugJsonPath = join(bugPath, 'bug.json');
      await writeFile(bugJsonPath, JSON.stringify(bugJson, null, 2), 'utf-8');
      return { ok: true, value: undefined };
    } catch (error) {
      return {
        ok: false,
        error: {
          type: 'WRITE_ERROR',
          path: bugPath,
          message: String(error),
        },
      };
    }
  }

  // ============================================================
  // Bug fix: bug-auto-execution-worktree-cwd
  // Resolve bug path for both main and worktree directory modes
  // ============================================================

  /**
   * Resolve bug directory path from bug name
   * Checks worktree directory first, then falls back to main directory
   *
   * @param projectPath - Main project path
   * @param bugName - Bug name
   * @returns Absolute path to bug directory (worktree or main)
   */
  async resolveBugPath(projectPath: string, bugName: string): Promise<string> {
    // Check worktree directory first: .kiro/worktrees/bugs/{bugName}/.kiro/bugs/{bugName}/
    const worktreeBugPath = join(
      projectPath,
      '.kiro',
      'worktrees',
      'bugs',
      bugName,
      '.kiro',
      'bugs',
      bugName
    );

    try {
      await access(worktreeBugPath);
      return worktreeBugPath;
    } catch {
      // Worktree directory doesn't exist, use main directory
    }

    // Fall back to main directory: .kiro/bugs/{bugName}/
    return join(projectPath, '.kiro', 'bugs', bugName);
  }

  // ============================================================
  // bugs-worktree-support Task 2.3: Agent cwd for worktree mode
  // Requirements: 11.1, 11.2
  // ============================================================

  /**
   * Get agent working directory (worktree path or project path)
   * Requirements: 11.1, 11.2
   *
   * @param bugPath - Path to bug directory
   * @param projectPath - Main project path
   * @returns Absolute path for agent cwd
   */
  async getAgentCwd(bugPath: string, projectPath: string): Promise<string> {
    const readResult = await this.readBugJson(bugPath);

    if (!readResult.ok || readResult.value === null) {
      // No bug.json or read error - use project path
      return projectPath;
    }

    const bugJson = readResult.value;
    if (isBugWorktreeConfig(bugJson.worktree)) {
      // Worktree mode - resolve relative path to absolute
      return resolve(projectPath, bugJson.worktree.path);
    }

    // No worktree - use project path
    return projectPath;
  }

  // ============================================================
  // bugs-worktree-directory-mode Task 5.2-5.3: Copy bug to worktree
  // Requirements: 6.2, 6.3
  // ============================================================

  /**
   * Copy bug files from main directory to worktree
   * Requirements: 6.2, 6.3
   *
   * @param mainBugPath - Path to bug directory in main project
   * @param worktreeBugPath - Path to bug directory in worktree
   * @param bugName - Bug name
   * @returns void on success
   */
  async copyBugToWorktree(
    mainBugPath: string,
    worktreeBugPath: string,
    _bugName: string
  ): Promise<Result<void, FileError>> {
    try {
      // Check if source exists
      try {
        await access(mainBugPath);
      } catch {
        return {
          ok: false,
          error: {
            type: 'NOT_FOUND',
            path: mainBugPath,
          },
        };
      }

      // Ensure destination directory exists
      await mkdir(worktreeBugPath, { recursive: true });

      // Copy all files from source to destination
      await cp(mainBugPath, worktreeBugPath, { recursive: true });

      return { ok: true, value: undefined };
    } catch (error) {
      return {
        ok: false,
        error: {
          type: 'WRITE_ERROR',
          path: worktreeBugPath,
          message: String(error),
        },
      };
    }
  }
}
