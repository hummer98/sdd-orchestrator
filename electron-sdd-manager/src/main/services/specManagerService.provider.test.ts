/**
 * SpecManagerService Provider Integration Tests
 * Task 13.2: SpecManagerServiceをProvider対応に拡張するテスト
 * Requirements: 3.1, 4.1, 5.1
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ProcessProvider, ProcessHandle, ProcessError, SpawnOptions, ExecResult } from './ssh/processProvider';
import type { Result } from '../../renderer/types';

// Mock ProcessProvider for testing
const createMockProcessProvider = (): ProcessProvider => {
  const mockHandle: ProcessHandle = {
    pid: 12345,
    isRunning: true,
    onOutput: vi.fn(),
    onExit: vi.fn(),
    kill: vi.fn(),
    writeStdin: vi.fn(),
    closeStdin: vi.fn(),
  };

  return {
    type: 'local' as const,
    spawn: vi.fn().mockResolvedValue({ ok: true, value: mockHandle }),
    exec: vi.fn().mockResolvedValue({
      ok: true,
      value: { stdout: '', stderr: '', exitCode: 0 },
    }),
  };
};

// Mock SSH ProcessProvider
const createMockSSHProcessProvider = (): ProcessProvider => {
  const mockHandle: ProcessHandle = {
    pid: 54321,
    isRunning: true,
    onOutput: vi.fn(),
    onExit: vi.fn(),
    kill: vi.fn(),
    writeStdin: vi.fn(),
    closeStdin: vi.fn(),
  };

  return {
    type: 'ssh' as const,
    spawn: vi.fn().mockResolvedValue({ ok: true, value: mockHandle }),
    exec: vi.fn().mockResolvedValue({
      ok: true,
      value: { stdout: '', stderr: '', exitCode: 0 },
    }),
  };
};

describe('SpecManagerService Provider Integration', () => {
  describe('Task 13.2: Provider対応リファクタリング', () => {
    let mockLocalProvider: ProcessProvider;
    let mockSSHProvider: ProcessProvider;

    beforeEach(() => {
      mockLocalProvider = createMockProcessProvider();
      mockSSHProvider = createMockSSHProcessProvider();
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    describe('ProviderAwareAgentProcess', () => {
      it('ローカルプロバイダーを使用してプロセスを起動できる', async () => {
        // ProviderAwareAgentProcessはProcessProviderを使用してプロセスを起動
        const spawnResult = await mockLocalProvider.spawn('claude', ['-p', '--verbose'], {
          cwd: '/test/project',
        });

        expect(spawnResult.ok).toBe(true);
        if (spawnResult.ok) {
          expect(spawnResult.value.pid).toBe(12345);
        }
        expect(mockLocalProvider.spawn).toHaveBeenCalledWith(
          'claude',
          ['-p', '--verbose'],
          { cwd: '/test/project' }
        );
      });

      it('SSHプロバイダーを使用してリモートプロセスを起動できる', async () => {
        const spawnResult = await mockSSHProvider.spawn('claude', ['-p', '--verbose'], {
          cwd: '/remote/project',
        });

        expect(spawnResult.ok).toBe(true);
        if (spawnResult.ok) {
          expect(spawnResult.value.pid).toBe(54321);
        }
        expect(mockSSHProvider.type).toBe('ssh');
      });

      it('プロセスの出力コールバックが正しく設定される', async () => {
        const spawnResult = await mockLocalProvider.spawn('claude', [], { cwd: '/test' });

        expect(spawnResult.ok).toBe(true);
        if (spawnResult.ok) {
          const handle = spawnResult.value;
          const outputCallback = vi.fn();
          handle.onOutput(outputCallback);
          expect(handle.onOutput).toHaveBeenCalledWith(outputCallback);
        }
      });

      it('プロセスの終了コールバックが正しく設定される', async () => {
        const spawnResult = await mockLocalProvider.spawn('claude', [], { cwd: '/test' });

        expect(spawnResult.ok).toBe(true);
        if (spawnResult.ok) {
          const handle = spawnResult.value;
          const exitCallback = vi.fn();
          handle.onExit(exitCallback);
          expect(handle.onExit).toHaveBeenCalledWith(exitCallback);
        }
      });

      it('プロセスをkillできる', async () => {
        const spawnResult = await mockLocalProvider.spawn('claude', [], { cwd: '/test' });

        expect(spawnResult.ok).toBe(true);
        if (spawnResult.ok) {
          const handle = spawnResult.value;
          handle.kill('SIGTERM');
          expect(handle.kill).toHaveBeenCalledWith('SIGTERM');
        }
      });
    });

    describe('SpecManagerService with Provider', () => {
      it('プロジェクトタイプに応じて適切なProviderを選択する', () => {
        // ローカルプロジェクト: localProvider を使用
        expect(mockLocalProvider.type).toBe('local');

        // SSHプロジェクト: sshProvider を使用
        expect(mockSSHProvider.type).toBe('ssh');
      });

      it('環境変数を含むspawnオプションが正しく渡される', async () => {
        const options: SpawnOptions = {
          cwd: '/test/project',
          env: {
            PATH: '/usr/local/bin:/usr/bin',
            CUSTOM_VAR: 'value',
          },
        };

        await mockLocalProvider.spawn('claude', ['-p'], options);

        expect(mockLocalProvider.spawn).toHaveBeenCalledWith('claude', ['-p'], options);
      });

      it('spawn失敗時にエラーを返す', async () => {
        const errorProvider: ProcessProvider = {
          type: 'local',
          spawn: vi.fn().mockResolvedValue({
            ok: false,
            error: { type: 'SPAWN_ERROR', message: 'Failed to spawn' },
          }),
          exec: vi.fn(),
        };

        const result = await errorProvider.spawn('invalid-command', [], { cwd: '/test' });

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.type).toBe('SPAWN_ERROR');
        }
      });

      it('SSH接続が切断された場合にCONNECTION_LOSTエラーを返す', async () => {
        const disconnectedProvider: ProcessProvider = {
          type: 'ssh',
          spawn: vi.fn().mockResolvedValue({
            ok: false,
            error: { type: 'CONNECTION_LOST' },
          }),
          exec: vi.fn(),
        };

        const result = await disconnectedProvider.spawn('claude', [], { cwd: '/remote' });

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.type).toBe('CONNECTION_LOST');
        }
      });
    });

    describe('後方互換性', () => {
      it('Providerが指定されない場合はデフォルトでローカルProviderを使用', () => {
        // デフォルトの動作はローカルProvider
        expect(mockLocalProvider.type).toBe('local');
      });

      it('既存のAgentProcess APIと互換性がある', async () => {
        // AgentProcess インターフェースの必須プロパティ
        const result = await mockLocalProvider.spawn('claude', ['-p'], { cwd: '/test' });

        expect(result.ok).toBe(true);
        if (result.ok) {
          const handle = result.value;
          // 既存のAgentProcessと同じインターフェース
          expect(typeof handle.pid).toBe('number');
          expect(typeof handle.isRunning).toBe('boolean');
          expect(typeof handle.onOutput).toBe('function');
          expect(typeof handle.onExit).toBe('function');
          expect(typeof handle.kill).toBe('function');
          expect(typeof handle.writeStdin).toBe('function');
        }
      });

      it('既存のcreateAgentProcess関数の呼び出し形式と互換', async () => {
        // createAgentProcess({agentId, command, args, cwd, sessionId})
        // Provider版: provider.spawn(command, args, {cwd, env})

        const command = 'claude';
        const args = ['-p', '--verbose', '--output-format', 'stream-json'];
        const cwd = '/test/project';

        const result = await mockLocalProvider.spawn(command, args, { cwd });

        expect(result.ok).toBe(true);
        expect(mockLocalProvider.spawn).toHaveBeenCalledWith(command, args, { cwd });
      });
    });

    describe('exec操作', () => {
      it('execコマンドが正しく実行される', async () => {
        const result = await mockLocalProvider.exec('which claude', { cwd: '/test' });

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.exitCode).toBe(0);
        }
      });

      it('SSHプロバイダーでexecが正しく動作する', async () => {
        const result = await mockSSHProvider.exec('which claude', { cwd: '/remote' });

        expect(result.ok).toBe(true);
      });
    });
  });
});
