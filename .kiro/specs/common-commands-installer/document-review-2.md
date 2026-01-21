# Specification Review Report #2

**Feature**: common-commands-installer
**Review Date**: 2026-01-21
**Documents Reviewed**: spec.json, requirements.md, design.md, tasks.md, product.md, tech.md, structure.md, design-principles.md, logging.md

## Executive Summary

| Severity | Count |
|----------|-------|
| Critical | 0 |
| Warning | 0 |
| Info | 1 |

**Overall Assessment**: 前回レビュー（#1）で指摘された3件のWarningがすべて修正されており、仕様は実装を開始できる状態です。

**Previous Review Status**: レビュー#1の修正がすべて適用されていることを確認しました。

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**Status**: ✅ 整合性あり

Requirements で定義された 12 の Acceptance Criteria すべてが Design の Requirements Traceability テーブルにマッピングされています。

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
| Types/Models | CommonCommandInfo, CommonCommandConflict, CommonCommandDecision, CommonCommandsInstallResult | 2.1, 2.2, 2.3, 4.1 に含む | ✅ |
| IPC Handlers | confirmCommonCommands | 4.1 | ✅ |
| Preload API | confirmCommonCommands | 4.1 | ✅ (前回修正で追加) |
| Type Definitions | ElectronAPI.confirmCommonCommands | 4.1 | ✅ (前回修正で追加) |

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

### 1.6 Previous Review Fixes Verification

前回レビュー（#1）で指摘された問題の修正状況:

| ID | Issue | Fix Status |
|----|-------|------------|
| W-1 | Remote UIからのインストール時の挙動未定義 | ✅ 修正済み (design.md:25-39) |
| W-2 | Preload API定義がTasksに含まれていない | ✅ 修正済み (tasks.md:62) |
| W-3 | electronAPI型定義の更新がTasksに含まれていない | ✅ 修正済み (tasks.md:63-64) |

**Verification Details**:

- **W-1**: design.md に「Remote UI時の挙動」セクションが追加され、コンフリクト時は既存ファイルを優先してスキップする方針が明記されている
- **W-2**: Task 4.1 に `preload/index.ts`への`confirmCommonCommands`メソッド追加が明記されている
- **W-3**: Task 4.1 に `electron.d.ts`のElectronAPIインターフェースへの型定義追加が明記されている

## 2. Gap Analysis

### 2.1 Technical Considerations

**Status**: ✅ 問題なし

前回指摘されたRemote UIの挙動について、design.md:25-39 で明確に定義されました:
- Remote UIからのinstallByProfile呼び出し時は自動スキップ
- スキップされたファイルは結果のskipped配列に含まれる
- ログに警告として記録される

**ロギング要件** (steering/logging.md との整合性):
- design.md:411-413 で適切なログレベルが定義されている
  - logger.warn: commonコマンドインストール失敗時
  - logger.info: commonコマンドインストール成功時
  - logger.debug: 既存ファイルスキップ時

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
**Status**: 設計意図として残す（修正不要）

## 4. Steering Alignment

### 4.1 Architecture Compatibility

**Status**: ✅ 整合性あり

| Steering Requirement | Design Compliance |
|---------------------|-------------------|
| tech.md: React 19 + TypeScript 5.8+ | ✅ CommandsetInstallDialog |
| tech.md: Zustand状態管理 | ✅ useState + Dialog状態管理 |
| tech.md: IPC設計パターン | ✅ handlers.ts, channels.ts, preload |
| structure.md: Main/Renderer分離 | ✅ Service→Main, Dialog→Renderer |
| design-principles.md: DRY | ✅ 既存サービス拡張 |
| logging.md: ログレベル対応 | ✅ warn/info/debug 定義済み |

### 4.2 Integration Concerns

**Status**: ✅ 問題なし

structure.md:77-102 の「State Management Rules」との整合性を確認:

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

なし（前回の3件はすべて修正済み）

### Suggestions (Nice to Have)

| ID | Suggestion | Benefit |
|----|------------|---------|
| S-1 | 将来的に「すべて上書き/スキップ」オプションの検討 | UX向上 |
| S-2 | テンプレート除外ルールの明文化（実装時） | 運用の明確化 |

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|-------------------|-------------------|
| - | - | - | - |

**No action items required.** 仕様は実装開始可能な状態です。

---

## Conclusion

前回レビュー（#1）で指摘された3件のWarningがすべて適切に修正されていることを確認しました:

1. **Remote UI時の挙動**: design.md に明確なセクションが追加され、自動スキップの方針が明記
2. **Preload API**: Task 4.1 に preload/index.ts への変更が追記
3. **型定義**: Task 4.1 に electron.d.ts への変更が追記

仕様書は実装を開始できる状態です。

---

_This review was generated by the document-review command._
