# Bug Analysis: document-review-redundant-round-display

## Summary
`DocumentReviewPanel` の「現在: Round N」静的表示が冗長。実行状態はボタンに統合し、UXを簡素化すべき。

## Root Cause

### Technical Details
- **Location**: `electron-sdd-manager/src/shared/components/review/DocumentReviewPanel.tsx:218-229`
- **Component**: `DocumentReviewPanel` (共有コンポーネント)
- **Trigger**: `reviewState.currentRound` が設定されている場合に常時表示

### 問題点

**現状のUI構成**:
```
┌─────────────────────────────────────────────────────────┐
│ [進捗] 📄 ドキュメントレビュー           [自動実行フラグ] │
│                                                         │
│ ラウンド: 2   現在: Round 3  ← これが冗長               │
│                                                         │
│ [ レビュー開始 ] ← ローディング状態を表示しない          │
└─────────────────────────────────────────────────────────┘
```

**問題の詳細**:
1. **Stats行（218-229行目）**: `現在: Round {reviewState.currentRound}` を静的テキストとして表示
2. **ボタン（267-284行目）**: 実行中は disabled になるだけで、どのラウンドが実行中か分からない
3. **進捗インジケーター（76-100行目）**: 実行中はスピナーを表示するが、ラウンド情報はない

これにより:
- 「現在のラウンド」情報が複数箇所に散在する可能性
- 実行中に「どのラウンドが実行されているか」が不明確
- UIが冗長で情報が重複

## Impact Assessment
- **Severity**: Low（機能には影響なし、UXの問題）
- **Scope**: ドキュメントレビューパネルのUI表示のみ
- **Risk**: なし（表示の変更のみ）

## Related Code

**Stats行 (冗長な表示)**:
```tsx
// DocumentReviewPanel.tsx:218-229
<div className="flex items-center gap-4 mb-3 text-sm text-gray-600 dark:text-gray-400">
  <span>
    ラウンド:{' '}
    <strong className="text-gray-800 dark:text-gray-200">{rounds}</strong>
  </span>
  {reviewState?.currentRound && (
    <span>
      現在:{' '}
      <strong className="text-blue-500">Round {reviewState.currentRound}</strong>
    </span>
  )}
</div>
```

**ボタン（ローディング状態なし）**:
```tsx
// DocumentReviewPanel.tsx:267-281
<button
  onClick={onStartReview}
  disabled={!canStartReview}
  data-testid="start-review-button"
  className={...}
>
  <Play className="w-4 h-4" />  {/* 常にPlayアイコン */}
  レビュー開始  {/* 固定テキスト */}
</button>
```

## Proposed Solution

### 推奨アプローチ: 実行状態をボタンに統合

**変更概要**:
1. **Stats行から「現在: Round N」を削除**: `ラウンド: X` のみ表示
2. **ボタンにローディング状態を追加**: 実行中は「Nラウンド目 review実行中...」を表示

**変更後のUI**:
```
┌─────────────────────────────────────────────────────────┐
│ [進捗] 📄 ドキュメントレビュー           [自動実行フラグ] │
│                                                         │
│ ラウンド: 2                                              │
│                                                         │
│ [ 🔄 3ラウンド目 review実行中... ]  (disabled)          │
└─────────────────────────────────────────────────────────┘
```

**実装方針**:
```tsx
// 実行中のボタン表示
{isExecuting ? (
  <>
    <Loader2 className="w-4 h-4 animate-spin" />
    {reviewState?.currentRound ?? rounds + 1}ラウンド目 review実行中...
  </>
) : (
  <>
    <Play className="w-4 h-4" />
    レビュー開始
  </>
)}
```

### Pros
- **SSOT**: ラウンド情報の表示が一箇所に集約
- **明確なフィードバック**: 実行中のアクションが一目で分かる
- **シンプルなUI**: 冗長な情報を削除

### Cons
- なし（アーキテクチャ的に正しい変更）

## Dependencies
- `electron-sdd-manager/src/shared/components/review/DocumentReviewPanel.tsx` (共有コンポーネント)
- `electron-sdd-manager/src/renderer/components/DocumentReviewPanel.tsx` (renderer版 - 同様の変更が必要)
- 関連テストファイルの更新

## Testing Strategy
1. **Unit Tests**: `DocumentReviewPanel.test.tsx` を更新
   - 「現在: Round N」の表示テストを削除
   - ローディング中のボタンテキストを検証
2. **Visual Verification**: Electronアプリで実際の表示を確認
