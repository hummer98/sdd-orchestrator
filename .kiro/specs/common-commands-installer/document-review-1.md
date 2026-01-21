# Specification Review Report #1

**Feature**: common-commands-installer
**Review Date**: 2026-01-21
**Documents Reviewed**: spec.json, requirements.md, design.md, tasks.md, product.md, tech.md, structure.md, design-principles.md

## Executive Summary

| Severity | Count |
|----------|-------|
| Critical | 0 |
| Warning | 3 |
| Info | 2 |

**Overall Assessment**: 仕様は良好に構成されており、実装を進めることができる状態です。いくつかの警告事項を確認の上、対応を検討してください。

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**Status**: ✅ 整合性あり

Requirements で定義された 12 の Acceptance Criteria すべてが Design の Requirements Traceability テーブル (design.md:130-146) にマッピングされています。

| Requirement | Criterion Count | Design Coverage |
|-------------|-----------------|-----------------|
| Req 1: 暗黙的インストール廃止 | 2 (1.1, 1.2) | ✅ handlers.ts 修正 |
| Req 2: コマンドセットインストール統合 | 3 (2.1-2.3) | ✅ UnifiedCommandsetInstaller 拡張 |
| Req 3: 上書き確認 | 5 (3.1-3.5) | ✅ CommandsetInstallDialog 拡張 |
| Req 4: 拡張可能な設計 | 3 (4.1-4.3) | ✅ CommonCommandsInstallerService 拡張 |

### 1.2 Design ↔ Tasks Alignment

**Status**: ✅ 整合性あり

Design で定義された主要コンポーネントと Tasks のマッピング:

| Design Component | Related Tasks | Status |
|-----------------|---------------|--------|
| CommonCommandsInstallerService | 2.1, 2.2, 2.3, 6.1 | ✅ |
| UnifiedCommandsetInstaller | 3.1, 3.2, 6.2 | ✅ |
| CommandsetInstallDialog | 5.1, 5.2, 5.3 | ✅ |
| handlers.ts | 1.1, 4.1, 6.3 | ✅ |

### 1.3 Design ↔ Tasks Completeness

| Category | Design Definition | Task Coverage | Status |
|----------|------------------|---------------|--------|
| UI Components | CommandsetInstallDialog (common-command-confirm 状態) | 5.1, 5.2, 5.3 | ✅ |
| Services | CommonCommandsInstallerService.listCommonCommands, checkConflicts, installAllCommands | 2.1, 2.2, 2.3 | ✅ |
| Types/Models | CommonCommandInfo, CommonCommandConflict, CommonCommandDecision, CommonCommandsInstallResult | 2.1, 2.2, 2.3 に含む | ✅ |
| IPC Handlers | confirmCommonCommands | 4.1 | ✅ |

### 1.4 Acceptance Criteria → Tasks Coverage

| Criterion | Summary | Mapped Task(s) | Task Type | Status |
|-----------|---------|----------------|-----------|--------|
| 1.1 | プロジェクト選択時にcommit.md自動インストールなし | 1.1, 6.3 | Feature, Test | ✅ |
| 1.2 | setProjectPath()からロジック削除 | 1.1 | Feature | ✅ |
| 2.1 | プロファイルインストール時にcommonコマンド | 3.1, 5.3, 6.2 | Feature, Test | ✅ |
| 2.2 | .claude/commands/にインストール | 3.1 | Feature | ✅ |
| 2.3 | 失敗時は警告ログで続行 | 3.1, 6.2 | Feature, Test | ✅ |
| 3.1 | 既存ファイル時に確認ダイアログ | 2.2, 5.1 | Feature | ✅ |
| 3.2 | ファイルごとに個別確認 | 2.2, 5.2 | Feature | ✅ |
| 3.3 | 上書き/スキップオプション | 5.2 | Feature | ✅ |
| 3.4 | スキップ時は既存ファイル保持 | 2.3, 3.2, 4.1, 6.1 | Feature, Test | ✅ |
| 3.5 | 上書き時はテンプレート置換 | 2.3, 3.2, 4.1, 6.1 | Feature, Test | ✅ |
| 4.1 | commonコマンドリストサポート | 2.1, 6.1 | Feature, Test | ✅ |
| 4.2 | テンプレートは中央ディレクトリ | 2.1, 6.1 | Feature, Test | ✅ |
| 4.3 | ファイル追加のみで新コマンド対応 | 2.1, 6.1 | Feature, Test | ✅ |

**Validation Results**:
- [x] All criterion IDs from requirements.md are mapped
- [x] User-facing criteria have Feature Implementation tasks
- [x] No criterion relies solely on Infrastructure tasks

### 1.5 Cross-Document Contradictions

**検出された矛盾**: なし

## 2. Gap Analysis

### 2.1 Technical Considerations

#### ⚠️ WARNING-1: Remote UIからのコマンドセットインストール時の挙動

**Issue**: design.md:23 で「Remote UIでのcommonコマンド上書き確認（Desktop UI専用）」がNon-Goalsに挙げられているが、Remote UIからコマンドセットインストール自体は可能である場合の挙動が未定義。

**Current State**:
- Remote UIからinstallByProfileを呼び出した場合、コンフリクトがあっても確認UIを表示できない
- 現在の設計ではコンフリクト情報がIPCで返却されるが、Remote UI側での処理が不明

**Recommendation**:
- Option A: Remote UIからのinstallByProfile呼び出し時は、commonコマンドを自動スキップ（既存ファイル優先）
- Option B: Remote UIからのコマンドセットインストール自体を無効化

#### ⚠️ WARNING-2: Preload API定義の明示

**Issue**: confirmCommonCommands IPCハンドラの追加に伴い、preload.ts での API エクスポートが必要だが、tasks.md で明示されていない。

**Current State**: Task 4.1 でIPCハンドラの追加は記述されているが、preload層の変更が含まれていない。

**Recommendation**: Task 4.1 に preload.ts への confirmCommonCommands 追加を明記、または別タスク（4.2）として追加。

#### ⚠️ WARNING-3: electronAPI型定義の更新

**Issue**: Renderer側でelectronAPI.confirmCommonCommandsを呼び出すため、型定義の更新が必要。

**Current State**: types/electron.d.ts や preload の型定義更新がTasksに含まれていない。

**Recommendation**: Task 4.1 に型定義の更新を明記。

### 2.2 Operational Considerations

**Status**: ✅ 問題なし

- デプロイ: Electronアプリのビルドプロセスに影響なし
- ロールバック: 機能追加のため、以前のバージョンへのロールバック可能
- ドキュメント: Out of Scope に明記されているため、追加ドキュメント不要

## 3. Ambiguities and Unknowns

### ℹ️ INFO-1: Open Question の将来検討事項

requirements.md:81 で以下が Open Question として残されています:

> commonコマンドが複数になった場合、ダイアログを「すべて上書き」「すべてスキップ」のオプション付きにするか？

**Impact**: 現在の実装に影響なし。将来の機能拡張として検討可能。

### ℹ️ INFO-2: テンプレートディレクトリの非コマンドファイル除外

design.md:484 (DD-004) で言及:

> ディレクトリに不要なファイルがあると誤ってインストール対象になる。命名規則やREADME除外などの考慮が必要。

**Current State**: Task 2.1 で「.mdファイルをフィルタリングし、READMEなど非コマンドファイルを除外」と記載。

**Recommendation**: 具体的な除外ルール（例: README.md, CHANGELOG.md）を実装時に決定。

## 4. Steering Alignment

### 4.1 Architecture Compatibility

**Status**: ✅ 整合性あり

| Steering Requirement | Design Compliance |
|---------------------|-------------------|
| tech.md: React 19 + TypeScript 5.8+ | ✅ CommandsetInstallDialog |
| tech.md: Zustand状態管理 | ✅ useState + Dialog状態管理 |
| tech.md: IPC設計パターン | ✅ handlers.ts, channels.ts |
| structure.md: Main/Renderer分離 | ✅ Service→Main, Dialog→Renderer |
| design-principles.md: DRY | ✅ 既存サービス拡張 |

### 4.2 Integration Concerns

**Minor Concern**: structure.md:77-102 の「State Management Rules」との整合性

コンフリクト状態（`commonConflicts`）をRenderer内のuseStateで管理する設計は、以下の判断に基づき許容される:

- ❓ Rendererクラッシュ後も復元が必要か？ → No（再度インストールフローを開始可能）
- ❓ 複数ウィンドウ/Remote UIで共有が必要か？ → No（Desktop UI専用、単一ダイアログ）
- ❓ UIの一時的な表示状態のみか？ → Yes

**Conclusion**: ダイアログの一時状態としてRenderer側での管理は適切。

### 4.3 Migration Requirements

**Status**: ✅ 移行要件なし

- 既存のデータ構造に変更なし
- 既存の設定ファイルに変更なし
- 後方互換性の問題なし

## 5. Recommendations

### Critical Issues (Must Fix)

なし

### Warnings (Should Address)

| ID | Issue | Impact | Effort |
|----|-------|--------|--------|
| W-1 | Remote UIからのインストール時の挙動未定義 | Remote UIユーザーの混乱 | Low |
| W-2 | Preload API定義がTasksに含まれていない | 実装漏れリスク | Low |
| W-3 | electronAPI型定義の更新がTasksに含まれていない | TypeScriptエラー | Low |

### Suggestions (Nice to Have)

| ID | Suggestion | Benefit |
|----|------------|---------|
| S-1 | 将来的に「すべて上書き/スキップ」オプションの検討 | UX向上 |
| S-2 | テンプレート除外ルールの明文化 | 運用の明確化 |

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|-------------------|-------------------|
| Warning | W-1 | Remote UI時の挙動を design.md に追記、または tasks.md に対応タスク追加 | design.md または tasks.md |
| Warning | W-2 | Task 4.1 に preload.ts の変更を追記 | tasks.md |
| Warning | W-3 | Task 4.1 に型定義の更新を追記 | tasks.md |

---

_This review was generated by the document-review command._
