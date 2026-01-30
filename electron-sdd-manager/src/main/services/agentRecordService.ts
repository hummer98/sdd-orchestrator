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
import { type AgentCategory, getCategoryBasePath, getMetadataPath, determineCategory, getEntityIdFromSpecId } from './agentCategory';
import type { LLMEngineId } from '@shared/registry';
import type { ExitReason } from './agentLifecycleTypes';

// Agent status types - SSOT for agent state
// agent-state-file-ssot: Moved from agentRegistry.ts
// Extended for agent-lifecycle-management: added timed_out, stopping, killing, stopped
export type AgentStatus =
  | 'running'
  | 'completed'
  | 'interrupted'
  | 'hang'
  | 'failed'
  | 'timed_out'
  | 'stopping'
  | 'killing'
  | 'stopped';

/**
 * Execution history entry for agent lifecycle tracking
 * metrics-file-based-tracking: Task 1.1 - ExecutionEntry type definition
 * Requirements: 1.1, 1.2, 1.3
 */
export interface ExecutionEntry {
  /** Execution start timestamp (ISO 8601 UTC) */
  startedAt: string;
  /** Execution end timestamp (ISO 8601 UTC). Undefined means running or abnormally terminated */
  endedAt?: string;
  /** Prompt used for this execution */
  prompt: string;
}

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
  /**
   * LLM engine ID used for this agent
   * llm-stream-log-parser: Task 6.1 - engineId in AgentRecord
   * Requirements: 2.1
   */
  readonly engineId?: LLMEngineId;
  /**
   * Execution history for metrics tracking
   * metrics-file-based-tracking: Task 1.1 - executions field in AgentInfo
   * Requirements: 1.1, 1.3
   * New records use this instead of startedAt for metrics calculation
   */
  readonly executions?: ExecutionEntry[];
  /**
   * Auto-resume attempt count
   * agent-stale-recovery: Task 1.1 - autoResumeCount field in AgentInfo
   * Requirements: 5.1
   * undefined = count not started (backward compatibility with existing records)
   * 0 = new execution or manual resume
   * 1-3 = auto-resume attempt in progress
   */
  readonly autoResumeCount?: number;
  /** OS-level process start time (Requirement: 4.1) */
  readonly processStartTime?: string;
  /** Reason for agent termination (Requirement: 8.2) */
  readonly exitReason?: ExitReason;
}

export interface AgentRecord {
  agentId: string;
  specId: string;
  phase: string;
  pid: number;
  sessionId: string;
  status: AgentStatus;
  /** Legacy start timestamp. New records should use executions[0].startedAt instead */
  startedAt: string;
  lastActivityAt: string;
  command: string;
  /** Working directory used when agent was started. Required for resume in worktree mode. */
  cwd?: string;
  /** Prompt used to start the agent */
  prompt?: string;
  /**
   * LLM engine ID used for this agent
   * llm-stream-log-parser: Task 6.1 - engineId in AgentRecord
   * Requirements: 2.1
   */
  engineId?: LLMEngineId;
  /**
   * Execution history for metrics tracking
   * metrics-file-based-tracking: Task 1.1 - executions field in AgentRecord
   * Requirements: 1.1, 1.2, 1.3
   * New records use this field for metrics calculation instead of startedAt
   */
  executions?: ExecutionEntry[];
  /**
   * Auto-resume attempt count
   * agent-stale-recovery: Task 1.1 - autoResumeCount field in AgentRecord
   * Requirements: 5.1
   * undefined = count not started (backward compatibility with existing records)
   * 0 = new execution or manual resume
   * 1-3 = auto-resume attempt in progress
   */
  autoResumeCount?: number;
  /** OS-level process start time (Requirement: 4.1) */
  processStartTime?: string;
  /** Reason for agent termination (Requirement: 8.2) */
  exitReason?: ExitReason;
}

/**
 * Update type for agent records
 * metrics-file-based-tracking: Task 1.1 - Added executions field
 * agent-stale-recovery: Task 1.1 - Added autoResumeCount field
 * agent-lifecycle-management: Added processStartTime and exitReason fields
 * Requirements: 6.2, 5.1, 4.1, 8.2
 */
export type AgentRecordUpdate = Partial<Pick<AgentRecord, 'status' | 'lastActivityAt' | 'pid' | 'sessionId' | 'command' | 'executions' | 'autoResumeCount' | 'processStartTime' | 'exitReason'>>;

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
   * agent-stale-recovery Task 14.2: Reset autoResumeCount to 0 for new agent creation
   * Requirements: 5.4 - Reset autoResumeCount on new execution
   * runtime-agents-restructure Task 7.4: Use category-aware writeRecordWithCategory
   */
  async writeRecord(record: AgentRecord): Promise<void> {
    // runtime-agents-restructure Task 7.4: Determine category and delegate to category-aware method
    const category = determineCategory(record.specId);
    const entityId = getEntityIdFromSpecId(record.specId);

    // agent-stale-recovery Task 14.2: Reset autoResumeCount to 0 for new agent creation
    // Requirements: 5.4 - New execution or manual resume should reset count
    // If autoResumeCount is not explicitly set, default to 0
    const recordToWrite: AgentRecord = {
      ...record,
      autoResumeCount: record.autoResumeCount ?? 0,
    };

    await this.writeRecordWithCategory(category, entityId, recordToWrite);
  }

  /**
   * Read an agent record
   * Requirements: 5.6
   * runtime-agents-restructure Task 7.4: Use category-aware readRecordWithCategory
   */
  async readRecord(specId: string, agentId: string): Promise<AgentRecord | null> {
    // runtime-agents-restructure Task 7.4: Determine category and delegate to category-aware method
    const category = determineCategory(specId);
    const entityId = getEntityIdFromSpecId(specId);

    return this.readRecordWithCategory(category, entityId, agentId);
  }

  /**
   * Read all agent records from all categories
   * Requirements: 5.6
   * runtime-agents-restructure: Scans category-aware directory structure
   * @deprecated Use readRecordsForSpec instead for scoped reads (agent-state-file-ssot)
   */
  async readAllRecords(): Promise<AgentRecord[]> {
    const result: AgentRecord[] = [];

    try {
      // Read project agents
      const projectAgents = await this.readProjectAgents();
      result.push(...projectAgents);

      // Read specs category
      const specsPath = path.join(this.basePath, 'specs');
      try {
        const specEntries = await fs.readdir(specsPath, { withFileTypes: true });
        for (const entry of specEntries) {
          if (!entry.isDirectory()) continue;

          const specId = entry.name;
          const records = await this.readRecordsForSpec(specId);
          result.push(...records);
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error;
        }
        // specs directory doesn't exist yet, skip
      }

      // Read bugs category
      const bugsPath = path.join(this.basePath, 'bugs');
      try {
        const bugEntries = await fs.readdir(bugsPath, { withFileTypes: true });
        for (const entry of bugEntries) {
          if (!entry.isDirectory()) continue;

          const bugId = entry.name;
          const records = await this.readRecordsForBug(bugId);
          result.push(...records);
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error;
        }
        // bugs directory doesn't exist yet, skip
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
   * runtime-agents-restructure Task 2.3: Wrapper around readRecordsFor('specs', specId)
   * @param specId - The spec ID to read records for
   * @returns Array of AgentRecord for the specified spec
   */
  async readRecordsForSpec(specId: string): Promise<AgentRecord[]> {
    // runtime-agents-restructure Task 2.3: Delegate to category-aware method
    const category = determineCategory(specId);
    const entityId = getEntityIdFromSpecId(specId);
    return this.readRecordsFor(category, entityId);
  }

  /**
   * Read project-level agent records (specId = "")
   * Requirements: 1.2 (agent-state-file-ssot)
   * runtime-agents-restructure Task 2.3: Wrapper around readRecordsFor('project', '')
   * @returns Array of AgentRecord for project-level agents
   */
  async readProjectAgents(): Promise<AgentRecord[]> {
    // runtime-agents-restructure Task 2.3: Delegate to category-aware method
    return this.readRecordsFor('project', '');
  }

  /**
   * Get running agent counts per spec
   * Requirements: 1.3 (agent-state-file-ssot)
   * runtime-agents-restructure: Scans category-aware directory structure
   * @returns Map of specId to running agent count
   */
  async getRunningAgentCounts(): Promise<Map<string, number>> {
    const counts = new Map<string, number>();

    try {
      // Check for ProjectAgents
      const projectAgents = await this.readProjectAgents();
      if (projectAgents.length > 0) {
        const runningCount = projectAgents.filter((r) => r.status === 'running').length;
        counts.set('', runningCount);
      }

      // Process specs category
      const specsPath = path.join(this.basePath, 'specs');
      try {
        const specEntries = await fs.readdir(specsPath, { withFileTypes: true });
        for (const entry of specEntries) {
          if (!entry.isDirectory()) continue;

          const specId = entry.name;
          const records = await this.readRecordsForSpec(specId);
          const runningCount = records.filter((r) => r.status === 'running').length;
          counts.set(specId, runningCount);
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error;
        }
        // specs directory doesn't exist yet, skip
      }

      // Process bugs category
      const bugsPath = path.join(this.basePath, 'bugs');
      try {
        const bugEntries = await fs.readdir(bugsPath, { withFileTypes: true });
        for (const entry of bugEntries) {
          if (!entry.isDirectory()) continue;

          const bugId = entry.name;
          const specId = `bug:${bugId}`;
          const records = await this.readRecordsForBug(bugId);
          const runningCount = records.filter((r) => r.status === 'running').length;
          counts.set(specId, runningCount);
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error;
        }
        // bugs directory doesn't exist yet, skip
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
   * runtime-agents-restructure: Scans category-aware directory structure
   * @returns Array of spec IDs (specIds from specs/, bug:bugIds from bugs/, '' for project)
   */
  async getAllSpecIds(): Promise<string[]> {
    try {
      const specIds: string[] = [];

      // Check for ProjectAgents
      const projectAgents = await this.readProjectAgents();
      if (projectAgents.length > 0) {
        specIds.push(''); // Empty specId for ProjectAgents
      }

      // Add specs from specs/ directory
      const specsPath = path.join(this.basePath, 'specs');
      try {
        const specEntries = await fs.readdir(specsPath, { withFileTypes: true });
        const specs = specEntries.filter((d) => d.isDirectory()).map((d) => d.name);
        specIds.push(...specs);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error;
        }
        // specs directory doesn't exist yet, skip
      }

      // Add bugs from bugs/ directory (with bug: prefix)
      const bugsPath = path.join(this.basePath, 'bugs');
      try {
        const bugEntries = await fs.readdir(bugsPath, { withFileTypes: true });
        const bugs = bugEntries
          .filter((d) => d.isDirectory())
          .map((d) => `bug:${d.name}`);
        specIds.push(...bugs);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error;
        }
        // bugs directory doesn't exist yet, skip
      }

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
   * runtime-agents-restructure Task 7.4: Use category-aware paths
   */
  async deleteRecord(specId: string, agentId: string): Promise<void> {
    // Determine category and entity ID
    const category = determineCategory(specId);
    const entityId = getEntityIdFromSpecId(specId);
    const filePath = this.getFilePathWithCategory(category, entityId, agentId);

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
