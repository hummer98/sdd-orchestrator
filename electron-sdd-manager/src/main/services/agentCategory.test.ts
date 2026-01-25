/**
 * AgentCategory Tests
 * Requirements: 1.1, 1.3, 1.5, 1.2, 1.4, 1.6
 *
 * Task 1.1: AgentCategory type definition
 * Task 1.2: Path resolution functions for new directory structure
 */

import { describe, it, expect } from 'vitest';
import {
  AgentCategory,
  determineCategory,
  getEntityIdFromSpecId,
  getMetadataPath,
  getLogPath,
  getCategoryBasePath,
} from './agentCategory';

describe('AgentCategory', () => {
  // =============================================================================
  // Task 1.1: AgentCategory type and determineCategory utility
  // =============================================================================
  describe('determineCategory (Task 1.1)', () => {
    it('should return "bugs" for specId starting with "bug:"', () => {
      expect(determineCategory('bug:login-error')).toBe('bugs');
      expect(determineCategory('bug:fix-123')).toBe('bugs');
    });

    it('should return "project" for empty string specId', () => {
      expect(determineCategory('')).toBe('project');
    });

    it('should return "specs" for regular specId', () => {
      expect(determineCategory('my-feature')).toBe('specs');
      expect(determineCategory('runtime-agents-restructure')).toBe('specs');
      expect(determineCategory('some-spec-123')).toBe('specs');
    });
  });

  describe('getEntityIdFromSpecId (Task 1.1)', () => {
    it('should extract bugId from "bug:" prefixed specId', () => {
      expect(getEntityIdFromSpecId('bug:login-error')).toBe('login-error');
      expect(getEntityIdFromSpecId('bug:fix-123')).toBe('fix-123');
    });

    it('should return empty string for empty specId (project)', () => {
      expect(getEntityIdFromSpecId('')).toBe('');
    });

    it('should return specId as-is for regular specId', () => {
      expect(getEntityIdFromSpecId('my-feature')).toBe('my-feature');
    });
  });

  // =============================================================================
  // Task 1.2: Path resolution functions
  // =============================================================================
  describe('getCategoryBasePath (Task 1.2)', () => {
    const basePath = '/project/.kiro/runtime/agents';

    it('should return specs path for specs category', () => {
      expect(getCategoryBasePath(basePath, 'specs', 'my-feature')).toBe(
        '/project/.kiro/runtime/agents/specs/my-feature'
      );
    });

    it('should return bugs path for bugs category', () => {
      expect(getCategoryBasePath(basePath, 'bugs', 'login-error')).toBe(
        '/project/.kiro/runtime/agents/bugs/login-error'
      );
    });

    it('should return project path without entityId for project category', () => {
      expect(getCategoryBasePath(basePath, 'project', '')).toBe(
        '/project/.kiro/runtime/agents/project'
      );
    });
  });

  describe('getMetadataPath (Task 1.2)', () => {
    const basePath = '/project/.kiro/runtime/agents';

    it('should return correct metadata path for specs', () => {
      // Requirements: 1.1 - spec-bound agent metadata at specs/{specId}/agent-{id}.json
      expect(getMetadataPath(basePath, 'specs', 'my-feature', 'agent-001')).toBe(
        '/project/.kiro/runtime/agents/specs/my-feature/agent-001.json'
      );
    });

    it('should return correct metadata path for bugs', () => {
      // Requirements: 1.3 - bug-bound agent metadata at bugs/{bugId}/agent-{id}.json
      expect(getMetadataPath(basePath, 'bugs', 'login-error', 'agent-002')).toBe(
        '/project/.kiro/runtime/agents/bugs/login-error/agent-002.json'
      );
    });

    it('should return correct metadata path for project (no entityId)', () => {
      // Requirements: 1.5 - project-level agent metadata at project/agent-{id}.json
      expect(getMetadataPath(basePath, 'project', '', 'agent-003')).toBe(
        '/project/.kiro/runtime/agents/project/agent-003.json'
      );
    });
  });

  describe('getLogPath (Task 1.2)', () => {
    const basePath = '/project/.kiro/runtime/agents';

    it('should return correct log path for specs', () => {
      // Requirements: 1.2 - spec-bound agent logs at specs/{specId}/logs/agent-{id}.log
      expect(getLogPath(basePath, 'specs', 'my-feature', 'agent-001')).toBe(
        '/project/.kiro/runtime/agents/specs/my-feature/logs/agent-001.log'
      );
    });

    it('should return correct log path for bugs', () => {
      // Requirements: 1.4 - bug-bound agent logs at bugs/{bugId}/logs/agent-{id}.log
      expect(getLogPath(basePath, 'bugs', 'login-error', 'agent-002')).toBe(
        '/project/.kiro/runtime/agents/bugs/login-error/logs/agent-002.log'
      );
    });

    it('should return correct log path for project (no entityId)', () => {
      // Requirements: 1.6 - project-level agent logs at project/logs/agent-{id}.log
      expect(getLogPath(basePath, 'project', '', 'agent-003')).toBe(
        '/project/.kiro/runtime/agents/project/logs/agent-003.log'
      );
    });
  });
});
