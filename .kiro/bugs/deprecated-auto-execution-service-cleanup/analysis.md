# Bug Analysis: deprecated-auto-execution-service-cleanup

## Summary
旧AutoExecutionService（Renderer側、1339行）が@deprecated付きで残存しており、新しいMain Process側のAutoExecutionCoordinatorと二重管理状態になっている。Task 10.3で「非推奨期間経過後」に削除予定だったが、期間が明示されていないため放置されている。

## Root Cause
**タスク管理の不備**: `auto-execution-main-process` specのTask 10.3で「非推奨期間経過後」と記載されているが、具体的な削除日時が設定されておらず、タスクが完了マークされているにも関わらず実際の削除が行われていない。

### Technical Details
- **Location**: `electron-sdd-manager/src/renderer/services/AutoExecutionService.ts:1-1339`
- **Component**: AutoExecutionService (Renderer Process)
- **Trigger**: 移行計画の不完全さ（非推奨期間の未定義）

**新旧コードの関係**:
| 観点 | 旧: AutoExecutionService | 新: AutoExecutionCoordinator |
|------|-------------------------|------------------------------|
| 場所 | Renderer Process | Main Process |
| ファイル | `src/renderer/services/AutoExecutionService.ts` | `src/main/services/autoExecutionCoordinator.ts` |
| 行数 | 1339行 | 991行 |
| 状態管理 | executionContexts Map | executionStates Map |
| API | getAutoExecutionService() | IPC経由 (useAutoExecution Hook) |
| 使用状況 | WorkflowView.tsx で直接使用 | useAutoExecution Hookから間接使用 |

**現状の呼び出し箇所**:
1. `WorkflowView.tsx:24` - import
2. `WorkflowView.tsx:51` - `autoExecutionServiceRef = useRef(getAutoExecutionService())`
3. `WorkflowView.tsx:68` - `disposeAutoExecutionService()` (cleanup)
4. `WorkflowView.tsx:328` - `getAutoExecutionService()` (document-review追跡)
5. `services/index.ts:6-10` - エクスポート

## Impact Assessment
- **Severity**: Medium
- **Scope**:
  - 開発者の混乱（どちらのAPIを使うべきか不明確）
  - コードベースの肥大化（+1339行の非アクティブコード）
  - design-review-20260102.mdで指摘された「Duplicated Execution Logic」問題
- **Risk**:
  - 旧APIを誤って使用する可能性
  - 状態の二重管理による不整合リスク
  - テストコードの重複メンテナンス負荷

## Related Code
```typescript
// WorkflowView.tsx:24, 51, 68 - 旧サービスを直接使用
import { getAutoExecutionService, disposeAutoExecutionService } from '../services/AutoExecutionService';
const autoExecutionServiceRef = useRef(getAutoExecutionService());

// 一方で useAutoExecution Hook も存在（Main Process IPC経由）
// electron-sdd-manager/src/renderer/hooks/useAutoExecution.ts
export function useAutoExecution(): UseAutoExecutionReturn { ... }
```

```typescript
// AutoExecutionService.ts:1299-1323 - @deprecated警告
/**
 * Get the singleton AutoExecutionService instance.
 *
 * @deprecated This Renderer-based AutoExecutionService will be replaced by
 * Main Process-based AutoExecutionCoordinator. Use useAutoExecution hook
 * for new code, which communicates with Main Process via IPC.
 * See: auto-execution-main-process feature (Task 4.3)
 */
export function getAutoExecutionService(): AutoExecutionService {
```

## Proposed Solution

### Option 1: 完全削除（推奨）
- Description: 旧AutoExecutionServiceを完全に削除し、全ての呼び出し箇所をuseAutoExecution Hookに置き換え
- Pros:
  - コードベースが991行削減（テスト含めるとさらに大幅削減）
  - SSoT原則に完全準拠
  - 状態管理の単純化
- Cons:
  - WorkflowView.tsxのリファクタリングが必要
  - 一部の機能（document-review追跡）がuseAutoExecution Hookで未サポートの可能性

### Option 2: 段階的移行
- Description: 残りの呼び出し箇所を特定し、useAutoExecution Hookの機能を拡張後に削除
- Pros:
  - 移行リスクが低い
  - 機能の欠落を事前に確認可能
- Cons:
  - 二重管理状態が長期化
  - メンテナンス負荷が継続

### Recommended Approach
**Option 1: 完全削除** を推奨。

理由:
1. `useAutoExecution` Hookは既に実装済み（Task 4.1完了）
2. Main Process側の`AutoExecutionCoordinator`が全機能を提供
3. 現在の使用箇所は限定的（WorkflowView.tsx内のみ）
4. テストもMain Process側に移行済み

## Dependencies
- `electron-sdd-manager/src/renderer/services/AutoExecutionService.ts` - 削除対象
- `electron-sdd-manager/src/renderer/services/AutoExecutionService.test.ts` - 削除対象
- `electron-sdd-manager/src/renderer/services/AutoExecutionService.parallel.test.ts` - 削除対象
- `electron-sdd-manager/src/renderer/services/AutoExecutionService.integration.test.ts` - 削除対象
- `electron-sdd-manager/src/renderer/services/index.ts` - エクスポート削除
- `electron-sdd-manager/src/renderer/components/WorkflowView.tsx` - useAutoExecution Hookへ移行

## Testing Strategy
1. 既存E2Eテスト（auto-executionシナリオ）がパスすることを確認
2. useAutoExecution Hookの単体テストで移行後の機能をカバー
3. 削除後にWorkflowViewの自動実行機能が正常動作することを確認
4. Main Process側のAutoExecutionCoordinator統合テストで全機能をカバー
