# Response to Document Review #1

**Feature**: steering-verification-integration
**Review Date**: 2026-01-18
**Reply Date**: 2026-01-17

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 0      | 0            | 0             | 0                |
| Warning  | 4      | 2            | 2             | 0                |
| Info     | 3      | 0            | 3             | 0                |

---

## Response to Warnings

### W001: コマンド実行タイムアウト未定義

**Issue**: requirements.md で「コマンド実行のタイムアウト設定（将来の拡張）」がOut of Scopeとされているが、design.md にタイムアウトのデフォルト値や挙動についての言及がない。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
1. requirements.md の Out of Scope セクション（105行目）に明確に記載:
   ```markdown
   - コマンド実行のタイムアウト設定（将来の拡張）
   ```

2. design.md の Non-Goals セクション（22行目）にも同様に記載:
   ```markdown
   - コマンド実行のタイムアウト設定（将来の拡張）
   ```

3. spec-inspection-agent は Bash tool を使用してコマンドを実行する設計（design.md 295行目）。Bash tool にはデフォルトで2分のタイムアウトがあり、無期限にハングするリスクは限定的。

4. 将来の拡張として意図的に除外されており、この機能のスコープでは対応しないことが設計方針として確定済み。

---

### W002: 複雑なコマンドの記述制約

**Issue**: DD-003 で「複雑なコマンド（パイプ、クォート含む）の記述に注意が必要」と記載されているが、具体的な制約やエスケープ規則が未定義。

**Judgment**: **Fix Required** ✅

**Evidence**:
1. design.md の DD-003（530-537行目）で問題は認識されている:
   ```markdown
   | Consequences | 複雑なコマンド（パイプ、クォート含む）の記述に注意が必要 |
   ```

2. しかし、verification.md テンプレートやdesign.md にエスケープ方法の具体的なガイダンスがない。

3. Markdownテーブル内で `|` 文字を使用する場合、テーブル構文と競合するため、ユーザーに対するガイダンスが必要。

**Action Items**:
- design.md の Data Models セクションにエスケープ規則を追加
- パイプを含むコマンドの記述例を追加

---

### W003: Typeフィールドの用途

**Issue**: design.md で Type は「`build`, `typecheck`, `test`, `lint` 等（自由形式）」とされているが、spec-inspection-agent がこの値をどのように扱うかが明確ではない。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
1. design.md のData Models -> Business Rules（432-435行目）で用途が定義されている:
   ```markdown
   - Type: `build`, `typecheck`, `test`, `lint` 等（自由形式）
   ```

2. VerificationResult インターフェース（302-309行目）で `type: string` として定義され、レポート出力に使用されることが明確:
   ```typescript
   interface VerificationResult {
     type: string;           // build, typecheck, test, lint
     command: string;        // 実行コマンド
     ...
   }
   ```

3. 実行順序は「定義順」（テーブルの行順）であり、Type値による順序制御は行わない設計。これはMarkdownテーブルの自然な解釈として妥当。

4. Typeは人間可読なラベルとして使用され、レポートでの分類表示に使われる。特別な実行ロジックは不要。

---

### W004: steering-verification-agent の分析優先順位

**Issue**: design.md で「分析ソース: tech.md > package.json > CI config の優先順」と記載されているが、複数ソースから異なるコマンドが検出された場合のマージ戦略が未定義。

**Judgment**: **Fix Required** ✅

**Evidence**:
1. design.md の Implementation Notes（275行目）で優先順は記載されている:
   ```markdown
   - 分析ソース: tech.md > package.json > CI config の優先順
   ```

2. しかし以下の点が未定義:
   - 既存の verification.md がある場合の挙動（上書き/スキップ/マージ）
   - 複数ソースから検出されたコマンドをどう統合するか

3. steering-verification-agent の実装者に対して明確なガイダンスが必要。

**Action Items**:
- design.md の steering-verification-agent セクションに以下を追加:
  - 既存 verification.md がある場合の挙動
  - 複数ソースからのコマンド統合戦略

---

## Response to Info (Low Priority)

| #    | Issue     | Judgment      | Reason         |
| ---- | --------- | ------------- | -------------- |
| I001 | ロギング設計の言及なし | No Fix Needed | steering/logging.md は一般的なガイドラインであり、agent実装時に自然に準拠可能。明示的な設計追加は不要 |
| I002 | CI/CD統合の除外明記 | No Fix Needed | 適切な除外判断（レビューでも Assessment: ✅） |
| I003 | skill-reference.md への追加 | No Fix Needed | 実装完了後の作業であり、仕様書修正は不要。タスク内で対応予定 |

---

## Files to Modify

| File | Changes |
| ---- | ------- |
| design.md | 1. Data Modelsセクションにエスケープ規則を追加<br>2. steering-verification-agent Implementation Notesにマージ戦略を追加 |

---

## Conclusion

**Warning 4件中2件が修正対象**:
- W002: エスケープ規則の追加 → design.md に追加
- W004: マージ戦略の明確化 → design.md に追加

**残り2件は修正不要**:
- W001: 意図的なスコープ除外（タイムアウトは将来の拡張）
- W003: 現状の記載で用途は十分明確

**Info 3件はすべて修正不要**。

次のステップ: `--autofix` フラグにより、上記修正を design.md に適用します。

---

## Applied Fixes

**Applied Date**: 2026-01-17
**Applied By**: --autofix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| design.md | エスケープ規則とマージ戦略を追加 |

### Details

#### design.md

**Issue(s) Addressed**: W002, W004

**Changes**:
1. Data Models セクションの Business Rules 後にエスケープ規則を追加
2. steering-verification-agent の Implementation Notes にマージ戦略を追加

**Diff Summary**:

**W002 対応（エスケープ規則追加）**:
```diff
 **Business Rules**:
 ...
 - Description: コマンドの説明（人間向け）
+
+**エスケープ規則**:
+
+Markdown テーブル内で特殊文字を使用する場合の規則:
+
+| 文字 | エスケープ方法 | 例 |
+|------|---------------|-----|
+| `|` (パイプ) | `\|` または `&#124;` | `npm run test \| head -n 100` |
+| `` ` `` (バッククォート) | `` \` `` | コマンド内で使用可能 |
+
+**パイプを含むコマンドの例**:
+...
+**注意**: 複雑なコマンドは、シェルスクリプトとして分離し、そのスクリプトを呼び出すことを推奨
```

**W004 対応（マージ戦略追加）**:
```diff
 **Implementation Notes**
 ...
 - 分析ソース: tech.md > package.json > CI config の優先順
+
+**既存 verification.md の挙動**:
+
+- 既存ファイルがある場合: **上書き確認をユーザーに求める**
+- ユーザーが上書きを選択した場合のみ新規生成
+- 上書きを拒否した場合はスキップしてサマリーを表示
+
+**複数ソースからのコマンド統合戦略**:
+
+1. **和集合（Union）方式**: 各ソースから検出されたコマンドを統合
+2. **優先順位による重複排除**: 同一Typeのコマンドが複数ソースから検出された場合、優先順位の高いソースを採用
+3. **Type が異なる場合は共存**: 異なるTypeは両方採用
```

---

_Fixes applied by document-review-reply command._

---

_This reply was generated by the document-review-reply command._
