# Specification Review Report #2

**Feature**: github-issue-integration
**Review Date**: 2026-03-06
**Documents Reviewed**:
- `spec.json`
- `requirements.md`
- `design.md`
- `tasks.md`
- `research.md`
- `document-review-1.md` + `document-review-1-reply.md`（修正適用済み）
- `.kiro/steering/product.md`
- `.kiro/steering/tech.md`
- `.kiro/steering/structure.md`

**Review Context**: Review #1で検出された14件の指摘のうち、7件のFix Requiredが適用済み。本レビューはその修正後のドキュメントに対する再検証および追加検出を行う。

## Executive Summary

Review #1の修正が適正に適用されていることを確認。ただし、修正で追加された内容に起因する新たな不整合と、Review #1では検出されなかった追加の問題が見つかった。

| Severity | Count |
|----------|-------|
| CRITICAL | 2 |
| WARNING | 6 |
| INFO | 3 |

## 1. Document Consistency Analysis

### 1.1 Requirements <-> Design Alignment

Review #1で指摘のなかった良好な整合性は維持されている。Req 7.3の修正も正しく反映済み。

**検出事項なし** - 良好な整合性を維持。

### 1.2 Design <-> Tasks Alignment

Review #1からの改善を確認:
- Task 14.4に `webSocketHandler.ts` のBug削除が追加済み OK
- Task 14.2に `MobileLayout.tsx` の更新が追加済み OK
- Task 14.7 Steering更新タスクが追加済み OK
- Task 15.4 Agent+Issue統合テストが追加済み OK

**検出事項なし** - Review #1の修正が正しく反映。

### 1.3 Design <-> Tasks Completeness

| Category | Design Definition | Task Coverage | Status |
|----------|-------------------|---------------|--------|
| UI Components | 10コンポーネント | Tasks 7-9, 12.3 | OK |
| Services | GitHubApiService, GitHubCredentialService | Tasks 2-3 | OK |
| tRPC | issueRouter (25+ procedures) | Tasks 4.1-4.4 | OK |
| Store | issueStore (shared) | Task 6.1 | OK |
| Scripts | gh-issue.sh | Task 5.1 | OK |
| Commands | 4 slash commands | Tasks 10.1-10.4 | OK |
| WebSocket | Issue追加 + Bug削除 | Tasks 12.1, 14.4 | OK |
| **getPRFiles** | **design.mdに新規追加** | **Task未追加** | **NG** |

### 1.4 Acceptance Criteria -> Tasks Coverage

Review #1で全46基準がOKと確認され、修正後も維持。Coverage Matrixの更新も確認済み。

**Validation Results**:
- [x] 全criterion IDがrequirements.mdからマッピング済み
- [x] ユーザー向け基準にFeature Implementationタスクあり
- [x] Infrastructureのみに依存する基準なし

### 1.5 Integration Test Coverage

| Integration Point | Design Section | Test Task | Status |
|-------------------|----------------|-----------|--------|
| Issue CRUD Flow | "Issue CRUD Flow" | 15.1 | OK |
| PR Creation & Merge | "PR Creation and Merge Flow" | 15.2 | OK |
| Credential Flow | "Credential Flow" | 15.3 | OK |
| Agent + Issue Context | Req 9 (agentProcess拡張) | 15.4 | OK (Review #1修正で追加) |
| WebSocket Issue Sync | Remote UI通信 | (なし) | WARNING (前回から未解決) |

**Validation Results**:
- [x] Design内の3シーケンス図に対応するIntegration Testあり
- [x] Agent+IssueコンテキストのIntegration Testが追加済み
- [ ] WebSocket経由のIssue同期テストが未定義（Review #1 W-07の部分的解決のみ）

### 1.6 Refactoring Integrity Check

#### CRITICAL: Bug廃止における消費者更新の完全性

Design `Integration & Deprecation Strategy` の "削除対象ファイル" と "Wiring Points" を突合した結果:

| Check | Validation | Status |
|-------|------------|--------|
| Deletion Tasks | Bug関連ファイルの物理削除タスク（Tasks 13.1-13.6） | OK |
| Consumer Updates（tRPC） | `router.ts`, `context.ts`, `productionServices.ts` | OK (Task 14.1) |
| Consumer Updates（Renderer） | `App.tsx`, stores, `DocsTabs.tsx`, `MobileLayout.tsx` | OK (Task 14.2) |
| Consumer Updates（Shared） | `shared/stores/index.ts`, `shared/api/types.ts` | OK (Task 14.3) |
| Consumer Updates（Main） | `projectSetup.ts`, `watcherUtils.ts`, `events.ts`, `autoExecution.ts`, `windowManager.ts`, `remoteAccessSetup.ts`, `webSocketHandler.ts` | OK (Task 14.4) |
| **Consumer Updates（Remote UI App.tsx）** | **Design Wiring Points: "remote-ui/App.tsx: Bug関連import削除"** | **Task未定義** |

Design Wiring Pointsテーブルに `src/remote-ui/App.tsx | Bug関連import削除、Issue関連追加` が記載されているが、Tasks 12.2（DesktopLayout）や14.2（Renderer配線）のいずれにも `remote-ui/App.tsx` の更新が含まれていない。

### 1.7 Cross-Document Contradictions

#### CRITICAL: Design追加のgetPRFilesメソッドがTasksに反映されていない

Review #1 Reply (W-03) で `GitHubApiService` に `getPRFiles` メソッドと `PRFile` 型が追加された。しかし:

- design.md: `getPRFiles(projectPath, number): Promise<Result<PRFile[], GitHubApiError>>` が `GitHubApiService` インターフェースに追加済み
- design.md: `issueRouter` に `getPRFiles` 相当のQueryが未追加
- tasks.md: Task 3.4（PR操作実装）に `getPRFiles` の記述なし
- tasks.md: Task 4.2（PR関連tRPC）に `getPRFiles` Queryの記述なし
- tasks.md: Task 8.2（PRDetailView）は "変更diff表示" とあるが `getPRFiles` 呼び出しへの言及なし

Design側でインターフェースは追加されたが、それを呼び出すtRPCプロシージャと実装タスクが追従していない。

#### WARNING: issueRouter procedures定義にgetPRFilesが欠落

design.md `IssueRouterProcedures` インターフェース（行576-600）に `getPRFiles` クエリが含まれていない。しかし `GitHubApiService` インターフェース（行453）には定義済み。tRPCルーターがこのメソッドを公開しない場合、Renderer/RemoteUIからPRファイル一覧を取得できない。

#### WARNING: PRDetailViewのUI説明文で追加されたdiff方式の記述位置

design.md UI Components Summaryテーブル（行720）にPRDetailViewの説明が追加されたが、この説明はテーブルのNotes列に詰め込まれており、本来はComponents and Interfacesセクションに詳細ブロックとして記述すべき内容（APIエンドポイント、データフロー、描画方式）が含まれている。情報としては正しいが、ドキュメント構造の一貫性が低下。

## 2. Gap Analysis

### 2.1 Technical Considerations

#### WARNING: safeStorage非対応環境のフォールバック未設計

design.md DD-004（safeStorage PAT保存）のConsequences: "Linux環境ではSecret Serviceの設定が必要な場合がある"。
research.md Risks: "safeStorage APIがLinux環境でSecret Service未設定時に失敗 → Mitigation: `isEncryptionAvailable()` チェック。フォールバックとして `GITHUB_TOKEN` 環境変数をサポート"

しかし:
- `GitHubCredentialService` インターフェースにフォールバック機構がない
- `GitHubApiService.testConnection` は `GitHubCredentialService.getToken` がnull時のフォールバック先として `GITHUB_TOKEN` 環境変数を参照する設計が未定義
- Tasksにもフォールバック実装のタスクなし

#### WARNING: Review #1未解決のNeeds Discussion項目（W-05, W-08）

Review #1 Replyで "Needs Discussion" と判定された以下2件が、ドキュメントに反映されていない:

1. **W-05: ダイレクトモードPR動作** - Requirements Open Questionのまま。暫定案「手動トリガーのみ」が提案されたが、requirements.md/design.md/tasks.mdに反映なし
2. **W-08: WebSocket PRメッセージタイプ** - Remote UIからのPR操作スコープが未決定

これらは実装開始前に決定が必要。

#### WARNING: tRPC issueRouterのプロシージャ数の妥当性

design.md `IssueRouterProcedures` に25+プロシージャが定義されている。既存の最大ルーターは `specRouter` で約20プロシージャ。`issueRouter` はIssue/PR/Label/Credentialの4ドメインを1ルーターに集約しており、Single Responsibility Principleの観点で分割を検討すべき。

特に `Credentials` セクション（setGitHubToken, removeGitHubToken, setEnterpriseUrl）は `issueRouter` の責務から外れており、別ルーター（`githubRouter` または `credentialRouter`）への分離が妥当。

### 2.2 Operational Considerations

#### INFO: E2Eテスト環境でのGitHub APIモック方式が未定義

Tasks 15.5-15.7のE2Eテストは "GitHubApiServiceモック環境" と記載されているが、E2Eテスト（WebdriverIO）でMain Processのサービスをどうモックするかのアーキテクチャ設計がない。既存のE2EテストはMock Claude CLIを使用するパターンだが、GitHub APIモックは異なるアプローチが必要。

## 3. Ambiguities and Unknowns

### 3.1 未解決のOpen Questions（継続）

1. **ダイレクトモードPR作成** - Review #1 W-05から未解決。実装開始前の決定が推奨
2. **WebSocket PRメッセージタイプスコープ** - Review #1 W-08から未解決

### 3.2 新たな曖昧点

1. **IssueとPRの表示位置関係**: design.md IssuePane行「IssueList + Detail + PR統合」、PRListView行「IssueListPanel内のサブタブ」— IssuePaneがIssueListとPRListを包含する構造は理解できるが、PRListViewがIssuePaneのサブタブなのかIssueListPanelのサブタブなのかで記述が矛盾。UI Components Summaryテーブルでは "IssueListPanel内のサブタブ" だが、Components and Interfacesテーブルの `IssuePane` は "IssueListPanel (P0), IssueDetailView (P0)" のみ依存しPRListViewへの依存が明示されていない

2. **ポーリングのライフサイクル管理**: issueStore説明に "60秒間隔ポーリング" とあるが、ポーリングの開始タイミング（Issuesタブ表示時? プロジェクト選択時?）と停止タイミング（タブ切替時? アプリ非アクティブ時?）が未定義。不要なAPIコールによるレート制限消費に影響

## 4. Steering Alignment

### 4.1 Architecture Compatibility

- **tRPCパターン**: 既存Context DI / EventBus / Zodバリデーションを踏襲 OK
- **State管理ルール**: issueStoreをshared/stores/に配置（Domain State SSOT） OK
- **Process Boundary**: safeStorage/APIはMain Process、RendererはtRPC経由 OK
- **Component Organization**: shared/components/issue/に共有コンポーネント配置 OK

### 4.2 Integration Concerns

#### WARNING: steering/structure.md の更新内容の具体性

Task 14.7でSteering更新が追加されたが、`structure.md` の更新範囲が広い:
- `shared/components/bug/` → `shared/components/issue/`（行38, 179）
- `bugStore`, `bugAutoExecutionStore` → `issueStore`（行41, 57）
- `bug:{bugId}` → `issue:{issueNumber}`（行252, 262-268）
- `bugService.ts` → 削除（行306）
- tRPCルーター一覧の `bug.ts` → `issue.ts`（行326）

これらの更新は単純な文字列置換ではなく、構造的な変更を含む。Task 14.7の記述が "product.md, structure.md, tech.mdの更新" と抽象的すぎ、具体的な変更内容が列挙されていない。

### 4.3 Migration Requirements

- 既存データ: `.kiro/bugs/` マイグレーション不要（前回確認済み）
- コマンドセット: `sdd-orchestrator.json` 更新 OK（Task 14.5）
- Agent記録: `bug:` prefix → `issue:` prefix。Review #1 S-03で "影響限定的" と判定済み

## 5. Recommendations

### Critical Issues (Must Fix)

1. **[C-01] remote-ui/App.tsx更新タスクの追加**: Design Wiring Pointsに記載されている `remote-ui/App.tsx` のBug→Issue更新がTasksに欠落。Task 12.2またはTask 14.2にRemote UI App.tsxの配線更新を追加
2. **[C-02] getPRFilesのtRPC公開とタスク追加**: design.mdの `IssueRouterProcedures` に `getPRFiles` Queryを追加し、tasks.mdのTask 3.4とTask 4.2に `getPRFiles` の実装を追記

### Warnings (Should Address)

1. **[W-01] issueRouterのgetPRFiles Query欠落**: design.md `IssueRouterProcedures` インターフェースに `getPRFiles` を追加
2. **[W-02] safeStorage非対応環境のフォールバック設計**: `GitHubApiService` または `GitHubCredentialService` に `GITHUB_TOKEN` 環境変数フォールバックを設計に追記
3. **[W-03] Needs Discussion項目の決定**: W-05（ダイレクトモードPR）とW-08（WebSocket PRスコープ）を実装開始前に決定し、ドキュメントに反映
4. **[W-04] PRListViewの親コンポーネント明確化**: IssuePaneの依存関係にPRListView/PRDetailViewを追加し、サブタブ構造を明確化
5. **[W-05] ポーリングライフサイクル設計**: issueStoreのポーリング開始/停止条件をdesign.mdに追記
6. **[W-06] Task 14.7 Steering更新の具体化**: 更新対象ファイルごとの変更内容を列挙

### Suggestions (Nice to Have)

1. **[S-01] issueRouterの責務分割検討**: Credential管理プロシージャを `githubRouter` 等に分離し、SRP準拠を改善
2. **[S-02] E2EテストのGitHub APIモック戦略**: E2Eテスト環境でのサービスモック方式を設計に追記
3. **[S-03] PRDetailView詳細ブロック追加**: UI Components Summaryテーブルに詰め込まれた仕様をComponents and Interfacesセクションに移動

## 6. Action Items

| Priority | ID | Issue | Recommended Action | Affected Documents |
|----------|-----|-------|-------------------|-------------------|
| CRITICAL | C-01 | remote-ui/App.tsx更新タスク欠落 | Task 12.2にremote-ui/App.tsxのBug→Issue更新を追加 | tasks.md |
| CRITICAL | C-02 | getPRFilesのtRPC公開+タスク未追加 | IssueRouterProceduresにgetPRFiles追加、Task 3.4/4.2に実装追記 | design.md, tasks.md |
| WARNING | W-01 | issueRouter getPRFiles Query欠落 | IssueRouterProceduresにgetPRFiles追加（C-02と統合） | design.md |
| WARNING | W-02 | safeStorage非対応フォールバック | GITHUB_TOKEN環境変数フォールバックを設計追記 | design.md |
| WARNING | W-03 | Needs Discussion未解決（2件） | ユーザーに方針確認、決定後にドキュメント反映 | requirements.md, design.md, tasks.md |
| WARNING | W-04 | PRListViewの親コンポーネント曖昧 | IssuePane依存にPRListView/PRDetailView追加 | design.md |
| WARNING | W-05 | ポーリングライフサイクル未定義 | 開始/停止条件をissueStore設計に追記 | design.md |
| WARNING | W-06 | Task 14.7の具体性不足 | 各ファイルの変更内容を列挙 | tasks.md |
| INFO | S-01 | issueRouter SRP改善 | Credential分離を検討（将来） | design.md |
| INFO | S-02 | E2E GitHub APIモック戦略 | テスト環境設計を追記 | design.md |
| INFO | S-03 | PRDetailView仕様の構造改善 | 詳細ブロックをComponents and Interfacesに移動 | design.md |

---

_This review was generated by the document-review command._
