# Specification Review Report #2

**Feature**: agent-stale-recovery
**Review Date**: 2026-01-27
**Documents Reviewed**: spec.json, requirements.md, design.md, tasks.md

## Executive Summary

仕様レビューを実施した結果、**0件のCRITICAL、1件のWARNING、2件のINFO**を検出しました。

**総合評価**: 前回レビュー（#1）で指摘された3件のCRITICAL問題はすべて修正されています。1件のWARNINGはドキュメント更新の提案であり、実装の妨げにはなりません。仕様は実装可能な状態です。

**前回レビューからの改善点**:
- ✅ **CRITICAL修正**: Acceptance Criteria 5.1の実装タスク不足 → Task 3.1にautoResumeCountインクリメント処理を明記
- ✅ **CRITICAL修正**: Acceptance Criteria 6.1のFeature Task不足 → Task 10.3でE2Eテストに追加
- ✅ **CRITICAL修正**: IPC統合テスト不足 → Task 9.4を追加
- ✅ **WARNING修正**: Stale判定閾値の記述不一致 → Task 5.1に確認項目を追加
- ✅ **WARNING修正**: Resume API呼び出し方法の不明確さ → Design.mdに明記
- ✅ **WARNING修正**: エラーハンドリング詳細不足 → Design.mdに「Error Recovery Flow」セクションを追加
- ✅ **WARNING修正**: HangDetector拡張による副作用の未検討 → Design.mdに「HangDetector拡張の既存動作への影響」セクションを追加
- ✅ **WARNING修正**: Resume API呼び出しの競合リスク → Design.mdにmutex lock機構を追加

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

✅ **適合**: すべての要件がDesignでカバーされています。

- Requirement 1（起動時Orphan検出） → Design "Orphan Detection on Project Load"
- Requirement 2（定期的Stale検出） → Design "Stale Detection (Periodic)"
- Requirement 3（ログ解析） → Design "Log Analyzer"コンポーネント
- Requirement 4（回復処理） → Design "Recovery Engine"コンポーネント
- Requirement 5（Resume回数制限） → Design "RecoveryEngine", "AgentRecord.autoResumeCount"
- Requirement 6（UI表示） → Design "既存failedアイコンを使用"

**Requirements Traceability Table**も完備されており、各Criterion IDがDesignコンポーネントにマッピングされています。

### 1.2 Design ↔ Tasks Alignment

✅ **適合**: Designで定義されたコンポーネントはすべてTasksに反映されています。

| Component | Design Section | Tasks Coverage |
|-----------|----------------|----------------|
| OrphanDetector | Design "OrphanDetector" | Task 4.1 |
| HangDetector (Extended) | Design "HangDetector (Extended)" | Task 5.1 |
| RecoveryEngine | Design "RecoveryEngine" | Task 3.1, 3.2, 3.3 |
| LogAnalyzer | Design "LogAnalyzer" | Task 2.1 |
| AgentRecordService (Extended) | Design "AgentRecordService (Extended)" | Task 1.1, 7.1 |

### 1.3 Design ↔ Tasks Completeness

✅ **完備**: 主要コンポーネントはすべてTasksで実装計画が定義されています。

| Category | Design Definition | Task Coverage | Status |
| -------- | ----------------- | ------------- | ------ |
| Services | OrphanDetector, RecoveryEngine, LogAnalyzer, HangDetector | 2.1, 3.1, 4.1, 5.1 | ✅ |
| Data Models | AgentRecord.autoResumeCount, RecoveryAction, RecoveryResult | 1.1, 13.1 | ✅ |
| IPC Integration | ProjectManager → OrphanDetector, RecoveryEngine → Resume API | 6.1, 9.4 | ✅ |
| Error Handling | RecoveryError, logging, Error Recovery Flow | 3.3, 11.1, 11.2 | ✅ |
| Notifications | Toast通知（failed, limit exceeded） | 12.1, 12.2 | ✅ |
| Concurrency Control | agentId単位のmutex lock | 3.1 | ✅ |

### 1.4 Acceptance Criteria → Tasks Coverage

✅ **適合**: すべての受入基準に対して、適切な実装タスクが定義されています。

| Criterion | Summary | Mapped Task(s) | Task Type | Status |
|-----------|---------|----------------|-----------|--------|
| 1.1 | プロジェクト選択後、orphan検出処理を実行 | 4.1, 6.1 | Implementation | ✅ |
| 1.2 | checkProcessAlive(pid)でプロセス生存確認 | 4.1 | Implementation | ✅ |
| 1.3 | プロセス不在時、回復処理を実行 | 4.1 | Implementation | ✅ |
| 1.4 | 検出・回復結果をログ出力 | 4.1, 11.2 | Implementation | ✅ |
| 2.1 | 約1分間隔で定期的にstale検出処理を実行 | 5.1 | Implementation | ✅ |
| 2.2 | status: runningでlastActivityAtが5分以上更新されていないものをstale判定 | 5.1 | Implementation | ✅ |
| 2.3 | stale判定後、回復処理を実行 | 5.1 | Implementation | ✅ |
| 2.4 | プロジェクト切り替え時・アプリ終了時に定期チェックを停止 | 5.1 | Implementation | ✅ |
| 2.5 | チェック間隔は設定可能、デフォルト1分 | 5.1 | Implementation | ✅ |
| 3.1 | stale/orphan検出時、ログファイルを解析 | 2.1 | Implementation | ✅ |
| 3.2 | ログに完了パターンが存在する場合、正常完了と判断 | 2.1 | Implementation | ✅ |
| 3.3 | ログ最終行がエラーパターンの場合、エラー終了と判断 | 2.1 | Implementation | ✅ |
| 3.4 | 上記以外は中断状態と判断 | 2.1 | Implementation | ✅ |
| 3.5 | status: interruptedのagentは回復対象外 | 3.1 | Implementation | ✅ |
| 4.1 | ログ解析結果が「正常完了」の場合、status: completedに更新 | 3.1 | Implementation | ✅ |
| 4.2 | ログ解析結果が「中断状態」の場合、自動resumeを試行 | 3.1 | Implementation | ✅ |
| 4.3 | checkProcessAlive(pid)でプロセス生存確認 | 3.1 | Implementation | ✅ |
| 4.4 | 生存中の場合、process.kill(pid, 'SIGKILL')で強制終了 | 3.1 | Implementation | ✅ |
| 4.5 | 既存のresumeAgent機能を使用してresume | 3.1 | Implementation | ✅ |
| 4.6 | ログ解析結果が「エラー終了」の場合、status: failedに更新 | 3.1 | Implementation | ✅ |
| 4.7 | failed更新時、toast通知でユーザーに通知 | 3.1, 12.1 | Implementation | ✅ |
| 5.1 | 同一agentに対する自動resume試行回数を記録 | 1.1, 3.1 | Implementation | ✅ *(修正済)* |
| 5.2 | 自動resume試行回数が3回を超えた場合、status: failedに更新 | 3.2 | Implementation | ✅ |
| 5.3 | failed更新時、toast通知で「自動回復の試行回数上限」を通知 | 3.2, 12.2 | Implementation | ✅ |
| 5.4 | 手動resume時または新規実行時にautoResumeCountを0にリセット | 7.1 | Implementation | ✅ |
| 6.1 | status: failedのagentは既存のfailedアイコン（赤）で表示 | 13.2, 10.3 | Implementation | ✅ *(修正済)* |
| 6.2 | stale検出によるfailed更新時、toast通知を表示 | 12.1, 12.2 | Implementation | ✅ |
| 6.3 | toast通知にはagentIdを含め、識別可能とする | 12.1, 12.2 | Implementation | ✅ |

**前回レビューからの改善**:
- 5.1: Task 3.1に「Resume実行前にautoResumeCountをインクリメント」を明記
- 6.1: Task 10.3「failedアイコン表示確認E2Eテスト」を追加

**Validation Results**:
- [x] All criterion IDs from requirements.md are mapped
- [x] User-facing criteria have Feature Implementation tasks
- [x] No criterion relies solely on Infrastructure tasks

### 1.5 Integration Test Coverage

✅ **改善**: 前回レビューで指摘されたIPC統合テストが追加されました。

| Integration Point | Design Section | Test Task | Status |
|-------------------|----------------|-----------|--------|
| IPC: ProjectManager → OrphanDetector | "Orphan Detection on Project Load" | 9.4 | ✅ *(新規追加)* |
| IPC: RecoveryEngine → Agent Resume API | "Recovery Flow" | 9.4 | ✅ *(新規追加)* |
| FileSystem: Agent Record CRUD | "AgentRecordService (Extended)" | 8.4 (Unit) | ✅ |
| FileSystem: Log File Read | "LogAnalyzer" | 8.3 (Unit) | ✅ |
| HangDetector → RecoveryEngine | "Stale Detection (Periodic)" | 9.2 | ✅ |
| OrphanDetector → RecoveryEngine | "Orphan Detection on Project Load" | 9.1 | ✅ |

**前回レビューからの改善**:
- Task 9.4「IPC連携統合テスト」を追加し、ProjectManager → OrphanDetector、RecoveryEngine → Resume APIのIPC連携を検証

**Validation Results**:
- [x] All sequence diagrams have corresponding integration tests
- [x] All IPC channels have delivery verification tests
- [x] All store sync flows have state propagation tests（本機能ではstore syncなし）

### 1.6 Refactoring Integrity Check

✅ **適合**: 本機能はリファクタリングではなく新規機能追加のため、削除対象ファイルは存在しません。

Designの「Integration & Deprecation Strategy」セクションにも「削除対象ファイル: なし（既存ファイルへの追加のみ）」と明記されています。

### 1.7 Cross-Document Contradictions

✅ **改善**: 前回レビューで指摘された矛盾・不整合は修正されました。

1. **Stale判定閾値の記述不一致** → ✅ **修正済み**
   - Task 5.1に「HangDetectorのデフォルトthresholdMsが300000ms（5分）であることを確認」を追加
   - Requirement 2.2の5分閾値と一致することを検証する項目が明記された

2. **Resume API呼び出し方法の記述不一致** → ✅ **修正済み**
   - Design.md（Requirements Traceability, RecoveryEngine, Recovery Flow）に「IPC handler 'agent:resume' (IPC_CHANNELS.RESUME_AGENT)」を明記
   - Tasks.md (3.1)にも「IPC handler 'agent:resume'を使用」と記載

## 2. Gap Analysis

### 2.1 Technical Considerations

✅ **改善**: 前回レビューで指摘された技術的考慮事項は大幅に改善されました。

1. **エラーハンドリングの詳細** → ✅ **修正済み**
   - Design.mdに「Error Recovery Flow」セクションが追加され、以下のエラーケースの詳細フローが定義された:
     - ログファイル読み込みエラー詳細（ファイル不在、権限エラー、JSONLパース失敗）
     - プロセスKill失敗詳細（SIGKILL失敗、PID不正、権限エラー）
     - Resume API呼び出しタイムアウト（将来的な実装として明記）

2. **ログ解析パフォーマンス** → ℹ️ **INFO**
   - 前回レビューで「最適化タスクの追加」を推奨したが、未対応
   - Designには「ログファイルが巨大な場合、読み込みに時間がかかる可能性（末尾N行のみ読み込む最適化を検討）」と記載
   - **評価**: 実装時に判断可能な最適化事項のため、事前タスク化は不要と判断（INFO扱い）

3. **セキュリティ** → ✅ **修正済み**
   - Design.md「Error Recovery Flow - プロセスKill失敗詳細」に権限エラー（EPERM）時の処理が定義された
   - 他ユーザープロセスのKillはエラーログ出力し、`failed`に遷移

4. **ロギング** → ✅ **適合**
   - Task 11.2で「回復処理のログ出力追加」が定義されている
   - Design.mdの"Monitoring"セクションに「loggingService経由でログファイルに記録」と明記

### 2.2 Operational Considerations

✅ **適合**: 運用面は適切に考慮されています。

- **デプロイ手順**: 既存ファイルへの追加のみのため、特別なデプロイ手順は不要
- **ロールバック**: autoResumeCountフィールドはundefinedを許容するため後方互換性あり
- **モニタリング**: Task 11.2でログ出力が定義されている

⚠️ **WARNING**: 以下の運用面について、追加検討を推奨します。

1. **ユーザー向けドキュメント更新**:
   - Toast通知の意味や回復処理の動作説明をユーザードキュメントに記載すべき
   - **推奨**: Task追加「ユーザードキュメント更新（Toast通知の意味、自動回復の仕組み等）」
   - **評価**: 実装後のドキュメント更新で対応可能なため、WARNING扱い

ℹ️ **INFO**: 以下の運用面について、追加検討を推奨します（将来的な改善）。

1. **メトリクス収集**:
   - Designに「メトリクス: 回復処理成功／失敗回数をカウント（本機能のスコープ外）」と記載
   - **推奨**: 別Specとして「Agent Recovery Metrics」を検討

## 3. Ambiguities and Unknowns

✅ **改善**: 前回レビューで指摘された曖昧な記述は明確化されました。

1. **「完了パターン」の具体的定義** → ✅ **明確化済み**
   - Design.md（LogAnalyzer）に「既存の`specsWatcherService.ts`の`checkTaskCompletion()`を参考に実装」と明記
   - 既存実装を参照する形で定義が明確化されている

2. **「エラーパターン」の具体的定義** → ✅ **明確化済み**
   - Design.md（LogAnalyzer）に「最終行に`"error"`または`"failed"`を含む場合」と明記
   - 大文字小文字の扱いは実装時に判断可能

3. **「ユーザー中断」の判定方法** → ✅ **明確化済み**
   - Requirements.md（3.5）に「`status: interrupted`のagentは回復対象外とする」と明記
   - Design.md（RecoveryEngine）に「`status: interrupted`のagentは処理をスキップする」と明記

## 4. Steering Alignment

### 4.1 Architecture Compatibility

✅ **適合**: 本機能は既存アーキテクチャと整合しています。

- **Electron Main Processでのステート保持**: `AgentRecord.autoResumeCount`はファイルベースで永続化され、Main Processで管理される（steering/structure.md準拠）
- **Service Pattern**: 新規サービス（`OrphanDetector`, `RecoveryEngine`, `LogAnalyzer`）はすべて`src/main/services/`に配置（steering/structure.md準拠）
- **IPC Pattern**: プロジェクト選択完了イベントおよびResume API呼び出しはIPC経由（steering/structure.md準拠）
- **DRY原則**: 回復処理ロジックを`RecoveryEngine`に統合し、OrphanDetectorとHangDetectorで再利用（steering/design-principles.md準拠）

### 4.2 Integration Concerns

✅ **改善**: 前回レビューで指摘された統合面での懸念事項は修正されました。

1. **HangDetectorの拡張による副作用** → ✅ **修正済み**
   - Design.mdに「HangDetector拡張の既存動作への影響」セクションが追加された
   - 回復成功時に`hang`遷移が発生しなくなることが明記され、UI表示・ログ出力への影響が分析されている

2. **Resume API呼び出しの競合** → ✅ **修正済み**
   - Design.md（RecoveryEngine）に「agentId単位のmutex lockを実装し、resume実行前にロック取得」を追加
   - Task 3.1に「agentId単位のmutex lockを実装し、resume実行前にロック取得」を明記
   - 既存のresumeAgent IPCハンドラにもmutex lock追加を計画

### 4.3 Migration Requirements

✅ **適合**: 後方互換性確保済み。

- `autoResumeCount?: number`はオプショナルフィールドであり、既存のagent recordファイルとの互換性が確保されている
- Design.mdに「既存のhangステータスagentは手動resumeが必要」と明記

## 5. Recommendations

### Critical Issues (Must Fix)

**なし** - 前回レビューで指摘された3件のCRITICAL問題はすべて修正されました。

### Warnings (Should Address)

1. **[WARNING] ユーザー向けドキュメント更新タスクの欠如**
   - **問題**: Toast通知の意味や自動回復の仕組みをユーザーに説明するドキュメント更新タスクが存在しない
   - **推奨**: Task追加「ユーザードキュメント更新（Toast通知の意味、自動回復の仕組み、手動resume方法等）」
   - **影響**: 実装後のドキュメント更新で対応可能なため、実装の妨げにはならない

### Suggestions (Nice to Have)

1. **[INFO] ログ解析パフォーマンス最適化**
   - **提案**: 巨大ログファイル（10MB以上）の場合、末尾1000行のみ読み込む最適化を検討
   - **評価**: 実装時に判断可能な最適化事項のため、事前タスク化は不要

2. **[INFO] メトリクス収集計画**
   - **提案**: 別Specとして「Agent Recovery Metrics」を検討
   - **評価**: 本機能のスコープ外であり、将来的な改善として検討

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
| -------- | ----- | ------------------ | ------------------ |
| WARNING | ユーザー向けドキュメント更新タスクの欠如 | Task追加「ユーザードキュメント更新（Toast通知の意味、自動回復の仕組み、手動resume方法等）」 | tasks.md |
| INFO | ログ解析パフォーマンス最適化 | 実装時に巨大ログファイルの最適化を検討（末尾N行読み込み等） | - |
| INFO | メトリクス収集計画 | 別Spec「Agent Recovery Metrics」を検討（将来的な改善） | - |

---

## Next Steps

**仕様は実装可能な状態です。**

前回レビュー（#1）で指摘された3件のCRITICAL問題と5件のWARNING問題はすべて修正されました。残る1件のWARNINGはユーザードキュメント更新の提案であり、実装後に対応可能です。

**推奨アクション**:

1. **即時実装可能**: `/kiro:spec-impl agent-stale-recovery` で実装を開始できます
2. **オプション**: `/kiro:document-review-reply agent-stale-recovery` でWARNING項目への対応を検討（実装前に対応する場合）
3. **ドキュメント更新**: 実装完了後にユーザー向けドキュメントを更新

---

_This review was generated by the document-review command._
