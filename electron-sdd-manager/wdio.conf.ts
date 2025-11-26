import type { Options } from '@wdio/types';
import * as path from 'path';
import * as os from 'os';

const projectRoot = path.resolve(__dirname);

// Unique user data directory
const uniqueUserDataDir = path.join(
  os.tmpdir(),
  `wdio-electron-${Date.now()}-${Math.random().toString(36).substring(7)}`
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
        appEntryPoint: path.join(projectRoot, 'dist/main/index.js'),
        appArgs: ['--no-sandbox', '--e2e-test', `--user-data-dir=${uniqueUserDataDir}`],
      },
      'goog:chromeOptions': {
        args: [
          '--no-sandbox',
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--disable-software-rasterizer',
          `--user-data-dir=${uniqueUserDataDir}`,
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
