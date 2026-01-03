# Response to Document Review #2

**Feature**: spec-phase-auto-update
**Review Date**: 2026-01-03
**Reply Date**: 2026-01-03

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 0      | 0            | 0             | 0                |
| Warning  | 3      | 1            | 2             | 0                |
| Info     | 3      | 0            | 3             | 0                |

---

## Response to Warnings

### W-1: notifyPhaseChangeメソッドの実装方針が不明確

**Issue**: Designでは`notifyPhaseChange`をprivateメソッドとして定義しているが、Task 7.1では「broadcastSpecUpdatedを呼び出し」のみ記載されており、メソッド追加のタスクが明示されていない。

**Judgment**: **No Fix Needed** ❌

**Evidence**:

既存のコードパターンを確認した結果、`broadcastSpecUpdated`は`webSocketHandler.ts:1418`に既に公開メソッドとして存在しています：

```typescript
// webSocketHandler.ts:1418-1424
broadcastSpecUpdated(specId: string, updates: Record<string, unknown>): void {
  this.broadcast({
    type: 'SPEC_UPDATED',
    payload: { specId, ...updates },
    timestamp: Date.now(),
  });
}
```

Design文書の`notifyPhaseChange`は「内部メソッド（private）」として定義されており、その責務は「WebSocketHandler.broadcastSpecUpdatedを呼び出す」ことです。これは実装の詳細レベルの記述であり、Task 7.1の「broadcastSpecUpdatedを呼び出し」という記載で十分にカバーされています。

実装時には以下のいずれかのパターンで対応可能：
1. `checkInspectionCompletion`/`checkDeployCompletion`内で直接`webSocketHandler.broadcastSpecUpdated`を呼び出す
2. privateヘルパーメソッドを追加してラップする（オプション）

いずれの場合もTask 7.1の記述で対応可能であり、タスク追加は不要です。

---

### W-2: Task 10.3のフォーマットエラー

**Issue**: `- [ ]*10.3` と記載されており、タスク番号フォーマットが不正（`*`が混入）

**Judgment**: **Fix Required** ✅

**Evidence**:

tasks.md 102行目を確認：
```markdown
- [ ]*10.3 SpecList表示の統合テスト
```

正しいフォーマットは `- [ ] 10.3` です。他のタスク項目と整合していません。

**Action Items**:

- tasks.md 102行目: `- [ ]*10.3` を `- [ ] 10.3` に修正

---

### W-3: specsWatcherServiceからWebSocketHandlerへの依存注入

**Issue**: Designでは依存関係として記載されているが、constructor injectionのパターンが明示されていない。

**Judgment**: **No Fix Needed** ❌

**Evidence**:

既存の`specsWatcherService.ts`を確認した結果、FileService注入パターンが既に実装されています：

```typescript
// specsWatcherService.ts:30-35
private fileService: FileService | null = null;

constructor(projectPath: string, fileService?: FileService) {
  this.projectPath = projectPath;
  this.fileService = fileService ?? null;
}
```

Task 5.2には「FileServiceを呼び出してphaseを更新」と明記されており、同様のパターンでWebSocketHandlerを注入することは自明です。

また、Design文書のDependenciesセクションには以下の記載があります：
```
**Dependencies**
- Outbound: FileService — spec.json更新 (P0)
- Outbound: WebSocketHandler — Remote UI通知 (P1)
```

これにより依存関係は明確であり、実装者は既存パターンを踏襲するだけです。Implementation Notesへの追記は有益ですが必須ではありません。

---

## Response to Info (Low Priority)

| #    | Issue     | Judgment      | Reason         |
| ---- | --------- | ------------- | -------------- |
| S-1 | Remote UI型定義の共有方式確認 | No Fix Needed | 実装時確認事項。tech.mdで「Remote UIは独立したReactアプリ」と明記されており、型は各アプリで独立定義されている。新しいphase値はRemote UI側でも追加が必要だが、これは実装タスクの一部として対応可能。Task 7.2に「Remote UI側のステータス表示を確認する」とあり、暗黙的にカバー済み |
| S-2 | symbol-semantic-map.md更新 | No Fix Needed | 運用事項として実装完了後に対応。仕様ドキュメントのスコープ外 |
| S-3 | deploy_completed設定のワークフロー想定記載 | No Fix Needed | Non-Goalsで「スコープ外」と明記済み。想定を追記しても仕様の明確化には寄与せず、むしろスコープ拡大の懸念あり |

---

## Files to Modify

| File   | Changes   |
| ------ | --------- |
| tasks.md | 102行目: `- [ ]*10.3` → `- [ ] 10.3` |

---

## Conclusion

レビュー#2で指摘されたWarning 3件のうち、**実際に修正が必要なのは1件（W-2: タスク番号フォーマット）のみ**です。

- **W-1 (notifyPhaseChange)**: 既存の`broadcastSpecUpdated`メソッドで対応可能。タスク記述で十分カバーされている
- **W-2 (Task 10.3フォーマット)**: 即時修正可能な軽微なタイポ
- **W-3 (依存注入)**: 既存パターンに従うため明示不要

Info 3件はすべて実装時確認事項または運用事項であり、仕様ドキュメントの修正は不要です。

**推奨次ステップ**:
- `--fix` オプションで W-2 を修正
- `/kiro:spec-impl spec-phase-auto-update` で実装を開始

---

## Applied Fixes

**Applied Date**: 2026-01-03
**Applied By**: --fix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| tasks.md | Task 10.3のフォーマットエラー修正（`*`を削除） |

### Details

#### tasks.md

**Issue(s) Addressed**: W-2

**Changes**:
- 102行目: タスク番号フォーマットを修正

**Diff Summary**:
```diff
- - [ ]*10.3 SpecList表示の統合テスト
+ - [ ] 10.3 SpecList表示の統合テスト
```

---

_Fixes applied by document-review-reply command._
