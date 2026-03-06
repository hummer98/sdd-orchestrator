/**
 * Test for API abstraction layer types
 * Validates that all required types and interfaces are defined
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const typesPath = resolve(__dirname, 'types.ts');

describe('API types', () => {
  it('should exist', () => {
    expect(existsSync(typesPath)).toBe(true);
  });

  describe('Result type', () => {
    it('should define Result type', () => {
      const content = readFileSync(typesPath, 'utf-8');
      expect(content).toContain('export type Result<T, E>');
    });
  });

  describe('ApiError type', () => {
    it('should define ApiError interface', () => {
      const content = readFileSync(typesPath, 'utf-8');
      expect(content).toContain('export interface ApiError');
    });

    it('should have type field', () => {
      const content = readFileSync(typesPath, 'utf-8');
      expect(content).toMatch(/interface ApiError[\s\S]*type:\s*string/);
    });

    it('should have message field', () => {
      const content = readFileSync(typesPath, 'utf-8');
      expect(content).toMatch(/interface ApiError[\s\S]*message:\s*string/);
    });
  });

  describe('ApiClient interface', () => {
    it('should define ApiClient interface', () => {
      const content = readFileSync(typesPath, 'utf-8');
      expect(content).toContain('export interface ApiClient');
    });

    // Spec operations
    it('should have getSpecs method', () => {
      const content = readFileSync(typesPath, 'utf-8');
      expect(content).toContain('getSpecs():');
    });

    it('should have getSpecDetail method', () => {
      const content = readFileSync(typesPath, 'utf-8');
      expect(content).toContain('getSpecDetail(');
    });

    it('should have executePhase method', () => {
      const content = readFileSync(typesPath, 'utf-8');
      expect(content).toContain('executePhase(');
    });

    it('should have updateApproval method', () => {
      const content = readFileSync(typesPath, 'utf-8');
      expect(content).toContain('updateApproval(');
    });

    // Bug operations removed (github-issue-integration)

    // Agent operations
    it('should have getAgents method', () => {
      const content = readFileSync(typesPath, 'utf-8');
      expect(content).toContain('getAgents():');
    });

    it('should have stopAgent method', () => {
      const content = readFileSync(typesPath, 'utf-8');
      expect(content).toContain('stopAgent(');
    });

    it('should have resumeAgent method', () => {
      const content = readFileSync(typesPath, 'utf-8');
      expect(content).toContain('resumeAgent(');
    });

    it('should have sendAgentInput method', () => {
      const content = readFileSync(typesPath, 'utf-8');
      expect(content).toContain('sendAgentInput(');
    });

    // Review operations
    it('should have executeDocumentReview method', () => {
      const content = readFileSync(typesPath, 'utf-8');
      expect(content).toContain('executeDocumentReview(');
    });

    it('should have executeInspection method', () => {
      const content = readFileSync(typesPath, 'utf-8');
      expect(content).toContain('executeInspection(');
    });

    // Auto Execution operations
    it('should have startAutoExecution method', () => {
      const content = readFileSync(typesPath, 'utf-8');
      expect(content).toContain('startAutoExecution(');
    });

    it('should have stopAutoExecution method', () => {
      const content = readFileSync(typesPath, 'utf-8');
      expect(content).toContain('stopAutoExecution(');
    });

    // File operations
    it('should have saveFile method', () => {
      const content = readFileSync(typesPath, 'utf-8');
      expect(content).toContain('saveFile(');
    });

    // Spec Plan operations (remote-ui-create-buttons feature)
    // Requirements: 3.1
    it('should have optional executeSpecPlan method for Remote UI', () => {
      const content = readFileSync(typesPath, 'utf-8');
      expect(content).toContain('executeSpecPlan?(');
    });

    // =========================================================================
    // release-button-api-fix: Task 5.1 - executeProjectCommand method
    // Requirements: 1.1, 4.2
    // =========================================================================

    it('should have executeProjectCommand method with projectPath, command, and title params', () => {
      const content = readFileSync(typesPath, 'utf-8');
      // New API: executeProjectCommand(command: string, title: string)
      expect(content).toContain('executeProjectCommand(');
      expect(content).toMatch(/executeProjectCommand\([^)]*command:\s*string/);
      expect(content).toMatch(/executeProjectCommand\([^)]*title:\s*string/);
    });

    it('should NOT have executeAskProject method (deprecated)', () => {
      const content = readFileSync(typesPath, 'utf-8');
      // executeAskProject should be removed as per Task 5.1, Requirements 4.2
      expect(content).not.toContain('executeAskProject(');
    });

    // Event subscriptions
    it('should have onSpecsUpdated subscription', () => {
      const content = readFileSync(typesPath, 'utf-8');
      expect(content).toContain('onSpecsUpdated(');
    });

    // onBugsUpdated removed (github-issue-integration)

    it('should have onAgentOutput subscription', () => {
      const content = readFileSync(typesPath, 'utf-8');
      expect(content).toContain('onAgentOutput(');
    });

    it('should have onAgentStatusChange subscription', () => {
      const content = readFileSync(typesPath, 'utf-8');
      expect(content).toContain('onAgentStatusChange(');
    });

    // Bug monitoring methods removed (github-issue-integration)
  });

  describe('WorkflowPhase type', () => {
    it('should define WorkflowPhase type', () => {
      const content = readFileSync(typesPath, 'utf-8');
      expect(content).toContain('export type WorkflowPhase');
    });
  });

  // ===========================================================================
  // auto-execution-projectpath-fix: Task 4.2 - AutoExecutionState.projectPath
  // Requirements: 4.2
  // ===========================================================================

  describe('AutoExecutionState interface', () => {
    it('should define AutoExecutionState interface', () => {
      const content = readFileSync(typesPath, 'utf-8');
      expect(content).toContain('export interface AutoExecutionState');
    });

    it('should have projectPath field for worktree environment support', () => {
      const content = readFileSync(typesPath, 'utf-8');
      // Requirement 4.2: AutoExecutionState型にprojectPathを追加
      // projectPath is needed to ensure event logs are recorded in the correct location
      // even when operating in a git worktree environment
      expect(content).toMatch(/interface AutoExecutionState[\s\S]*projectPath.*string/);
    });

    it('should have status field', () => {
      const content = readFileSync(typesPath, 'utf-8');
      expect(content).toMatch(/interface AutoExecutionState[\s\S]*status:\s*AutoExecutionStatus/);
    });

    it('should have completedPhases field', () => {
      const content = readFileSync(typesPath, 'utf-8');
      expect(content).toMatch(/interface AutoExecutionState[\s\S]*completedPhases:\s*WorkflowPhase\[\]/);
    });
  });
});
