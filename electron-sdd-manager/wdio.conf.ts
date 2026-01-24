import type { Options } from '@wdio/types';
import * as path from 'path';

// ELECTRON_RUN_AS_NODEが設定されていると、ElectronがNode.jsモードで動作し
// Chromedriverのコマンドラインオプションを認識できなくなる問題を回避
// 参考: https://www.electronjs.org/blog/statement-run-as-node-cves
delete process.env.ELECTRON_RUN_AS_NODE;

const projectRoot = path.resolve(__dirname);

// Mock Claude CLI for E2E testing
// This allows workflow tests to run without actual Claude API calls
const mockClaudePath = path.join(projectRoot, 'scripts/e2e-mock/mock-claude.sh');
process.env.E2E_MOCK_CLAUDE_COMMAND = mockClaudePath;
// Allow E2E_MOCK_CLAUDE_DELAY to be set via environment variable (default: 0.1s)
if (!process.env.E2E_MOCK_CLAUDE_DELAY) {
  process.env.E2E_MOCK_CLAUDE_DELAY = '0.1';
}

// E2Eテスト用のアプリ起動方法を選択
// - appEntryPoint: npm run build の成果物を使用（高速、開発時推奨）
// - appBinaryPath: electron-builder のパッケージ済みアプリを使用（CI/リリース前検証用）
// 環境変数 E2E_USE_PACKAGED_APP=true でパッケージ済みアプリを使用可能
const usePackagedApp = process.env.E2E_USE_PACKAGED_APP === 'true';

// npm run build の成果物（dist/main/index.js）
const appEntryPoint = path.join(projectRoot, 'dist/main/index.js');

// パッケージ済みアプリのバイナリパス（macOS）
const appBinaryPath = path.join(
  projectRoot,
  'release/mac-arm64/SDD Orchestrator.app/Contents/MacOS/SDD Orchestrator'
);

export const config: Options.Testrunner = {
  runner: 'local',
  autoCompileOpts: {
    autoCompile: true,
    tsNodeOpts: {
      project: './tsconfig.json',
      transpileOnly: true,
    },
  },

  specs: ['./e2e-wdio/**/*.spec.ts'],
  exclude: [],

  maxInstances: 1,

  capabilities: [
    {
      browserName: 'electron',
      maxInstances: 1,
      'wdio:electronServiceOptions': {
        // デフォルトは npm run build の成果物を使用（高速）
        // パッケージ済みアプリを使用する場合は E2E_USE_PACKAGED_APP=true を設定
        ...(usePackagedApp ? { appBinaryPath } : { appEntryPoint }),
        // E2Eテストモードを示すカスタム引数のみ
        appArgs: ['--e2e-test'],
        // Pass mock Claude CLI environment variables to the Electron app
        // E2E_MOCK_DOC_REVIEW_RESULT: "approved" or "needs_fix"
        // E2E_MOCK_TASKS_COMPLETE: "true" to mark tasks as complete after impl
        appEnv: {
          E2E_MOCK_CLAUDE_COMMAND: mockClaudePath,
          E2E_MOCK_CLAUDE_DELAY: process.env.E2E_MOCK_CLAUDE_DELAY || '0.1',
          E2E_MOCK_DOC_REVIEW_RESULT: process.env.E2E_MOCK_DOC_REVIEW_RESULT || '',
          E2E_MOCK_TASKS_COMPLETE: process.env.E2E_MOCK_TASKS_COMPLETE || 'false',
        },
      },
    },
  ],

  logLevel: 'info',
  bail: 0,
  waitforTimeout: 30000, // 30 seconds for element waits
  connectionRetryTimeout: 180000, // 3 minutes for connection
  connectionRetryCount: 3,

  services: ['electron'],

  framework: 'mocha',
  reporters: ['spec'],

  mochaOpts: {
    ui: 'bdd',
    timeout: 300000, // 5 minutes for long-running workflow tests (multiple phases)
  },

  /**
   * テスト開始前に既存のゾンビプロセスをクリーンアップ
   * user-data-dirが存在しないプロセスのみ終了（実行中のテストには影響しない）
   */
  onPrepare: async function () {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    try {
      const { stdout } = await execAsync(
        'bash -c \'./scripts/cleanup-zombie-electrons.sh 2>/dev/null || true\'',
        { cwd: process.cwd().replace('/electron-sdd-manager', '') }
      );
      if (stdout.trim()) {
        console.log('[wdio] Pre-test cleanup:', stdout.trim());
      }
    } catch {
      // Cleanup script not found or failed, ignore
    }
  },

  /**
   * テスト失敗・タイムアウト時のゾンビプロセス防止
   * afterSession: 各ワーカーセッション終了時に確実にブラウザを終了
   * onComplete: 全テスト完了後に残存するElectronプロセスをクリーンアップ
   */
  afterSession: async function () {
    // セッション終了時にブラウザを確実に終了させる
    try {
      // @ts-expect-error browser is globally available in WDIO context
      if (typeof browser !== 'undefined' && browser.deleteSession) {
        // @ts-expect-error browser is globally available in WDIO context
        await browser.deleteSession();
      }
    } catch {
      // セッションが既に終了している場合は無視
    }
  },

  onComplete: async function () {
    // 全テスト完了後、残存するE2Eテスト用Electronプロセスをクリーンアップ
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    try {
      // --e2e-test フラグ付きのElectronプロセスのみを終了
      await execAsync("pkill -f '\\-\\-e2e-test' || true");
      console.log('[wdio] E2E test Electron processes cleaned up');
    } catch {
      // プロセスが見つからない場合は無視
    }
  },
};
