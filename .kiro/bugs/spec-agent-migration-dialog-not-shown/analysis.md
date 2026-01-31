# Bug Analysis: spec-agent-migration-dialog-not-shown

## Summary
MigrationServiceとMigrationDialogコンポーネントは実装済みだが、UIから`checkMigrationNeeded`を呼び出す処理が欠落しているため、SpecAgentログの古い場所（`.kiro/specs/{specId}/logs`）にログファイルが存在してもマイグレーションダイアログが表示されない。

## Root Cause

### Technical Details
- **Location**: `electron-sdd-manager/src/renderer/components/SpecDetail.tsx`（マイグレーションチェック呼び出しが欠落）
- **Component**: SpecDetailコンポーネント（Spec選択時の詳細表示UI）
- **Trigger**: Task 10.3「MigrationDialogをUIに統合」が部分実装のまま完了していた

**Task 10.3の実装状況**:
- ✅ MigrationDialogコンポーネントのエクスポート（`electron-sdd-manager/src/shared/components/migration/index.ts`）
- ✅ preload/index.tsとelectron.d.tsへのメソッド追加（checkMigrationNeeded, acceptMigration, declineMigration）
- ❌ UI側でcheckMigrationNeededを呼び出す処理が未実装

## Impact Assessment
- **Severity**: Medium
- **Scope**: runtime-agents-restructure機能の一部が機能していない。既存ユーザーが古いログを新しい場所にマイグレーションできない。
- **Risk**: ユーザーが過去のログにアクセスできない可能性（フォールバック読み取りは実装済みのため、ログ自体は参照可能）

## Related Code

### 実装済みのコンポーネント（未使用）
`electron-sdd-manager/src/shared/components/migration/MigrationDialog.tsx:78-238`
```tsx
export function MigrationDialog({
  isOpen, specId, fileCount, totalSize,
  isProcessing, error,
  onAccept, onDecline, onClose,
}: MigrationDialogProps): React.ReactElement | null {
  // ... ダイアログUI実装済み
}
```

### 実装済みのIPCハンドラ
`electron-sdd-manager/src/main/ipc/handlers.ts:609-696`
```typescript
// CHECK_MIGRATION_NEEDED, ACCEPT_MIGRATION, DECLINE_MIGRATIONの3つのIPCハンドラが実装済み
```

### 欠落している処理
`electron-sdd-manager/src/renderer/components/SpecDetail.tsx` - Spec選択時のuseEffect内でcheckMigrationNeededを呼び出す処理が存在しない

## Proposed Solution

### Option 1: SpecDetailコンポーネントにuseEffectを追加（推奨）

**Description**:
SpecDetailコンポーネントに`useEffect`を追加し、Spec選択時に`window.electron.checkMigrationNeeded`を呼び出してマイグレーションが必要か確認。必要な場合はMigrationDialogを表示する。

**実装箇所**:
- `electron-sdd-manager/src/renderer/components/SpecDetail.tsx`
  - MigrationDialog状態管理（useState）
  - useEffectでcheckMigrationNeeded呼び出し
  - MigrationDialogコンポーネントのレンダリング
  - onAccept/onDecline/onCloseハンドラの実装

**Pros**:
- 設計ドキュメント（Requirement 5.1）の意図通り、Spec選択時にマイグレーションを促せる
- 既存のコンポーネントとIPCハンドラを活用できる
- ユーザーがlegacyログの存在に気づける

**Cons**:
- SpecDetailコンポーネントの責務が増える（ただし、この画面が最適な統合ポイント）

### Option 2: 専用のマイグレーション管理画面を作成

**Description**:
全Specのマイグレーション状況を一覧で確認・実行できる専用画面を追加する。

**Pros**:
- マイグレーション処理が独立したUIで管理しやすい

**Cons**:
- Requirement 5.1「Spec選択時にダイアログ表示」から逸脱する
- ユーザーが専用画面を見つけにくい可能性

### Recommended Approach
**Option 1を推奨**。設計ドキュメントの意図通り、Spec選択時にマイグレーションダイアログを表示することで、ユーザーが自然にlegacyログの移行を実行できる。

## Dependencies
- MigrationDialog (`electron-sdd-manager/src/shared/components/migration/MigrationDialog.tsx`) - 既に実装済み
- MigrationService (`electron-sdd-manager/src/main/services/migrationService.ts`) - 既に実装済み
- IPC handlers (`electron-sdd-manager/src/main/ipc/handlers.ts`) - 既に実装済み
- preload API (`electron-sdd-manager/src/preload/index.ts`) - 既に実装済み

## Testing Strategy
1. **Manual Test**: Spec選択時にlegacyログがある場合、ダイアログが表示されることを確認
2. **Migration Execution**: ダイアログで「Migrate」をクリックし、ログが新しい場所に移動することを確認
3. **Decline Migration**: ダイアログで「Skip」をクリックし、セッション中に再表示されないことを確認
4. **Edge Case**: legacyログがない場合、ダイアログが表示されないことを確認
