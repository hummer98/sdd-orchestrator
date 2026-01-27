# Specification Review Report #5

**Feature**: git-diff-viewer
**Review Date**: 2026-01-27
**Documents Reviewed**: spec.json, requirements.md, design.md, tasks.md, research.md

## Executive Summary

レビュー結果: **WARNING 4件、INFO 3件**（CRITICAL: 0件）

主要な警告:
- UI State管理の実装が未着手（タスク4.1未実行）
- Remote UI対応タスクの実装順序が明示されていない
- Integration Testの境界が曖昧（Mock戦略が不明瞭）
- E2Eテストのリソース管理（プロセス・ファイル監視のクリーンアップ）

主要な情報:
- Main Process実装（GitService、GitFileWatcherService、IPC Handlers）は完了済み
- react-diff-view、refractor依存関係は追加済み
- UI実装（Renderer側コンポーネント、ストア）は未着手

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**状態**: ✅ 良好

- すべての要件がDesign.mdのRequirements Traceability Matrix（行264-311）でカバーされている
- 各要件に対する実装アプローチが明記されている
- 技術選定の根拠（react-diff-view、chokidar、ApiClient抽象化）がresearch.mdと整合している

### 1.2 Design ↔ Tasks Alignment

**状態**: ✅ 良好

- すべてのDesignコンポーネントがTasksで実装タスクにマッピングされている
- タスク番号とDesign要件IDの対応が明確（Appendix: Requirements Coverage Matrix参照）

### 1.3 Design ↔ Tasks Completeness

**状態**: ⚠️ 注意が必要

| Category | Design Definition | Task Coverage | Status |
| -------- | ----------------- | ------------- | ------ |
| **UI Components** | GitView, GitFileTree, GitDiffViewer, CenterPaneContainer | 4.1, 5.1, 6.1, 7.1-7.4, 8.1, 9.1 | ✅ |
| **Services** | GitService, GitFileWatcherService | 2.1-2.4 | ✅ |
| **Types/Models** | GitStatusResult, GitFileStatus, GitViewState | 10.1 | ✅ |
| **IPC Handlers** | git:get-status, git:get-diff, git:watch-changes, git:unwatch-changes | 3.1-3.3 | ✅ |
| **Remote UI API** | WebSocketApiClient拡張 | 10.2-10.4 | ⚠️ 実装順序が明示されていない |
| **Integration Tests** | 13.1-13.7 | 13.1-13.7 | ⚠️ Mock境界が曖昧 |

**⚠️ WARNING**: Remote UI対応タスク（10.2-10.4）は相互依存があるが、実装順序が明示されていない。推奨実装順序: 10.1 → 10.2 → 10.3 → 10.4 → 10.5

**⚠️ WARNING**: Integration Testタスク（13.1-13.7）のMock境界が曖昧。各テストで「何を実装し、何をモックするか」の具体的な戦略が必要。

### 1.4 Acceptance Criteria → Tasks Coverage

**状態**: ✅ 良好

| Criterion | Summary | Mapped Task(s) | Task Type | Status |
|-----------|---------|----------------|-----------|--------|
| 1.1 | worktree/通常ブランチでのgit差分取得 | 2.1 | Infrastructure | ✅ |
| 1.2 | ファイル選択時の差分取得 | 2.1 | Infrastructure | ✅ |
| 1.3 | gitエラーハンドリング | 2.1 | Infrastructure | ✅ |
| 1.4 | worktree分岐元ブランチ自動検出 | 2.2 | Infrastructure | ✅ |
| 1.5 | untracked files差分対応 | 2.1 | Infrastructure | ✅ |
| 2.1 | chokidarでのファイル監視 | 2.3 | Infrastructure | ✅ |
| 2.2 | ファイル変更検知時の差分再取得 | 2.4 | Infrastructure | ✅ |
| 2.3 | 300ms debounce処理 | 2.3 | Infrastructure | ✅ |
| 2.4 | GitView非表示時の監視停止 | 2.4 | Infrastructure | ✅ |
| 3.1 | IPCチャンネル提供 | 3.1, 3.2 | Infrastructure | ✅ |
| 3.2 | preload経由のAPI公開 | 3.3 | Infrastructure | ✅ |
| 3.3 | Remote UI対応 | 10.2-10.4 | Infrastructure | ⚠️ 未実装 |
| 4.1 | gitViewStore作成 | 4.1 | Infrastructure | ❌ 未実装 |
| 4.2 | git差分データのキャッシュ保持 | 4.1 | Infrastructure | ❌ 未実装 |
| 5.1 | CenterPaneContainer実装 | 5.1 | Feature | ❌ 未実装 |
| 5.2 | セグメントボタンデザイン統一 | 5.1 | Feature | ❌ 未実装 |
| 5.3 | Ctrl+Shift+G切り替え | 5.2 | Feature | ❌ 未実装 |
| 5.4 | 切り替え状態の永続化 | 5.3 | Infrastructure | ❌ 未実装 |
| 6.1 | GitView 2カラムレイアウト | 6.1 | Feature | ❌ 未実装 |
| 6.2 | 初回表示時のファイル一覧取得 | 6.1 | Feature | ❌ 未実装 |
| 6.3 | File Watch通知受信と再取得 | 6.1 | Feature | ❌ 未実装 |
| 6.4 | gitエラー表示 | 6.1 | Feature | ❌ 未実装 |
| 7.1 | GitFileTree階層ツリー表示 | 7.1 | Infrastructure | ❌ 未実装 |
| 7.2 | ファイルノードクリック時の選択 | 7.2 | Feature | ❌ 未実装 |
| 7.3 | ディレクトリノードの展開/折りたたみ | 7.3 | Feature | ❌ 未実装 |
| 7.4 | ファイルリスト空時のメッセージ表示 | 7.4 | Feature | ❌ 未実装 |
| 7.5 | スクロール対応 | 7.1 | Infrastructure | ❌ 未実装 |
| 8.1 | GitDiffViewer差分表示 | 8.1 | Feature | ❌ 未実装 |
| 8.2 | ファイル選択時の差分取得 | 8.1 | Feature | ❌ 未実装 |
| 8.3 | 差分モード切り替え | 8.1 | Feature | ❌ 未実装 |
| 8.4 | untracked files全行追加表示 | 8.1 | Feature | ❌ 未実装 |
| 8.5 | バイナリファイル非表示 | 8.1 | Feature | ❌ 未実装 |
| 8.6 | diffスクロール対応 | 8.1 | Feature | ❌ 未実装 |
| 9.1 | SpecPaneのCenterPaneContainer置き換え | 9.1 | Integration | ❌ 未実装 |
| 9.2 | 既存レイアウト維持 | 9.1 | Integration | ❌ 未実装 |
| 9.3 | リサイズハンドル状態管理統合 | 5.3 | Infrastructure | ❌ 未実装 |
| 10.1 | shared/api/types.ts型定義追加 | 10.1 | Infrastructure | ❌ 未実装 |
| 10.2 | WebSocketApiClient実装追加 | 10.2, 10.3 | Infrastructure | ❌ 未実装 |
| 10.3 | GitView共有コンポーネント化 | 10.5 | Infrastructure | ❌ 未実装 |
| 10.4 | Remote UI環境のWebSocket経由呼び出し | 10.4, 10.5 | Infrastructure | ❌ 未実装 |
| 11.1 | Ctrl+Shift+G切り替え | 5.2 | Feature | ❌ 未実装 |
| 11.2 | GitView内キーボード操作 | 11.1 | Feature | ❌ 未実装 |
| 12.1 | ファイルツリー仮想スクロール最適化 | 12.1 | Infrastructure | ❌ 未実装 |
| 12.2 | File Watch debounce | 2.3 | Infrastructure | ✅ |
| 12.3 | 差分取得の遅延ロード | 12.2 | Infrastructure | ❌ 未実装 |

**Validation Results**:
- [x] All criterion IDs from requirements.md are mapped
- [x] User-facing criteria have Feature Implementation tasks
- [ ] ⚠️ **WARNING**: タスク4.1（gitViewStore作成）は未実装だが、多くのFeatureタスク（6.1, 7.1-7.4, 8.1）が依存している。実装優先度P0として扱うべき。

### 1.5 Integration Test Coverage

**状態**: ⚠️ 注意が必要

| Integration Point | Design Section | Test Task | Status |
|-------------------|----------------|-----------|--------|
| IPC Status Sync | "Git差分データ取得フロー" | 13.1 | ⚠️ Mock境界が不明瞭 |
| File Watch Broadcast | "File Watch自動更新フロー" | 13.2 | ⚠️ Mock境界が不明瞭 |
| GitView Lifecycle | "GitView mount/unmount" | 13.3 | ⚠️ Mock境界が不明瞭 |
| FileTree → DiffViewer | "Component Integration" | 13.4 | ⚠️ Mock境界が不明瞭 |
| Remote UI WebSocket | "Remote UI E2E" | 13.6, 13.7 | ⚠️ エラーハンドリング不明瞭 |

**Validation Results**:
- [ ] ⚠️ **WARNING**: すべての統合テストタスクに「Mock Boundaries」が記載されているが、具体的なモック実装方法が不明。
  - 例: 13.1「Mock IPC transport」→ どのレイヤーでモック化するか？（preload/handler/service?）
  - 例: 13.2「Mock chokidar」→ chokidarのどのAPIをモック化するか？（watch/on/close?）
- [ ] ⚠️ **WARNING**: Remote UI統合テスト（13.6, 13.7）でWebSocket接続断時のエラーハンドリングが記載されているが、自動再接続後の状態復元の検証が不明瞭。

### 1.6 Refactoring Integrity Check

**状態**: ✅ 該当なし（新機能追加のため既存ファイル削除なし）

Design.mdの「結合・廃止戦略」セクション（行989-1077）で以下が明記されている:
- 削除すべき既存ファイル: **なし**
- 既存ファイルの変更: SpecPane.tsx、handlers.ts、channels.ts等（変更のみ、削除なし）
- 並行作成: 新規ファイルのみ

### 1.7 Cross-Document Contradictions

**状態**: ✅ 良好

主要な一貫性:
- 用語: GitView、GitFileTree、GitDiffViewer等のコンポーネント名が全文書で統一
- 技術選定: react-diff-view、refractor、chokidarの選定理由がresearch.mdとdesign.mdで一致
- アーキテクチャパターン: Main Process Service + Renderer Store with ApiClient Abstractionがdesign.md、structure.md、tech.mdで一貫

## 2. Gap Analysis

### 2.1 Technical Considerations

**状態**: 情報提供（軽微）

1. **ℹ️ INFO**: react-diff-viewの言語検知ロジックが未定義
   - Design.mdで「拡張子ベースの言語マッピング（fallbackはplain text）」と記載されているが、具体的なマッピングテーブルが存在しない
   - 推奨: タスク8.1に言語マッピングテーブル実装を追加

2. **ℹ️ INFO**: GitFileWatcherServiceのリソースリーク対策が未定義
   - Design.mdで「アプリ終了時に全watcherを明示的にクローズ」と記載されているが、実装方法が不明
   - 推奨: タスク2.3または2.4にアプリ終了時のクリーンアップ処理を追加

3. **ℹ️ INFO**: 大規模差分（10,000+行）のメモリ管理が未定義
   - Design.mdで「キャッシュサイズ上限を設定（5MB）し、超過時は破棄」と記載されているが、実装詳細が不明
   - 推奨: タスク12.1または12.3にキャッシュ上限管理を追加

### 2.2 Operational Considerations

**状態**: ✅ 良好

- デプロイ手順: 既存のElectronアプリビルドプロセスに統合（tech.md記載の`task electron:build`）
- ロールバック戦略: 新機能のためロールバック不要（既存機能に影響なし）
- 監視/ログ: ProjectLogger経由でgit操作エラーをログ記録（design.md「Error Handling」セクション）
- ドキュメント更新: 該当なし（内部機能）

## 3. Ambiguities and Unknowns

**状態**: ⚠️ 注意が必要

### 3.1 曖昧な記述

1. **⚠️ WARNING**: UI State管理の分離が曖昧
   - Requirements 4.1で「gitViewStoreを`renderer/stores/gitViewStore.ts`に作成」と記載
   - Design.md「State Management」セクション（行556）で「layoutStoreまたはgitViewStore」と記載
   - タスク5.3でも「layoutStoreまたはgitViewStoreにviewMode状態を追加」と選択肢が残っている
   - **決定が必要**: viewMode状態はどちらのストアで管理するか？

2. **⚠️ WARNING**: E2Eテストのリソース管理が不明
   - タスク14.4（ファイル変更検知テスト）で「ファイル編集 → 自動更新を検証」と記載
   - 実際のファイル編集をどのように発火させるか？（テストコードでfsモジュール使用? 外部プロセス?）
   - テスト終了後のFile Watcherクリーンアップは誰が実施するか？
   - **決定が必要**: E2Eテスト用のファイル操作ヘルパーとクリーンアップ戦略

### 3.2 未定義の依存関係

なし（すべての主要な依存関係が明記されている）

### 3.3 Pending Decisions

なし（Decision LogとDesign Decisionsセクションですべて解決済み）

## 4. Steering Alignment

### 4.1 Architecture Compatibility

**状態**: ✅ 良好

- **Electron Process Boundary Rules**: Main ProcessでGitService/GitFileWatcherServiceを配置（structure.md準拠）
- **State Management Rules**: Domain State（git差分データ）はMainが真実の情報源、RendererはUI Stateのみ（structure.md準拠）
- **ApiClient Abstraction**: IpcApiClient/WebSocketApiClientで通信を抽象化（tech.md Remote UIアーキテクチャ準拠）

### 4.2 Integration Concerns

**状態**: ✅ 良好

- **既存機能への影響**: SpecPane内部構造を変更するが、ArtifactEditorは独立して動作（design.md「影響を受けない既存機能」セクション）
- **共有リソース競合**: なし（新規リソース追加のみ）
- **API互換性**: 新規APIチャンネル追加のみ、既存IPCチャンネルは変更なし

### 4.3 Migration Requirements

**状態**: ✅ 該当なし（新機能のためデータ移行不要）

## 5. Recommendations

### Critical Issues (Must Fix)

なし

### Warnings (Should Address)

**W1. UI State管理の分離を明確化する**
- **Issue**: viewMode状態の管理場所が曖昧（layoutStore vs gitViewStore）
- **Recommended Action**:
  - タスク4.1実装前に決定する
  - 推奨: layoutStoreで管理（既存のレイアウト状態と一貫性を保つため）
- **Affected Documents**: requirements.md (4.1), design.md (State Management), tasks.md (4.1, 5.3)

**W2. Remote UI対応タスクの実装順序を明示する**
- **Issue**: タスク10.1-10.5の相互依存が明示されていない
- **Recommended Action**:
  - tasks.mdに実装順序を追記: 10.1 → 10.2 → 10.3 → 10.4 → 10.5
  - 各タスクのRequiresセクションに依存タスクを明記
- **Affected Documents**: tasks.md (Section 10)

**W3. Integration TestのMock戦略を明確化する**
- **Issue**: タスク13.1-13.7のMock境界が不明瞭
- **Recommended Action**:
  - 各Integration Testタスクに「Mock実装方法」セクションを追加
  - 例: 13.1「child_process.spawnをvi.mock()でモック、IPC handlerは実装使用」
- **Affected Documents**: tasks.md (Section 13), design.md (Integration Test Strategy)

**W4. E2Eテストのリソースクリーンアップ戦略を定義する**
- **Issue**: タスク14.4でFile Watcherのクリーンアップが不明
- **Recommended Action**:
  - e2e/setupファイルにFile Watcherクリーンアップユーティリティを追加
  - 各E2Eテスト終了後に`afterEach(() => cleanupFileWatchers())`を実行
- **Affected Documents**: tasks.md (Section 14), tech.md (E2E Testing)

### Suggestions (Nice to Have)

**S1. 言語検知マッピングテーブルの事前定義**
- **Issue**: react-diff-viewのシンタックスハイライト用言語マッピングが未定義
- **Recommended Action**: タスク8.1に言語マッピングテーブル実装を追加（例: `.ts` → `typescript`, `.py` → `python`）
- **Affected Documents**: tasks.md (8.1), design.md (GitDiffViewer Implementation Notes)

**S2. GitFileWatcherServiceのリソースリーク対策**
- **Issue**: アプリ終了時のwatcherクリーンアップが未定義
- **Recommended Action**: Main Processの`app.on('before-quit')`でwatcherクローズ処理を追加
- **Affected Documents**: tasks.md (2.3 or 2.4), design.md (GitFileWatcherService Implementation Notes)

**S3. 大規模差分のメモリ管理**
- **Issue**: キャッシュサイズ上限（5MB）の実装方法が未定義
- **Recommended Action**: gitViewStoreに`maxCacheSize`定数を追加し、キャッシュ保存前にサイズチェック
- **Affected Documents**: tasks.md (12.1 or 12.3), design.md (gitViewStore Implementation Notes)

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
| -------- | ----- | ------------------ | ------------------ |
| **WARNING** | W1: UI State管理の分離が曖昧 | viewMode状態の管理場所を決定（推奨: layoutStore）、requirements.md/tasks.mdを更新 | requirements.md (4.1), tasks.md (4.1, 5.3) |
| **WARNING** | W2: Remote UI対応タスクの実装順序が不明 | tasks.md Section 10に実装順序を追記（10.1 → 10.2 → 10.3 → 10.4 → 10.5） | tasks.md (Section 10) |
| **WARNING** | W3: Integration TestのMock戦略が不明瞭 | 各Integration Testタスクに「Mock実装方法」セクションを追加 | tasks.md (Section 13), design.md (Integration Test Strategy) |
| **WARNING** | W4: E2Eテストのリソースクリーンアップ戦略が未定義 | e2e/setupにFile Watcherクリーンアップユーティリティを追加 | tasks.md (Section 14), tech.md (E2E Testing) |
| **INFO** | S1: 言語検知マッピングテーブルが未定義 | タスク8.1に言語マッピングテーブル実装を追加 | tasks.md (8.1), design.md (GitDiffViewer) |
| **INFO** | S2: watcherリソースリーク対策が未定義 | Main Processのapp.before-quitでクリーンアップ追加 | tasks.md (2.3/2.4), design.md (GitFileWatcherService) |
| **INFO** | S3: 大規模差分のメモリ管理が未定義 | gitViewStoreにmaxCacheSize定数とサイズチェックを追加 | tasks.md (12.1/12.3), design.md (gitViewStore) |

---

_This review was generated by the document-review command._
