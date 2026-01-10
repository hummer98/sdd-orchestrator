/**
 * CLI Args Parser
 *
 * Task 10.1-10.3: CLI起動オプションの実装
 * Requirements: 11.1, 11.2, 11.3, 11.5, 11.6, 11.7, 11.9
 *
 * E2Eテスト用のコマンドライン引数解析。Remote UIの自動起動、
 * ヘッドレスモード、固定トークン等のオプションを提供する。
 */

/**
 * CLI Options型定義
 */
export interface CLIOptions {
  /** プロジェクトパス (--project=<path> or --project <path>) */
  projectPath: string | null;
  /** Remote UI自動起動 (--remote-ui=auto) */
  remoteUIAuto: boolean;
  /** Remote UIのポート番号 (--remote-port=<port>) */
  remotePort: number;
  /** ヘッドレスモード (--headless) */
  headless: boolean;
  /** 固定アクセストークン (--remote-token=<token>) */
  remoteToken: string | null;
  /** 認証無効化 (--no-auth) */
  noAuth: boolean;
  /** E2Eテストモード (--e2e-test) */
  e2eTest: boolean;
  /** ヘルプ表示 (--help or -h) */
  help: boolean;
}

/** デフォルトのRemote UIポート */
const DEFAULT_REMOTE_PORT = 8765;

/** ポート番号の有効範囲 */
const MIN_PORT = 1;
const MAX_PORT = 65535;

/**
 * コマンドライン引数を解析する
 *
 * @param args 引数配列（通常はprocess.argv.slice(2)）
 * @returns 解析されたCLIOptions
 */
export function parseCLIArgs(args: string[]): CLIOptions {
  const options: CLIOptions = {
    projectPath: null,
    remoteUIAuto: false,
    remotePort: DEFAULT_REMOTE_PORT,
    headless: false,
    remoteToken: null,
    noAuth: false,
    e2eTest: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    // --project=<path>
    if (arg.startsWith('--project=')) {
      options.projectPath = arg.substring('--project='.length);
    }
    // --project <path>
    else if (arg === '--project' && i + 1 < args.length) {
      options.projectPath = args[++i];
    }
    // --remote-ui=auto
    else if (arg === '--remote-ui=auto') {
      options.remoteUIAuto = true;
    }
    // --remote-port=<port>
    else if (arg.startsWith('--remote-port=')) {
      const portStr = arg.substring('--remote-port='.length);
      const port = parseInt(portStr, 10);
      if (!isNaN(port) && port >= MIN_PORT && port <= MAX_PORT) {
        options.remotePort = port;
      }
    }
    // --remote-port <port>
    else if (arg === '--remote-port' && i + 1 < args.length) {
      const portStr = args[++i];
      const port = parseInt(portStr, 10);
      if (!isNaN(port) && port >= MIN_PORT && port <= MAX_PORT) {
        options.remotePort = port;
      }
    }
    // --headless
    else if (arg === '--headless') {
      options.headless = true;
    }
    // --remote-token=<token>
    else if (arg.startsWith('--remote-token=')) {
      options.remoteToken = arg.substring('--remote-token='.length);
    }
    // --remote-token <token>
    else if (arg === '--remote-token' && i + 1 < args.length) {
      options.remoteToken = args[++i];
    }
    // --no-auth
    else if (arg === '--no-auth') {
      options.noAuth = true;
    }
    // --e2e-test
    else if (arg === '--e2e-test') {
      options.e2eTest = true;
    }
    // --help or -h
    else if (arg === '--help' || arg === '-h') {
      options.help = true;
    }
  }

  return options;
}

/**
 * ヘルプテキストを生成する
 *
 * @returns ヘルプテキスト
 */
export function printHelp(): string {
  return `
SDD Orchestrator - CLI Options

Usage:
  sdd-orchestrator [options]

Options:
  --project=<path>         プロジェクトディレクトリのパスを指定
  --project <path>         (上記と同等)

  --remote-ui=auto         Remote UIサーバーを自動起動
                           E2Eテストでブラウザからアクセスする場合に使用

  --remote-port=<port>     Remote UIサーバーのポート番号 (デフォルト: 8765)
  --remote-port <port>     (上記と同等)

  --headless               ヘッドレスモード（ウィンドウを表示しない）
                           CI/CD環境でのE2Eテスト実行に使用

  --remote-token=<token>   固定アクセストークンを指定
  --remote-token <token>   E2Eテストで既知のトークンを使用する場合に指定

  --no-auth                Remote UI認証を無効化
                           開発・テスト環境でのみ使用

  --e2e-test               E2Eテストモードを有効化
                           サンドボックスを無効化し、テスト用の設定を適用

  --help, -h               このヘルプを表示

Examples:
  # プロジェクトを指定して起動
  sdd-orchestrator --project=/path/to/project

  # E2Eテスト用にRemote UIを自動起動
  sdd-orchestrator --project=/path/to/project --remote-ui=auto --headless --e2e-test

  # 固定トークンでRemote UIを起動（自動テスト用）
  sdd-orchestrator --project=/path/to/project --remote-ui=auto --remote-token=test-token
`.trim();
}
