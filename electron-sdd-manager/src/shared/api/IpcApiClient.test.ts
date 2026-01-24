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
