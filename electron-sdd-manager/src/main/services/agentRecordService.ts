/**
 * Agent Record Service
 * Manages Agent record files for SDD Agent persistence and history
 * Requirements: 5.5, 5.6, 5.7
 *
 * agent-state-file-ssot: This service is the Single Source of Truth (SSOT)
 * for agent state. All agent state reads and writes go through this service.
 *
 * Bug fix: agent-record-json-corruption
 * - Added per-agent mutex to prevent race conditions in updateRecord
 * - Added throttling for lastActivityAt updates to reduce write frequency
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { type AgentCategory, getCategoryBasePath, getMetadataPath } from './agentCategory';

// Agent status types - SSOT for agent state
// agent-state-file-ssot: Moved from agentRegistry.ts
export type AgentStatus = 'running' | 'completed' | 'interrupted' | 'hang' | 'failed';

// AgentInfo interface for compatibility with existing code
// agent-state-file-ssot: This is the same as AgentRecord for read operations
export interface AgentInfo {
  readonly agentId: string;
  readonly specId: string;
  readonly phase: string;
  readonly pid: number;
  readonly sessionId: string;
  readonly status: AgentStatus;
  readonly startedAt: string;
  readonly lastActivityAt: string;
  readonly command: string;
  /** Working directory used when agent was started. Required for resume in worktree mode. */
  readonly cwd?: string;
  /** Prompt used to start the agent */
  readonly prompt?: string;
}

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
  /** Working directory used when agent was started. Required for resume in worktree mode. */
  cwd?: string;
  /** Prompt used to start the agent */
  prompt?: string;
}

export type AgentRecordUpdate = Partial<Pick<AgentRecord, 'status' | 'lastActivityAt' | 'pid' | 'sessionId' | 'command'>>;

/**
 * Simple mutex implementation for per-agent locking
 * Bug fix: agent-record-json-corruption
 */
class AgentMutex {
  private locks: Map<string, Promise<void>> = new Map();

  async acquire(key: string): Promise<() => void> {
    // Wait for any existing lock to release
    while (this.locks.has(key)) {
      await this.locks.get(key);
    }

    // Create a new lock
    let release: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.locks.set(key, lockPromise);

    // Return release function
    return () => {
      this.locks.delete(key);
      release!();
    };
  }
}

/**
 * Throttle state for lastActivityAt updates
 * Bug fix: agent-record-json-corruption
 */
interface ThrottleState {
  lastWriteTime: number;
  pendingUpdate: AgentRecordUpdate | null;
  timer: ReturnType<typeof setTimeout> | null;
}

// Throttle interval in milliseconds (1 second)
const ACTIVITY_UPDATE_THROTTLE_MS = 1000;

/**
 * Service for managing Agent record files
 */
export class AgentRecordService {
  private basePath: string;
  private mutex: AgentMutex = new AgentMutex();
  private throttleStates: Map<string, ThrottleState> = new Map();

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  /**
   * Get throttle key for an agent
   */
  private getThrottleKey(specId: string, agentId: string): string {
    return `${specId}/${agentId}`;
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
   * @deprecated Use readRecordsForSpec instead for scoped reads (agent-state-file-ssot)
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
   * Read agent records for a specific spec
   * Requirements: 1.1 (agent-state-file-ssot)
   * @param specId - The spec ID to read records for
   * @returns Array of AgentRecord for the specified spec
   */
  async readRecordsForSpec(specId: string): Promise<AgentRecord[]> {
    const result: AgentRecord[] = [];
    const specPath = path.join(this.basePath, specId);

    try {
      const files = await fs.readdir(specPath);

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const agentId = file.replace('.json', '');
        try {
          const record = await this.readRecord(specId, agentId);
          if (record) {
            result.push(record);
          }
        } catch {
          // Skip corrupted JSON files - log would be useful but not required
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // Spec directory doesn't exist yet
        return [];
      }
      throw error;
    }

    return result;
  }

  /**
   * Read project-level agent records (specId = "")
   * Requirements: 1.2 (agent-state-file-ssot)
   * ProjectAgent records are stored in root directory with empty specId
   * @returns Array of AgentRecord for project-level agents
   */
  async readProjectAgents(): Promise<AgentRecord[]> {
    // ProjectAgents use empty string as specId, stored in base directory directly
    return this.readRecordsForSpec('');
  }

  /**
   * Get running agent counts per spec
   * Requirements: 1.3 (agent-state-file-ssot)
   * Scans all agent records and counts running agents per spec
   * @returns Map of specId to running agent count
   */
  async getRunningAgentCounts(): Promise<Map<string, number>> {
    const counts = new Map<string, number>();

    try {
      // Get all entries in base directory
      const entries = await fs.readdir(this.basePath, { withFileTypes: true });

      // Check for ProjectAgents (empty specId) - JSON files directly in basePath
      const projectAgentFiles = entries.filter((e) => e.isFile() && e.name.endsWith('.json'));
      if (projectAgentFiles.length > 0) {
        const projectAgents = await this.readProjectAgents();
        const runningCount = projectAgents.filter((r) => r.status === 'running').length;
        counts.set('', runningCount);
      }

      // Process spec directories
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const specId = entry.name;
        const records = await this.readRecordsForSpec(specId);

        const runningCount = records.filter((r) => r.status === 'running').length;
        counts.set(specId, runningCount);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // Base directory doesn't exist yet
        return counts;
      }
      throw error;
    }

    return counts;
  }

  /**
   * Get all spec IDs that have agent records
   * Requirements: agent-state-file-ssot (for getAllAgents)
   * Bug fix: project-agent-no-response - Include empty specId for ProjectAgents
   * @returns Array of spec IDs (directory names under basePath, plus '' for ProjectAgents)
   */
  async getAllSpecIds(): Promise<string[]> {
    try {
      const entries = await fs.readdir(this.basePath, { withFileTypes: true });
      const specIds: string[] = [];

      // Check for ProjectAgents (empty specId) - JSON files directly in basePath
      const hasProjectAgents = entries.some((e) => e.isFile() && e.name.endsWith('.json'));
      if (hasProjectAgents) {
        specIds.push(''); // Empty specId for ProjectAgents
      }

      // Add spec/bug directories
      specIds.push(...entries.filter((d) => d.isDirectory()).map((d) => d.name));

      return specIds;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Find an agent record by agentId across all specs
   * Requirements: agent-state-file-ssot (for getAgentById)
   * @param agentId - The agent ID to search for
   * @returns AgentRecord if found, null otherwise
   */
  async findRecordByAgentId(agentId: string): Promise<AgentRecord | null> {
    const specIds = await this.getAllSpecIds();

    for (const specId of specIds) {
      const record = await this.readRecord(specId, agentId);
      if (record) {
        return record;
      }
    }

    return null;
  }

  /**
   * Update an agent record with mutex protection
   * Requirements: 5.5, 5.6
   * Bug fix: agent-record-json-corruption - Added mutex to prevent race conditions
   */
  async updateRecord(specId: string, agentId: string, update: AgentRecordUpdate): Promise<void> {
    const key = this.getThrottleKey(specId, agentId);

    // Acquire mutex for this agent
    const release = await this.mutex.acquire(key);

    try {
      const record = await this.readRecord(specId, agentId);

      if (!record) {
        throw new Error(`Agent record not found: ${specId}/${agentId}`);
      }

      const updatedRecord: AgentRecord = {
        ...record,
        ...update,
      };

      await this.writeRecord(updatedRecord);
    } finally {
      release();
    }
  }

  /**
   * Update lastActivityAt with throttling to reduce write frequency
   * Bug fix: agent-record-json-corruption - Throttled updates to prevent race conditions
   * @param specId - The spec ID
   * @param agentId - The agent ID
   * @param update - The update to apply (should contain lastActivityAt)
   */
  updateActivityThrottled(specId: string, agentId: string, update: AgentRecordUpdate): void {
    const key = this.getThrottleKey(specId, agentId);
    const now = Date.now();

    let state = this.throttleStates.get(key);
    if (!state) {
      state = { lastWriteTime: 0, pendingUpdate: null, timer: null };
      this.throttleStates.set(key, state);
    }

    // Check if we can write immediately
    const timeSinceLastWrite = now - state.lastWriteTime;
    if (timeSinceLastWrite >= ACTIVITY_UPDATE_THROTTLE_MS) {
      // Write immediately
      state.lastWriteTime = now;
      state.pendingUpdate = null;
      if (state.timer) {
        clearTimeout(state.timer);
        state.timer = null;
      }
      this.updateRecord(specId, agentId, update).catch(() => {
        // Ignore errors for activity updates
      });
    } else {
      // Schedule a delayed write
      state.pendingUpdate = update;
      if (!state.timer) {
        const delay = ACTIVITY_UPDATE_THROTTLE_MS - timeSinceLastWrite;
        state.timer = setTimeout(() => {
          const currentState = this.throttleStates.get(key);
          if (currentState && currentState.pendingUpdate) {
            currentState.lastWriteTime = Date.now();
            const pendingUpdate = currentState.pendingUpdate;
            currentState.pendingUpdate = null;
            currentState.timer = null;
            this.updateRecord(specId, agentId, pendingUpdate).catch(() => {
              // Ignore errors for activity updates
            });
          }
        }, delay);
      }
    }
  }

  /**
   * Clear throttle state for an agent (call when agent completes)
   * Bug fix: agent-record-json-corruption
   */
  clearThrottleState(specId: string, agentId: string): void {
    const key = this.getThrottleKey(specId, agentId);
    const state = this.throttleStates.get(key);
    if (state) {
      if (state.timer) {
        clearTimeout(state.timer);
      }
      this.throttleStates.delete(key);
    }
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

  // =============================================================================
  // runtime-agents-restructure: Category-aware operations
  // Requirements: 3.1, 1.1, 1.3, 1.5, 3.2, 3.3, 3.4
  // =============================================================================

  /**
   * Get file path using category-aware structure
   * @param category - 'specs' | 'bugs' | 'project'
   * @param entityId - specId or bugId (empty for project)
   * @param agentId - agent ID
   */
  private getFilePathWithCategory(category: AgentCategory, entityId: string, agentId: string): string {
    return getMetadataPath(this.basePath, category, entityId, agentId);
  }

  /**
   * Write an agent record to category-aware path
   * Requirements: 1.1, 1.3, 1.5, 3.1
   * @param category - 'specs' | 'bugs' | 'project'
   * @param entityId - specId or bugId (empty for project)
   * @param record - agent record to write
   */
  async writeRecordWithCategory(category: AgentCategory, entityId: string, record: AgentRecord): Promise<void> {
    const dirPath = getCategoryBasePath(this.basePath, category, entityId);
    const filePath = this.getFilePathWithCategory(category, entityId, record.agentId);

    // Ensure directory exists
    await fs.mkdir(dirPath, { recursive: true });

    // Write file
    await fs.writeFile(filePath, JSON.stringify(record, null, 2), 'utf-8');
  }

  /**
   * Read an agent record from category-aware path
   * @param category - 'specs' | 'bugs' | 'project'
   * @param entityId - specId or bugId (empty for project)
   * @param agentId - agent ID
   */
  async readRecordWithCategory(category: AgentCategory, entityId: string, agentId: string): Promise<AgentRecord | null> {
    const filePath = this.getFilePathWithCategory(category, entityId, agentId);

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
   * Read agent records for a specific category and entity
   * Requirements: 3.2, 3.3, 3.4
   * @param category - 'specs' | 'bugs' | 'project'
   * @param entityId - specId or bugId (empty for project)
   */
  async readRecordsFor(category: AgentCategory, entityId: string): Promise<AgentRecord[]> {
    const result: AgentRecord[] = [];
    const categoryPath = getCategoryBasePath(this.basePath, category, entityId);

    try {
      const files = await fs.readdir(categoryPath);

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const agentId = file.replace('.json', '');
        try {
          const record = await this.readRecordWithCategory(category, entityId, agentId);
          if (record) {
            result.push(record);
          }
        } catch {
          // Skip corrupted JSON files
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // Directory doesn't exist yet
        return [];
      }
      throw error;
    }

    return result;
  }

  /**
   * Read agent records for a bug
   * Requirements: 3.3
   * @param bugId - bug ID (without 'bug:' prefix)
   */
  async readRecordsForBug(bugId: string): Promise<AgentRecord[]> {
    return this.readRecordsFor('bugs', bugId);
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
