# Specification Review Report #4

**Feature**: git-diff-viewer
**Review Date**: 2026-01-27
**Documents Reviewed**: spec.json, requirements.md, design.md, tasks.md, research.md

## Executive Summary

**Review Result**: 3 CRITICAL issues, 5 WARNING issues, 3 INFO suggestions identified.

### Critical Issues Summary
1. **Task 7.1が基盤構造のみでFeature実装タスクが不足** - Requirement 7.2, 7.3, 7.4 (ファイル選択、ディレクトリ展開/折りたたみ、空メッセージ表示) が Infrastructure準備タスクのみにマッピングされている
2. **Integration Test Coverage不足** - IPC通信、File Watch、Remote UI間の統合テストが計画されているが、State Sync（gitViewStore同期）の統合テストが明示されていない
3. **Refactoring Integrity Risk** - SpecPane.tsx の変更で `<ArtifactEditor />` を `<CenterPaneContainer />` で包むが、既存コンポーネントの削除・修正の影響範囲が不明確

### Warnings Summary
- Remote UI対応のWebSocket handler実装タスク（10.4）が Integration Pointとして明記されているが、Test Strategy に Remote UI WebSocket エラーハンドリングテストが不足
- design.md の「大規模差分（10,000+行）でのUIブロック」リスクに対する具体的な軽減策（Web Worker実装）がtasks.mdに明示されていない
- requirements.md の Requirement 12（パフォーマンス最適化）の検証方法が明記されていない
- CenterPaneContainerのキーボードショートカット（Ctrl+Shift+G）が他機能と競合する可能性
- gitViewStore の永続化方針（localStorage非依存）が明記されているが、リサイズハンドル位置のみlayoutStoreと統合する設計で、ユーザー体験への影響が不明

### Info Suggestions
- Untracked files（`??` status）の差分生成方法に2つのアプローチが記載されているが、最終的な選択肢が明確でない
- react-diff-view の Web Worker 統合検証が research.md で言及されているが、実装タスクとの紐付けが不明
- Remote UI DesktopLayout の "Electron版準拠" 原則に対する具体的な検証手順が不足

---

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**検証結果**: ✅ 良好

Requirements の全12要件がDesignの Requirements Traceability セクションで明示的にカバーされている。各 Criterion ID が具体的なコンポーネント（GitService, GitFileWatcherService, gitViewStore等）にマッピングされており、実装アプローチも明記されている。

**矛盾なし**

### 1.2 Design ↔ Tasks Alignment

**検証結果**: ✅ 概ね良好、一部要改善

Design の Requirements Traceability と tasks.md の Appendix: Requirements Coverage Matrix を照合した結果、以下を確認：

| Criterion ID | Design Coverage | Tasks Coverage | 整合性 |
|--------------|----------------|----------------|--------|
| 1.1-1.5 | GitService | 2.1, 2.2 | ✅ |
| 2.1-2.4 | GitFileWatcherService | 2.3, 2.4 | ✅ |
| 3.1-3.3 | IPC Handlers, preload | 3.1, 3.2, 3.3 | ✅ |
| 4.1-4.2 | gitViewStore | 4.1 | ✅ |
| 5.1-5.4 | CenterPaneContainer | 5.1, 5.2, 5.3 | ✅ |
| 6.1-6.4 | GitView | 6.1 | ✅ |
| 7.1-7.5 | GitFileTree | 7.1, 7.2, 7.3, 7.4 | ⚠️ タスク粒度要確認 |
| 8.1-8.6 | GitDiffViewer | 8.1 | ✅ |
| 9.1-9.3 | SpecPane統合 | 9.1, 5.3 | ✅ |
| 10.1-10.4 | Remote UI対応 | 10.1-10.5 | ✅ |
| 11.1-11.2 | キーボードショートカット | 5.2, 11.1 | ✅ |
| 12.1-12.3 | パフォーマンス最適化 | 12.1, 12.2, 2.3 | ✅ |

**矛盾: なし**

### 1.3 Design ↔ Tasks Completeness

**検証結果**: ⚠️ 改善推奨

Design で定義されたコンポーネントと tasks.md のタスクを照合：

| Category | Design Definition | Task Coverage | Status |
| -------- | ----------------- | ------------- | ------ |
| **Main Process Services** |
| GitService | getStatus, getDiff, detectBaseBranch | 2.1, 2.2 | ✅ |
| GitFileWatcherService | startWatching, stopWatching, debounce | 2.3, 2.4 | ✅ |
| **IPC Layer** |
| IPC Handlers | git:get-status, git:get-diff, git:watch-changes, git:unwatch-changes | 3.1, 3.2 | ✅ |
| preload API | window.electronAPI.git.* | 3.3 | ✅ |
| **Renderer Components** |
| gitViewStore | State management | 4.1 | ✅ |
| CenterPaneContainer | Segmented control, 切り替えロジック | 5.1, 5.2, 5.3 | ✅ |
| GitView | 2カラムレイアウト、ApiClient連携 | 6.1 | ✅ |
| GitFileTree | 階層ツリー、ファイル選択、ディレクトリ展開 | 7.1, 7.2, 7.3, 7.4 | ⚠️ 粒度不足（後述） |
| GitDiffViewer | 差分表示、モード切り替え | 8.1 | ✅ |
| **Remote UI** |
| ApiClient拡張 | IpcApiClient, WebSocketApiClient | 10.1, 10.2, 10.3 | ✅ |
| WebSocket handlers | ws:git:* handlers | 10.4 | ✅ |
| 共有コンポーネント化 | shared/components/git/ | 10.5 | ✅ |
| **Testing** |
| Integration Tests | IPC, File Watch, Lifecycle, Component連携 | 13.1-13.6 | ✅ |
| E2E Tests | Critical User Paths | 14.1-14.5 | ✅ |

**不足している実装タスク**:

なし（全体的にカバーされている）

**改善推奨事項**:

- Task 7.1 "GitFileTreeコンポーネントの基礎構造を作成する" が Infrastructure タスクとして分類されているが、Requirement 7.2（ファイル選択）、7.3（ディレクトリ展開/折りたたみ）、7.4（空メッセージ表示）に対応する Feature タスクが独立して存在すべき。現状では Task 7.1-7.4 が Infrastructure + Feature の混在になっている。

### 1.4 Acceptance Criteria → Tasks Coverage

**検証結果**: ⚠️ CRITICAL - Feature Implementation タスク不足

Requirements Coverage Matrix を検証した結果、以下のパターンを発見：

| Criterion | Summary | Mapped Task(s) | Task Type | Status |
|-----------|---------|----------------|-----------|--------|
| 7.1 | GitFileTree階層ツリー表示 | 7.1 | Infrastructure | ✅ 基盤構造 |
| 7.2 | ファイルノードクリック時の選択 | 7.2 | Feature | ✅ 機能実装 |
| 7.3 | ディレクトリノードの展開/折りたたみ | 7.3 | Feature | ✅ 機能実装 |
| 7.4 | ファイルリスト空時のメッセージ表示 | 7.4 | Feature | ✅ 機能実装 |
| 7.5 | スクロール対応 | 7.1 | Infrastructure | ✅ 基盤構造 |

**問題点**:

Task 7.1 の記述を確認すると、以下の内容が含まれている：
```
7.1 (P Infrastructure) GitFileTreeコンポーネントの基礎構造を作成する
  - 階層的なツリー構造レンダリング
  - ディレクトリノード: 折りたたみ可能、子ノード数表示
  - ファイルノード: ステータスアイコン（A: 緑+, M: 黄色●, D: 赤-）、ファイル名表示
  - スクロール可能な領域として実装
```

この記述は "基礎構造" と銘打たれているが、実際には：
- ✅ 階層ツリー構造レンダリング（Infrastructure）
- ❌ ディレクトリノード・ファイルノードの詳細実装（Feature相当の内容）

が混在している。Task 7.2-7.4 が独立した Feature タスクとして存在するため、**Task 7.1 は純粋な Infrastructure（データ構造変換、レンダリングループ）に留めるべき**。

**Red Flag: Task粒度の混在**
- Task 7.1 が Infrastructure と Feature の境界が曖昧
- Design.md の Requirements Traceability では Criterion 7.1-7.5 が明確に分離されているが、tasks.md では Task 7.1 に複数の責務が含まれている

**推奨対応**:
1. Task 7.1 を純粋な Infrastructure（"ツリー構造のデータ変換とレンダリングループ"）に限定
2. Task 7.2-7.4 で具体的なUI実装（アイコン、クリックハンドラ、展開ロジック）を実装
3. Coverage Matrix の Task Type 分類を再確認

### 1.5 Integration Test Coverage

**検証結果**: ⚠️ CRITICAL - State Sync Test 不足

Design.md の Integration Test Strategy セクションと tasks.md の Integration Tests セクションを照合：

| Integration Point | Design Section | Test Task | Status |
|-------------------|----------------|-----------|--------|
| Renderer → Main IPC (git:get-status) | "Git差分データ取得フロー" | 13.1 | ✅ |
| File Watch event broadcast | "File Watch自動更新フロー" | 13.2 | ✅ |
| GitView mount/unmount lifecycle | "Git差分データ取得フロー" | 13.3 | ✅ |
| GitFileTree → GitDiffViewer連携 | Component Integration | 13.4 | ✅ |
| CenterPaneContainer切り替え | SpecPane統合 | 13.5 | ✅ |
| Remote UI WebSocket通信 | Remote UI E2E | 13.6 | ✅ |
| **gitViewStore State Sync** | **（未記載）** | **（なし）** | ❌ **CRITICAL** |

**問題点**:

Design.md の "File Watch自動更新フロー" シーケンス図には以下の流れが記載されている：
```
GitFileWatcherService → broadcast('git:changes-detected')
→ IPC → GitView受信
→ gitViewStore更新
→ UI再レンダリング
```

しかし、tasks.md の Test 13.2 "File Watch event broadcast統合テスト" の検証ポイントには：
```
- 全Rendererがイベントを受信
- gitViewStore.cachedStatusが更新される
- GitFileTreeが再レンダリングされる
```

と記載されているが、**gitViewStore の State Sync ロジック自体が正しく動作するか（複数Renderer間、Remote UI間での同期）を検証する独立したテストタスクが存在しない**。

**推奨対応**:
- Task 13.2 を "File Watch broadcast" と "State Sync" に分離
- または、Task 13.7 として "gitViewStore State Sync Integration Test" を追加

### 1.6 Cross-Document Contradictions

**検証結果**: ⚠️ WARNING - 実装方式の曖昧性

#### 矛盾1: Untracked Files の差分生成方法

**Requirements.md** (Requirement 1.5):
> untracked filesを差分対象に含める（`git add -N`または合成diff生成）

**Design.md** (GitService Implementation Notes):
> - **Traditional method**: `git add -N <file>` (intent-to-add)
> - **Modern method (Git 2.44+)**: `git diff --include-untracked`
> - Untracked files require manual patch generation: read file content, generate unified diff

**Research.md**:
> - Use `git add -N` approach for compatibility with older Git versions
> - For each untracked file, generate synthetic diff: `+` prefix on all lines

**矛盾の詳細**:
- Requirements では「`git add -N` または 合成diff生成」と2つの選択肢を示唆
- Design では3つのアプローチ（`git add -N`, `git diff --include-untracked`, 手動パッチ生成）を列挙
- Research では `git add -N` を推奨としているが、Design の GitService Implementation では「手動パッチ生成が必要」とも記載

**影響**: 実装時に迷いが生じ、一貫性のない実装になる可能性

**推奨対応**:
- Design.md で最終的な実装方式を明確化（例: "Git 2.30未満は `git add -N`、Git 2.44以上は `--include-untracked`、フォールバックは手動パッチ生成"）
- tasks.md の Task 2.1 に具体的な実装方針を記載

---

## 2. Gap Analysis

### 2.1 Technical Considerations

#### Gap 1: Web Worker統合の実装タスク不足

**現状**:
- Design.md "DD-001: react-diff-view + refractor for Syntax Highlighting" で Web Worker 対応が言及されている
- Research.md "Risks & Mitigations" で「大規模差分（>10,000行）にWeb Worker使用」と記載
- しかし、tasks.md に Web Worker 統合の具体的な実装タスクが存在しない

**影響**: 大規模差分のパフォーマンス問題が未解決のまま実装される可能性

**推奨対応**:
- Task 8.1 を分割し、"8.1.1 基本的な差分表示" と "8.1.2 Web Worker統合（パフォーマンス最適化）" を作成
- または、Task 12.1 に "react-diff-view の `withTokenizeWorker` HOC 使用" を明記

#### Gap 2: Git Version互換性チェックの欠如

**現状**:
- Research.md で Git 2.44+ の `--include-untracked` オプションが言及されている
- Design.md で古いGitバージョンへのフォールバック処理が記載されている
- しかし、Git Version検知と分岐ロジックの実装タスクが明示されていない

**影響**: 古いGit環境でのエラーハンドリングが不十分になる可能性

**推奨対応**:
- Task 2.1 に "Git Version検知とフォールバック処理" を明記
- または、GitService の Validation セクションに追加

#### Gap 3: Remote UI環境でのFile Watch実装方法の不明確性

**現状**:
- Requirements.md の Open Questions Q2 で「WebSocketでのストリーミング通知 vs ポーリング」が未決定として記載されている
- Design.md では「WebSocket経由でブロードキャスト」と記載されているが、具体的な実装方式（Server-Sent Events、長時間接続WebSocket等）が不明
- tasks.md の Task 10.4 "webSocketHandler.ts にgit操作のWebSocketハンドラを追加" で言及されているが、ストリーミング通知の実装詳細が不足

**影響**: Remote UI環境でのリアルタイム更新が期待通りに動作しない可能性

**推奨対応**:
- Design.md の WebSocket handler セクションに "File Watch over WebSocket" の具体的なメッセージフォーマット・配信パターンを追記
- tasks.md の Task 10.4 に "File Watch通知のWebSocketストリーム実装" を明記

### 2.2 Operational Considerations

#### Gap 1: ログ実装の欠如

**現状**:
- Design.md "Error Handling - Monitoring" セクションで「ProjectLoggerにgit操作エラーを記録」と記載
- しかし、tasks.md に GitService/GitFileWatcherService のロギング実装タスクが存在しない
- Steering の logging.md に準拠したログフォーマットの実装が明記されていない

**影響**: デバッグ困難、本番環境でのトラブルシューティングが不可能

**推奨対応**:
- Task 2.1, 2.3 にロギング実装を明記
- または、独立したタスク "2.5 GitService/GitFileWatcherService のロギング実装" を追加

#### Gap 2: エラー時のフォールバック手順の不足

**現状**:
- Design.md "Error Handling" セクションでエラーカテゴリと User Message が定義されている
- しかし、chokidar起動失敗時の「手動更新ボタン表示」等のフォールバックUIの実装が tasks.md に明記されていない

**影響**: エラー発生時のユーザー体験が低下

**推奨対応**:
- Task 6.1 に "gitエラー時のフォールバックUI（手動更新ボタン）" を明記

#### Gap 3: パフォーマンス検証手順の不足

**現状**:
- Requirements.md の Requirement 12 でパフォーマンス最適化が要求されている
- Design.md の "Testing Strategy - Performance/Load Tests" セクションで具体的な測定項目（1000+ファイル、10,000+行差分等）が定義されている
- しかし、tasks.md に対応するパフォーマンステストタスクが存在しない

**影響**: パフォーマンス要件が満たされているか検証できない

**推奨対応**:
- Section 14 に "14.6 パフォーマンステスト" を追加
- または、Verification Commands に性能測定コマンドを追加

---

## 3. Ambiguities and Unknowns

### Ambiguity 1: gitViewStore の永続化方針の矛盾

**現状**:
- Design.md の gitViewStore State Management セクションで「localStorage非依存（セッション内のみ有効）」と記載
- しかし、同セクションで「リサイズ位置のみlayoutStoreと統合して永続化検討」とも記載
- tasks.md の Task 5.3 "切り替え状態を永続化する" で「layoutStoreまたはgitViewStoreにviewMode状態を追加」と曖昧

**影響**: 実装時にどの状態を永続化すべきか判断できない

**推奨明確化**:
- Design.md で永続化対象を明確化（例: "リサイズ位置とviewMode（Artifacts/Git Diff選択）のみ永続化、その他はセッション内のみ"）
- tasks.md の Task 5.3 で「layoutStoreに統合」と明記

### Ambiguity 2: CenterPaneContainer の実装場所

**現状**:
- Design.md "結合・廃止戦略" セクションで「`renderer/components/CenterPaneContainer.tsx` を新規作成」と記載
- しかし、Design.md "Component Summary" では「CenterPaneContainer | Renderer / Component」と分類
- Structure.md の "Component Organization Rules" では「共通コンポーネントは `shared/components/` に配置」とルール化
- CenterPaneContainer は Electron版専用か、Remote UI でも使用するか不明

**影響**: コンポーネント配置場所が誤る可能性

**推奨明確化**:
- Design.md の "Integration & Deprecation Strategy" に「CenterPaneContainerはElectron専用（SpecPane内部のみで使用）」または「Remote UI共通」を明記
- tasks.md の Task 5.1 に配置場所を明記

### Ambiguity 3: ショートカットキーの競合リスク

**現状**:
- Requirements.md の Decision Log で「Ctrl+Shift+Gは現在未使用を確認済み」と記載
- Design.md の DD-005 で「既存ショートカット（Ctrl+F: 検索）と競合しない」と記載
- しかし、**Remote UI環境でのブラウザ標準ショートカットとの競合確認が記載されていない**（例: Chrome の Ctrl+Shift+G は "前の検索結果"）

**影響**: Remote UI でショートカットが期待通り動作しない可能性

**推奨明確化**:
- Design.md に "Remote UI環境でのブラウザショートカット競合チェック" を追記
- tasks.md の Task 5.2 に "ブラウザ環境でのショートカット動作検証" を明記

---

## 4. Steering Alignment

### 4.1 Architecture Compatibility

**検証結果**: ✅ 良好

Design.md の "Existing Architecture Analysis" および "Architecture Pattern & Boundary Map" が structure.md の以下のルールに準拠していることを確認：

| Steering Rule | Design Compliance | Status |
|---------------|-------------------|--------|
| **Electron Process Boundary Rules** | GitServiceとGitFileWatcherServiceをMain Processに配置 | ✅ |
| Main Processが保持すべきステート | git差分データ、File Watcher状態をMainで管理 | ✅ |
| Rendererへの委譲禁止パターン | Rendererはキャッシュのみ保持、真実の情報源はMain | ✅ |
| **State Management Rules** | gitViewStoreをrenderer/stores/、git差分データはMainから受信 | ✅ |
| Domain State (SSOT) | git差分データはMainが管理、Rendererはキャッシュ | ✅ |
| UI State | gitViewStoreはUI状態（選択、展開、モード）のみ保持 | ✅ |
| **Component Organization Rules** | GitView関連をshared/components/git/に配置（10.5） | ✅ |

**Steeringコンプライアンス確認**:
- ✅ structure.md: Electron Process Boundary Rules遵守
- ✅ design-principles.md: 根本的解決（Renderer内git実行ではなく、正しいプロセス分離）
- ✅ tech.md: Remote UI対応設計（WebSocketApiClient拡張）

**矛盾なし**

### 4.2 Integration Concerns

#### Concern 1: SpecPane.tsx変更の影響範囲

**現状**:
- Design.md "結合・廃止戦略" で「SpecPane内の `<ArtifactEditor />` を `<CenterPaneContainer />` に置き換え」と記載
- しかし、**SpecPane.tsx の現在の実装構造が不明**であり、以下が不明確：
  - ArtifactEditor への props 渡し方（どのpropsを CenterPaneContainer に引き継ぐべきか）
  - ArtifactEditor の状態管理（editorStore等との連携）
  - 既存のレイアウト管理（layoutStore）との統合方法

**影響**: SpecPane変更時に既存機能を破壊する可能性

**推奨対応**:
- Task 9.1 実装前に SpecPane.tsx の現在の実装を確認
- CenterPaneContainer の props インターフェース設計を明確化

#### Concern 2: ResizeHandle の再利用性

**現状**:
- Design.md で「ResizeHandle（既存コンポーネント再利用）」と記載
- Structure.md で「ResizeHandle: 既存コンポーネントを再利用（変更不要）」と記載
- しかし、**現在の ResizeHandle 実装が GitView の 2カラムレイアウト（GitFileTree | GitDiffViewer）に適用可能か検証されていない**

**影響**: ResizeHandle が期待通り動作せず、実装時に追加修正が必要になる可能性

**推奨対応**:
- Task 6.1 実装前に ResizeHandle の現在の実装仕様を確認
- GitView のレイアウト構造が ResizeHandle の想定と一致するか検証

### 4.3 Migration Requirements

**検証結果**: ✅ 影響なし（新機能追加のため）

Design.md "結合・廃止戦略" セクションで以下を確認：

- **削除すべき既存ファイル**: なし
- **並行作成**: 新規ファイルのみ作成
- **影響を受けない既存機能**: AgentListPanel, WorkflowView, ResizeHandle, layoutStore, BugPane

**移行要件**: なし（既存機能への後方互換性が保たれている）

---

## 5. Recommendations

### Critical Issues (Must Fix)

#### 1. Task 7.1 の Infrastructure/Feature 分離

**Issue**: Task 7.1 が Infrastructure と Feature の境界が曖昧

**Recommended Action**:
1. Task 7.1 を純粋な Infrastructure（"ツリー構造のデータ変換とレンダリングループ"）に限定
2. Design.md の Requirements Traceability（Criterion 7.1-7.5）と tasks.md の Task Type 分類を再確認
3. Coverage Matrix を更新し、各 Criterion が明確に Infrastructure または Feature に分類されるようにする

**Affected Documents**: tasks.md

#### 2. gitViewStore State Sync Integration Test の追加

**Issue**: gitViewStore の State Sync ロジックを検証する独立したテストタスクが不足

**Recommended Action**:
1. Task 13.2 を "File Watch broadcast" と "State Sync" に分離
2. または、Task 13.7 "gitViewStore State Sync Integration Test" を追加し、以下を検証：
   - 複数Renderer間での gitViewStore 同期
   - Remote UI WebSocket経由での gitViewStore 同期
   - File Watch通知後の State 更新の一貫性

**Affected Documents**: tasks.md

#### 3. Refactoring Integrity Check の明確化

**Issue**: SpecPane.tsx 変更時の既存機能への影響範囲が不明確

**Recommended Action**:
1. Task 9.1 を詳細化し、以下を追加：
   - 現在の SpecPane.tsx 実装の確認手順
   - ArtifactEditor への props 引き継ぎ設計
   - 既存のeditorStore/layoutStoreとの統合方法
2. Design.md の "Integration & Deprecation Strategy" に SpecPane.tsx の変更影響範囲を追記

**Affected Documents**: tasks.md, design.md

### Warnings (Should Address)

#### 4. Web Worker統合タスクの明示

**Issue**: 大規模差分のパフォーマンス問題に対する Web Worker 統合タスクが不足

**Recommended Action**:
- Task 8.1 を分割：
  - 8.1.1 基本的な差分表示（react-diff-view + refractor）
  - 8.1.2 Web Worker統合（`withTokenizeWorker` HOC使用）
- または、Task 12.1 に "react-diff-view Web Worker統合" を明記

**Affected Documents**: tasks.md

#### 5. パフォーマンステストタスクの追加

**Issue**: Requirement 12（パフォーマンス最適化）の検証手順が不足

**Recommended Action**:
- Section 14 に以下を追加：
  - 14.6 大規模ファイル変更パフォーマンステスト（1000+ファイル）
  - 14.7 大規模差分表示パフォーマンステスト（10,000+行）
  - 14.8 File Watch debounce効果測定テスト

**Affected Documents**: tasks.md

#### 6. Remote UI WebSocket エラーハンドリングテストの追加

**Issue**: Remote UI環境での接続断・再接続時のエラーハンドリングテストが不足

**Recommended Action**:
- Task 13.6 を詳細化し、以下を追加：
  - WebSocket接続断時のエラー表示
  - 自動再接続後の gitViewStore 復元
  - File Watch通知の再購読

**Affected Documents**: tasks.md

#### 7. gitViewStore 永続化方針の明確化

**Issue**: どの状態を永続化すべきか曖昧

**Recommended Action**:
- Design.md の gitViewStore State Management セクションを更新し、以下を明記：
  - 永続化対象: リサイズ位置、viewMode（Artifacts/Git Diff選択）
  - セッション内のみ: 選択ファイル、ツリー展開状態、差分モード
- tasks.md の Task 5.3 で「layoutStoreに統合」と明記

**Affected Documents**: design.md, tasks.md

#### 8. ブラウザショートカット競合チェック

**Issue**: Remote UI環境でのブラウザ標準ショートカットとの競合が未確認

**Recommended Action**:
- Design.md の DD-005 に "Remote UI環境でのブラウザショートカット競合チェック" を追記
- tasks.md の Task 5.2 に "ブラウザ環境でのショートカット動作検証（Ctrl+Shift+G）" を明記

**Affected Documents**: design.md, tasks.md

### Suggestions (Nice to Have)

#### 9. Untracked Files 実装方式の明確化

**Issue**: `git add -N` vs `--include-untracked` vs 手動パッチ生成 の最終選択が不明

**Recommended Action**:
- Design.md の GitService Implementation Notes を更新し、以下のフローを明記：
  1. Git Version検知
  2. Git 2.44+ なら `git diff --include-untracked` 使用
  3. それ以外は `git add -N` + `git diff` 使用
  4. エラー時は手動パッチ生成にフォールバック

**Affected Documents**: design.md

#### 10. CenterPaneContainer 配置場所の明確化

**Issue**: Electron専用か Remote UI共通か不明

**Recommended Action**:
- Design.md の "Integration & Deprecation Strategy" に配置場所を明記
- Structure.md の Component Organization Rules に準拠した配置を確認

**Affected Documents**: design.md

#### 11. ログ実装タスクの追加

**Issue**: GitService/GitFileWatcherService のロギング実装が tasks.md に明記されていない

**Recommended Action**:
- Task 2.1, 2.3 にロギング実装を追記（steering/logging.md 準拠）
- または、独立したタスク "2.5 GitService/GitFileWatcherService のロギング実装" を追加

**Affected Documents**: tasks.md

---

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
| -------- | ----- | ------------------ | ------------------ |
| **CRITICAL** | Task 7.1 Infrastructure/Feature境界が曖昧 | Task 7.1を純粋なInfrastructure（データ変換・レンダリングループ）に限定し、Feature実装はTask 7.2-7.4に分離 | tasks.md |
| **CRITICAL** | gitViewStore State Sync Integration Test不足 | Task 13.2を分離、またはTask 13.7を追加（複数Renderer/Remote UI間のState同期検証） | tasks.md |
| **CRITICAL** | SpecPane.tsx変更の影響範囲不明確 | Task 9.1を詳細化（現在の実装確認、props引き継ぎ設計、既存store統合方法を追記） | tasks.md, design.md |
| WARNING | Web Worker統合タスク不足 | Task 8.1を分割（8.1.1基本実装、8.1.2 Web Worker統合）またはTask 12.1に明記 | tasks.md |
| WARNING | パフォーマンステストタスク不足 | Section 14にTask 14.6-14.8追加（大規模ファイル・差分のパフォーマンス測定） | tasks.md |
| WARNING | Remote UI WebSocketエラーハンドリングテスト不足 | Task 13.6を詳細化（接続断・再接続時のエラー処理検証） | tasks.md |
| WARNING | gitViewStore永続化方針が曖昧 | Design.mdのgitViewStore State Managementセクションを更新（永続化対象を明記） | design.md, tasks.md |
| WARNING | ブラウザショートカット競合未確認 | Design.md DD-005にRemote UI環境での競合チェック追記、Task 5.2に検証手順追加 | design.md, tasks.md |
| INFO | Untracked Files実装方式が不明確 | Design.md GitService Implementation Notesにフォールバック戦略を明記 | design.md |
| INFO | CenterPaneContainer配置場所が不明 | Design.md "Integration & Deprecation Strategy"に配置場所（Electron専用 or 共通）を明記 | design.md |
| INFO | ログ実装タスクが明記されていない | Task 2.1, 2.3にロギング実装追記（steering/logging.md準拠） | tasks.md |

---

_This review was generated by the document-review command._
