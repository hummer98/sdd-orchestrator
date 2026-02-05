# Response to Document Review #1

**Feature**: merge-script-consolidation
**Review Date**: 2026-02-05
**Reply Date**: 2026-02-05

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 0      | 0            | 0             | 0                |
| Warning  | 3      | 1            | 2             | 0                |
| Info     | 2      | 0            | 2             | 0                |

---

## Response to Warnings

### W-001: テストファイル更新の欠落

**Issue**: `ccSddWorkflowInstaller.test.ts` で現在 `update-spec-for-deploy.sh` と `update-bug-for-deploy.sh` を参照しており、タスクリストにこのテストファイルの更新が明示的に含まれていない。

**Judgment**: **Fix Required** ✅

**Evidence**:
テストファイル `ccSddWorkflowInstaller.test.ts` の行 720-846 を確認した結果、以下の参照が存在する:
- 行 721: `update-spec-for-deploy.sh` のテンプレート作成
- 行 726: `update-bug-for-deploy.sh` のテンプレート作成
- 行 744-746: インストール結果の検証で両スクリプトを期待
- 行 750-753: ファイル存在チェック
- 行 835-836: `HELPER_SCRIPTS` 定数のテスト

本機能では `update-*-for-deploy.sh` を削除し、`merge-spec.sh` と `merge-bug.sh` に置き換えるため、テストも更新が必要。

**Action Items**:
- Task 6.1 の記述を拡張し、`ccSddWorkflowInstaller.test.ts` の更新を明示的に含める

---

### W-002: 既存環境への影響

**Issue**: 既存のプロジェクトでは古いスクリプトが残り続ける可能性があり、ドキュメントまたはリリースノートに手動削除手順を記載することを推奨。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
この指摘は妥当だが、リリースノートや移行ガイドの作成は本仕様のスコープ外である（Out of Scope に「後方互換性の維持（削除するスクリプトへの参照は全て更新する）」と明記）。

本機能の目的は:
1. 内部のタイミング問題を解決する
2. コードベースから不要なスクリプトを削除する

既存環境への移行ドキュメントは、リリース時に CHANGELOG や別途の移行ガイドで対応するべき項目であり、仕様書への追記は不要。

---

### W-003: dev ブランチ動作の整合性

**Issue**: `merge-spec.sh` では「exit 2 で終了」と定義しているが、現在の `spec-merge.md` では非標準ブランチの場合にユーザー確認を求める設計になっている。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
レビュー自身も指摘しているように、これは一貫した設計である:

1. **スクリプト層 (`merge-spec.sh`)**: 前提条件違反で厳格に失敗（exit 2）
2. **コマンドプロンプト層 (`spec-merge.md`)**: ユーザーインタラクションを担当し、非標準ブランチの場合は確認を求める

この分離は設計原則に沿っている:
- **関心の分離**: スクリプトは純粋なツールとして動作し、ユーザーインタラクションは AI エージェント層が担う
- **暗黙的な状態変更の回避**: スクリプトが自動で checkout しないことで、予期せぬ副作用を防止

現在の `spec-merge.md` は Step 1.1 でブランチ確認を行い、非標準ブランチの場合はユーザーに確認を求めてから `merge-spec.sh` を呼び出す設計になっている。スクリプトの exit 2 は「AI エージェントがブランチ確認をスキップした場合」のフェイルセーフとして機能する。

---

## Response to Info (Low Priority)

| #     | Issue                          | Judgment      | Reason                                                         |
| ----- | ------------------------------ | ------------- | -------------------------------------------------------------- |
| I-001 | E2E テスト不要の判断           | No Fix Needed | Design 358-364 行で理由が明記されており、妥当な判断            |
| I-002 | 既存環境への移行は自動ではない | No Fix Needed | これは仕様の制約事項であり、問題ではない。Out of Scope に明記済 |

---

## Files to Modify

| File     | Changes                                               |
| -------- | ----------------------------------------------------- |
| tasks.md | Task 6.1 の記述を拡張してテストファイル更新を明示する |

---

## Conclusion

3 件の Warning のうち 1 件（W-001: テストファイル更新欠落）のみ修正が必要。残り 2 件は現在の設計が妥当であり、変更不要と判断。

W-001 の修正として、tasks.md の Task 6.1 にテストファイル更新の記述を追加する。

---

## Applied Fixes

**Applied Date**: 2026-02-05
**Applied By**: --autofix

### Summary

| File     | Changes Applied                                      |
| -------- | ---------------------------------------------------- |
| tasks.md | Task 6.1 にテストファイル更新の記述を追加 |

### Details

#### tasks.md

**Issue(s) Addressed**: W-001

**Changes**:
- Task 6.1 のタイトルを「HELPER_SCRIPTS リストを更新する」から「HELPER_SCRIPTS リストとテストを更新する」に変更
- テストファイル更新の具体的な手順を追加
- 検証項目にテストファイルの grep を追加

**Diff Summary**:
```diff
-- [ ] 6.1 HELPER_SCRIPTS リストを更新する
+- [ ] 6.1 HELPER_SCRIPTS リストとテストを更新する
   - `update-spec-for-deploy.sh` と `update-bug-for-deploy.sh` をリストから削除
   - `merge-spec.sh` と `merge-bug.sh` をリストに追加
+  - `ccSddWorkflowInstaller.test.ts` を更新: テストで使用するスクリプト名を `merge-spec.sh` と `merge-bug.sh` に変更
   - 依存: Task 5 完了後に実施（テンプレートが存在する必要がある）
   - _Requirements: 1.1, 2.1, 3.1, 3.2_
   - _Verify: Grep "HELPER_SCRIPTS" in ccSddWorkflowInstaller.ts_
+  - _Verify: Grep "merge-spec.sh|merge-bug.sh" in ccSddWorkflowInstaller.test.ts_
```

---

_Fixes applied by document-review-reply command._
