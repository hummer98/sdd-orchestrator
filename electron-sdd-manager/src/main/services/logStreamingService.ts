/**
 * LogStreamingService
 * Task 10.1: Log Streaming Service implementation
 * Requirements: 1.1, 1.3, 1.4, 2.1, 2.3
 *
 * Provides real-time log parsing and distribution to IPC/WebSocket clients.
 * Integrates with unified parser for LLM-specific format handling.
 */

import { unifiedParser } from '../utils/unifiedParser';
import type { AgentRecordService } from './agentRecordService';
import type { ParsedLogEntry } from '@shared/utils/parserTypes';
import type { LLMEngineId } from '@shared/registry';

/**
 * Callback type for emitting parsed logs to clients
 */
export type EmitLogCallback = (agentId: string, log: ParsedLogEntry) => void;

/**
 * LogStreamingService
 *
 * Responsibilities:
 * - Detect LLM engine ID from AgentRecord metadata
 * - Parse raw log output using unified parser
 * - Emit parsed logs to IPC/WebSocket clients
 *
 * Note: Raw log file saving is handled by SpecManagerService.handleAgentOutput
 * to avoid duplicate writes. LogStreamingService focuses on parsing and distribution.
 *
 * Requirements:
 * - 1.1: Main process log parsing
 * - 1.3: engineId-based parser selection
 * - 1.4: Claude fallback for backward compatibility
 * - 2.1: Delta consolidation
 * - 2.3: IPC/WebSocket distribution
 */
export class LogStreamingService {
  private agentRecordService: AgentRecordService;
  private emitLog: EmitLogCallback;

  /**
   * Cache for engineId per agentId to avoid repeated metadata lookups
   * Key: agentId, Value: LLMEngineId
   */
  private engineIdCache = new Map<string, LLMEngineId | undefined>();

  constructor(
    agentRecordService: AgentRecordService,
    emitLog: EmitLogCallback
  ) {
    this.agentRecordService = agentRecordService;
    this.emitLog = emitLog;
  }

  /**
   * Detect engineId from AgentRecord metadata
   *
   * @param agentId - Agent identifier
   * @returns LLMEngineId if available, undefined otherwise
   *
   * Requirements:
   * - 1.3: engineId-based parser selection
   * - 1.4: undefined triggers fallback to Claude
   */
  async detectEngineId(agentId: string): Promise<LLMEngineId | undefined> {
    // Check cache first
    if (this.engineIdCache.has(agentId)) {
      return this.engineIdCache.get(agentId);
    }

    // Fetch from AgentRecordService
    const record = await this.agentRecordService.findRecordByAgentId(agentId);

    if (!record) {
      console.warn(
        `[logStreamingService] AgentRecord not found for agentId: ${agentId}`
      );
      this.engineIdCache.set(agentId, undefined);
      return undefined;
    }

    const engineId = record.engineId;

    if (!engineId) {
      console.warn(
        `[logStreamingService] engineId not set for agentId: ${agentId}, will fallback to Claude`
      );
    }

    // Cache the result
    this.engineIdCache.set(agentId, engineId);

    return engineId;
  }

  /**
   * Process log output from agent process
   *
   * Workflow:
   * 1. Detect engineId (with caching)
   * 2. Parse raw data using unified parser
   * 3. Emit parsed entries to IPC/WebSocket clients
   *
   * Note: Raw log file saving is handled by SpecManagerService.handleAgentOutput
   * to avoid duplicate writes. LogStreamingService focuses on parsing and distribution.
   *
   * @param agentId - Agent identifier
   * @param stream - stdout or stderr
   * @param data - Raw log data from agent process
   *
   * Requirements:
   * - 1.1: Main process log parsing
   * - 2.1: Delta consolidation (via unified parser)
   * - 2.3: IPC/WebSocket distribution
   */
  async processLogOutput(
    agentId: string,
    _stream: 'stdout' | 'stderr',
    data: string
  ): Promise<void> {
    // Get agent record to determine specId and engineId (single lookup)
    const record = await this.agentRecordService.findRecordByAgentId(agentId);
    if (!record) {
      console.error(
        `[logStreamingService] AgentRecord not found for agentId: ${agentId}, cannot process log`
      );
      return;
    }

    const engineId = record.engineId;

    // Cache engineId for future use
    if (!this.engineIdCache.has(agentId)) {
      this.engineIdCache.set(agentId, engineId);
    }

    if (!engineId) {
      console.warn(
        `[logStreamingService] engineId not set for agentId: ${agentId}, will fallback to Claude`
      );
    }

    // Parse and emit (only for non-empty stdout/stderr)
    if (!data.trim()) {
      return; // Skip empty input
    }

    // Parse data using unified parser
    const parsedEntries = unifiedParser.parseData(data, engineId);

    // Emit parsed entries to IPC/WebSocket clients
    for (const parsedEntry of parsedEntries) {
      this.emitLog(agentId, parsedEntry);
    }
  }

  /**
   * Clear engineId cache for specific agent
   * Useful when agent configuration changes
   */
  clearCache(agentId: string): void {
    this.engineIdCache.delete(agentId);
  }

  /**
   * Clear all cached engineIds
   * Useful for testing or cache invalidation
   */
  clearAllCaches(): void {
    this.engineIdCache.clear();
  }
}
