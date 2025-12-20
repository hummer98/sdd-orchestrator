# Bug Report: spec-state-dual-management

## Overview
フロントエンド側でSpecファイルと重複した状態管理が行われており、「File as SSOT（Single Source of Truth）」のアーキテクチャに違反している。projectStore、specStore、bugStoreに同じデータが複数箇所でキャッシュされ、ファイル変更時に状態の同期が取れなくなる可能性がある。

**主な問題箇所:**
1. projectStore.ts: specs/bugsの重複キャッシュ（L55, L169-170）
2. specStore.ts: specDetailのメモリ保持（L45-57, L238-248）
3. specStore.ts: UI層でのファイル自動修正（L195-236）
4. bugStore.ts: bugDetailのメモリ保持（L10-17）

## Status
**Pending**

## Environment
- Date Reported: 2025-12-20T11:00:00+09:00
- Affected Component: electron-sdd-manager/src/renderer/stores/
- Severity: High

## Steps to Reproduce
1. プロジェクトを選択してSpecを表示
2. 外部エディタまたはAgent経由でSpecファイルを変更
3. UI上の表示が更新されない、または古い状態が残る

## Expected Behavior
ファイルが変更されたら即座にUIに反映される（File as SSOT）

## Actual Behavior
複数ストアにキャッシュされた状態が不整合になる可能性がある

## Error Messages / Logs
```
特定のエラーメッセージはなし。状態の不整合は静かに発生する。
```

## Related Files
- electron-sdd-manager/src/renderer/stores/projectStore.ts
- electron-sdd-manager/src/renderer/stores/specStore.ts
- electron-sdd-manager/src/renderer/stores/bugStore.ts

## Additional Context
過去に類似の問題（agent-state-dual-management）が修正されており、同じパターンの問題。
