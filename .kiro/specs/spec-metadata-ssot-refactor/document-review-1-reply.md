# Response to Document Review #1

**Feature**: spec-metadata-ssot-refactor
**Review Date**: 2026-01-13
**Reply Date**: 2026-01-13

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 0      | 0            | 0             | 0                |
| Warning  | 3      | 3            | 0             | 0                |
| Info     | 2      | 0            | 2             | 0                |

---

## Response to Critical Issues

（Criticalな問題はありません）

---

## Response to Warnings

### W1: WARNING-001 - specJsonMapにspecがない場合のUI表示が未定義

**Issue**: Design文書では「specJsonMapに該当specがない場合: フィルタリング/ソート時にスキップ」と記載されているが、この場合のUI表示（リストに表示するか、エラー表示するか）が明示されていない。

**Judgment**: **Fix Required** ✅

**Evidence**:
Design文書のError Strategyセクション（407-410行目）を確認:
```markdown
### Error Strategy

- ファイル読み込みエラー: 既存のResult型パターンを踏襲
- specJsonMapに該当specがない場合: フィルタリング/ソート時にスキップ
```

「スキップ」の挙動は定義されているが、ユーザーから見たUI上の表示（リストに表示されるか、グレーアウトか、非表示か）が未定義である。

**Action Items**:

- design.mdのError Handling セクションに以下を追記:
  - specJsonの読み込みに失敗したSpecの表示方針
  - 具体的には「リストには表示するが、フェーズバッジは"不明"または"読込失敗"と表示し、フィルタリング・ソートの対象外とする」

---

### W2: WARNING-002 - Task 8.1の曖昧な表現

**Issue**: Task 8.1は「webSocketHandler の specs 配信が phase を含むことを確認する」という確認タスクだが、確認の結果、変更が必要な場合の対応が明記されていない。

**Judgment**: **Fix Required** ✅

**Evidence**:
現行コード（handlers.ts:388-407）を確認:
```typescript
const getSpecsForRemote = async (): Promise<SpecInfo[] | null> => {
  const result = await fileService.readSpecs(projectPath);
  // ...
  return result.value.map(spec => ({
    id: spec.name,
    name: spec.name,
    feature_name: spec.name,
    phase: spec.phase,  // ← 現在は SpecMetadata.phase を参照
    path: spec.path,
    updatedAt: spec.updatedAt,
    approvals: spec.approvals,
  }));
};
```

SpecMetadataからphaseフィールドを削除した後は、この実装を変更してSpecJsonからphaseを取得する必要がある。タスク記述に「確認し、必要に応じて修正する」を明記すべき。

**Action Items**:

- tasks.md Task 8.1の記述を修正:
  - 「確認する」→「確認し、必要に応じてStateProvider.getSpecsの実装を修正する」

---

### W3: WARNING-003 - Task 8.3の検討タスク

**Issue**: Task 8.3は「specJsonMap相当の仕組みが必要か検討」という調査タスクであり、検討結果に応じた実装タスクが不足している可能性がある。

**Judgment**: **Fix Required** ✅

**Evidence**:
tasks.md Task 8.3を確認:
```markdown
- [ ] 8.3 Remote UI の shared/stores/specStore を修正する
  - specJsonMap相当の仕組みが必要か検討
  - Remote UIでのフィルタリング/ソートが正しく動作することを確認
```

「検討」の結果によっては追加実装が必要となるが、その場合の対応が不明確。

**Action Items**:

- tasks.md Task 8.3に方針決定のガイダンスを追加:
  - 「検討の結果、必要であればサブタスクを追加する」旨を明記
  - または、設計判断として「Remote UIはWebSocket経由でphase付きSpecInfoを受信するため、specJsonMap相当は不要」と結論を先に出す

---

## Response to Info (Low Priority)

| #      | Issue                               | Judgment      | Reason                                                                                                |
| ------ | ----------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------- |
| INFO-001 | SpecMetadataWithPhase型の明示が不足 | No Fix Needed | Task 3.1「specJsonMap更新時の型安全性を確保」が実質的にこの型の実装をカバーしている。実装者は型定義を見れば理解可能 |
| INFO-002 | パフォーマンスOpen Questionの結論  | No Fix Needed | Out of Scopeセクションで「パフォーマンス最適化（現時点で問題なし）」と明記済み。問題発生時は別Specで対応する方針も記載されている |

---

## Files to Modify

| File       | Changes                                                              |
| ---------- | -------------------------------------------------------------------- |
| design.md  | Error Handling セクションにspecJson読み込み失敗時のUI表示方針を追記  |
| tasks.md   | Task 8.1の記述を「確認し、必要に応じて修正する」に変更               |
| tasks.md   | Task 8.3に検討結果に応じた対応方針を追記                             |

---

## Conclusion

3件のWarningについて、すべて「Fix Required」と判断しました。いずれも仕様の曖昧さを解消するための軽微な追記であり、設計の根本的な変更は不要です。

- **WARNING-001**: Error Handling方針の明確化
- **WARNING-002, WARNING-003**: タスク記述の曖昧さ解消

2件のInfoについては「No Fix Needed」と判断しました。既存の記述で十分カバーされています。

**次のステップ**: `--autofix`フラグが指定されているため、上記の修正を適用します。

---

## Applied Fixes

**Applied Date**: 2026-01-13
**Applied By**: --autofix

### Summary

| File      | Changes Applied                                              |
| --------- | ------------------------------------------------------------ |
| design.md | Error Handling セクションにUI表示方針を追記                  |
| tasks.md  | Task 8.1の記述を「確認し、必要に応じて修正する」に変更       |
| tasks.md  | Task 8.3に設計判断と対応方針を追記                           |

### Details

#### design.md

**Issue(s) Addressed**: WARNING-001

**Changes**:
- Error Categories and Responsesセクションに「UI表示方針（specJson読み込み失敗時）」を追加
- specJsonMapにないSpecの表示方針を明確化

**Diff Summary**:
```diff
 **System Errors**:
 - spec.json読み込み失敗 → specJsonMapに追加しない（リスト表示は継続）
 - ディレクトリアクセス失敗 → 空の配列を返す
+
+**UI表示方針（specJson読み込み失敗時）**:
+- specJsonMapにないSpecはリストには表示する
+- フェーズバッジは「不明」と表示（グレー表示）
+- フィルタリング・ソートの対象外とする（フィルタ適用時は非表示）
+- ツールチップで「spec.jsonの読み込みに失敗しました」と表示
```

#### tasks.md (Task 8.1)

**Issue(s) Addressed**: WARNING-002

**Changes**:
- タスクタイトルを「確認する」から「確認し、必要に応じて修正する」に変更
- specJsonからphaseを取得するよう修正する旨を明記

**Diff Summary**:
```diff
-- [ ] 8.1 (P) webSocketHandler の specs 配信が phase を含むことを確認する
+- [ ] 8.1 (P) webSocketHandler の specs 配信が phase を含むことを確認し、必要に応じて修正する
   - SpecInfo型にphaseが含まれていることを確認
   - specs_updatedイベントでphase情報が配信されることを確認
-  - 必要に応じてStateProvider.getSpecsの実装を確認
+  - StateProvider.getSpecs（handlers.ts getSpecsForRemote）の実装を確認
+  - SpecMetadataからphaseが削除されるため、specJsonからphaseを取得するよう修正する
```

#### tasks.md (Task 8.3)

**Issue(s) Addressed**: WARNING-003

**Changes**:
- 設計判断（Remote UIではspecJsonMap不要と想定）を追記
- 検討結果に応じたサブタスク追加の可能性を明記

**Diff Summary**:
```diff
 - [ ] 8.3 Remote UI の shared/stores/specStore を修正する
   - specJsonMap相当の仕組みが必要か検討
+  - 設計判断: Remote UIはWebSocket経由でphase付きSpecInfoを受信するため、specJsonMap相当の仕組みは不要と想定
+  - 検討の結果、追加実装が必要な場合はサブタスクを追加する
   - Remote UIでのフィルタリング/ソートが正しく動作することを確認
```

---

_Fixes applied by document-review-reply command._
