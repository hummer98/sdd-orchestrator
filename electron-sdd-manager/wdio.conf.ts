import type { Options } from '@wdio/types';
import * as path from 'path';
import * as fs from 'fs';

// ELECTRON_RUN_AS_NODEが設定されていると、ElectronがNode.jsモードで動作し
// Chromedriverのコマンドラインオプションを認識できなくなる問題を回避
// 参考: https://www.electronjs.org/blog/statement-run-as-node-cves
delete process.env.ELECTRON_RUN_AS_NODE;

const projectRoot = path.resolve(__dirname);
const e2eWdioDir = path.join(projectRoot, 'e2e-wdio');
const fixturesDir = path.join(e2eWdioDir, 'fixtures');

// Main process E2E log file path (Renderer console logs are forwarded here)
const mainE2ELogPath = path.join(projectRoot, '..', 'logs', 'main-e2e.log');

/**
 * Spec file → Fixture project mapping
 *
 * Each E2E spec file is launched with SDD_PROJECT_PATH pointing to its fixture.
 * Default fixture is 'test-project'. Only overrides are listed here.
 *
 * To add a new mapping: add the spec file basename (without .e2e.spec.ts / .spec.ts)
 * and the fixture directory name under e2e-wdio/fixtures/.
 */
const DEFAULT_FIXTURE = 'test-project';
const fixtureOverrides: Record<string, string> = {
  'agent-delete': 'auto-exec-test',
  'agent-log-streaming': 'auto-exec-test',
  'agent-resume-log-display': 'auto-exec-test',
  'auto-execution-document-review': 'document-review-test',
  'auto-execution-impl-flow': 'tasks-approved-project',
  'auto-execution-impl-phase': 'impl-test',
  'auto-execution-resume': 'resume-test',
  'bug-auto-execution': 'bug-auto-exec-test',
  'bugs-file-watcher': 'bugs-pane-test',
  'bugs-pane-integration': 'bugs-pane-test',
  'bugs-worktree-support': 'bugs-pane-test',
  'cloudflare-tunnel': 'bugs-pane-test',
  'edit-preview-toggle': 'project-file-test',
  'diagnostic': 'auto-exec-test',
  'diagnostic-project-selection': 'impl-test',
  'document-review-ui-states': 'doc-review-ui-test',
  'file-watcher-ui-update': 'auto-exec-test',
  'gemini-document-review': 'doc-review-ui-test',
  'inspection-workflow': 'inspection-test',
  'mermaid-preview': 'mermaid-test',
  'parsed-log-entry-display': 'auto-exec-test',
  'permission-control': 'permission-control-test',
  'project-docs-viewer': 'docs-viewer-test',
  'project-file-editing': 'project-file-test',
  'file-change-dialogs': 'project-file-test',
  'remote-webserver': 'bugs-pane-test',
  'schedule-type-settings': 'auto-exec-test',
  'simple-auto-execution': 'auto-exec-test',
  'worktree-execution': 'worktree-exec-test',
  'worktree-spec-sync': 'worktree-spec-sync-test',
  'worktree-two-stage-watcher': 'worktree-spec-sync-test',
  // multi-window-integration Task 10: Multi-window E2E tests
  'multi-window-creation': 'multi-window-test-a',
  'multi-window-duplicate-prevention': 'multi-window-test-a',
  'multi-window-trpc': 'multi-window-test-a',
  'multi-window-cleanup': 'multi-window-test-a',
};

/**
 * Resolve fixture path for a given spec file.
 * Strips .e2e.spec.ts or .spec.ts suffix and looks up the override map.
 */
function resolveFixtureForSpec(specFilePath: string): string {
  const basename = path.basename(specFilePath)
    .replace(/\.e2e\.spec\.ts$/, '')
    .replace(/\.spec\.ts$/, '');
  const fixture = fixtureOverrides[basename] || DEFAULT_FIXTURE;
  return path.join(fixturesDir, fixture);
}

// Mock Claude CLI for E2E testing
// This allows workflow tests to run without actual Claude API calls
// Environment variables set on process.env are inherited by the Electron child process
const mockClaudePath = path.join(projectRoot, 'scripts/e2e-mock/mock-claude.sh');
process.env.E2E_MOCK_CLAUDE_COMMAND = mockClaudePath;
// Allow E2E_MOCK_CLAUDE_DELAY to be set via environment variable (default: 1s)
// Note: 0.1s was too fast - transitional UI states (e.g. "停止" button) were never observable
if (!process.env.E2E_MOCK_CLAUDE_DELAY) {
  process.env.E2E_MOCK_CLAUDE_DELAY = '1';
}
// Default mock environment variables (can be overridden via CLI env vars)
if (!process.env.E2E_MOCK_DOC_REVIEW_RESULT) {
  process.env.E2E_MOCK_DOC_REVIEW_RESULT = '';
}
if (!process.env.E2E_MOCK_TASKS_COMPLETE) {
  process.env.E2E_MOCK_TASKS_COMPLETE = 'false';
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
        // NOTE: appEnv is NOT a valid wdio-electron-service option (silently ignored).
        // Environment variables are passed via process.env inheritance instead.
        // See: process.env.* settings at the top of this file.
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
   * Specファイルごとに SDD_PROJECT_PATH を動的に設定
   * process.env に直接設定 → Electron子プロセスが継承
   * Main processが直接読み取るため、Renderer→IPC→Main の不安定な経路を回避
   *
   * _sddProjectPathSetByWdio: wdioが自動設定した場合のフラグ。
   * ユーザーが明示的に SDD_PROJECT_PATH を設定した場合はそちらを優先する。
   */
  beforeSession: function (_config, _capabilities, specs) {
    const specFile = specs[0];
    const userSetPath = process.env.SDD_PROJECT_PATH;
    const autoSet = (process.env as any)._sddProjectPathSetByWdio === 'true';

    // ユーザーが明示的に設定 & wdioの自動設定ではない場合は維持
    if (userSetPath && !autoSet) {
      console.log(`[wdio] Using user-specified SDD_PROJECT_PATH: ${userSetPath}`);
      return;
    }

    if (specFile) {
      const fixturePath = resolveFixtureForSpec(specFile);
      process.env.SDD_PROJECT_PATH = fixturePath;
      (process.env as any)._sddProjectPathSetByWdio = 'true';
      console.log(`[wdio] SDD_PROJECT_PATH set to ${fixturePath} for ${path.basename(specFile)}`);
    }
  },

  /**
   * テスト開始前に既存のゾンビプロセスをクリーンアップ
   * user-data-dirが存在しないプロセスのみ終了（実行中のテストには影響しない）
   */
  onPrepare: async function () {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    // Zombie Electron cleanup
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

    // Auto-build: rebuild if source files are newer than dist
    if (process.env.E2E_SKIP_BUILD !== 'true') {
      const distMain = path.join(projectRoot, 'dist', 'main', 'index.js');
      let needsBuild = !fs.existsSync(distMain);

      if (!needsBuild) {
        const distMtime = fs.statSync(distMain).mtimeMs;
        // Check if any source file is newer than dist (cross-platform, no shell dependency)
        const srcDirs = ['src/main', 'src/renderer', 'src/shared'];
        const findNewerFile = (dir: string): string | null => {
          if (!fs.existsSync(dir)) return null;
          for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
              const found = findNewerFile(fullPath);
              if (found) return found;
            } else if (/\.(ts|tsx)$/.test(entry.name)) {
              if (fs.statSync(fullPath).mtimeMs > distMtime) return fullPath;
            }
          }
          return null;
        };
        for (const dir of srcDirs) {
          const newerFile = findNewerFile(path.join(projectRoot, dir));
          if (newerFile) {
            needsBuild = true;
            console.log(`[wdio] Source newer than dist: ${newerFile}`);
            break;
          }
        }
      }

      if (needsBuild) {
        console.log('[wdio] Building app before E2E tests...');
        try {
          await execAsync('npm run build', { cwd: projectRoot, timeout: 120000 });
          console.log('[wdio] Build completed.');
        } catch (buildError) {
          console.error('[wdio] Build failed:', buildError);
          throw new Error('E2E pre-test build failed. Fix build errors before running tests.');
        }
      } else {
        console.log('[wdio] Dist is up-to-date, skipping build.');
      }
    }
  },

  /**
   * Rendererのconsole出力をキャプチャ（Main process ログファイル経由）
   *
   * Main process が webContents.on('console-message') で Renderer のコンソール出力を
   * main-e2e.log に [Renderer Console] プレフィックス付きで記録する。
   * セッション開始時のログファイルサイズを記録し、各テスト終了時に差分を表示する。
   *
   * テスト失敗時に自動出力、E2E_VERBOSE_LOGS=true で常時出力。
   */
  before: async function () {
    // Record log file size at session start (before Electron app loads)
    // This captures all Renderer logs including app initialization
    try {
      const stat = fs.statSync(mainE2ELogPath);
      (globalThis as any).__logOffsetSessionStart = stat.size;
    } catch {
      (globalThis as any).__logOffsetSessionStart = 0;
    }
    // Per-test offset starts at session start
    (globalThis as any).__logOffsetBeforeTest = (globalThis as any).__logOffsetSessionStart;
  },

  beforeTest: async function () {
    // Record log file size at test start to extract only new entries per test
    try {
      const stat = fs.statSync(mainE2ELogPath);
      (globalThis as any).__logOffsetBeforeTest = stat.size;
    } catch {
      // Keep previous offset
    }
  },

  afterTest: async function (_test, _context, result) {
    const showLogs = !result.passed || process.env.E2E_VERBOSE_LOGS === 'true';
    if (!showLogs) return;

    const offsetBefore: number = (globalThis as any).__logOffsetBeforeTest ?? 0;

    try {
      const stat = fs.statSync(mainE2ELogPath);
      const bytesToRead = stat.size - offsetBefore;
      if (bytesToRead <= 0) return;

      // Read only the new portion of the log file
      const fd = fs.openSync(mainE2ELogPath, 'r');
      const buffer = Buffer.alloc(Math.min(bytesToRead, 256 * 1024)); // cap at 256KB
      fs.readSync(fd, buffer, 0, buffer.length, offsetBefore);
      fs.closeSync(fd);

      const newLines = buffer.toString('utf-8').split('\n');
      // Filter for Renderer Console entries only
      const rendererLines = newLines.filter(line => line.includes('[Renderer Console]'));

      if (rendererLines.length === 0) return;

      console.log(`\n[renderer-console] ${rendererLines.length} entries:`);
      for (const line of rendererLines) {
        const errMatch = line.includes('[ERROR]');
        const warnMatch = line.includes('[WARNING]');
        const icon = errMatch ? 'ERR' : warnMatch ? 'WRN' : '   ';
        const idx = line.indexOf('[Renderer Console]');
        const content = idx >= 0 ? line.substring(idx) : line;
        console.log(`  ${icon} ${content}`);
      }
    } catch {
      // Log file not available or read error — silent fallback
    }
  },

  /**
   * セッション終了時に全Rendererコンソールログをダンプ（初期化ログ含む）
   * テスト失敗時 or E2E_VERBOSE_LOGS=true で出力
   */
  after: async function (result) {
    const showLogs = result !== 0 || process.env.E2E_VERBOSE_LOGS === 'true';
    if (!showLogs) return;

    const sessionOffset: number = (globalThis as any).__logOffsetSessionStart ?? 0;

    try {
      const stat = fs.statSync(mainE2ELogPath);
      const bytesToRead = stat.size - sessionOffset;
      if (bytesToRead <= 0) return;

      const fd = fs.openSync(mainE2ELogPath, 'r');
      const buffer = Buffer.alloc(Math.min(bytesToRead, 512 * 1024)); // cap at 512KB
      fs.readSync(fd, buffer, 0, buffer.length, sessionOffset);
      fs.closeSync(fd);

      const newLines = buffer.toString('utf-8').split('\n');
      const rendererLines = newLines.filter(line => line.includes('[Renderer Console]'));

      if (rendererLines.length === 0) return;

      console.log(`\n[renderer-console-session] ${rendererLines.length} total entries for this session:`);
      for (const line of rendererLines) {
        const errMatch = line.includes('[ERROR]');
        const warnMatch = line.includes('[WARNING]');
        const icon = errMatch ? 'ERR' : warnMatch ? 'WRN' : '   ';
        const idx = line.indexOf('[Renderer Console]');
        const content = idx >= 0 ? line.substring(idx) : line;
        console.log(`  ${icon} ${content}`);
      }
    } catch {
      // Silent fallback
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
