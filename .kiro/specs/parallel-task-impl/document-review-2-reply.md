# Response to Document Review #2

**Feature**: parallel-task-impl
**Review Date**: 2026-01-05
**Reply Date**: 2026-01-05

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 1      | 0            | 1             | 0                |
| Warning  | 3      | 1            | 2             | 0                |
| Info     | 2      | 0            | 2             | 0                |

---

## Response to Critical Issues

### C1: IPC/API命名不整合

**Issue**: design.mdとdocument-review-1-reply.mdの間で命名が異なる。`executeTaskImpl`/`EXECUTE_TASK_IMPL` vs `executeImplTask`/`EXECUTE_IMPL_TASK`

**Judgment**: **No Fix Needed** ❌

**Evidence**:
実際のコードベースとSpec文書を確認した結果、**正しい命名 `executeTaskImpl`/`EXECUTE_TASK_IMPL` が既にdesign.mdとtasks.mdで使用されている**。

**既存コードベースでの確認**:
```typescript
// preload/index.ts:137-138
executeTaskImpl: (specId: string, featureName: string, taskId: string, commandPrefix?: 'kiro' | 'spec-manager'): Promise<AgentInfo> =>
  ipcRenderer.invoke(IPC_CHANNELS.EXECUTE_TASK_IMPL, specId, featureName, taskId, commandPrefix),

// channels.ts:33
EXECUTE_TASK_IMPL: 'ipc:execute-task-impl',
```

**Spec文書での確認**:
- design.md:251: `EXECUTE_TASK_IMPL`: 既存チャンネルで個別タスク実装起動 ✅
- design.md:340: `window.electronAPI.executeTaskImpl(specId, featureName, taskId, commandPrefix)` ✅
- tasks.md:52: 既存の`EXECUTE_TASK_IMPL`を活用 ✅
- tasks.md:64: 既存`executeTaskImpl` IPC経由でAgent起動 ✅

**問題の根本原因**:
レビュー#2が指摘している「不整合」は、`document-review-1-reply.md:205`の記載ミスに起因する。replyファイルには誤って`executeImplTask`/`EXECUTE_IMPL_TASK`と記載されているが、**実際のdesign.mdとtasks.mdには反映されていない**（正しく`executeTaskImpl`のまま）。

つまり、Spec文書（design.md, tasks.md）自体は一貫しており、命名不整合は存在しない。問題があるのはreplyファイルの記載ミスのみであり、これは実装に影響しない。

**Action Items**: なし（Spec文書は既に正しい状態）

---

## Response to Warnings

### W1: 既存API存在未確認

**Issue**: `executeTaskImpl`, `stopAgent`, `onAgentStatusChange`の存在確認が必要。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
全ての既存APIがコードベースに存在することを確認した：

| API | ファイル | 行番号 | シグネチャ |
|-----|----------|--------|-----------|
| executeTaskImpl | preload/index.ts | 137-138 | `(specId: string, featureName: string, taskId: string, commandPrefix?: 'kiro' \| 'spec-manager'): Promise<AgentInfo>` |
| stopAgent | preload/index.ts | 102-103 | `(agentId: string): Promise<void>` |
| onAgentStatusChange | preload/index.ts | 211+ | `(callback: (agentId: string, status: string, phase?: string) => void): () => void` |

これらのAPIは全て実装済みであり、design.mdの記載（design.md:340-342）と一致している。実装時に追加の確認は不要。

**Action Items**: なし

---

### W2: Remote UI対応未定義

**Issue**: steering/tech.mdで推奨されているRemote UI影響チェックが本Specに記載されていない。

**Judgment**: **Fix Required** ✅

**Evidence**:
並列実装機能はUI上のボタン操作であり、Remote UI（VS Code Web Extension等）からの利用シナリオを考慮する必要がある。ただし、本機能は複数のClaudeセッションを同時に起動するものであり、Remote環境での同時実行は複雑性が高い。

現時点では「Desktop専用機能」として明確化し、将来のRemote UI対応は別Specで検討するのが適切。

**Action Items**:
- design.md: Non-Goalsセクションに「Remote UI対応は将来拡張として別途検討」を追記

---

### W3: document-review-1-reply.md修正内容確認

**Issue**: replyで提案された修正内容と実際のdesign.md/tasks.mdに不整合がある可能性。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
document-review-1-reply.mdの「Applied Fixes」セクションを確認すると、以下の修正が記載されている：
1. design.md: コマンドセット判定の説明追加 → **確認済み** (design.md:286-287に存在)
2. tasks.md: Task 2.2, 2.3, 2.4へのSpecManagerServiceメソッド追加明記

しかし、**設計方針変更**により、Task 2.3, 2.4（タスク別実装起動IPC、キャンセルIPC）は削除されている（tasks.md:51-54）：
```markdown
**設計変更による削除タスク**:
- ~~タスク別実装起動IPCハンドラ実装~~: 既存の`EXECUTE_TASK_IMPL`を活用
- ~~キャンセルIPCハンドラ実装~~: 既存の`STOP_AGENT`を活用
```

つまり、replyで記載されたTask 2.3, 2.4の修正は、その後の設計方針変更（既存API活用）により不要となり、正しくtasks.mdに反映されている。現在のtasks.mdは設計方針変更後の正しい状態である。

**Action Items**: なし

---

## Response to Info (Low Priority)

| # | Issue | Judgment | Reason |
| ---- | --------- | ------------- | -------------- |
| I1 | 既存API参照の具体化 | No Fix Needed | design.md:340-342に既に具体的なシグネチャが記載済み |
| I2 | 削除タスク記載整理 | No Fix Needed | tasks.md:51-54で明確に削除タスクとして記載されており、混乱はない |

---

## Files to Modify

| File | Changes |
| ------ | --------- |
| design.md | Non-Goalsセクションに「Remote UI対応は将来拡張として別途検討」を追記 |

---

## Conclusion

レビュー#2で指摘された問題のうち、**Critical指摘（IPC/API命名不整合）は実際には存在しない**ことが確認された。これはdocument-review-1-reply.mdの記載ミスに起因する誤検知であり、Spec文書（design.md, tasks.md）は一貫して正しい命名（`executeTaskImpl`/`EXECUTE_TASK_IMPL`）を使用している。

既存API（`executeTaskImpl`, `stopAgent`, `onAgentStatusChange`）の存在も確認され、design.mdの記載と一致している。

唯一の修正必要項目は、Remote UI対応の明確化（Non-Goalsへの追記）のみ。

**次のステップ**:
- `--fix` フラグで修正を適用: `/kiro:document-review-reply parallel-task-impl 2 --fix`
- または実装開始: `/kiro:spec-impl parallel-task-impl`

---

## Applied Fixes

**Applied Date**: 2026-01-05
**Applied By**: --fix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| design.md | Non-GoalsセクションにRemote UI対応除外を追記 |

### Details

#### design.md

**Issue(s) Addressed**: W2 (Remote UI対応未定義)

**Changes**:
- Non-GoalsセクションにRemote UI（VS Code Web Extension等）対応の除外を明記
- Desktop専用機能として設計する旨を記載
- 将来拡張として別Specで検討する方針を追加

**Diff Summary**:
```diff
 ### Non-Goals

 - 既存の「実装」ボタンの動作変更
 - tasks.mdの(P)マーク生成ロジック（既存のtasks-parallel-analysis.mdで対応済み）
 - 並列ビルド・テスト実行（impl内部の処理）
 - リモートプロジェクトでの並列実装（将来拡張）
+- Remote UI（VS Code Web Extension等）対応: 複数Claudeセッションの同時起動はDesktop専用機能として設計。Remote UI環境での並列実行は複雑性が高いため、将来拡張として別Specで検討する
```

---

_Fixes applied by document-review-reply command._

---

_This reply was generated by the document-review-reply command._
