# Bug Fix: reply-undefined-tab

## Summary
`mergeRoundDetails`に正規化ロジックを追加し、不正なスキーマ（`round`や`roundNumber`なし）のデータを正しい形式に変換するよう修正。また、slash commandにRoundDetailスキーマを明記して再発を防止。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/main/services/documentReviewService.ts` | `normalizeRoundDetail`メソッド追加、`mergeRoundDetails`で使用 |
| `.claude/commands/kiro/document-review-reply.md` | RoundDetailスキーマを明示的に記述 |

### Code Changes

#### documentReviewService.ts

```diff
+  /**
+   * Normalize a round detail object to ensure it has the correct schema
+   * Handles legacy data with 'round' instead of 'roundNumber' and missing fields
+   */
+  private normalizeRoundDetail(detail: Record<string, unknown>, index: number): RoundDetail | null {
+    // Extract roundNumber from various possible sources
+    const roundNumber = (detail.roundNumber as number) ?? (detail.round as number) ?? (index + 1);
+
+    // Skip entries without a valid roundNumber
+    if (typeof roundNumber !== 'number' || isNaN(roundNumber) || roundNumber < 1) {
+      logger.warn('[DocumentReviewService] Skipping invalid round detail', { detail });
+      return null;
+    }
+
+    // Build normalized RoundDetail
+    const normalized: RoundDetail = {
+      roundNumber,
+      status: (detail.status as RoundStatus) ?? 'incomplete',
+    };
+
+    // Preserve optional fields if they exist
+    if (detail.reviewCompletedAt) {
+      normalized.reviewCompletedAt = detail.reviewCompletedAt as string;
+    }
+    if (detail.replyCompletedAt) {
+      normalized.replyCompletedAt = detail.replyCompletedAt as string;
+    }
+    if (detail.fixApplied !== undefined) {
+      normalized.fixApplied = detail.fixApplied as boolean;
+    }
+
+    return normalized;
+  }

   private mergeRoundDetails(existing: RoundDetail[], detected: RoundDetail[]): RoundDetail[] {
     const merged = new Map<number, RoundDetail>();

-    // Add existing details first
-    for (const detail of existing) {
-      merged.set(detail.roundNumber, detail);
+    // Add existing details first (with normalization)
+    for (let i = 0; i < existing.length; i++) {
+      const normalized = this.normalizeRoundDetail(existing[i] as unknown as Record<string, unknown>, i);
+      if (normalized) {
+        merged.set(normalized.roundNumber, normalized);
+      }
     }
```

#### document-review-reply.md

```diff
 4. Update spec.json to mark this round's fix as applied:
-   - Set `roundDetails[n-1].fixApplied = true`
+   ```json
+   {
+     "roundNumber": n,           // Required: round number (1-indexed)
+     "status": "reply_complete", // Required: "incomplete" | "review_complete" | "reply_complete"
+     "fixApplied": true          // Set to true when fixes are applied
+   }
+   ```
+   **IMPORTANT**: Always use `roundNumber` (not `round`). This is the official schema.
```

## Implementation Notes
- `normalizeRoundDetail`は`round` → `roundNumber`変換を行う
- `roundNumber`が無効な場合（undefined, NaN, < 1）はエントリをスキップ
- 既存の不正データは`syncReviewState`実行時に自動的に正規化される
- slash commandにスキーマを明記することで、Claudeが推測で不正なデータを生成することを防止

## Breaking Changes
- [x] No breaking changes

## Rollback Plan
1. `documentReviewService.ts`の変更をrevert
2. `document-review-reply.md`の変更をrevert

## Test Results
```
Test Files  1 passed (1)
     Tests  36 passed (36)
```

## Related Commits
- *コミット後に追記*
