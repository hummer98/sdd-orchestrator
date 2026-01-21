# Operations Guide

MCP経由でElectronアプリを操作するための手順書。
動作確認・検証作業時にAIが参照すべき正常系の操作パターンを記載。

---

## ⚠️ MCP eval の制限と代替手段（重要）

**MCPの`eval`コマンドはCSPにより失敗することが多い。** Zustandストアへのアクセスには`__STORES__`グローバルオブジェクトを使用する。

### 推奨: `__STORES__` 経由でのZustandステート操作

`eval`コマンドが失敗する場合でも、`window.__STORES__`経由で同期的にストアにアクセスできる。

```javascript
// ステート取得（推奨）
command: "eval"
args: { "code": "window.__STORES__.spec.getState()" }

// 特定フィールドの取得
command: "eval"
args: { "code": "window.__STORES__.spec.getState().selectedSpecId" }

// ステート更新
command: "eval"
args: { "code": "window.__STORES__.spec.setState({ selectedSpecId: 'feature-auth' })" }

// 複数ストアの確認
command: "eval"
args: { "code": "({ project: window.__STORES__.project.getState().projectPath, spec: window.__STORES__.spec.getState().selectedSpecId })" }
```

#### 利用可能なストア

| ストア名 | 主要なステート |
|----------|---------------|
| `project` | `projectPath`, `kiroValidation` |
| `spec` | `specs`, `selectedSpecId`, `selectedSpec` |
| `bug` | `bugs`, `selectedBugId` |
| `agent` | `agents`, `logs` |
| `workflow` | `autoExecutionPermissions`, `commandPrefix` |
| `editor` | `openFiles`, `activeFile` |
| `notification` | `notifications` |
| `connection` | `connectionStatus`, `connectionInfo` |
| `remoteAccess` | `isServerRunning`, `serverUrl` |
| `versionStatus` | `installedVersion`, `hasUpdate` |

#### evalが失敗する場合の対処

1. **まず`__STORES__`を試す** - CSPに影響されにくい
2. **`get_page_structure`でUI状態を確認** - DOM経由での確認
3. **`click_by_selector`でUI操作** - 直接的なDOM操作

---

## MCP eval での Promise 操作

**MCPの`eval`コマンドは同期的な戻り値のみを正しく返す。** Promiseを返すAPIは特別な対応が必要。

### 問題

```javascript
// ❌ NG: Promiseが空オブジェクト {} として返される
command: "eval"
args: { "code": "window.electronAPI.getRemoteServerStatus()" }
// 結果: {} （Promiseオブジェクトがシリアライズされて空に見える）
```

### 解決方法1: 変数に保存して2段階で取得（推奨）

```javascript
// ステップ1: Promiseを解決して変数に保存
command: "eval"
args: { "code": "window.electronAPI.getRemoteServerStatus().then(r => { window.__result = r; })" }

// ステップ2: 変数を読み取る
command: "eval"
args: { "code": "window.__result" }
```

### 解決方法2: JSON.stringify を使用

```javascript
// .then() 内で JSON.stringify する（結果が文字列として返る）
command: "eval"
args: { "code": "window.electronAPI.getRemoteServerStatus().then(r => JSON.stringify(r))" }
```

**注意**: 方法2はログ出力には表示されるが、MCPの戻り値には含まれない場合がある。確実に結果を取得するには方法1を使用する。

### 適用対象API

以下のAPIはすべてPromiseを返すため、上記の対応が必要：
- `selectProject()`, `readSpecs()`, `readBugs()`, `readSpecJson()`, `readBugDetail()`
- `startRemoteServer()`, `stopRemoteServer()`, `getRemoteServerStatus()`
- `loadLayoutConfig()`, `saveLayoutConfig()`, `resetLayoutConfig()`
- `checkCommandsetStatus()`, `checkRequiredPermissions()`
- その他 `window.electronAPI.*` の全てのメソッド

---

## プロジェクト選択

### 推奨方法: UI経由での選択

アプリ起動後、プロジェクト未選択時に表示されるメインパネル（ProjectSelectionView）から選択する。

**操作方法**:
1. **フォルダ選択ボタンをクリック**: ファイルダイアログが開き、フォルダを選択
2. **パス入力フィールド**: プロジェクトパスを直接入力して「開く」ボタンをクリック
3. **最近開いたプロジェクトリスト**: 履歴からクリックで選択

**UI要素**:
- `[data-testid="project-selection-view"]`: メインビュー
- フォルダ選択ボタン: ダイアログを開く
- パス入力フィールド: 直接入力用
- 最近開いたプロジェクトリスト: `RecentProjectList`コンポーネント

### 代替方法: Zustandストア経由（テストコード用）

```javascript
// E2Eテストでの使用例
const stores = (window as any).__STORES__;
await stores.projectStore.getState().selectProject('/path/to/project');
```

**戻り値** (selectProject関数):
```typescript
{
  projectPath: string;
  kiroValidation: {
    hasKiroDir: boolean;
    hasSteeringDir: boolean;
    hasSpecsDir: boolean;
    hasBugsDir: boolean;
  };
  specs: SpecInfo[];
  bugs: BugInfo[];
  error?: string;  // エラー時のみ
}
```

---

## スクリーンショット取得

```javascript
// MCP screenshot でウィンドウ全体を取得
// → ページ構造の確認には get_page_structure を使用
```

---

## UI要素の確認・操作

### ページ構造の取得

```javascript
// MCP get_page_structure でDOM構造を取得
// テスト対象の要素セレクタを特定する
```

### 要素クリック

```javascript
// テキストでクリック
click_by_text: "Create Spec"

// セレクタでクリック
click_by_selector: "[data-testid='spec-list-item']"
```

### data-testid 命名規則

本プロジェクトでは`data-testid`属性を使用してUI要素を識別する。命名規則は以下の通り:

| パターン | 形式 | 例 |
|----------|------|-----|
| コンポーネント | `{component}` | `agent-list-panel`, `bug-workflow-view` |
| 要素 | `{component}-{element}` | `bug-list-items`, `artifact-content` |
| ボタン | `{component}-{action}-button` | `cancel-button`, `apply-fix-button` |
| フェーズ関連 | `phase-{action}-{phase}` | `phase-button-impl`, `phase-item-design` |
| Bugフェーズ | `bug-phase-{element}-{phase}` | `bug-phase-execute-button-verify` |
| 状態付き | `{component}-{state}` | `bug-phase-status-completed` |

**よく使うtestid**:
- Spec Workflow: `phase-button-{phase}` (requirements/design/tasks/impl)
- Bug Workflow: `bug-phase-execute-button-{phase}` (analyze/fix/verify/deploy)
- 自動実行: `auto-execute-button`, `bug-auto-execute-button`
- 一覧: `spec-list-items`, `bug-list-items`, `agent-list-panel`

### 制限事項

- **メニューバー操作不可**: File, Edit, View等のネイティブメニューはMCPでクリック不可
- **代替**: IPC直接呼び出しを使用

---

## IPC直接呼び出しパターン

メニュー経由でしか呼び出せない機能をMCPで操作する場合:

```javascript
// レイアウトリセット
command: "eval"
args: { "code": "window.electronAPI.resetLayoutConfig('/path/to/project')" }

// レイアウト読み込み
command: "eval"
args: { "code": "window.electronAPI.loadLayoutConfig('/path/to/project').then(r => JSON.stringify(r))" }

// Spec一覧読み込み
command: "eval"
args: { "code": "window.electronAPI.readSpecs('/path/to/project').then(r => JSON.stringify(r))" }

// Bug一覧読み込み
command: "eval"
args: { "code": "window.electronAPI.readBugs('/path/to/project').then(r => JSON.stringify(r))" }

// Spec詳細読み込み（specPathは.kiro/specs/feature-nameの形式）
command: "eval"
args: { "code": "window.electronAPI.readSpecJson('/path/to/.kiro/specs/feature-name').then(r => JSON.stringify(r))" }
```

---

## Remote UI

### 起動確認

1. Electronアプリでプロジェクトを選択
2. Remote Accessをトグル（右上のアイコン or メニュー）
3. 表示されたURLにブラウザでアクセス

### MCP経由での起動

```javascript
// サーバー起動
command: "eval"
args: { "code": "window.electronAPI.startRemoteServer().then(r => JSON.stringify(r))" }

// ステータス確認
command: "eval"
args: { "code": "window.electronAPI.getRemoteServerStatus().then(r => JSON.stringify(r))" }

// サーバー停止
command: "eval"
args: { "code": "window.electronAPI.stopRemoteServer()" }
```

---

## よく使うレシピ

### 動作確認フロー

1. アプリ起動: `task electron:start PROJECT=/path/to/project`
2. スクリーンショット: MCP `screenshot`
3. 要素確認: MCP `get_page_structure`
4. 操作実行: `click_by_text` or `click_by_selector` or `eval`
5. 結果確認: スクリーンショット再取得

### Spec操作確認

```javascript
// Spec一覧取得
command: "eval"
args: { "code": "window.electronAPI.readSpecs('/path/to/project').then(r => JSON.stringify(r))" }

// 特定Specの詳細
command: "eval"
args: { "code": "window.electronAPI.readSpecJson('/path/to/.kiro/specs/my-feature').then(r => JSON.stringify(r))" }
```

### インストール状態確認

```javascript
// コマンドセット状態
command: "eval"
args: { "code": "window.electronAPI.checkCommandsetStatus('/path/to/project').then(r => JSON.stringify(r))" }

// 必要なパーミッション確認
command: "eval"
args: { "code": "window.electronAPI.checkRequiredPermissions('/path/to/project').then(r => JSON.stringify(r))" }
```

---

## 主要IPC API一覧

| カテゴリ | API | 用途 |
|----------|-----|------|
| プロジェクト | `selectProject(path)` | プロジェクト選択 |
| Spec | `readSpecs(path)` | Spec一覧取得 |
| Spec | `readSpecJson(specPath)` | Spec詳細取得 |
| Bug | `readBugs(path)` | Bug一覧取得 |
| Bug | `readBugDetail(bugPath)` | Bug詳細取得 |
| レイアウト | `loadLayoutConfig(path)` | レイアウト読み込み |
| レイアウト | `resetLayoutConfig(path)` | レイアウトリセット |
| Remote | `startRemoteServer()` | Remote UI起動 |
| Remote | `getRemoteServerStatus()` | Remote UIステータス |
| インストール | `checkCommandsetStatus(path)` | コマンドセット状態 |

詳細なAPI定義: `electron-sdd-manager/src/preload/index.ts`

---

_エラー発生時のトラブルシューティングは `.kiro/steering/debugging.md` を参照_
