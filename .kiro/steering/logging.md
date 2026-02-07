# Logging Guideline

ロギングに関する設計/実装の観点・ガイドライン。言語/フレームワーク非依存の観点を定義する。

## 必須観点 (Critical)

### console.* の使用制限

**必須**: `console.log/warn/error/info` の直接使用を避けること。

**理由**:
- ログレベルの制御ができない（常に出力される）
- 構造化されていない（パースが困難）
- 環境ごとの出力先制御ができない

**代替手段**: 本プロジェクトでは `logger` を使用すること。

```typescript
// ❌ 悪い例
console.log('Processing started');
console.warn('[service] Invalid format');
console.error('Failed to load', error);

// ✅ 良い例
import { logger } from './logger';

logger.debug('Processing started', { itemCount: 10 });
logger.warn('[service] Invalid format', { path: configPath });
logger.error('Failed to load', { error });
```

**例外**: 以下の場合のみ `console.*` の使用を許可：
- アプリケーション起動前のブートストラップ処理
- ロガー初期化前のエラーハンドリング

### ログレベル対応

アプリケーションは以下のログレベルをサポートすること:

| レベル | 用途 | 例 |
|--------|------|-----|
| debug | 開発時のデバッグ情報 | 変数値、関数呼び出しトレース |
| info | 正常系の動作記録 | 処理開始/完了、ユーザーアクション |
| warning | 潜在的な問題の警告 | 非推奨APIの使用、リトライ発生 |
| error | エラー発生時の詳細 | 例外発生、処理失敗 |

**ログレベルの選択基準**:

- **debug**: 本番環境では出力されない情報。開発時のみ有用。
- **info**: 正常動作の記録。監視やトラブルシューティングに必要。
- **warning**: 現在は動作するが、将来問題になる可能性がある状況。ユーザーや開発者の注意が必要。
- **error**: 処理が失敗し、ユーザーやシステムに影響がある状況。即座の対応が必要。

**判断に迷う場合**:
- ファイルが見つからない場合 → 正常な状態として扱えるなら`debug`、エラーなら`error`
- 不明な設定値 → デフォルト値で動作するなら`debug`、動作に影響するなら`warning`

### ログフォーマット

AIアシスタントがログを正確に解析できるフォーマットを採用すること。

**推奨フォーマット例**:
```
[YYYY-MM-DD HH:mm:ss.SSS] [LEVEL] [component] message
```

**構造化ログ（JSON lines）**も有効な選択肢:
```json
{"timestamp":"2025-01-01T12:00:00.000Z","level":"ERROR","component":"auth","message":"Login failed","userId":"123"}
```

### ログ場所の言及

ログファイルの保存場所を以下のいずれかに記載すること:
- `.kiro/steering/debugging.md`
- `CLAUDE.md`

これにより、AIアシスタントがデバッグ時にログを参照できる。

### 過剰なログ実装の回避

- ループ内での過剰なログ出力を避ける
- 大量のデータをログに含めない
- 機密情報（パスワード、トークン、個人情報等）をログに出力しない

## 推奨観点 (Warning)

### 開発/本番ログ出力先分離

開発中のログと本番ログを分離し、調査時の混乱を防止:

| 環境 | 出力先 |
|------|--------|
| 開発 | プロジェクト配下のディレクトリ（例: `./logs/`） |
| 本番 | システム標準のログディレクトリ（例: `~/Library/Logs/`） |

### ログレベル指定手段

以下のいずれかの方法でログレベルを指定可能にすること:
- CLI引数（例: `--log-level=debug`）
- 環境変数（例: `LOG_LEVEL=debug`）
- 設定ファイル（例: `config.json`の`logLevel`フィールド）

### 調査用変数のログ出力

エラー発生時に調査に必要なコンテキスト情報をログに含める:
- リクエスト/レスポンスの識別子
- ユーザーID（マスキング推奨）
- 処理対象のリソースID
- エラー発生時のスタックトレース

## Rendererプロセスのロギングアーキテクチャ

Rendererプロセス（UIフロントエンド）は直接ファイルにログを書けないため、2つの経路でMainプロセスに送信し、ファイルに記録する。

### レイヤー構成

| レイヤー | ファイル | 役割 | 有効環境 |
|----------|----------|------|----------|
| **console-message**（native キャプチャ） | `main/index.ts` | Electron native API で Renderer の `console.*` 出力をキャプチャし、Main logger にレベル別記録 | 全環境 |
| **rendererLogger**（明示的ロガー） | `renderer/utils/rendererLogger.ts` | `console.*` 互換API、tRPC経由でMainに送信 | 全環境 |

### console-message（native キャプチャ）

- Electron の `webContents.on('console-message')` native API で Renderer の全 `console.*` 出力を自動キャプチャ
- `level` パラメータ（0=debug, 1=info, 2=warn, 3=error）を Main process の `logger` メソッドに直接マッピング
- monkey-patch 不要、tRPC 依存なし、全環境で動作
- `consoleHook.ts` と `noiseFilter.ts` は廃止済み（ipclink-singleton-unification DD-003）

### rendererLogger（明示的ロガー）

- `console.*` 互換のAPI（`rendererLogger.log/info/warn/error/debug`）
- `getVanillaClient().misc.logRenderer.mutate()` 経由でtRPCでMainプロセスに送信
- 自動コンテキスト付与: 現在のspecId/bugName、スタックトレースからのファイル名抽出
- `import { rendererLogger as console }` でdrop-in置換可能

### IPC経路

```
経路1: console-message native（全 console.* 出力を自動キャプチャ）
Renderer console.*
  → Electron native IPC (console-message event)
    → Main process: webContents.on('console-message')
      → ProjectLogger (level別: debug/info/warn/error)
        → {projectPath}/.kiro/logs/main.log + グローバルログ

経路2: rendererLogger（明示的ロガーAPI、構造化コンテキスト付き）
rendererLogger.log/info/warn/error/debug(message)
  → getVanillaClient().misc.logRenderer.mutate({ level, message, context })
    → tRPC IPC
      → Main process: misc.logRenderer handler
        → ProjectLogger
          → {projectPath}/.kiro/logs/main.log + グローバルログ
```

### 実装時の注意

- Rendererでの新しいロギングには `rendererLogger` を使用すること（`console.*` ではなく）
- `notify.*()` 呼び出しは内部的にrendererログも出力する（`debugging.md` のnotifyセクション参照）
- `console.*` は console-message native API で自動的にキャプチャされるが、構造化コンテキスト（specId等）は付与されない。コンテキスト付きログが必要な場合は `rendererLogger` を使用

### 関連ソース

- [rendererLogger.ts](electron-sdd-manager/src/renderer/utils/rendererLogger.ts) - 明示的ロガーAPI
- [contextProvider.ts](electron-sdd-manager/src/renderer/utils/contextProvider.ts) - 自動コンテキスト取得

## 参照

- **デバッグ手順**: `.kiro/steering/debugging.md`
- **プロジェクト固有のログ設定**: 各プロジェクトの`debugging.md`に記載
