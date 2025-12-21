# Specification Review Report #1

**Feature**: watcher-hmr-health-check
**Review Date**: 2025-12-20
**Documents Reviewed**:
- spec.json
- requirements.md
- design.md
- tasks.md
- .kiro/steering/product.md
- .kiro/steering/tech.md
- .kiro/steering/structure.md
- .kiro/steering/debugging.md
- .kiro/steering/e2e-testing.md

## Executive Summary

| Category | Count |
|----------|-------|
| Critical | 2 |
| Warning | 4 |
| Info | 3 |

本レビューでは、Watcher HMR Health Check機能の仕様ドキュメントについて整合性、ギャップ、曖昧さを分析しました。全体的に良く設計されていますが、いくつかの重要な問題と改善点が見つかりました。

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**良好な点:**
- 全5つのRequirementがDesignのコンポーネントに適切にマッピングされている
- Requirements Traceabilityマトリクスが完備されている
- IPCチャンネル定義（GET_WATCHER_STATUS, WATCHER_STARTED, WATCHER_STOPPED, WATCHER_ERROR）が一貫している

**矛盾/ギャップ:**

| ID | Issue | Requirements | Design | Severity |
|----|-------|--------------|--------|----------|
| C-1.1 | notificationStoreの通知表示仕様不足 | Req 3.2: エラーメッセージを含む通知を表示、Req 3.5: 再起動オプションを含める | notificationStoreは「既存の`addNotification`メソッドを使用」と記載されるのみ。通知のUI仕様（トースト形式、ダイアログ形式、表示時間等）が未定義 | Warning |
| C-1.2 | Requirement 5.1の履歴ログ形式未定義 | Req 5.1: watcherの状態変化履歴をログに記録する | Designではloggerで記録とあるが、履歴の保持期間、最大件数、ログフォーマットが未定義 | Info |

### 1.2 Design ↔ Tasks Alignment

**良好な点:**
- Designの全コンポーネントがTasksに反映されている
- タスクの依存関係（P: 前提タスク）が適切に定義されている
- Requirements Coverageマトリクスで追跡可能

**矛盾/ギャップ:**

| ID | Issue | Design | Tasks | Severity |
|----|-------|--------|-------|----------|
| C-2.1 | module.hot API使用の詳細不足 | Design: HMR対応でmodule.hot APIを使用してリスナー再登録 | Task 5.3: module.hot APIを使用してHMRを検出と記載されるのみ。Viteのimport.meta.hot APIとの違い、TypeScript型定義の扱いが未記載 | Critical |
| C-2.2 | BugsWatcherServiceテスト不足 | Design: BugsWatcherServiceも同様の拡張を適用 | Tasks 7.2/7.3: SpecsWatcherServiceのテストは明記されているが、BugsWatcherServiceのユニット/統合テストが明記されていない | Warning |

### 1.3 Design ↔ Tasks Completeness

| Category | Design Definition | Task Coverage | Status |
|----------|-------------------|---------------|--------|
| UI Components | notificationStoreでエラー通知表示、再起動オプション | Task 6.1, 6.2で通知実装を記載 | ⚠️ 通知UIの具体的なデザイン/配置が未定義 |
| Services | SpecsWatcherService, BugsWatcherService, handlers.ts | Task 2.1, 2.2, 3.1, 3.2で実装を記載 | ✅ |
| Types/Models | WatcherStatus, WatcherError, WatcherStatusResult等 | Task 1.1で型定義を記載 | ✅ |
| Hooks | useWatcherHealthCheck | Task 4.1, 4.2, 4.3で実装を記載 | ✅ |
| Stores | specStore, bugStore拡張 | Task 5.1, 5.2で実装を記載 | ✅ |
| IPC/Preload | channels.ts, preload/index.ts | Task 1.2, 3.3で実装を記載 | ✅ |
| Integration | 全コンポーネント統合 | Task 7.1で統合を記載 | ⚠️ マウント場所の特定が曖昧 |

### 1.4 Cross-Document Contradictions

| ID | Issue | Document 1 | Document 2 | Severity |
|----|-------|------------|------------|----------|
| C-4.1 | ヘルスチェックHookのマウント場所未定義 | Design: useWatcherHealthCheckをアプリケーションにマウント | Tasks 7.1: 同様に記載されるが、具体的なコンポーネント（App.tsx? Layout.tsx?）が未指定 | Warning |
| C-4.2 | デフォルトインターバル値の微妙な不一致 | Design: ヘルスチェックのデフォルト間隔は5秒 | Requirements 2.5: 間隔を設定可能なオプションとして提供（デフォルト値の明記なし）| Info |

## 2. Gap Analysis

### 2.1 Technical Considerations

| ID | Gap | Description | Severity |
|----|-----|-------------|----------|
| G-1 | エラーリカバリー戦略の不足 | chokidarがエラーを発火した後のwatcher再起動手順が「通知に再起動オプションを含める」とあるが、再起動時の状態クリーンアップ、監視パスの再設定手順が未定義 | Critical |
| G-2 | HMR環境での動作保証 | ViteのHMR（import.meta.hot）とWebpackのHMR（module.hot）の両方への対応が必要だが、Designではmodule.hotのみ言及。tech.mdによるとViteを使用しているため、import.meta.hot APIが正しい | Warning |
| G-3 | 複数ウィンドウ対応 | 複数のBrowserWindowが存在する場合のイベント送信戦略が未定義（現在はNon-Goalsに含まれていないが、将来的な考慮が必要） | Info |
| G-4 | テストのモック戦略 | chokidarをモックする方法、HMR環境をテストでシミュレートする方法が未定義 | Warning |

### 2.2 Operational Considerations

| ID | Gap | Description | Severity |
|----|-----|-------------|----------|
| O-1 | 監視対象ディレクトリ変更時の動作 | プロジェクトパス変更時にwatcher状態がどうリセットされるかが未定義 | Info |
| O-2 | E2Eテスト追加の必要性 | e2e-testing.mdによると「実ワークフロー動作」のカバレッジが20%と低い。本機能のE2Eテストが明記されていない | Warning |

## 3. Ambiguities and Unknowns

| ID | Ambiguity | Location | Impact |
|----|-----------|----------|--------|
| A-1 | 「予期せず停止」の定義 | Requirements 3.3 | WATCHER_STOPPED送信条件が曖昧。正常停止と異常停止の区別方法が不明 |
| A-2 | エラーコードの体系 | Design WatcherError.code | codeフィールドの値（ENOSPC, EPERM等）がどの粒度で定義されるか未定義 |
| A-3 | lastEventTimeの更新タイミング | Design WatcherStatus | ファイル変更イベント時のみか、ヘルスチェック成功時も更新されるか不明 |
| A-4 | 再起動オプションの動作 | Requirements 3.5 | 再起動ボタンをクリックした際に、監視を再開するだけか、プロジェクト全体の再読み込みを行うか不明 |

## 4. Steering Alignment

### 4.1 Architecture Compatibility

**適合している点:**
- IPC設計パターン（channels.ts定義、preload公開）に準拠 (tech.md)
- Zustand storeパターンに準拠 (structure.md)
- ファイル命名規則（camelCase for services, hooks）に準拠 (structure.md)

**懸念点:**
- types/watcher.ts を新規作成するが、structure.mdでは「型定義は`types/index.ts`に集約、ドメイン別ファイルは`types/*.ts`」とあり、本機能もこれに従うべき → 適合している

### 4.2 Integration Concerns

| Concern | Description | Mitigation |
|---------|-------------|------------|
| specStore/bugStore拡張 | 既存のisWatching状態管理との競合リスク | 既存のset/getメソッドを活用し、新規状態（watcherError）のみ追加する設計により軽減 |
| 既存IPCハンドラとの整合性 | handlers.tsへの追加がスパゲッティ化のリスク | watcher関連をグループ化するコメントまたはセクション分けを推奨 |

### 4.3 Migration Requirements

本機能は新規追加であり、既存機能への影響は軽微。

| Consideration | Required | Notes |
|---------------|----------|-------|
| データマイグレーション | No | メモリ内状態のみ |
| 既存API変更 | No | 新規IPCチャンネル追加のみ |
| 既存UI変更 | Minimal | 通知表示の追加のみ |

## 5. Recommendations

### Critical Issues (Must Fix)

| ID | Issue | Recommended Action |
|----|-------|-------------------|
| C-2.1 | module.hot API vs import.meta.hot | Vite環境ではimport.meta.hotを使用するように修正。TypeScript型定義（vite/client）の追加を明記 |
| G-1 | エラーリカバリー戦略の不足 | 再起動時の手順（停止→エラークリア→パス再設定→開始）をDesignに明記 |

### Warnings (Should Address)

| ID | Issue | Recommended Action |
|----|-------|-------------------|
| C-1.1 | 通知UI仕様不足 | 通知のタイプ（toast/dialog）、表示時間、スタイルをDesignに追記 |
| C-2.2 | BugsWatcherServiceテスト不足 | Tasks 7.2/7.3にBugsWatcherServiceのテストを明記 |
| C-4.1 | Hookマウント場所未定義 | 具体的なマウントコンポーネント（例: App.tsx内でuseEffectで呼び出し）を明記 |
| G-2 | HMR API選択 | ViteのHMRドキュメントを参照し、import.meta.hot APIの使用を確認・修正 |
| G-4 | テストモック戦略 | chokidarモック方法、HMRテスト戦略をTasksに追記 |
| O-2 | E2Eテスト追加 | watcher状態確認、エラー通知表示のE2Eテストをtasks.mdに追加 |

### Suggestions (Nice to Have)

| ID | Issue | Recommended Action |
|----|-------|-------------------|
| C-1.2 | ログ履歴形式 | ログフォーマット（JSON構造化ログ推奨）を明記 |
| C-4.2 | デフォルト値明記 | Requirementsにデフォルトインターバル5秒を明記 |
| A-1-4 | 曖昧さ解消 | 「予期せず停止」の定義、エラーコード体系、lastEventTime更新タイミング、再起動動作を明確化 |

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|-------------------|-------------------|
| Critical | module.hot → import.meta.hot | ViteのHMR APIに修正、型定義追加を明記 | design.md, tasks.md |
| Critical | エラーリカバリー戦略 | 再起動手順の詳細設計を追加 | design.md |
| High | 通知UI仕様 | 通知タイプ・スタイルを定義 | design.md |
| High | BugsWatcherServiceテスト | テストケースを明記 | tasks.md |
| High | Hookマウント場所 | 具体的なコンポーネントを指定 | design.md, tasks.md |
| Medium | テストモック戦略 | chokidar/HMRモック方法を追加 | tasks.md |
| Medium | E2Eテスト追加 | watcher関連のE2Eテストを追加 | tasks.md |
| Low | ログフォーマット | JSON構造化ログ仕様を追加 | design.md |
| Low | 曖昧さ解消 | 定義・動作の明確化 | requirements.md, design.md |

---

_This review was generated by the document-review command._
