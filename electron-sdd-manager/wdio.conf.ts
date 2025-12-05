import type { Options } from '@wdio/types';
import * as path from 'path';
import * as os from 'os';
import { mkdirSync, rmSync } from 'fs';

const projectRoot = path.resolve(__dirname);

// Generate unique user data directory for each test run
const generateUserDataDir = () => {
  const dir = path.join(
    os.tmpdir(),
    `wdio-electron-${Date.now()}-${Math.random().toString(36).substring(7)}`
  );
  mkdirSync(dir, { recursive: true });
  return dir;
};

const userDataDir = generateUserDataDir();

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
        appArgs: ['--no-sandbox', '--e2e-test', `--user-data-dir=${userDataDir}`],
      },
      'goog:chromeOptions': {
        args: [
          '--no-sandbox',
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--disable-software-rasterizer',
          `--user-data-dir=${userDataDir}`,
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

  onComplete: () => {
    // Clean up user data directory after tests
    try {
      rmSync(userDataDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  },
};
