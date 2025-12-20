# Bug Analysis: reply-undefined-tab

## Summary
メインパネルに「Reply-undefined」タブが表示される。spec.jsonのroundDetailsに不正なスキーマ（`round`や`roundNumber`なし）のデータが混在しているため。

## Root Cause

### Technical Details
- **Location**: `electron-sdd-manager/src/main/services/documentReviewService.ts:641-664`
- **Component**: `mergeRoundDetails`メソッド
- **Trigger**: 不正なスキーマを持つroundDetailをそのままマージしてしまう

### 詳細
1. **正式スキーマ**: `RoundDetail.roundNumber`（TypeScript型定義）
2. **問題**: slash command（document-review-reply.md）経由でspec.jsonを更新時、Claudeがスキーマを推測して以下の不正データを生成：
   - `{ round: 1 }` （`roundNumber`ではなく`round`）
   - `{ reviewedAt: "..." }` （`roundNumber`フィールドなし）
3. **結果**: `mergeRoundDetails`が不正データをそのままマージ → UIで`Reply-undefined`表示

## Impact Assessment
- **Severity**: Medium
- **Scope**: document-reviewワークフローを使用したすべてのspec
- **Risk**: 既存の不正データが残り続ける

## Related Code

### 問題箇所（正規化なしでマージ）
```typescript
// documentReviewService.ts:644-647
for (const detail of existing) {
  merged.set(detail.roundNumber, detail);  // roundNumberがundefinedの場合、NaNキーになる
}
```

### 不正データ例
```json
// experimental-tools-installer/spec.json
{ "reviewedAt": "2025-12-20", "replyGenerated": true }  // roundNumberなし

// ssh-remote-project/spec.json
{ "round": 1, "reviewDate": "2025-12-13" }  // roundではなくroundNumberが正しい
```

## Proposed Solution

### Option 1: mergeRoundDetailsで正規化（推奨）
- **Description**: マージ前に`round` → `roundNumber`変換、不正データはスキップ
- **Pros**: 既存データが自動修正される、UIフォールバック不要
- **Cons**: なし

### Option 2: slash commandにスキーマ明記（再発防止）
- **Description**: `document-review-reply.md`にRoundDetailスキーマを明示
- **Pros**: 将来の不正データ生成を防止
- **Cons**: 既存データは修正されない

### Recommended Approach
**Option 1 + Option 2の両方を実施**

1. `documentReviewService.ts`に`normalizeRoundDetail`メソッド追加
2. `document-review-reply.md`にスキーマ定義を追記

## Dependencies
- `electron-sdd-manager/src/main/services/documentReviewService.ts`
- `.claude/commands/kiro/document-review-reply.md`

## Testing Strategy
1. 既存の不正spec.jsonでアプリを起動
2. specを選択してタブが正しく表示されることを確認
3. `Reply-undefined`が表示されないことを確認
