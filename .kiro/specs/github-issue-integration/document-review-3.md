# Specification Review Report #3

**Feature**: github-issue-integration
**Review Date**: 2026-03-06
**Documents Reviewed**:
- `spec.json`
- `requirements.md`
- `design.md`
- `tasks.md`
- `research.md`
- `document-review-1.md` + `document-review-1-reply.md`（修正適用済み）
- `document-review-2.md` + `document-review-2-reply.md`（修正適用済み）
- `.kiro/steering/product.md`
- `.kiro/steering/tech.md`
- `.kiro/steering/structure.md`

**Review Context**: Review #1（14件）およびReview #2（11件）の修正が適用済み。本レビューはReview #2修正後のドキュメントに対する最終検証および残存課題の確認を行う。

## Executive Summary

Review #1, #2の修正が適正に適用されていることを確認。重大なドキュメント不整合は解消されている。残存するのは未解決のNeeds Discussion項目（2件）、Steeringドキュメントとの整合性に関する軽度の問題、および実装時に具体化すべき設計詳細である。

| Severity | Count |
|----------|-------|
| CRITICAL | 0 |
| WARNING | 4 |
| INFO | 4 |

## 1. Document Consistency Analysis

### 1.1 Requirements <-> Design Alignment

全12 Requirements（46 acceptance criteria）がdesign.md Requirements Traceabilityテーブルに網羅されていることを確認。Review #2で指摘された不整合は解消済み。

**検出事項なし** - 良好な整合性を維持。

### 1.2 Design <-> Tasks Alignment

Review #2修正の反映を確認:
- `IssueRouterProcedures` に `getPRFiles` Query追加済み OK
- Task 3.4, 4.2, 8.2 に `getPRFiles` 関連記述追加済み OK
- Task 12.2 に `remote-ui/App.tsx` 配線更新追加済み OK
- `IssuePane` 依存に PRListView/PRDetailView追加済み OK
- `GitHubApiService` に PAT取得フォールバック設計追記済み OK

**検出事項なし** - Review #2の修正が正しく反映。

### 1.3 Design <-> Tasks Completeness

| Category | Design Definition | Task Coverage | Status |
|----------|-------------------|---------------|--------|
| UI Components | 10コンポーネント | Tasks 7-9, 12.3 | OK |
| Services | GitHubApiService, GitHubCredentialService | Tasks 2-3 | OK |
| tRPC | issueRouter (26 procedures) | Tasks 4.1-4.4 | OK |
| Store | issueStore (shared) | Task 6.1 | OK |
| Scripts | gh-issue.sh | Task 5.1 | OK |
| Commands | 4 slash commands | Tasks 10.1-10.4 | OK |
| WebSocket | Issue追加 + Bug削除 | Tasks 12.1, 14.4 | OK |
| Cleanup | Bug関連全削除 | Tasks 13.1-13.6 | OK |
| Wiring | 配線更新 | Tasks 14.1-14.7 | OK |

**検出事項なし** - 全カテゴリでカバレッジ確認済み。

### 1.4 Acceptance Criteria -> Tasks Coverage

Coverage Matrixの全46基準を検証。各基準にFeature/Infrastructure両タイプのタスクが割り当てられていることを確認。

| Criterion | Summary | Mapped Task(s) | Task Type | Status |
|-----------|---------|----------------|-----------|--------|
| 1.1-1.6 | GitHub認証・接続 | 2.1, 3.1, 3.5, 4.3, 9.1 | Infrastructure + Feature | OK |
| 2.1-2.6 | Issueペイン | 4.1, 6.1, 7.1-7.2, 14.2 | Feature + Wiring | OK |
| 3.1-3.4 | Issue作成 | 3.2, 4.1, 7.4 | Infrastructure + Feature | OK |
| 4.1-4.3 | ステータスLabel | 1.1, 3.3 | Infrastructure | OK |
| 5.1-5.4 | ブランチ作成・実装モード | 4.4, 7.3 | Feature | OK |
| 6.1-6.5 | Slash Commands | 10.1-10.4, 13.4, 14.6 | Feature + Cleanup | OK |
| 7.1-7.5 | gh-issue.sh | 5.1 | Feature | OK |
| 8.1-8.5 | PR連携 | 3.4, 4.2, 8.1-8.2 | Infrastructure + Feature | OK |
| 9.1-9.4 | Agent連携 | 6.1, 11.1-11.2 | Feature | OK |
| 10.1-10.10 | Bug廃止 | 13.1-13.6, 14.1-14.5 | Cleanup + Wiring | OK |
| 11.1-11.5 | Remote UI | 12.1-12.3 | Feature + Infrastructure | OK |
| 12.1-12.4 | プロジェクト設定 | 9.1 | Feature | OK |

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
| Agent + Issue Context | Req 9 (agentProcess拡張) | 15.4 | OK |
| WebSocket Issue Sync | Remote UI通信 | (なし) | WARNING |

**Validation Results**:
- [x] Design内の3シーケンス図に対応するIntegration Testあり
- [x] Agent+IssueコンテキストのIntegration Testが追加済み
- [ ] WebSocket経由のIssue同期テストが未定義（Review #1から継続）

### 1.6 Refactoring Integrity Check

| Check | Validation | Status |
|-------|------------|--------|
| Deletion Tasks | Bug関連ファイルの物理削除（Tasks 13.1-13.6） | OK |
| Consumer Updates（tRPC） | router.ts, context.ts, productionServices.ts（Task 14.1） | OK |
| Consumer Updates（Renderer） | App.tsx, stores, DocsTabs, MobileLayout（Task 14.2） | OK |
| Consumer Updates（Shared） | shared/stores/index.ts, shared/api/types.ts（Task 14.3） | OK |
| Consumer Updates（Main） | projectSetup, watcherUtils, events, autoExecution等（Task 14.4） | OK |
| Consumer Updates（Remote UI） | DesktopLayout（Task 12.2）, App.tsx（Task 12.2）| OK |
| Steering Updates | product.md, structure.md, tech.md（Task 14.7） | OK |

全Wiring Pointsに対応するタスクが存在することを確認。Review #2 C-01（remote-ui/App.tsxタスク欠落）は解消済み。

### 1.7 Cross-Document Contradictions

#### WARNING [W-01]: Steering product.md とSpecドキュメントの不一致

`product.md` Core Capability #4: "バグ修正ワークフロー: 軽量なバグ修正フロー（create -> analyze -> fix -> verify）"
`product.md` ワークフローパターン: "バグ修正: 軽量ワークフロー create -> analyze -> fix -> verify"

本Specの Requirement 10 は既存Bugワークフローの完全廃止を定義している。Task 14.7でSteering更新が計画されているが、**Task 14.7の実行順序が実装後（Task 13-14の後）であるため、実装フェーズ中にSteeringとSpecの矛盾が存在する状態が続く**。これ自体は実装には影響しないが、Steeringを参照する他のSpecやAgentが混乱する可能性がある。

#### WARNING [W-02]: Requirements Open Questionsが未解決のまま残存

requirements.md Open Questionsに以下3件が残存:
1. `scripts/gh-issue.sh` は `gh` CLI依存にするか、`curl` + PATで自己完結にするか
2. Issueリストのポーリング間隔
3. ダイレクトモードでの実装時、PR作成は任意とするか

項目1はdesign.md DD-005で「`gh` CLI使用」と決定済み。項目2はdesign.md issueStoreで「60秒ポーリング」と決定済み。しかしrequirements.md Open Questionsセクションが更新されておらず、決定済み事項がOpen Questionとして残っている。項目3はReview #1 W-05から継続する未解決項目。

## 2. Gap Analysis

### 2.1 Technical Considerations

#### WARNING [W-03]: WebSocket経由のIssue同期統合テストの欠落（継続）

Review #1 W-07、Review #2 1.5から継続。Remote UIからのIssue/PR操作（WebSocketApiClient → webSocketHandler → GitHubApiService）のend-to-endフローを検証する統合テストがない。

Tasks 12.1でWebSocketハンドラの実装は定義されているが、統合テストタスクがない。Design "Integration Test Strategy" セクションにもWebSocket経路のテスト定義がない。

**Impact**: WebSocket経由のIssue操作が正しく動作することの検証が手動テストのみに依存。

**Fallback Strategy確認**: E2Eテスト（Tasks 15.5-15.7）がElectron UI経由のテストとして存在するが、Remote UI（WebSocket）経由のE2Eは定義されていない。ただしTasks 15.5-15.7は `[ ]*` マーク（optional）であり、明示的なフォールバック戦略とは言えない。

#### INFO [I-01]: gh CLI未インストール時のSlash Commandsエラーハンドリング

design.md DD-005のConsequences: "`gh` CLI未インストール時はSlash Commandsが使用不可（UIは影響なし）"
Task 5.1: "`gh` CLI未インストール時の明確なエラーメッセージ"

設計としては記載されているが、Slash Commandsが `gh` CLI不在で失敗した場合にUIからはどのように見えるかの記述がない。Agentがissue-analyzeコマンドを実行してgh未検出エラーになった場合のリカバリーパスが不明確。

### 2.2 Operational Considerations

#### INFO [I-02]: Label自動作成のタイミングと競合

design.md: "初回接続時にリポジトリのLabel一覧を確認し、不足分の `status:*` Labelを自動作成"

複数ユーザーが同時に初回接続した場合のLabel作成競合、およびリポジトリに既に `status:` プレフィックスのカスタムLabelが存在する場合の振る舞いが未定義。GitHub APIのLabel作成は冪等ではない（既存Label作成で422エラー）。

## 3. Ambiguities and Unknowns

### 3.1 未解決のOpen Questions（継続）

1. **ダイレクトモードPR作成** - Review #1 W-05、Review #2 W-03から継続。実装フェーズで決定可能だがOpen Questionとして明記すべき
2. **WebSocket PRメッセージタイプスコープ** - Review #1 W-08から継続

### 3.2 新たな曖昧点

#### INFO [I-03]: Agent entityIdパターン移行の後方互換性

design.md Interface Changes: `bug:{bugId}` パターンを `issue:{issueNumber}` に置換
structure.md Agent Category Rules: `bug:{bugId}` → `bugs` カテゴリ

`.kiro/runtime/agents/bug:*` ディレクトリに既存のAgent記録が存在する場合の取り扱いが未定義。実質的に既存Bug Agent記録が残存する可能性があるが、マイグレーションタスクがない。Review #1 S-03で "影響限定的" と判定されたが、孤立ディレクトリが残る可能性は認識すべき。

## 4. Steering Alignment

### 4.1 Architecture Compatibility

- **tRPCパターン**: Context DI / EventBus / Zodバリデーション準拠 OK
- **State管理ルール**: issueStoreをshared/stores/に配置（Domain State SSOT） OK
- **Process Boundary**: safeStorage/APIはMain Process、RendererはtRPC経由 OK
- **Component Organization**: shared/components/issue/に共有コンポーネント配置 OK
- **Re-export Pattern**: renderer/components/index.tsからの再export計画（Task 14.2） OK

### 4.2 Integration Concerns

#### WARNING [W-04]: structure.md の現在のAgent Category Rulesとの不整合

structure.md（現行）:
```
| `bug:{bugId}` | bugs | `runtime/agents/bug:{bugId}/` |
```

本Specでは `issue:{issueNumber}` への置換を計画（Task 14.3, 14.7）。Steeringの更新（Task 14.7）が実装タスクの最後にあるため、実装中にstructure.mdを参照するAgentが旧パターンを使用するリスクがある。

ただしTask 14.3（Shared層配線更新）で `agentStore` のパターン変更が行われるため、実装コードとSteeringの同時更新が可能。深刻なリスクではないが、Task実行順序として14.7をTask 14.3と同時期に実行することを推奨。

### 4.3 Migration Requirements

- 既存データ: `.kiro/bugs/` マイグレーション不要（確認済み）
- コマンドセット: `sdd-orchestrator.json` 更新 OK（Task 14.5）
- Agent記録: `bug:` prefix残存可能性あり（I-03参照、影響限定的）

## 5. Recommendations

### Critical Issues (Must Fix)

なし。Review #1, #2で指摘されたCritical issuesは全て解消済み。

### Warnings (Should Address)

1. **[W-01] Steering product.mdとの不一致**: Task 14.7の実行をなるべく早期に行うか、または実装開始前にSteeringの事前更新を検討
2. **[W-02] Open Questionsの整理**: requirements.md Open Questionsセクションから決定済み事項（`gh` CLI使用、60秒ポーリング）を削除し、Resolved Questionsに移動
3. **[W-03] WebSocket Issue同期テストの欠落（継続）**: Task 15にRemote UI WebSocket経由の統合テスト（またはE2Eテスト）を追加するか、手動テスト計画として明記
4. **[W-04] Steering更新タイミング**: Task 14.7をTask 14.3と同時期に実行し、Steeringと実装コードの同期を確保

### Suggestions (Nice to Have)

1. **[S-01] Label作成の冪等性対応**: `ensureStatusLabels` で422エラー（Label既存）をgracefulに処理する設計をdesign.mdに追記
2. **[S-02] Agent entityId移行のクリーンアップ**: 孤立する `runtime/agents/bug:*` ディレクトリの手動クリーンアップ手順をドキュメント化
3. **[S-03] gh CLI不在時のUI表示**: Slash Commandsが `gh` CLI不在で失敗した場合のAgent実行結果のUI表示方法を検討
4. **[S-04] issueRouter SRP改善（継続）**: Review #2 S-01から継続。将来のリファクタリング候補として記録

## 6. Action Items

| Priority | ID | Issue | Recommended Action | Affected Documents |
|----------|-----|-------|-------------------|-------------------|
| WARNING | W-01 | Steering product.mdとの不一致 | Task 14.7の早期実行を検討、または事前更新 | tasks.md |
| WARNING | W-02 | Open Questions整理 | 決定済み事項をResolved Questionsに移動 | requirements.md |
| WARNING | W-03 | WebSocket統合テスト欠落 | Task 15にWebSocket経由テスト追加または手動テスト計画明記 | tasks.md, design.md |
| WARNING | W-04 | Steering更新タイミング | Task 14.7をTask 14.3と同時期に実行 | tasks.md |
| INFO | S-01 | Label作成冪等性 | ensureStatusLabelsの422エラーハンドリング追記 | design.md |
| INFO | S-02 | Agent entityId移行クリーンアップ | 孤立ディレクトリの手動クリーンアップ手順 | design.md |
| INFO | S-03 | gh CLI不在時のUI表示 | 失敗時のリカバリーパス検討 | design.md |
| INFO | S-04 | issueRouter SRP改善 | 将来のリファクタリング候補として記録 | (なし) |

---

_This review was generated by the document-review command._
