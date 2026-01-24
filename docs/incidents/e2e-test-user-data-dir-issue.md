# E2Eテスト user-data-dir 競合問題

## ステータス: ✅ 解決済み（2024-12-20）

## 問題概要

wdio-electron-serviceを使用したE2Eテスト実行時に、`user-data-dir`の競合エラーが発生し、テストセッションを作成できない。

## エラーメッセージ

```
WebDriverError: session not created: probably user data directory is already in use,
please specify a unique value for --user-data-dir argument, or don't use --user-data-dir
```

## 根本原因（真の原因）

**`ELECTRON_RUN_AS_NODE=1` 環境変数が設定されていた**

この環境変数が設定されていると、Electronバイナリが**Node.jsモード**で動作します。その結果：

1. ChromedriverがElectronバイナリを起動する際、自動的にChrome/Chromiumコマンドラインオプション（`--allow-pre-commit-input`, `--disable-background-networking`等）を渡す
2. Node.jsモードのElectronはこれらのオプションを認識できず、すべて「bad option」エラーを出力
3. Electronが正常に起動しないため、Chromedriverがセッション作成に失敗
4. **エラーメッセージ「user data directory is already in use」は誤解を招く表現**であり、実際はElectron起動自体が失敗していた

### 確認方法

```bash
echo $ELECTRON_RUN_AS_NODE  # 「1」と表示されたら問題あり
```

### Chromedriverログでの確認

Chromedriverを`--verbose`で実行すると、以下のようなログが確認できる：

```
[INFO]: Launching chrome: /path/to/SDD Orchestrator.app/Contents/MacOS/SDD Orchestrator --allow-pre-commit-input ...
/path/to/SDD Orchestrator: bad option: --allow-pre-commit-input
/path/to/SDD Orchestrator: bad option: --disable-background-networking
... (多数のbad optionエラー)
```

## 解決策

### wdio.conf.ts で環境変数を解除

```typescript
import type { Options } from '@wdio/types';
import * as path from 'path';

// ELECTRON_RUN_AS_NODEが設定されていると、ElectronがNode.jsモードで動作し
// Chromedriverのコマンドラインオプションを認識できなくなる問題を回避
// 参考: https://www.electronjs.org/blog/statement-run-as-node-cves
delete process.env.ELECTRON_RUN_AS_NODE;

const projectRoot = path.resolve(__dirname);

const appBinaryPath = path.join(
  projectRoot,
  'release/mac-arm64/SDD Orchestrator.app/Contents/MacOS/SDD Orchestrator'
);

export const config: Options.Testrunner = {
  // ... 他の設定
  capabilities: [
    {
      browserName: 'electron',
      maxInstances: 1,
      'wdio:electronServiceOptions': {
        appBinaryPath,
        appArgs: ['--e2e-test'],
      },
    },
  ],
  // ...
};
```

### 重要なポイント

1. `delete process.env.ELECTRON_RUN_AS_NODE` を wdio.conf.ts の先頭で実行
2. `appBinaryPath` でビルド済みアプリのパスを指定
3. `goog:chromeOptions` は不要（wdio-electron-serviceが自動設定）
4. `appArgs` は最小限に（`--no-sandbox`等もサービスが自動追加）

## 環境情報

- wdio-electron-service: 9.2.1
- @wdio/cli: 9.20.1
- Electron: 35.5.1
- Chromedriver: 134.0.6998.205
- OS: macOS Darwin 23.5.0

## 以前試した対策（効果なし - 根本原因が異なるため）

以下の対策は「user-data-dir競合」が原因だという誤った仮定に基づいていた：

- ❌ 一意のuserDataDir生成
- ❌ appArgsの関数形式
- ❌ onWorkerStartフックでの動的設定
- ❌ afterSessionでの待機時間追加

## 参考リンク

- [ELECTRON_RUN_AS_NODE CVEs Statement](https://www.electronjs.org/blog/statement-run-as-node-cves)
- [wdio-electron-service GitHub](https://github.com/webdriverio-community/wdio-electron-service)
- [wdio-electron-service Common Issues](https://github.com/webdriverio-community/wdio-electron-service/blob/main/docs/common-issues-debugging.md)
- [WebDriverIO Electron Configuration](https://webdriver.io/docs/desktop-testing/electron/configuration/)
