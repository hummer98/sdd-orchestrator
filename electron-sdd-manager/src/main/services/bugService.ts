/**
 * Bug Service
 * Handles bug file system operations
 * Requirements: 3.1, 6.1, 6.3
 * Requirements: 1.1, 2.1, 2.2, 2.3, 2.4, 2.5, 3.5, 11.1, 11.2 (bugs-worktree-support)
 */

import { readdir, readFile, writeFile, stat, access } from 'fs/promises';
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
   * Read all bugs from a project
   * Requirements: 6.1, 6.3
   */
  async readBugs(projectPath: string): Promise<Result<BugMetadata[], FileError>> {
    try {
      const bugsPath = join(projectPath, '.kiro', 'bugs');

      // Check if bugs directory exists
      try {
        await access(bugsPath);
      } catch {
        return { ok: true, value: [] };
      }

      const entries = await readdir(bugsPath, { withFileTypes: true });
      const bugs: BugMetadata[] = [];

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const bugPath = join(bugsPath, entry.name);

        try {
          // Get artifact information to determine phase
          const artifacts = await this.getBugArtifacts(bugPath);
          const phase = determineBugPhaseFromFiles(artifacts);

          // Get the latest update time from all artifact files
          const updateTimes: Date[] = [];
          for (const artifact of Object.values(artifacts)) {
            if (artifact?.exists && artifact.updatedAt) {
              updateTimes.push(new Date(artifact.updatedAt));
            }
          }

          // Use bug.json if available, otherwise use directory creation time
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
            // No bug.json, use file stats
            const dirStats = await stat(bugPath);
            reportedAt = dirStats.birthtime.toISOString();
          }

          // Use the latest artifact update time if available
          if (updateTimes.length > 0) {
            updateTimes.sort((a, b) => b.getTime() - a.getTime());
            updatedAt = updateTimes[0].toISOString();
          }

          bugs.push({
            name: entry.name,
            path: bugPath,
            phase,
            updatedAt,
            reportedAt,
            // bugs-worktree-support: Include worktree in BugMetadata
            ...(worktree && { worktree }),
          });
        } catch {
          // Skip bugs that can't be read
          continue;
        }
      }

      // Sort by updatedAt descending (most recent first)
      bugs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      return { ok: true, value: bugs };
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

      const metadata: BugMetadata = {
        name: bugName,
        path: bugPath,
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
}
