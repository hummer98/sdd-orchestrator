/**
 * Test for IpcApiClient implementation
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const clientPath = resolve(__dirname, 'IpcApiClient.ts');

describe('IpcApiClient', () => {
  it('should exist', () => {
    expect(existsSync(clientPath)).toBe(true);
  });

  it('should implement ApiClient interface', () => {
    const content = readFileSync(clientPath, 'utf-8');
    expect(content).toContain('implements ApiClient');
  });

  it('should use window.electronAPI for communication', () => {
    const content = readFileSync(clientPath, 'utf-8');
    expect(content).toContain('window.electronAPI');
  });

  it('should export IpcApiClient class', () => {
    const content = readFileSync(clientPath, 'utf-8');
    expect(content).toContain('export class IpcApiClient');
  });

  it('should handle errors and convert to Result type', () => {
    const content = readFileSync(clientPath, 'utf-8');
    expect(content).toContain('ok: false');
    expect(content).toContain('ok: true');
  });

  it('should implement getSpecs method', () => {
    const content = readFileSync(clientPath, 'utf-8');
    expect(content).toContain('async getSpecs()');
  });

  it('should implement executePhase method', () => {
    const content = readFileSync(clientPath, 'utf-8');
    expect(content).toContain('async executePhase(');
  });

  it('should implement event subscriptions', () => {
    const content = readFileSync(clientPath, 'utf-8');
    expect(content).toContain('onSpecsUpdated(');
    expect(content).toContain('onBugsUpdated(');
    expect(content).toContain('onAgentOutput(');
  });

  // Bug fix: agent-command-missing-in-remote-ui
  // getAgents should include command field for agent log display
  it('should include command field in getAgents result', () => {
    const content = readFileSync(clientPath, 'utf-8');
    // Check that command is copied to AgentInfo in getAgents
    expect(content).toContain('command: agent.command');
  });

  // ===========================================================================
  // release-button-api-fix: Task 5.2 - executeProjectCommand
  // Requirements: 1.1, 4.4
  // ===========================================================================

  describe('executeProjectCommand method', () => {
    it('should implement executeProjectCommand method', () => {
      const content = readFileSync(clientPath, 'utf-8');
      expect(content).toContain('async executeProjectCommand(');
    });

    it('should call window.electronAPI.executeProjectCommand', () => {
      const content = readFileSync(clientPath, 'utf-8');
      expect(content).toContain('window.electronAPI.executeProjectCommand');
    });

    it('should pass command and title parameters to IPC', () => {
      const content = readFileSync(clientPath, 'utf-8');
      // Should invoke executeProjectCommand with projectPath, command, title
      expect(content).toMatch(/executeProjectCommand[\s\S]*?projectPath[\s\S]*?command[\s\S]*?title/);
    });

    it('should return AgentInfo on success', () => {
      const content = readFileSync(clientPath, 'utf-8');
      // Should return result wrapped in Result type with AgentInfo structure
      expect(content).toMatch(/executeProjectCommand[\s\S]*?wrapResult/);
    });

    it('should handle NO_PROJECT error when no project is selected', () => {
      const content = readFileSync(clientPath, 'utf-8');
      // Method should check for current project and return NO_PROJECT error if none
      expect(content).toMatch(/executeProjectCommand[\s\S]*?NO_PROJECT/);
    });
  });

  describe('executeAskProject removal', () => {
    it('should NOT contain executeAskProject implementation', () => {
      const content = readFileSync(clientPath, 'utf-8');
      // The old executeAskProject should be removed
      expect(content).not.toContain('async executeAskProject(');
    });
  });

  // ===========================================================================
  // auto-execution-projectpath-fix: Task 4.4 - startAutoExecution projectPath
  // Requirements: 4.2
  // ===========================================================================

  describe('startAutoExecution projectPath', () => {
    it('should implement startAutoExecution with projectPath as first parameter', () => {
      const content = readFileSync(clientPath, 'utf-8');
      // Check that startAutoExecution method accepts projectPath as first parameter
      expect(content).toMatch(/startAutoExecution\s*\(\s*projectPath[^)]*specPath[^)]*specId[^)]*options/);
    });

    it('should pass projectPath to window.electronAPI.autoExecutionStart', () => {
      const content = readFileSync(clientPath, 'utf-8');
      // Check that autoExecutionStart is called with projectPath included
      expect(content).toMatch(/autoExecutionStart\s*\(\s*\{[^}]*projectPath/);
    });
  });

  // ===========================================================================
  // bugs-view-unification: Task 1.2 - Bug monitoring methods
  // Requirements: 4.5, 4.7
  // ===========================================================================

  describe('Bug monitoring methods', () => {
    it('should implement switchAgentWatchScope delegating to window.electronAPI', () => {
      const content = readFileSync(clientPath, 'utf-8');
      expect(content).toContain('async switchAgentWatchScope(');
      expect(content).toContain('window.electronAPI.switchAgentWatchScope');
    });

    it('should implement startBugsWatcher via IPC', () => {
      const content = readFileSync(clientPath, 'utf-8');
      expect(content).toContain('async startBugsWatcher()');
      expect(content).toContain('window.electronAPI.startBugsWatcher');
    });

    it('should implement stopBugsWatcher via IPC', () => {
      const content = readFileSync(clientPath, 'utf-8');
      expect(content).toContain('async stopBugsWatcher()');
      expect(content).toContain('window.electronAPI.stopBugsWatcher');
    });

    it('should implement onBugsChanged with IPC event listener', () => {
      const content = readFileSync(clientPath, 'utf-8');
      expect(content).toContain('onBugsChanged(');
      // Should set up IPC event listener
      expect(content).toMatch(/onBugsChanged[\s\S]*window\.electronAPI\.onBugsChanged/);
    });
  });
});
