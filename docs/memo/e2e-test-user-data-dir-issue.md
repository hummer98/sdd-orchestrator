# E2Eテスト user-data-dir 競合問題

## 問題概要

wdio-electron-serviceを使用したE2Eテスト実行時に、`user-data-dir`の競合エラーが発生し、テストセッションを作成できない。

## エラーメッセージ

```
WebDriverError: session not created: probably user data directory is already in use,
please specify a unique value for --user-data-dir argument, or don't use --user-data-dir
```

## 発生条件

1. 複数のE2Eテストスペックファイルが存在する場合
2. 各スペックファイルが同じ`user-data-dir`を共有しようとする
3. VSCode（Electron）などの他のElectronプロセスがバックグラウンドで動作している環境
4. **単一のスペックファイルでも発生** - 複数スペック実行とは無関係の問題

## 現在のスペックファイル

- `e2e-wdio/app-launch.spec.ts`
- `e2e-wdio/auto-execution.spec.ts`
- `e2e-wdio/bug-workflow.e2e.spec.ts`
- `e2e-wdio/experimental-tools-installer.spec.ts`

## 環境情報

- wdio-electron-service: 9.2.1
- @wdio/cli: 9.20.1
- Electron: 35.5.1
- Chromedriver: 134.0.6998.205
- OS: macOS Darwin 23.5.0

## 試した対策

### 1. 一意のuserDataDir生成（初期実装）

```typescript
const generateUserDataDir = () => {
  const dir = path.join(
    os.tmpdir(),
    `wdio-electron-${Date.now()}-${Math.random().toString(36).substring(7)}`
  );
  mkdirSync(dir, { recursive: true });
  return dir;
};
```

**結果**: 設定読み込み時に一度だけ生成されるため、全スペックで同じディレクトリを使用してしまう

### 2. services内でappArgs関数を使用

```typescript
services: [
  [
    'electron',
    {
      appArgs: (caps: WebdriverIO.Capabilities) => {
        const userDataDir = generateUserDataDir();
        return ['--no-sandbox', '--e2e-test', `--user-data-dir=${userDataDir}`];
      },
    },
  ],
],
```

**結果**: appArgsの関数形式がwdio-electron-serviceでサポートされていない

### 3. Electronアプリの停止とクリーンアップ

```bash
task electron:stop
rm -rf /var/folders/.../wdio-electron-*
```

**結果**: 競合は解消されず

### 4. onWorkerStartフックでの動的設定（2024-12-20実施）

```typescript
onWorkerStart: (cid, caps, specs) => {
  const specFileName = specs[0] ? path.basename(specs[0], '.ts') : 'default';
  const uniqueUserDataDir = generateUserDataDir(specFileName);
  const capsRecord = caps as Record<string, unknown>;

  // wdio:electronServiceOptionsのappArgsにuser-data-dirを追加
  const electronOptions = capsRecord['wdio:electronServiceOptions'] as Record<string, unknown> | undefined;
  if (electronOptions) {
    const existingAppArgs = (electronOptions.appArgs || []) as string[];
    electronOptions.appArgs = [...existingAppArgs, `--user-data-dir=${uniqueUserDataDir}`];
  }

  // goog:chromeOptionsのargsにもuser-data-dirを追加
  const chromeOptions = capsRecord['goog:chromeOptions'] as Record<string, unknown> | undefined;
  if (chromeOptions) {
    const existingArgs = (chromeOptions.args || []) as string[];
    chromeOptions.args = [...existingArgs, `--user-data-dir=${uniqueUserDataDir}`];
  }
},
```

**結果**: 一意のuserDataDirが各スペックに設定されることを確認（ログで確認）。しかし**単一スペック実行でもエラーが発生**。

### 5. afterSessionでの待機時間追加

```typescript
afterSession: async () => {
  await new Promise((resolve) => setTimeout(resolve, 2000));
},
```

**結果**: 効果なし

## 根本原因の特定（2024-12-20）

### Chromedriverの詳細ログから判明した事実

Chromedriverを手動で実行して詳細ログを確認した結果：

```
[INFO]: Launching chrome: /Users/.../node_modules/.bin/electron --allow-pre-commit-input ...
/Users/.../node_modules/electron/dist/Electron.app/Contents/MacOS/Electron: bad option: --allow-pre-commit-input
/Users/.../node_modules/electron/dist/Electron.app/Contents/MacOS/Electron: bad option: --app=...
... (他の多くのオプションも "bad option")
```

### 根本原因

**`node_modules/.bin/electron`はNode.jsスクリプトであり、Electronバイナリではない**

```bash
$ ls -la node_modules/.bin/electron
lrwxr-xr-x  1 yamamoto  staff  18 Nov 28 11:03 node_modules/.bin/electron -> ../electron/cli.js
```

wdio-electron-serviceは`appEntryPoint`を使用する場合、`node_modules/.bin/electron`を`goog:chromeOptions.binary`として設定します。しかし：

1. `node_modules/.bin/electron`は**Node.jsスクリプト**（cli.js）へのシンボリックリンク
2. 実際のElectronバイナリは `node_modules/electron/dist/Electron.app/Contents/MacOS/Electron`
3. Chromedriverは直接バイナリを実行しようとするため、Node.jsスクリプトにChromeオプションを渡すと「bad option」エラーになる
4. **エラーメッセージ「user data directory is already in use」は誤解を招く表現** - 実際はElectron起動自体が失敗している

### エラーの流れ

1. Chromedriverが`node_modules/.bin/electron`（Node.jsスクリプト）を実行
2. Node.jsスクリプトはChromiumオプション（`--allow-pre-commit-input`等）を理解できず、すべて「bad option」としてエラー出力
3. Electronプロセスが起動しないため、Chromedriverはセッション作成に失敗
4. Chromedriverは原因を「user data directory is already in use」と誤って報告

## 解決策

### 方法1: appBinaryPathを使用（推奨）

`appEntryPoint`の代わりに`appBinaryPath`を使用して、ビルド済みのElectronアプリを指定する：

```typescript
capabilities: [
  {
    browserName: 'electron',
    'wdio:electronServiceOptions': {
      // ビルド済みアプリのパスを指定
      appBinaryPath: path.join(projectRoot, 'release/mac-arm64/SDD Orchestrator.app/Contents/MacOS/SDD Orchestrator'),
      appArgs: ['--no-sandbox', '--e2e-test'],
    },
  },
],
```

**注意**: この方法は事前に`electron-builder`でアプリをビルドしておく必要がある。

### 方法2: wdio-electron-serviceの内部動作を理解して対処

wdio-electron-serviceのソースコードを確認し、`appEntryPoint`使用時にどのようにbinaryパスを設定しているか調査する。

### 方法3: Playwrightへの移行

PlaywrightはElectronテストをよりシンプルにサポートしている可能性があるため、移行を検討。

## 以前試した対策（効果なし - 根本原因が異なるため）

### A. ~~specファイルごとに個別のuserDataDirを静的に割り当て~~

### B. ~~beforeSession/onWorkerStartフックでuserDataDirを動的設定~~

これらは「user-data-dir競合」が原因だという誤った仮定に基づいていた。

## 関連GitHub Issues

- [webdriverio/webdriverio#14168](https://github.com/webdriverio/webdriverio/issues/14168) - user data directory already in use
- [webdriverio/webdriverio#14501](https://github.com/webdriverio/webdriverio/issues/14501) - Chrome on Linux user-data-dir

## 参考リンク

- [wdio-electron-service GitHub](https://github.com/webdriverio-community/wdio-electron-service)
- [WebDriverIO Electron Testing](https://webdriver.io/docs/electron)
- [wdio-electron-service Configuration](https://webdriver.io/docs/desktop-testing/electron/configuration/)
- [wdio-electron-service Common Issues](https://github.com/webdriverio-community/wdio-electron-service/blob/main/docs/common-issues-debugging.md)

## 次のアクション

1. ~~wdio-electron-serviceの公式ドキュメントで推奨設定を確認~~ (完了)
2. ~~beforeSession/onWorkerStartフックでの動的設定を試行~~ (完了・効果なし - 根本原因が異なる)
3. ~~Chromedriverの詳細ログを確認~~ (完了 - 根本原因を特定)
4. **`appBinaryPath`を使用してビルド済みアプリでテストを実行** ← 次に試す
5. wdio-electron-serviceのソースコードで`appEntryPoint`使用時のbinary設定を確認
6. 必要に応じてwdio-electron-serviceにIssueを報告（エラーメッセージが誤解を招く問題）
