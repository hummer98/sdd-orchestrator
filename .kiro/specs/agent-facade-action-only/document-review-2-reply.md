# Response to Document Review #2

**Feature**: agent-facade-action-only
**Review Date**: 2026-02-15
**Reply Date**: 2026-02-15

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 2      | 2            | 0             | 0                |
| Warning  | 3      | 3            | 0             | 0                |
| Info     | 2      | 2            | 0             | 0                |

---

## Response to Critical Issues

### C-01: Requirement 6.1のアクション一覧が不完全

**Issue**: Req 6.1のアクション一覧に12個しか記載がなく、ファサードに実在する7つのアクション（`sendInput`, `updateAgentStatus`, `appendLog`, `getLogsForAgent`, `getSelectedAgent`, `findAgentById`, `clearError`）が欠落している。Design.mdのAgentActionStore interfaceも同様に不完全。

**Judgment**: **Fix Required** ✅

**Evidence**:
ソースコード検証により、ファサードストア（`renderer/stores/agentStore.ts`）に以下の7アクションが実在することを確認:

| アクション | 行番号 | 用途 |
|-----------|--------|------|
| `sendInput` | L218, L544-550 | `agentOperations.sendInput()`への委譲 |
| `updateAgentStatus` | L220, L552-555 | 共有ストアのAgent状態更新 |
| `appendLog` | L228, L561-564 | `useSharedAgentStore.getState().addLog()`への委譲 |
| `getLogsForAgent` | L232, L571-573 | `useSharedAgentStore.getState().getLogsForAgent()`への委譲 |
| `getSelectedAgent` | L250, L675-679 | selectedAgentIdから現在のAgentを取得 |
| `findAgentById` | L254, L684-687 | null-check付きAgentById委譲 |
| `clearError` | L256, L689-692 | 共有ストアとファサードのエラークリア |

これらはコンポーネントやspecStoreFacadeから実際に使用されており、欠落させるとランタイムエラーが発生する。レビュー指摘は正確。

**Action Items**:

- `requirements.md` Req 6.1のアクション一覧に7アクションを追加
- `design.md` AgentActionStore interfaceに7アクションの型定義を追加
- ただし`updateAgentStatus`と`appendLog`はIPCイベントハンドラ（`setupEventListeners`）内部でのみ使用されるため、内部ヘルパーとして扱うかpublic interfaceに含めるかの判断が必要 → 現状はpublic interfaceに含まれているためそのまま追加

---

### C-02: Requirement 2.3の事実誤認 — ログ読み取りは「対応済み」ではない

**Issue**: Requirement 2.3とDesign.mdが「ログ読み取りは既にuseAgentLogSubscription経由で対応済み」と記載しているが、実際にはAgentLogPanel.tsxがファサードストアの`logs` Mapから直接読み取っている。

**Judgment**: **Fix Required** ✅

**Evidence**:
`AgentLogPanel.tsx` lines 39-42で、ファサードストア(`useAgentStore`)から`logs`を直接読み取っていることを確認:

```typescript
const rawLogs = useAgentStore((state) => {
  if (!state.selectedAgentId) return EMPTY_LOGS;
  return state.logs.get(state.selectedAgentId) || EMPTY_LOGS;
});
```

`useAgentLogSubscription`はログの**購読・ローディング制御**を担当するが、**ログデータの読み取り自体はファサードの`logs`フィールドから行われている**。「対応済み」の記述は事実誤認であり、ファサードの`logs`フィールド削除時にAgentLogPanelのログ表示が壊れる。

**Action Items**:

- `requirements.md` Criterion 2.3から「（既に対応済み）」を削除し、移行が必要であることを明記
- `design.md` Requirements Traceability Criterion 2.3の記述を「SSOTからの直接読み取りへの移行」に修正
- `tasks.md` Task 4.2の記述を「確認」から「`useSharedAgentStore(s => s.logs.get(selectedAgentId))`への移行」に明示的に変更

---

## Response to Warnings

### W-01: AgentLogPanelのログ読み取りパターンの詳細設計が不足

**Issue**: C-02で指摘されたログ読み取りの移行について、具体的な実装パターンがdesign.mdに不足。

**Judgment**: **Fix Required** ✅

**Evidence**: C-02の検証結果と同様。ファサードの`logs`フィールド削除後のAgentLogPanelのセレクタパターンを明確にすべき。

**Action Items**:

- `design.md`のAgentLogPanelコンポーネント説明に、SSOTからのログ読み取りセレクタパターンを追記:
  ```typescript
  const selectedAgentId = useSharedAgentStore(s => s.selectedAgentId);
  const rawLogs = useSharedAgentStore(s => {
    if (!selectedAgentId) return EMPTY_LOGS;
    return s.logs.get(selectedAgentId) || EMPTY_LOGS;
  });
  ```

---

### W-02: `getLogsFromShared()`関数の削除がTask 3.1で暗黙的

**Issue**: `getLogsFromShared()`は8箇所で使用されており、subscribe-and-syncだけでなく、`ensureLogsLoaded`、`removeAgent`、`appendLog`等のアクション内でも使用されている。Task 3.1の「subscribe-and-sync削除」に暗黙的に含まれるが明示されていない。

**Judgment**: **Fix Required** ✅

**Evidence**:
ソースコード検証により`getLogsFromShared()`の全使用箇所を確認:

| 行 | コンテキスト | 用途 |
|----|------------|------|
| L369 | 初期state設定 | `logs: getLogsFromShared()` |
| L463 | `ensureLogsLoaded()` | 共有ストアからログ同期 |
| L473 | `loadAgentLogs()` | 共有ストアからログ同期 |
| L536 | `removeAgent()` | Agent削除後のログ同期 |
| L563 | `appendLog()` | ログ追加後の同期 |
| L568 | `clearLogs()` | ログクリア後の同期 |
| L607 | イベントリスナー | ファイル削除イベント時の同期 |
| L651 | イベントリスナー | 共有ストア変更時の同期 |

これら全てがファサードの`logs`ローカル状態への同期パターンであり、ファサードから`logs`フィールドを削除する際に全箇所の`set({ logs: getLogsFromShared() })`呼び出しも削除が必要。

**Action Items**:

- `tasks.md` Task 3.1に`getLogsFromShared()`関数自体の削除と、全8箇所の`set({ logs: ... })`呼び出しの削除を明示

---

### W-03: `loadAgentLogs`(deprecated)の扱いが未定義

**Issue**: ファサードの`loadAgentLogs`の削除・残存が仕様で明示されていない。

**Judgment**: **Fix Required** ✅

**Evidence**:
ソースコード検証により、`loadAgentLogs`（L466-474）は以下の状態:
- `@deprecated`タグは付与されていない（レビューの「deprecated」記述は不正確だが、実質的に`ensureLogsLoaded`に委譲しているため機能的にはdeprecated）
- 実装は`ensureLogsLoaded`に委譲後、`set({ logs: getLogsFromShared() })`でローカル同期
- `_specId`パラメータ（未使用）が残存

ファサードがアクション専用になった後も、外部から呼ばれる可能性があるならinterfaceに残す必要がある。`ensureLogsLoaded`との重複を考慮し、明確な方針が必要。

**Action Items**:

- `loadAgentLogs`を削除候補としてReq 6.1のアクション一覧に注記（`ensureLogsLoaded`で代替可能）
- `tasks.md` Task 3.1に`loadAgentLogs`の扱い（削除 or 残存）を明記

---

## Response to Info (Low Priority)

| #    | Issue                                      | Judgment      | Reason                                                       |
| ---- | ------------------------------------------ | ------------- | ------------------------------------------------------------ |
| I-01 | AgentListPanelの`agents` Map読み取りの冗長性 | Fix Required ✅ | `agents` Map読み取りは`agents.size === 0`のloadチェック（L90-93）のみに使用。実際のAgent表示は`useAgentsBySpec(specId)`フック経由。SSOT移行時にこの冗長性を整理する注記をTask 4.1に追加すべき |
| I-02 | specStoreFacade.tsの`clearError()`はアクション呼び出し | Fix Required ✅ | `specStoreFacade.ts` L466-470の`clearSpecManagerError()`が`useAgentStore.getState().clearError()`を呼んでいる。Task 5.1に方針を明記すべき（ファサード経由維持、ファサードにclearErrorアクションが残るため） |

---

## Files to Modify

| File | Changes |
| ---- | ------- |
| `requirements.md` | Req 6.1に7アクション追加、Criterion 2.3の「（既に対応済み）」削除、`loadAgentLogs`の扱い注記 |
| `design.md` | AgentActionStore interfaceに7アクション追加、Criterion 2.3修正、AgentLogPanelのSSOTセレクタパターン追記 |
| `tasks.md` | Task 4.2を「移行」に変更、Task 3.1に`getLogsFromShared()`全箇所削除と`loadAgentLogs`方針を明示、Task 4.1にagents冗長読み取り注記、Task 5.1にclearError方針明記 |

---

## Conclusion

全7件の指摘（Critical 2件、Warning 3件、Info 2件）全てが正当であり、Fix Requiredと判断した。特にC-01（アクション一覧不完全）とC-02（ログ読み取り「対応済み」の事実誤認）は、実装者が仕様を忠実に実装した場合にランタイムエラーを引き起こすため、修正は必須。

`--autofix`モードにより修正を適用済み。新しいドキュメントレビューラウンドで修正内容の検証が必要。

---

## Applied Fixes

**Applied Date**: 2026-02-15
**Applied By**: --autofix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| `requirements.md` | Req 6.1に7アクション追加+loadAgentLogs注記、Criterion 2.3から「対応済み」を削除 |
| `design.md` | AgentActionStore interfaceに7アクション追加、Criterion 2.3修正、AgentLogPanelセレクタパターン追記、AgentListPanel整理注記追記 |
| `tasks.md` | Task 3.1にgetLogsFromShared()全箇所削除+loadAgentLogs削除を追加、Task 4.1にagents冗長読み取り注記、Task 4.2をログ移行タスクに変更、Task 5.1にclearError方針明記、Coverage Matrix 2.3更新 |

### Details

#### requirements.md

**Issue(s) Addressed**: C-01, C-02, W-03

**Changes**:
- Req 6.1のアクション一覧に7アクション（`sendInput`, `updateAgentStatus`, `appendLog`, `getLogsForAgent`, `getSelectedAgent`, `findAgentById`, `clearError`）を追加
- `loadAgentLogs`を`ensureLogsLoaded`に委譲しており削除候補である旨を注記
- Criterion 2.3の「（既に対応済み）」を削除し、SSOTへの移行が必要であることを明記

**Diff Summary**:
```diff
- `logs`を読むAgentLogPanelが`useSharedAgentStore`から直接読み取ること（既に対応済み）
+ `logs`を読むAgentLogPanelが`useSharedAgentStore`から直接読み取ること（現在はファサードの`logs`フィールドから読み取っており、SSOTへの移行が必要）
```

```diff
- 以下のアクションがファサードストアに残ること: `setupEventListeners`, `startAgent`, `stopAgent`, `resumeAgent`, `selectAgent`, `addAgent`, `removeAgent`, `loadAgents`, `clearLogs`, `ensureLogsLoaded`, `selectForProjectAgents`, `getAgentById`
+ 以下のアクションがファサードストアに残ること: `setupEventListeners`, `startAgent`, `stopAgent`, `resumeAgent`, `selectAgent`, `addAgent`, `removeAgent`, `loadAgents`, `clearLogs`, `ensureLogsLoaded`, `selectForProjectAgents`, `getAgentById`, `sendInput`, `updateAgentStatus`, `appendLog`, `getLogsForAgent`, `getSelectedAgent`, `findAgentById`, `clearError`。なお`loadAgentLogs`は`ensureLogsLoaded`に委譲しており機能的に重複するため、削除候補とする
```

#### design.md

**Issue(s) Addressed**: C-01, C-02, W-01

**Changes**:
- AgentActionStore interfaceに7アクション（`sendInput`, `updateAgentStatus`, `appendLog`, `getLogsForAgent`, `getSelectedAgent`, `findAgentById`, `clearError`）の型定義を追加
- `loadAgentLogs`削除候補のコメントを追加
- Requirements Traceability Criterion 2.3の「対応済み」を移行が必要な旨に修正
- AgentLogPanelのSSOT直接読み取りセレクタパターンを追記
- AgentListPanelの`agents` Map読み取り整理の注記を追記

**Diff Summary**:
```diff
  getAgentById(agentId: string): AgentInfo | undefined;
+ sendInput(agentId: string, input: string): Promise<void>;
+ updateAgentStatus(agentId: string, status: AgentStatus): void;
+ appendLog(agentId: string, entry: ParsedLogEntry): void;
+ getLogsForAgent(agentId: string): ParsedLogEntry[];
+ getSelectedAgent(): AgentInfo | undefined;
+ findAgentById(agentId: string | null): AgentInfo | undefined;
+ clearError(): void;
  setSkipPermissions(enabled: boolean): void;
  loadSkipPermissions(projectPath: string): Promise<void>;
+ // loadAgentLogs: ensureLogsLoadedに委譲しており機能的に重複するため削除候補
```

```diff
- | 2.3 | logsのSSOT直接読み取り | AgentLogPanel | 既に`useAgentLogSubscription`経由で対応済み、残存箇所の確認 |
+ | 2.3 | logsのSSOT直接読み取り | AgentLogPanel | 現在はファサードの`logs`フィールドから読み取っており（AgentLogPanel.tsx L39-42）、`useSharedAgentStore(s => s.logs.get(selectedAgentId))`への移行が必要 |
```

#### tasks.md

**Issue(s) Addressed**: C-02, W-02, W-03, I-01, I-02

**Changes**:
- Task 3.1に`getLogsFromShared()`関数の削除と全8箇所の使用箇所を明示
- Task 3.1に`loadAgentLogs`の削除を追加
- Task 4.1にAgentListPanelの`agents` Map読み取り冗長性の整理注記を追加
- Task 4.2を「確認」から「SSOTへの移行」タスクに変更（具体的なコード書き換え箇所を明示）
- Task 5.1にspecStoreFacadeの`clearError()`アクション呼び出し方針を明記
- Coverage Matrix 2.3を「確認」から「移行」に更新

**Diff Summary**:
```diff
  Task 3.1:
+ - `getLogsFromShared()`関数を削除し、全8箇所の`set({ logs: getLogsFromShared() })`呼び出しを除去
+ - `loadAgentLogs`を削除（`ensureLogsLoaded`で代替可能、機能的に重複）
- _Verify: Grep "subscribe\(.*useSharedAgentStore\|getAgentsFromShared\|calculateRunningCounts"
+ _Verify: Grep "subscribe\(.*useSharedAgentStore\|getAgentsFromShared\|calculateRunningCounts\|getLogsFromShared"
```

```diff
  Task 4.2:
- - `logs`の読み取りは既に`useAgentLogSubscription`経由で対応済みであることを確認、残存箇所があれば修正
+ - `logs`の読み取りをSSOT直接読み取りに移行する: 現在の`useAgentStore(s => s.logs.get(s.selectedAgentId))`を`useSharedAgentStore(s => s.logs.get(selectedAgentId))`に書き換え（AgentLogPanel.tsx L39-42）
```

---

_Fixes applied by document-review-reply command._
