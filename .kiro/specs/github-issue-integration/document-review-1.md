# Specification Review Report #1

**Feature**: github-issue-integration
**Review Date**: 2026-03-06
**Documents Reviewed**:
- `spec.json`
- `requirements.md`
- `design.md`
- `tasks.md`
- `research.md`
- `.kiro/steering/product.md`
- `.kiro/steering/tech.md`
- `.kiro/steering/structure.md`

## Executive Summary

全体的に高品質な仕様書セット。12要件・46受入基準を網羅する設計とタスクが定義されており、トレーサビリティマトリクスも充実している。ただし、いくつかの重要なギャップと矛盾が検出された。

| Severity | Count |
|----------|-------|
| CRITICAL | 1 |
| WARNING | 8 |
| INFO | 5 |

## 1. Document Consistency Analysis

### 1.1 Requirements <-> Design Alignment

全12要件（46受入基準）がDesignのRequirements Traceabilityテーブルに網羅されている。各基準に対応するコンポーネント名が具体的に記載され、実装アプローチ（新規/既存活用/削除）も明確。

**検出事項なし** - 良好な整合性。

### 1.2 Design <-> Tasks Alignment

Designに定義された全コンポーネントがTasksに反映されている:

- GitHubApiService → Task 3
- GitHubCredentialService → Task 2
- issueRouter → Task 4
- issueStore → Task 6
- UI Components (IssuePane, IssueListPanel, etc.) → Tasks 7-9
- gh-issue.sh → Task 5
- Slash Commands → Task 10
- Agent連携 → Task 11
- Remote UI → Task 12
- Bug廃止 → Task 13
- 結合・配線 → Task 14
- テスト → Task 15

**検出事項なし** - 良好な整合性。

### 1.3 Design <-> Tasks Completeness

| Category | Design Definition | Task Coverage | Status |
|----------|-------------------|---------------|--------|
| UI Components | IssuePane, IssueListPanel, IssueListItem, IssueDetailView, PRListView, PRDetailView, CreateIssueDialog, CreateIssueDialogRemote, GitHubSettingsSection, StatusLabelBadge | Tasks 7.1-7.4, 8.1-8.2, 9.1, 12.3 | OK |
| Services | GitHubApiService, GitHubCredentialService | Tasks 2.1, 3.1-3.5 | OK |
| tRPC | issueRouter | Tasks 4.1-4.4 | OK |
| Store | issueStore (shared) | Task 6.1 | OK |
| Scripts | gh-issue.sh | Task 5.1 | OK |
| Commands | issue-analyze, issue-fix, issue-verify, issue-ask | Tasks 10.1-10.4 | OK |
| WebSocket | webSocketHandler追加 | Task 12.1 | OK |
| **WebSocket** | **webSocketHandler Bug削除** | **未カバー** | **NG** |

### 1.4 Acceptance Criteria -> Tasks Coverage

| Criterion | Summary | Mapped Task(s) | Task Type | Status |
|-----------|---------|----------------|-----------|--------|
| 1.1 | PAT入力フィールド | 2.1, 4.3, 9.1 | Infra + Feature | OK |
| 1.2 | safeStorage暗号化保存 | 2.1, 2.2, 4.3 | Infra + Test | OK |
| 1.3 | Enterprise URL対応 | 3.1, 4.3, 9.1 | Infra + Feature | OK |
| 1.4 | owner/repo自動検出 | 3.1, 3.6, 9.1 | Infra + Feature | OK |
| 1.5 | 無効PAT時のエラー表示 | 3.5, 9.1 | Infra + Feature | OK |
| 1.6 | 接続テスト機能 | 3.5, 9.1, 15.3 | Feature + Test | OK |
| 2.1 | BugsタブをIssuesタブに置換 | 7.1, 14.2 | Feature + Wiring | OK |
| 2.2 | Open Issue一覧表示 | 4.1, 6.1, 7.2 | Feature | OK |
| 2.3 | フィルタ機能 | 6.1, 7.2 | Feature | OK |
| 2.4 | Issue詳細表示 | 4.1, 7.3 | Feature | OK |
| 2.5 | status: Label表示 | 6.1, 7.2, 7.3 | Feature | OK |
| 2.6 | ポーリング/手動リフレッシュ | 4.1, 6.1, 7.2 | Feature | OK |
| 3.1 | Issue作成UI | 7.4 | Feature | OK |
| 3.2 | API経由Issue作成 | 3.2, 4.1 | Infra + Feature | OK |
| 3.3 | status:triage自動付与 | 3.2, 4.1 | Feature | OK |
| 3.4 | 入力フィールド | 3.2, 7.4 | Feature | OK |
| 4.1 | 固定Label体系 | 1.1, 3.3 | Infra | OK (system-level) |
| 4.2 | Label自動更新 | 3.3, 4.1 | Feature | OK |
| 4.3 | Label自動作成 | 3.3 | Infra | OK (auto-triggered) |
| 5.1 | Worktreeブランチ作成 | 4.4 | Feature | OK |
| 5.2 | ダイレクトモード | 4.4 | Feature | OK |
| 5.3 | 実装モード選択UI | 7.3 | Feature | OK |
| 5.4 | ブランチ作成時Label更新 | 4.4 | Feature | OK |
| 6.1 | Slash Commands | 10.1-10.4 | Feature | OK |
| 6.2 | gh-issue.sh経由コンテキスト注入 | 10.1-10.4 | Feature | OK |
| 6.3 | 結果コメント自動投稿 | 10.1-10.4 | Feature | OK |
| 6.4 | Label自動更新 | 10.1 | Feature | OK (注1) |
| 6.5 | 旧bug-*廃止 | 13.4, 14.6 | Cleanup | OK |
| 7.1-7.5 | gh-issue.sh | 5.1 | Feature | OK |
| 8.1 | PR自動作成 | 3.4, 4.2 | Feature | OK |
| 8.2 | PR一覧表示 | 4.2, 8.1 | Feature | OK |
| 8.3 | PR diff・CIステータス | 4.2, 8.2 | Feature | OK |
| 8.4 | PRマージUI | 3.4, 4.2, 8.2 | Feature | OK |
| 8.5 | マージ時Label更新 | 3.4, 4.2 | Feature | OK |
| 9.1 | Issueコンテキスト注入 | 6.1, 11.1 | Feature | OK |
| 9.2 | Agent結果コメント投稿 | 11.2 | Feature | OK |
| 9.3 | 既存Agent起動UI使用 | 11.1 | Feature | OK |
| 9.4 | Agent実行中Label維持 | 11.2 | Feature | OK |
| 10.1-10.10 | Bug廃止 | 13.1-13.6, 14.1-14.5 | Cleanup + Wiring | OK |
| 11.1-11.4 | Remote UI | 12.1-12.3 | Feature | OK |
| 11.5 | WebSocketApiClient | 12.1 | Infra | OK |
| 12.1-12.4 | プロジェクト設定 | 9.1 | Feature | OK |

**注1**: 6.4（Label自動更新）はCoverage Matrixで10.1のみにマッピング。ワークフロー遷移図上、issue-analyzeが`status:in-progress`への遷移を担当し、他コマンド（fix, verify, ask）では遷移なしで問題ない。

**Validation Results**:
- [x] 全criterion IDが requirements.md からマッピング済み
- [x] ユーザー向け基準にFeature Implementationタスクあり
- [x] Infrastructureのみに依存する基準なし（system-level基準を除く）

### 1.5 Integration Test Coverage

| Integration Point | Design Section | Test Task | Status |
|-------------------|----------------|-----------|--------|
| Issue CRUD Flow | "Issue CRUD Flow" | 15.1 | OK |
| PR Creation & Merge | "PR Creation and Merge Flow" | 15.2 | OK |
| Credential Flow | "Credential Flow" | 15.3 | OK |
| Agent + Issue Context | Req 9 (agentProcess拡張) | (なし) | WARNING |
| WebSocket Issue Sync | Remote UI通信 | (なし) | WARNING |

**Validation Results**:
- [x] Design内の3シーケンス図に対応するIntegration Testあり
- [ ] Agent+Issueコンテキスト注入のIntegration Testが未定義
- [ ] WebSocket経由のIssue同期テストが未定義

**Fallback Strategy**: E2Eテスト（15.4-15.6）がUI経由で部分的にカバー。ただしAgent連携（Req 9）のE2Eテストは定義されていない。

### 1.6 Cross-Document Contradictions

#### CRITICAL: webSocketHandler.tsのBugハンドラ削除がタスク未定義

**矛盾箇所**:
- Design `Integration & Deprecation Strategy` Wiring Points: `src/main/services/webSocketHandler.ts | Bug関連メッセージハンドラ削除、Issue関連追加`
- Task 12.1: Issue/PRメッセージタイプの**追加**のみ記載
- Task 14.4: Main Processの配線更新リストに `webSocketHandler.ts` が**含まれていない**

Designでは `webSocketHandler.ts` に対して「Bug削除 + Issue追加」の2操作が必要と定義されているが、Tasksでは追加のみカバーされ、Bug関連ハンドラの削除が漏れている。

#### WARNING: Requirements 7.3のsafeStorage記述

**矛盾箇所**:
- Requirements 7.3: "PATをOS環境変数 or **safeStorage**から取得する"
- Design (gh-issue.sh): "`GITHUB_TOKEN` 環境変数優先、未設定時は `gh auth status` でフォールバック"

`scripts/gh-issue.sh` はBashスクリプトであり、Electron `safeStorage` APIにアクセスできない。Designの解決策（環境変数 + gh auth）が正しいが、Requirements側の記述が技術的に不正確。

## 2. Gap Analysis

### 2.1 Technical Considerations

#### WARNING: Issue/PRリストのページネーション未定義

GitHub REST APIはデフォルトで1ページ30件。`GitHubApiService.listIssues` / `listPullRequests` のインターフェースに `page` / `per_page` パラメータがなく、大量Issue/PRを持つリポジトリでは一覧が不完全になる。

#### WARNING: PRDetailViewのdiff表示方式未定義

Design: "PRDetailViewは変更diff表示" と記述があるが、具体的な取得方法（`diff_url` fetch? GitHub APIの `files` エンドポイント?）やレンダリング方式（syntax highlighting等）が未指定。既存のGit diff表示機能（`gitViewStore`）との関係も不明。

#### WARNING: MobileLayout更新の欠落

Requirements 11はRemote UI DesktopLayoutについて言及。Design Wiring Pointsに `MobileLayout.tsx` のDocsTab変更が記載されているが、Tasksには `MobileLayout` への言及が見当たらない。

#### WARNING: ダイレクトモードでのPR作成動作が未解決

Requirements Open Question: "ダイレクトモードでの実装時、PR作成は任意とするか、完了時に自動提案するか" — DesignでもTasksでも解決されていない。Task 4.4はWorktreeモードとダイレクトモードの実装を定義するが、ダイレクトモード完了後のPRフローが曖昧。

#### INFO: レート制限時のユーザーアクション動作

Design Error Strategyに`RATE_LIMIT`エラーと`retryAfter`が定義されているが、ユーザーがIssue作成等のmutationを実行中にレート制限に到達した場合の具体的なUI動作（リトライUI? エラー表示のみ?）が未定義。

### 2.2 Operational Considerations

#### WARNING: Steeringドキュメントの更新タスクなし

実装完了後、以下のSteeringドキュメントが陳腐化する:

| Steering File | 影響箇所 |
|---------------|----------|
| `product.md` | Core Capability #4 "バグ修正ワークフロー" → Issue連携に要更新 |
| `product.md` | Target Use Cases "軽量バグ修正" → 要更新 |
| `product.md` | ワークフローパターン "バグ修正" → 要更新 |
| `structure.md` | `shared/components/bug/` → `issue/` に要更新 |
| `structure.md` | `bugStore, bugAutoExecutionStore` → `issueStore` に要更新 |
| `structure.md` | Agent Category `bug:{bugId}` → `issue:{issueNumber}` に要更新 |
| `tech.md` | tRPCルーター一覧 `bug` → `issue` に要更新 |

Tasksに `product.md`, `structure.md`, `tech.md` の更新タスクが存在しない。

#### INFO: CLAUDE.mdテンプレート更新

Task 14.5でCLAUDE.mdテンプレートの更新は定義済み（Bug Fix → Issue Workflow）。ただし、現在のCLAUDE.mdインスタンス（各プロジェクトにコピーされたもの）は次回コマンドセット更新時に反映される。

## 3. Ambiguities and Unknowns

### 3.1 未解決のOpen Questions

Requirements末尾のOpen Questionsのうち、以下がDesignで解決されていない:

1. **ダイレクトモードPR作成**: "ダイレクトモードでの実装時、PR作成は任意とするか、完了時に自動提案するか" — Designに明示的な回答なし

以下は解決済み:
- `gh` CLI vs `curl`: Design DD-005で `gh` CLI採用を決定
- ポーリング間隔: Design issueStore説明で60秒と記載

### 3.2 曖昧な記述

1. **Req 9.3**: "既存のAgent起動UIを使用し、Issueコンテキスト注入を追加する形式" — 具体的にどのUIコンポーネントのどの箇所にIssueコンテキスト選択UIを追加するかが不明。Designでは "AgentListPanel: 既存UI活用（変更なし）" とあり、UIへの変更なしでコンテキスト注入が行われる設計だが、ユーザーはどのIssueをAgentに渡すかをどう選択するのか（選択中のIssueが自動的に渡される?）。

2. **Task 12.1のWebSocketメッセージタイプ**: 5つのメッセージタイプが列挙されているが、PR詳細取得（`GET_PR_DETAIL`）やPRマージ（`MERGE_PR`）が含まれていない。Remote UIからPR操作は可能か?

## 4. Steering Alignment

### 4.1 Architecture Compatibility

- **tRPCパターン**: 既存パターン（Context DI, EventBus, Zodバリデーション）を踏襲 OK
- **State管理ルール**: issueStoreをshared/stores/に配置（Domain State SSOT） OK
- **Process Boundary**: PATはMain Process（safeStorage）、APIもMain Process、RendererはtRPC経由 OK
- **Component Organization**: shared/components/issue/ に共有コンポーネント配置 OK
- **vanillaClient**: storeからのtRPC呼び出しはvanillaClient経由 OK

### 4.2 Integration Concerns

- **DocsTabs変更**: `DocsTab` 型から `'bugs'` 削除・`'issues'` 追加は型安全だが、全消費者（App.tsx, DesktopLayout, MobileLayout）の更新が必要。MobileLayoutのタスク漏れに注意（前述）
- **agentStore entityIdパターン**: `bug:{bugId}` → `issue:{issueNumber}` の変更はAgent記録の互換性に影響する可能性がある。既存の `runtime/agents/bug:*` ディレクトリのマイグレーションは不要か?（使われていないBug Agentは存在しない前提なら問題なし）

### 4.3 Migration Requirements

- **既存データ**: `.kiro/bugs/` ディレクトリのデータマイグレーションは不要（Requirements Decision Log: "使われていない機能を残す理由がない"）
- **コマンドセット**: `sdd-orchestrator.json` の `commandsets.bug` 削除 → 次回プロジェクト更新時にCLIコマンドが削除される
- **Agent記録**: 既存の `bug:` prefixのAgent記録がある場合の扱いが未定義（影響は限定的）

## 5. Recommendations

### Critical Issues (Must Fix)

1. **[C-01] webSocketHandler.ts Bugハンドラ削除タスク追加**: Task 14.4のファイルリストに `services/webSocketHandler.ts` を追加し、Bug関連メッセージハンドラの削除を明記する

### Warnings (Should Address)

1. **[W-01] Requirements 7.3修正**: "safeStorage" を "環境変数 `GITHUB_TOKEN` or `gh auth status`" に修正。bashスクリプトからsafeStorageは利用不可
2. **[W-02] ページネーション対応**: `IssueFilters` / `PRFilters` に `page`, `per_page` を追加。UIにページング or 無限スクロールの設計を追記
3. **[W-03] PRDetailView diff表示方式**: diff取得方法とレンダリング方式を明記。既存gitViewStoreとの関係を定義
4. **[W-04] MobileLayoutタスク追加**: Task 14.2または12.2にMobileLayout.tsxのBugs→Issues更新を追加
5. **[W-05] ダイレクトモードPR動作決定**: Open Questionを解決し、Design/Tasksに反映
6. **[W-06] Steering更新タスク追加**: product.md, structure.md, tech.mdの更新をTask 14に追加（or 別タスク）
7. **[W-07] Agent+Issue Integration Test**: Task 15にAgent実行時のIssueコンテキスト注入テストを追加
8. **[W-08] WebSocket PRメッセージタイプ**: Remote UIからのPR操作用メッセージタイプ（`GET_PR_DETAIL`, `MERGE_PR`等）をTask 12.1に追加

### Suggestions (Nice to Have)

1. **[S-01] owner/repo手動オーバーライド**: fork環境での誤検出対策（Research Risksで将来拡張として記載済み）
2. **[S-02] レート制限UI**: mutation実行中のレート制限到達時のUI動作を明記
3. **[S-03] 既存Agent記録マイグレーション**: `bug:` prefixのAgent記録が存在する場合のハンドリング
4. **[S-04] Req 9.3のUI動作明確化**: Issue選択状態がAgent実行にどう反映されるかの具体的なUI/UX仕様
5. **[S-05] `gh` CLI未インストール時のUI案内**: Design Research Risksに記載あるが、具体的なUI実装タスクなし

## 6. Action Items

| Priority | ID | Issue | Recommended Action | Affected Documents |
|----------|-----|-------|-------------------|-------------------|
| CRITICAL | C-01 | webSocketHandler.ts Bugハンドラ削除漏れ | Task 14.4にwebSocketHandler.tsを追加 | tasks.md |
| WARNING | W-01 | Requirements 7.3のsafeStorage記述 | "環境変数 or gh auth"に修正 | requirements.md |
| WARNING | W-02 | ページネーション未対応 | IssueFilters/PRFiltersにpage追加、UI設計追記 | design.md, tasks.md |
| WARNING | W-03 | diff表示方式未定義 | PRDetailViewのdiff取得・描画方式を設計に追記 | design.md |
| WARNING | W-04 | MobileLayoutタスク漏れ | Task 14.2にMobileLayout更新を追加 | tasks.md |
| WARNING | W-05 | ダイレクトモードPR動作未解決 | Open Questionを決定しDesign/Tasksに反映 | requirements.md, design.md, tasks.md |
| WARNING | W-06 | Steering更新タスクなし | product.md, structure.md, tech.md更新タスク追加 | tasks.md |
| WARNING | W-07 | Agent連携Integration Test欠落 | Task 15にAgent+Issue統合テスト追加 | tasks.md |
| WARNING | W-08 | WebSocket PRメッセージタイプ不足 | Task 12.1にPR操作用メッセージタイプ追加 | tasks.md, design.md |
| INFO | S-01 | owner/repo手動オーバーライド | 将来拡張として記録（対応不要） | - |
| INFO | S-02 | レート制限時UI動作 | Error Strategyにmutation時の動作を追記 | design.md |
| INFO | S-03 | 既存Agent記録マイグレーション | 影響評価し必要なら対応 | tasks.md |
| INFO | S-04 | Agent UI動作明確化 | Issue選択→Agent実行のUI/UX仕様明記 | design.md |
| INFO | S-05 | gh CLI未インストール時UI | インストールガイド表示のUI実装 | tasks.md |

---

_This review was generated by the document-review command._
