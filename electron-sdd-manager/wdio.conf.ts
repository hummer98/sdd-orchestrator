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
        appEnv: {
          E2E_MOCK_CLAUDE_COMMAND: mockClaudePath,
          E2E_MOCK_CLAUDE_DELAY: process.env.E2E_MOCK_CLAUDE_DELAY || '0.1',
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
};
