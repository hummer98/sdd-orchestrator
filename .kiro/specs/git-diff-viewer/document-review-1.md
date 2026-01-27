# Specification Review Report #1

**Feature**: git-diff-viewer
**Review Date**: 2026-01-27
**Documents Reviewed**: spec.json, requirements.md, design.md, tasks.md, research.md

## Executive Summary

レビュー結果: **Critical: 2件、Warning: 3件、Info: 1件**

主要な懸念事項:
- **CRITICAL**: Acceptance Criteria 7.1-7.5が単一のInfrastructure Task（7.1）でカバーされており、Feature Implementation taskが不足
- **CRITICAL**: IPC統合テストが設計書に記載されているが、tasks.mdに対応するタスクが存在しない
- **WARNING**: Remote UI統合テストの欠如
- **WARNING**: design.mdの「結合・廃止戦略」とtasksの削除タスク不整合

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**✅ 良好**: すべての要件項目がDesignのRequirements Traceability Matrixに正しくマッピングされている。

| Requirement ID | Design Coverage |
|----------------|-----------------|
| 1.1-1.5 | ✅ GitService (DD 1.1-1.5) |
| 2.1-2.4 | ✅ GitFileWatcherService (DD 2.1-2.4) |
| 3.1-3.3 | ✅ IPC Handlers (DD 3.1-3.3) |
| 4.1-4.2 | ✅ gitViewStore (DD 4.1-4.2) |
| 5.1-5.4 | ✅ CenterPaneContainer (DD 5.1-5.4) |
| 6.1-6.4 | ✅ GitView (DD 6.1-6.4) |
| 7.1-7.5 | ✅ GitFileTree (DD 7.1-7.5) |
| 8.1-8.6 | ✅ GitDiffViewer (DD 8.1-8.6) |
| 9.1-9.2 | ✅ SpecPane統合 (DD 9.1-9.2) |
| 10.1-10.4 | ✅ ApiClient拡張 (DD 10.1-10.4) |
| 11.1-11.2 | ✅ キーボードショートカット (DD 11.1-11.2) |
| 12.1-12.3 | ✅ パフォーマンス最適化 (DD 12.1-12.3) |

### 1.2 Design ↔ Tasks Alignment

**⚠️ WARNING**: 以下の不整合が存在:

| Design Section | Task Coverage | Issue |
|----------------|---------------|-------|
| Integration Tests | 13.1-13.5 (P) | ✅ Tasks定義済み |
| E2E Tests | なし | ⚠️ WARNING: Design.mdにE2E test記載あり（GitView初回表示、ファイル選択等）だがtasksに対応なし |
| Remote UI E2E | なし | ⚠️ WARNING: Design.mdにRemote UI E2E記載あり（WebSocket経由動作確認）だがtasksに対応なし |

### 1.3 Design ↔ Tasks Completeness

**✅ 良好**: 主要コンポーネントはすべてtasksでカバーされている。

| Category | Design Definition | Task Coverage | Status |
|----------|-------------------|---------------|--------|
| **Services** | GitService, GitFileWatcherService | 2.1-2.4 (P) | ✅ |
| **IPC Handlers** | git:get-status, git:get-diff, etc. | 3.1-3.3 (P) | ✅ |
| **Stores** | gitViewStore | 4.1 (P) | ✅ |
| **UI Components** | CenterPaneContainer, GitView, GitFileTree, GitDiffViewer | 5.1, 6.1, 7.1, 8.1 (P) | ✅ |
| **Remote UI** | ApiClient拡張、WebSocket handlers | 10.1-10.5 (P) | ✅ |
| **Integration Tests** | IPC, File Watch, Component連携 | 13.1-13.5 (P) | ✅ |

### 1.4 Acceptance Criteria → Tasks Coverage

**❌ CRITICAL**: 以下の不整合が存在:

| Criterion | Summary | Mapped Task(s) | Task Type | Status |
|-----------|---------|----------------|-----------|--------|
| 7.1 | GitFileTree階層ツリー表示 | 7.1 | Infrastructure | ❌ CRITICAL |
| 7.2 | ファイルノードクリック時の選択 | 7.1 | Infrastructure | ❌ CRITICAL |
| 7.3 | ディレクトリノードの展開/折りたたみ | 7.1 | Infrastructure | ❌ CRITICAL |
| 7.4 | ファイルリスト空時のメッセージ表示 | 7.1 | Infrastructure | ❌ CRITICAL |
| 7.5 | スクロール対応 | 7.1 | Infrastructure | ❌ CRITICAL |

**問題点**:
- Requirement 7（GitFileTree実装）の5つのAcceptance Criteriaすべてが単一のTask 7.1（Infrastructure）でカバーされている
- Task 7.1は「階層的なツリー構造で表示するコンポーネントを実装する」という包括的な表現で、具体的な実装項目が列挙されているが、**Feature Implementation taskとして独立したタスクがない**
- tasks.mdのCoverage Matrixでは7.1-7.5すべてが「7.1 | Feature」と記載されているが、実際のTask 7.1の記述は「Infrastructure + Feature」の混在

**推奨対応**:
- Task 7.1を以下のように分割:
  - 7.1a (Infrastructure): GitFileTreeコンポーネントの基礎構造作成
  - 7.1b (Feature): ファイル選択機能の実装（Criterion 7.2）
  - 7.1c (Feature): ディレクトリ展開/折りたたみ機能の実装（Criterion 7.3）
  - 7.1d (Feature): 空リストメッセージ表示の実装（Criterion 7.4）

### 1.5 Integration Test Coverage

**❌ CRITICAL**: IPC統合テストが設計書に記載されているが、tasks.mdに対応するタスクが存在しない。

| Integration Point | Design Section | Test Task | Status |
|-------------------|----------------|-----------|--------|
| IPC git:get-status | "Git差分データ取得フロー" | 13.1 (P) | ✅ |
| IPC git:get-diff | "Git差分データ取得フロー" | 13.1 (P) | ✅ |
| File Watch broadcast | "File Watch自動更新フロー" | 13.2 (P) | ✅ |
| GitView lifecycle | "Git差分データ取得フロー" | 13.3 (P) | ✅ |
| GitFileTree → GitDiffViewer | Component連携 | 13.4 (P) | ✅ |
| CenterPaneContainer切り替え | SpecPane統合 | 13.5 (P) | ✅ |

**✅ 良好**: すべてのIPC統合テストがtasks.mdに明示的に定義されている。

**⚠️ WARNING**: Remote UI統合テストの欠如

| Integration Point | Design Section | Test Task | Status |
|-------------------|----------------|-----------|--------|
| Remote UI WebSocket git操作 | Design.md "Remote UI E2E" | なし | ❌ WARNING |
| Remote UI File Watch over WebSocket | Design.md "Remote UI E2E" | なし | ❌ WARNING |

**Validation Results**:
- [x] すべてのSequence DiagramsにIntegration Testsが対応
- [x] すべてのIPCチャンネルにdelivery verification testsが存在
- [ ] Remote UI統合テストが欠如（Design.mdに記載あり）

### 1.6 Cross-Document Contradictions

**⚠️ WARNING**: design.mdの「結合・廃止戦略」とtasksの削除タスク不整合

**Design.md記載**:
> ### 削除すべき既存ファイル（Cleanup）
> **なし** — 新機能追加のため、既存ファイルの削除は発生しない。

**Tasks.md記載**:
- Task 9.1: 「SpecPane内の`<ArtifactEditor />`を`<CenterPaneContainer />`に置き換え」

**不整合**:
- Design.mdは「削除なし」と明記しているが、Task 9.1は既存コードの置き換えを指示
- これは削除ではなく「変更」だが、「既存ファイルの変更」セクションには「ArtifactEditorを包む」と記載されており、「置き換え」とは異なる表現

**推奨対応**:
- Design.mdの「既存ファイルの変更」セクションとTask 9.1の記述を統一する
- 「置き換え」ではなく「CenterPaneContainerで包む」が正確な表現

## 2. Gap Analysis

### 2.1 Technical Considerations

**✅ 良好**: 以下の技術的考慮事項が十分にカバーされている:

| 項目 | Design Coverage | Notes |
|------|-----------------|-------|
| **Error Handling** | ✅ Design.md "Error Handling"セクション | User/System/Business Logicエラー分類、Result<T, E>型使用 |
| **Security** | ✅ Research.md "Electron IPC Security" | Sender validation、child_process.spawn配列引数、パス検証 |
| **Performance** | ✅ Requirements 12.1-12.3 | react-window、debounce、遅延ロード |
| **Scalability** | ✅ Design.md "Performance/Load Tests" | 1000+ファイル、10,000+行差分のテスト計画 |
| **Testing** | ✅ Design.md "Testing Strategy" | Unit/Integration/E2E/Load tests |
| **Logging** | ⚠️ 部分的 | ProjectLoggerへのgit操作エラー記録は記載あり、詳細なログレベル定義はなし |

**ℹ️ INFO**: ロギング詳細化の推奨

Design.mdには「Main Processの`ProjectLogger`にgit操作エラーを記録」と記載されているが、以下の詳細が不足:
- どのログレベルでどの操作を記録するか（DEBUG/INFO/WARN/ERROR）
- パフォーマンスへの影響を考慮したログ出力頻度
- File Watchイベントのログ頻度（連続イベント時の対応）

**推奨対応**:
- Design.mdまたはtasks.mdに「Logging Implementation Guidelines」セクションを追加
- steering/logging.mdのルールに準拠したログレベル定義

### 2.2 Operational Considerations

**✅ 良好**: 以下の運用考慮事項が十分にカバーされている:

| 項目 | Coverage | Notes |
|------|----------|-------|
| **Deployment** | ✅ | Electronアプリ内機能、別途デプロイ不要 |
| **Rollback** | ✅ | 新機能のため既存機能への影響なし、CenterPaneContainerの切り替えでArtifactsに戻せる |
| **Monitoring** | ✅ | Design.md "Monitoring"セクション、ProjectLogger記録 |
| **Documentation** | ✅ | Requirements/Design/Research文書が充実 |

## 3. Ambiguities and Unknowns

**✅ 良好**: Open Questionsセクションで未解決事項を明確化している。

| Question | Status | Notes |
|----------|--------|-------|
| Q1: react-diff-view と prismjs の依存関係 | ✅ Research.mdで解決 | refractorを使用、バージョン選定済み |
| Q2: Remote UI環境でのFile Watch実装方法 | ✅ Design.mdで解決 | WebSocketストリーミング通知を採用 |
| Q3: worktree分岐元ブランチ検出の互換性 | ✅ Research.mdで解決 | `.git/worktrees/{name}/HEAD`パース + フォールバック |
| Q4: 仮想スクロールライブラリ選定 | ⚠️ 未解決 | react-windowまたは遅延レンダリング、最終決定なし |

**推奨対応**:
- Q4について、Task 12.1実装前に最終判断を明記（react-windowを推奨）

## 4. Steering Alignment

### 4.1 Architecture Compatibility

**✅ 良好**: 既存アーキテクチャと完全に整合。

| Steering Rule | Compliance | Evidence |
|---------------|------------|----------|
| **Electron Process Boundary Rules** | ✅ | Main ProcessでGitService/GitFileWatcherService、RendererはキャッシュのみUi |
| **Domain State vs UI State分離** | ✅ | gitViewStoreはUI State（structure.md準拠）、差分データはMainから受信 |
| **ApiClient抽象化パターン** | ✅ | IpcApiClient/WebSocketApiClient拡張（既存パターン継承） |
| **Remote UI対応設計** | ✅ | shared/components/git/への共有コンポーネント配置計画 |

### 4.2 Integration Concerns

**✅ 良好**: 既存機能への影響を最小化。

| 既存機能 | 影響 | 対策 |
|----------|------|------|
| **ArtifactEditor** | 変更あり | CenterPaneContainerで包むが、内部ロジックは変更なし |
| **SpecPane** | 変更あり | レイアウト変更のみ、既存のRightPane構成は維持 |
| **layoutStore** | 拡張 | GitView用状態追加、既存状態は変更なし |
| **AgentListPanel** | 影響なし | 右ペイン構成は変更なし |
| **BugPane** | 影響なし | 独立したペイン、影響なし |

### 4.3 Migration Requirements

**✅ 良好**: 新機能追加のためマイグレーション不要。

- データマイグレーション: 不要（新規機能）
- APIバージョニング: 不要（新規チャンネル追加のみ）
- 下位互換性: 維持（既存機能に影響なし）

## 5. Recommendations

### Critical Issues (Must Fix)

**CRITICAL-1: Acceptance Criteria 7.1-7.5のTask分割不足**

- **Issue**: Requirement 7の5つのAcceptance Criteriaが単一のInfrastructure Task 7.1でカバーされている
- **Impact**: タスク粒度が粗すぎて実装進捗の追跡が困難、Feature Implementation taskが不足
- **Recommended Action**: Task 7.1を以下のように分割:
  ```
  - 7.1a (Infrastructure): GitFileTreeコンポーネントの基礎構造作成（ディレクトリ階層変換ロジック）
  - 7.1b (Feature): ファイル選択機能の実装（Criterion 7.2: ファイルノードクリック時の選択）
  - 7.1c (Feature): ディレクトリ展開/折りたたみ機能の実装（Criterion 7.3）
  - 7.1d (Feature): 空リストメッセージ表示の実装（Criterion 7.4）
  ```
- **Affected Documents**: tasks.md

**CRITICAL-2: IPC統合テストタスクの明確化不足**

- **Issue**: Design.mdに詳細な統合テスト仕様（Data Flow、Mock Boundaries、Verification Points）が記載されているが、tasks.mdのTask 13.1-13.5は簡潔な記述のみ
- **Impact**: 実装時にどのレベルまでテストすべきか不明確
- **Recommended Action**: Task 13.1-13.5に以下を追加:
  - Mock Boundaries（何をモックし、何を実環境で動かすか）
  - Verification Points（何を確認すべきか）
  - Design.mdの「Integration Test Strategy」セクションへの参照
- **Affected Documents**: tasks.md

### Warnings (Should Address)

**WARNING-1: Remote UI統合テストの欠如**

- **Issue**: Design.mdにRemote UI E2Eテスト計画（ブラウザアクセス、WebSocket経由File Watch）が記載されているが、tasks.mdに対応タスクがない
- **Impact**: Remote UI環境での動作保証が不十分
- **Recommended Action**: 以下のタスクを追加:
  ```
  - 13.6 (P) Remote UI統合テストを実装する
    - WebSocket経由のgit操作（getGitStatus, getGitDiff）
    - File Watch over WebSocket（ファイル変更検知→Remote UI自動更新）
    - _Requirements: 10.4_
    - _Integration Point: Design.md "Remote UI E2E"_
  ```
- **Affected Documents**: tasks.md

**WARNING-2: E2E/UIテストタスクの欠如**

- **Issue**: Design.mdにE2Eテスト計画（GitView初回表示、ファイル選択、差分モード切り替え等）が記載されているが、tasks.mdに対応タスクがない
- **Impact**: ユーザー視点での動作検証が不十分
- **Recommended Action**: 以下のタスクを追加:
  ```
  - 14. E2E/UIテスト（Critical User Paths）
    - 14.1 GitView初回表示テスト
    - 14.2 ファイル選択と差分表示テスト
    - 14.3 差分モード切り替えテスト
    - 14.4 ファイル変更検知テスト
    - 14.5 ショートカットキーテスト
  ```
- **Affected Documents**: tasks.md

**WARNING-3: Design.mdとTask 9.1の記述不整合**

- **Issue**: Design.mdは「ArtifactEditorを包む」、Task 9.1は「置き換え」と記述が異なる
- **Impact**: 実装時の解釈に混乱を招く可能性
- **Recommended Action**: Design.mdの「既存ファイルの変更」セクションとTask 9.1の記述を統一する（「CenterPaneContainerで包む」が正確）
- **Affected Documents**: design.md, tasks.md

### Suggestions (Nice to Have)

**SUGGESTION-1: ロギング詳細化**

- **Issue**: ProjectLoggerへのログ記録は記載されているが、ログレベル定義が不足
- **Benefit**: 実装時のログ出力頻度・レベル判断が明確化
- **Recommended Action**: Design.mdまたはtasks.mdに「Logging Implementation Guidelines」セクションを追加:
  - DEBUG: git コマンド実行（コマンドライン、実行時間）
  - INFO: File Watch開始/停止、diff取得成功
  - WARN: git操作タイムアウト、detached HEAD検出
  - ERROR: git実行失敗、watcher起動失敗
- **Affected Documents**: design.md

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|-------------------|-------------------|
| **CRITICAL** | Task 7.1の粒度が粗すぎる | Task 7.1を7.1a-7.1dに分割（Infrastructure + Feature tasks） | tasks.md |
| **CRITICAL** | 統合テスト仕様の詳細不足 | Task 13.1-13.5にMock Boundaries/Verification Pointsを追加 | tasks.md |
| **WARNING** | Remote UI統合テスト欠如 | Task 13.6を追加（WebSocket統合テスト） | tasks.md |
| **WARNING** | E2E/UIテスト欠如 | Task 14.1-14.5を追加（Critical User Paths） | tasks.md |
| **WARNING** | Design/Tasks記述不整合 | Design.mdとTask 9.1の表現を統一 | design.md, tasks.md |
| **INFO** | ロギング詳細化 | Logging Implementation Guidelinesセクション追加 | design.md |

---

_This review was generated by the document-review command._
