---
title: "wdio-electron-serviceで「user data directory is already in use」エラーが出る本当の原因"
emoji: "🔍"
type: "tech"
topics: ["electron", "webdriverio", "e2e", "testing", "chromedriver"]
published: false
---

## TL;DR

VSCode統合ターミナルでwdio-electron-serviceを使ったE2Eテストを実行すると、以下のエラーが出る場合があります。

```
WebDriverError: session not created: probably user data directory is already in use,
please specify a unique value for --user-data-dir argument, or don't use --user-data-dir
```

**このエラーメッセージは誤解を招く表現です。** 実際の原因は `ELECTRON_RUN_AS_NODE=1` 環境変数がVSCodeから継承されていることです。

**解決策**: `wdio.conf.ts` の先頭に以下を追加：

```typescript
delete process.env.ELECTRON_RUN_AS_NODE;
```

## 環境

- wdio-electron-service: 9.2.1
- Electron: 35.5.1
- Chromedriver: 134.0.6998.205
- OS: macOS

## 問題の詳細

wdio-electron-serviceを使ってElectronアプリのE2Eテストを実行しようとしたところ、セッション作成に失敗しました。

```bash
npx wdio run wdio.conf.ts
```

エラーメッセージは「user data directoryが使用中」と言っていますが、実際には：

- 他にElectronプロセスは動いていない
- 一意のuser-data-dirを指定しても解決しない
- 単一のテストファイルでも発生する

## 調査プロセス

### 1. Chromedriverの詳細ログを確認

Chromedriverを直接実行して詳細ログを取得：

```bash
chromedriver --port=9515 --verbose
```

別ターミナルからセッション作成リクエストを送信：

```bash
curl -X POST http://localhost:9515/session \
  -H "Content-Type: application/json" \
  -d '{
    "capabilities": {
      "alwaysMatch": {
        "browserName": "chrome",
        "goog:chromeOptions": {
          "binary": "/path/to/MyApp.app/Contents/MacOS/MyApp",
          "args": ["--e2e-test"]
        }
      }
    }
  }'
```

### 2. 発見：「bad option」エラーの連続

ログに以下のようなエラーが大量に出力されていました：

```
[INFO]: Launching chrome: /path/to/MyApp.app/Contents/MacOS/MyApp --allow-pre-commit-input --disable-background-networking ...
/path/to/MyApp: bad option: --allow-pre-commit-input
/path/to/MyApp: bad option: --disable-background-networking
/path/to/MyApp: bad option: --disable-client-side-phishing-detection
... (多数のbad optionエラー)
```

ChromedriverはElectronバイナリを起動する際、自動的に多くのChrome/Chromiumオプションを付与します。これらがすべて「bad option」として拒否されていました。

### 3. 原因の特定

Electronバイナリを直接実行してみると：

```bash
/path/to/MyApp.app/Contents/MacOS/MyApp --version
```

出力：
```
v35.5.1
```

これは正常。しかし `--help` を試すと：

```bash
/path/to/MyApp.app/Contents/MacOS/MyApp --help
```

出力：
```
Usage: node [options] [ script.js ] [arguments]
...
```

**Node.jsのヘルプが表示された！**

環境変数を確認：

```bash
echo $ELECTRON_RUN_AS_NODE
# 出力: 1
```

## 根本原因

**`ELECTRON_RUN_AS_NODE=1` が設定されていると、ElectronはNode.jsモードで動作します。**

この環境変数はVSCodeが内部で使用しています。VSCode自体がElectronアプリであり、Node.js子プロセスを起動する際にこの変数を設定します。VSCode統合ターミナルはこの環境変数を継承するため、そこから実行されるプロセスにも影響します。

Node.jsモードのElectronは：
- Chrome/Chromiumコマンドラインオプションを理解しない
- すべてのオプションを「bad option」として拒否
- GUIアプリケーションとして起動しない

Chromedriverはこの状況を「user data directory is already in use」と誤って報告します。

## 解決策

### wdio.conf.ts で環境変数を解除

```typescript
import type { Options } from '@wdio/types';
import * as path from 'path';

// ELECTRON_RUN_AS_NODEを解除
// VSCode統合ターミナルから継承される環境変数が原因で
// ElectronがNode.jsモードで動作してしまう問題を回避
delete process.env.ELECTRON_RUN_AS_NODE;

const projectRoot = path.resolve(__dirname);

const appBinaryPath = path.join(
  projectRoot,
  'release/mac-arm64/MyApp.app/Contents/MacOS/MyApp'
);

export const config: Options.Testrunner = {
  capabilities: [
    {
      browserName: 'electron',
      'wdio:electronServiceOptions': {
        appBinaryPath,
        appArgs: ['--e2e-test'],
      },
    },
  ],
  services: ['electron'],
  // ... 他の設定
};
```

### 代替案：VSCode外のターミナルから実行

Terminal.appなど、VSCode統合ターミナル以外から実行すれば、この環境変数は設定されていないため問題は発生しません。ただし、開発者は通常VSCode内で作業するため、上記の対処法の方が実用的です。

## まとめ

| 項目 | 内容 |
|------|------|
| エラーメッセージ | `user data directory is already in use` |
| 実際の原因 | `ELECTRON_RUN_AS_NODE=1` によるNode.jsモード動作 |
| 発生条件 | VSCode統合ターミナルからのテスト実行 |
| 解決策 | `delete process.env.ELECTRON_RUN_AS_NODE` |

エラーメッセージと実際の原因が大きく異なるため、デバッグに時間がかかりました。同じ問題に遭遇した方の参考になれば幸いです。

## 参考リンク

- [Electron - Statement regarding "runAsNode" CVEs](https://www.electronjs.org/blog/statement-run-as-node-cves)
- [wdio-electron-service - Common Issues & Debugging](https://github.com/webdriverio-community/wdio-electron-service/blob/main/docs/common-issues-debugging.md)
- [WebDriverIO - Electron Configuration](https://webdriver.io/docs/desktop-testing/electron/configuration/)
