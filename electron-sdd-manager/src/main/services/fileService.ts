/**
 * File Service
 * Handles file system operations with security validation
 * Requirements: 1.1, 1.2, 2.1, 4.5, 7.4-7.6, 13.4, 13.5
 */

import { readdir, readFile, writeFile, mkdir, stat, access } from 'fs/promises';
import { join, resolve, normalize } from 'path';
import type {
  KiroValidation,
  SpecMetadata,
  SpecJson,
  Phase,
  FileError,
  Result,
  ArtifactInfo,
} from '../../renderer/types';

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
   */
  async readSpecs(projectPath: string): Promise<Result<SpecMetadata[], FileError>> {
    try {
      const specsPath = join(projectPath, '.kiro', 'specs');

      // Check if specs directory exists
      try {
        await access(specsPath);
      } catch {
        return { ok: true, value: [] };
      }

      const entries = await readdir(specsPath, { withFileTypes: true });
      const specs: SpecMetadata[] = [];

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const specPath = join(specsPath, entry.name);
        const specJsonPath = join(specPath, 'spec.json');

        try {
          const content = await readFile(specJsonPath, 'utf-8');
          const specJson: SpecJson = JSON.parse(content);
          const stats = await stat(specJsonPath);

          specs.push({
            name: entry.name,
            path: specPath,
            phase: specJson.phase,
            updatedAt: specJson.updated_at || stats.mtime.toISOString(),
            approvals: specJson.approvals,
            readyForImplementation: specJson.ready_for_implementation ?? false,
          });
        } catch {
          // Skip specs without valid spec.json
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
      const specJson: SpecJson = JSON.parse(content);
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
        phase: 'init',
        approvals: {
          requirements: { generated: false, approved: false },
          design: { generated: false, approved: false },
          tasks: { generated: false, approved: false },
        },
        ready_for_implementation: false,
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

      // Update ready_for_implementation
      if (phase === 'tasks' && approved) {
        specJson.ready_for_implementation = true;
      }

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
}
