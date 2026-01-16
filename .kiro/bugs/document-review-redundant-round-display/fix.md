# Bug Fix: document-review-redundant-round-display

## Summary
DocumentReviewPanel の冗長な「現在: Round N」表示を削除し、実行状態をボタンに統合した。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/shared/components/review/DocumentReviewPanel.tsx` | Stats行から「現在: Round N」を削除、ボタンにローディング状態を追加 |
| `electron-sdd-manager/src/renderer/components/DocumentReviewPanel.tsx` | Stats行から「現在: Round N」を削除、ボタンにローディング状態を追加 |
| `electron-sdd-manager/src/renderer/components/DocumentReviewPanel.test.tsx` | テストを新しいボタン表示に対応 |

### Code Changes

**Shared版 - Stats行の変更 (`src/shared/components/review/DocumentReviewPanel.tsx:217-223`)**:
```diff
       {/* Stats */}
       <div className="flex items-center gap-4 mb-3 text-sm text-gray-600 dark:text-gray-400">
         <span>
           ラウンド:{' '}
           <strong className="text-gray-800 dark:text-gray-200">{rounds}</strong>
         </span>
-        {reviewState?.currentRound && (
-          <span>
-            現在:{' '}
-            <strong className="text-blue-500">Round {reviewState.currentRound}</strong>
-          </span>
-        )}
       </div>
```

**Shared版 - ボタンのローディング状態追加 (`src/shared/components/review/DocumentReviewPanel.tsx:271-283`)**:
```diff
           >
-            <Play className="w-4 h-4" />
-            レビュー開始
+            {isExecuting ? (
+              <>
+                <Loader2 className="w-4 h-4 animate-spin" />
+                {reviewState?.currentRound ?? rounds + 1}ラウンド目 review実行中...
+              </>
+            ) : (
+              <>
+                <Play className="w-4 h-4" />
+                レビュー開始
+              </>
+            )}
           </button>
```

**Renderer版も同様の変更を適用**

**テストの更新 (`src/renderer/components/DocumentReviewPanel.test.tsx:90-96`)**:
```diff
     it('should disable start review button when isExecuting is true', () => {
       render(<DocumentReviewPanel {...defaultProps} isExecuting={true} />);
-      const startButton = screen.getByRole('button', { name: /レビュー開始/ });
+      // ボタンは実行中は「Nラウンド目 review実行中...」と表示される
+      const startButton = screen.getByTestId('start-review-button');
       expect(startButton).toBeDisabled();
+      expect(startButton).toHaveTextContent(/review実行中/);
     });
```

## Implementation Notes
- **SSOT原則**: ラウンド情報の表示をボタンに一元化し、冗長な静的表示を削除
- **明確なフィードバック**: 実行中のボタンに「Nラウンド目 review実行中...」を表示することで、実行状態が一目で分かる
- **既存パターン踏襲**: `Loader2`アイコンのスピナーは既に進捗インジケーターで使用されており、一貫性を維持

## Breaking Changes
- [x] No breaking changes

## Rollback Plan
1. Stats行に「現在: Round N」表示を復元
2. ボタンのローディング状態を削除
3. テストを元に戻す

## Related Commits
- *修正後にコミット予定*
