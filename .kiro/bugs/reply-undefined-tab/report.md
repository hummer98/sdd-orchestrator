# Bug Report: reply-undefined-tab

## Overview
メインパネルに存在しないファイル「Reply-undefined」というタブが表示される問題。slash command（document-review-reply.md）でspec.jsonを更新する際、RoundDetailスキーマの明示的な定義がないため、ClaudeがroundNumberを含まない不正なデータを生成してしまう。

## Status
**Resolved** ✅

## Environment
- Date Reported: 2025-12-20T14:30:00+09:00
- Affected Component: ArtifactEditor.tsx, document-review-reply.md
- Severity: Medium

## Steps to Reproduce
1. `/kiro:document-review-reply` を実行
2. spec.jsonのroundDetailsが不正なスキーマで更新される
3. Electronアプリでspecを開く
4. 「Reply-undefined」タブが表示される

## Expected Behavior
正しいroundNumber（例: 1, 2）を持つタブが表示される（例: Reply-1）

## Actual Behavior
roundNumberがundefinedのため「Reply-undefined」と表示される

## Error Messages / Logs
```
問題のあるspec.jsonデータ:
- experimental-tools-installer: { "reviewedAt": "2025-12-20", ... } (roundNumberなし)
- commandset-unified-installer: { "round": 1, ... } (roundではなくroundNumberが正しい)
- ssh-remote-project: { "round": 1, ... }
```

## Related Files
- electron-sdd-manager/src/renderer/components/ArtifactEditor.tsx:68
- .claude/commands/kiro/document-review-reply.md
- electron-sdd-manager/src/renderer/types/documentReview.ts

## Root Cause Analysis
1. `init.json`テンプレートにdocumentReviewフィールドがない
2. `document-review-reply.md`にRoundDetailの完全なスキーマ定義がない
3. Claudeがspec.json更新時にスキーマを推測 → 一貫性のないデータ

## Proposed Fixes
- 案1: コード側フォールバック（即効性）
- 案2: slash commandにスキーマ明記（根本対策）
- 案3: 既存データのマイグレーション

## Additional Context
documentReviewService.tsは正しくroundNumberを設定するが、slash command経由の更新では参照するスキーマがないため問題が発生。
