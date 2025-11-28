/**
 * Agent Record Service
 * Manages Agent record files for SDD Agent persistence and history
 * Requirements: 5.5, 5.6, 5.7
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { AgentStatus } from './agentRegistry';

export interface AgentRecord {
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

export type AgentRecordUpdate = Partial<Pick<AgentRecord, 'status' | 'lastActivityAt' | 'pid' | 'sessionId'>>;

/**
 * Service for managing Agent record files
 */
export class AgentRecordService {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  /**
   * Get the file path for an agent record
   */
  private getFilePath(specId: string, agentId: string): string {
    return path.join(this.basePath, specId, `${agentId}.json`);
  }

  /**
   * Write an agent record
   * Requirements: 5.5
   */
  async writeRecord(record: AgentRecord): Promise<void> {
    const dirPath = path.join(this.basePath, record.specId);
    const filePath = this.getFilePath(record.specId, record.agentId);

    // Ensure directory exists
    await fs.mkdir(dirPath, { recursive: true });

    // Write file
    await fs.writeFile(filePath, JSON.stringify(record, null, 2), 'utf-8');
  }

  /**
   * Read an agent record
   * Requirements: 5.6
   */
  async readRecord(specId: string, agentId: string): Promise<AgentRecord | null> {
    const filePath = this.getFilePath(specId, agentId);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content) as AgentRecord;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Read all agent records from all spec directories
   * Requirements: 5.6
   */
  async readAllRecords(): Promise<AgentRecord[]> {
    const result: AgentRecord[] = [];

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
          const record = await this.readRecord(specDir.name, agentId);

          if (record) {
            result.push(record);
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
   * Update an agent record
   * Requirements: 5.5, 5.6
   */
  async updateRecord(specId: string, agentId: string, update: AgentRecordUpdate): Promise<void> {
    const record = await this.readRecord(specId, agentId);

    if (!record) {
      throw new Error(`Agent record not found: ${specId}/${agentId}`);
    }

    const updatedRecord: AgentRecord = {
      ...record,
      ...update,
    };

    await this.writeRecord(updatedRecord);
  }

  /**
   * Delete an agent record
   */
  async deleteRecord(specId: string, agentId: string): Promise<void> {
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
let defaultService: AgentRecordService | null = null;

export function getAgentRecordService(basePath: string): AgentRecordService {
  return new AgentRecordService(basePath);
}

export function initDefaultAgentRecordService(basePath: string): AgentRecordService {
  defaultService = new AgentRecordService(basePath);
  return defaultService;
}

export function getDefaultAgentRecordService(): AgentRecordService {
  if (!defaultService) {
    throw new Error('AgentRecordService not initialized. Call initDefaultAgentRecordService first.');
  }
  return defaultService;
}

// Standalone functions that use the default service
export async function writeRecord(record: AgentRecord): Promise<void> {
  return getDefaultAgentRecordService().writeRecord(record);
}

export async function readRecord(specId: string, agentId: string): Promise<AgentRecord | null> {
  return getDefaultAgentRecordService().readRecord(specId, agentId);
}

export async function readAllRecords(): Promise<AgentRecord[]> {
  return getDefaultAgentRecordService().readAllRecords();
}

export async function updateRecord(specId: string, agentId: string, update: AgentRecordUpdate): Promise<void> {
  return getDefaultAgentRecordService().updateRecord(specId, agentId, update);
}

export function checkProcessAlive(pid: number): boolean {
  return getDefaultAgentRecordService().checkProcessAlive(pid);
}

// Backward compatibility aliases (deprecated)
/** @deprecated Use AgentRecord instead */
export type AgentPidFile = AgentRecord;
/** @deprecated Use AgentRecordUpdate instead */
export type PidFileUpdate = AgentRecordUpdate;
/** @deprecated Use AgentRecordService instead */
export const PidFileService = AgentRecordService;
/** @deprecated Use getAgentRecordService instead */
export const getPidFileService = getAgentRecordService;
/** @deprecated Use initDefaultAgentRecordService instead */
export const initDefaultPidFileService = initDefaultAgentRecordService;
/** @deprecated Use getDefaultAgentRecordService instead */
export const getDefaultPidFileService = getDefaultAgentRecordService;
/** @deprecated Use writeRecord instead */
export const writePidFile = writeRecord;
/** @deprecated Use readRecord instead */
export const readPidFile = readRecord;
/** @deprecated Use readAllRecords instead */
export const readAllPidFiles = readAllRecords;
/** @deprecated Use updateRecord instead */
export const updatePidFile = updateRecord;
/** @deprecated Use deleteRecord instead */
export const deletePidFile = (specId: string, agentId: string) =>
  getDefaultAgentRecordService().deleteRecord(specId, agentId);
