# Specification Review Report #1

**Feature**: jj-merge-support
**Review Date**: 2026-01-27
**Documents Reviewed**: spec.json, requirements.md, design.md, tasks.md, events.jsonl

## Executive Summary

本仕様書のレビュー結果、以下のような問題が検出されました：
- **Critical Issues**: 7件（実装不可能または重大な設計欠陥）
- **Warnings**: 3件（推奨される修正）
- **Info**: 2件（改善提案）

主要な問題は、**Acceptance Criteria → Tasks Coverage**において、ユーザー向けUI機能に対する具体的な実装タスクが欠落していること、および**統合テストの不足**です。

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**✅ 全体的に良好**

- 全11要件がDesignのComponents and Interfacesセクションで明確にトレース可能
- Requirements Traceability表（design.md:248-299）で全criterion IDがカバーされている
- 技術選択（jj優先・gitフォールバック）がRequirementsのDecision Logと整合

**検出された問題**:

なし（全要件がDesignで適切にカバー）

### 1.2 Design ↔ Tasks Alignment

**⚠️ 一部不整合**

- Designで定義された9つのコンポーネントに対し、Tasksは11個のセクションで対応
- 基本的な対応関係は保たれているが、統合テストタスクの範囲が不明確

**検出された問題**:

| Design Component | Corresponding Task | Status |
| ---------------- | ------------------ | ------ |
| merge-spec.sh | 1.1 | ✅ |
| ProjectChecker.checkJjAvailability() | 2.1 | ✅ |
| SettingsFileManager | 3.1 | ✅ |
| IPC handlers | 4.1, 4.2, 4.3 | ✅ |
| ProjectStore | 5.1 | ✅ |
| JjInstallSection | 6.1 | ✅ |
| ProjectValidationPanel | 6.2 | ✅ |
| UnifiedCommandsetInstaller | 7.1 | ✅ |
| spec-merge.md | 8.1, 8.2 | ✅ |

### 1.3 Design ↔ Tasks Completeness

**❌ CRITICAL: UI実装タスクの欠落**

Design.mdでは以下のUI機能が定義されているが、Tasksに対応する実装タスクが**Infrastructure（準備）のみ**で、**Feature Implementation（実装）タスクが不足**：

| Category | Design Definition | Task Coverage | Status |
| -------- | ----------------- | ------------- | ------ |
| UI Components | JjInstallSection (メッセージ表示、ボタン実装) | 6.1（作成） | ✅ |
| UI Components | ProjectValidationPanel (条件分岐、セクション表示) | 6.2（統合） | ✅ |
| Services | ProjectChecker.checkJjAvailability() | 2.1（実装） | ✅ |
| Services | SettingsFileManager.setJjInstallIgnored() | 3.1（実装） | ✅ |
| Services | UnifiedCommandsetInstaller | 7.1（実装） | ✅ |
| Script | merge-spec.sh | 1.1（作成） | ✅ |
| Command | spec-merge.md | 8.1, 8.2（修正） | ✅ |
| Types/Models | ToolCheck型、Zodスキーマ | 9.1, 9.2（追加） | ✅ |

**再評価**: タスク構造を確認すると、UI実装タスク（6.1, 6.2）は存在しており、実装内容も明確に記載されている。したがって、**UI実装タスクの欠落問題は発生していない**。

### 1.4 Acceptance Criteria → Tasks Coverage

**✅ PASS: 全criterion IDがタスクにマッピング済み**

Requirements.mdの全54個のAcceptance Criteria（1.1〜11.4）について、tasks.mdのAppendix: Requirements Coverage Matrix（行206-255）で完全にマッピングされていることを確認。

| Criterion | Summary | Mapped Task(s) | Task Type | Status |
|-----------|---------|----------------|-----------|--------|
| 1.1 | jjコマンド存在確認 | 1.1 | Infrastructure | ✅ |
| 1.2 | jj存在時にjj squashでマージ | 1.1 | Infrastructure | ✅ |
| 1.3 | jj不在時にgit merge --squash | 1.1 | Infrastructure | ✅ |
| 3.2 | jj不在時に警告セクション表示 | 6.1, 6.2 | Feature | ✅ |
| 3.3 | インストール・無視ボタン提供 | 6.1 | Feature | ✅ |
| 4.2 | インストール中にスピナー表示 | 6.1 | Feature | ✅ |
| 4.4 | インストール失敗時にエラー表示 | 6.1 | Feature | ✅ |
| 10.2 | 「jjがインストールされていません」メッセージ | 6.1 | Feature | ✅ |
| 10.3 | 「インストール (brew)」「無視」ボタン表示 | 6.1 | Feature | ✅ |

**Validation Results**:
- ✅ All criterion IDs from requirements.md are mapped
- ✅ User-facing criteria have Feature Implementation tasks
- ✅ No criterion relies solely on Infrastructure tasks

**評価**: Tasks.mdのAppendix: Requirements Coverage Matrixにより、全criterion IDが適切なタスクにマッピングされていることが明確に示されている。ユーザー向け機能（3.2, 3.3, 4.2, 4.4, 10.2, 10.3）もFeatureタスク（6.1, 6.2）で実装されることが確認できる。

### 1.5 Integration Test Coverage

**❌ CRITICAL: 統合テストが不足**

Design.mdの「Integration Test Strategy」セクション（行1029-1093）では、以下の統合テストポイントが定義されているが、tasks.mdの統合テストタスク（10.1, 10.2, 10.3）では**IPC統合**と**状態伝播**の検証が明示的に含まれていない：

| Integration Point | Design Section | Test Task | Status |
|-------------------|----------------|-----------|--------|
| jjチェックフロー（UI → Store → IPC → Main） | "jj Installation Check Flow" | 10.1 | ⚠️ 部分的（IPC同期の検証が不明確） |
| jjインストールフロー（brew実行 → チェック再実行） | "jj Installation Flow" | 10.1 | ✅ |
| 無視設定永続化フロー（ボタン → 設定ファイル） | "jj Installation Flow" | 10.2 | ✅ |
| マージスクリプト実行（jj/git判定とフォールバック） | "Merge Script Execution Flow" | 10.3 | ✅ |
| IPC Status Sync（Renderer ↔ Main） | "Integration Test Strategy" | **(missing)** | ❌ CRITICAL |
| Store State Propagation（jjCheck更新 → UI再レンダリング） | "Integration Test Strategy" | **(missing)** | ❌ CRITICAL |

**問題の詳細**:

1. **IPC Status Sync検証タスクの欠落**:
   - Design.md行1043-1047で「jjチェックフロー」が定義され、IPC経由の通信フローが記載されている
   - しかし、tasks.md 10.1は「brewインストール → jjチェック再実行 → 警告消失」のみをテスト対象としており、**IPC通信の整合性（Renderer → Main → Rendererの往復）**を検証するタスクが存在しない

2. **Store State Propagation検証タスクの欠落**:
   - Design.md行1063-1075で「状態遷移監視（Zustand subscribe）」が推奨されている
   - tasks.mdには「ProjectStoreの状態遷移を検証」と記載があるが、**Zustandストアの状態変化をsubscribeして監視する具体的な検証手順**が欠落している

**Fallback Strategy**: なし（テストがない場合の代替手段が定義されていない）

### 1.6 Cross-Document Contradictions

**✅ 矛盾なし**

- jjインストール方法: 全ドキュメントで「brew install jj」に統一
- マージコマンド: 全ドキュメントで「jj squash --from <branch> --into <main>」に統一
- 設定保存場所: 全ドキュメントで「.kiro/sdd-orchestrator.json の settings.jjInstallIgnored」に統一

## 2. Gap Analysis

### 2.1 Technical Considerations

**❌ CRITICAL: エラーハンドリングの実装詳細が不足**

| Gap | Design Coverage | Task Coverage | Risk |
|-----|----------------|---------------|------|
| brewインストール失敗時のユーザーへのエラーメッセージ内容 | "エラーメッセージ表示" (design.md:819) | "エラーメッセージ表示" (tasks.md:104) | ⚠️ UI実装時に文言が不明確 |
| jqコマンド不在時のエラーメッセージ（merge-spec.sh） | "Error: jq not installed" (design.md:815) | "エラーメッセージ「brew install jq」" (tasks.md:26) | ✅ 文言が明確 |
| スクリプト実行権限不足時のエラーハンドリング | "権限変更コマンド案内" (design.md:733) | "実行権限不足時のエラーハンドリング（権限変更コマンド案内）" (tasks.md:139) | ✅ |

**推奨**: JjInstallSectionコンポーネントのエラー表示文言を明確化する（例: "Homebrewのインストールに失敗しました。手動で `brew install jj` を実行してください。"）

**⚠️ WARNING: セキュリティ考慮事項の記載不足**

- brewインストールコマンドの実行権限（sudoなし前提）が明示されていない
- Remote UIからのjjインストール機能の無効化がOut of Scopeで言及されているが、技術的な実装方針（PlatformProviderでの制限等）がDesignに記載されていない

**⚠️ WARNING: パフォーマンス要件の検証方法が不明確**

- Design.md行869-871で「jjチェック実行時間: 100ms未満」が目標として記載されているが、この目標を検証するテストタスクが存在しない

### 2.2 Operational Considerations

**✅ 概ね良好**

- デプロイ手順: commandsetインストール時に自動配置（UnifiedCommandsetInstaller）
- ロールバック戦略: スクリプトの上書き配置により、commandset再インストールで旧バージョンに戻せる
- モニタリング/ログ: ProjectLoggerでjjチェック結果をログ記録（design.md:827）

**検出された問題**:

なし（運用面での大きなギャップは検出されず）

## 3. Ambiguities and Unknowns

### 3.1 曖昧な記述

| Item | Location | Ambiguity | Impact |
|------|----------|-----------|--------|
| jjのバージョン互換性 | requirements.md:181 | Open Question: 特定バージョン以上が必要か不明 | 🟡 中程度（古いjjで動作不良の可能性） |
| スクリプトのログ出力先 | requirements.md:184 | Open Question: stdout? ファイル? | 🟢 低（デバッグ時の影響のみ） |
| brewタイムアウト設定 | design.md:684 | "タイムアウトは設定しない" → 実装時に具体的な値が必要か不明 | 🟡 中程度（長時間ハングの可能性） |

### 3.2 未定義の依存関係

**❌ CRITICAL: preload API定義の詳細不足**

- Design.md行1016-1023でpreload API追加が言及されているが、tasks.md 4.3では「型定義を追加」とだけ記載され、**具体的なpreload/index.ts実装内容が不明確**
- 特に、`window.electronAPI`への追加方法（ipcRenderer.invoke経由か、新規チャンネル作成か）が明示されていない

### 3.3 Pending Decisions

**Open Questions（requirements.md:181-186より）**:

1. jjのバージョン互換性要件はあるか？（特定のバージョン以上が必要など）
2. jjインストール失敗時のフォールバック動作は適切か？（gitに戻る）
3. macOS以外のプラットフォーム（Linux）でのインストールガイダンスは必要か？
4. スクリプトのログ出力先は？（stdout? ファイル?）
5. 既存の`update-spec-for-deploy.sh`との統合または呼び出しは必要か？

**推奨**: 実装前に上記5点を明確化し、requirements.mdのDecision Logに追加することを推奨

## 4. Steering Alignment

### 4.1 Architecture Compatibility

**✅ 良好**

- IPC設計パターン: tech.mdの「IPC設計パターン」（channels.ts, handlers.ts, preload）に準拠
- State Management: structure.mdの「State Management Rules」に準拠（Domain State: shared/stores/projectStore.ts, UI State: renderer/stores/editorStore.ts）
- Component Organization: structure.mdの「Component Organization Rules」に準拠（Shared Components: shared/components/, Platform-Specific: renderer/components/）

**検出された問題**:

なし（既存アーキテクチャパターンと整合）

### 4.2 Integration Concerns

**✅ 影響範囲は限定的**

- 既存機能への影響: spec-merge.mdの修正のみ（他機能への影響なし）
- 共有リソースの競合: なし（jjInstallIgnoredは新規フィールド）
- API互換性: 新規APIの追加のみ（既存IPCチャンネルへの変更なし）

**検出された問題**:

なし（既存機能との統合リスクは低い）

### 4.3 Migration Requirements

**✅ マイグレーション不要**

- データ移行: なし（新規フィールドはundefined → falseとして扱う）
- 段階的ロールアウト: commandsetインストール時に自動適用
- 後方互換性: 既存プロジェクトでもjjInstallIgnoredがない場合はfalseとして動作

**検出された問題**:

なし（マイグレーション要件は適切に考慮）

## 5. Recommendations

### Critical Issues (Must Fix)

1. **統合テストのIPC同期検証タスクを追加**
   - 対象: tasks.md Section 10
   - 内容: 「10.4 IPC Status Sync統合テスト」を新規追加
     - Renderer → IPC → Main → Rendererの往復通信の整合性を検証
     - Mock IPC transportを使用してIPC通信の成否を確認
     - `waitFor(() => expect(jjCheck).toBeDefined())`パターンで非同期処理を検証
   - 影響ドキュメント: tasks.md

2. **統合テストのStore State Propagation検証タスクを追加**
   - 対象: tasks.md Section 10
   - 内容: 「10.5 Store State Propagation統合テスト」を新規追加
     - Zustandストアの状態変化をsubscribeして監視
     - `store.subscribe((state) => { if (!state.jjInstallLoading) resolve(); })`パターンを実装
     - jjCheck更新 → UI再レンダリングの一連の流れを検証
   - 影響ドキュメント: tasks.md

3. **preload API実装の詳細をDesignに追加**
   - 対象: design.md "IPC Layer / Main Process" セクション
   - 内容: preload/index.tsでの`contextBridge.exposeInMainWorld`実装パターンを明記
     - 例: `checkJjAvailability: () => ipcRenderer.invoke(Channels.CHECK_JJ_AVAILABILITY)`
   - 影響ドキュメント: design.md

4. **brewインストールエラーメッセージ文言を明確化**
   - 対象: design.md "UI Components / Renderer" → JjInstallSection
   - 内容: エラーメッセージの具体的な文言を追加
     - 例: "Homebrewのインストールに失敗しました。手動で `brew install jj` を実行してください。エラー: {stderr}"
   - 影響ドキュメント: design.md

5. **Open Questionsの解決とDecision Log追記**
   - 対象: requirements.md Decision Log
   - 内容: 以下5点を明確化し、Decision Logに追記
     1. jjのバージョン互換性要件（最小バージョン指定の有無）
     2. jjインストール失敗時のフォールバック動作の確認
     3. macOS以外のプラットフォーム対応方針
     4. スクリプトのログ出力先（stdout推奨、理由も記載）
     5. update-spec-for-deploy.shとの統合不要の理由
   - 影響ドキュメント: requirements.md

6. **Remote UIからのjjインストール無効化の技術的実装方針を追加**
   - 対象: design.md "Architecture" セクション
   - 内容: PlatformProviderでのjjインストール機能の無効化パターンを記載
     - 例: `const { canInstallTools } = usePlatform(); if (!canInstallTools) return null;`
   - 影響ドキュメント: design.md

7. **パフォーマンス目標の検証タスクを追加**
   - 対象: tasks.md Section 10
   - 内容: 「10.6 パフォーマンス検証」を新規追加
     - jjチェック実行時間が100ms未満であることを確認
     - `performance.now()`で計測
   - 影響ドキュメント: tasks.md

### Warnings (Should Address)

1. **jjインストール中のタイムアウト設定の明確化**
   - 対象: design.md "IPC Layer / Main Process"
   - 内容: brewインストールのタイムアウト設定（推奨: 120秒、理由も記載）
   - 影響ドキュメント: design.md

2. **スクリプトのログ出力先の明確化**
   - 対象: design.md "Scripts / Infrastructure" → merge-spec.sh
   - 内容: スクリプトのログ出力先をstdoutと明記
   - 影響ドキュメント: design.md

3. **Zodスキーマの実装詳細を追加**
   - 対象: tasks.md 9.2
   - 内容: `z.object({ settings: z.object({ jjInstallIgnored: z.boolean().optional() }) })`の具体的なスキーマ定義を記載
   - 影響ドキュメント: tasks.md

### Suggestions (Nice to Have)

1. **jjインストール成功時の通知UI**
   - 現在の設計では、インストール成功時に警告が消えるのみ
   - 一時的な成功通知（トースト等）を表示すると、ユーザー体験が向上する可能性
   - 影響ドキュメント: design.md (UI Components)

2. **jjインストール進行状況の表示**
   - brewインストールは5-30秒かかるため、進行状況バー（不定形）を表示すると安心感が得られる
   - 影響ドキュメント: design.md (JjInstallSection)

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
| -------- | ----- | ------------------ | ------------------ |
| CRITICAL | IPC同期検証タスクの欠落 | tasks.md Section 10に「10.4 IPC Status Sync統合テスト」を追加 | tasks.md |
| CRITICAL | Store State Propagation検証タスクの欠落 | tasks.md Section 10に「10.5 Store State Propagation統合テスト」を追加 | tasks.md |
| CRITICAL | preload API実装詳細の不足 | design.md "IPC Layer"に`contextBridge.exposeInMainWorld`実装パターンを追加 | design.md |
| CRITICAL | brewエラーメッセージ文言の曖昧性 | design.md "JjInstallSection"にエラーメッセージの具体的な文言を追加 | design.md |
| CRITICAL | Open Questionsの未解決 | requirements.md Decision Logに5点の決定事項を追記 | requirements.md |
| CRITICAL | Remote UI jjインストール無効化の未定義 | design.md "Architecture"にPlatformProviderパターンを追加 | design.md |
| CRITICAL | パフォーマンス検証タスクの欠落 | tasks.md Section 10に「10.6 パフォーマンス検証」を追加 | tasks.md |
| WARNING | brewタイムアウト設定の曖昧性 | design.md "IPC Layer"にタイムアウト設定（推奨120秒）を明記 | design.md |
| WARNING | スクリプトログ出力先の未定義 | design.md "merge-spec.sh"にstdout出力を明記 | design.md |
| WARNING | Zodスキーマ実装詳細の不足 | tasks.md 9.2に具体的なスキーマ定義を追加 | tasks.md |
| INFO | jjインストール成功通知の不在 | design.md "JjInstallSection"に成功時のトースト通知を追加検討 | design.md (optional) |
| INFO | インストール進行状況表示の不在 | design.md "JjInstallSection"に進行状況バーを追加検討 | design.md (optional) |

---

_This review was generated by the document-review command._
