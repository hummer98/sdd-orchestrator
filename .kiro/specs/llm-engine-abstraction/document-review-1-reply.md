# Response to Document Review #1

**Feature**: llm-engine-abstraction
**Review Date**: 2026-01-26
**Reply Date**: 2026-01-25

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 0      | 0            | 0             | 0                |
| Warning  | 3      | 2            | 1             | 0                |
| Info     | 2      | 0            | 2             | 0                |

---

## Response to Warnings

### W-001: Gemini CLI未インストール検出タイミング

**Issue**: Design.mdのError Handling Strategyで「エージェント起動失敗」と記載されているが、ユーザーが設定UIでGeminiを選択した時点でコマンド存在チェックを行い、未インストールの場合は警告を表示する方が良いUX

**Judgment**: **No Fix Needed** ❌

**Evidence**:

この指摘は妥当なUX改善提案ですが、以下の理由で現時点での修正は不要と判断します：

1. **スコープ拡大**: requirements.mdには「設定UIでの未インストール警告」は含まれていない。これは新しい要件の追加であり、MVPスコープ外
2. **YAGNI原則**: 現在の設計（起動失敗時にエラーダイアログ）で機能的に動作する。「より良いUX」は将来の改善タスクとして管理可能
3. **設計の一貫性**: design.mdのError Handling Strategyで「エージェント起動失敗 → エラーダイアログ」と明記されており、設計と実装の一貫性は保たれている

**Recommendation for Future**: 将来のUX改善として、設定画面でのコマンド存在チェックを検討するissueを作成することを推奨。ただし、本specのスコープには含めない。

---

### W-002: Gemini CLI stream-json出力形式の実機検証

**Issue**: Open Questionとして残っている。実装フェーズ開始時に検証し、差異があればparseOutput()の修正が必要。Task 1.3のサブタスクとして「Gemini CLI stream-json出力の実機検証」を明示化すべき。

**Judgment**: **Fix Required** ✅

**Evidence**:

Task 1.3 の現在の記載を確認:

```markdown
- [ ] 1.3 (P) Gemini エンジン定義を実装する
  - `buildArgs()` で `-p`, `--output-format stream-json` を設定
  - `skipPermissions` が true の場合 `--yolo` を追加
  - `allowedTools` / `disallowedTools` は Gemini CLI でサポートされていない場合、無視
  - `parseOutput()` で stream-json 出力を `ParsedOutput` に変換
```

requirements.mdのOpen Questionsに「Gemini CLIの `--output-format stream-json` 出力形式がClaude CLIと同一か要検証」と記載されているが、tasks.mdでは検証ステップが明示されていない。実装者が見落とす可能性があるため、明示的なサブタスクとして追加することは文書化の観点から妥当。

**Action Items**:

- tasks.mdのTask 1.3に「Gemini CLI `--output-format stream-json` 出力形式の実機検証」をサブタスクとして追加

---

### W-003: Gemini CLI -pモードでのallowedTools対応状況

**Issue**: Open Questionとして残っている。Task 1.3で検証し、非対応ならsilent ignoreを確認すべき。

**Judgment**: **Fix Required** ✅

**Evidence**:

requirements.mdのOpen Questionsに「Gemini CLIに `--allowed-tools` 相当のオプションが `-p` モードで機能するか要検証」と記載。Req 2.5で「未サポートオプションの無視」が要件として定義されているが、Task 1.3のサブタスクとして検証内容が明示されていない。

W-002と同様に、明示的なサブタスクとして追加することで実装時の見落としを防ぐ。

**Action Items**:

- tasks.mdのTask 1.3に「Gemini CLI `-p` モードでの `allowedTools` 対応状況の検証」をサブタスクとして追加

---

## Response to Info (Low Priority)

| #    | Issue             | Judgment      | Reason                                                             |
| ---- | ----------------- | ------------- | ------------------------------------------------------------------ |
| I-01 | デプロイ手順      | No Fix Needed | レビュー自体が「既存のアプリアップデートフローに含まれる想定で、特別な手順は不要」と判断済み |
| I-02 | ロールバック      | No Fix Needed | 設定ファイルの後方互換性はフォールバックで対応済みとレビューで確認済み |

---

## Files to Modify

| File      | Changes                                                         |
| --------- | --------------------------------------------------------------- |
| tasks.md  | Task 1.3 にGemini CLI実機検証のサブタスクを2件追加               |

---

## Conclusion

レビュー#1の3件のWarningのうち、2件（W-002, W-003）は修正が必要と判断しました。

- **W-001（Gemini CLI未インストール検出タイミング）**: スコープ外のUX改善提案として却下。将来の改善タスクとして検討可能
- **W-002, W-003（Gemini CLI実機検証の明示化）**: tasks.mdに検証サブタスクを追加して対応

修正は tasks.md のみで、requirements.md および design.md の変更は不要です。

**Next Steps**: 修正が適用されたため、新しいdocument-reviewラウンドで変更を検証する必要があります。

---

## Applied Fixes

**Applied Date**: 2026-01-25
**Applied By**: --autofix

### Summary

| File     | Changes Applied                                          |
| -------- | -------------------------------------------------------- |
| tasks.md | Task 1.3 にGemini CLI実機検証のサブタスクを2件追加        |

### Details

#### tasks.md

**Issue(s) Addressed**: W-002, W-003

**Changes**:
- Task 1.3 に「Gemini CLI `--output-format stream-json` 出力形式の実機検証」サブタスクを追加
- Task 1.3 に「Gemini CLI `-p` モードでの `allowedTools` 対応状況の検証」サブタスクを追加

**Diff Summary**:
```diff
 - [ ] 1.3 (P) Gemini エンジン定義を実装する
+  - **実機検証**: Gemini CLI `--output-format stream-json` の出力形式がClaude CLIと同一か検証（差異がある場合は parseOutput() で対応）
+  - **実機検証**: Gemini CLI `-p` モードでの `--allowed-tools` / `--disallowed-tools` オプション対応状況を検証（非対応の場合はsilent ignore）
   - `buildArgs()` で `-p`, `--output-format stream-json` を設定
```

---

_Fixes applied by document-review-reply command._
