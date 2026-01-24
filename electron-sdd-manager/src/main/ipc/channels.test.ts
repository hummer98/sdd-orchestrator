/**
 * @file channels.test.ts
 * @description Tests for MCP-related IPC channel definitions
 * Task 6.1: MCP関連IPCチャンネル定義
 * Requirements: 6.3, 6.4, 6.5
 */

import { describe, it, expect } from 'vitest';
import { IPC_CHANNELS } from './channels';

describe('IPC_CHANNELS - MCP Server', () => {
  describe('MCP Server Control Channels', () => {
    it('should define MCP_START channel for starting MCP server', () => {
      expect(IPC_CHANNELS.MCP_START).toBe('mcp:start');
    });

    it('should define MCP_STOP channel for stopping MCP server', () => {
      expect(IPC_CHANNELS.MCP_STOP).toBe('mcp:stop');
    });

    it('should define MCP_GET_STATUS channel for getting MCP server status', () => {
      expect(IPC_CHANNELS.MCP_GET_STATUS).toBe('mcp:get-status');
    });
  });

  describe('MCP Settings Channels', () => {
    it('should define MCP_GET_SETTINGS channel for getting MCP settings', () => {
      expect(IPC_CHANNELS.MCP_GET_SETTINGS).toBe('mcp:get-settings');
    });

    it('should define MCP_SET_ENABLED channel for enabling/disabling MCP server', () => {
      expect(IPC_CHANNELS.MCP_SET_ENABLED).toBe('mcp:set-enabled');
    });

    it('should define MCP_SET_PORT channel for setting MCP server port', () => {
      expect(IPC_CHANNELS.MCP_SET_PORT).toBe('mcp:set-port');
    });
  });

  describe('MCP Channel Naming Convention', () => {
    it('should use mcp: prefix for all MCP-related channels', () => {
      const mcpChannels = [
        IPC_CHANNELS.MCP_START,
        IPC_CHANNELS.MCP_STOP,
        IPC_CHANNELS.MCP_GET_STATUS,
        IPC_CHANNELS.MCP_GET_SETTINGS,
        IPC_CHANNELS.MCP_SET_ENABLED,
        IPC_CHANNELS.MCP_SET_PORT,
      ];

      mcpChannels.forEach((channel) => {
        expect(channel).toMatch(/^mcp:/);
      });
    });
  });
});
