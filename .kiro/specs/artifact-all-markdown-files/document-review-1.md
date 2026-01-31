# Specification Review Report #1

**Feature**: artifact-all-markdown-files
**Review Date**: 2026-01-31
**Documents Reviewed**:
- spec.json
- requirements.md
- design.md
- tasks.md
- research.md
- .kiro/steering/product.md
- .kiro/steering/tech.md
- .kiro/steering/design-principles.md
- .kiro/steering/structure.md

## Executive Summary

本仕様書のレビューを実施した結果、**4件のCRITICAL問題**、**2件のWARNING**、**3件のINFO**を検出しました。

**Critical問題の概要**:
1. 受入基準7.1がFeature実装タスクにマッピングされていない（Infrastructure Taskのみ）
2. IPC統合テストの欠如（IPCエンドポイント追加にも関わらず統合テスト未定義）
3. File Watcher統合テストの検証ポイントが不明確
4. Remote UI対応に関する設計の曖昧性

これらの問題は実装前に対処することを強く推奨します。

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**✅ 良好**: すべての要件がDesignでカバーされており、要件IDのトレーサビリティも保たれています。

| Requirement | Design Coverage | Status |
|-------------|-----------------|--------|
| 1.1-1.4 | FileService.listMarkdownFilesInSpec | ✅ |
| 2.1-2.2 | SpecPane.additionalMarkdownTabs | ✅ |
| 3.1-3.4 | ArtifactEditor（既存機能活用） | ✅ |
| 4.1-4.4 | IPC/WebSocket APIエンドポイント | ✅ |
| 5.1-5.3 | SpecDetail型拡張 | ✅ |
| 6.1-6.4 | 既存機能互換性 | ✅ |
| 7.1-7.3 | パフォーマンス設計 | ✅ |

### 1.2 Design ↔ Tasks Alignment

**✅ 概ね良好**: DesignとTasksの整合性は取れていますが、いくつか改善の余地があります。

| Design Component | Task Coverage | Status |
|------------------|---------------|--------|
| FileService.listMarkdownFilesInSpec | Task 1.1 | ✅ |
| IPC/WebSocket API | Task 1.2, 1.3 | ✅ |
| SpecDetail型拡張 | Task 2.1 | ✅ |
| API Client拡張 | Task 3.1, 3.2 | ✅ |
| SpecPane動的タブ生成 | Task 4.1, 4.2 | ✅ |
| BugPane動的タブ生成 | Task 5.1, 5.2 | ✅ |

### 1.3 Design ↔ Tasks Completeness

**✅ 良好**: Designで定義されたコンポーネントは全てTasksに実装項目として含まれています。

| Category | Design Definition | Task Coverage | Status |
|----------|-------------------|---------------|--------|
| Services | FileService.listMarkdownFilesInSpec | 1.1 | ✅ |
| API Endpoints | IPC/WebSocket | 1.2, 1.3 | ✅ |
| Type Definitions | SpecDetail/BugDetail拡張 | 2.1 | ✅ |
| UI Components | SpecPane/BugPane動的タブ | 4.1, 4.2, 5.1, 5.2 | ✅ |
| Integration Points | ApiClient拡張 | 3.1, 3.2 | ✅ |

**CRITICAL: Remote UI対応の設計不足**
- Designで`RemoteArtifactEditor.tsx`と`RemoteBugArtifactEditor.tsx`の変更が言及されている（design.md:494-495）
- しかし、Tasksには該当する実装タスクが存在しない
- Remote UI版の動的タブ生成ロジック実装が抜け落ちている可能性

### 1.4 Acceptance Criteria → Tasks Coverage

**❌ CRITICAL**: 受入基準7.1がFeature実装タスクに適切にマッピングされていません。

| Criterion | Summary | Mapped Task(s) | Task Type | Status |
|-----------|---------|----------------|-----------|--------|
| 1.1 | specフォルダ直下の*.md検出 | 1.1 | Infrastructure | ✅ |
| 1.2 | サブディレクトリ除外 | 1.1 | Infrastructure | ✅ |
| 1.3 | タブ表示 | 4.1, 4.2, 5.1, 5.2 | Feature | ✅ |
| 1.4 | リアルタイム更新 | 7.2 | Integration Test | ✅ |
| 2.1 | タブ表示順序 | 4.1, 4.2, 8.1 | Feature | ✅ |
| 2.2 | 各グループ内の順序保持 | 4.1, 4.2 | Feature | ✅ |
| 3.1 | タブクリック→内容表示 | 6.1, 8.2 | Feature | ✅ |
| 3.2 | 編集機能提供 | 6.1 | Feature | ✅ |
| 3.3 | 保存機能 | 6.1, 8.2 | Feature | ✅ |
| 3.4 | 未保存変更の確認ダイアログ | 6.1 | Feature | ✅ |
| 4.1 | IPC API提供 | 1.2 | Infrastructure | ✅ |
| 4.2 | ファイル名のみ返す | 1.1 | Infrastructure | ✅ |
| 4.3 | spec非存在時エラー | 1.1, 6.2 | Infrastructure | ✅ |
| 4.4 | WebSocket API提供 | 1.3 | Infrastructure | ✅ |
| 5.1 | SpecDetail型拡張 | 2.1 | Infrastructure | ✅ |
| 5.2 | getSpecDetail呼び出し時の設定 | 3.1, 3.2 | Feature | ✅ |
| 5.3 | 固定ファイル除外しない | 1.1 | Infrastructure | ✅ |
| 6.1 | 固定タブの動作変更なし | 4.2, 6.1 | Feature | ✅ |
| 6.2 | 動的タブの動作変更なし | 4.2, 6.1 | Feature | ✅ |
| 6.3 | BugPaneにも同等機能 | 5.1, 5.2, 8.3 | Feature | ✅ |
| 6.4 | *.mdファイル0個時のメッセージ | 6.2 | Feature | ✅ |
| 7.1 | 100ms以内の取得 | 1.1, 9.1 | Infrastructure | ❌ **CRITICAL** |
| 7.2 | 100個超でもブロックなし | 4.1, 9.1 | Infrastructure | ✅ |
| 7.3 | 既存ウォッチャー活用 | 7.2 | Infrastructure | ✅ |

**CRITICAL問題: 受入基準7.1**
- **問題**: 「100ms以内の取得」という要件に対して、Task 1.1（FileService実装）とTask 9.1（パフォーマンス測定）のみがマッピングされている
- **分析**: Task 1.1は基盤構築（Infrastructure）、Task 9.1は検証（Test）であり、いずれもFeature実装ではない
- **影響**: パフォーマンス要件を満たすための具体的な実装方針（キャッシング、最適化等）が明示されていない
- **推奨**: 現在の設計で100ms以内を達成できる理由を明記するか、最適化タスクを追加すべき

**Validation Results**:
- [x] All criterion IDs from requirements.md are mapped
- [ ] **User-facing criteria have Feature Implementation tasks** ← 7.1が不適切
- [x] No criterion relies solely on Infrastructure tasks (except 7.1)

### 1.5 Integration Test Coverage

**❌ CRITICAL**: IPC統合テストが不十分です。

| Integration Point | Design Section | Test Task | Status |
|-------------------|----------------|-----------|--------|
| IPC API (list-markdown-files-in-spec) | fileHandlers.ts (design.md:305) | 7.1 | ⚠️ **不明確** |
| WebSocket API (list-markdown-files-in-spec) | webSocketHandler.ts (design.md:313) | 7.1, 7.3 | ⚠️ **不明確** |
| File Watcher連携 | specsWatcherService (design.md:122) | 7.2 | ⚠️ **不明確** |
| Remote UI対応 | RemoteArtifactEditor (design.md:551) | 7.3 | ⚠️ **不明確** |

**CRITICAL問題: IPC統合テストの欠如**
- **問題**: Task 7.1「Integration test: ファイル一覧取得フロー」は、具体的な検証ポイントが不明確
- **分析**: Design.mdでは新規IPCエンドポイント（list-markdown-files-in-spec）の追加が明示されているが、Tasksではその統合テストの詳細が記載されていない
- **影響**: Renderer → IPC → FileService → ファイルシステム の一連のフローが適切にテストされない可能性
- **推奨**: 以下の検証ポイントを明記すべき
  - IPCハンドラの登録確認
  - preloadでのAPI公開確認
  - Result型のエラーハンドリング検証
  - WebSocket経由での同等動作確認

**Validation Results**:
- [ ] **All sequence diagrams have corresponding integration tests** ← IPC連携フローのテストが不明確
- [x] All IPC channels have delivery verification tests（ただし詳細不明）
- [x] All store sync flows have state propagation tests（該当なし: このfeatureではstore syncなし）

### 1.6 Cross-Document Contradictions

**✅ 矛盾なし**: 文書間で矛盾する記述は検出されませんでした。

## 2. Gap Analysis

### 2.1 Technical Considerations

**INFO: エラーハンドリング**
- ✅ FileServiceのResult型によるエラー返却（design.md:350）
- ✅ ディレクトリ非存在、権限エラーのハンドリング（design.md:353-365）
- ✅ パストラバーサル検証（design.md:203）

**WARNING: ログ記録の詳細不足**
- Design.mdではProjectLoggerによるログ記録が言及されている（design.md:369）
- しかし、具体的なログレベル（info/warn/error）や、どの操作をログに記録するかが明示されていない
- steering/logging.mdとの整合性確認が必要

**INFO: セキュリティ考慮**
- ✅ isPathSafe検証によるディレクトリトラバーサル防止（design.md:203）
- ✅ Main ProcessでのファイルI/O処理（Rendererに機密情報を渡さない）

**INFO: パフォーマンス**
- ✅ readdirの同期処理で100ms以内達成可能（design.md:226）
- ✅ React useMemoによる再計算最小化（design.md:239）
- ⚠️ ただし、具体的なベンチマーク結果や根拠がない

### 2.2 Operational Considerations

**✅ 良好**: デプロイ、ロールバック、監視について適切に考慮されています。

- **デプロイ**: Electronアプリのビルドプロセス内で統合（既存パターン踏襲）
- **ロールバック**: 後方互換性を保持（markdownFilesはオプショナルフィールド）
- **監視**: ProjectLoggerによるログ記録、エラー時のトースト通知（design.md:370）
- **ドキュメント**: 本レビュー自体がドキュメント品質管理の一環

## 3. Ambiguities and Unknowns

### 曖昧な記述

1. **File Watcher統合テスト（Task 7.2）の検証ポイントが不明確**
   - 「*.mdファイル追加時にspecs-changedイベントが送信されることを確認」とあるが、具体的な検証方法が不明
   - 既存のspecsWatcherServiceを活用するとあるが、新規ファイル検出ロジックとの連携テストが明示されていない

2. **Remote UI対応の実装範囲が不明確**
   - Design.md:494-495で`RemoteArtifactEditor.tsx`と`RemoteBugArtifactEditor.tsx`の変更が言及されている
   - しかし、Tasksには該当する実装タスクが存在しない
   - Remote UI版の動的タブ生成ロジックはElectron版と共有するのか、独自実装するのかが不明

3. **パフォーマンス要件の根拠不足**
   - Requirements 7.1で「100ms以内」と明記されているが、この数値の根拠が不明
   - Design.md:226で「readdir操作は同期的処理で十分高速」とあるが、具体的なベンチマーク結果がない

### 未定義の依存関係

**✅ 良好**: 外部依存関係は明確に定義されています（fs.readdir, chokidar等）。

### 保留中の決定事項

**Open Questions（requirements.md:110-114）で以下が言及されているが、Design/Tasksで解決されていない**:
- ✅ ファイルウォッチャーの実装方法 → Design.md:122で解決（既存ウォッチャー活用）
- ⚠️ Remote UI対応の優先度 → Designでは「両方で同等の機能」とあるが、Tasksで段階的実装か同時実装かが不明
- ✅ エラーハンドリング → Design.md:346で解決（既存パターン踏襲）

## 4. Steering Alignment

### 4.1 Architecture Compatibility

**✅ 良好**: 既存アーキテクチャとの整合性が保たれています。

| Steering原則 | 本仕様の遵守状況 |
|--------------|-----------------|
| **DRY** | ✅ 固定・動的タブの除外ロジック共通化（design.md:461） |
| **SSOT** | ✅ SpecDetailをファイル一覧の単一情報源とする（design.md:451） |
| **KISS** | ✅ 既存dynamicTabsメカニズムを拡張（複雑な新規設計を回避） |
| **YAGNI** | ✅ タブグループ化やファイルエクスプローラーは将来対応（design.md:425） |
| **関心の分離** | ✅ FileService（ファイルI/O）、SpecPane（UI）の責務分離 |

**State Management Rules遵守状況**:
- ✅ `SpecDetail.markdownFiles`は`shared/stores/`ではなく、IPC経由の読み取り専用データ（適切）
- ✅ UI StateとDomain Stateの分離が保たれている
- ✅ Main Processでファイルシステム操作（Electron Process Boundary Rules遵守）

**Component Organization Rules遵守状況**:
- ✅ `ArtifactEditor`は`shared/components/`に配置済み（SSOT）
- ⚠️ **WARNING**: `RemoteArtifactEditor`の実装タスクがTasksに含まれていない（前述のCRITICAL問題）

### 4.2 Integration Concerns

**INFO: 既存機能への影響**
- ✅ 固定タブ（requirements, design, tasks, research）の動作は変更しない（design.md:161）
- ✅ 動的タブ（document-review, inspection）の動作は変更しない（design.md:162）
- ✅ ArtifactEditor本体の変更は不要（既存dynamicTabs処理を活用）

**INFO: 共有リソース**
- ✅ specsWatcherServiceの既存実装を活用（新規ウォッチャー不要）
- ✅ IPC/WebSocket APIに新規エンドポイント追加（既存エンドポイントと並行）

**INFO: API互換性**
- ✅ `SpecDetail.markdownFiles`はオプショナルフィールド（後方互換性保持）
- ✅ 既存のdynamicTabsプロパティは配列要素増加に対応済み

### 4.3 Migration Requirements

**✅ 良好**: マイグレーション要件は最小限です。

- **データ移行**: 不要（新規フィールドのみ追加）
- **段階的ロールアウト**: 不要（オプショナルフィールドによる後方互換性）
- **後方互換性**: ✅ 保証されている（markdownFilesフィールド未定義時も既存動作を維持）

## 5. Recommendations

### Critical Issues (Must Fix)

#### C-1: Remote UI実装タスクの追加

**問題**: Design.md:494-495で言及されている`RemoteArtifactEditor.tsx`と`RemoteBugArtifactEditor.tsx`の変更タスクが存在しない。

**推奨アクション**:
- **Tasksに新規タスク追加**: "Remote UI: SpecPane/BugPane相当の動的タブ生成ロジック実装"
- **影響ドキュメント**: tasks.md
- **タスク例**:
  ```markdown
  - [ ] 7.4 Remote UI対応
    - RemoteArtifactEditor.tsxにadditionalMarkdownTabsロジック追加
    - RemoteBugArtifactEditor.tsxにadditionalMarkdownTabsロジック追加
    - SpecPane/BugPaneと同等の動的タブ生成を実装
    - _Requirements: 4.4_
  ```

#### C-2: IPC統合テストの詳細化

**問題**: Task 7.1「Integration test: ファイル一覧取得フロー」の検証ポイントが不明確。

**推奨アクション**:
- **Tasksの詳細化**: Task 7.1に以下の検証ポイントを追記
  - IPCハンドラの登録確認（channels.ts, fileHandlers.ts）
  - preloadでのAPI公開確認（preload/index.ts）
  - Result型のエラーハンドリング検証（FileError返却）
  - WebSocket経由での同等動作確認
- **影響ドキュメント**: tasks.md

#### C-3: File Watcher統合テストの検証ポイント明記

**問題**: Task 7.2「Integration test: File Watcher連携」の検証方法が不明確。

**推奨アクション**:
- **Tasksの詳細化**: Task 7.2に以下の検証ポイントを追記
  - テスト用specフォルダに*.mdファイルを追加
  - specsWatcherServiceがspecs-changedイベントを送信することを確認
  - SpecStoreがイベントを受信してspecDetail再読み込みをトリガーすることを確認
  - SpecPaneのadditionalMarkdownTabsが更新されることを確認
- **影響ドキュメント**: tasks.md

#### C-4: 受入基準7.1のFeature実装タスク追加または根拠明記

**問題**: 「100ms以内の取得」という要件に対して、Feature実装タスクが存在しない。

**推奨アクション（2つの選択肢）**:

**Option A（推奨）**: Designに根拠を追記
- Design.md Section 2.4に「パフォーマンス要件の根拠」セクションを追加
- readdir操作のベンチマーク結果を記載（通常10-30ms程度）
- 「最適化不要、基本実装で要件達成可能」と明記

**Option B**: 最適化タスクを追加
- Task 1.1に最適化実装を追記（キャッシング、非同期処理等）
- ただし、現時点では不要と判断（readdir操作は十分高速）

### Warnings (Should Address)

#### W-1: ログ記録の詳細化

**問題**: Design.md:369でProjectLoggerによるログ記録が言及されているが、詳細が不明。

**推奨アクション**:
- **Designに追記**: Section 6（Error Handling）にログ記録の詳細を追加
  - ログレベル（info/warn/error）の使い分け
  - どの操作をログに記録するか（ファイル検出成功/失敗、エラー詳細）
  - steering/logging.mdとの整合性確認
- **影響ドキュメント**: design.md

#### W-2: パフォーマンステストの具体化

**問題**: Task 9.1「パフォーマンス測定」の具体的な測定方法が不明。

**推奨アクション**:
- **Tasksに詳細追記**: Task 9.1に以下を明記
  - 測定ツール（console.time/timeEnd、vitest benchmark等）
  - 測定環境（通常のSSD環境、ファイル数のバリエーション）
  - 合格基準（100ms以内、100個のファイルでもブロックなし）
- **影響ドキュメント**: tasks.md

### Suggestions (Nice to Have)

#### S-1: Design Decision追加（Remote UI対応の段階的実装）

**提案**: Design.md Section 11（Design Decisions）に「Remote UI対応の段階的実装」を追加。

**理由**: Open Questions（requirements.md:112）で「段階的実装か同時実装か」が保留されていたが、Designでは解決されていない。

**内容例**:
```markdown
### DD-006: Remote UI対応の実装タイミング

| Field | Detail |
|-------|--------|
| Status | Accepted |
| Context | Electron版とRemote UI版を同時実装するか、段階的に実装するか |
| Decision | Electron版とRemote UI版を同時実装する |
| Rationale | 共有コンポーネント（ArtifactEditor）を活用するため、差分実装は最小限。段階的実装でもコスト削減効果は小さい。 |
| Alternatives Considered | 段階的実装（Electron → Remote UI） → コード共有のメリットを活かせない |
| Consequences | 初回リリース時に両環境で同等の機能を提供できる |
```

#### S-2: Research.mdにベンチマーク結果を追記

**提案**: research.mdに「Investigation 5: パフォーマンス検証」セクションを追加。

**内容**: readdir操作のベンチマーク結果を記載し、100ms以内達成可能な根拠を明確化。

#### S-3: Design.mdにシーケンス図追加（File Watcher連携）

**提案**: Design.md Section 4（System Flows）にFile Watcher連携の詳細シーケンス図を追加。

**理由**: 現在のシーケンス図（design.md:122-136）はイベント送信までしか記載されておらず、UI側の更新フローが不明確。

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|--------------------|--------------------|
| **CRITICAL** | Remote UI実装タスク欠如 | Tasksに「Remote UI: 動的タブ生成ロジック実装」タスク追加 | tasks.md |
| **CRITICAL** | IPC統合テスト不明確 | Task 7.1の検証ポイント詳細化 | tasks.md |
| **CRITICAL** | File Watcher統合テスト不明確 | Task 7.2の検証ポイント詳細化 | tasks.md |
| **CRITICAL** | 受入基準7.1のFeature実装欠如 | Design.mdにパフォーマンス根拠を追記、またはTask 1.1に最適化実装を追加 | design.md or tasks.md |
| **WARNING** | ログ記録詳細不足 | Design.md Section 6にログ記録詳細を追加 | design.md |
| **WARNING** | パフォーマンステスト不明確 | Task 9.1に測定方法・合格基準を明記 | tasks.md |
| **INFO** | Design Decision追加 | Design.md Section 11に「Remote UI対応の実装タイミング」を追加 | design.md |
| **INFO** | ベンチマーク結果不足 | research.mdにreaddir操作のベンチマーク結果を追記 | research.md |

---

_This review was generated by the document-review command._
