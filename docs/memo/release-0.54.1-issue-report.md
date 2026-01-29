# v0.54.1 リリース時の起動エラー問題

## 発生日時
2026-01-29

## 問題の概要

`/release --auto` 実行中に、パッケージングしたアプリが起動しない問題が発生。

## エラーの内容

```
TypeError: Cannot read properties of undefined (reading 'isPackaged')
```

## 発生経緯

1. `/release --auto` を実行
2. ビルド＆パッケージングは正常に完了
3. スモークテストでプロセスは起動したように見えたが、画面が真っ白
4. ログを確認すると、アプリが起動時にクラッシュしていることが判明

## 原因分析

### 直接的な原因
`logger.ts` と `projectLogger.ts` で、モジュールのトップレベルでシングルトンインスタンスを作成している：

```typescript
// モジュールロード時に即座に実行される
export const logger = new Logger();
```

Logger のコンストラクタ内で `app.isPackaged` にアクセスしているが、Vite のバンドル順序によっては、`electron.app` が完全に初期化される前にこのコードが実行される。

### 根本的な原因
- Vite のバンドル順序は決定的ではなく、新しいモジュールの追加や依存関係の変化で変わる
- 今回、何らかの変更でバンドル順序が変わり、logger モジュールが早くロードされるようになった
- この問題は以前から潜在的に存在していたが、今回初めて顕在化した

## 試みた対策

### 1. Logger の遅延初期化（Proxy パターン）

**変更内容**: `logger.ts`, `projectLogger.ts`

```typescript
// Before
export const logger = new Logger();

// After
let _logger: Logger | null = null;

function getLogger(): Logger {
  if (!_logger) {
    _logger = new Logger();
  }
  return _logger;
}

export const logger: Logger = new Proxy({} as Logger, {
  get(_target, prop: keyof Logger) {
    const instance = getLogger();
    const value = instance[prop];
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  },
});
```

**結果**: 別の箇所で同じエラーが発生

### 2. handlers.ts のサービスインスタンス遅延初期化

**変更内容**: `handlers.ts`

```typescript
// Before
const experimentalToolsInstaller = new ExperimentalToolsInstallerService(getExperimentalTemplateDir());
const commandInstallerService = new CommandInstallerService(getTemplateDir());
// ...

// After
let _experimentalToolsInstaller: ExperimentalToolsInstallerService | null = null;

function getLazyExperimentalToolsInstaller(): ExperimentalToolsInstallerService {
  if (!_experimentalToolsInstaller) {
    _experimentalToolsInstaller = new ExperimentalToolsInstallerService(getExperimentalTemplateDir());
  }
  return _experimentalToolsInstaller;
}
// ...
```

**結果**: 別の箇所で同じエラーが発生

### 3. app.isPackaged の安全なアクセス

**変更内容**: `logger.ts`, `projectLogger.ts`, `resourcePaths.ts`, `index.ts`

```typescript
// Before
if (app.isPackaged) { ... }

// After
const isPackaged = app && typeof app.isPackaged !== 'undefined' ? app.isPackaged : false;
if (isPackaged) { ... }
```

**結果**: 別のエラー `Cannot read properties of undefined (reading 'whenReady')` が発生

### 4. index.ts の app アクセス安全化

**変更内容**: `index.ts`

```typescript
// CLI args parsing
const isAppPackaged = app && typeof app.isPackaged !== 'undefined' ? app.isPackaged : false;
const cliArgs = isAppPackaged ? process.argv.slice(1) : process.argv.slice(2);

// Error handler
if (app && typeof app.isReady === 'function' && app.isReady()) {
  dialog.showErrorBox(...);
}

// app.commandLine access
if (app && app.commandLine && typeof app.commandLine.getSwitchValue === 'function') {
  const switchValue = app.commandLine.getSwitchValue('project');
}
```

**結果**: まだ `app.whenReady` で同じエラーが発生

## 現在の状況

- v0.54.0 (Applications にインストール済み) は正常に動作
- 新しいビルドでは `require("electron")` の結果で `app` が undefined になっている
- 問題の根本原因は Vite + vite-plugin-electron のバンドル処理にある可能性

## 変更されたファイル

1. `electron-sdd-manager/src/main/services/logger.ts`
2. `electron-sdd-manager/src/main/services/projectLogger.ts`
3. `electron-sdd-manager/src/main/utils/resourcePaths.ts`
4. `electron-sdd-manager/src/main/ipc/handlers.ts`
5. `electron-sdd-manager/src/main/index.ts`
6. `electron-sdd-manager/package.json` (version: 0.54.1)
7. `CHANGELOG.md`

## 次のステップ案

1. **変更をリバート**: すべての修正を取り消し、v0.54.0 の状態に戻す
2. **vite.config.ts の確認**: electron の外部化設定を確認
3. **クリーンビルド**: node_modules/.vite キャッシュを削除して再ビルド
4. **段階的なデバッグ**: 1つずつ変更を追加してどこで壊れるか特定
5. **vite-plugin-electron のアップデート確認**: 最近のバージョン変更がないか確認

## 参考情報

- Applications にある v0.54.0 は正常に動作
- 開発版 (`npm run dev:electron`) でも同じエラーが発生
- エラーは `process.on('uncaughtException')` ハンドラから logger を呼び出す際に発生

## 解決 (2026-01-29)

### 原因特定
根本原因は `electron-sdd-manager/vite.config.ts` に追加されていた `@rollup/plugin-node-resolve` プラグインでした。
このプラグインが `vite-plugin-electron` と競合し、Electron Mainプロセスバンドル内で `require('electron')` が Electron ランタイムの組み込みモジュールではなく、`node_modules/electron/index.js` (npm パッケージ、バイナリへのパスを返す) を解決してしまっていました。
その結果、`require('electron')` がオブジェクトではなく文字列を返し、`app` プロパティが `undefined` となっていました。

### 実施した修正
1. **`vite.config.ts` の修正**: `nodeResolve` プラグインを削除しました。`electron` は `external` 指定されており、ランタイムで解決されるべきものであるため、このプラグインは不要かつ有害でした。
2. **暫定対応のリバート**: 問題解決のために導入されていた以下の複雑な回避策を全て撤回し、コードをシンプルで正しい状態（v0.54.0相当）に戻しました。
    - `logger.ts`, `projectLogger.ts`: Proxyパターンによる遅延初期化を削除し、単純なシングルトンエクスポートに戻しました。
    - `handlers.ts`: サービスの遅延初期化を削除しました。
    - `resourcePaths.ts`, `index.ts`: `app` や `app.isPackaged` への過剰な「安全なアクセス」チェック（`app && ...`）を削除しました。

### 検証結果
- `npm run build` が正常に完了することを確認。
- ビルド後のアプリ (`electron .`) が正常に起動し、ログに `app` オブジェクトが正しく認識されていることを確認しました。

