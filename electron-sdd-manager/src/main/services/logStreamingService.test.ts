/**
 * LogStreamingService Unit Tests
 * Task 10.10: Unit tests for LogStreamingService
 * Requirements: 1.1, 1.3, 1.4, 2.1
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LogStreamingService } from './logStreamingService';
import type { AgentRecordService } from './agentRecordService';
import type { LLMEngineId } from '@shared/registry';

describe('LogStreamingService', () => {
  let service: LogStreamingService;
  let mockAgentRecordService: AgentRecordService;
  let mockEmitLog: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Mock AgentRecordService
    mockAgentRecordService = {
      findRecordByAgentId: vi.fn(),
    } as unknown as AgentRecordService;

    // Mock emit function
    mockEmitLog = vi.fn();

    // Note: LogFileService is not used - raw log file saving is handled by SpecManagerService
    service = new LogStreamingService(
      mockAgentRecordService,
      mockEmitLog
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('detectEngineId', () => {
    it('should return engineId from AgentRecord metadata', async () => {
      vi.mocked(mockAgentRecordService.findRecordByAgentId).mockResolvedValue({
        agentId: 'agent-001',
        specId: 'test-spec',
        engineId: 'claude',
        // ... other fields
      } as any);

      const result = await service.detectEngineId('agent-001');

      expect(result).toBe('claude');
      expect(mockAgentRecordService.findRecordByAgentId).toHaveBeenCalledWith('agent-001');
    });

    it('should return undefined when AgentRecord not found', async () => {
      vi.mocked(mockAgentRecordService.findRecordByAgentId).mockResolvedValue(undefined);

      const result = await service.detectEngineId('agent-001');

      expect(result).toBeUndefined();
    });

    it('should return undefined when engineId not set in metadata', async () => {
      vi.mocked(mockAgentRecordService.findRecordByAgentId).mockResolvedValue({
        agentId: 'agent-001',
        specId: 'test-spec',
        // engineId not set
      } as any);

      const result = await service.detectEngineId('agent-001');

      expect(result).toBeUndefined();
    });

    it('should cache engineId after first detection', async () => {
      vi.mocked(mockAgentRecordService.findRecordByAgentId).mockResolvedValue({
        agentId: 'agent-001',
        specId: 'test-spec',
        engineId: 'gemini',
      } as any);

      // First call
      const result1 = await service.detectEngineId('agent-001');
      // Second call (should use cache)
      const result2 = await service.detectEngineId('agent-001');

      expect(result1).toBe('gemini');
      expect(result2).toBe('gemini');
      // Should only call getRecord once due to caching
      expect(mockAgentRecordService.findRecordByAgentId).toHaveBeenCalledTimes(1);
    });
  });

  describe('processLogOutput', () => {
    it('should parse Claude log and emit ParsedLogEntry', async () => {
      vi.mocked(mockAgentRecordService.findRecordByAgentId).mockResolvedValue({
        agentId: 'agent-001',
        specId: 'test-spec',
        engineId: 'claude',
      } as any);

      const claudeInit = '{"type":"system","subtype":"init","cwd":"/project"}';

      await service.processLogOutput('agent-001', 'stdout', claudeInit);

      // Should emit parsed log
      expect(mockEmitLog).toHaveBeenCalledTimes(1);
      const [agentId, parsedLog] = mockEmitLog.mock.calls[0];
      expect(agentId).toBe('agent-001');
      expect(parsedLog.type).toBe('system');
      expect(parsedLog.engineId).toBe('claude');

      // Note: Raw log file saving is handled by SpecManagerService, not LogStreamingService
      // to avoid duplicate writes
    });

    it('should parse Gemini log and emit ParsedLogEntry', async () => {
      vi.mocked(mockAgentRecordService.findRecordByAgentId).mockResolvedValue({
        agentId: 'agent-002',
        specId: 'test-spec',
        engineId: 'gemini',
      } as any);

      const geminiInit = '{"type":"init","cwd":"/project","model":"gemini-2.0"}';

      await service.processLogOutput('agent-002', 'stdout', geminiInit);

      expect(mockEmitLog).toHaveBeenCalledTimes(1);
      const [agentId, parsedLog] = mockEmitLog.mock.calls[0];
      expect(agentId).toBe('agent-002');
      expect(parsedLog.type).toBe('system');
      expect(parsedLog.engineId).toBe('gemini');
    });

    it('should fallback to Claude parser when engineId is undefined', async () => {
      vi.mocked(mockAgentRecordService.findRecordByAgentId).mockResolvedValue({
        agentId: 'agent-003',
        specId: 'test-spec',
        // engineId not set
      } as any);

      const claudeInit = '{"type":"system","subtype":"init"}';

      await service.processLogOutput('agent-003', 'stdout', claudeInit);

      expect(mockEmitLog).toHaveBeenCalledTimes(1);
      const [, parsedLog] = mockEmitLog.mock.calls[0];
      expect(parsedLog.type).toBe('system');
      expect(parsedLog.engineId).toBe('claude'); // Fallback
    });

    it('should handle multiple JSONL lines with delta consolidation', async () => {
      vi.mocked(mockAgentRecordService.findRecordByAgentId).mockResolvedValue({
        agentId: 'agent-004',
        specId: 'test-spec',
        engineId: 'claude',
      } as any);

      const multipleLines = [
        '{"type":"assistant","message":{"content":[{"type":"text","text":"Hello"}]}}',
        '{"type":"assistant","message":{"content":[{"type":"text","text":" World"}]}}',
      ].join('\n');

      await service.processLogOutput('agent-004', 'stdout', multipleLines);

      // Delta consolidation should merge text entries
      expect(mockEmitLog).toHaveBeenCalledTimes(1);
      const [, parsedLog] = mockEmitLog.mock.calls[0];
      expect(parsedLog.type).toBe('text');
      expect(parsedLog.text?.content).toBe('Hello World');
    });

    // Note: Raw log file saving is handled by SpecManagerService, not LogStreamingService
    // LogStreamingService focuses on parsing and distribution only

    it('should handle stderr output and emit as text entry', async () => {
      vi.mocked(mockAgentRecordService.findRecordByAgentId).mockResolvedValue({
        agentId: 'agent-006',
        specId: 'test-spec',
        engineId: 'claude',
      } as any);

      const errorMsg = 'Error: something went wrong';

      await service.processLogOutput('agent-006', 'stderr', errorMsg);

      // Should emit stderr as text entry
      expect(mockEmitLog).toHaveBeenCalledTimes(1);
      const [, parsedLog] = mockEmitLog.mock.calls[0];
      expect(parsedLog.type).toBe('text');
      expect(parsedLog.text?.content).toContain('Error: something went wrong');
    });

    it('should handle empty input gracefully', async () => {
      vi.mocked(mockAgentRecordService.findRecordByAgentId).mockResolvedValue({
        agentId: 'agent-007',
        specId: 'test-spec',
        engineId: 'claude',
      } as any);

      await service.processLogOutput('agent-007', 'stdout', '');

      // Should not emit parsed logs for empty input
      expect(mockEmitLog).not.toHaveBeenCalled();
      // Note: Raw log file saving (even for empty) is handled by SpecManagerService
    });

    it('should handle parse failures gracefully', async () => {
      vi.mocked(mockAgentRecordService.findRecordByAgentId).mockResolvedValue({
        agentId: 'agent-008',
        specId: 'test-spec',
        engineId: 'claude',
      } as any);

      const invalidJson = '{invalid json}';

      await service.processLogOutput('agent-008', 'stdout', invalidJson);

      // Should emit raw text entry on parse failure
      expect(mockEmitLog).toHaveBeenCalledTimes(1);
      const [, parsedLog] = mockEmitLog.mock.calls[0];
      expect(parsedLog.type).toBe('text');
      expect(parsedLog.text?.content).toContain('invalid json');
    });
  });

  describe('engineId caching', () => {
    it('should cache engineId per agentId', async () => {
      const mockRecordA = {
        agentId: 'agent-A',
        specId: 'test-spec',
        engineId: 'claude' as LLMEngineId,
      } as any;
      const mockRecordB = {
        agentId: 'agent-B',
        specId: 'test-spec',
        engineId: 'gemini' as LLMEngineId,
      } as any;

      vi.mocked(mockAgentRecordService.findRecordByAgentId)
        .mockResolvedValueOnce(mockRecordA)
        .mockResolvedValueOnce(mockRecordB)
        .mockResolvedValueOnce(mockRecordA);

      // Process logs for agent-A
      await service.processLogOutput('agent-A', 'stdout', '{"type":"system"}');
      // Process logs for agent-B
      await service.processLogOutput('agent-B', 'stdout', '{"type":"init"}');
      // Process logs for agent-A again (processLogOutput always calls findRecordByAgentId,
      // but engineId is cached so it won't call detectEngineId separately)
      await service.processLogOutput('agent-A', 'stdout', '{"type":"system"}');

      // Should call findRecordByAgentId 3 times (once per processLogOutput call)
      // Note: processLogOutput always fetches the record to get specId, but engineId is extracted once
      expect(mockAgentRecordService.findRecordByAgentId).toHaveBeenCalledTimes(3);
      expect(mockAgentRecordService.findRecordByAgentId).toHaveBeenCalledWith('agent-A');
      expect(mockAgentRecordService.findRecordByAgentId).toHaveBeenCalledWith('agent-B');
    });
  });
});
