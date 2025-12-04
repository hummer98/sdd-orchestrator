/**
 * Bug Service
 * Handles bug file system operations
 * Requirements: 3.1, 6.1, 6.3
 */

import { readdir, readFile, stat, access } from 'fs/promises';
import { join } from 'path';
import type {
  BugMetadata,
  BugDetail,
  BugPhase,
  BugArtifactInfo,
  FileError,
  Result,
} from '../../renderer/types';

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

          try {
            const bugJsonPath = join(bugPath, 'bug.json');
            const bugJsonContent = await readFile(bugJsonPath, 'utf-8');
            const bugJson = JSON.parse(bugJsonContent);
            reportedAt = bugJson.created_at || bugJson.reportedAt || reportedAt;
            updatedAt = bugJson.updated_at || updatedAt;
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

      try {
        const bugJsonPath = join(bugPath, 'bug.json');
        const bugJsonContent = await readFile(bugJsonPath, 'utf-8');
        const bugJson = JSON.parse(bugJsonContent);
        reportedAt = bugJson.created_at || bugJson.reportedAt || reportedAt;
        updatedAt = bugJson.updated_at || updatedAt;
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
        return {
          exists: true,
          path: filePath,
          updatedAt: stats.mtime.toISOString(),
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
}
