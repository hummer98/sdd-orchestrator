/**
 * PID File Service
 * Manages PID files for SDD Agent persistence
 * Requirements: 5.5, 5.6, 5.7
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { AgentStatus } from './agentRegistry';

export interface AgentPidFile {
  agentId: string;
  specId: string;
  phase: string;
  pid: number;
  sessionId: string;
  status: AgentStatus;
  startedAt: string;
  lastActivityAt: string;
  command: string;
}

export type PidFileUpdate = Partial<Pick<AgentPidFile, 'status' | 'lastActivityAt' | 'pid'>>;

/**
 * Service for managing PID files
 */
export class PidFileService {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  /**
   * Get the file path for a PID file
   */
  private getFilePath(specId: string, agentId: string): string {
    return path.join(this.basePath, specId, `${agentId}.json`);
  }

  /**
   * Write a PID file
   * Requirements: 5.5
   */
  async writePidFile(pidFile: AgentPidFile): Promise<void> {
    const dirPath = path.join(this.basePath, pidFile.specId);
    const filePath = this.getFilePath(pidFile.specId, pidFile.agentId);

    // Ensure directory exists
    await fs.mkdir(dirPath, { recursive: true });

    // Write file
    await fs.writeFile(filePath, JSON.stringify(pidFile, null, 2), 'utf-8');
  }

  /**
   * Read a PID file
   * Requirements: 5.6
   */
  async readPidFile(specId: string, agentId: string): Promise<AgentPidFile | null> {
    const filePath = this.getFilePath(specId, agentId);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content) as AgentPidFile;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Read all PID files from all spec directories
   * Requirements: 5.6
   */
  async readAllPidFiles(): Promise<AgentPidFile[]> {
    const result: AgentPidFile[] = [];

    try {
      // Get all spec directories
      const specDirs = await fs.readdir(this.basePath, { withFileTypes: true });

      for (const specDir of specDirs) {
        if (!specDir.isDirectory()) continue;

        const specPath = path.join(this.basePath, specDir.name);
        const files = await fs.readdir(specPath);

        for (const file of files) {
          if (!file.endsWith('.json')) continue;

          const agentId = file.replace('.json', '');
          const pidFile = await this.readPidFile(specDir.name, agentId);

          if (pidFile) {
            result.push(pidFile);
          }
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // Base directory doesn't exist yet
        return [];
      }
      throw error;
    }

    return result;
  }

  /**
   * Update a PID file
   * Requirements: 5.5, 5.6
   */
  async updatePidFile(specId: string, agentId: string, update: PidFileUpdate): Promise<void> {
    const pidFile = await this.readPidFile(specId, agentId);

    if (!pidFile) {
      throw new Error(`PID file not found: ${specId}/${agentId}`);
    }

    const updatedPidFile: AgentPidFile = {
      ...pidFile,
      ...update,
    };

    await this.writePidFile(updatedPidFile);
  }

  /**
   * Delete a PID file
   */
  async deletePidFile(specId: string, agentId: string): Promise<void> {
    const filePath = this.getFilePath(specId, agentId);

    try {
      await fs.unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
      // File doesn't exist, nothing to delete
    }
  }

  /**
   * Check if a process is alive by PID
   * Requirements: 5.6, 5.7
   */
  checkProcessAlive(pid: number): boolean {
    if (pid <= 0) {
      return false;
    }

    try {
      // Sending signal 0 doesn't actually send a signal,
      // but it does check if the process exists and we have permission
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }
}

// Factory functions for convenience
let defaultService: PidFileService | null = null;

export function getPidFileService(basePath: string): PidFileService {
  return new PidFileService(basePath);
}

export function initDefaultPidFileService(basePath: string): PidFileService {
  defaultService = new PidFileService(basePath);
  return defaultService;
}

export function getDefaultPidFileService(): PidFileService {
  if (!defaultService) {
    throw new Error('PidFileService not initialized. Call initDefaultPidFileService first.');
  }
  return defaultService;
}

// Standalone functions that use the default service
export async function writePidFile(pidFile: AgentPidFile): Promise<void> {
  return getDefaultPidFileService().writePidFile(pidFile);
}

export async function readPidFile(specId: string, agentId: string): Promise<AgentPidFile | null> {
  return getDefaultPidFileService().readPidFile(specId, agentId);
}

export async function readAllPidFiles(): Promise<AgentPidFile[]> {
  return getDefaultPidFileService().readAllPidFiles();
}

export async function updatePidFile(specId: string, agentId: string, update: PidFileUpdate): Promise<void> {
  return getDefaultPidFileService().updatePidFile(specId, agentId, update);
}

export function checkProcessAlive(pid: number): boolean {
  return getDefaultPidFileService().checkProcessAlive(pid);
}
