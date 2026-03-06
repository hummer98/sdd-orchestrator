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
  // websocket-command-unification: Removed release-button-api-fix stub tests
  // executeProjectCommand now has full implementation (Task 4.1)
  // executeAskProject removed (Task 4.3)
  // ===========================================================================

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

  // Bug monitoring methods removed (github-issue-integration)

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
  // websocket-command-unification: Removed executeAskProject and executeAskSpec tests
  // These methods have been removed in Task 4.3
  // Replaced by executeProjectCommand (Task 4.1) and executeSpecCommand (Task 4.2)
  // ===========================================================================

  // ===========================================================================
  // websocket-command-unification: Task 5.1 - ApiClient interface update tests
  // Requirements: 5.4, 5.5
  // ===========================================================================

  describe('ApiClient interface executeSpecCommand', () => {
    it('should have executeSpecCommand defined in types.ts', () => {
      const typesPath = resolve(__dirname, 'types.ts');
      const content = readFileSync(typesPath, 'utf-8');
      expect(content).toContain('executeSpecCommand');
    });

    it('should have correct signature in ApiClient interface', () => {
      const typesPath = resolve(__dirname, 'types.ts');
      const content = readFileSync(typesPath, 'utf-8');
      // Should define executeSpecCommand with specId, featureName, command, title parameters
      expect(content).toMatch(/executeSpecCommand\?\s*\(\s*specId\s*:\s*string\s*,\s*featureName\s*:\s*string\s*,\s*command\s*:\s*string\s*,\s*title\s*:\s*string/);
    });

    it('should return Promise<Result<AgentInfo, ApiError>>', () => {
      const typesPath = resolve(__dirname, 'types.ts');
      const content = readFileSync(typesPath, 'utf-8');
      expect(content).toMatch(/executeSpecCommand[\s\S]*?Promise<Result<AgentInfo,\s*ApiError>>/);
    });

    it('should NOT have executeAskProject in ApiClient interface', () => {
      const typesPath = resolve(__dirname, 'types.ts');
      const content = readFileSync(typesPath, 'utf-8');
      // executeAskProject should be removed from interface
      expect(content).not.toContain('executeAskProject?');
    });

    it('should NOT have executeAskSpec in ApiClient interface', () => {
      const typesPath = resolve(__dirname, 'types.ts');
      const content = readFileSync(typesPath, 'utf-8');
      // executeAskSpec should be removed from interface
      expect(content).not.toContain('executeAskSpec?');
    });
  });

  // ===========================================================================
  // websocket-command-unification: Task 8.5 - executeProjectCommand tests
  // Requirements: 5.1
  // ===========================================================================

  describe('executeProjectCommand implementation', () => {
    it('should implement executeProjectCommand method', () => {
      const content = readFileSync(clientPath, 'utf-8');
      expect(content).toContain('async executeProjectCommand(');
    });

    it('should use EXECUTE_PROJECT_COMMAND message type (not NOT_IMPLEMENTED)', () => {
      const content = readFileSync(clientPath, 'utf-8');
      // Should use wrapRequest with EXECUTE_PROJECT_COMMAND message type
      expect(content).toMatch(/executeProjectCommand[\s\S]*?wrapRequest<AgentInfo>\(['"]EXECUTE_PROJECT_COMMAND['"]/);
    });

    it('should include command and title in payload', () => {
      const content = readFileSync(clientPath, 'utf-8');
      // Payload must include command and title parameters
      expect(content).toMatch(/executeProjectCommand[\s\S]*?\{[\s\S]*?command[\s\S]*?title/);
    });

    it('should return Result<AgentInfo, ApiError>', () => {
      const content = readFileSync(clientPath, 'utf-8');
      // Return type should be Promise<Result<AgentInfo, ApiError>>
      expect(content).toMatch(/executeProjectCommand[\s\S]*?Promise<Result<AgentInfo, ApiError>>/);
    });
  });

  // ===========================================================================
  // websocket-command-unification: Task 8.6 - executeSpecCommand tests
  // Requirements: 5.2
  // ===========================================================================

  describe('executeSpecCommand method', () => {
    it('should implement executeSpecCommand method', () => {
      const content = readFileSync(clientPath, 'utf-8');
      expect(content).toContain('async executeSpecCommand(');
    });

    it('should accept specId, featureName, command, and title parameters', () => {
      const content = readFileSync(clientPath, 'utf-8');
      // Method signature: executeSpecCommand(specId: string, featureName: string, command: string, title: string)
      expect(content).toMatch(/executeSpecCommand\s*\(\s*specId\s*:\s*string\s*,\s*featureName\s*:\s*string\s*,\s*command\s*:\s*string\s*,\s*title\s*:\s*string/);
    });

    it('should use EXECUTE_SPEC_COMMAND message type', () => {
      const content = readFileSync(clientPath, 'utf-8');
      // Should send EXECUTE_SPEC_COMMAND message type
      expect(content).toMatch(/executeSpecCommand[\s\S]*?wrapRequest<AgentInfo>\(['"]EXECUTE_SPEC_COMMAND['"]/);
    });

    it('should include specId, featureName, command, and title in payload', () => {
      const content = readFileSync(clientPath, 'utf-8');
      // Payload must include all four parameters
      expect(content).toMatch(/executeSpecCommand[\s\S]*?\{[\s\S]*?specId[\s\S]*?featureName[\s\S]*?command[\s\S]*?title/);
    });

    it('should return Result<AgentInfo, ApiError>', () => {
      const content = readFileSync(clientPath, 'utf-8');
      // Return type should be Promise<Result<AgentInfo, ApiError>>
      expect(content).toMatch(/executeSpecCommand[\s\S]*?Promise<Result<AgentInfo, ApiError>>/);
    });
  });

  // ===========================================================================
  // websocket-command-unification: Task 4.3 - executeAskProject/executeAskSpec removal verification
  // Requirements: 5.3
  // ===========================================================================

  describe('executeAskProject and executeAskSpec removal', () => {
    it('should NOT have executeAskProject method', () => {
      const content = readFileSync(clientPath, 'utf-8');
      // executeAskProject should be removed
      expect(content).not.toContain('async executeAskProject(');
    });

    it('should NOT have executeAskSpec method', () => {
      const content = readFileSync(clientPath, 'utf-8');
      // executeAskSpec should be removed
      expect(content).not.toContain('async executeAskSpec(');
    });

    it('should NOT have ASK_PROJECT message type', () => {
      const content = readFileSync(clientPath, 'utf-8');
      // ASK_PROJECT message type should not be used
      expect(content).not.toMatch(/'ASK_PROJECT'/);
    });

    it('should NOT have ASK_SPEC message type', () => {
      const content = readFileSync(clientPath, 'utf-8');
      // ASK_SPEC message type should not be used
      expect(content).not.toMatch(/'ASK_SPEC'/);
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

  // ===========================================================================
  // github-issue-integration: Task 12.1
  // Requirements: 11.5
  // ===========================================================================

  describe('GitHub Issue/PR API methods', () => {
    it('should implement getIssues method using GET_ISSUES message', () => {
      const content = readFileSync(clientPath, 'utf-8');
      expect(content).toContain('async getIssues');
      expect(content).toMatch(/['"]GET_ISSUES['"]/);
    });

    it('should implement getIssueDetail method using GET_ISSUE_DETAIL message', () => {
      const content = readFileSync(clientPath, 'utf-8');
      expect(content).toContain('async getIssueDetail');
      expect(content).toMatch(/['"]GET_ISSUE_DETAIL['"]/);
    });

    it('should implement getPullRequests method using GET_PULL_REQUESTS message', () => {
      const content = readFileSync(clientPath, 'utf-8');
      expect(content).toContain('async getPullRequests');
      expect(content).toMatch(/['"]GET_PULL_REQUESTS['"]/);
    });

    it('should implement createIssue method using CREATE_ISSUE message', () => {
      const content = readFileSync(clientPath, 'utf-8');
      expect(content).toContain('async createIssue');
      expect(content).toMatch(/['"]CREATE_ISSUE['"]/);
    });

    it('should implement getGitHubConnectionStatus method using GET_GITHUB_CONNECTION_STATUS message', () => {
      const content = readFileSync(clientPath, 'utf-8');
      expect(content).toContain('async getGitHubConnectionStatus');
      expect(content).toMatch(/['"]GET_GITHUB_CONNECTION_STATUS['"]/);
    });
  });
});
