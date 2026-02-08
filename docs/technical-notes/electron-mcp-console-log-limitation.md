# electron-mcp-server Console Log キャプチャ制限

**作成日**: 2026-02-04
**バージョン**: electron-mcp-server v1.5.0
**ステータス**: 未解決

## 概要

`electron-mcp-server` の `read_electron_logs` ツールで Electron アプリの DevTools Console に表示されるログ（特にエラー）が取得できない問題を調査した。

## 問題の症状

- Electron アプリが真っ白な画面を表示（React がレンダリングされていない）
- `mcp__electron__read_electron_logs` で取得したログにエラーが含まれていない
- DevTools Console には本来エラーが表示されているはずだが、MCP ツールでは見えない

## 調査結果

### 1. MCPサーバーの実装確認

ソースコード: `/opt/homebrew/lib/node_modules/electron-mcp-server/dist/utils/electron-connection.js`

```javascript
// connectForLogs 関数（140-179行目）
export async function connectForLogs(target, onLog) {
  // ...
  ws.on('open', () => {
    // Enable Runtime and Console domains
    ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
    ws.send(JSON.stringify({ id: 2, method: 'Console.enable' }));
    resolve(ws);
  });

  ws.on('message', (data) => {
    // Console.messageAdded と Runtime.consoleAPICalled のみハンドル
    if (response.method === 'Console.messageAdded') { ... }
    else if (response.method === 'Runtime.consoleAPICalled') { ... }
  });
}
```

### 2. 特定された問題点

#### 問題1: 過去のログ履歴が取得できない

- `Runtime.consoleAPICalled` と `Console.messageAdded` は **WebSocket接続後に発生したイベントのみ** をキャプチャ
- DevTools が保持している過去のログ履歴は取得されない
- アプリ起動時に発生したエラーは、後から接続しても見えない

#### 問題2: 未キャッチの例外がキャプチャされていない

- **`Runtime.exceptionThrown` イベントがリッスンされていない**
- JavaScript の未キャッチ例外（React レンダリングエラー等）は `console.error` とは別のイベント
- このため、致命的なエラーが MCP ツールで表示されない

#### 問題3: ログ取得のタイミング問題

`electron-logs.js` の実装（31-66行目）:

```javascript
async function getConsoleLogsViaDevTools(target, lines, follow) {
  // 接続後に Runtime.evaluate でダミーログを出力
  ws.send(JSON.stringify({
    id: 99,
    method: 'Runtime.evaluate',
    params: {
      expression: `console.log("Reading console history for MCP test"); "History checked"`,
    },
  }));

  // 7秒待って接続中に発生したログのみ返す
  setTimeout(() => {
    ws.close();
    resolve(logs.length > 0 ? logs.slice(-lines).join('\n') : 'No console logs available');
  }, 7000);
}
```

この実装では接続後7秒間に発生したログしか取得できない。

## 必要な修正

### 修正案1: Runtime.exceptionThrown のリッスン追加

```javascript
// electron-connection.js に追加
ws.on('message', (data) => {
  const response = JSON.parse(data.toString());

  // 既存のハンドラ
  if (response.method === 'Console.messageAdded') { ... }
  else if (response.method === 'Runtime.consoleAPICalled') { ... }

  // 追加: 未キャッチ例外のハンドル
  else if (response.method === 'Runtime.exceptionThrown') {
    const exception = response.params.exceptionDetails;
    const timestamp = new Date().toISOString();
    const text = exception.exception?.description || exception.text;
    const logEntry = `[${timestamp}] EXCEPTION: ${text}`;
    onLog?.(logEntry);
  }
});
```

### 修正案2: Console.enable の discardPolicy 設定

Chrome DevTools Protocol では `Console.enable` 時に過去のメッセージを受け取る設定が可能:

```javascript
// 過去のコンソールメッセージも取得
ws.send(JSON.stringify({
  id: 2,
  method: 'Console.enable',
}));
```

ただし、これは Console ドメインの仕様に依存する。

### 修正案3: Log ドメインの使用

CDP の `Log` ドメインを使用すると、より詳細なログエントリを取得可能:

```javascript
ws.send(JSON.stringify({ id: 3, method: 'Log.enable' }));

// Log.entryAdded イベントをハンドル
if (response.method === 'Log.entryAdded') {
  const entry = response.params.entry;
  const logEntry = `[${entry.timestamp}] ${entry.level}: ${entry.text}`;
  onLog?.(logEntry);
}
```

## ワークアラウンド

### 即時対応策

1. **DevTools を直接確認**: Electron アプリで `Cmd+Option+I` で DevTools を開いて Console タブを確認

2. **MCP 接続中にエラーを再現**: アプリ起動後に MCP ツールで接続してから、エラーを発生させる操作を行う

### E2Eテスト時の Renderer コンソールキャプチャ（2026-02-07 実装）

E2Eテスト時は Electron native API `webContents.on('console-message')` を使用して
Renderer のコンソール出力を Main process ログファイル (`logs/main-e2e.log`) に転送する。

**実装箇所**:
- `src/main/index.ts` の `createWindow()`: E2Eモード時に `console-message` リスナーを登録
- `wdio.conf.ts` の `beforeTest`/`afterTest`: テスト前後のログファイルサイズ差分から `[Renderer Console]` エントリを抽出・表示

**動作**:
- テスト失敗時: 自動的に Renderer コンソールログを出力
- `E2E_VERBOSE_LOGS=true`: テスト成否に関わらず常時出力

**不採用アプローチ**:
- WebDriver BiDi `log.entryAdded`: Electron/Chromedriver が BiDi プロトコル未対応のため使用不可
- `browser.execute` によるコンソールインターセプト: ページリロードで注入コードが消失
- `goog:loggingPrefs` + `browser.getLogs()`: WebdriverIO v9 で `getLogs` が削除済み

## 参考資料

- [Chrome DevTools Protocol - Runtime domain](https://chromedevtools.github.io/devtools-protocol/tot/Runtime/)
- [Chrome DevTools Protocol - Log domain](https://chromedevtools.github.io/devtools-protocol/tot/Log/)
- [chromedp - uncaught exceptions not captured issue](https://github.com/chromedp/chromedp/issues/374)
- [WebView2Feedback - Runtime_ConsoleAPICalled issue](https://github.com/MicrosoftEdge/WebView2Feedback/issues/3784)
- [WebdriverIO Browser Logs Best Practices](https://webdriver.io/docs/best-practices/browser-logs/)

## 結論

`electron-mcp-server` v1.5.0 には以下の制限がある:

1. **過去のログ履歴は取得できない**（接続後のログのみ）
2. **未キャッチの例外（Runtime.exceptionThrown）はキャプチャされない**
3. **接続後7秒間のログのみ取得**

これらの制限により、アプリ起動時に発生した致命的なエラーを MCP ツールで確認することができない。

**推奨アクション**:
- electron-mcp-server に Issue を作成し、`Runtime.exceptionThrown` のサポートを要求
- 当面は DevTools を直接確認するワークアラウンドを使用
- E2Eテスト時は `console-message` ベースのキャプチャを使用（上記参照）
