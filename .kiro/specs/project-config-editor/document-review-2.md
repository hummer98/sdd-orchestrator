# Specification Review Report #2

**Feature**: project-config-editor
**Review Date**: 2026-02-03
**Documents Reviewed**:
- spec.json
- requirements.md
- design.md
- tasks.md
- document-review-1.md (前回レビュー)
- document-review-1-reply.md (前回レビュー対応)
- steering/product.md
- steering/tech.md
- steering/structure.md
- steering/design-principles.md

## Executive Summary

| Severity | Count |
|----------|-------|
| Critical | 0 |
| Warning | 2 |
| Info | 1 |

前回レビュー#1で指摘されたW-003（Store責務の明確化）はDD-006の追加により対応済み。今回のレビューでは、より詳細な観点から新たな改善点を特定した。

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

✅ **良好**: 前回レビュー同様、すべてのRequirement (1.1-6.4) がDesign.mdのRequirements Traceability表にマッピングされている。

### 1.2 Design ↔ Tasks Alignment

✅ **良好**: Designで定義されたすべてのコンポーネント・サービスがTasksに実装タスクとして含まれている。

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

### 1.7 前回レビュー#1からの改善確認

| 前回指摘 | 対応状況 | 確認結果 |
|----------|----------|----------|
| W-001 (エラーハンドリング詳細化) | No Fix Needed (既存設計で十分) | ✅ 対応不要で妥当 |
| W-002 (ファイル監視エッジケース) | No Fix Needed (既存設計で十分) | ✅ 対応不要で妥当 |
| W-003 (Store責務の明確化) | Fix Applied (DD-006追加) | ✅ DD-006確認済 |

**DD-006の確認**:
- Design.md L545-553に「projectEditorStoreの配置先」が追加されている
- Remote UIとの共有が必要なためshared/stores/配置が妥当である理由が明記されている
- steering/structure.mdのルールとの関係が説明されている

## 2. Gap Analysis

### 2.1 Technical Considerations

#### ⚠️ WARNING: useProjectFilesカスタムフックの未定義

**現状**: Design.mdの「Components and Interfaces」表（L211）で`ProjectFileList`の依存関係に`useProjectFiles (P0)`と記載されているが、このカスタムフックの実装仕様がDesign.mdに定義されていない。

**影響**:
- tasks.md 3.1でProjectFileListを実装する際、`useProjectFiles`フックの責務・インターフェースが不明確
- ファイル一覧取得のロジックがコンポーネント内に埋め込まれるか、カスタムフックに分離されるかで実装の一貫性に影響

**推奨**: `useProjectFiles`フックのインターフェースをDesign.mdに追加、またはProjectFileList内で直接API呼び出しを行う方針を明記

**参照箇所**: Design.md L211, tasks.md L47-52

#### ⚠️ WARNING: Remote UI用ファイル一覧取得の共有フック不在

**現状**:
- Electron版: `ProjectFileList` (L211) → `useProjectFiles` → `IpcApiClient.listProjectFiles`
- Remote UI版: `ProjectView` (L217) → `WebSocketApiClient.listProjectFiles`

両方で同じファイル一覧取得ロジックが必要だが、`useProjectFiles`フックが`shared/hooks/`に配置されるか、各プラットフォーム固有の実装になるかが不明確。

**影響**:
- コード重複のリスク
- ApiClient抽象化層を活用した共通フックの設計機会の喪失

**推奨**: `useProjectFiles`を`shared/hooks/`に配置し、`useApiClient`経由で`IpcApiClient`/`WebSocketApiClient`を透過的に使用する設計を明記

### 2.2 Operational Considerations

#### ℹ️ INFO: テストカバレッジの明確化

**現状**: tasks.md Section 9で統合テスト・ユニットテストが定義されているが、以下が未定義：
- UIコンポーネント（ProjectFileList, ProjectFileEditor）のスナップショットテストまたはRTL（React Testing Library）テスト
- Remote UIコンポーネント（ProjectView, ProjectDetailPage）のテスト

**補足**: 既存プロジェクトのテスト方針に従えば問題ないが、tasks.mdでUIコンポーネントテストが明示的に含まれていない点を確認。

## 3. Ambiguities and Unknowns

### 解決済みの曖昧さ

前回レビュー#1で指摘されたOpen Questions（ArtifactEditor再利用、ファイル監視実装方式）はDesign Decisions DD-003, DD-004で解決済み。

### 残存する曖昧さ

1. **未保存確認ダイアログの詳細**: 前回指摘から継続。別ファイル選択時の「確認ダイアログ」のUI/UXが未定義（Error Handling > User Errorsで言及）。実装時に判断可能なレベルではあるが、明示的な仕様が望ましい。

2. **エディタモード切り替え**: 前回指摘から継続。`mode: 'edit' | 'preview'`の切り替えUIが未定義（storeに定義あるがUIコンポーネント仕様に記載なし）。MDEditorの標準機能として暗黙的に対応可能。

## 4. Steering Alignment

### 4.1 Architecture Compatibility

✅ **良好**: 以下のSteering原則に準拠

| Steering | Design準拠 |
|----------|-----------|
| State Management Rules (structure.md) | DD-006で明確化されたshared/stores/配置 ✅ |
| Electron Process Boundary Rules (structure.md) | ファイル操作はMain Process、Renderer側はIPCキャッシュのみ ✅ |
| Component Organization Rules (structure.md) | shared/components/に共有コンポーネント配置 ✅ |
| Remote UI DesktopLayout設計原則 (tech.md) | DesktopLayoutがElectron版と同等の構成を維持 ✅ |

### 4.2 Integration Concerns

✅ **問題なし**: 前回指摘のW-003はDD-006追加により解消済み。

### 4.3 Migration Requirements

✅ **移行不要**: 新規機能のため、既存データやAPIの移行は発生しない。

## 5. Recommendations

### Critical Issues (Must Fix)

なし

### Warnings (Should Address)

1. **[W-001] useProjectFilesフックの仕様追加**: `useProjectFiles`カスタムフックのインターフェースと配置場所（shared/hooks/推奨）をDesign.mdに明記
2. **[W-002] 共有フック設計の明確化**: Remote UI/Electron両方で使用するファイル操作フックの共有戦略をDesign.mdに追記

### Suggestions (Nice to Have)

1. **[S-001] 未保存確認ダイアログの仕様追加**: 前回指摘継続。ファイル切り替え時のユーザー確認UIの詳細
2. **[S-002] UIコンポーネントテスト追加**: ProjectFileList, ProjectFileEditorのRTLテストをtasks.mdに追加検討

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|-------------------|-------------------|
| Warning | W-001 | useProjectFilesフックのインターフェース定義を追加 | design.md |
| Warning | W-002 | shared/hooks/への配置とApiClient経由の設計を明記 | design.md |
| Suggestion | S-001 | 未保存確認ダイアログの仕様を追加 | design.md |
| Suggestion | S-002 | UIコンポーネントテストタスクを追加 | tasks.md |

---

## Review Comparison: #1 vs #2

| Aspect | Review #1 | Review #2 |
|--------|-----------|-----------|
| Critical | 0 | 0 |
| Warning | 3 | 2 |
| Info | 2 | 1 |
| Fixed Issues | - | W-003 (DD-006追加) |
| New Issues | - | W-001, W-002 (フック設計) |

**結論**: 前回指摘の修正対応は適切に行われた。今回新たに発見された課題はカスタムフック設計の詳細化であり、実装への影響は軽微。Warnings対応後、または現状のまま実装に進むことも可能。

---

_This review was generated by the document-review command._
