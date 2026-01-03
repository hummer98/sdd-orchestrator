# Bug Analysis: inspection-state-data-model

## Summary
Inspectionワークフローのデータ構造（`MultiRoundInspectionState`）に冗長なフィールドがあり、`fixApplied`更新の責務が未定義のため、NOGO→Fix→再Inspectionのフローが正常に動作しない。

## Root Cause

### Technical Details
- **Location**:
  - [inspection.ts:62-71](electron-sdd-manager/src/renderer/types/inspection.ts#L62-L71) - `InspectionRoundDetail`型定義
  - [inspection.ts:209-218](electron-sdd-manager/src/renderer/types/inspection.ts#L209-L218) - `MultiRoundInspectionState`型定義
  - [spec-impl.md](electron-sdd-manager/resources/templates/agents/kiro/spec-impl.md) - `--inspection-fix`オプション未対応
  - [spec-inspection.md:216](electron-sdd-manager/resources/templates/agents/kiro/spec-inspection.md#L216) - `fixApplied`フィールド定義のみ、更新責務なし

- **Component**: inspection-workflow-ui, spec-inspection agent, spec-impl agent

- **Trigger**:
  1. Inspection実行 → NOGO判定 → `roundDetails`に`{passed: false}`追加
  2. Fix実行ボタンクリック → `spec-impl --inspection-fix`実行
  3. **spec-impl agentに`fixApplied`更新の指示がない** → `fixApplied`は`undefined`のまま
  4. UI判定 `showFixButton = !latestFixApplied` → 常にFixボタン表示のまま

### 問題の本質

1. **責務の欠落**: `--inspection-fix`オプションを受け取った`spec-impl`agentが何をすべきか定義されていない

2. **冗長なフィールド**:
   - `status`: AgentStoreで実行状態を管理しているため不要
   - `currentRound`: 同上
   - `rounds`: `roundDetails.length`で計算可能

3. **意味の曖昧さ**: `fixApplied: boolean`は「適用済みか」を表すが、いつ誰が設定するか不明。`fixedAt: string`（タイムスタンプ）の方が明確。

## Impact Assessment
- **Severity**: Major
- **Scope**: Inspection→Fix→再Inspectionの全フローが機能しない
- **Risk**: データ構造変更は後方互換性に影響。既存spec.jsonのマイグレーションが必要

## Related Code

### 現在のデータ構造（問題あり）
```typescript
// inspection.ts:62-71
interface InspectionRoundDetail {
  roundNumber: number;
  passed: boolean;
  fixApplied?: boolean;  // ← 誰が設定？
  completedAt?: string;
}

// inspection.ts:209-218
interface MultiRoundInspectionState {
  status: InspectionStatus;      // ← AgentStoreと重複
  rounds: number;                // ← roundDetails.lengthで計算可能
  currentRound: number | null;   // ← AgentStoreと重複
  roundDetails: InspectionRoundDetail[];
}
```

### UI判定ロジック
```typescript
// InspectionPanel.tsx:212
const showFixButton = latestPassed === false && !latestFixApplied;
// fixAppliedが更新されないため、常にtrueのまま
```

## Proposed Solution

### Option 1: 最小限修正（spec-implにfixApplied更新を追加）
- Description: `spec-impl.md`に`--inspection-fix`オプション処理を追加し、完了時に`fixApplied: true`を設定
- Pros: 既存データ構造を維持、変更箇所が少ない
- Cons: 冗長なフィールドが残る、根本的な設計問題は解決しない

### Option 2: データ構造リファクタリング（推奨）
- Description: シンプルな構造に変更し、責務を明確化
- Pros:
  - 冗長フィールド削除で保守性向上
  - `fixedAt`タイムスタンプで監査証跡
  - UIロジックがシンプルに
- Cons:
  - 後方互換性対応が必要
  - 複数ファイルの変更

### 新データ構造（Option 2）
```typescript
interface InspectionState {
  rounds: InspectionRound[];
}

interface InspectionRound {
  number: number;
  result: 'go' | 'nogo';
  inspectedAt: string;
  fixedAt?: string;  // fix完了時にspec-impl agentが設定
}
```

### UIロジック（Option 2）
```typescript
const latest = rounds[rounds.length - 1];
const showFixButton = latest?.result === 'nogo' && !latest.fixedAt;
const showInspectionButton = !latest || latest.result === 'go' || latest.fixedAt;
```

### Recommended Approach
**Option 2**を推奨。理由：
1. SSOTの原則（AgentStoreで管理する状態をspec.jsonに重複させない）
2. より明確な責務分離
3. 将来の拡張性（タイムスタンプでの履歴追跡）

## Dependencies
変更が必要なファイル：

### 型定義
- `electron-sdd-manager/src/renderer/types/inspection.ts`
- `electron-sdd-manager/src/renderer/types/index.ts`

### Agent/Command テンプレート
- `electron-sdd-manager/resources/templates/agents/kiro/spec-inspection.md`
- `electron-sdd-manager/resources/templates/agents/kiro/spec-impl.md`

### UI コンポーネント
- `electron-sdd-manager/src/renderer/components/InspectionPanel.tsx`
- `electron-sdd-manager/src/renderer/components/WorkflowView.tsx`

### テスト
- `electron-sdd-manager/src/renderer/types/inspection.test.ts`
- `electron-sdd-manager/src/renderer/components/InspectionPanel.test.tsx`

## Testing Strategy

### 単体テスト
1. 新しい型ガード関数のテスト
2. 後方互換性変換関数のテスト
3. UIコンポーネントのボタン表示ロジックテスト

### 統合テスト
1. Inspection実行 → GO判定 → Deployボタンenable確認
2. Inspection実行 → NOGO判定 → Fixボタン表示確認
3. Fix実行 → fixedAt設定 → Inspectionボタン表示確認
4. 2回目のInspection → 状態遷移確認

### E2Eテスト
1. 完全なInspection→Fix→再Inspectionフローの動作確認
