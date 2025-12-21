# Response to Document Review #1

**Feature**: internal-webserver-sync
**Review Date**: 2025-12-22
**Reply Date**: 2025-12-22

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 1      | 1            | 0             | 0                |
| Warning  | 5      | 3            | 2             | 0                |
| Info     | 4      | 0            | 4             | 0                |

---

## Response to Critical Issues

### C1: INITメッセージのバグ一覧追加がDesignに未記載

**Issue**: Requirements 1.1でINITメッセージにバグ一覧を含めることを要求しているが、Design文書のWebSocketHandler Event Contractセクションで明示されていない。Tasks 3.4には記載がある。

**Judgment**: **Fix Required** ✅

**Evidence**:
既存コードを確認すると、[webSocketHandler.ts:220-234](electron-sdd-manager/src/main/services/webSocketHandler.ts#L220-L234)のsendInitMessage()でINITメッセージのpayloadが定義されています：

```typescript
private async sendInitMessage(client: ClientInfo): Promise<void> {
  const project = this.stateProvider?.getProjectPath() || '';
  const specs = this.stateProvider ? await this.stateProvider.getSpecs() : [];
  const logs = this.config.logBuffer.getAll();

  this.send(client.id, {
    type: 'INIT',
    payload: {
      project,
      specs,
      logs,
    },
    timestamp: Date.now(),
  });
}
```

現状、INITにはbugsが含まれていません。Requirements 1.1を満たすためにはDesignに明記し、実装で追加する必要があります。

**Action Items**:
- design.mdのWebSocketHandler Event Contractセクションに`INIT`メッセージのpayload拡張（`bugs: BugInfo[]`追加）を明記

---

## Response to Warnings

### W1: E2Eテストタスクがない

**Issue**: Design Testing StrategyセクションでE2Eテストケースを列挙しているが、tasks.mdにE2Eテストタスクが記載されていない。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
- 既存の[e2e-testing.md](.kiro/steering/e2e-testing.md)を確認すると、現状のE2Eテストは「スモークテストレベル」であり、実ワークフロー動作テストは不足している（カバレッジ評価セクション参照）
- 現在のE2EテストはElectron版UIを対象としており、remote-uiはブラウザベースのVanilla JS SPAであるため、既存のWebdriverIO + wdio-electron-serviceの構成では直接テストできない
- remote-ui向けE2Eテストは別のテストフレームワーク（Playwright等）が必要となり、本仕様のスコープ外
- 本仕様の主目的はremote-uiの機能追加であり、統合テスト（Task 13.1, 13.2）でWebSocketメッセージの往復確認は十分にカバーされている

**Conclusion**: remote-ui向けE2Eテストは別途検討が必要な大きなタスクであり、本仕様のスコープ外。既存のユニット/統合テストで機能確認は可能。

---

### W2: エラーUI実装タスクがない

**Issue**: Design Error Handlingセクションで「remote-ui側ではToast通知でユーザーにフィードバック」と記載があるが、エラーUI実装タスクがない。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
- Design文書を確認すると、Error Handlingセクション最後に「remote-ui側ではToast通知でユーザーにフィードバック」と記載
- しかし、現在のremote-uiの既存コードパターンを確認すると、エラーはconsole.errorとシンプルなalert/状態表示で処理されている
- Task 7.1 BugDetail、Task 8.1 DocumentReviewSection、Task 9.1 ValidateOptionの各コンポーネント実装タスクに「ローディング表示」「ボタン無効化」が含まれており、エラー状態もこれらのコンポーネント内で処理可能
- 専用のToastコンポーネントは「nice to have」であり、各コンポーネントの実装タスク内で簡易的なエラー表示を行えば十分

**Conclusion**: 既存タスクのスコープ内でエラー表示は対応可能。専用Toast UIは過剰設計。

---

### W3: DocumentReviewSection表示条件が曖昧

**Issue**: 「tasksフェーズ完了」の具体的判定条件（approved必須？generated済みで十分？）が曖昧。

**Judgment**: **Fix Required** ✅

**Evidence**:
- Requirements 2.1: 「tasksフェーズが完了しているとき」
- Design DocumentReviewSection: 「tasksフェーズ完了後のSpec詳細画面に表示」
- 「完了」の定義が不明確で実装時に迷う可能性がある

既存のElectron版コードパターンから推測すると、tasksフェーズ完了 = `approvals.tasks.approved === true`が適切。

**Action Items**:
- design.md DocumentReviewSectionセクションに「tasksフェーズ完了」の判定条件を明記: `approvals.tasks.approved === true`

---

### W4: TASK_PROGRESS_UPDATEDトリガーが未定義

**Issue**: 発火タイミング（ファイル監視？Agent出力解析？）がDesignに未定義。

**Judgment**: **Fix Required** ✅

**Evidence**:
- Requirements 4.5: 「TASK_PROGRESS_UPDATEDメッセージをブロードキャスト」
- Design: 「タスク進捗更新時」とのみ記載、具体的トリガーが不明

既存のAgent出力パターンを踏まえると、実装者が判断に迷う可能性がある。明確化が必要。

**Action Items**:
- design.md WebSocketHandler Event Contractセクションに`TASK_PROGRESS_UPDATED`の発火条件を明記:
  - トリガー: tasks.mdファイルの変更検知（チェックボックス状態更新）
  - 具体的には: SpecInfo更新時にtaskProgress差分がある場合にブロードキャスト

---

### W5: debugging.md更新タスクがない

**Issue**: remote-ui追加後のデバッグ手順更新が必要だが、タスクに記載がない。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
- [debugging.md](.kiro/steering/debugging.md)を確認すると、現状はElectronアプリのデバッグ手順が中心
- remote-uiはブラウザで動作するため、標準のブラウザ開発者ツールでデバッグ可能
- WebSocket通信のデバッグは既存の「MCP経由でのログ参照」セクションで対応可能（ログファイル参照）
- ドキュメント更新はNice to Haveであり、実装完了後に必要に応じて追加すればよい

**Conclusion**: 本仕様のスコープ内で必須ではない。実装完了後に必要に応じて更新。

---

## Response to Info (Low Priority)

| #    | Issue     | Judgment      | Reason         |
| ---- | --------- | ------------- | -------------- |
| I1 | Data Models型定義タスクがない | No Fix Needed | Task 1.1, 1.2でStateProvider拡張時に暗黙的にBugInfo, SpecInfo型を定義。明示的タスク追加は冗長 |
| I2 | 同時実行シナリオ未検討 | No Fix Needed | Design Implementation Notes「同時実行時の状態競合は WorkflowController側で管理」で言及済み。既存の多重起動防止ロジックを活用 |
| I3 | 既存remote-uiコード調査タスクがない | No Fix Needed | Task 4.1, 5.1等の実装タスクで自然と調査が行われる。独立タスクは不要 |
| I4 | 接続断時挙動が未定義 | No Fix Needed | Design Non-Goals「オフライン対応（常時接続が前提）」で明確に除外済み |

---

## Files to Modify

| File   | Changes   |
| ------ | --------- |
| design.md | C1: WebSocketHandler Event ContractにINITメッセージのpayload拡張（bugs追加）を明記 |
| design.md | W3: DocumentReviewSectionに「tasksフェーズ完了」の判定条件（`approvals.tasks.approved === true`）を明記 |
| design.md | W4: WebSocketHandler Event Contractに`TASK_PROGRESS_UPDATED`の発火条件を明記 |

---

## Conclusion

**判断サマリー**:
- Critical 1件 → 修正必要（INITメッセージへのバグ一覧追加をDesignに明記）
- Warning 3件 → 修正必要（DocumentReviewSection表示条件、TASK_PROGRESS_UPDATEDトリガー、INITメッセージ）
- Warning 2件 → 修正不要（E2Eテスト、エラーUI、debugging.md更新は本仕様スコープ外）
- Info 4件 → すべて修正不要（既存設計でカバー済み、または明示的タスク不要）

**次のステップ**:
- design.mdに3箇所の修正を適用
- 修正完了後、`/kiro:spec-impl internal-webserver-sync`で実装開始可能

---

_This reply was generated by the document-review-reply command._
