# Response to Document Review #1

**Feature**: idle-time-project-level-reporting
**Review Date**: 2026-02-05
**Reply Date**: 2026-02-05

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 0      | 0            | 0             | 0                |
| Warning  | 1      | 1            | 0             | 0                |
| Info     | 2      | 0            | 2             | 0                |

---

## Response to Warnings

### W-001: Task依存関係の明確化

**Issue**: Task 2.1がTask 1.1に依存することが記載されているが、Task 2.2にもTask 1.1への依存がある（useWindowFocusTrackerを使用）。依存関係を明示的に記載すると実装順序が明確になる。

**Judgment**: **Fix Required** ✅

**Evidence**:
tasks.mdを確認したところ:
- Task 2.1には「依存: 1.1 で作成した useWindowFocusTracker を使用」と明記されている（行26）
- Task 2.2には依存関係の記載がない（行31-38）

design.mdのシーケンス図（行98-99）では、useIdleTimeSyncがuseWindowFocusTrackerのgetLastFocusActivityTime()を呼び出す設計となっており、Task 2.2でもuseWindowFocusTrackerを使用することが確認できる。

**Action Items**:
- Task 2.2に「依存: 1.1 で作成した useWindowFocusTracker を使用」を追加する

---

## Response to Info (Low Priority)

| #    | Issue     | Judgment      | Reason         |
| ---- | --------- | ------------- | -------------- |
| S-001 | テストカバレッジの詳細化 | No Fix Needed | Task 1.2とTask 3.1では具体的なテストケースが列挙されており、実装時の判断基準として十分。テストケース数の目安は実装時に調整可能 |
| S-002 | 境界条件のテスト | No Fix Needed | design.mdの状態遷移図（行112-133）でフォーカス復帰時の動作が明記されており、テスト戦略のRobustness Strategy（行311-313）でVitestのfake timersを使用する方針が示されている |

---

## Files to Modify

| File   | Changes   |
| ------ | --------- |
| tasks.md | Task 2.2に依存関係を追加 |

---

## Conclusion

Warning 1件（W-001: Task依存関係の明確化）のみ修正が必要です。Info 2件はSuggestionであり、現在の仕様で十分な情報が提供されているため対応不要と判断しました。

修正適用後、仕様は実装可能な状態となります。

---

## Applied Fixes

**Applied Date**: 2026-02-05
**Applied By**: --autofix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| tasks.md | Task 2.2に依存関係の記載を追加 |

### Details

#### tasks.md

**Issue(s) Addressed**: W-001

**Changes**:
- Task 2.2の説明に「依存: 1.1 で作成した useWindowFocusTracker を使用」を追加

**Diff Summary**:
```diff
 - [ ] 2.2 Spec追跡とフォーカス追跡の優先度制御を実装する
   - HumanActivityTracker.isActive=true かつ getLastActivityTime() が非nullの場合はSpec追跡の時刻を使用
   - 上記以外の場合は useWindowFocusTracker の時刻を使用
   - Spec選択/解除時の自動切り替えを確認
   - 既存のIPCチャネル `SCHEDULE_TASK_REPORT_IDLE_TIME` を継続使用
+  - 依存: 1.1 で作成した useWindowFocusTracker を使用
   - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3_
```

---

_Fixes applied by document-review-reply command._
