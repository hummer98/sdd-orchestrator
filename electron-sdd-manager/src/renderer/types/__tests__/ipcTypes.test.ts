/**
 * IPC Type Definitions Tests
 * file-change-push-notification: Task 1.1, 1.2, 1.3
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */

import { describe, it, expect } from 'vitest';
import type { SpecsChangeEvent, BugsChangeEvent } from '../electron';
import type { SpecJson } from '../index';
import type { BugJson } from '../bugJson';
import type { AgentRecordChangeEvent } from '../../../main/services/agentRecordWatcherService';

describe('IPC Type Definitions - file-change-push-notification', () => {
  describe('SpecsChangeEvent', () => {
    it('should allow content field with SpecJson type', () => {
      const specJson: SpecJson = {
        feature_name: 'my-feature',
        created_at: '2026-01-31T00:00:00Z',
        updated_at: '2026-01-31T00:00:00Z',
        language: 'ja',
        phase: 'requirements-generated',
        approvals: {
          requirements: { generated: false, approved: false },
          design: { generated: false, approved: false },
          tasks: { generated: false, approved: false },
        },
      };

      const event: SpecsChangeEvent = {
        type: 'change',
        path: '/path/to/spec.json',
        specId: 'my-feature',
        content: specJson,
      };

      expect(event.content).toBeDefined();
      expect(event.type).toBe('change');
    });

    it('should allow content field with string type for artifacts', () => {
      const event: SpecsChangeEvent = {
        type: 'change',
        path: '/path/to/requirements.md',
        specId: 'my-feature',
        content: '# Requirements\n\nContent here',
      };

      expect(event.content).toBeDefined();
      expect(typeof event.content).toBe('string');
    });

    it('should allow content to be null on error', () => {
      const event: SpecsChangeEvent = {
        type: 'change',
        path: '/path/to/spec.json',
        specId: 'my-feature',
        content: null,
        error: 'File read failed',
      };

      expect(event.content).toBeNull();
      expect(event.error).toBe('File read failed');
    });

    it('should allow content to be undefined (backward compatibility)', () => {
      const event: SpecsChangeEvent = {
        type: 'change',
        path: '/path/to/spec.json',
        specId: 'my-feature',
      };

      expect(event.content).toBeUndefined();
    });

    it('should allow error field for file read failures', () => {
      const event: SpecsChangeEvent = {
        type: 'change',
        path: '/path/to/spec.json',
        specId: 'my-feature',
        content: null,
        error: 'Permission denied',
      };

      expect(event.error).toBeDefined();
      expect(event.error).toBe('Permission denied');
    });
  });

  describe('BugsChangeEvent', () => {
    it('should allow content field with BugJson type', () => {
      const bugJson: BugJson = {
        bug_name: 'my-bug',
        created_at: '2026-01-31T00:00:00Z',
        updated_at: '2026-01-31T00:00:00Z',
        phase: 'analyzed',
      };

      const event: BugsChangeEvent = {
        type: 'change',
        path: '/path/to/bug.json',
        bugName: 'my-bug',
        content: bugJson,
      };

      expect(event.content).toBeDefined();
      expect(event.content?.bug_name).toBe('my-bug');
    });

    it('should allow content to be null on error', () => {
      const event: BugsChangeEvent = {
        type: 'change',
        path: '/path/to/bug.json',
        bugName: 'my-bug',
        content: null,
        error: 'File read failed',
      };

      expect(event.content).toBeNull();
      expect(event.error).toBe('File read failed');
    });

    it('should allow content to be undefined (backward compatibility)', () => {
      const event: BugsChangeEvent = {
        type: 'change',
        path: '/path/to/bug.json',
        bugName: 'my-bug',
      };

      expect(event.content).toBeUndefined();
    });

    it('should allow error field for file read failures', () => {
      const event: BugsChangeEvent = {
        type: 'change',
        path: '/path/to/bug.json',
        bugName: 'my-bug',
        content: null,
        error: 'File not found',
      };

      expect(event.error).toBeDefined();
      expect(event.error).toBe('File not found');
    });
  });

  describe('AgentRecordChangeEvent', () => {
    it('should allow content field with AgentRecord type structure', () => {
      const event: AgentRecordChangeEvent = {
        type: 'change',
        path: '/path/to/agent-001.json',
        agentId: 'agent-001',
        specId: 'my-feature',
        content: {
          agentId: 'agent-001',
          specId: 'my-feature',
          phase: 'requirements',
          pid: 12345,
          sessionId: 'session-uuid',
          status: 'running',
          startedAt: '2026-01-31T00:00:00Z',
          lastActivityAt: '2026-01-31T00:00:00Z',
          command: 'claude',
        },
      };

      expect(event.content).toBeDefined();
      expect(event.content?.agentId).toBe('agent-001');
    });

    it('should allow content to be null on error', () => {
      const event: AgentRecordChangeEvent = {
        type: 'change',
        path: '/path/to/agent-001.json',
        agentId: 'agent-001',
        content: null,
        error: 'File read failed',
      };

      expect(event.content).toBeNull();
      expect(event.error).toBe('File read failed');
    });

    it('should allow content to be undefined (backward compatibility)', () => {
      const event: AgentRecordChangeEvent = {
        type: 'change',
        path: '/path/to/agent-001.json',
        agentId: 'agent-001',
      };

      expect(event.content).toBeUndefined();
    });
  });
});
