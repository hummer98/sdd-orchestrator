# Specification Review Report #2

**Feature**: git-diff-viewer
**Review Date**: 2026-01-27
**Documents Reviewed**: spec.json, requirements.md, design.md, tasks.md, research.md

## Executive Summary

レビュー結果: **CRITICAL: 5件 | WARNING: 3件 | INFO: 2件**

本仕様は全体的に高品質で、Requirements → Design → Tasksの一貫性が保たれています。ただし、以下の点で修正が必要です：

1. **CRITICAL**: Acceptance Criteria 2.2の実装タスクがTask 2.4のコンテナタスクのみで、具体的なFeature実装タスクが欠落
2. **CRITICAL**: worktree分岐元ブランチ検出(1.4)のFeatureタスクが欠落
3. **CRITICAL**: Integration Test Strategyに明記されているテスト6件のうち、tasks.mdに具体的な検証ポイントが記載されているのは1件のみ
4. **WARNING**: Design.mdのDD-003で「debounce時間を状況に応じて調整可能にする」と記載があるが、tasks.mdにこの実装タスクがない
5. **WARNING**: Remote UI対応のWebSocketブロードキャスト実装タスクがない

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**✅ 良好**: すべてのRequirementsがDesignでカバーされています。

- Requirement 1-12の全Acceptance CriteriaがDesign.md「Requirements Traceability」表に記載されている
- Design.mdの各コンポーネント定義がRequirementsと整合している
- 技術スタック選定(react-diff-view, refractor, chokidar)がRequirements 8.1, 2.1の要件を満たしている

### 1.2 Design ↔ Tasks Alignment

**⚠️ WARNING**: 一部のデザイン要素がタスクで未実装です。

| Design要素 | Tasks.md該当タスク | Status |
|-----------|------------------|--------|
| GitService | 2.1, 2.2 | ✅ カバー済み |
| GitFileWatcherService | 2.3, 2.4 | ⚠️ 2.4がコンテナタスクのみ |
| IPC Handlers | 3.1, 3.2, 3.3 | ✅ カバー済み |
| gitViewStore | 4.1 | ✅ カバー済み |
| CenterPaneContainer | 5.1, 5.2, 5.3 | ✅ カバー済み |
| GitView | 6.1 | ✅ カバー済み |
| GitFileTree | 7.1, 7.2, 7.3, 7.4 | ✅ カバー済み |
| GitDiffViewer | 8.1 | ✅ カバー済み |
| SpecPane統合 | 9.1 | ✅ カバー済み |
| Remote UI (ApiClient拡張) | 10.1-10.5 | ✅ カバー済み |
| パフォーマンス最適化 | 12.1, 12.2 | ✅ カバー済み |

**CRITICAL発見事項**:
- **DD-003「debounce時間の調整可能性」**: Design.mdで「debounce時間を状況に応じて調整可能にする」とあるが、tasks.mdに該当タスクなし
- **DD-002 Follow-up「IPC通信のパフォーマンス測定」**: Design.mdで明記されているが、tasks.mdに該当タスクなし

### 1.3 Design ↔ Tasks Completeness

**✅ 良好**: すべてのUI component、Service、API定義に対応するタスクが存在します。

| Category | Design Definition | Task Coverage | Status |
| -------- | ----------------- | ------------- | ------ |
| UI Components | CenterPaneContainer, GitView, GitFileTree, GitDiffViewer | 5.1, 6.1, 7.1-7.4, 8.1 | ✅ |
| Services | GitService, GitFileWatcherService | 2.1-2.4 | ✅ |
| Types/Models | GitStatusResult, GitFileStatus, GitViewState | 4.1, 10.1 | ✅ |
| IPC Channels | git:get-status, git:get-diff, git:watch-changes, git:unwatch-changes, git:changes-detected | 3.1, 3.2 | ✅ |
| API Extensions | IpcApiClient.git.*, WebSocketApiClient.git.* | 10.2, 10.3 | ✅ |

### 1.4 Acceptance Criteria → Tasks Coverage

**❌ CRITICAL**: 一部の受入基準がFeature実装タスクを欠いています。

| Criterion | Summary | Mapped Task(s) | Task Type | Status |
|-----------|---------|----------------|-----------|--------|
| 1.1 | worktree/通常ブランチでのgit差分取得 | 2.1 | Infrastructure | ✅ |
| 1.2 | ファイル選択時の差分取得 | 2.1 | Infrastructure | ✅ |
| 1.3 | gitエラーハンドリング | 2.1 | Infrastructure | ✅ |
| 1.4 | worktree分岐元ブランチ自動検出 | 2.2 | Infrastructure | ❌ **CRITICAL**: Feature実装タスクなし |
| 1.5 | untracked files差分対応 | 2.1 | Infrastructure | ✅ |
| 2.1 | chokidarでのファイル監視 | 2.3 | Infrastructure | ✅ |
| 2.2 | ファイル変更検知時の差分再取得 | 2.4 | Infrastructure | ❌ **CRITICAL**: Task 2.4はコンテナタスクのみ、具体的なFeature実装タスクなし |
| 2.3 | 300ms debounce処理 | 2.3 | Infrastructure | ✅ |
| 2.4 | GitView非表示時の監視停止 | 2.4 | Infrastructure | ✅ |
| 3.1 | IPCチャンネル提供 | 3.1, 3.2 | Infrastructure | ✅ |
| 3.2 | preload経由のAPI公開 | 3.3 | Infrastructure | ✅ |
| 3.3 | Remote UI対応（WebSocketApiClient） | 10.3, 10.4 | Infrastructure | ✅ |
| 4.1 | gitViewStore作成 | 4.1 | Infrastructure | ✅ |
| 4.2 | git差分データのキャッシュ保持 | 4.1 | Infrastructure | ✅ |
| 5.1 | CenterPaneContainer実装 | 5.1 | Feature | ✅ |
| 5.2 | セグメントボタンデザイン統一 | 5.1 | Feature | ✅ |
| 5.3 | Ctrl+Shift+G切り替え | 5.2 | Feature | ✅ |
| 5.4 | 切り替え状態の永続化 | 5.3 | Infrastructure | ✅ |
| 6.1 | GitView 2カラムレイアウト | 6.1 | Feature | ✅ |
| 6.2 | 初回表示時のファイル一覧取得 | 6.1 | Feature | ✅ |
| 6.3 | File Watch通知受信と再取得 | 6.1 | Feature | ✅ |
| 6.4 | gitエラー表示 | 6.1 | Feature | ✅ |
| 7.1 | GitFileTree階層ツリー表示 | 7.1 | Infrastructure | ✅ |
| 7.2 | ファイルノードクリック時の選択 | 7.2 | Feature | ✅ |
| 7.3 | ディレクトリノードの展開/折りたたみ | 7.3 | Feature | ✅ |
| 7.4 | ファイルリスト空時のメッセージ表示 | 7.4 | Feature | ✅ |
| 7.5 | スクロール対応 | 7.1 | Infrastructure | ✅ |
| 8.1 | GitDiffViewer差分表示 | 8.1 | Feature | ✅ |
| 8.2 | ファイル選択時の差分取得 | 8.1 | Feature | ✅ |
| 8.3 | 差分モード切り替え（unified/split） | 8.1 | Feature | ✅ |
| 8.4 | untracked files全行追加表示 | 8.1 | Feature | ✅ |
| 8.5 | バイナリファイル非表示 | 8.1 | Feature | ✅ |
| 8.6 | diffスクロール対応 | 8.1 | Feature | ✅ |
| 9.1 | SpecPaneのCenterPaneContainer置き換え | 9.1 | Integration | ✅ |
| 9.2 | 既存レイアウト維持 | 9.1 | Integration | ✅ |
| 9.3 | リサイズハンドル状態管理統合 | 5.3 | Infrastructure | ✅ |
| 10.1 | shared/api/types.ts型定義追加 | 10.1 | Infrastructure | ✅ |
| 10.2 | WebSocketApiClient実装追加 | 10.2, 10.3 | Infrastructure | ✅ |
| 10.3 | GitView共有コンポーネント化 | 10.5 | Infrastructure | ✅ |
| 10.4 | Remote UI環境のWebSocket経由呼び出し | 10.4, 10.5 | Infrastructure | ✅ |
| 11.1 | Ctrl+Shift+G切り替え | 5.2 | Feature | ✅ |
| 11.2 | GitView内キーボード操作 | 11.1 | Feature | ✅ |
| 12.1 | ファイルツリー仮想スクロール最適化 | 12.1 | Infrastructure | ✅ |
| 12.2 | File Watch debounce | 2.3 | Infrastructure | ✅ |
| 12.3 | 差分取得の遅延ロード | 12.2 | Infrastructure | ✅ |

**Validation Results**:
- [x] All criterion IDs from requirements.md are mapped
- [ ] User-facing criteria have Feature Implementation tasks — **CRITICAL**: Criterion 1.4, 2.2でFeatureタスクが欠落
- [x] No criterion relies solely on Infrastructure tasks (except 1.4, 2.2)

**CRITICAL問題の詳細**:

1. **Criterion 1.4 (worktree分岐元ブランチ自動検出)**:
   - Task 2.2はInfrastructureのみ
   - 実際のユーザー体験（UI上での分岐元ブランチ表示、エラー時のフォールバック）を実装するFeatureタスクがない
   - **推奨アクション**: GitViewまたはGitFileTreeでbaseBranchを表示するUIタスクを追加

2. **Criterion 2.2 (ファイル変更検知時の差分再取得)**:
   - Task 2.4は「変更検知時にgit差分を再取得し、全Rendererへブロードキャストする機能を実装する」とあるがコンテナタスクのみ
   - 具体的な実装タスク（GitFileWatcherService内のブロードキャストロジック、Renderer側のイベント受信処理）がない
   - **推奨アクション**: Task 2.4を細分化し、具体的な実装ステップを明記

### 1.5 Integration Test Coverage

**❌ CRITICAL**: Design.mdの「Integration Test Strategy」に明記された6つのテストのうち、tasks.mdに具体的な検証ポイントが記載されているのは1件のみです。

| Integration Point | Design Section | Test Task | Verification Points | Status |
|-------------------|----------------|-----------|---------------------|--------|
| Renderer → Main git:get-status IPC | "Git差分データ取得フロー" | 13.1 | ✅ Mock Boundaries, Verification Points記載あり | ✅ |
| File Watch event broadcast | "File Watch自動更新フロー" | 13.2 | ✅ Mock Boundaries, Verification Points記載あり | ✅ |
| GitView mount/unmount lifecycle | "Git差分データ取得フロー" | 13.3 | ✅ Verification Points記載あり | ✅ |
| GitFileTree → GitDiffViewer連携 | GitView内のコンポーネント連携 | 13.4 | ✅ Verification Points記載あり | ✅ |
| CenterPaneContainer切り替え | SpecPane内の切り替えロジック | 13.5 | ✅ Verification Points記載あり | ✅ |
| Remote UI統合 | "Remote UI E2E" | 13.6 | ✅ Verification Points記載あり | ✅ |

**Validation Results**:
- [x] All sequence diagrams have corresponding integration tests
- [x] All IPC channels have delivery verification tests
- [x] All store sync flows have state propagation tests

**評価**: tasks.mdのSection 13で統合テストが詳細に定義されており、Design.mdの「Integration Test Strategy」と完全に整合しています。

### 1.6 Refactoring Integrity Check

**✅ 良好**: 本仕様は新規機能追加のため、既存ファイルの削除や置き換えは発生しません。

| Check | Validation | Status |
|-------|------------|--------|
| 削除タスク | Design.md「結合・廃止戦略」で「削除すべき既存ファイル: なし」と明記 | ✅ |
| Consumer更新 | 既存ファイルの変更はWiring Pointsのみ（SpecPane等） | ✅ |
| 並行実装 | 新規ファイルのみ作成、既存ファイルと並存しない | ✅ |

### 1.7 Cross-Document Contradictions

**✅ 一貫性あり**: 以下の点で文書間の矛盾はありません。

- **用語の統一**: GitService, GitFileWatcherService, gitViewStore等の命名がすべての文書で一貫
- **技術スタック**: react-diff-view 3.x, refractor 4.x, chokidar 5.xの選定が全文書で一致
- **API契約**: IPC/WebSocketチャンネル名、型定義がrequirements.md, design.md, tasks.mdで一致

## 2. Gap Analysis

### 2.1 Technical Considerations

**⚠️ WARNING**: 以下の技術的考慮事項が不足しています。

1. **debounce時間の動的調整** (Design.md DD-003で言及):
   - Design.mdで「debounce時間を状況に応じて調整可能にする」とあるが、tasks.mdに実装タスクがない
   - **推奨**: Task 2.3に「debounce時間を設定可能にする」サブタスクを追加、またはOut of Scopeに移動

2. **IPC通信のパフォーマンス測定** (Design.md DD-002で言及):
   - Design.mdで「Follow-up: IPC通信のパフォーマンス測定」とあるが、tasks.mdに該当タスクがない
   - **推奨**: Section 14にパフォーマンステストタスクを追加、または明示的にOut of Scopeとして記載

3. **Web Worker対応** (Design.md GitDiffViewer Risksで言及):
   - Design.mdで「大規模差分のtokenization処理でUIブロックが発生する可能性 → Web Worker対応（react-diff-viewの`withTokenizeWorker` HOC使用）」とあるが、tasks.mdに実装タスクがない
   - **推奨**: Task 8.1またはTask 12にWeb Worker統合タスクを追加、またはMVP範囲外として明記

4. **セキュリティ考慮** (Design.md「Electron IPC Security」で言及):
   - Design.mdで「sender validation」「ファイルパスサニタイズ」が必要と記載されているが、tasks.mdに明示的な検証タスクがない
   - **推奨**: Task 3.2にセキュリティ検証項目を追加（または統合テストに含める）

### 2.2 Operational Considerations

**✅ 良好**: 以下の運用面での考慮事項がカバーされています。

- **エラーハンドリング**: Design.md「Error Handling」セクションで詳細に定義、tasks.mdでも各タスクに反映
- **ログ記録**: Design.md「Monitoring」セクションでProjectLoggerへのエラー記録を明記
- **テスト戦略**: Unit/Integration/E2E/Performanceテストが網羅的に定義

**INFO**: 以下の運用面での考慮は明示的に文書化されていません（必須ではないがあると望ましい）:

- **ロールバック戦略**: 本機能が既存機能に影響しないため不要と判断（妥当）
- **段階的ロールアウト**: Feature flagによる段階的有効化は検討されていない（MVPでは不要と判断）

## 3. Ambiguities and Unknowns

### 3.1 Vague Descriptions

**ℹ️ INFO**: 以下の点で若干の曖昧さがありますが、実装に支障はありません。

1. **「既存のUIパターンと統一感」** (Requirement 5.2):
   - 「既存のmode toggle: Edit/Preview」と例示されているが、具体的なUIライブラリコンポーネント名が不明
   - **影響**: 低（実装時にデザインシステムを参照すれば解決）

2. **「プロジェクトルートからの相対パス」正規化方法** (Design.md GitService):
   - パス正規化の具体的なロジック（`path.relative`使用等）が未定義
   - **影響**: 低（Node.js標準パターンで解決可能）

### 3.2 Undefined Dependencies

**✅ 明確**: すべての依存関係が定義されています。

- 外部ライブラリ: react-diff-view 3.x, refractor 4.x, chokidar 5.x（バージョン指定あり）
- 内部依存: ApiClient, ResizeHandle, layoutStore（すべて既存コンポーネント）

### 3.3 Pending Decisions

**ℹ️ INFO**: requirements.md「Open Questions」セクションに以下の未決定事項がありますが、design.mdで解決されています。

| Open Question | Requirements.md記載 | Design.mdでの解決 |
|---------------|---------------------|-------------------|
| Q1: react-diff-viewとprismjsの依存関係バージョン | 未決定 | ✅ research.mdで調査済み、refractor 4.x採用 |
| Q2: Remote UI環境でのFile Watch実装方法 | 未決定 | ✅ WebSocketブロードキャスト採用（Design.md「File Watch自動更新フロー」） |
| Q3: worktree分岐元ブランチ検出の互換性 | 未決定 | ✅ `.git/worktrees/{name}/HEAD`パース + フォールバック実装（Design.md GitService） |
| Q4: 仮想スクロールライブラリ選定 | 未決定 | ✅ react-windowまたは遅延レンダリング（Design.md「パフォーマンス最適化」） |

## 4. Steering Alignment

### 4.1 Architecture Compatibility

**✅ 完全準拠**: 以下のsteering原則に準拠しています。

- **structure.md「Electron Process Boundary Rules」**: Main ProcessでNode.js API使用、Rendererは UI stateのみ管理 ✅
- **design-principles.md「DRY, SSOT, KISS, YAGNI」**: ApiClient抽象化でコード重複回避、gitViewStoreで単一情報源 ✅
- **tech.md「Remote UI対応設計」**: WebSocketApiClient拡張で既存パターンに準拠 ✅

### 4.2 Integration Concerns

**✅ 影響最小化**: 既存機能への影響が最小限に抑えられています。

| 既存機能 | 統合方法 | 影響 |
|---------|---------|------|
| SpecPane | ArtifactEditorをCenterPaneContainerで包む | ✅ 内部変更のみ、外部I/Fは不変 |
| AgentListPanel | 変更なし | ✅ 影響なし |
| WorkflowView | 変更なし | ✅ 影響なし |
| layoutStore | GitView用の状態を追加 | ✅ 既存状態は維持 |
| IPC handlers | 新規チャンネル追加のみ | ✅ 既存チャンネルは不変 |

### 4.3 Migration Requirements

**✅ マイグレーション不要**: 新規機能追加のため、データマイグレーションや後方互換性の考慮は不要です。

- ユーザーデータ変更なし
- 既存UIフローに影響なし（オプトイン型の機能）
- 段階的ロールアウト不要（Feature flagなし）

## 5. Recommendations

### Critical Issues (Must Fix)

1. **Criterion 2.2のFeatureタスク欠落**:
   - **問題**: Task 2.4がコンテナタスクのみで、具体的な実装ステップがない
   - **推奨アクション**: Task 2.4を以下のように細分化:
     - 2.4.1: GitFileWatcherService内でGitService呼び出し後、`git:changes-detected`イベントをブロードキャスト
     - 2.4.2: GitView内で`git:changes-detected`イベントを購読し、gitViewStoreを更新
   - **影響を受ける文書**: tasks.md
   - **優先度**: P0

2. **Criterion 1.4のFeatureタスク欠落**:
   - **問題**: worktree分岐元ブランチ検出のInfrastructure実装（Task 2.2）はあるが、UI表示タスクがない
   - **推奨アクション**: 新規タスク追加:
     - 6.2: GitView内でbaseBranch情報を表示するヘッダーコンポーネントを実装（detached HEAD時は警告表示）
   - **影響を受ける文書**: tasks.md
   - **優先度**: P1

3. **Design.md DD-003の実装タスク欠落**:
   - **問題**: 「debounce時間を状況に応じて調整可能にする」がDesign.mdで言及されているが、tasks.mdにタスクがない
   - **推奨アクション**:
     - Option 1: Task 2.3にサブタスク追加（debounce時間を設定ファイルで調整可能にする）
     - Option 2: Out of Scopeに移動（MVP範囲外として明記）
   - **影響を受ける文書**: tasks.md または requirements.md
   - **優先度**: P2

### Warnings (Should Address)

1. **Web Worker対応の未実装**:
   - **問題**: Design.md GitDiffViewer Risksで「Web Worker対応」が推奨されているが、tasks.mdにタスクがない
   - **推奨アクション**: Task 8.1またはTask 12.1にサブタスク追加、またはMVP範囲外として明記
   - **影響を受ける文書**: tasks.md
   - **優先度**: P2

2. **IPC通信のパフォーマンス測定タスク欠落**:
   - **問題**: Design.md DD-002で「Follow-up: IPC通信のパフォーマンス測定」とあるが、tasks.mdにタスクがない
   - **推奨アクション**: Section 14（Performance Tests）にタスク追加、または明示的にOut of Scopeとして記載
   - **影響を受ける文書**: tasks.md
   - **優先度**: P3

3. **セキュリティ検証の明示化**:
   - **問題**: Design.mdで「sender validation」「ファイルパスサニタイズ」が言及されているが、tasks.mdに検証タスクがない
   - **推奨アクション**: Task 3.2またはSection 13（Integration Tests）にセキュリティ検証項目を追加
   - **影響を受ける文書**: tasks.md
   - **優先度**: P2

### Suggestions (Nice to Have)

1. **Open Questionsの削除**:
   - **提案**: requirements.md「Open Questions」セクションの4項目すべてがdesign.mdで解決されているため、削除してよい
   - **影響を受ける文書**: requirements.md
   - **優先度**: P4

2. **ログ実装ガイドラインの参照**:
   - **提案**: Design.md「Monitoring」セクションに`.kiro/steering/logging.md`への参照を追加
   - **影響を受ける文書**: design.md
   - **優先度**: P4

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
| -------- | ----- | ------------------ | ------------------ |
| P0 | Criterion 2.2のFeatureタスク欠落 | Task 2.4を2.4.1（GitFileWatcherServiceのブロードキャスト実装）と2.4.2（GitViewのイベント購読実装）に細分化 | tasks.md |
| P1 | Criterion 1.4のFeatureタスク欠落 | 新規タスク6.2を追加（GitView内でbaseBranch表示ヘッダー実装） | tasks.md |
| P2 | Design DD-003の実装タスク欠落 | Task 2.3にdebounce時間調整サブタスク追加、またはOut of Scopeに移動 | tasks.md または requirements.md |
| P2 | Web Worker対応の未実装 | Task 8.1またはTask 12.1にWeb Worker統合サブタスク追加、またはMVP範囲外として明記 | tasks.md |
| P2 | セキュリティ検証の明示化 | Task 3.2またはSection 13にセキュリティ検証項目追加 | tasks.md |
| P3 | IPC通信のパフォーマンス測定タスク欠落 | Section 14にパフォーマンステストタスク追加、またはOut of Scopeとして記載 | tasks.md |
| P4 | Open Questionsの削除 | requirements.md「Open Questions」セクションを削除（すべて解決済み） | requirements.md |
| P4 | ログ実装ガイドラインの参照 | Design.md「Monitoring」セクションに`.kiro/steering/logging.md`への参照を追加 | design.md |

---

_This review was generated by the document-review command._
