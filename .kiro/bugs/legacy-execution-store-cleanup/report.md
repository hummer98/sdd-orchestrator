# Bug Report: legacy-execution-store-cleanup

## Overview
`ExecutionStore`、`PhaseExecutionPanel`、`LogPanel` がレガシーコードとして残存している。これらは現在UIに配置されておらず、`WorkflowView` + `AgentLogPanel` に置き換えられているが、コードベースに残ったままになっている。

### 調査結果サマリー

| 対象 | 状態 | 理由 |
|------|------|------|
| `ExecutionStore` | 削除可能 | 使用するUIコンポーネントが存在しない |
| `PhaseExecutionPanel` | 削除可能 | `App.tsx`に未配置、レガシー |
| `LogPanel` | 削除可能 | `AgentLogPanel`に置き換え済み（Task 33.3） |

### 背景
- **初期実装 (2025-11-26)**: `ExecutionStore`はシンプルなコマンド実行用に作成
- **その後の進化**: 自動実行ワークフローで`SpecManagerExecutionStore`が導入
- **現在**: `WorkflowView`が`window.electronAPI.executePhase`を直接呼び出し、`ExecutionStore`を経由しない

### Design Review指摘との関連
`docs/memo/design-review-20260102.md` の「Duplicated Execution Logic」指摘は妥当だが、解決策は「統合」ではなく「レガシーの削除」が適切。

## Status
**Pending**

## Environment
- Date Reported: 2026-01-03T15:30:00+09:00
- Affected Component: `electron-sdd-manager/src/renderer/stores/executionStore.ts`, `electron-sdd-manager/src/renderer/components/PhaseExecutionPanel.tsx`, `electron-sdd-manager/src/renderer/components/LogPanel.tsx`
- Severity: Low (技術的負債、機能への影響なし)

## Steps to Reproduce
1. `electron-sdd-manager/src/renderer/App.tsx` を確認
2. `PhaseExecutionPanel` と `LogPanel` がimportされていないことを確認
3. `WorkflowView` が `ExecutionStore` を使用していないことを確認

## Expected Behavior
不要なレガシーコードはコードベースから削除されているべき。

## Actual Behavior
以下のファイルが残存:
- `stores/executionStore.ts` + テスト
- `components/PhaseExecutionPanel.tsx` + テスト
- `components/LogPanel.tsx`
- `components/index.ts` でのexport

## Error Messages / Logs
```
N/A - 機能的なバグではない
```

## Related Files
- `electron-sdd-manager/src/renderer/stores/executionStore.ts`
- `electron-sdd-manager/src/renderer/stores/executionStore.test.ts`
- `electron-sdd-manager/src/renderer/components/PhaseExecutionPanel.tsx`
- `electron-sdd-manager/src/renderer/components/PhaseExecutionPanel.test.tsx`
- `electron-sdd-manager/src/renderer/components/LogPanel.tsx`
- `electron-sdd-manager/src/renderer/components/index.ts`
- `electron-sdd-manager/src/renderer/stores/index.ts`

## Additional Context
### 削除時の確認事項
1. `commandService.ts` の `executeCommand` IPCハンドラも不要か確認
2. preload API の `executeCommand` も不要か確認
3. 関連テストファイルの削除

### 参考
- Design Review: `docs/memo/design-review-20260102.md`
- spec-store-decomposition spec: `.kiro/specs/spec-store-decomposition/`
