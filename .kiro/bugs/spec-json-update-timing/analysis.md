# Bug Analysis: spec-json-update-timing

## Summary

spec.jsonの`updated_at`タイムスタンプの更新タイミングを整理。「ユーザーアクション時のみ更新」の原則を明確化し、スキルによるアーティファクト生成（requirements.md, design.md, tasks.md）もユーザーアクションとして扱う。

## Root Cause

**設計方針の明確化が必要**

当初の分析では「現状は適切」としたが、ユーザーとの議論により以下の方針が確定：

1. **spec-plan/spec-init**: スキルが直接`spec.json`を生成（手動実行が多いため）
2. **spec-requirements以降**: プログラム側で`spec.json`を管理
   - アーティファクト生成検知時に`updated_at`を更新

### Technical Details

- **Location**: `specsWatcherService.ts`
- **Component**: SpecsWatcherService
- **Trigger**: requirements.md, design.md, tasks.mdの生成検知

## Impact Assessment

- **Severity**: Low（機能改善）
- **Scope**: spec.jsonの`updated_at`フィールド、Spec一覧のソート順
- **Risk**: 低（既存の動作を壊さない追加変更）

## 更新タイミングの設計原則

### ユーザーアクション → `updated_at`を更新

| トリガー | 更新箇所 | 備考 |
|---------|---------|------|
| requirements.md生成 | specsWatcherService | **新規追加** |
| design.md生成 | specsWatcherService | **新規追加** |
| tasks.md生成 | specsWatcherService | **新規追加** |
| UIからの設定変更 | fileService | 既存 |
| 承認操作 | fileService | 既存 |
| Document Review操作 | documentReviewService | 既存 |

### 自動補正 → `skipTimestamp: true`（更新しない）

| トリガー | 更新箇所 | 備考 |
|---------|---------|------|
| tasks.md変更で全タスク完了検知 | specsWatcherService | 既存 |
| spec.json変更でInspection GO検知 | specsWatcherService | 既存 |
| タスク進捗同期でフェーズ自動修正 | specSyncService | 既存 |
| Spec選択時のフェーズ自動修正 | specDetailStore | 既存 |

## Proposed Solution

### 実装内容

`specsWatcherService.ts`に以下を追加：

1. `handleEvent`でrequirements.md, design.md, tasks.mdの`add`イベントを検知
2. `handleArtifactGeneration`メソッドで`spec.json`の`updated_at`を更新

### コード変更

```typescript
// handleEvent内に追加
const artifactFiles = ['requirements.md', 'design.md', 'tasks.md'];
if (type === 'add' && artifactFiles.includes(fileName) && specId) {
  this.handleArtifactGeneration(filePath, specId, fileName).catch(...);
}

// 新規メソッド
private async handleArtifactGeneration(
  filePath: string,
  specId: string,
  fileName: string
): Promise<void> {
  // spec.json の updated_at を更新（skipTimestamp なし）
}
```

## Dependencies

- `specsWatcherService.ts`の変更のみ
- 既存のfileService, specSyncServiceへの変更は不要

## Testing Strategy

1. ビルド確認（TypeScriptエラーなし）
2. 手動テスト：
   - spec-requirements実行後にspec.jsonの`updated_at`が更新されることを確認
   - spec-design, spec-tasks実行後も同様に確認
   - 自動フロー（タスク完了検知）では`updated_at`が更新されないことを確認

## 結論

アーティファクト生成時の`updated_at`更新をプログラム側（specsWatcherService）で行うことで、「ユーザーアクション時のみ更新」の原則が一貫して適用される。
