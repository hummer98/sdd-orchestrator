import type { Options } from '@wdio/types';
import * as path from 'path';

const projectRoot = path.resolve(__dirname);

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
        // appBinaryPathを使用（appEntryPointはnode_modules/.bin/electronを使用するため問題あり）
        appBinaryPath,
        appArgs: ['--no-sandbox', '--e2e-test'],
      },
      'goog:chromeOptions': {
        args: [
          '--no-sandbox',
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--disable-software-rasterizer',
        ],
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
    timeout: 60000,
  },
};
