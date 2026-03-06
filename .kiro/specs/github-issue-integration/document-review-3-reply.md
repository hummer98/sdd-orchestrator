# Response to Document Review #3

**Feature**: github-issue-integration
**Review Date**: 2026-03-06
**Reply Date**: 2026-03-06

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Warning  | 4      | 3            | 1             | 0                |
| Info     | 4      | 0            | 4             | 0                |

---

## Response to Warnings

### W-01: Steering product.mdとSpecドキュメントの不一致

**Issue**: Task 14.7（Steering更新）が実装タスクの最後にあるため、実装フェーズ中にSteeringとSpecの矛盾が存在する。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
Steeringドキュメントは「現在の実装状態」を反映するものであり、「今後実装予定の仕様」を先行して反映するべきではない。Task 14.7を実装前に実行すると、逆にSteeringが実装と矛盾する状態が発生する。

実装フェーズはSpec文書（requirements.md, design.md, tasks.md）を参照して進めるため、Steeringの一時的な不整合は作業者に影響しない。Task 14.7の実行タイミングは現状のまま（実装完了後）が適切。

---

### W-02: Requirements Open Questionsが未解決のまま残存

**Issue**: requirements.md Open Questionsに、design.mdで既に決定済みの事項（`gh` CLI使用、60秒ポーリング）が残っている。

**Judgment**: **Fix Required** ✅

**Evidence**:
- requirements.md L211: `scripts/gh-issue.sh` は `gh` CLI依存にするか → design.md DD-005で「`gh` CLI使用」と決定済み
- requirements.md L212: Issueリストのポーリング間隔 → design.md issueStore で「60秒ポーリング」と決定済み
- requirements.md L213: ダイレクトモードでのPR作成 → 未決定（Open Questionのまま）

**Action Items**:
- requirements.md のOpen Questionsセクションから決定済み2件を削除し、Resolved Questionsセクションを追加して移動
- 未決定の1件（ダイレクトモードPR作成）はOpen Questionsに残す

---

### W-03: WebSocket経由のIssue同期統合テストの欠落（継続）

**Issue**: Remote UI WebSocket経由のIssue操作を検証する統合テストがない。Review #1, #2から継続。

**Judgment**: **Fix Required** ✅

**Evidence**:
- design.md Integration Test StrategyにWebSocket経路のテスト定義がない
- Tasks 12.1でWebSocketハンドラ実装は定義されているが、対応する統合テストがない
- Tasks 15.5-15.7のE2Eテストはoptionalかつ、Remote UI WebSocket経路ではない

ただし、WebSocketハンドラは薄いアダプタ層であり、実際のビジネスロジックはGitHubApiService（tRPC integration testでカバー済み）に委譲される。フルE2Eではなく、WebSocketハンドラ単体の統合テストで十分。

**Action Items**:
- tasks.md Task 15にWebSocketハンドラの統合テスト（Task 15.5相当）を追加
- design.md Integration Test StrategyにWebSocket経路のテスト方針を追記する必要はない（タスク追加で対応）

---

### W-04: Steering更新タイミング

**Issue**: Task 14.7をTask 14.3と同時期に実行してSteeringと実装コードの同期を確保すべき。

**Judgment**: **Fix Required** ✅

**Evidence**:
Task 14.7は現在Task 14.3-14.6の後に記載されているが、Task 14.3（Shared層配線更新）で`agentStore`のパターン変更が行われるため、Steeringの`structure.md`を同時に更新することは合理的。

ただしW-01で判定した通り、「コード変更前にSteering更新」は不適切。Task 14.7の依存関係にTask 14.3を追加し、同時期実行を推奨する注記を追加する。

**Action Items**:
- tasks.md Task 14.7にTask 14.3への依存と同時期実行推奨の注記を追加

---

## Response to Info (Low Priority)

| #    | Issue                          | Judgment      | Reason                                                                                |
| ---- | ------------------------------ | ------------- | ------------------------------------------------------------------------------------- |
| I-01 | gh CLI不在時のSlash Commandsエラー | No Fix Needed | design.md DD-005に記載済み。Task 5.1に「明確なエラーメッセージ」あり。実装詳細は実装時に決定 |
| I-02 | Label作成の冪等性・競合         | No Fix Needed | `ensureStatusLabels`で422エラーをgracefulに処理するのは実装詳細。設計文書への追記は過剰 |
| I-03 | Agent entityId移行の後方互換性   | No Fix Needed | Review #1 S-03で「影響限定的」と判定済み。孤立ディレクトリは手動削除で対応可能。マイグレーションタスクは過剰 |
| S-04 | issueRouter SRP改善            | No Fix Needed | 将来のリファクタリング候補であり、現仕様の範囲外                                      |

---

## Files to Modify

| File             | Changes                                                                                      |
| ---------------- | -------------------------------------------------------------------------------------------- |
| requirements.md  | Open Questionsから決定済み2件をResolved Questionsに移動                                       |
| tasks.md         | Task 15にWebSocketハンドラ統合テスト追加、Task 14.7に依存関係注記追加                         |

---

## Conclusion

Review #3はCritical issueなし。4件のWarningのうち3件に修正を適用。W-01（Steering更新タイミング）はタスク実行順序として現状が適切と判断し修正不要とした。

残りのInfo項目はすべて実装詳細レベルであり、設計文書の修正は不要。

---

## Applied Fixes

**Applied Date**: 2026-03-06
**Applied By**: --autofix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| requirements.md | Open Questionsから決定済み2件をResolved Questionsセクションに移動 |
| tasks.md | Task 15.5（WebSocketハンドラ統合テスト）追加、Task 14.7に同時期実行推奨注記追加、E2Eタスク番号を15.6-15.8に再番号付け、Coverage Matrix更新 |

### Details

#### requirements.md

**Issue(s) Addressed**: W-02

**Changes**:
- Open Questionsから決定済み2件（gh CLI使用、60秒ポーリング）を削除
- Resolved Questionsセクションを新設し、決定内容とDesign Decision参照を記載
- 未決定の1件（ダイレクトモードPR作成）はOpen Questionsに残存

**Diff Summary**:
```diff
 ## Open Questions

-- `scripts/gh-issue.sh` は `gh` CLI依存にするか、`curl` + PATで自己完結にするか（`gh`がインストールされていない環境への対応）
-- Issueリストのポーリング間隔はどの程度が適切か（30秒? 60秒? 手動リフレッシュのみ?）
 - ダイレクトモードでの実装時、PR作成は任意とするか、完了時に自動提案するか
+
+## Resolved Questions
+
+- `scripts/gh-issue.sh` は `gh` CLI依存にするか → **`gh` CLI使用**（Design Decision DD-005）
+- Issueリストのポーリング間隔 → **60秒ポーリング + 手動リフレッシュ**（design.md issueStore定義）
```

#### tasks.md

**Issue(s) Addressed**: W-03, W-04

**Changes**:
- Task 15.5としてWebSocketハンドラ経由のIssue操作統合テストを追加（必須タスク）
- 旧E2Eテスト（15.5-15.7）を15.6-15.8に再番号付け
- Task 14.7に「Task 14.3と同時期に実行推奨」の注記を追加
- Coverage Matrix: 11.5にTask 15.5追加、1.6/2.1/2.2/2.3のE2Eタスク番号更新

**Diff Summary**:
```diff
+- [ ] 15.5 Integration test: WebSocketハンドラ経由のIssue操作を検証する（Task 12.1に依存）
+  - WebSocketハンドラ（GET_ISSUES, GET_ISSUE_DETAIL, CREATE_ISSUE等）が正しくGitHubApiServiceに委譲されることを検証
+  - WebSocketApiClientからのリクエスト → webSocketHandler → GitHubApiService（モック）のフローを検証
+  - エラーレスポンスの伝播を検証

-- [ ] 14.7 Steeringドキュメントを更新する
+- [ ] 14.7 Steeringドキュメントを更新する（Task 14.3と同時期に実行推奨）
+  - **Note**: Task 14.3（Shared層配線更新）でagentStoreのパターン変更が行われるため、structure.mdの同時更新が望ましい
```

---

_Fixes applied by document-review-reply command._
