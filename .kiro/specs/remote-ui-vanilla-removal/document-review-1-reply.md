# Response to Document Review #1

**Feature**: remote-ui-vanilla-removal
**Review Date**: 2026-01-17
**Reply Date**: 2026-01-17

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 0      | 0            | 0             | 0                |
| Warning  | 2      | 2            | 0             | 0                |
| Info     | 3      | 1            | 2             | 0                |

---

## Response to Warnings

### W-001: 開発時のbuild:remote事前実行の周知

**Issue**: DD-001で「開発時にbuild:remoteを事前実行する必要がある」と記載されているが、開発者への周知方法が未定義。

**Judgment**: **Fix Required** ✅

**Evidence**:
- Design文書 DD-001 Consequences: 「開発時にbuild:remoteを事前実行する必要がある」と記載
- tasks.md Task 2.1: Implementation Notesに「Risks: 開発時にbuild:remoteを事前実行する必要がある（HMRなし）」が暗示されているが、具体的な対応タスクなし
- 現状のremoteAccessServer.tsでは`dist/remote-ui/`が存在しない場合、StaticFileServerがエラーを出すが、開発者への明確なガイダンスがない

**Action Items**:
- tasks.md Task 2.1に開発時の注意事項を明示的に追加
- README.md更新のタスクを追加するか、Task 2.1の完了条件に含める

---

### W-002: 既存data-testidとの併存戦略の具体化

**Issue**: Design文書で「既存のdata-testidと新しいremote-プレフィックス付きを併存させることも可能」と記載されているが、tasks.mdでは「リネームまたは併存」と表現が揺れている。

**Judgment**: **Fix Required** ✅

**Evidence**:
- Design文書 DD-002: 「既存のdata-testidとの併存も可能」と記載
- tasks.md Task 3.1-3.5: 「リネームまたは併存」と記載され、方針が確定していない
- E2Eテスト（remote-webserver.e2e.spec.ts）の確認結果:
  - テストは`remote-`プレフィックス付きのdata-testid（例: `remote-status-dot`, `remote-spec-list`）を期待
  - 既存のReact版data-testid（例: `specs-list`, `bug-detail-view`）とは異なる
- 既存テストへの影響を最小化するため、「併存」が適切

**Action Items**:
- tasks.md Task 3.1-3.5の「リネームまたは併存」を「併存（既存data-testidを維持しつつremote-プレフィックス付きを追加）」に統一

---

## Response to Info (Low Priority)

| # | Issue | Judgment | Reason |
| ---- | --------- | ------------- | -------------- |
| S-001 | Unit Test更新の明示 | Fix Required ✅ | Design文書で`remoteAccessServer.test.ts`更新が記載されているが、tasks.mdにタスクがない |
| S-002 | electron-builder設定の検証 | No Fix Needed ❌ | Task 6.1「Electronアプリをビルドし、Remote UIが正常に動作することを確認」が実質的にカバー |
| S-003 | CI/CDパイプラインへの影響確認 | No Fix Needed ❌ | 実装後の運用確認であり、仕様書に含める必要なし |

### S-001: Unit Test更新の明示

**Issue**: Testing Strategyセクションで`remoteAccessServer.test.ts`の更新が記載されているが、tasks.mdには含まれていない。

**Judgment**: **Fix Required** ✅

**Evidence**:
- Design文書 Testing Strategy: 「`remoteAccessServer.test.ts`: UIディレクトリパス解決のテスト更新」と明記
- tasks.md: Unit Test更新に関するタスクが存在しない
- 現状の`remoteAccessServer.test.ts`（line 29-31）はパス解決ロジックに依存しているため、変更後のテスト更新が必要

**Action Items**:
- Task 2.1の完了条件にUnit Test更新を追加

---

## Files to Modify

| File | Changes |
| ---- | ------- |
| tasks.md | Task 2.1: Unit Test更新と開発時注意事項を完了条件に追加 |
| tasks.md | Task 3.1-3.5: 「リネームまたは併存」を「併存」に統一 |

---

## Conclusion

3件の修正が必要（W-001, W-002, S-001）:
1. **Task 2.1の完了条件拡充**: Unit Test更新と開発時注意事項（README記載または警告メッセージ）を追加
2. **Task 3.x のdata-testid方針統一**: 「併存」戦略で統一し、既存data-testidを維持しつつremote-プレフィックス付きを追加

これらの修正は軽微であり、仕様の根本的な変更ではない。修正適用後、再レビューを実施して確認する。

---

## Applied Fixes

**Applied Date**: 2026-01-17
**Applied By**: --autofix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| tasks.md | Task 2.1にUnit Test更新と開発時注意事項を追加、Task 3.x のdata-testid方針を「併存」に統一 |

### Details

#### tasks.md

**Issue(s) Addressed**: W-001, W-002, S-001

**Changes**:
- Task 2.1に`remoteAccessServer.test.ts`のUIディレクトリパス解決テスト更新を追加
- Task 2.1に開発時の注意事項（README.md追記）を追加
- Task 3.2, 3.4, 3.5の「リネームまたは併存」を「維持しつつ併存」に統一

**Diff Summary**:
```diff
## Task 2.1
- logger.debugでUIディレクトリパスを出力し、デバッグを容易にする
+ logger.debugでUIディレクトリパスを出力し、デバッグを容易にする
+ `remoteAccessServer.test.ts`のUIディレクトリパス解決テストを更新する
+ 開発時の注意事項をREADME.mdに追記（`npm run build:remote`の事前実行が必要）

## Task 3.2
- `remote-spec-list`: Spec一覧コンテナ（既存`specs-list`をリネームまたは併存）
+ `remote-spec-list`: Spec一覧コンテナ（既存`specs-list`を維持しつつ併存）
- `remote-spec-detail`: Spec詳細ビュー（既存`spec-detail-view`をリネームまたは併存）
+ `remote-spec-detail`: Spec詳細ビュー（既存`spec-detail-view`を維持しつつ併存）

## Task 3.4
- `remote-bug-list`: Bug一覧コンテナ（既存`bugs-list`をリネームまたは併存）
+ `remote-bug-list`: Bug一覧コンテナ（既存`bugs-list`を維持しつつ併存）
- `remote-bug-detail`: Bug詳細ビュー（既存`bug-detail-view`をリネームまたは併存）
+ `remote-bug-detail`: Bug詳細ビュー（既存`bug-detail-view`を維持しつつ併存）
- `remote-bug-phase-tag`: フェーズタグ（既存`bug-phase-{action}`をリネームまたは併存）
+ `remote-bug-phase-tag`: フェーズタグ（既存`bug-phase-{action}`を維持しつつ併存）
- `remote-bug-action`: アクションボタン（既存`bug-phase-{action}-button`をリネームまたは併存）
+ `remote-bug-action`: アクションボタン（既存`bug-phase-{action}-button`を維持しつつ併存）

## Task 3.5
- `remote-log-viewer`: ログビューア（既存`agent-log-panel`をリネームまたは併存）
+ `remote-log-viewer`: ログビューア（既存`agent-log-panel`を維持しつつ併存）
- `remote-reconnect-overlay`: 再接続オーバーレイ（既存`reconnect-overlay`をリネームまたは併存）
+ `remote-reconnect-overlay`: 再接続オーバーレイ（既存`reconnect-overlay`を維持しつつ併存）
```

---

_Fixes applied by document-review-reply command._
