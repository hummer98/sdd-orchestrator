# Specification Review Report #1

**Feature**: agent-stale-recovery
**Review Date**: 2026-01-27
**Documents Reviewed**: spec.json, requirements.md, design.md, tasks.md

## Executive Summary

仕様レビューを実施した結果、**3件のCRITICAL、5件のWARNING、3件のINFO**を検出しました。

**総合評価**: 実装前に修正が必要です。特に、Acceptance Criteria → Tasks Coverageの不足が深刻であり、一部の受入基準に対して具体的な実装タスクが欠けています。また、統合テストの抜けがあり、IPC連携やファイルシステム操作の検証が不十分です。

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

✅ **基本的に完備**: 主要コンポーネントはすべてTasksで実装計画が定義されています。

| Category | Design Definition | Task Coverage | Status |
| -------- | ----------------- | ------------- | ------ |
| Services | OrphanDetector, RecoveryEngine, LogAnalyzer, HangDetector | 2.1, 3.1, 4.1, 5.1 | ✅ |
| Data Models | AgentRecord.autoResumeCount, RecoveryAction, RecoveryResult | 1.1, 13.1 | ✅ |
| IPC Integration | ProjectManager → OrphanDetector | 6.1 | ✅ |
| Error Handling | RecoveryError, logging | 3.3, 11.1, 11.2 | ✅ |
| Notifications | Toast通知（failed, limit exceeded） | 12.1, 12.2 | ✅ |

⚠️ **WARNING**: 以下の要素について、タスクが存在するが詳細度が不足している可能性があります：
- **Integration Testの範囲**: Task 9.xで統合テストが定義されているが、IPC連携やファイルシステム操作の詳細検証が不十分（後述）

### 1.4 Acceptance Criteria → Tasks Coverage

❌ **CRITICAL**: 複数の受入基準に対して、InfrastructureタスクのみでFeature Implementationタスクが不足しています。

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
| 5.1 | 同一agentに対する自動resume試行回数を記録 | 1.1 | Infrastructure | ⚠️ |
| 5.2 | 自動resume試行回数が3回を超えた場合、status: failedに更新 | 3.2 | Implementation | ✅ |
| 5.3 | failed更新時、toast通知で「自動回復の試行回数上限」を通知 | 3.2, 12.2 | Implementation | ✅ |
| 5.4 | 手動resume時または新規実行時にautoResumeCountを0にリセット | 7.1 | Implementation | ✅ |
| 6.1 | status: failedのagentは既存のfailedアイコン（赤）で表示 | 13.2 | Infrastructure | ❌ CRITICAL |
| 6.2 | stale検出によるfailed更新時、toast通知を表示 | 12.1, 12.2 | Implementation | ✅ |
| 6.3 | toast通知にはagentIdを含め、識別可能とする | 12.1, 12.2 | Implementation | ✅ |

**検出された問題**:

1. **5.1（autoResumeCount記録）**: Task 1.1はAgentRecordインターフェースへのフィールド追加のみであり、実際に回復処理時にカウントをインクリメントする実装タスクが存在しない。
   - **推奨**: Task 3.1（RecoveryEngine実装）に「autoResumeCountのインクリメント処理」を明記

2. **6.1（failedアイコン表示）**: Task 13.2は「AgentStatus型の確認」のみであり、UIでの表示確認タスクが存在しない。
   - **推奨**: 既存機能の確認タスクを追加（E2Eテストで検証可能）

**Validation Results**:
- [x] All criterion IDs from requirements.md are mapped
- [ ] User-facing criteria have Feature Implementation tasks ← 6.1が不足
- [ ] No criterion relies solely on Infrastructure tasks ← 5.1が部分的に不足

### 1.5 Integration Test Coverage

❌ **CRITICAL**: 以下の統合ポイントに対して、統合テストが不足しています。

| Integration Point | Design Section | Test Task | Status |
|-------------------|----------------|-----------|--------|
| **IPC: ProjectManager → OrphanDetector** | "Orphan Detection on Project Load" | (none) | ❌ CRITICAL |
| **IPC: RecoveryEngine → Agent Resume API** | "Recovery Flow" | (none) | ❌ CRITICAL |
| **FileSystem: Agent Record CRUD** | "AgentRecordService (Extended)" | 8.4 (Unit) | ⚠️ WARNING |
| **FileSystem: Log File Read** | "LogAnalyzer" | 8.3 (Unit) | ⚠️ WARNING |
| HangDetector → RecoveryEngine | "Stale Detection (Periodic)" | 9.2 | ✅ |
| OrphanDetector → RecoveryEngine | "Orphan Detection on Project Load" | 9.1 | ✅ |

**検出された問題**:

1. **IPC連携の統合テスト不足**:
   - **ProjectManager → OrphanDetector**: プロジェクト選択完了イベントがOrphanDetectorに伝播することを検証するテストが存在しない（Task 9.1はRecoveryEngine呼び出しのみ）
   - **RecoveryEngine → Agent Resume API**: Resume API呼び出しが実際にIPC経由で実行されることを検証するテストが存在しない（Task 9.2はHangDetector → RecoveryEngineのみ）

2. **FileSystem操作の統合テスト不足**:
   - Task 8.4, 8.3はUnit Testであり、実際のファイルシステムとの統合は検証されていない
   - 推奨: Task 9.4「Agent Record読み書き統合テスト」を追加（実ファイル使用）

**Validation Results**:
- [ ] All sequence diagrams have corresponding integration tests ← IPC連携が不足
- [ ] All IPC channels have delivery verification tests ← Resume API呼び出しテスト不足
- [x] All store sync flows have state propagation tests （本機能ではstore syncなし）

### 1.6 Refactoring Integrity Check

✅ **適合**: 本機能はリファクタリングではなく新規機能追加のため、削除対象ファイルは存在しません。

Designの「Integration & Deprecation Strategy」セクションにも「削除対象ファイル: なし（既存ファイルへの追加のみ）」と明記されています。

### 1.7 Cross-Document Contradictions

⚠️ **WARNING**: 以下の矛盾・不整合を検出しました。

1. **Stale判定閾値の記述不一致**:
   - Requirements.md（2.2）: "5分以上更新されていないものをstaleと判定"
   - Design.md（DD-006）: "5分間`lastActivityAt`が更新されない場合"
   - Tasks.md（5.1）: "既存thresholdMs/intervalMs設定を使用"
   - **矛盾内容**: Tasksには閾値の具体的な設定方法が記載されていないため、既存のHangDetectorのデフォルト値が5分であることを前提としているが、それが明記されていない。
   - **推奨**: Task 5.1に「HangDetectorのthresholdMsが5分（300000ms）であることを確認」を追加

2. **Resume API呼び出し方法の記述不一致**:
   - Design.md（RecoveryEngine）: "AgentResume API (IPC)"
   - Design.md（Interface Changes）: "既存の`resumeAgent`機能を使用"
   - Tasks.md（3.1）: "Resume API呼び出し（既存resumeAgent機能を使用）"
   - **矛盾内容**: `resumeAgent`がIPC経由で呼び出されるのか、Main Process内の直接呼び出しなのか不明確。
   - **推奨**: Designに「IPC handler `agent:resume`を使用」と明記

## 2. Gap Analysis

### 2.1 Technical Considerations

⚠️ **WARNING**: 以下の技術的考慮事項が不足しています。

1. **エラーハンドリングの詳細不足**:
   - Designの"Error Handling"セクションは基本戦略のみで、以下のエラーケースが欠けている:
     - `LogAnalyzer`がログファイルを読み込めない場合（権限エラー、破損等）の詳細処理
     - `RecoveryEngine`がプロセスKillに失敗した場合の詳細フロー（SIGKILL失敗、PID不正等）
     - Resume API呼び出しがタイムアウトした場合の処理（無限待機防止）
   - **推奨**: Designに「Error Recovery Flow」セクションを追加し、各エラーケースの詳細フローを記載

2. **ログ解析パフォーマンス**:
   - Designに「ログファイルが巨大な場合、読み込みに時間がかかる可能性（末尾N行のみ読み込む最適化を検討）」と記載があるが、Tasksに反映されていない
   - **推奨**: Task 2.1に「ログファイルサイズが10MB以上の場合、末尾1000行のみ読み込む」等の最適化タスクを追加

3. **セキュリティ**:
   - プロセスKill（`SIGKILL`）の権限確認が欠けている
   - 他ユーザーのプロセスをKillしようとした場合のエラーハンドリングが未定義
   - **推奨**: Designに「Security Considerations」セクションを追加し、プロセスKillの権限チェックを明記

4. **ロギング（steering/logging.md準拠）**:
   - Task 11.2で「回復処理のログ出力追加」が定義されているが、具体的なログレベル（INFO/WARN/ERROR）や出力内容が未定義
   - **推奨**: `loggingService`を使用したログ出力の具体例をDesignに追加

### 2.2 Operational Considerations

✅ **基本的に考慮済み**: 以下の運用面は適切に考慮されています。

- **デプロイ手順**: 既存ファイルへの追加のみのため、特別なデプロイ手順は不要
- **ロールバック**: 機能はオプトアウト不要（自動実行）だが、autoResumeCountフィールドはundefinedを許容するため後方互換性あり
- **モニタリング**: Task 11.2でログ出力が定義されている

⚠️ **INFO**: 以下の運用面について、追加検討を推奨します。

1. **メトリクス収集**:
   - Designに「メトリクス: 回復処理成功／失敗回数をカウント（本機能のスコープ外）」と記載があるが、将来的な実装計画が未定義
   - **推奨**: 別Specとして「Agent Recovery Metrics」を検討

2. **ドキュメント更新**:
   - ユーザー向けドキュメント（README等）の更新タスクが存在しない
   - **推奨**: Task 14「ユーザードキュメント更新」を追加（機能の動作説明、Toast通知の意味等）

## 3. Ambiguities and Unknowns

⚠️ **WARNING**: 以下の曖昧な記述を検出しました。

1. **「完了パターン」の具体的定義**:
   - Requirements.md（3.2）: "ログに「完了」パターン（`auto-execution-completion-detection`と同じ判定ロジック）が存在する場合"
   - Design.md（LogAnalyzer）: "既存の`specsWatcherService.ts`の`checkTaskCompletion()`を参考に実装"
   - **曖昧な点**: `checkTaskCompletion()`の具体的なパターン（正規表現、キーワード等）が明記されていない
   - **推奨**: Designに完了パターンの具体例を記載（例: `"結果:\s*成功"`, `"status:\s*completed"`等）

2. **「エラーパターン」の具体的定義**:
   - Requirements.md（3.3）: "ログの最終行がエラーパターンの場合"
   - Design.md（LogAnalyzer）: "最終行に`"error"`または`"failed"`を含む場合"
   - **曖昧な点**: 大文字小文字の扱い、部分一致の範囲が未定義
   - **推奨**: Designに「大文字小分字を区別しない、部分一致」等の詳細を追加

3. **「ユーザー中断」の判定方法**:
   - Requirements.md（3.4）: "ログが途中で停止、ユーザー中断でない"
   - Requirements.md（3.5）: "`status: interrupted`の場合は回復対象外"
   - **曖昧な点**: `status: interrupted`がどのタイミングで設定されるのか、ログベースの判定も必要なのか不明
   - **推奨**: Designに「`status: interrupted`はAgentRecord読み込み時に判定し、ログ解析前にスキップ」と明記

## 4. Steering Alignment

### 4.1 Architecture Compatibility

✅ **適合**: 本機能は既存アーキテクチャと整合しています。

- **Electron Main Processでのステート保持**: `AgentRecord.autoResumeCount`はファイルベースで永続化され、Main Processで管理される（steering/structure.md準拠）
- **Service Pattern**: 新規サービス（`OrphanDetector`, `RecoveryEngine`, `LogAnalyzer`）はすべて`src/main/services/`に配置（steering/structure.md準拠）
- **IPC Pattern**: プロジェクト選択完了イベントおよびResume API呼び出しはIPC経由（steering/structure.md準拠）

### 4.2 Integration Concerns

⚠️ **WARNING**: 以下の統合面での懸念事項を検出しました。

1. **HangDetectorの拡張による副作用**:
   - 既存のHangDetectorは`status: hang`に遷移することで終了検出失敗を通知するが、本機能で回復処理が挿入されることで、hangに遷移しなくなるケースが発生する
   - **影響**: HangDetector利用箇所（UI表示、ログ出力等）が変更される可能性
   - **推奨**: Designに「HangDetector拡張による既存動作への影響」セクションを追加し、hang遷移が発生しなくなるケースを明記

2. **Resume API呼び出しの競合**:
   - 手動resumeと自動resumeが同時に実行される可能性がある（ユーザーがUIでresumeボタンを押したタイミングで、RecoveryEngineが自動resumeを実行）
   - **影響**: Resume APIが2回呼ばれ、重複実行のリスク
   - **推奨**: Designに「Resume API呼び出し時のロック機構」を追加（例: agentId単位のmutex）

### 4.3 Migration Requirements

✅ **後方互換性確保済み**: `autoResumeCount?: number`はオプショナルフィールドであり、既存のagent recordファイルとの互換性が確保されています。

⚠️ **INFO**: 以下の移行面について、追加検討を推奨します。

1. **既存のhangステータスagentの扱い**:
   - アプリ起動時に`status: hang`のagent recordが存在する場合、orphan検出対象外となる（`status: running`のみが対象）
   - **推奨**: Designに「既存のhangステータスagentは手動resumeが必要」と明記

## 5. Recommendations

### Critical Issues (Must Fix)

1. **[CRITICAL] Acceptance Criteria 6.1のFeature Taskが不足**
   - **問題**: UI表示の確認タスクが存在しない（Task 13.2は型確認のみ）
   - **推奨**: E2Eテストに「failedアイコンが赤色で表示されることを確認」を追加

2. **[CRITICAL] IPC統合テストが不足**
   - **問題**: ProjectManager → OrphanDetector、RecoveryEngine → Resume APIのIPC連携テストが存在しない
   - **推奨**: Task 9.4「IPC連携統合テスト」を追加
     - ProjectManager project load event → OrphanDetector.detectOrphans() 呼び出し確認
     - RecoveryEngine.recoverAgent() → IPC 'agent:resume' 呼び出し確認

3. **[CRITICAL] Acceptance Criteria 5.1の実装タスクが不足**
   - **問題**: autoResumeCountのインクリメント処理が明記されていない
   - **推奨**: Task 3.1に「RecoveryEngine内でautoResumeCountをインクリメントする処理」を追加

### Warnings (Should Address)

1. **[WARNING] Stale判定閾値の記述不一致**
   - **問題**: HangDetectorのデフォルト閾値が5分であることが暗黙的
   - **推奨**: Task 5.1に「HangDetectorのthresholdMs確認」を明記

2. **[WARNING] Resume API呼び出し方法の不明確さ**
   - **問題**: IPC経由かMain Process直接呼び出しか不明
   - **推奨**: Designに「IPC handler 'agent:resume'を使用」と明記

3. **[WARNING] エラーハンドリング詳細不足**
   - **問題**: ログファイル読み込み失敗、プロセスKill失敗等の詳細フローが未定義
   - **推奨**: Designに「Error Recovery Flow」セクションを追加

4. **[WARNING] HangDetector拡張による副作用の未検討**
   - **問題**: 既存のhang遷移が発生しなくなるケースの影響が未分析
   - **推奨**: Designに影響分析セクションを追加

5. **[WARNING] Resume API呼び出しの競合リスク**
   - **問題**: 手動resumeと自動resumeの同時実行が未対策
   - **推奨**: Designにロック機構を追加

### Suggestions (Nice to Have)

1. **[INFO] ログ解析パフォーマンス最適化**
   - **提案**: Task 2.1に「巨大ログファイルの末尾N行読み込み最適化」を追加

2. **[INFO] メトリクス収集計画**
   - **提案**: 別Specとして「Agent Recovery Metrics」を検討

3. **[INFO] ユーザードキュメント更新**
   - **提案**: Task 14「README更新（Toast通知の意味等）」を追加

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
| -------- | ----- | ------------------ | ------------------ |
| CRITICAL | Acceptance Criteria 6.1のFeature Task不足 | E2Eテストに「failedアイコン表示確認」を追加 | tasks.md |
| CRITICAL | IPC統合テスト不足 | Task 9.4「IPC連携統合テスト」を追加（ProjectManager → OrphanDetector, RecoveryEngine → Resume API） | tasks.md |
| CRITICAL | Acceptance Criteria 5.1の実装タスク不足 | Task 3.1に「autoResumeCountインクリメント処理」を明記 | tasks.md |
| WARNING | Stale判定閾値の記述不一致 | Task 5.1に「HangDetectorのthresholdMs確認」を追加 | tasks.md |
| WARNING | Resume API呼び出し方法の不明確さ | Designに「IPC handler 'agent:resume'を使用」と明記 | design.md |
| WARNING | エラーハンドリング詳細不足 | Designに「Error Recovery Flow」セクションを追加（ログ読み込み失敗、プロセスKill失敗等） | design.md |
| WARNING | HangDetector拡張による副作用の未検討 | Designに「HangDetector拡張の既存動作への影響」セクションを追加 | design.md |
| WARNING | Resume API呼び出しの競合リスク | Designに「Resume APIロック機構」を追加（agentId単位のmutex） | design.md |
| INFO | ログ解析パフォーマンス最適化 | Task 2.1に「巨大ログファイルの末尾N行読み込み最適化」を追加 | tasks.md |
| INFO | メトリクス収集計画 | 別Spec「Agent Recovery Metrics」を検討 | - |
| INFO | ユーザードキュメント更新 | Task 14「README更新」を追加 | tasks.md |

---

_This review was generated by the document-review command._
