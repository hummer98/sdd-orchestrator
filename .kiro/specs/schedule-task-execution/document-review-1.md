# Specification Review Report #1

**Feature**: schedule-task-execution
**Review Date**: 2026-01-25
**Documents Reviewed**:
- spec.json
- requirements.md
- design.md
- tasks.md
- steering/product.md
- steering/tech.md
- steering/structure.md
- steering/design-principles.md

## Executive Summary

| Severity | Count |
|----------|-------|
| Critical | 1 |
| Warning | 4 |
| Info | 3 |

**総評**: 全体的に設計文書は充実しており、要件の大部分がカバーされている。しかし、Requirements 9.2（electron-storeローカルストレージ同期）に関して、設計とタスクの両方でelect-storeの使用が明記されているが、scheduleTaskStoreとの同期メカニズムの詳細が不十分。また、Remote UI対応の方針が明記されていない。

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**良好な整合性**:
- Requirements Traceability表が完備されており、全10要件（40件の受入基準）がDesignコンポーネントにマッピングされている
- スケジュール条件（固定/条件）、回避ルール、workflowモード等の主要機能が具体的なコンポーネントで設計されている

**軽微な懸念**:
| 要件 | 設計での対応 | 懸念点 |
|------|-------------|--------|
| 9.2 Electronローカルストレージ同期 | scheduleTaskStore, electron-store | 同期ロジックの詳細設計が不足（競合解決タイミング等） |
| Open Question: 同期タイミングと競合解決 | DD-004で言及 | 詳細設計が未記載のまま |

### 1.2 Design ↔ Tasks Alignment

**良好な整合性**:
- 全コンポーネント（ScheduleTaskSettingView, ScheduleTaskEditPage, ScheduleTaskCoordinator等）がタスクでカバー
- サービス層（scheduleTaskService, scheduleTaskFileService）の実装タスクが明確

**矛盾点の検出**:

| 設計での記載 | タスクでの対応 | ステータス |
|-------------|---------------|-----------|
| ScheduleTaskHeader, ScheduleTaskFooter（新規ファイル作成リスト） | タスク5.1でScheduleTaskSettingViewに含む形で言及 | ⚠️ 個別タスクなし |
| scheduleTaskStore（electron-store同期） | タスク4.1で「IPC経由でのデータ取得・更新」のみ言及 | ⚠️ electron-store同期の詳細タスクなし |

### 1.3 Design ↔ Tasks Completeness

| Category | Design Definition | Task Coverage | Status |
|----------|-------------------|---------------|--------|
| UI Components (SettingView) | ScheduleTaskSettingView, Header, List, Footer | Task 5.1 | ⚠️ Header/Footerが個別タスクなし |
| UI Components (EditPage) | ScheduleTaskEditPage, PromptListEditor, AvoidanceRuleEditor等 | Tasks 6.1-6.6 | ✅ |
| UI Components (Dialogs) | ImmediateExecutionWarningDialog | Task 5.3 | ✅ |
| Services (Main) | ScheduleTaskCoordinator, scheduleTaskService, scheduleTaskFileService | Tasks 2.1-2.5 | ✅ |
| IPC | scheduleTaskHandlers, channels | Tasks 3.1-3.3 | ✅ |
| State | scheduleTaskStore | Task 4.1 | ⚠️ electron-store同期詳細なし |
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
| 9.2 | Electronローカルストレージ同期 | 4.1 | Feature | ⚠️ 詳細不足 |
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

## 2. Gap Analysis

### 2.1 Technical Considerations

| Gap | Severity | Description |
|-----|----------|-------------|
| **electron-store同期詳細** | Warning | Requirements 9.2とDesign DD-004で「同期タイミングと競合解決」がOpen Questionとして残されているが、タスクに詳細実装が含まれていない。競合時の優先ルール（ファイル優先 vs electron-store優先）を明確化すべき |
| **アイドル検出の精度** | Info | humanActivityTrackerの「最終アクティビティ時刻」をMain Processに同期する頻度が未定義。高頻度同期はIPCオーバーヘッド、低頻度は検出遅延を招く |
| **スケジュールチェック間隔** | Info | Design「1分間隔」と記載。曜日ベーススケジュール（n時実行）で最大1分の遅延が許容されるか要確認 |
| **並列実行の制限** | Warning | 複数プロンプトの並列実行が可能（Req 5.5）だが、リソース制限（最大同時Agent数）の設計がない |
| **ログ設計** | Info | steering/logging.mdへの準拠が設計で明示されていない。スケジュール実行ログのフォーマットを定義すべき |

### 2.2 Operational Considerations

| Gap | Severity | Description |
|-----|----------|-------------|
| **Remote UI対応** | Critical | requirements.mdに「Remote UI対応: 要/不要」の明記がない（steering/tech.mdの要求）。スケジュールタスクの設定・即時実行をRemote UIから操作可能にするか未定義 |
| **キュー可視化** | Warning | requirements.md Open Questionに「キューイングされたタスクの可視化UI」があるが、設計/タスクで対応されていない |
| **エラー通知** | Warning | Agent実行エラー時の「通知表示」がDesign Error Handlingに記載されているが、具体的なUI（トースト、ダイアログ等）の設計がない |

## 3. Ambiguities and Unknowns

| Item | Document | Description |
|------|----------|-------------|
| 同期タイミング | requirements.md Open Questions | 「Electron側のローカルストレージとプロジェクト内ファイルの同期タイミングと競合解決の詳細」が未解決 |
| humanActivityTracker統合 | requirements.md Open Questions | 「アイドル検出の既存実装との統合方法」が「設計フェーズで検討」とあるが、設計では「IPC同期」のみ記載で詳細なし |
| キュー可視化 | requirements.md Open Questions | 「必要に応じて設計フェーズで検討」とあるが、設計で対応されていない |
| 複数ウィンドウ時の挙動 | design.md | Main ProcessがSSoTとあるが、複数Electronウィンドウから同時に設定変更した場合の競合処理が未定義 |
| プロンプト文字数制限 | design.md | プロンプト内容の最大長制限が未定義 |

## 4. Steering Alignment

### 4.1 Architecture Compatibility

**準拠**:
- ✅ Main Process SSoT原則に準拠（ScheduleTaskCoordinatorがSSoT）
- ✅ IPC設計パターン（channels.ts + handlers.ts）に準拠
- ✅ Zustand store構成（shared storesにscheduleTaskStore）に準拠
- ✅ ファイル配置パターン（services/, components/schedule/等）に準拠

**懸念**:
- ⚠️ structure.mdの「Domain State (SSOT)はsrc/shared/stores/」ルールに対し、scheduleTaskStoreがRenderer状態管理として設計されている。ドメインデータの扱いを明確化すべき

### 4.2 Integration Concerns

| 懸念 | 影響 | 推奨対応 |
|------|------|----------|
| AgentRegistry統合 | 回避ルール判定で実行中Agentの種別（spec-merge等）を識別する必要がある | AgentRegistryに種別フィールドが存在するか確認、なければ拡張が必要 |
| humanActivityTracker統合 | Renderer側からMain側へのアイドル時間同期が必要 | 新規IPCチャンネル追加、同期間隔の設計が必要 |
| WorktreeService統合 | `schedule/{task-name}/{suffix}`形式のworktree作成 | 既存WorktreeServiceが任意のブランチ名をサポートするか確認 |

### 4.3 Migration Requirements

**該当なし** - 新規機能のため既存データのマイグレーションは不要。

## 5. Recommendations

### Critical Issues (Must Fix)

1. **Remote UI対応方針の明確化**
   - requirements.mdに「Remote UI対応: 要/不要」を明記する
   - 対応する場合、WebSocketハンドラ追加、remote-ui/stores追加のタスクが必要
   - 対応しない場合、「Desktop専用機能」として明記する

### Warnings (Should Address)

1. **electron-store同期の詳細設計**
   - 同期トリガー（保存時即時/アプリ起動時のみ）を明確化
   - 競合時の優先ルール（ファイル優先推奨）を決定
   - タスク4.1に詳細実装を追加

2. **並列実行のリソース制限**
   - 最大同時Agent数の設定を追加（または無制限と明記）
   - リソース枯渇時の挙動（キュー待機/エラー）を決定

3. **キュー可視化UIの方針決定**
   - 必要と判断した場合はUIコンポーネントとタスクを追加
   - 不要と判断した場合はOpen Questionsから削除し「Out of Scope」へ移動

4. **エラー通知UIの具体化**
   - トースト通知、ダイアログ、またはステータスバー表示のいずれかを選択
   - 既存の通知パターンに準拠するコンポーネントを特定

### Suggestions (Nice to Have)

1. **ログフォーマットの明示**
   - steering/logging.mdに準拠したスケジュール実行ログのフォーマット例を設計に追加

2. **ScheduleTaskHeader/Footerのタスク分割**
   - 現在タスク5.1に含まれているが、複雑であれば個別タスク化を検討

3. **プロンプト文字数制限の追加**
   - 極端に長いプロンプトによるパフォーマンス問題を防止

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|-------------------|-------------------|
| Critical | Remote UI対応方針未定義 | requirements.mdに「Remote UI対応: 不要（Desktop専用機能）」を追加、または対応する場合はdesign.mdとtasks.mdを拡張 | requirements.md, design.md, tasks.md |
| Warning | electron-store同期詳細不足 | design.md DD-004に競合解決ルールを追記、tasks.md 4.1に詳細サブタスク追加 | design.md, tasks.md |
| Warning | 並列実行制限なし | requirements.md 5.5に「最大同時実行数」の記載追加、または無制限と明記 | requirements.md, design.md |
| Warning | キュー可視化UI未対応 | Open Questionsを解決（必要ならタスク追加、不要ならOut of Scopeへ移動） | requirements.md, tasks.md |
| Warning | エラー通知UI未設計 | design.md Error Handlingに具体的なUIコンポーネント（既存通知パターン）を追記 | design.md |
| Info | ログフォーマット未定義 | design.mdにlogging.md準拠のログフォーマット例を追加 | design.md |
| Info | アイドル同期頻度未定義 | design.md DD-002に同期間隔（推奨: 10秒）を追記 | design.md |
| Info | プロンプト長制限未定義 | requirements.md 5.1に最大文字数を追加（推奨: 10,000文字） | requirements.md |

---

_This review was generated by the document-review command._
