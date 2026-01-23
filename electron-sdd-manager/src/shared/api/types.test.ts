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

    // Bug operations
    it('should have getBugs method', () => {
      const content = readFileSync(typesPath, 'utf-8');
      expect(content).toContain('getBugs():');
    });

    it('should have getBugDetail method', () => {
      const content = readFileSync(typesPath, 'utf-8');
      expect(content).toContain('getBugDetail(');
    });

    it('should have executeBugPhase method', () => {
      const content = readFileSync(typesPath, 'utf-8');
      expect(content).toContain('executeBugPhase(');
    });

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

    // Event subscriptions
    it('should have onSpecsUpdated subscription', () => {
      const content = readFileSync(typesPath, 'utf-8');
      expect(content).toContain('onSpecsUpdated(');
    });

    it('should have onBugsUpdated subscription', () => {
      const content = readFileSync(typesPath, 'utf-8');
      expect(content).toContain('onBugsUpdated(');
    });

    it('should have onAgentOutput subscription', () => {
      const content = readFileSync(typesPath, 'utf-8');
      expect(content).toContain('onAgentOutput(');
    });

    it('should have onAgentStatusChange subscription', () => {
      const content = readFileSync(typesPath, 'utf-8');
      expect(content).toContain('onAgentStatusChange(');
    });
  });

  describe('WorkflowPhase type', () => {
    it('should define WorkflowPhase type', () => {
      const content = readFileSync(typesPath, 'utf-8');
      expect(content).toContain('export type WorkflowPhase');
    });
  });
});
