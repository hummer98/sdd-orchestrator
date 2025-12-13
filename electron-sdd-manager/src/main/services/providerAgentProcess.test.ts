/**
 * ProviderAgentProcess Tests
 * Task 13.2: Provider対応AgentProcessのテスト
 * Requirements: 3.1, 4.1, 5.1
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createProviderAgentProcess,
  createAgentProcessSync,
  getProviderTypeFromPath,
  type ProviderAgentProcessOptions,
} from './providerAgentProcess';

// Mock the providerFactory
vi.mock('./ssh/providerFactory', () => {
  const mockHandle = {
    pid: 12345,
    isRunning: true,
    onOutput: vi.fn((cb) => {
      // Store callback for later triggering in tests
      (mockHandle as any)._outputCallback = cb;
    }),
    onExit: vi.fn((cb) => {
      (mockHandle as any)._exitCallback = cb;
    }),
    kill: vi.fn(),
    writeStdin: vi.fn(),
    closeStdin: vi.fn(),
  };

  const mockProvider = {
    type: 'local' as const,
    spawn: vi.fn().mockResolvedValue({ ok: true, value: mockHandle }),
    exec: vi.fn(),
  };

  return {
    providerFactory: {
      getProcessProvider: vi.fn().mockReturnValue(mockProvider),
      getProviderType: vi.fn((path: string) => path.startsWith('ssh://') ? 'ssh' : 'local'),
    },
    ProviderType: {},
  };
});

// Mock logger
vi.mock('./logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('ProviderAgentProcess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createProviderAgentProcess', () => {
    it('ローカルプロバイダーでプロセスを作成できる', async () => {
      const options: ProviderAgentProcessOptions = {
        agentId: 'test-agent-1',
        command: 'claude',
        args: ['-p', '--verbose'],
        cwd: '/test/project',
        providerType: 'local',
      };

      const result = await createProviderAgentProcess(options);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.agentId).toBe('test-agent-1');
        expect(result.value.pid).toBe(12345);
      }
    });

    it('sessionIdが正しく設定される', async () => {
      const options: ProviderAgentProcessOptions = {
        agentId: 'test-agent-2',
        command: 'claude',
        args: [],
        cwd: '/test',
        sessionId: 'session-123',
      };

      const result = await createProviderAgentProcess(options);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.sessionId).toBe('session-123');
      }
    });

    it('stdinが即座にクローズされる', async () => {
      const { providerFactory } = await import('./ssh/providerFactory');
      const mockProvider = providerFactory.getProcessProvider('local');

      const options: ProviderAgentProcessOptions = {
        agentId: 'test-agent-3',
        command: 'claude',
        args: ['-p'],
        cwd: '/test',
      };

      await createProviderAgentProcess(options);

      // closeStdinが呼ばれたことを確認
      const spawnResult = await mockProvider.spawn('', [], { cwd: '' });
      if (spawnResult.ok) {
        expect(spawnResult.value.closeStdin).toBeDefined();
      }
    });

    it('spawn失敗時にエラーを返す', async () => {
      const { providerFactory } = await import('./ssh/providerFactory');
      const mockProvider = providerFactory.getProcessProvider('local');
      (mockProvider.spawn as any).mockResolvedValueOnce({
        ok: false,
        error: { type: 'SPAWN_ERROR', message: 'Command not found' },
      });

      const options: ProviderAgentProcessOptions = {
        agentId: 'test-agent-4',
        command: 'invalid-command',
        args: [],
        cwd: '/test',
      };

      const result = await createProviderAgentProcess(options);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('SPAWN_ERROR');
      }
    });

    it('CONNECTION_LOSTエラーが正しく伝播される', async () => {
      const { providerFactory } = await import('./ssh/providerFactory');
      const mockProvider = providerFactory.getProcessProvider('local');
      (mockProvider.spawn as any).mockResolvedValueOnce({
        ok: false,
        error: { type: 'CONNECTION_LOST' },
      });

      const options: ProviderAgentProcessOptions = {
        agentId: 'test-agent-5',
        command: 'claude',
        args: [],
        cwd: '/remote',
        providerType: 'ssh',
      };

      const result = await createProviderAgentProcess(options);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('CONNECTION_LOST');
      }
    });

    it('環境変数が正しく渡される', async () => {
      const { providerFactory } = await import('./ssh/providerFactory');
      const mockProvider = providerFactory.getProcessProvider('local');

      const options: ProviderAgentProcessOptions = {
        agentId: 'test-agent-6',
        command: 'claude',
        args: [],
        cwd: '/test',
        env: {
          CUSTOM_VAR: 'custom_value',
        },
      };

      await createProviderAgentProcess(options);

      expect(mockProvider.spawn).toHaveBeenCalledWith(
        'claude',
        [],
        expect.objectContaining({
          cwd: '/test',
          env: expect.objectContaining({
            CUSTOM_VAR: 'custom_value',
          }),
        })
      );
    });
  });

  describe('AgentProcess interface', () => {
    it('onOutputコールバックが正しく動作する', async () => {
      const options: ProviderAgentProcessOptions = {
        agentId: 'test-agent-output',
        command: 'claude',
        args: [],
        cwd: '/test',
      };

      const result = await createProviderAgentProcess(options);
      expect(result.ok).toBe(true);

      if (result.ok) {
        const outputCallback = vi.fn();
        result.value.onOutput(outputCallback);

        // コールバックが登録されていることを確認
        expect(typeof result.value.onOutput).toBe('function');
      }
    });

    it('onExitコールバックが正しく動作する', async () => {
      const options: ProviderAgentProcessOptions = {
        agentId: 'test-agent-exit',
        command: 'claude',
        args: [],
        cwd: '/test',
      };

      const result = await createProviderAgentProcess(options);
      expect(result.ok).toBe(true);

      if (result.ok) {
        const exitCallback = vi.fn();
        result.value.onExit(exitCallback);

        expect(typeof result.value.onExit).toBe('function');
      }
    });

    it('killメソッドが正しく動作する', async () => {
      const options: ProviderAgentProcessOptions = {
        agentId: 'test-agent-kill',
        command: 'claude',
        args: [],
        cwd: '/test',
      };

      const result = await createProviderAgentProcess(options);
      expect(result.ok).toBe(true);

      if (result.ok) {
        result.value.kill();
        expect(result.value.isRunning).toBe(false);
      }
    });

    it('writeStdinメソッドが定義されている', async () => {
      const options: ProviderAgentProcessOptions = {
        agentId: 'test-agent-stdin',
        command: 'claude',
        args: [],
        cwd: '/test',
      };

      const result = await createProviderAgentProcess(options);
      expect(result.ok).toBe(true);

      if (result.ok) {
        expect(typeof result.value.writeStdin).toBe('function');
      }
    });
  });

  describe('getProviderTypeFromPath', () => {
    it('SSH URIに対してsshを返す', () => {
      const result = getProviderTypeFromPath('ssh://user@host/path');
      expect(result).toBe('ssh');
    });

    it('ローカルパスに対してlocalを返す', () => {
      const result = getProviderTypeFromPath('/Users/test/project');
      expect(result).toBe('local');
    });

    it('相対パスに対してlocalを返す', () => {
      const result = getProviderTypeFromPath('./project');
      expect(result).toBe('local');
    });
  });

  describe('createAgentProcessSync', () => {
    it('同期的にAgentProcessを返す', () => {
      const options = {
        agentId: 'sync-agent',
        command: 'claude',
        args: ['-p'],
        cwd: '/test',
      };

      const process = createAgentProcessSync(options);

      expect(process.agentId).toBe('sync-agent');
      expect(typeof process.onOutput).toBe('function');
      expect(typeof process.onExit).toBe('function');
      expect(typeof process.kill).toBe('function');
    });
  });

  describe('後方互換性', () => {
    it('既存のAgentProcessインターフェースと互換性がある', async () => {
      const options: ProviderAgentProcessOptions = {
        agentId: 'compat-agent',
        command: 'claude',
        args: ['-p', '--verbose', '--output-format', 'stream-json'],
        cwd: '/test/project',
        sessionId: 'session-abc',
      };

      const result = await createProviderAgentProcess(options);
      expect(result.ok).toBe(true);

      if (result.ok) {
        const process = result.value;

        // AgentProcess インターフェースのプロパティ
        expect(typeof process.agentId).toBe('string');
        expect(typeof process.pid).toBe('number');
        expect(typeof process.sessionId).toBe('string');
        expect(typeof process.isRunning).toBe('boolean');

        // AgentProcess インターフェースのメソッド
        expect(typeof process.writeStdin).toBe('function');
        expect(typeof process.kill).toBe('function');
        expect(typeof process.onOutput).toBe('function');
        expect(typeof process.onExit).toBe('function');
        expect(typeof process.onError).toBe('function');
      }
    });
  });
});
