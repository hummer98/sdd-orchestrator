# Response to Document Review #1

**Feature**: agent-launch-optimistic-ui
**Review Date**: 2026-01-17
**Reply Date**: 2026-01-17

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 0      | 0            | 0             | 0                |
| Warning  | 2      | 2            | 0             | 0                |
| Info     | 3      | 2            | 1             | 0                |

---

## Response to Warnings

### W-01: 競合状態の考慮不足

**Issue**: 複数の実行ボタンを短時間で連続クリックした場合の挙動が未定義。現在の設計（ハンドラごとにuseLaunchingStateインスタンスを分離）では問題ないと思われるが、明示的な言及がない。

**Judgment**: **Fix Required** ✅

**Evidence**:
design.md の DD-005 で「親コンポーネントでのハンドララップ方式」を採用し、フェーズ/機能ごとにuseLaunchingStateインスタンスを分離する設計方針は示されている。しかし、複数ボタン連続クリック時の具体的な挙動については明示されていない。実装者が迷わないよう、明確な記載を追加すべき。

**Action Items**:
- design.md の Implementation Notes セクションに、複数ボタン独立性についての説明を追記

---

### W-02: タイムアウト中のIPC完了

**Issue**: タイムアウトタイマー発火後にIPCが完了した場合の挙動（notify.errorが表示された後の状態）について明確化を推奨。

**Judgment**: **Fix Required** ✅

**Evidence**:
現在の設計ではタイムアウト発生時にlaunching状態をfalseに戻しエラー通知を表示するが、その後IPCが完了した場合の挙動は未記載。設計上はタイムアウト後のIPC完了は無視される（launching状態は既にfalse）が、fileWatcher経由でAgent状態が更新されるため実行自体は継続される。このエッジケースを明確化すべき。

**Action Items**:
- design.md の Error Handling セクションに、タイムアウト後IPC完了時の挙動を追記

---

## Response to Info (Low Priority)

| #    | Issue                          | Judgment      | Reason                                            |
| ---- | ------------------------------ | ------------- | ------------------------------------------------- |
| I-01 | フックのエクスポートパターン   | Fix Required  | `src/shared/hooks/index.ts` でバレルエクスポート済みパターンが存在するため、明記すべき |
| I-02 | notify依存の詳細               | Fix Required  | 既存の `import { notify } from '../stores'` パターンがあるため追記 |
| I-03 | 複数ボタンの状態管理           | No Fix Needed | Task 2.1 で既に言及あり。W-01対応でdesign.mdにも追記されるため |

---

## Files to Modify

| File       | Changes                                                                                 |
| ---------- | --------------------------------------------------------------------------------------- |
| design.md  | Implementation Notes: 複数ボタン独立性説明追加、タイムアウト後IPC完了の挙動追記、notifyインポートパス追記 |
| tasks.md   | Task 1.1: バレルエクスポート追加の指示を明記                                            |

---

## Conclusion

2件のWarningと2件のInfo項目は、いずれも実装時の曖昧さを排除するための明確化に関するものです。設計の根本的な問題ではなく、ドキュメントの補足として対応します。

`--autofix` モードのため、指摘事項に基づいてdesign.mdとtasks.mdを修正しました。

---

## Applied Fixes

**Applied Date**: 2026-01-17
**Applied By**: --autofix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| design.md | 複数ボタン独立性説明追加、タイムアウト後IPC完了エッジケース追記、notifyインポートパス・バレルエクスポート指示追記 |
| tasks.md | Task 1.1にバレルエクスポート追加指示を明記 |

### Details

#### design.md

**Issue(s) Addressed**: W-01, W-02, I-01, I-02

**Changes**:
- useLaunchingState の Implementation Notes に `Import` と `Barrel Export` の指示を追加
- 「複数ボタンの独立性」セクションを追加し、連続クリック時の挙動を明確化
- Error Handling セクションに「Timeout後のIPC完了」エッジケースを追加

**Diff Summary**:
```diff
 **Implementation Notes**
 - Integration: 既存ハンドラ（handleExecutePhase等）をwrapExecutionでラップ
 - Validation: タイムアウト値は正の整数であることを想定（バリデーションは省略）
 - Risks: Spec切り替え時にローカルステートがリセットされるが、戻った時はagentStore（`isXxxExecuting`）が正しい状態を反映するため問題なし
+- Import: `import { notify } from '../stores'`（Electron renderer）または相当するパス（Remote UI）からインポート
+- Barrel Export: `src/shared/hooks/index.ts` に `export { useLaunchingState } from './useLaunchingState'` を追加すること
+
+**複数ボタンの独立性**
+複数の実行ボタンを短時間で連続クリックした場合、各ハンドラは独立したuseLaunchingStateインスタンスを使用するため競合しない。
```

```diff
 **Timeout Error (2.2)**:
 - Trigger: 10秒以内にIPC呼び出しが完了しない
 - Response: launching状態をfalseに戻し、notify.errorでタイムアウト通知
 - Recovery: ユーザーは再度ボタンをクリック可能
+
+**Timeout後のIPC完了 (2.2 Edge Case)**:
+- Trigger: タイムアウト発火後にIPCが正常完了する
+- Response: IPCの完了処理はそのまま実行される（launching状態は既にfalseのため変更なし）...
```

#### tasks.md

**Issue(s) Addressed**: I-01

**Changes**:
- Task 1.1 にバレルエクスポート追加の指示を追記

**Diff Summary**:
```diff
 - [ ] 1.1 (P) フック本体の実装
   - 配置場所: `src/shared/hooks/useLaunchingState.ts`
+  - `src/shared/hooks/index.ts` にバレルエクスポートを追加: `export { useLaunchingState } from './useLaunchingState'`
```

---

_Fixes applied by document-review-reply command._
