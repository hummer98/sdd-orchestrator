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

// ビルド済みアプリのバイナリパス（macOS）
// 注意: electron-builderでビルド後に使用可能
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
        appBinaryPath,
        // E2Eテストモードを示すカスタム引数のみ
        appArgs: ['--e2e-test'],
      },
    },
  ],

  logLevel: 'info',
  bail: 0,
  waitforTimeout: 10000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,

  services: ['electron'],

  framework: 'mocha',
  reporters: ['spec'],

  mochaOpts: {
    ui: 'bdd',
    timeout: 120000, // 2 minutes for workflow tests
  },
};
