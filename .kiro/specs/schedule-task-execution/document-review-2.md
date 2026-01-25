# Specification Review Report #2

**Feature**: schedule-task-execution
**Review Date**: 2026-01-24
**Documents Reviewed**:
- spec.json
- requirements.md
- design.md
- tasks.md
- document-review-1.md
- document-review-1-reply.md
- steering/product.md
- steering/tech.md
- steering/structure.md
- steering/design-principles.md

## Executive Summary

| Severity | Count |
|----------|-------|
| Critical | 0 |
| Warning | 2 |
| Info | 3 |

**総評**: Review #1で指摘された3件のCritical/Warning課題（Remote UI対応方針、electron-store同期詳細、エラー通知UI）はすべて適切に修正されている。残存する課題は軽微であり、実装フェーズへの進行に支障はない。ただし、structure.mdのState Management Rulesとの微細な齟齬、およびAgentRegistry統合の詳細について追加検討が推奨される。

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**良好な整合性**:
- Requirements Traceability表が完備されており、全10要件（40件の受入基準）がDesignコンポーネントにマッピングされている
- Review #1で指摘されたRemote UI対応方針が「不要（Desktop専用機能）」として明記された

**改善済み（Review #1からの修正確認）**:
| 要件 | 設計での対応 | ステータス |
|------|-------------|-----------|
| 9.2 Electronローカルストレージ同期 | DD-004に同期詳細追記済み | ✅ 解決済み |
| Remote UI対応 | requirements.md Introduction後に明記 | ✅ 解決済み |

### 1.2 Design ↔ Tasks Alignment

**良好な整合性**:
- 全コンポーネント（ScheduleTaskSettingView, ScheduleTaskEditPage, ScheduleTaskCoordinator等）がタスクでカバー
- タスク4.1にelectron-store同期の詳細実装が追記済み

**軽微な懸念**:
| 設計での記載 | タスクでの対応 | ステータス |
|-------------|---------------|-----------|
| ScheduleTaskHeader, ScheduleTaskFooter（新規ファイル作成リスト） | タスク5.1でScheduleTaskSettingViewに含む形で言及 | ⚠️ 個別タスクなし（Info） |

### 1.3 Design ↔ Tasks Completeness

| Category | Design Definition | Task Coverage | Status |
|----------|-------------------|---------------|--------|
| UI Components (SettingView) | ScheduleTaskSettingView, Header, List, Footer | Task 5.1 | ✅（Header/Footerは5.1内で実装） |
| UI Components (EditPage) | ScheduleTaskEditPage, PromptListEditor, AvoidanceRuleEditor等 | Tasks 6.1-6.6 | ✅ |
| UI Components (Dialogs) | ImmediateExecutionWarningDialog | Task 5.3 | ✅ |
| Services (Main) | ScheduleTaskCoordinator, scheduleTaskService, scheduleTaskFileService | Tasks 2.1-2.5 | ✅ |
| IPC | scheduleTaskHandlers, channels | Tasks 3.1-3.3 | ✅ |
| State | scheduleTaskStore（electron-store同期詳細あり） | Task 4.1 | ✅ |
| Types | ScheduleTask, ScheduleCondition等 | Task 1.1 | ✅ |

### 1.4 Acceptance Criteria → Tasks Coverage

| Criterion | Summary | Mapped Task(s) | Task Type | Status |
|-----------|---------|----------------|-----------|--------|
| 1.1 | タイマーアイコンクリックでダイアログ表示 | 5.1, 8.1 | Feature | ✅ |
| 1.2 | ScheduleTaskSettingView構成 | 5.1 | Feature | ✅ |
| 1.3 | ScheduleTaskListItem情報表示 | 5.2 | Feature | ✅ |
| 1.4 | リストアイテムクリックで編集画面へ遷移 | 5.1 | Feature | ✅ |
| 1.5 | 削除確認ダイアログ | 5.2 | Feature | ✅ |
| 1.6 | 有効/無効トグル即時更新 | 5.2 | Feature | ✅ |
| 2.1 | Spec/Bug新規作成と同様のレイアウト | 6.1 | Feature | ✅ |
| 2.2 | 編集項目一覧 | 6.1, 6.6 | Feature | ✅ |
| 2.3 | 新規作成時の空フォーム表示 | 6.1 | Feature | ✅ |
| 2.4 | バリデーションと保存 | 1.1, 2.2, 6.1 | Feature | ✅ |
| 3.1 | 前回実行からn時間経過パターン | 2.3, 6.2 | Feature | ✅ |
| 3.2 | 毎週n曜日のn時パターン | 2.3, 6.2 | Feature | ✅ |
| 3.3 | アイドル後に実行オプション | 2.3, 6.2 | Feature | ✅ |
| 4.1 | アイドルn分経過パターン | 2.3, 6.2 | Feature | ✅ |
| 4.2 | アイドル時間分単位指定 | 6.2 | Feature | ✅ |
| 4.3 | アイドル検出時キュー追加 | 2.3, 7.1 | Feature | ✅ |
| 5.1 | 複数プロンプト登録 | 1.1, 6.3 | Feature | ✅ |
| 5.2 | プロンプト個別編集・削除 | 6.3 | Feature | ✅ |
| 5.3 | プロンプト順序変更 | 6.3 | Feature | ✅ |
| 5.4 | プロンプトごとにAgent起動 | 2.5, 9.2 | Feature | ✅ |
| 5.5 | 並列実行可能 | 2.5 | Feature | ✅ |
| 6.1 | 回避対象指定 | 1.1, 6.4 | Feature | ✅ |
| 6.2 | 回避時挙動指定 | 1.1, 6.4 | Feature | ✅ |
| 6.3 | 回避対象動作中の挙動 | 2.4 | Feature | ✅ |
| 7.1 | 即時実行ボタン | 5.2 | Feature | ✅ |
| 7.2 | 即時実行時回避ルール非適用 | 2.4 | Feature | ✅ |
| 7.3 | 警告ダイアログ表示 | 5.3 | Feature | ✅ |
| 7.4 | 選択肢提供 | 5.3 | Feature | ✅ |
| 7.5 | 強制実行 | 2.4, 5.3 | Feature | ✅ |
| 8.1 | workflowモード切替 | 1.1, 6.5 | Feature | ✅ |
| 8.2 | worktree自動作成 | 2.5 | Feature | ✅ |
| 8.3 | 命名規則 | 2.5 | Feature | ✅ |
| 8.4 | ユーザー指定suffix | 2.5, 6.5 | Feature | ✅ |
| 8.5 | 複数プロンプト別worktree | 2.5 | Feature | ✅ |
| 8.6 | 実行後worktree放置 | 2.5 | Feature | ✅ |
| 9.1 | プロジェクト内ファイル保存 | 2.1 | Feature | ✅ |
| 9.2 | Electronローカルストレージ同期 | 4.1 | Feature | ✅ |
| 9.3 | プロジェクト開始時整合性確認 | 2.2, 8.3 | Feature | ✅ |
| 9.4 | 最終実行開始時間記録 | 2.1 | Feature | ✅ |
| 10.1 | キューイング条件と実行条件分離 | 2.3, 8.3 | Feature | ✅ |
| 10.2 | 固定スケジュール時刻でキュー追加 | 2.3 | Feature | ✅ |
| 10.3 | アイドル条件でキュー追加 | 2.3 | Feature | ✅ |
| 10.4 | 実行条件満たしたら実行 | 2.4 | Feature | ✅ |
| 10.5 | アイドル後に実行オプション待機 | 2.4 | Feature | ✅ |

**Validation Results**:
- [x] All criterion IDs from requirements.md are mapped
- [x] User-facing criteria have Feature Implementation tasks
- [x] No criterion relies solely on Infrastructure tasks

### 1.5 Cross-Document Contradictions

**矛盾は検出されませんでした。**

Review #1で指摘された課題はすべて解消済み。

## 2. Gap Analysis

### 2.1 Technical Considerations

| Gap | Severity | Description | Review #1対応 |
|-----|----------|-------------|---------------|
| **AgentRegistry統合の詳細** | Warning | 回避対象（spec-merge等）の識別に必要なAgent種別フィールドがAgentRegistryに存在するか、design.mdで確認・拡張の必要性について言及がない | 新規検出 |
| **スケジュールチェック間隔と精度** | Info | Design「1分間隔」と記載。曜日ベーススケジュール（n時実行）で最大1分の遅延が許容されるか明示なし | Review #1から継続（許容範囲） |
| **ログ設計** | Info | steering/logging.mdへの準拠が設計で明示されていない | Review #1で「暗黙的に要求される」と判断済み |

### 2.2 Operational Considerations

| Gap | Severity | Description | Review #1対応 |
|-----|----------|-------------|---------------|
| **キュー可視化** | Info | requirements.md Open Questionに「キューイングされたタスクの可視化UI」が残存 | Review #1で「現時点では不要」と判断済み |

## 3. Ambiguities and Unknowns

| Item | Document | Description | Status |
|------|----------|-------------|--------|
| humanActivityTracker統合 | requirements.md Open Questions | 「アイドル検出の既存実装との統合方法」 | design.md DD-002で方針記載済み（IPC同期） |
| キュー可視化 | requirements.md Open Questions | 「必要に応じて設計フェーズで検討」 | Review #1で「現時点では不要」と判断 |
| 複数ウィンドウ時の挙動 | design.md | Main ProcessがSSoTだが、複数ウィンドウからの同時変更の競合処理 | structure.mdの原則に準拠（Mainがブロードキャスト） |
| AgentRegistryのAgent種別 | design.md | 回避ルール判定時に「spec-merge」「commit」等の種別を識別する方法 | **新規検出**: 要確認事項 |

## 4. Steering Alignment

### 4.1 Architecture Compatibility

**準拠**:
- ✅ Main Process SSoT原則に準拠（ScheduleTaskCoordinatorがSSoT）
- ✅ IPC設計パターン（channels.ts + handlers.ts）に準拠
- ✅ Zustand store構成に準拠
- ✅ ファイル配置パターン（services/, components/schedule/等）に準拠
- ✅ Remote UI対応方針が明記済み（Desktop専用機能）

**軽微な確認事項**:
- ⚠️ structure.md「Domain State (SSOT)は`src/shared/stores/`」に対し、scheduleTaskStoreの配置先が`src/renderer/stores/scheduleTaskStore.ts`と設計されている。これはUI専用状態（編集中のフォーム状態等）を扱うため許容されるが、実装時に「UIキャッシュ」としての役割を明確にすべき

### 4.2 Integration Concerns

| 懸念 | 影響 | 推奨対応 |
|------|------|----------|
| AgentRegistry統合 | 回避ルール判定で実行中Agentの種別（spec-merge等）を識別する必要がある | 実装時にAgentRegistryの既存フィールドを確認。種別が不足している場合は拡張が必要 |
| humanActivityTracker統合 | Renderer側からMain側へのアイドル時間同期が必要 | タスク7.1で対応予定（design.md DD-002に方針記載済み） |
| WorktreeService統合 | `schedule/{task-name}/{suffix}`形式のworktree作成 | 既存WorktreeServiceの任意ブランチ名対応を実装時に確認 |

### 4.3 Migration Requirements

**該当なし** - 新規機能のため既存データのマイグレーションは不要。

## 5. Recommendations

### Critical Issues (Must Fix)

**なし** - Review #1の指摘事項はすべて解消済み。

### Warnings (Should Address)

1. **AgentRegistryのAgent種別識別**
   - 回避ルール判定で「spec-merge」「commit」「bug-merge」「schedule-task」を識別する必要がある
   - AgentRegistryに種別フィールドが存在するか、実装開始前に確認することを推奨
   - 不足している場合、AgentRegistry拡張のタスクを追加

2. **scheduleTaskStoreの役割明確化**
   - design.mdで「Renderer側状態管理（UIキャッシュ）」と記載されているが、structure.mdのルールとの整合性を実装時に確認
   - ドメインデータ（タスク一覧）は「Mainからの同期データ」として扱い、Rendererは「読み取り専用キャッシュ」として保持

### Suggestions (Nice to Have)

1. **Open Questionsの整理**
   - requirements.md Open Questionsに残存する「キュー可視化UI」について、「Out of Scope」への移動を検討（Review #1で「現時点では不要」と判断済み）

2. **スケジュールチェック間隔の明示**
   - design.mdに「1分間隔のチェックにより最大1分の遅延が発生しうる」旨を明記することで、期待値を明確化

3. **ScheduleTaskHeader/Footerのタスク分割**
   - 現在タスク5.1に含まれているが、実装が複雑になる場合は個別タスク化を検討

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|-------------------|-------------------|
| Warning | AgentRegistry種別識別 | 実装開始前にAgentRegistryの既存実装を確認し、種別フィールドの有無を調査 | (実装時確認) |
| Warning | scheduleTaskStoreの役割 | 実装時にstructure.mdのState Management Rulesに準拠していることを確認 | (実装時確認) |
| Info | Open Questionsの整理 | 「キュー可視化UI」をOut of Scopeに移動 | requirements.md |
| Info | スケジュールチェック間隔 | 「最大1分の遅延」を明記 | design.md |
| Info | Header/Footerタスク | 実装時に複雑であれば分割を検討 | tasks.md |

---

## Review #1からの改善確認

| Review #1指摘 | 対応状況 | 確認結果 |
|--------------|----------|----------|
| C1: Remote UI対応方針未定義 | requirements.mdに追記 | ✅ 解決済み |
| W1: electron-store同期詳細不足 | design.md DD-004、tasks.md 4.1に追記 | ✅ 解決済み |
| W4: エラー通知UI未設計 | design.md Error Strategyに追記 | ✅ 解決済み |
| W2: 並列実行制限 | Review #1で「AutoExecutionCoordinatorパターン継承」として解決 | ✅ 対応不要 |
| W3: キュー可視化UI | Review #1で「現時点では不要」として解決 | ✅ 対応不要 |

---

## Conclusion

Review #1で指摘された**Critical 1件**、**Warning 4件**のうち、修正が必要と判断された3件（C1, W1, W4）はすべて適切に修正されている。

残存する**Warning 2件**は実装時の確認事項であり、仕様書の修正は不要。**Info 3件**は改善推奨事項であり、実装フェーズへの進行を妨げない。

**Recommendation**: 実装フェーズへの進行を承認。実装開始前にAgentRegistryの既存実装を確認し、種別フィールドの有無を調査することを推奨。

---

_This review was generated by the document-review command._
