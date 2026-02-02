/**
 * Tests for AgentStartError message functions
 * Requirements: 3.4 (Japanese localized error messages)
 */

import { describe, it, expect } from 'vitest';
import type { AgentStartError } from './agentStartError';
import { AGENT_START_ERROR_MESSAGES, getAgentStartErrorMessage } from './agentStartErrorMessages';

describe('AgentStartError Messages', () => {
  describe('AGENT_START_ERROR_MESSAGES', () => {
    it('should have message for COMMAND_NOT_FOUND', () => {
      expect(AGENT_START_ERROR_MESSAGES.COMMAND_NOT_FOUND).toBe(
        'claudeコマンドが見つかりません。インストールを確認してください'
      );
    });

    it('should have message for AUTH_REQUIRED', () => {
      expect(AGENT_START_ERROR_MESSAGES.AUTH_REQUIRED).toBe(
        'Claude CLIの認証が必要です。`claude login`を実行してください'
      );
    });

    it('should have message for API_KEY_MISSING', () => {
      expect(AGENT_START_ERROR_MESSAGES.API_KEY_MISSING).toBe(
        'APIキーが設定されていません'
      );
    });

    it('should have message for SPAWN_ERROR', () => {
      expect(AGENT_START_ERROR_MESSAGES.SPAWN_ERROR).toBe(
        'プロセスの起動に失敗しました'
      );
    });

    it('should have message for UNKNOWN_ERROR', () => {
      expect(AGENT_START_ERROR_MESSAGES.UNKNOWN_ERROR).toBe(
        'エージェントの起動に失敗しました'
      );
    });
  });

  describe('getAgentStartErrorMessage', () => {
    it('should return static message for COMMAND_NOT_FOUND', () => {
      const error: AgentStartError = {
        type: 'COMMAND_NOT_FOUND',
        message: 'spawn claude ENOENT',
      };
      const result = getAgentStartErrorMessage(error);
      expect(result).toBe('claudeコマンドが見つかりません。インストールを確認してください');
    });

    it('should return static message for AUTH_REQUIRED', () => {
      const error: AgentStartError = {
        type: 'AUTH_REQUIRED',
        message: 'not logged in',
      };
      const result = getAgentStartErrorMessage(error);
      expect(result).toBe('Claude CLIの認証が必要です。`claude login`を実行してください');
    });

    it('should return static message for API_KEY_MISSING', () => {
      const error: AgentStartError = {
        type: 'API_KEY_MISSING',
        message: 'API key not set',
      };
      const result = getAgentStartErrorMessage(error);
      expect(result).toBe('APIキーが設定されていません');
    });

    it('should return dynamic message for SPAWN_ERROR with details', () => {
      const error: AgentStartError = {
        type: 'SPAWN_ERROR',
        message: 'Permission denied',
      };
      const result = getAgentStartErrorMessage(error);
      expect(result).toBe('プロセスの起動に失敗しました: Permission denied');
    });

    it('should return dynamic message for UNKNOWN_ERROR with details', () => {
      const error: AgentStartError = {
        type: 'UNKNOWN_ERROR',
        message: 'Something went wrong',
      };
      const result = getAgentStartErrorMessage(error);
      expect(result).toBe('エージェントの起動に失敗しました: Something went wrong');
    });

    it('should return base message for SPAWN_ERROR without message', () => {
      const error: AgentStartError = {
        type: 'SPAWN_ERROR',
        message: '',
      };
      const result = getAgentStartErrorMessage(error);
      expect(result).toBe('プロセスの起動に失敗しました');
    });

    it('should return base message for UNKNOWN_ERROR without message', () => {
      const error: AgentStartError = {
        type: 'UNKNOWN_ERROR',
        message: '',
      };
      const result = getAgentStartErrorMessage(error);
      expect(result).toBe('エージェントの起動に失敗しました');
    });
  });
});
