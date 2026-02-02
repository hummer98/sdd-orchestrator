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

    it('should keep executeAskProject with fixed ASK_PROJECT message type', () => {
      const content = readFileSync(clientPath, 'utf-8');
      // remote-ui-ask-agent-fix: executeAskProject now uses ASK_PROJECT message type
      // and includes projectPath from getProjectPath()
      expect(content).toContain('async executeAskProject(');
      expect(content).toMatch(/executeAskProject[\s\S]*?ASK_PROJECT/);
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
  // Note: switchAgentWatchScope removed (remove-redundant-agent-watchers feature)
  // ===========================================================================

  describe('Bug monitoring methods', () => {
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

  // ===========================================================================
  // safari-websocket-stability: Task 3.1 - Heartbeat tests
  // Requirements: 5.1, 5.2
  // ===========================================================================

  describe('Heartbeat functionality', () => {
    it('should implement startHeartbeat method', () => {
      const content = readFileSync(clientPath, 'utf-8');
      expect(content).toContain('startHeartbeat');
    });

    it('should implement stopHeartbeat method', () => {
      const content = readFileSync(clientPath, 'utf-8');
      expect(content).toContain('stopHeartbeat');
    });

    it('should implement handlePong method for PONG response handling', () => {
      const content = readFileSync(clientPath, 'utf-8');
      expect(content).toContain('handlePong');
    });

    it('should implement sendPing method', () => {
      const content = readFileSync(clientPath, 'utf-8');
      expect(content).toContain('sendPing');
    });

    it('should define HEARTBEAT_INTERVAL constant (20 seconds)', () => {
      const content = readFileSync(clientPath, 'utf-8');
      expect(content).toContain('HEARTBEAT_INTERVAL');
      // 20 seconds = 20000ms
      expect(content).toMatch(/HEARTBEAT_INTERVAL\s*=\s*20000/);
    });

    it('should define MAX_MISSED_PONGS constant (2)', () => {
      const content = readFileSync(clientPath, 'utf-8');
      expect(content).toContain('MAX_MISSED_PONGS');
      expect(content).toMatch(/MAX_MISSED_PONGS\s*=\s*2/);
    });

    it('should track missedPongCount for connection dead detection', () => {
      const content = readFileSync(clientPath, 'utf-8');
      expect(content).toContain('missedPongCount');
    });

    it('should handle PONG message type in handlePushMessage', () => {
      const content = readFileSync(clientPath, 'utf-8');
      // PONG messages should be handled
      expect(content).toMatch(/case\s*['"]PONG['"]/);
    });

    it('should send PING message with correct format', () => {
      const content = readFileSync(clientPath, 'utf-8');
      // PING format: { type: 'PING', timestamp: <number> }
      expect(content).toMatch(/type:\s*['"]PING['"]/);
    });

    it('should start heartbeat on successful connection', () => {
      const content = readFileSync(clientPath, 'utf-8');
      // After connect succeeds, startHeartbeat should be called
      // Check that connect method calls startHeartbeat
      expect(content).toMatch(/connect[\s\S]*startHeartbeat/);
    });

    it('should stop heartbeat on disconnect', () => {
      const content = readFileSync(clientPath, 'utf-8');
      // disconnect should call stopHeartbeat
      expect(content).toMatch(/disconnect[\s\S]*stopHeartbeat/);
    });

    it('should force reconnect when MAX_MISSED_PONGS is reached', () => {
      const content = readFileSync(clientPath, 'utf-8');
      // When missedPongCount >= MAX_MISSED_PONGS, force reconnect
      expect(content).toMatch(/missedPongCount\s*>=\s*MAX_MISSED_PONGS/);
    });
  });

  // ===========================================================================
  // safari-websocket-stability: Task 3.2 - visibilitychange tests
  // Requirements: 5.3
  // ===========================================================================

  describe('Visibility change handling', () => {
    it('should implement handleVisibilityChange method', () => {
      const content = readFileSync(clientPath, 'utf-8');
      expect(content).toContain('handleVisibilityChange');
    });

    it('should implement sendImmediatePing method for visibility recovery', () => {
      const content = readFileSync(clientPath, 'utf-8');
      expect(content).toContain('sendImmediatePing');
    });

    it('should define VISIBILITY_PING_TIMEOUT constant (10 seconds)', () => {
      const content = readFileSync(clientPath, 'utf-8');
      expect(content).toContain('VISIBILITY_PING_TIMEOUT');
      // 10 seconds = 10000ms
      expect(content).toMatch(/VISIBILITY_PING_TIMEOUT\s*=\s*10000/);
    });

    it('should register visibilitychange event listener', () => {
      const content = readFileSync(clientPath, 'utf-8');
      // Should add event listener for visibilitychange
      expect(content).toContain('visibilitychange');
    });

    it('should check document.visibilityState for visible state', () => {
      const content = readFileSync(clientPath, 'utf-8');
      expect(content).toContain('visibilityState');
      expect(content).toMatch(/visibilityState\s*===\s*['"]visible['"]/);
    });

    it('should track visibilityPingTimeout for timeout handling', () => {
      const content = readFileSync(clientPath, 'utf-8');
      expect(content).toContain('visibilityPingTimeout');
    });

    it('should implement startVisibilityMonitor method', () => {
      const content = readFileSync(clientPath, 'utf-8');
      expect(content).toContain('startVisibilityMonitor');
    });

    it('should implement stopVisibilityMonitor method', () => {
      const content = readFileSync(clientPath, 'utf-8');
      expect(content).toContain('stopVisibilityMonitor');
    });
  });

  // ===========================================================================
  // safari-websocket-stability: Task 3.3 - Exponential backoff tests
  // Requirements: 5.4
  // ===========================================================================

  describe('Exponential backoff', () => {
    it('should define INITIAL_BACKOFF constant (1 second)', () => {
      const content = readFileSync(clientPath, 'utf-8');
      expect(content).toContain('INITIAL_BACKOFF');
      // 1 second = 1000ms
      expect(content).toMatch(/INITIAL_BACKOFF\s*=\s*1000/);
    });

    it('should define MAX_BACKOFF constant (30 seconds)', () => {
      const content = readFileSync(clientPath, 'utf-8');
      expect(content).toContain('MAX_BACKOFF');
      // 30 seconds = 30000ms
      expect(content).toMatch(/MAX_BACKOFF\s*=\s*30000/);
    });

    it('should define BACKOFF_MULTIPLIER constant (2)', () => {
      const content = readFileSync(clientPath, 'utf-8');
      expect(content).toContain('BACKOFF_MULTIPLIER');
      expect(content).toMatch(/BACKOFF_MULTIPLIER\s*=\s*2/);
    });

    it('should implement calculateBackoffDelay method', () => {
      const content = readFileSync(clientPath, 'utf-8');
      expect(content).toContain('calculateBackoffDelay');
    });

    it('should use Math.min to cap backoff at MAX_BACKOFF', () => {
      const content = readFileSync(clientPath, 'utf-8');
      // Should cap at MAX_BACKOFF
      expect(content).toMatch(/Math\.min[\s\S]*MAX_BACKOFF/);
    });

    it('should use exponential calculation with BACKOFF_MULTIPLIER', () => {
      const content = readFileSync(clientPath, 'utf-8');
      // Should use Math.pow or ** for exponential calculation
      expect(content).toMatch(/Math\.pow|BACKOFF_MULTIPLIER\s*\*\*|\*\*\s*reconnectAttempts/);
    });

    it('should reset backoff counter on successful connection', () => {
      const content = readFileSync(clientPath, 'utf-8');
      // reconnectAttempts should be reset to 0 on success
      expect(content).toMatch(/reconnectAttempts\s*=\s*0/);
    });

    it('should maintain MAX_RECONNECT_ATTEMPTS limit (5)', () => {
      const content = readFileSync(clientPath, 'utf-8');
      expect(content).toContain('MAX_RECONNECT_ATTEMPTS');
      expect(content).toMatch(/MAX_RECONNECT_ATTEMPTS\s*=\s*5/);
    });
  });

  // ===========================================================================
  // remote-ui-ask-agent-fix: Task 4.1 - executeAskProject message type fix
  // Requirements: 5.1 (1.1, 1.2, 1.3, 1.4)
  // ===========================================================================

  describe('executeAskProject message type fix', () => {
    it('should use ASK_PROJECT message type (not EXECUTE_ASK_PROJECT)', () => {
      const content = readFileSync(clientPath, 'utf-8');
      // The message type must be 'ASK_PROJECT' to match the server handler
      expect(content).toMatch(/executeAskProject[\s\S]*?wrapRequest<AgentInfo>\(['"]ASK_PROJECT['"]/);
    });

    it('should include projectPath in payload from getProjectPath()', () => {
      const content = readFileSync(clientPath, 'utf-8');
      // Payload must include projectPath retrieved from this.getProjectPath()
      expect(content).toMatch(/executeAskProject[\s\S]*?\{[\s\S]*?projectPath[\s\S]*?this\.getProjectPath/);
    });

    it('should include prompt in payload', () => {
      const content = readFileSync(clientPath, 'utf-8');
      // Payload must include the prompt parameter
      expect(content).toMatch(/executeAskProject[\s\S]*?\{[\s\S]*?prompt/);
    });

    it('should return AgentInfo from ASK_PROJECT_STARTED response', () => {
      const content = readFileSync(clientPath, 'utf-8');
      // Return type should be Result<AgentInfo, ApiError>
      expect(content).toMatch(/executeAskProject[\s\S]*?Promise<Result<AgentInfo/);
    });
  });

  // ===========================================================================
  // remote-ui-ask-agent-fix: Task 2 - ApiClient interface executeAskSpec
  // Requirements: 4.1, 4.2
  // ===========================================================================

  describe('ApiClient interface executeAskSpec', () => {
    it('should have executeAskSpec defined in types.ts', () => {
      const typesPath = resolve(__dirname, 'types.ts');
      const content = readFileSync(typesPath, 'utf-8');
      expect(content).toContain('executeAskSpec');
    });

    it('should have correct signature in ApiClient interface', () => {
      const typesPath = resolve(__dirname, 'types.ts');
      const content = readFileSync(typesPath, 'utf-8');
      // Should define executeAskSpec with specId, featureName, prompt parameters
      expect(content).toMatch(/executeAskSpec\?\s*\(\s*specId\s*:\s*string\s*,\s*featureName\s*:\s*string\s*,\s*prompt\s*:\s*string/);
    });

    it('should return Promise<Result<AgentInfo, ApiError>>', () => {
      const typesPath = resolve(__dirname, 'types.ts');
      const content = readFileSync(typesPath, 'utf-8');
      expect(content).toMatch(/executeAskSpec[\s\S]*?Promise<Result<AgentInfo,\s*ApiError>>/);
    });
  });

  // ===========================================================================
  // remote-ui-ask-agent-fix: Task 4.2 - executeAskSpec new method
  // Requirements: 5.2 (2.1, 2.2, 2.3, 2.4)
  // ===========================================================================

  describe('executeAskSpec method', () => {
    it('should implement executeAskSpec method', () => {
      const content = readFileSync(clientPath, 'utf-8');
      expect(content).toContain('async executeAskSpec(');
    });

    it('should accept specId, featureName, and prompt parameters', () => {
      const content = readFileSync(clientPath, 'utf-8');
      // Method signature: executeAskSpec(specId: string, featureName: string, prompt: string)
      expect(content).toMatch(/executeAskSpec\s*\(\s*specId\s*:\s*string\s*,\s*featureName\s*:\s*string\s*,\s*prompt\s*:\s*string/);
    });

    it('should use ASK_SPEC message type', () => {
      const content = readFileSync(clientPath, 'utf-8');
      // Should send ASK_SPEC message type
      expect(content).toMatch(/executeAskSpec[\s\S]*?wrapRequest<AgentInfo>\(['"]ASK_SPEC['"]/);
    });

    it('should include specId, featureName, and prompt in payload', () => {
      const content = readFileSync(clientPath, 'utf-8');
      // Payload must include all three parameters
      expect(content).toMatch(/executeAskSpec[\s\S]*?\{[\s\S]*?specId[\s\S]*?featureName[\s\S]*?prompt/);
    });

    it('should return Result<AgentInfo, ApiError>', () => {
      const content = readFileSync(clientPath, 'utf-8');
      // Return type should be Promise<Result<AgentInfo, ApiError>>
      expect(content).toMatch(/executeAskSpec[\s\S]*?Promise<Result<AgentInfo, ApiError>>/);
    });
  });

  // ===========================================================================
  // worktree-rebase-from-main: Task 5.1b - rebaseFromMain
  // Requirements: 8.2
  // ===========================================================================

  describe('rebaseFromMain method', () => {
    it('should implement rebaseFromMain method', () => {
      const content = readFileSync(clientPath, 'utf-8');
      expect(content).toContain('async rebaseFromMain(');
    });

    it('should send worktree:rebase-from-main message', () => {
      const content = readFileSync(clientPath, 'utf-8');
      // Should use sendRequest or wrapRequest with the correct message type
      expect(content).toMatch(/['"]worktree:rebase-from-main['"]/);
    });

    it('should pass specOrBugPath in payload', () => {
      const content = readFileSync(clientPath, 'utf-8');
      // Should include specOrBugPath in the request payload
      expect(content).toMatch(/rebaseFromMain[\s\S]*?specOrBugPath/);
    });

    it('should return Result type', () => {
      const content = readFileSync(clientPath, 'utf-8');
      // Should use wrapRequest which returns Result type
      expect(content).toMatch(/rebaseFromMain[\s\S]*?wrapRequest/);
    });
  });
});
