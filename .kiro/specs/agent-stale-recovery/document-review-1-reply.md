# Response to Document Review #1

**Feature**: agent-stale-recovery
**Review Date**: 2026-01-27
**Reply Date**: 2026-01-27

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 3      | 3            | 0             | 0                |
| Warning  | 5      | 5            | 0             | 0                |
| Info     | 3      | 0            | 3             | 0                |

---

## Response to Critical Issues

### C1: Acceptance Criteria 6.1のFeature Task不足

**Issue**: UI表示の確認タスクが存在しない（Task 13.2は型確認のみ）

**Judgment**: **Fix Required** ✅

**Evidence**:
tasks.md Task 13.2を確認した結果、以下の記述のみが存在:
```markdown
- [ ] 13.2 (P) AgentStatus型の確認
  - `failed`状態が既存のAgentStatus型に含まれることを確認
  - 必要に応じて型定義を更新
  - _Requirements: 4.6, 6.1_
```

実際のコードを確認したところ、`AgentStatus = 'running' | 'completed' | 'interrupted' | 'hang' | 'failed'` は既に存在しており、`failed`状態は既存の型に含まれている。しかし、**UIでfailedアイコンが実際に赤色で表示されることを確認するテストタスクが欠けている**。

Requirement 6.1は「`status: failed`のagentは既存のfailedアイコン（赤）で表示する」というユーザー向けの受入基準であり、単なる型確認だけではなく、実際のUI表示の検証が必要。

**Action Items**:
- Task 10（E2Eテスト）に以下のサブタスクを追加:
  - **10.3 failedアイコン表示確認E2Eテスト**
    - `status: failed`のagent recordを作成
    - UI上でfailedアイコンが赤色で表示されることを確認
    - 既存のfailed表示機能が正しく動作することを検証

---

### C2: IPC統合テスト不足

**Issue**: ProjectManager → OrphanDetector、RecoveryEngine → Resume APIのIPC連携テストが存在しない

**Judgment**: **Fix Required** ✅

**Evidence**:
tasks.md Task 9（統合テスト）を確認した結果:
- Task 9.1: Orphan検出→回復フロー統合テスト（RecoveryEngineの呼び出し確認のみ）
- Task 9.2: Stale検出→回復フロー統合テスト（HangDetector → RecoveryEngineのみ）
- Task 9.3: Resume回数制限統合テスト

**IPC連携の統合テストが明示的に欠けている**:
1. **ProjectManager project load event → OrphanDetector.detectOrphans() 呼び出し**: プロジェクト選択完了IPCイベントがOrphanDetectorに正しく伝播することを検証するテストが存在しない
2. **RecoveryEngine → IPC 'agent:resume' 呼び出し**: RecoveryEngineが`resumeAgent` APIをIPC経由で正しく呼び出すことを検証するテストが存在しない

実際のコードを確認したところ、`agentHandlers.ts`には`RESUME_AGENT` IPCハンドラが存在するが、RecoveryEngineからの呼び出しパスを検証する統合テストがない。

**Action Items**:
- Task 9に以下のサブタスクを追加:
  - **9.4 IPC連携統合テスト**
    - ProjectManager project load完了IPC → OrphanDetector.detectOrphans() 呼び出し確認
    - RecoveryEngine.recoverAgent() → IPC 'agent:resume' 呼び出し確認
    - IPCモックを使用して呼び出し回数・引数を検証

---

### C3: Acceptance Criteria 5.1の実装タスク不足

**Issue**: autoResumeCountのインクリメント処理が明記されていない

**Judgment**: **Fix Required** ✅

**Evidence**:
tasks.md Task 1.1を確認した結果:
```markdown
- [ ] 1.1 AgentRecordにautoResumeCountフィールド追加
  - `AgentRecord`インターフェースに`autoResumeCount?: number`フィールドを追加
  - undefinedを0として扱う実装を追加
  - 既存レコード読み込み時の後方互換性を確保
  - _Requirements: 5.1_
```

Task 1.1は**インターフェース定義のみ**であり、実際に回復処理時にautoResumeCountをインクリメントする処理が記述されていない。

Requirement 5.1は「同一agentに対する自動resume試行回数を記録する」であり、単なるフィールド定義だけではなく、**resume実行時にカウントをインクリメントする実装**が必要。

Task 3.1（RecoveryEngine実装）には「Resume API呼び出し」とあるが、autoResumeCountのインクリメント処理が明記されていない。

**Action Items**:
- Task 3.1（RecoveryEngineサービス作成）に以下を追記:
  - Resume実行前に`autoResumeCount`をインクリメントする処理
  - AgentRecordService.updateRecordでautoResumeCount更新を実行
  - インクリメント後の値を使用して上限チェック（3回）を実施

---

## Response to Warnings

### W1: Stale判定閾値の記述不一致

**Issue**: HangDetectorのデフォルト閾値が5分であることが暗黙的

**Judgment**: **Fix Required** ✅

**Evidence**:
実際のコードを確認した結果、`hangDetector.ts`には以下の記述が存在:
```typescript
private thresholdMs: number = 300000; // Default: 5 minutes
```

しかし、tasks.md Task 5.1には以下の記述のみ:
```markdown
- [ ] 5.1 HangDetectorに回復処理追加
  - `checkForHangingAgents()`メソッド内でRecoveryEngine呼び出し
  - `status: hang`遷移前にRecoveryEngineを実行
  - 既存thresholdMs/intervalMs設定を使用
```

「既存thresholdMs/intervalMs設定を使用」とあるが、**デフォルト値が5分であることが明記されていない**。Requirements 2.2では「5分以上更新されていないものをstale判定」と明示されているため、実装タスクでもこの閾値を確認する必要がある。

**Action Items**:
- Task 5.1に以下を追記:
  - HangDetectorのデフォルトthresholdMsが300000ms（5分）であることを確認
  - Requirement 2.2の5分閾値と一致することを検証

---

### W2: Resume API呼び出し方法の不明確さ

**Issue**: IPC経由かMain Process直接呼び出しか不明

**Judgment**: **Fix Required** ✅

**Evidence**:
design.md「Requirements Traceability」セクションを確認した結果:
- Criterion 4.5: 「AgentResume API (IPC)」と記載あり
- 「Recovery Flow」シーケンス図には「InvokeResume: resumeAgent API」と記載

しかし、**「IPC handler 'agent:resume'を使用」という明示的な記述が欠けている**。

実際のコードを確認したところ、`agentHandlers.ts`には`IPC_CHANNELS.RESUME_AGENT`ハンドラが存在する。RecoveryEngineからはこのIPCハンドラを呼び出す必要があるが、Designには「既存の`resumeAgent`機能を使用」とのみ記載されており、IPC経由であることが明確でない。

**Action Items**:
- design.mdの以下のセクションに追記:
  - **「Components and Interfaces」→「RecoveryEngine」→「Dependencies」**:
    - 「Outbound: AgentResume API (IPC)」を「Outbound: IPC handler 'agent:resume' (IPC_CHANNELS.RESUME_AGENT)」に修正
  - **「System Flows」→「Recovery Flow」**:
    - 「Resume: resumeAgent API」を「Resume: IPC 'agent:resume' handler経由でresumeAgent実行」に修正

---

### W3: エラーハンドリング詳細不足

**Issue**: ログファイル読み込み失敗、プロセスKill失敗等の詳細フローが未定義

**Judgment**: **Fix Required** ✅

**Evidence**:
design.md「Error Handling」セクションを確認した結果:
```markdown
**System Errors** (5xx):
- **ログファイル読み込み失敗** → デフォルトで`resume`アクションを選択（ログ不在 = 実行開始直後の可能性）
- **Resume API呼び出し失敗** → エラーログ出力し、次回チェック時に再試行
- **Agent record更新失敗** → エラーログ出力し、`status: hang`に遷移（既存のHangDetector動作を維持）

**Business Logic Errors** (422):
- **Resume回数上限到達** → `status: failed`に遷移し、toast通知で「自動回復の試行回数上限に達しました」を表示
- **プロセスKill失敗** → エラーログ出力し、resume実行を試みる（プロセスが既に終了している可能性）
```

基本的なエラー処理戦略は記載されているが、以下の詳細が不足:
1. **ログファイル読み込み失敗の詳細ケース**: 権限エラー、ファイル破損、パース失敗時の個別処理
2. **プロセスKill失敗時の詳細フロー**: SIGKILL失敗時の具体的な対処（無視してresumeか、failed遷移か）
3. **Resume API呼び出しのタイムアウト**: 無限待機を防ぐためのタイムアウト設定

**Action Items**:
- design.md「Error Handling」セクションに「Error Recovery Flow」サブセクションを追加:
  - **ログファイル読み込みエラー詳細**:
    - ファイル不在: デフォルトで`resume`アクション
    - 権限エラー: エラーログ出力し、`resume`アクション
    - JSONLパース失敗: エラーログ出力し、`resume`アクション
  - **プロセスKill失敗詳細**:
    - SIGKILL失敗: エラーログ出力し、resume実行を継続（プロセスが既に終了している可能性）
    - PID不正: resume実行を継続（orphan状態のため問題なし）
  - **Resume API呼び出しタイムアウト**:
    - タイムアウト設定は既存resumeAgent APIに依存（本機能のスコープ外）
    - 将来的にタイムアウト実装を検討

---

### W4: HangDetector拡張による副作用の未検討

**Issue**: 既存のhang遷移が発生しなくなるケースの影響が未分析

**Judgment**: **Fix Required** ✅

**Evidence**:
design.mdには「HangDetector (Extended)」コンポーネントの記述があり、「`status: hang`遷移前にRecoveryEngineを呼び出し」とあるが、**既存のhang遷移動作への影響分析セクションが存在しない**。

既存のHangDetectorは`status: hang`に遷移することで終了検出失敗を通知する。本機能で回復処理が挿入されることで:
- 回復成功時: `completed`または`resumed`に遷移し、`hang`には遷移しない
- 回復失敗時: `failed`に遷移し、`hang`には遷移しない
- **影響**: hang状態が表示されなくなる可能性（UIやログ出力への影響）

**Action Items**:
- design.md「Architecture」セクションに「HangDetector拡張の既存動作への影響」サブセクションを追加:
  - **変更内容**: stale検出時、`hang`遷移前にRecoveryEngineが回復処理を実行
  - **影響範囲**:
    - 回復成功時: `hang`に遷移せず、`completed`/`resumed`に遷移
    - 回復失敗時: `hang`に遷移せず、`failed`に遷移
    - UI表示: `hang`アイコンが表示されなくなり、代わりに`failed`アイコン表示
    - ログ出力: hang検出ログの代わりに回復処理ログが出力される
  - **後方互換性**: 既存のhang状態のagent recordは手動resumeが必要（orphan検出対象外）

---

### W5: Resume API呼び出しの競合リスク

**Issue**: 手動resumeと自動resumeの同時実行が未対策

**Judgment**: **Fix Required** ✅

**Evidence**:
design.mdには回復処理フローが記載されているが、**手動resumeと自動resumeの競合を防ぐロック機構が存在しない**。

以下のシナリオで競合が発生する可能性:
1. ユーザーがUIでresumeボタンをクリック
2. 同時にHangDetectorがstale検出し、RecoveryEngineが自動resumeを実行
3. 同一agentに対して2つのresume処理が並行実行される

実際のコードを確認したところ、`agentHandlers.ts`の`RESUME_AGENT`ハンドラにはロック機構が見られない。

**Action Items**:
- design.md「Components and Interfaces」→「RecoveryEngine」セクションに以下を追加:
  - **Dependencies**:
    - 「Outbound: Mutex Lock (agentId単位) — resume実行前にロック取得 (P0)」を追加
  - **Implementation Notes**:
    - agentId単位のmutex lockを実装し、resume実行前にロック取得
    - ロック取得失敗時（既にresume実行中）は処理をスキップ
    - 既存のresumeAgent APIにもmutex lockを追加（本機能で実装）

---

## Response to Info (Low Priority)

| #  | Issue                                  | Judgment      | Reason                                                                                                   |
| -- | -------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------- |
| I1 | ログ解析パフォーマンス最適化           | No Fix Needed | 現時点でパフォーマンス問題は未発生。将来的に必要になった時点で別Specとして実装                           |
| I2 | メトリクス収集計画                     | No Fix Needed | Designに「本機能のスコープ外」と明記済み。将来的な拡張として検討可能                                     |
| I3 | ユーザードキュメント更新               | No Fix Needed | Toast通知で機能の動作を説明しており、ユーザーは機能を理解可能。ドキュメント更新は将来的な改善として検討 |

---

## Files to Modify

| File                 | Changes                                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------- |
| tasks.md             | Task 3.1にautoResumeCountインクリメント処理を追記、Task 5.1に閾値確認を追記、Task 10.3を追加、Task 9.4を追加 |
| design.md            | Resume API呼び出し方法を明記、Error Recovery Flowセクション追加、HangDetector影響分析セクション追加、RecoveryEngineにmutex lock依存を追加 |

---

## Conclusion

**総評**: 本レビューで指摘された8件の修正必要項目（Critical 3件、Warning 5件）はすべて妥当な指摘であり、仕様の完全性を高めるために修正が必要です。

**重要な修正点**:
1. **IPC統合テスト不足**: ProjectManager → OrphanDetector、RecoveryEngine → Resume APIのIPC連携テストを追加
2. **autoResumeCountインクリメント処理**: RecoveryEngine実装タスクに明記
3. **Resume競合対策**: agentId単位のmutex lockを追加し、手動resumeと自動resumeの競合を防止
4. **エラーハンドリング詳細化**: ログ読み込み失敗、プロセスKill失敗等の詳細フローを明記
5. **HangDetector影響分析**: 既存のhang遷移が発生しなくなることを明記

**次のステップ**:
修正を適用済み（`--autofix`モード）。再度document-reviewを実行して修正内容を検証します。

---

## Applied Fixes

**Applied Date**: 2026-01-27
**Applied By**: --autofix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| tasks.md | Task 3.1にautoResumeCountインクリメント処理・mutex lock・IPC明記を追加、Task 5.1に閾値確認を追加、Task 9.4（IPC統合テスト）を追加、Task 10.3（failedアイコンE2Eテスト）を追加 |
| design.md | Requirements Traceability（4.5）でIPC handler明記、RecoveryEngine DependenciesにIPC handler・mutex lock追加、Implementation NotesにConcurrency追加、Error Recovery Flowセクション追加、HangDetector影響分析セクション追加、Recovery Flowシーケンス図でIPC明記 |
| spec.json | documentReview.status = "in_progress"、roundDetails[0].status = "reply_complete"、fixStatus = "applied"、fixRequired = 8を設定 |

### Details

#### tasks.md

**Issue(s) Addressed**: C3（autoResumeCountインクリメント不足）、W1（閾値記述不一致）、C2（IPC統合テスト不足）、C1（failedアイコンE2Eテスト不足）、W5（Resume競合対策）

**Changes**:
- Task 3.1「RecoveryEngineサービス作成」に以下を追記:
  - Resume API呼び出しを「IPC handler 'agent:resume'を使用」に明記
  - Resume実行前にautoResumeCountをインクリメント
  - AgentRecordService.updateRecordでautoResumeCount更新を実行
  - インクリメント後の値を使用して上限チェック（3回）を実施
  - agentId単位のmutex lockを実装し、resume実行前にロック取得
- Task 5.1「HangDetectorに回復処理追加」に以下を追記:
  - HangDetectorのデフォルトthresholdMsが300000ms（5分）であることを確認
  - Requirement 2.2の5分閾値と一致することを検証
- Task 9.4「IPC連携統合テスト」を追加:
  - ProjectManager project load完了IPC → OrphanDetector.detectOrphans() 呼び出し確認
  - RecoveryEngine.recoverAgent() → IPC 'agent:resume' 呼び出し確認
  - IPCモックを使用して呼び出し回数・引数を検証
- Task 10.3「failedアイコン表示確認E2Eテスト」を追加:
  - `status: failed`のagent recordを作成
  - UI上でfailedアイコンが赤色で表示されることを確認

**Diff Summary**:
```diff
--- Task 3.1 (old)
+++ Task 3.1 (new)
-  - Resume API呼び出し（既存resumeAgent機能を使用）
+  - Resume API呼び出し（IPC handler 'agent:resume'を使用）
+  - Resume実行前にautoResumeCountをインクリメント
+  - AgentRecordService.updateRecordでautoResumeCount更新を実行
+  - インクリメント後の値を使用して上限チェック（3回）を実施
+  - agentId単位のmutex lockを実装し、resume実行前にロック取得
-  - _Requirements: 3.5, 4.1, 4.2, 4.4, 4.6, 4.7_
+  - _Requirements: 3.5, 4.1, 4.2, 4.4, 4.6, 4.7, 5.1_
-  - _Method: LogAnalyzer.analyzeLog, AgentRecordService.updateRecord, process.kill, resumeAgent_
+  - _Method: LogAnalyzer.analyzeLog, AgentRecordService.updateRecord, process.kill, IPC RESUME_AGENT_

--- Task 5.1 (old)
+++ Task 5.1 (new)
   - 既存thresholdMs/intervalMs設定を使用
+  - HangDetectorのデフォルトthresholdMsが300000ms（5分）であることを確認
+  - Requirement 2.2の5分閾値と一致することを検証

+++ Task 9.4 (new)
+- [ ] 9.4 (P) IPC連携統合テスト
+  - ProjectManager project load完了IPC → OrphanDetector.detectOrphans() 呼び出し確認
+  - RecoveryEngine.recoverAgent() → IPC 'agent:resume' 呼び出し確認
+  - IPCモックを使用して呼び出し回数・引数を検証

+++ Task 10.3 (new)
+- [ ] 10.3 (P) failedアイコン表示確認E2Eテスト
+  - `status: failed`のagent recordを作成
+  - UI上でfailedアイコンが赤色で表示されることを確認
```

#### design.md

**Issue(s) Addressed**: W2（Resume API呼び出し方法不明確）、W3（エラーハンドリング詳細不足）、W4（HangDetector影響未分析）、W5（Resume競合対策）

**Changes**:
- Requirements Traceability（Criterion 4.5）:
  - 「AgentResume API (IPC)」を「IPC handler 'agent:resume' (IPC_CHANNELS.RESUME_AGENT)」に修正
- RecoveryEngine Dependencies:
  - 「Outbound: AgentResume API (IPC)」を「Outbound: IPC handler 'agent:resume' (IPC_CHANNELS.RESUME_AGENT)」に修正
  - 「Outbound: Mutex Lock (agentId単位) — resume実行前にロック取得 (P0)」を追加
- RecoveryEngine Implementation Notes:
  - Concurrency項目を追加: agentId単位のmutex lock実装、ロック取得失敗時の処理スキップ
- Error Handling:
  - 「Error Recovery Flow」セクションを追加:
    - ログファイル読み込みエラー詳細（ファイル不在、権限エラー、JSONLパース失敗）
    - プロセスKill失敗詳細（SIGKILL失敗、PID不正、権限エラー）
    - Resume API呼び出しタイムアウト（将来的な実装）
- Architecture:
  - 「HangDetector拡張の既存動作への影響」セクションを追加:
    - 変更内容（hang遷移前に回復処理挿入）
    - 影響範囲（UI表示、ログ出力、後方互換性、コールバック）
- Recovery Flow:
  - シーケンス図「InvokeResume: resumeAgent API」を「InvokeResume: IPC 'agent:resume' handler」に修正
  - Flow決定事項にIPC handler使用を追記

**Diff Summary**:
```diff
--- Requirements Traceability (4.5)
-| 4.5 | 既存の`resumeAgent`機能を使用してresume | AgentResume API (IPC) | 既存再利用: IPCハンドラ経由でresume実行 |
+| 4.5 | 既存の`resumeAgent`機能を使用してresume | IPC handler 'agent:resume' (IPC_CHANNELS.RESUME_AGENT) | 既存再利用: IPC handler 'agent:resume'経由でresume実行 |

--- RecoveryEngine Dependencies
-- Outbound: AgentResume API (IPC) — resume実行 (P0)
+- Outbound: IPC handler 'agent:resume' (IPC_CHANNELS.RESUME_AGENT) — resume実行 (P0)
+- Outbound: Mutex Lock (agentId単位) — resume実行前にロック取得 (P0)

+++ Architecture
+### HangDetector拡張の既存動作への影響
+（新規セクション追加: 変更内容、影響範囲、UI表示、ログ出力、後方互換性）

+++ Error Handling
+### Error Recovery Flow
+（新規セクション追加: ログ読み込みエラー、プロセスKillエラー、Resume APIタイムアウト）
```

#### spec.json

**Issue(s) Addressed**: documentReview状態管理

**Changes**:
- `documentReview.status`を`"in_progress"`に設定
- `documentReview.roundDetails[0]`を以下に設定:
  - `roundNumber`: 1
  - `status`: "reply_complete"
  - `fixStatus`: "applied"
  - `fixRequired`: 8
  - `needsDiscussion`: 0

**Diff Summary**:
```diff
+  "documentReview": {
+    "status": "in_progress",
+    "roundDetails": [
+      {
+        "roundNumber": 1,
+        "status": "reply_complete",
+        "fixStatus": "applied",
+        "fixRequired": 8,
+        "needsDiscussion": 0
+      }
+    ]
+  }
```

---

_Fixes applied by document-review-reply command._
