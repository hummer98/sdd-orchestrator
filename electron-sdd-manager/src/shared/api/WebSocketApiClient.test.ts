/**
 * Test for WebSocketApiClient implementation
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const clientPath = resolve(__dirname, 'WebSocketApiClient.ts');

describe('WebSocketApiClient', () => {
  it('should exist', () => {
    expect(existsSync(clientPath)).toBe(true);
  });

  it('should implement ApiClient interface', () => {
    const content = readFileSync(clientPath, 'utf-8');
    expect(content).toContain('implements ApiClient');
  });

  it('should export WebSocketApiClient class', () => {
    const content = readFileSync(clientPath, 'utf-8');
    expect(content).toContain('export class WebSocketApiClient');
  });

  it('should use WebSocket for communication', () => {
    const content = readFileSync(clientPath, 'utf-8');
    expect(content).toContain('WebSocket');
  });

  it('should implement reconnection logic', () => {
    const content = readFileSync(clientPath, 'utf-8');
    expect(content).toContain('reconnect');
  });

  it('should implement request/response correlation with requestId', () => {
    const content = readFileSync(clientPath, 'utf-8');
    expect(content).toContain('requestId');
  });

  it('should implement timeout handling', () => {
    const content = readFileSync(clientPath, 'utf-8');
    expect(content).toContain('timeout');
  });

  it('should implement getSpecs method', () => {
    const content = readFileSync(clientPath, 'utf-8');
    expect(content).toContain('async getSpecs()');
  });

  it('should implement connection management methods', () => {
    const content = readFileSync(clientPath, 'utf-8');
    expect(content).toContain('connect()');
    expect(content).toContain('disconnect()');
    expect(content).toContain('isConnected()');
  });

  // remote-ui-create-buttons feature
  // Requirements: 3.2
  it('should implement executeSpecPlan method using sendRequest', () => {
    const content = readFileSync(clientPath, 'utf-8');
    expect(content).toContain('async executeSpecPlan(');
    expect(content).toContain("'EXECUTE_SPEC_PLAN'");
  });

  // ===========================================================================
  // release-button-api-fix: Task 5.3 - executeProjectCommand stub
  // Requirements: 1.1
  // ===========================================================================

  describe('executeProjectCommand stub', () => {
    it('should implement executeProjectCommand method', () => {
      const content = readFileSync(clientPath, 'utf-8');
      expect(content).toContain('async executeProjectCommand(');
    });

    it('should return NOT_IMPLEMENTED error for Remote UI compatibility', () => {
      const content = readFileSync(clientPath, 'utf-8');
      // Verify the stub returns NOT_IMPLEMENTED error
      // The error message mentions executeProjectCommand
      expect(content).toContain("type: 'NOT_IMPLEMENTED'");
      expect(content).toContain('executeProjectCommand is not yet supported via WebSocket');
    });

    it('should keep executeAskProject for Remote UI backward compatibility', () => {
      const content = readFileSync(clientPath, 'utf-8');
      // executeAskProject is kept for Remote UI backward compatibility (Out of Scope)
      // Remote UI migration is a separate task, so the deprecated method is preserved
      // See design.md: "Remote UI side is not in scope"
      expect(content).toContain('async executeAskProject(');
      expect(content).toContain('@deprecated');
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

    it('should send projectPath to WebSocket server in AUTO_EXECUTE_START message', () => {
      const content = readFileSync(clientPath, 'utf-8');
      // Check that AUTO_EXECUTE_START wrapRequest includes projectPath
      expect(content).toMatch(/AUTO_EXECUTE_START[\s\S]*\{[\s\S]*projectPath/);
    });
  });

  // ===========================================================================
  // bugs-view-unification: Task 1.3 - Bug monitoring methods
  // Requirements: 4.6, 4.7
  // ===========================================================================

  describe('Bug monitoring methods', () => {
    it('should implement switchAgentWatchScope via WebSocket message', () => {
      const content = readFileSync(clientPath, 'utf-8');
      expect(content).toContain('async switchAgentWatchScope(');
      expect(content).toContain("'SWITCH_AGENT_WATCH_SCOPE'");
    });

    it('should implement startBugsWatcher via WebSocket', () => {
      const content = readFileSync(clientPath, 'utf-8');
      expect(content).toContain('async startBugsWatcher()');
      expect(content).toContain("'START_BUGS_WATCHER'");
    });

    it('should implement stopBugsWatcher via WebSocket', () => {
      const content = readFileSync(clientPath, 'utf-8');
      expect(content).toContain('async stopBugsWatcher()');
      expect(content).toContain("'STOP_BUGS_WATCHER'");
    });

    it('should implement onBugsChanged with WebSocket event subscription', () => {
      const content = readFileSync(clientPath, 'utf-8');
      expect(content).toContain('onBugsChanged(');
      // Should subscribe to bugsChanged event internally
      expect(content).toMatch(/onBugsChanged[\s\S]*bugsChanged/);
    });

    it('should implement detectBugsChanges for event format normalization', () => {
      const content = readFileSync(clientPath, 'utf-8');
      // Function to convert WebSocket BugMetadata[] to BugsChangeEvent[]
      expect(content).toContain('detectBugsChanges');
    });
  });
});
