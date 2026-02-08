# E2Eテスト: SDD_PROJECT_PATH環境変数とモジュール二重評価問題

## 調査日
2026-02-08

## 概要

E2Eテストで`SDD_PROJECT_PATH`環境変数によるプロジェクト自動選択が機能しない問題を調査した。
複数の根本原因が特定された。

## 特定された問題

### 問題1: `appEnv`はwdio-electron-serviceの正式オプションではない

**影響**: `SDD_PROJECT_PATH`がElectronプロセスに届かない

`wdio.conf.ts`の`capabilities['wdio:electronServiceOptions'].appEnv`に設定された環境変数は、
wdio-electron-serviceに完全に無視される。`appEnv`は正式なオプションではなく、v9.2.1の
ソースコードとドキュメントのどちらにも存在しない。

**導入経緯**: コミット `17a97151` (2026-01-02) で Claude Opus 4.5 が生成したコード。
`appEnv`がwdio-electron-serviceの正式オプションであるかの検証なしに導入された。

**正しい方法**: wdio-electron-serviceはElectronを子プロセスとして起動するため、
`process.env`に直接設定すれば子プロセスに継承される。`E2E_MOCK_CLAUDE_COMMAND`等は
既にL70-74で`process.env`に直接設定されていたため動作していた。

**修正**: `appEnv`を削除し、`beforeSession`フックで`process.env.SDD_PROJECT_PATH`を
直接設定するように変更。

### 問題2: tRPC DI配線の欠落（handler.ts）

**影響**: Rendererの Pull model で `getInitialSelectResult()` が常に null を返す

`handler.ts`の`setupTRPCHandler()`で以下3つのサービスがtRPCコンテキストに注入されていなかった:
- `getInitialSelectResult` — 起動時プロジェクト選択結果のキャッシュ読み取り
- `clearInitialSelectResult` — キャッシュクリア
- `eventBus` — tRPC Subscriptionイベント配信

`productionServices.ts`のコメントに「handler.tsが別途注入する」と記載されていたが、
handler.tsには実際の注入コードが存在しなかった。`context.ts`のデフォルト実装（no-op:
`getInitialSelectResult: () => null`）が常に使用されていた。

**修正**: `handler.ts`に3サービスの注入コードを追加済み。

### 問題3: Viteビルド出力の循環依存によるモジュール二重評価（**本調査の核心**）

**影響**: `app.whenReady()`ハンドラが2回実行され、`selectProject`が`SELECTION_IN_PROGRESS`エラーで失敗。
        結果として`setInitialSelectResult`が呼ばれず、Pull model でキャッシュが空になる。

#### 発見過程

1. `main-e2e.log`で`Logger initialized`が同一pidで2回出力されていることを発見
2. タイムスタンプが異なる（124-173ms差）ため、console.log二重出力ではなくコンストラクタ二重呼び出しと判定
3. ProjectLoggerコンストラクタにスタックトレース出力プローブを仕込み
4. `module.parent?.filename`が1回目は`index.js`、2回目は`sessionRecoveryService-*.js`であることを特定

#### 循環依存の構造

```
Viteビルド出力:
dist/main/
  index.js                           (エントリポイント)
  index-ko76TGOo.js                  (メインチャンク: アプリ全体のコード)
  sessionRecoveryService-DK7kj386.js (分離チャンク)
  startImplPhase-DefeuGBE.js         (分離チャンク)
  projectUtils-DCoSRD5d.js           (分離チャンク)

依存グラフ:
  index.js
    → require("./index-ko76TGOo.js")        [メインチャンク]
        → require("./sessionRecoveryService-*.js")  [分離チャンク]
            → require("./index-ko76TGOo.js")        [循環! メインチャンクを逆参照]
        → require("./startImplPhase-*.js")          [分離チャンク]
            → require("./index-ko76TGOo.js")        [循環! メインチャンクを逆参照]
```

#### ソースコードの依存関係

```
src/main/index.ts
  → src/main/trpc/helpers/projectSetup.ts
      → await import('../../services/sessionRecoveryService')  [動的import → 別チャンク生成]

src/main/services/sessionRecoveryService.ts
  → import { projectLogger } from './projectLogger'    [メインチャンクへの逆参照]
  → import { getDefaultMetricsFileWriter } from './metricsFileWriter'  [同上]
  → import { SESSION_TEMP_FILE_PATH, ... } from '../types/metrics'     [同上]
```

Viteの`vite-plugin-electron`は、動的`import()`を検出して分離チャンクに切り出す。
しかし分離チャンク内で`projectLogger`等のメインチャンクのexportを参照するため、
ビルド出力で`require("./index-*.js")`としてメインチャンクへの逆参照が生成される。

#### 再評価のメカニズム

Node.jsのCommonJS `require()`は循環依存を検出するとキャッシュの不完全なexportsオブジェクトを
返す仕様だが、`Module._compile()`（=モジュールコードの評価）自体は2回実行される。

これにより：
1. メインチャンクのモジュールスコープコード（Logger生成、`app.whenReady().then()`登録）が2回実行
2. 2つのwhenReadyハンドラが登録され、インターリーブ実行
3. 1つ目の`selectProject`実行中に2つ目の`selectProject`が呼ばれ`SELECTION_IN_PROGRESS`

#### 検証データ

probe-double-eval.logの出力:
```
[08:41:52.996Z] ProjectLogger constructor pid=25174
  module.parent?.filename: dist/main/index.js        ← エントリポイントからの正常ロード

[08:41:53.120Z] ProjectLogger constructor pid=25174
  module.parent?.filename: dist/main/sessionRecoveryService-DK7kj386.js  ← 循環依存による再評価
```

## 追加調査: windowFactory.ts 抽出と preserveEntrySignatures (2026-02-08)

### 実施した変更

`index.ts` の循環依存とexportを完全に除去するため、以下の修正を実施:

| ファイル | 変更内容 |
|---------|---------|
| `windowFactory.ts` | **新規** — `createWindow()`, `getMainWindow()` を `index.ts` から抽出 |
| `appLifecycle.ts` | **新規** — `cleanupOnQuit()` を `index.ts` から抽出 |
| `index.ts` | **exportゼロ** — `createWindow`, `mainWindow`, `cleanupOnQuit` をすべて別モジュールに移動 |
| `menu.ts` | import元を `./index` → `./windowFactory` に変更 |
| `productionServices.ts` | `createNewWindow` の動的importハック（`await import('../index')`）を削除 |
| `vite.config.ts` | `preserveEntrySignatures: 'exports-only'` を追加 |

### preserveEntrySignatures の調査結果

**原因**: `vite-plugin-electron` が内部で `build.lib` モードを使用 → Vite が自動的に `preserveEntrySignatures: 'strict'` を設定 → Rollup が facade (shim) を生成

**解決**: `rollupOptions.preserveEntrySignatures: 'exports-only'` でfacade生成を抑制。

- **修正前**: `index.js` (79B, shim) + `index-6f93GWvU.js` (1.5MB, chunk) の2ファイル構造
- **修正後**: `index.js` (1.5MB, 単一ファイル) のみ

**しかし二重評価は解消されなかった。** facade/shim は根本原因ではない。

### 診断結果

| 検証項目 | 結果 |
|---------|------|
| バンドル内の `Logger initialized` 出現回数 | **1回** |
| バンドル内の `new ProjectLogger()` 出現回数 | **1回** |
| バンドル内の `whenReady` 出現回数 | **1回** |
| side chunks に Logger コード重複 | **なし** |
| `globalThis.__mainModuleEvalCount` による `index.ts` 二重評価検出 | **検出されず** |
| E2E ログの `Logger initialized` 出現回数 | **2回**（同一PID、148ms間隔） |

### 結論

- ビルド出力にコードの重複はない
- `index.ts` モジュール自体は1回しか評価されていない可能性がある
- しかし `ProjectLogger` の `initGlobalStream()` が2回実行されている
- 既存メモ（問題3）の分析「`sessionRecoveryService` 分離チャンクからの循環 `require` が再評価を引き起こす」は、`preserveEntrySignatures: 'exports-only'` 適用後（単一ファイル出力、side chunksは `require("./index.js")` でメインファイルを参照）でも問題が再現することから、**チャンク分離構造が直接の原因ではない**
- 根本原因は未特定。Electron/Chromedriver環境固有のモジュールローディング挙動、またはViteの動的importポリフィルのCJS変換に起因する可能性がある

## 修正方針

### 実施済み（循環依存除去）

- `windowFactory.ts`: `createWindow()` を `index.ts` から抽出、`menu.ts` ↔ `index.ts` の循環依存を解消
- `appLifecycle.ts`: `cleanupOnQuit()` を `index.ts` から抽出、エントリポイントのexportをゼロに
- `productionServices.ts`: 動的importハック (`await import('../index')`) を削除
- `vite.config.ts`: `preserveEntrySignatures: 'exports-only'` で facade 生成を抑制

### 未解決（二重評価）

**A案: 循環依存を解消する（推奨）**
- `sessionRecoveryService.ts`がメインチャンクのexportに依存しないようにリファクタリング
- `projectLogger`をDI（コンストラクタ引数）で渡す
- `SESSION_TEMP_FILE_PATH`等の定数を独立モジュールに分離

**B案: Viteのコード分割設定でチャンク分離を防止**
- `vite.config.ts`の`rollupOptions.output.manualChunks`で
  `sessionRecoveryService`をメインチャンクに含めるよう設定
- または `output.inlineDynamicImports: true` で全動的importを即時ロードに変更

**C案: globalThisガードで二重実行を防止（対症療法）**
- `app.whenReady()`ハンドラ内で`globalThis.__sddAppInitialized`フラグをチェック
- 根本原因を解決しないため推奨しない

## 現状のワークスペース変更

| ファイル | 状態 | 内容 |
|---------|------|------|
| `wdio.conf.ts` | 修正済み | `appEnv`削除、`process.env`直接設定に移行 |
| `handler.ts` | 修正済み | DI配線追加（getInitialSelectResult等） |
| `windowFactory.ts` | 新規作成 | `createWindow()`, `getMainWindow()` |
| `appLifecycle.ts` | 新規作成 | `cleanupOnQuit()` |
| `index.ts` | 修正済み | exportゼロ、診断コード残存（要削除） |
| `menu.ts` | 修正済み | import元を `./windowFactory` に変更 |
| `productionServices.ts` | 修正済み | 動的importハック削除 |
| `vite.config.ts` | 修正済み | `preserveEntrySignatures: 'exports-only'` 追加 |
| `menu.test.ts` | 修正済み | mock/importパスを `./windowFactory` に変更 |
| `index.test.ts` | 修正済み | `vi.mock('./windowFactory')` 追加、import先を `./appLifecycle` に変更 |
| `productionServices.test.ts` | 修正済み | `createNewWindow` テスト更新 |
| `projectLogger.ts` | 一時変更 | 調査用診断コード（要削除） |
