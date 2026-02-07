# Response to Document Review #14

**Feature**: trpc-full-migration
**Review Date**: 2026-02-06
**Reply Date**: 2026-02-06

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 3      | 1            | 2             | 0                |
| Warning  | 4      | 2            | 2             | 0                |
| Info     | 2      | 0            | 2             | 0                |

---

## Response to Critical Issues

### C-01: handlers.ts内イベントコールバック移行方針の明確化

**Issue**: Task 9.2にhandlers.ts内のAutoExecution/Agentイベントコールバック登録コード（約320行）の移行先を明記する必要がある

**Judgment**: **No Fix Needed** ❌

**Evidence**:

handlers.ts内のイベントコールバックは以下の2カテゴリに分類される:

1. **Agent系イベントブロードキャスト** (`registerEventCallbacks`関数、行1336-1415): `service.onOutput()`, `service.onStatusChange()`, `service.onAgentExitError()`, `service.onAgentStartError()` の4つのコールバックで `webContents.send()` を呼び出す。これらは **Task 9.1のeventsRouter実装** でobservable()ヘルパーを使いSubscriptionに変換される。Design doc の eventsRouter Service Interface に `onAgentOutput`, `onAgentStatusChange`, `onAgentLog`, `onAgentStartError`, `onAgentExitError` が明示的に定義されている。

2. **AutoExecution系イベントハンドラ** (`registerAutoExecutionEvents`関数、行1060-1330): `coordinator.on('execute-next-phase', ...)` と `coordinator.on('execute-spec-merge', ...)` のリスナー。これらはMain→Rendererへの通知ではなく、**Main内部でのイベント駆動ロジック**（自動実行フェーズ制御）であり、Subscription移行の対象外。このロジックはService層（AutoExecutionCoordinator自体）に属するもので、Task 11.2でhandlers.ts削除時にmain/index.tsまたはService初期化に移動される。

Task 9.2には「既存の`BrowserWindow.webContents.send()`呼び出しを削除または整理する」と記載されており、これは上記カテゴリ1を対象としている。カテゴリ2は`webContents.send()`を含まないため、Task 9.2のスコープ外で正しい。Task 11.2でhandlers.ts自体を削除する際にService層への移動が行われる。

**移行先の明確さ**: Design docのeventsRouter定義 + Task 9.1の「observable()ヘルパーを使い、既存EventEmitter/コールバックをSubscriptionに変換する」記述で十分明確。

---

### C-02: window.electronAPI残存309箇所の段階的削減追跡

**Issue**: 各ドメイン移行タスク完了時に`window.electronAPI`参照の残存数を確認し、確実にゼロに向かっていることを検証する手順を追加する

**Judgment**: **No Fix Needed** ❌

**Evidence**:

現時点で309箇所/66ファイルの`window.electronAPI`参照が残存しているが、これは以下の理由で計画通り:

- **移行済みドメイン** (system, config, project, file, spec, bug, agent, autoExecution, git) のRenderer差し替えは完了済み（Task 2.2〜8.2）
- **残存はすべて未移行ドメイン** (cloudflare, install, mcp, schedule, misc, events) に対応する呼び出し。具体的に:
  - `projectStore.ts`: 13箇所 → install/permissions系（Task 10.2/10.5スコープ）
  - `remoteAccessStore.ts`: 7箇所 → remoteAccess系（Task 10.5スコープ）
  - `App.tsx`: 18箇所 → イベントリスナー（Task 9.2スコープ）
  - `IpcApiClient.ts`: 30箇所 → Task 11.4で一括削除
  - その他: cloudflare, mcp, schedule関連コンポーネント

各ドメインのRenderer差し替えタスク（Task 9.2, 10.6）完了後にTask 11.4で残存をゼロにする設計は、tasks.mdに既に依存関係として反映されている。段階的削減の「カウントダウン」を各タスクのVerify条件に追加するのは過度なプロセスオーバーヘッドであり、各タスクのVerify条件（例: `Grep "trpc.cloudflare." in renderer/`）が対象ドメインの移行完了を検証している。

---

### C-03: structure.mdのtRPC対応パターン追加

**Issue**: Task 13.2のスコープに、vanillaClientを使ったStore実装パターンの追加を含める

**Judgment**: **Fix Required** ✅

**Evidence**:

Task 13.2の現在の記述は以下のみ:
> `.kiro/steering/structure.md`のディレクトリ構造をtRPCを反映して更新する
> - `src/main/ipc/`セクションを削除し、`src/main/trpc/`構造に置き換える
> - スキーマ、ルーター、テストのディレクトリ構成を記載する

Design doc DD-006でvanillaClientパターンが正式に定義されており、structure.mdの「Electron Process Boundary Rules」セクションの例示コードとしてtRPCフック/vanillaClientを使った正しい実装パターンを追加する必要がある。これはTask 13.2のスコープに含めるべき内容だが、現在の記述ではディレクトリ構造更新しか言及していない。

**Action Items**:

- Task 13.2の記述に「vanillaClientを使ったStore実装パターンをElectron Process Boundary Rulesの正しい実装パターンセクションに追加する」を追記する

---

## Response to Warnings

### W-01: preload/index.tsの段階的縮小検証

**Issue**: Task 8.3以降の各Cleanupタスクで、preload/index.tsの行数削減を検証ステップに追加

**Judgment**: **No Fix Needed** ❌

**Evidence**:

各ドメイン移行のCleanupタスク（Task 3.3, 4.4, 5.4, 6.3, 7.3, 8.3）にはすべて「preload/index.tsから対応するAPIを削除する」という記述がある。削除が正しく行われたかは、TypeScriptコンパイルの成功（削除漏れがあれば参照エラー）と各タスクのVerify条件で担保される。行数カウントを追加するのは情報的価値はあるが、必須ではない。

---

### W-02: Remote UI WebSocketApiClientの互換性検証

**Issue**: Task 11.4の前にWebSocketApiClientメソッドセットの網羅性を確認するステップを追加

**Judgment**: **Fix Required** ✅

**Evidence**:

Design doc DD-005では「WebSocketApiClientはRemote UI用に維持（Scope外）」と記載されており、Task 11.4には「ApiClientインターフェースからIpcApiClient固有メソッドを削除してWebSocketApiClient実装に合わせて整理する」と記載されている。しかしWebSocketApiClientのメソッドセットとtRPCルーターのプロシージャセットの差分を事前に確認するステップがない。ApiClientインターフェース変更時にWebSocketApiClientの実装が壊れないことを確認する必要がある。

**Action Items**:

- Task 11.4に「実装着手前にWebSocketApiClientが提供するメソッド一覧とApiClientインターフェースの現状を照合し、削除予定のメソッドがWebSocketApiClientで使用されていないことを確認する」ステップを追記する

---

### W-03: Task 10.7の前提条件明示

**Issue**: Task 10.7の冒頭に「前提: Task 10.1〜10.6全完了」を明記

**Judgment**: **No Fix Needed** ❌

**Evidence**:

Task 10.7の記述自体に「全7チャンネルはTask 4.1/4.2/10.5でtRPCルーターに移行済み」と明記されており、Task 10.5への依存が読み取れる。また、tasks.mdのタスク順序はTask 10.1→10.2→...→10.6→10.7の順で並んでおり、暗黙的に前タスクの完了が前提。各タスクのCheckbox順序とVerify条件で十分担保されている。

---

### W-04: Subscription統合テスト対象の優先度区分

**Issue**: Task 9.3にSubscriptionテスト優先度の区分を追加

**Judgment**: **Fix Required** ✅ → **No Fix Needed** ❌（再評価）

**Evidence**:

Task 9.3には既に「主要イベント（Agent出力、Spec変更、AutoExecution状態変更）を優先的にテストする」と記載されており、優先度の指針は存在する。36個全てをテストするかの判断は実装時に決定すべき実装詳細であり、仕様レベルで全Subscriptionのテスト/非テストを決めるのは過度。

---

## Response to Info (Low Priority)

| #    | Issue     | Judgment      | Reason         |
| ---- | --------- | ------------- | -------------- |
| S-01 | 移行進捗ダッシュボード | No Fix Needed | tasks.mdのCheckbox状態で追跡可能。別ドキュメントの追加は保守コスト増 |
| S-02 | テストカバレッジ定量目標 | No Fix Needed | 各ルーターテストのスコープはTask記述で十分定義済み |

---

## Files to Modify

| File   | Changes   |
| ------ | --------- |
| `.kiro/specs/trpc-full-migration/tasks.md` | Task 13.2にvanillaClientパターン追加の記述を追記、Task 11.4にWebSocketApiClient互換性確認ステップを追記 |

---

## Conclusion

レビュー#14で指摘された9件のうち、実際に修正が必要なのは2件（C-03, W-02）のみ。

- **C-01**: handlers.ts内のイベントコールバック移行方針はDesign docとTask 9.1/9.2の記述で十分明確
- **C-02**: `window.electronAPI`の段階的削減は各タスクの構造で既に担保済み
- **C-03**: Task 13.2にvanillaClientパターン追加を明示する必要あり → **Fix Required**
- **W-02**: Task 11.4にWebSocketApiClient互換性確認ステップを追加する必要あり → **Fix Required**

残りのWarning/Infoは現状の記述で十分対応済み。

次のステップ: `--fix` フラグで修正を適用可能。

---

## Applied Fixes

**Applied Date**: 2026-02-06
**Applied By**: --fix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| `.kiro/specs/trpc-full-migration/tasks.md` | Task 13.2にvanillaClientパターン追加の記述を追記、Task 11.4にWebSocketApiClient互換性確認ステップを追記 |

### Details

#### `.kiro/specs/trpc-full-migration/tasks.md`

**Issue(s) Addressed**: C-03, W-02

**Changes**:
- Task 13.2: 「Electron Process Boundary Rules」セクションにvanillaClientを使ったStore実装パターン（DD-006準拠）を追加する記述を追記
- Task 11.4: 実装着手前にWebSocketApiClientのメソッド一覧とApiClientインターフェースを照合するステップを先頭に追記

**Diff Summary**:
```diff
 - [ ] 13.2 (P) `.kiro/steering/structure.md`のディレクトリ構造をtRPCを反映して更新する
   - `src/main/ipc/`セクションを削除し、`src/main/trpc/`構造に置き換える
   - スキーマ、ルーター、テストのディレクトリ構成を記載する
+  - 「Electron Process Boundary Rules」セクションの正しい実装パターンに、vanillaClientを使ったStore実装パターン（DD-006準拠）を追加する
   - _Requirements: 12.2_
```

```diff
 - [ ] 11.4 `window.electronAPI`参照の全削除とIpcApiClient.tsの物理削除
+  - 実装着手前にWebSocketApiClientが提供するメソッド一覧とApiClientインターフェースの現状を照合し、削除予定のメソッドがWebSocketApiClientで使用されていないことを確認する
   - Renderer/Remote UI全体から`window.electronAPI`の参照を全て削除する
   - `src/shared/api/IpcApiClient.ts` を物理削除する
```

---

_Fixes applied by document-review-reply command._
