# Bug Analysis: agent-state-dual-management

## Summary
Agent状態が複数箇所で二重管理されており、直接`addAgent()`呼び出しとファイル監視の両方が存在するため、UI表示とファイル状態が不整合になる。

## Root Cause

### Technical Details
- **Location**:
  - [WorkflowView.tsx:182](electron-sdd-manager/src/renderer/components/WorkflowView.tsx#L182) - 直接`addAgent()`呼び出し
  - [agentStore.ts:384-416](electron-sdd-manager/src/renderer/stores/agentStore.ts#L384-L416) - ファイル監視による`addAgent()`呼び出し
- **Component**: Agent State Management (agentStore, WorkflowView)
- **Trigger**: フェーズ実行後、直接呼び出しとファイル監視の両方がトリガーされ、タイミングによって不整合が発生

### 問題の構造

```
現在のデータフロー（二重パス）:
┌─────────────────────────────────────────────────────────────────┐
│  WorkflowView.tsx                                               │
│  executePhase() → [1] agentStore.addAgent() (直接呼び出し)      │
│                 ↓                                               │
│  Main Process: ファイル書き込み                                  │
│                 ↓                                               │
│  FileWatcher検知 → IPC → [2] addAgent() (ファイル監視経由)      │
└─────────────────────────────────────────────────────────────────┘

期待するデータフロー（単一パス）:
┌─────────────────────────────────────────────────────────────────┐
│  WorkflowView.tsx                                               │
│  executePhase() → Main Process: ファイル書き込み                │
│                 ↓                                               │
│  FileWatcher検知 → IPC → addAgent() + selectAgent()            │
└─────────────────────────────────────────────────────────────────┘
```

### 直接`addAgent()`呼び出し箇所（全7箇所）

| 行番号 | ファイル | 用途 |
|--------|----------|------|
| 182 | WorkflowView.tsx | `handleExecutePhase` |
| 225 | WorkflowView.tsx | `handleExecuteValidation` |
| 270 | WorkflowView.tsx | `handleSpecStatus` |
| 299 | WorkflowView.tsx | `handleStartDocumentReview` |
| 317 | WorkflowView.tsx | `handleExecuteDocumentReviewReply` |
| 335 | WorkflowView.tsx | `handleApplyDocumentReviewFix` |
| 383 | WorkflowView.tsx | `handleExecuteTask` |

### AutoExecutionServiceとの不整合

```typescript
// AutoExecutionService.ts:815-821 - addAgent()呼び出しなし
await window.electronAPI.executePhase(
  specDetail.metadata.name,
  phase,
  specDetail.metadata.name
);
// ファイル監視のみに依存
```

WorkflowViewは直接呼び出し + ファイル監視の二重パス、AutoExecutionServiceはファイル監視のみ。コードパスが不統一。

## Impact Assessment
- **Severity**: Medium
- **Scope**: Agent一覧表示、ステータス表示、自動実行機能
- **Risk**:
  - UI表示とファイル状態の不整合
  - HMR発生時のステート消失
  - ユーザー混乱（完了済みなのにスピナー表示等）

## Related Code

### 直接呼び出しパターン（WorkflowView.tsx:182-183）
```typescript
const newAgent = await window.electronAPI.executePhase(...);
agentStore.addAgent(specDetail.metadata.name, newAgent);
agentStore.selectAgent(newAgent.agentId);
```

### ファイル監視パターン（agentStore.ts:407-413）
```typescript
if (type !== 'unlink') {
  const agentInfo = agent as AgentInfo;
  if (agentInfo.agentId && agentInfo.specId !== undefined) {
    get().addAgent(agentInfo.specId, agentInfo);
    // selectAgent()は呼ばれていない
  }
}
```

## Proposed Solution

### Option 1: ファイル監視のみに統一（推奨）
- **Description**: 直接`addAgent()`呼び出しを削除し、ファイル監視の`add`イベントで`addAgent()` + `selectAgent()`を行う
- **Pros**:
  - Single Source of Truth (SSOT)
  - コードパスの統一
  - 状態不整合の根本解決
- **Cons**:
  - 100-200msの表示遅延（ユーザー許容済み）

### Recommended Approach

**Option 1を採用**: ファイル監視をSSOTとして統一

#### 修正内容

1. **WorkflowView.tsx**: 7箇所の`addAgent()`呼び出しを削除
   - `selectAgent()`呼び出しも削除（ファイル監視側で行う）

2. **agentStore.ts**: ファイル監視の`add`イベント時に自動選択
   ```typescript
   if (type !== 'unlink') {
     const agentInfo = agent as AgentInfo;
     if (agentInfo.agentId && agentInfo.specId !== undefined) {
       get().addAgent(agentInfo.specId, agentInfo);
       // 新規追加時のみ自動選択
       if (type === 'add') {
         get().selectAgent(agentInfo.agentId);
       }
     }
   }
   ```

## Dependencies
- `agentRecordWatcherService.ts` - ファイル監視サービス（変更不要）
- `handlers.ts` - IPC送信ロジック（変更不要）
- `preload.ts` - IPC受信ロジック（変更不要）

## Testing Strategy
1. **手動実行テスト**: フェーズ実行後、Agent一覧に追加され自動選択されることを確認
2. **自動実行テスト**: 自動実行中もAgent一覧が正しく更新されることを確認
3. **HMRテスト**: HMR発生後もAgent状態が維持されることを確認
4. **複数Agent**: 同一specで複数のAgentが正しく表示されることを確認
