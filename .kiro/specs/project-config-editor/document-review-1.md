# Specification Review Report #1

**Feature**: project-config-editor
**Review Date**: 2026-02-03
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
| Critical | 0 |
| Warning | 3 |
| Info | 2 |

全体として、仕様ドキュメントは高品質で整合性が取れている。Requirements → Design → Tasksのトレーサビリティが明確に維持されている。ただし、いくつかの軽微な改善点と確認事項がある。

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

✅ **良好**: すべてのRequirement (1.1-6.4) がDesign.mdのRequirements Traceability表にマッピングされている。

**確認済み項目**:
- Requirement 1 (Projectタブ追加): DocsTabs, App.tsxコンポーネントにマッピング
- Requirement 2 (ファイル一覧): ProjectFileListコンポーネントにマッピング
- Requirement 3 (ファイル選択・エディタ): ProjectPane, ProjectFileEditorにマッピング
- Requirement 4 (保存): projectEditorStore, キーボードショートカットにマッピング
- Requirement 5 (外部変更検知): ProjectFileWatcherService, ExternalChangeDialogにマッピング
- Requirement 6 (Mobile対応): MobileLayout, ProjectView, ProjectDetailPageにマッピング

**矛盾なし**

### 1.2 Design ↔ Tasks Alignment

✅ **良好**: Designで定義されたコンポーネント・サービスがTasksに実装タスクとして含まれている。

| Design Component | Task |
|------------------|------|
| ProjectFileInfo型 | 1.1 |
| projectEditorStore | 1.2 |
| ProjectFileWatcherService | 2.1 |
| projectFileHandlers | 2.2 |
| ProjectFileList | 3.1 |
| ProjectFileEditor | 3.2 |
| ExternalChangeDialog | 3.3 |
| ProjectPane | 3.4 |
| DocsTabs拡張 | 4.1 |
| App.tsx統合 | 4.2 |
| WebSocketApiClient拡張 | 5.1 |
| IpcApiClient拡張 | 5.2 |
| WebSocketHandler追加 | 5.3 |
| ProjectView (Remote UI) | 6.1 |
| RemoteProjectEditor | 6.2 |
| ProjectDetailPage | 6.3 |
| MobileLayout追加 | 7.1 |
| Remote UI App.tsx統合 | 7.2 |
| DesktopLayoutタブ追加 | 8.1 |
| DesktopLayout統合 | 8.2 |

**矛盾なし**

### 1.3 Design ↔ Tasks Completeness

| Category | Design Definition | Task Coverage | Status |
|----------|-------------------|---------------|--------|
| UI Components | ProjectFileList, ProjectFileEditor, ProjectPane, ExternalChangeDialog | 3.1, 3.2, 3.3, 3.4 | ✅ |
| Services | ProjectFileWatcherService | 2.1 | ✅ |
| IPC Handlers | projectFileHandlers | 2.2, 2.3 | ✅ |
| State | projectEditorStore | 1.2 | ✅ |
| Remote UI Components | ProjectView, RemoteProjectEditor, ProjectDetailPage | 6.1, 6.2, 6.3 | ✅ |
| Types/Models | ProjectFileInfo, ProjectEditorState | 1.1, 1.2 | ✅ |

**完全性: OK**

### 1.4 Acceptance Criteria → Tasks Coverage

| Criterion | Summary | Mapped Task(s) | Task Type | Status |
|-----------|---------|----------------|-----------|--------|
| 1.1 | 左サイドバーに3タブ表示 | 4.1 | Feature | ✅ |
| 1.2 | Projectタブクリックで切り替え | 4.1, 4.2 | Feature | ✅ |
| 1.3 | アクティブ状態の視覚表示 | 4.1 | Feature | ✅ |
| 2.1 | ファイル一覧表示 | 3.1 | Feature | ✅ |
| 2.2 | 2グループ表示 | 1.1, 3.1 | Infrastructure, Feature | ✅ |
| 2.3 | ファイル名表示 | 1.1, 3.1 | Infrastructure, Feature | ✅ |
| 2.4 | CLAUDE.md不在時の表示 | 3.1 | Feature | ✅ |
| 2.5 | Steeringファイル不在時の表示 | 3.1 | Feature | ✅ |
| 3.1 | ファイル選択でエディタ表示 | 2.2, 2.3, 3.4, 5.1, 5.2 | Feature | ✅ |
| 3.2 | 選択ファイルのハイライト | 3.1 | Feature | ✅ |
| 3.3 | 右パネル非表示 | 4.2, 8.2 | Feature | ✅ |
| 3.4 | エディタで編集可能 | 3.2 | Feature | ✅ |
| 4.1 | Cmd+S保存 | 1.2, 2.2, 2.3, 3.2, 5.1, 5.2 | Infrastructure, Feature | ✅ |
| 4.2 | 保存成功トースト | 3.2 | Feature | ✅ |
| 4.3 | 保存失敗エラー表示 | 3.2 | Feature | ✅ |
| 4.4 | 未保存インジケーター | 1.2, 3.2 | Infrastructure, Feature | ✅ |
| 5.1 | 外部変更監視 | 2.1 | Infrastructure | ✅ |
| 5.2 | 外部変更通知 | 1.2, 3.3, 5.3 | Infrastructure, Feature | ✅ |
| 5.3 | リロード/無視選択 | 3.3 | Feature | ✅ |
| 5.4 | リロード時の再読み込み | 2.2, 3.3 | Feature | ✅ |
| 5.5 | 無視時の現状維持 | 3.3 | Feature | ✅ |
| 6.1 | Mobile版タブ追加 | 7.1, 7.2, 8.1 | Feature | ✅ |
| 6.2 | Mobileファイル一覧 | 5.1, 6.1, 7.2, 8.1, 8.2 | Infrastructure, Feature | ✅ |
| 6.3 | Mobile詳細ページ | 6.2, 6.3, 7.2 | Feature | ✅ |
| 6.4 | Mobile戻るボタン | 6.3 | Feature | ✅ |

**Validation Results**:
- [x] All criterion IDs from requirements.md are mapped
- [x] User-facing criteria have Feature Implementation tasks
- [x] No criterion relies solely on Infrastructure tasks

### 1.5 Integration Test Coverage

| Integration Point | Design Section | Test Task | Status |
|-------------------|----------------|-----------|--------|
| IPC File Operations | "ファイル選択から編集・保存フロー" | 9.2 | ✅ |
| File Watcher Events | "外部変更検知フロー" | 9.3 | ✅ |
| Store State Management | projectEditorStore | 9.1 | ✅ |

**Validation Results**:
- [x] All sequence diagrams have corresponding integration tests
- [x] All IPC channels have delivery verification tests
- [x] All store sync flows have state propagation tests

### 1.6 Cross-Document Contradictions

✅ **矛盾なし**: ドキュメント間で用語、数値、依存関係の不整合は検出されなかった。

## 2. Gap Analysis

### 2.1 Technical Considerations

#### ⚠️ WARNING: エラーハンドリングの詳細仕様不足

**現状**: Design.mdの「Error Handling」セクションでカテゴリ分けされているが、具体的なエラーコード、リトライ戦略、ログ出力パターンが未定義。

**推奨**: 以下を明確化
- ファイル読み込み失敗時のリトライ回数・間隔
- 権限エラー（読み取り専用ファイル）への対応
- ディスク容量不足時の対応

#### ⚠️ WARNING: ファイル監視の競合状態対策

**現状**: Design.mdでdebounce (300ms) が言及されているが、以下のエッジケースへの対応が不明確：
- ユーザー編集中 + 外部変更 + 即座のユーザー保存
- 複数の外部変更が短時間で連続発生
- ファイル監視の初期化タイミング（プロジェクト切り替え時）

**推奨**: エッジケースの振る舞いをDesignに明記

#### ℹ️ INFO: パフォーマンス考慮

**現状**: Steeringファイル一覧の取得頻度やキャッシュ戦略が未定義。

**補足**: 初期実装ではパフォーマンス問題は発生しにくいが、将来的に多数のSteeringファイルが存在する場合の考慮が必要になる可能性がある。

### 2.2 Operational Considerations

#### ℹ️ INFO: ドキュメント更新

**現状**: 新機能追加に伴うユーザー向けドキュメント（README等）の更新タスクが含まれていない。

**補足**: Out of Scopeとして明示されていないため、必要に応じて追加検討。

## 3. Ambiguities and Unknowns

### 解決済みのOpen Questions

requirements.mdの「Open Questions」セクションに記載された2項目は、design.mdのDesign Decisions (DD-003, DD-004) で解決済み：

| Question | Resolution |
|----------|------------|
| ArtifactEditorの再利用可否 | DD-004: 専用のProjectFileEditorを新規作成 |
| ファイル監視の実装方式 | DD-003: 新規ProjectFileWatcherServiceを作成 |

### 残存する曖昧さ

1. **未保存確認ダイアログの詳細**: 別ファイル選択時の「確認ダイアログ」のUI/UXが未定義（Error Handling > User Errorsで言及）
2. **エディタモード切り替え**: `mode: 'edit' | 'preview'`の切り替えUIが未定義（storeに定義あるがUIコンポーネント仕様に記載なし）

## 4. Steering Alignment

### 4.1 Architecture Compatibility

✅ **良好**: 以下のSteering原則に準拠

| Steering | Design準拠 |
|----------|-----------|
| State Management Rules (structure.md) | projectEditorStoreをshared/stores/に配置、Domain Stateとして管理 |
| Electron Process Boundary Rules (structure.md) | ファイル操作はMain Process、Renderer側はIPCキャッシュのみ |
| Component Organization Rules (structure.md) | shared/components/に共有コンポーネント配置 |
| Remote UI DesktopLayout設計原則 (tech.md) | DesktopLayoutがElectron版と同等の構成を維持 |

### 4.2 Integration Concerns

⚠️ **WARNING: shared/stores配置の確認**

**現状**: Design.mdで`projectEditorStore`は「State/Shared」レイヤーに配置と記載。これはsteering/structure.mdの「Domain State (SSOT)」ルールと整合。

**確認事項**: tasks.mdでは`shared/stores/projectEditorStore.ts`と明記されているが、このstoreが「編集中のUI状態」を含む点に注意。steering/structure.mdのルールでは：

> UI State: UIの一時的な状態、表示制御
> ドメインデータを含めてはならない

projectEditorStoreの`isDirty`, `isSaving`, `mode`はUI状態に近いが、`content`, `currentFilePath`はドメインデータとも解釈可能。

**推奨**: storeの責務を再確認し、必要に応じてUI state部分を分離するか、現状の設計を妥当とする理由をDesign Decisionに追記。

### 4.3 Migration Requirements

✅ **移行不要**: 新規機能のため、既存データやAPIの移行は発生しない。

## 5. Recommendations

### Critical Issues (Must Fix)

なし

### Warnings (Should Address)

1. **[W-001] エラーハンドリング詳細化**: ファイル操作失敗時の具体的な対応フローをDesignに追記
2. **[W-002] ファイル監視エッジケース**: 競合状態への対応方針をDesignに明記
3. **[W-003] Store責務の明確化**: projectEditorStoreがUI State/Domain Stateのどちらに分類されるか、Design Decisionで明示

### Suggestions (Nice to Have)

1. **[S-001] 未保存確認ダイアログの仕様追加**: ファイル切り替え時のユーザー確認UIの詳細
2. **[S-002] Preview モード切り替えUI**: edit/previewモード切り替えの具体的なUIコンポーネント仕様

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|-------------------|-------------------|
| Warning | W-001 | エラーハンドリングのリトライ戦略・ログ出力パターンを追記 | design.md |
| Warning | W-002 | ファイル監視のエッジケース対応を明記 | design.md |
| Warning | W-003 | projectEditorStoreの分類をDesign Decisionに追記 | design.md |
| Suggestion | S-001 | 未保存確認ダイアログの仕様を追加 | design.md |
| Suggestion | S-002 | Preview モード切り替えUIを追加 | design.md |

---

_This review was generated by the document-review command._
