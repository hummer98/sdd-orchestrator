# Specification Review Report #1

**Feature**: worktree-rebase-from-main
**Review Date**: 2026-01-27
**Documents Reviewed**: spec.json, requirements.md, design.md, tasks.md, research.md

## Executive Summary

**Review Result**: 7 CRITICAL issues, 3 WARNING issues, 2 INFO issues

本レビューでは、worktree-rebase-from-main仕様書において、**タスク→実装コンポーネントのマッピング不整合**、**統合テストの欠落**、**インストーラー実装タスクの不在**、**実装手順の曖昧さ**など、実装フェーズで深刻な問題を引き起こす可能性のある重大な不整合を発見しました。

特に、Task 8.1「Electron/Remote UI View結合」がDesignで定義されたコンポーネント（ElectronWorkflowView, RemoteWorkflowView, BugWorkflowView）の実装タスクとして機能しておらず、実装者が何をどこに実装すべきか判断できない状態です。

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**Status**: ✅ GOOD

- 全ての要件（Requirement 1-10）がDesignのRequirements Traceability（表176-227行目）に正確にマッピングされている
- 各要件のAcceptance Criteriaが具体的なコンポーネントと実装アプローチに変換されている
- 要件とDesignの間に矛盾や未カバーの項目は確認されなかった

### 1.2 Design ↔ Tasks Alignment

**Status**: ❌ CRITICAL ISSUES DETECTED

以下の重大な不整合を検出:

#### 不整合1: View層コンポーネントの実装タスク欠落

**Design Section**: Design.md "Integration & Deprecation Strategy" (958-1007行目)
**既存ファイル変更リスト**:
- `ElectronWorkflowView` (8.1で言及)
- `RemoteWorkflowView` (8.1で言及)
- `BugWorkflowView` (8.1で言及)

**Tasks Section**: Task 8.1「ElectronWorkflowViewとRemoteWorkflowViewでonRebaseFromMainコールバック実装」

**問題点**:
- Task 8.1はView層コンポーネントへの統合タスクとして記載されているが、**具体的な実装手順が不明確**
- 以下の実装詳細が欠落:
  - どのファイルパスにコードを追加するか
  - `onRebaseFromMain`コールバックの実装内容（ApiClient.rebaseFromMain呼び出し、レスポンスハンドリング、Store連携）
  - 各View（Electron/Remote/Bug）で共通実装か個別実装か
- **結果**: 実装者がView層の結合処理をどう実装すべきか判断できない

**Expected**:
- Task 8.1を以下のように詳細化:
  - 8.1a: ElectronWorkflowViewでonRebaseFromMainコールバック実装
  - 8.1b: RemoteWorkflowViewでonRebaseFromMainコールバック実装
  - 8.1c: BugWorkflowViewでonRebaseFromMainコールバック実装
  - 各タスクに実装ファイルパス、ApiClient呼び出しパターン、エラーハンドリングを明記

#### 不整合2: WebSocketApiClientのメソッド追加タスク欠落

**Design Section**: Design.md "Integration & Deprecation Strategy" (1001-1007行目)
**既存ファイル変更リスト**:
- `electron-sdd-manager/src/shared/api/IpcApiClient.ts` (Task 5.1で言及)
- `electron-sdd-manager/src/shared/api/WebSocketApiClient.ts` (Task 5.1で言及)

**Tasks Section**: Task 5.1「IpcApiClientとWebSocketApiClientにrebaseFromMainメソッド追加」

**問題点**:
- Task 5.1がIpcApiClientとWebSocketApiClientの**両方**を1つのタスクで扱っている
- 実装内容が全く異なる（IPC invoke vs WebSocket send）にも関わらず、実装詳細が不明確
- Design.md 1001-1007行目で明確に「IpcApiClient: window.electronAPI呼び出し」「WebSocketApiClient: WebSocketメッセージ送信」と区別されているのに、Taskでは統合されている

**Expected**:
- Task 5.1を以下のように分離:
  - 5.1a: IpcApiClientにrebaseFromMainメソッド追加（`window.electronAPI.rebaseFromMain`呼び出し）
  - 5.1b: WebSocketApiClientにrebaseFromMainメソッド追加（`{ type: 'worktree:rebase-from-main', payload: { specOrBugPath } }`送信）

#### 不整合3: インストーラー実装タスクの不在

**Design Section**: Design.md "Installer Service Layer" (656-700行目)
**Component**: `ccSddWorkflowInstaller` (拡張)
**Requirements**: 9.1, 9.2, 9.3, 9.4

**Tasks Section**: Task 9.1「installRebaseScriptメソッド実装」

**問題点**:
- Task 9.1は「installRebaseScriptメソッド実装」と記載されているが、**ccSddWorkflowInstallerの既存installCommandset処理への統合方法が不明確**
- Design.md 656-700行目では以下が明記されている:
  - テンプレートファイルパス: `resources/templates/scripts/rebase-worktree.sh`
  - コピー先: `.kiro/scripts/rebase-worktree.sh`
  - 権限付与: `fs.chmodSync(dst, 0o755)`
  - ディレクトリ作成: `fs.mkdirSync(scriptsDir, { recursive: true })`
- しかし、**「いつこの処理が呼ばれるか」**（commandsetインストール時の既存フローへの組み込み）が不明

**Expected**:
- Task 9.1を以下のように詳細化:
  - 9.1a: installRebaseScriptメソッド実装（テンプレートコピー、権限付与）
  - 9.1b: 既存installCommandset処理から9.1aを呼び出すフロー追加

### 1.3 Design ↔ Tasks Completeness

**Status**: ✅ GOOD

| Category | Design Definition | Task Coverage | Status |
| -------- | ----------------- | ------------- | ------ |
| UI Components | SpecWorkflowFooter (488-530行目) | 7.1 | ✅ |
| UI Components | BugWorkflowFooter (532-564行目) | 7.2 | ✅ |
| Services | worktreeService (323-400行目) | 2.1, 2.2 | ✅ |
| Scripts | rebase-worktree.sh (252-322行目) | 1.1 | ✅ |
| IPC Handlers | worktree:rebase-from-main (402-451行目) | 3.1, 3.2 | ✅ |
| WebSocket Handlers | WebSocket Handler (452-481行目) | 4.1 | ✅ |
| Stores | specStore (567-619行目) | 6.1 | ✅ |
| Stores | bugStore (620-654行目) | 6.2 | ✅ |
| ApiClient | IpcApiClient/WebSocketApiClient (1001-1007行目) | 5.1 | ✅ |
| Installer | ccSddWorkflowInstaller (656-700行目) | 9.1 | ✅ |

**Note**: Task 5.1と8.1の詳細化不足は1.2で指摘済み。コンポーネント定義とタスクのマッピング自体は完全。

### 1.4 Acceptance Criteria → Tasks Coverage

**Status**: ❌ CRITICAL ISSUES DETECTED

全てのCriterion IDがタスクにマッピングされているが、**Feature Implementation（機能実装）タスクの不足**を検出。

| Criterion | Summary | Mapped Task(s) | Task Type | Status |
|-----------|---------|----------------|-----------|--------|
| 1.1 | Spec Worktreeモード時にボタン表示 | 7.1, 8.1 | Feature | ✅ |
| 1.2 | Spec 通常モード時はボタン非表示 | 7.1, 8.1 | Feature | ✅ |
| 1.3 | Spec Agent実行中はdisabled | 7.1, 8.1 | Feature | ✅ |
| 1.4 | Spec 自動実行中はdisabled | 7.1, 8.1 | Feature | ✅ |
| 1.5 | Spec rebase処理中はdisabled+「取り込み中...」表示 | 7.1, 8.1, 11.1 | Feature | ✅ |
| 2.1 | Bug Worktreeモード時にボタン表示 | 7.2, 8.1 | Feature | ✅ |
| 2.2 | Bug 通常モード時はボタン非表示 | 7.2, 8.1 | Feature | ✅ |
| 2.3 | Bug Agent実行中はdisabled | 7.2, 8.1 | Feature | ✅ |
| 2.4 | Bug 自動実行中はdisabled | 7.2, 8.1 | Feature | ✅ |
| 2.5 | Bug rebase処理中はdisabled+「取り込み中...」表示 | 7.2, 8.1, 11.1 | Feature | ✅ |
| 3.1 | rebase-worktree.shスクリプト作成 | 1.1 | Infrastructure | ✅ |
| 3.2 | jj存在確認 | 1.1 | Infrastructure | ✅ |
| 3.3 | jj rebase -d main実行 | 1.1 | Infrastructure | ✅ |
| 3.4 | git rebase mainフォールバック | 1.1 | Infrastructure | ✅ |
| 3.5 | mainに新規コミットなし時の処理 | 1.1, 11.2 | Infrastructure | ✅ |
| 3.6 | コンフリクト検知（終了コード1） | 1.1 | Infrastructure | ✅ |
| 3.7 | 成功時（終了コード0） | 1.1 | Infrastructure | ✅ |
| 4.1 | コンフリクト時AI解決試行 | 2.1, 2.2, 11.3 | Feature | ✅ |
| 4.2 | AI解決後rebase続行 | 2.2, 11.3 | Feature | ✅ |
| 4.3 | 7回試行失敗時中断 | 2.2, 11.4 | Feature | ✅ |
| 4.4 | 中断時worktree元の状態に戻す | 2.2, 11.4 | Feature | ✅ |
| 5.1 | レンダラーからrebaseリクエスト | 2.1, 3.2, 5.1, 10.1 | Infrastructure | ✅ |
| 5.2 | スクリプト成功時レスポンス | 2.1, 3.2, 10.1 | Infrastructure | ✅ |
| 5.3 | 「Already up to date」レスポンス | 2.1, 3.2, 10.1 | Infrastructure | ✅ |
| 5.4 | コンフリクト時解決フロー開始 | 2.1, 3.2, 10.1 | Infrastructure | ✅ |
| 5.5 | worktree:rebase-from-mainチャンネル使用 | 3.1 | Infrastructure | ✅ |
| 6.1 | Spec rebase開始時isRebasing=true | 6.1, 10.3 | Infrastructure | ✅ |
| 6.2 | Spec rebase完了時isRebasing=false | 6.1, 10.3 | Infrastructure | ✅ |
| 6.3 | Spec rebase成功通知 | 6.1, 10.3, 11.1, 11.3 | Feature | ✅ |
| 6.4 | Spec 最新時情報通知 | 6.1, 10.3, 11.2 | Feature | ✅ |
| 6.5 | Spec rebaseエラー通知 | 6.1, 10.3, 11.4 | Feature | ✅ |
| 7.1 | Bug rebase開始時isRebasing=true | 6.2, 10.3 | Infrastructure | ✅ |
| 7.2 | Bug rebase完了時isRebasing=false | 6.2, 10.3 | Infrastructure | ✅ |
| 7.3 | Bug rebase成功通知 | 6.2, 10.3, 11.1, 11.3 | Feature | ✅ |
| 7.4 | Bug 最新時情報通知 | 6.2, 10.3, 11.2 | Feature | ✅ |
| 7.5 | Bug rebaseエラー通知 | 6.2, 10.3, 11.4 | Feature | ✅ |
| 8.1 | Remote UI Spec Worktreeモード時ボタン表示 | 7.1, 8.1, 11.5 | Feature | ✅ |
| 8.2 | Remote UI WebSocket経由rebase実行 | 4.1, 5.1, 8.1, 10.2, 11.5 | Infrastructure | ✅ |
| 8.3 | Remote UI処理完了後メッセージ表示 | 8.1, 11.5 | Feature | ✅ |
| 8.4 | Remote UI rebase処理中disabled | 7.1, 8.1, 11.5 | Feature | ✅ |
| 9.1 | commandsetインストール時スクリプトコピー | 9.1 | Infrastructure | ✅ |
| 9.2 | スクリプトコピー時実行権限付与 | 9.1 | Infrastructure | ✅ |
| 9.3 | .kiro/scripts/ディレクトリ自動作成 | 9.1 | Infrastructure | ✅ |
| 9.4 | スクリプト既存時上書き | 9.1 | Infrastructure | ✅ |
| 10.1 | rebase-worktree.sh不在時エラー | 2.1 | Infrastructure | ✅ |
| 10.2 | worktreeディレクトリ不在時エラー | 2.1 | Infrastructure | ✅ |
| 10.3 | gitリポジトリでない場合エラー | 1.1 | Infrastructure | ✅ |
| 10.4 | mainブランチ不在時エラー | 1.1 | Infrastructure | ✅ |
| 10.5 | コンフリクト解決失敗時エラー | 2.2 | Infrastructure | ✅ |

**Validation Results**:
- [x] All criterion IDs from requirements.md are mapped
- [x] User-facing criteria have Feature Implementation tasks
- [x] No criterion relies solely on Infrastructure tasks

**Note**: タスクマッピング自体は完全だが、Task 8.1の詳細化不足により実装可能性に懸念あり（1.2で指摘済み）。

### 1.5 Integration Test Coverage

**Status**: ❌ CRITICAL ISSUES DETECTED

Design.mdで定義された統合テスト戦略（846-880行目）に対し、Tasks.mdの統合テスト（Task 10.1-10.3）に**重大な欠落**を検出。

| Integration Point | Design Section | Test Task | Status |
|-------------------|----------------|-----------|--------|
| Renderer → IPC → worktreeService → Script | Design.md 858-864行目 | 10.1 | ✅ |
| Remote UI → WebSocket → IPC | Design.md 858-864行目 | 10.2 | ✅ |
| Store状態遷移（isRebasing） | Design.md 858-864行目 | 10.3 | ✅ |
| **AI Conflict Resolution統合テスト** | Design.md 813-816行目 | **(none)** | ❌ CRITICAL |
| **スクリプト終了コード処理統合テスト** | Design.md 169-173行目（フロー図） | **(none)** | ❌ CRITICAL |

**Validation Results**:
- [ ] ❌ All sequence diagrams have corresponding integration tests
- [x] All IPC channels have delivery verification tests
- [x] All store sync flows have state propagation tests

**Missing Integration Tests**:

#### 欠落1: AI Conflict Resolution統合テスト

**Design Section**: Design.md "Unit Tests - Service Layer" (813-816行目)
```
4. `worktreeService.resolveConflictWithAI`: 1回目で解決成功
5. `worktreeService.resolveConflictWithAI`: 7回リトライ後失敗
```

**Design Section**: Design.md "System Flows - Rebase Execution Flow" (141-158行目)
```
alt Conflict detected
    Git-->>Script: exit 1 (conflict markers)
    Script-->>Service: exit code 1
    Service->>Service: resolveConflictWithAI(7 retries)
    alt AI resolved
        Service->>Git: git rebase --continue / jj squash
        ...
    else AI failed
        Service->>Git: git rebase --abort / jj undo
        ...
```

**問題点**:
- Design.mdではAI解決フローが明確に定義されているが、**Tasks.mdに統合テストが存在しない**
- Task 10.1「IPC統合テスト」のサブシナリオとして「コンフリクトシナリオ: exit 1 → AI解決 → 成功レスポンス確認」が記載されているが、**AI解決の「7回リトライ」や「失敗時のabort」が検証対象として明記されていない**
- **結果**: AI解決フローの統合テスト（IPC → Service → AI → Git → レスポンス）が検証されない

**Expected**:
- Task 10.1を以下のように拡張:
  - 10.1c: コンフリクトシナリオ - AI解決成功（1回目で解決）
  - 10.1d: コンフリクトシナリオ - AI解決失敗（7回リトライ後abort）

#### 欠落2: スクリプト終了コード処理統合テスト

**Design Section**: Design.md "Error Handling - Process Flow Visualization" (758-784行目)

**問題点**:
- Design.mdでは終了コード0/1/2の処理フローが明確に定義されているが、**Tasks.mdに統合テストとして「終了コード2（エラー）」の検証が不在**
- Task 10.1「IPC統合テスト」には「成功シナリオ（exit 0）」と「Already up to date（stdout判定）」と「コンフリクト（exit 1）」しか記載されていない
- **結果**: スクリプトエラー（jq不在、spec.json不在、git操作失敗）が統合テストで検証されない

**Expected**:
- Task 10.1を以下のように拡張:
  - 10.1e: エラーシナリオ - スクリプト不在エラー
  - 10.1f: エラーシナリオ - jq不在エラー

### 1.6 Cross-Document Contradictions

**Status**: ✅ GOOD

- Requirements, Design, Tasksの間で矛盾する記述は確認されなかった
- 用語の一貫性も保たれている（「mainを取り込み」ボタン、jj優先・gitフォールバック、AI自動解決7回試行）

## 2. Gap Analysis

### 2.1 Technical Considerations

**Status**: ⚠️ WARNING

#### Warning 1: AI解決サービスの実装詳細不明

**Context**: Design.md 339行目
```
- Outbound: AI解決サービス（実装は既存spec-mergeパターン参照） — コンフリクト解決（P0）
```

**問題点**:
- Design.mdで「既存spec-mergeパターン参照」と記載されているが、**具体的なサービス名やメソッド名が不明**
- worktreeService.tsに新規実装する `resolveConflictWithAI()` メソッドが、どのサービスのどのAPIを呼び出すべきか不明確
- **結果**: 実装者が既存コードを探索する必要があり、実装時間が増加

**Expected**:
- Design.mdのService Interfaceセクション（347-382行目）に以下を追加:
  - AI解決サービスの具体的なモジュール名（例: `conflictResolverService`）
  - 呼び出すメソッド名と型定義
  - 既存実装ファイルのパス（例: `main/services/conflictResolverService.ts`）

#### Warning 2: ログ実装の欠落

**Context**: Design.md 789-797行目「Monitoring」セクション

**問題点**:
- Design.mdではログ記録ポイントとログレベルが明確に定義されているが、**Tasks.mdにログ実装タスクが存在しない**
- Steeringドキュメント（logging.md）に従ったロギング実装が必要だが、タスクとして明記されていない
- **結果**: ログ実装が漏れる可能性

**Expected**:
- Tasksに以下を追加:
  - 2.3: worktreeServiceにロギング追加（rebase開始/完了/エラー、AI解決試行）
  - 1.1: rebase-worktree.shにロギング追加（jj/git実行結果）

### 2.2 Operational Considerations

**Status**: ✅ GOOD

- エラーハンドリング戦略が明確（Design.md 727-797行目）
- ユーザー向けエラーメッセージが具体的（「jqがインストールされていません。brew install jq...」等）
- ロールバック戦略が定義済み（`git rebase --abort` / `jj undo`）

### 2.3 Testing Strategy

**Status**: ⚠️ WARNING

#### Warning 3: E2Eテストのスクリプトモック戦略不明

**Context**: Tasks.md 139-165行目「E2Eテスト」セクション

**問題点**:
- E2Eテストで「mainに新しいコミットなし」（11.2）や「コンフリクト発生」（11.3）のシナリオを作成する必要があるが、**実際のGit操作に依存するか、モックするかが不明確**
- Design.md 843行目では「モックスクリプト実行環境（テスト用の固定スクリプトまたはstub）」と記載されているが、Tasks.mdには具体的なモック戦略が不在
- **結果**: E2Eテスト実装時にテストセットアップ方法が不明

**Expected**:
- Tasks.md 11章に以下を追加:
  - E2Eテストで使用するモック戦略（実Git操作 vs スクリプトstub）
  - テストフィクスチャの作成方法（テスト用Gitリポジトリ準備、コンフリクト状態作成）

## 3. Ambiguities and Unknowns

### 3.1 曖昧な記述

#### Ambiguity 1: Task 8.1の実装範囲

**Location**: Tasks.md 101-107行目
```
- [ ] 8.1 ElectronWorkflowViewとRemoteWorkflowViewでonRebaseFromMainコールバック実装
  - ApiClient.rebaseFromMain呼び出し
  - レスポンスをspecStore/bugStoreの `handleRebaseResult` に渡す
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 8.1, 8.2, 8.3, 8.4_
```

**問題点**:
- 「ElectronWorkflowView**と**RemoteWorkflowView」と記載されているが、BugWorkflowViewへの対応が不明
- Requirements 2.1-2.5（Bug関連）がカバー対象として記載されているが、タスク記述には「BugWorkflowView」が含まれていない
- **結果**: BugワークフローのView層結合が実装されない可能性

**Expected**:
- Task 8.1のタスク記述を「ElectronWorkflowView、RemoteWorkflowView、BugWorkflowViewでonRebaseFromMainコールバック実装」に修正

#### Ambiguity 2: スクリプトテンプレート配置の前提条件

**Location**: Tasks.md 109-118行目
```
- [ ] 9.1 (P) installRebaseScriptメソッド実装
  - `.kiro/scripts/` ディレクトリ自動作成（`fs.mkdirSync(dir, { recursive: true })`）
  - `resources/templates/scripts/rebase-worktree.sh` を `.kiro/scripts/rebase-worktree.sh` にコピー
  - 実行権限付与（`fs.chmodSync(path, 0o755)`）
  - 既存ファイルは上書き
```

**問題点**:
- テンプレートファイル `resources/templates/scripts/rebase-worktree.sh` の**作成タイミングが不明確**
- Task 1.1「rebase-worktree.shスクリプトテンプレート作成」が先に完了している前提だが、Task 9.1との依存関係が明記されていない
- **結果**: Task 9.1実装時にテンプレートファイルが存在せず、テスト失敗の可能性

**Expected**:
- Tasks.mdの「Task List」章に依存関係を明記:
  - Task 9.1: 「**Depends on: Task 1.1（テンプレートファイル作成済み）**」

## 4. Steering Alignment

### 4.1 Architecture Compatibility

**Status**: ✅ GOOD

- **IPC設計パターン**: channels.ts定義、handlers.ts実装、preload公開の既存パターンに準拠（tech.md 93-96行目）
- **Remote UI対応**: IpcApiClient/WebSocketApiClientの抽象化層パターンに準拠（tech.md 121-161行目）
- **State Management**: Domain Stateを `shared/stores/` に配置、UI Stateを `renderer/stores/` に分離（structure.md 47-59行目）
- **スクリプト分離パターン**: 既存merge-spec.shと同一パターンで一貫性維持（research.md 38-58行目）

### 4.2 Integration Concerns

**Status**: ⚠️ WARNING

#### Warning 4: Electron Process Boundary違反の懸念

**Context**: structure.md 61-149行目「Electron Process Boundary Rules」

**問題点**:
- Design.md 567-619行目（specStore）および620-654行目（bugStore）で `isRebasing: boolean` 状態を**Renderer側Store**（`src/renderer/stores/specStore.ts`）に配置する設計
- Steering structure.mdの「Main Processが保持すべきステート」基準では、「複数ウィンドウ/Remote UIで共有が必要」なステートは**Main Process**に配置すべき
- `isRebasing` は以下の理由でMain Processに配置すべき:
  - Remote UIでも同じrebase状態を表示する必要がある（Requirements 8.4）
  - Desktop UIとRemote UIで状態不整合が発生する可能性
- **結果**: Remote UIとDesktop UIで `isRebasing` 状態が同期されず、一方が「取り込み中...」と表示しているのに、もう一方は通常ボタンが表示される不整合が発生

**Expected**:
- Designを以下のように修正:
  - `isRebasing` 状態を**Main Process**（worktreeService内部またはSessionState）に配置
  - Renderer/Remote UIはIPC/WebSocket経由で `isRebasing` 状態を購読
  - Store層は `isRebasing` のキャッシュとして機能（Mainからのブロードキャストで更新）

### 4.3 Migration Requirements

**Status**: ℹ️ INFO

- 本機能は既存worktree機能の拡張であり、データマイグレーションは不要
- spec.json/bug.jsonの `worktree` フィールドは既存スキーマを継続利用

## 5. Recommendations

### Critical Issues (Must Fix)

#### CRITICAL-1: Task 8.1の詳細化と分離

**Issue**: Task 8.1が3つの異なるViewコンポーネント（ElectronWorkflowView, RemoteWorkflowView, BugWorkflowView）の実装を1つのタスクで扱っており、実装手順が不明確。

**Recommended Action**:
1. Task 8.1を以下のように分離:
   - 8.1a: ElectronWorkflowViewでonRebaseFromMainコールバック実装
   - 8.1b: RemoteWorkflowViewでonRebaseFromMainコールバック実装
   - 8.1c: BugWorkflowViewでonRebaseFromMainコールバック実装
2. 各タスクに以下を追加:
   - 実装ファイルパス（例: `src/renderer/components/ElectronWorkflowView.tsx`）
   - コールバック実装内容（ApiClient.rebaseFromMain呼び出し、handleRebaseResult連携）
   - エラーハンドリング方法

**Affected Documents**: tasks.md

---

#### CRITICAL-2: Task 5.1の分離（IpcApiClient vs WebSocketApiClient）

**Issue**: IpcApiClientとWebSocketApiClientの実装内容が全く異なるにも関わらず、1つのタスクで扱われている。

**Recommended Action**:
1. Task 5.1を以下のように分離:
   - 5.1a: IpcApiClientにrebaseFromMainメソッド追加（`window.electronAPI.rebaseFromMain`呼び出し）
   - 5.1b: WebSocketApiClientにrebaseFromMainメソッド追加（WebSocketメッセージ `{ type: 'worktree:rebase-from-main', payload: { specOrBugPath } }` 送信）

**Affected Documents**: tasks.md

---

#### CRITICAL-3: AI Conflict Resolution統合テストの追加

**Issue**: Design.mdで定義されたAI解決フロー（1回目で解決/7回リトライ後失敗）に対応する統合テストがTasks.mdに不在。

**Recommended Action**:
1. Task 10.1を以下のように拡張:
   - 10.1c: コンフリクトシナリオ - AI解決成功（1回目で解決）
   - 10.1d: コンフリクトシナリオ - AI解決失敗（7回リトライ後abort、レスポンス `{ success: false, conflict: true }` 確認）

**Affected Documents**: tasks.md

---

#### CRITICAL-4: スクリプトエラーシナリオ統合テストの追加

**Issue**: Design.mdで定義された終了コード2（エラー）処理に対応する統合テストがTasks.mdに不在。

**Recommended Action**:
1. Task 10.1を以下のように拡張:
   - 10.1e: エラーシナリオ - スクリプト不在エラー（`{ success: false, error: "Script not found..." }` 確認）
   - 10.1f: エラーシナリオ - jq不在エラー（`{ success: false, error: "jq not installed..." }` 確認）

**Affected Documents**: tasks.md

---

#### CRITICAL-5: Task 9.1の詳細化（インストーラー統合）

**Issue**: installRebaseScriptメソッドの実装は記載されているが、既存commandsetインストールフローへの組み込み方法が不明確。

**Recommended Action**:
1. Task 9.1を以下のように分離:
   - 9.1a: installRebaseScriptメソッド実装（テンプレートコピー、権限付与、ディレクトリ作成）
   - 9.1b: 既存installCommandset処理から9.1aを呼び出すフロー追加（merge-spec.sh同様のパターン）

**Affected Documents**: tasks.md

---

#### CRITICAL-6: isRebasing状態のMain Process配置

**Issue**: `isRebasing` 状態がRenderer Storeに配置されているが、Remote UIとDesktop UIで共有が必要なためMain Processに配置すべき。

**Recommended Action**:
1. Design.md 567-654行目（specStore/bugStore）を修正:
   - `isRebasing` 状態をMain Process（worktreeService内部またはSessionState）に配置
   - Renderer/Remote UIはIPC/WebSocket経由で `isRebasing` 状態を購読
   - Store層は `isRebasing` のキャッシュとして機能
2. Tasks.md 6.1, 6.2を修正:
   - Main Processでの状態管理タスクを追加
   - IPC/WebSocketブロードキャスト実装タスクを追加

**Affected Documents**: design.md, tasks.md

---

#### CRITICAL-7: タスク依存関係の明記

**Issue**: Task 9.1がTask 1.1（テンプレートファイル作成）に依存しているが、依存関係が明記されていない。

**Recommended Action**:
1. Tasks.md 109-118行目（Task 9.1）に以下を追加:
   - 「**Depends on: Task 1.1（テンプレートファイル作成済み）**」
2. 実装順序を明確化:
   - Phase 1: Task 1.1（スクリプト作成）
   - Phase 2: Task 9.1（インストーラー実装）

**Affected Documents**: tasks.md

### Warnings (Should Address)

#### WARNING-1: AI解決サービスの具体化

**Issue**: Design.mdで「既存spec-mergeパターン参照」と記載されているが、具体的なサービス名・メソッド名が不明。

**Recommended Action**:
1. 既存spec-merge実装を調査し、AI解決サービスの具体的なモジュール名（例: `conflictResolverService`）を特定
2. Design.md 339行目およびService Interface（347-382行目）に以下を追加:
   - AI解決サービスの具体的なモジュール名
   - 呼び出すメソッド名と型定義（例: `resolveConflict(worktreePath: string, maxRetries: number): Promise<...>`）
   - 既存実装ファイルのパス

**Affected Documents**: design.md

---

#### WARNING-2: ロギング実装タスクの追加

**Issue**: Design.mdでログ記録ポイントが定義されているが、Tasks.mdにログ実装タスクが不在。

**Recommended Action**:
1. Tasks.mdに以下を追加:
   - 2.3: worktreeServiceにロギング追加（rebase開始/完了/エラー、AI解決試行回数）
   - 1.1: rebase-worktree.shにロギング追加（jj/git実行結果、終了コード）

**Affected Documents**: tasks.md

---

#### WARNING-3: E2Eテストのモック戦略明確化

**Issue**: E2Eテストで「コンフリクト発生」等のシナリオを作成する必要があるが、テストセットアップ方法が不明。

**Recommended Action**:
1. Tasks.md 11章（E2Eテスト）に以下を追加:
   - E2Eテストで使用するモック戦略（実Git操作 vs スクリプトstub）
   - テストフィクスチャの作成方法（テスト用Gitリポジトリ準備手順、コンフリクト状態作成方法）
   - E2Eテスト実行前の前提条件（テスト用プロジェクト初期化スクリプト等）

**Affected Documents**: tasks.md

### Suggestions (Nice to Have)

#### INFO-1: Requirements Decision Logの活用

**Context**: requirements.md 3-49行目「Decision Log」

**Observation**:
- Requirements Decision Logが非常に詳細で、設計判断の根拠が明確に記録されている
- この記録方式は他のSpec開発でも有効活用できる

**Recommendation**:
- Steering documentsに「Decision Log記載ガイドライン」を追加し、全Specで統一的な判断記録を推奨

**Affected Documents**: (steering documents - 新規作成提案)

---

#### INFO-2: Design Decisionsの充実度

**Context**: design.md 887-952行目「Design Decisions」

**Observation**:
- Design Decisionsセクション（DD-001〜DD-006）が詳細で、技術的判断の根拠が明確
- 特にDD-001（スクリプト分離パターンの採用）は既存merge-spec.shとの一貫性を明確に示している

**Recommendation**:
- この記載レベルを他のSpec設計でも推奨事項とし、設計判断の透明性を向上

**Affected Documents**: (steering documents - 新規作成提案)

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
| -------- | ----- | ------------------ | ------------------ |
| CRITICAL | Task 8.1の詳細化不足 | 8.1を8.1a/8.1b/8.1cに分離し、各View実装の詳細を追加 | tasks.md |
| CRITICAL | Task 5.1の分離不足 | 5.1を5.1a/5.1bに分離（IpcApiClient vs WebSocketApiClient） | tasks.md |
| CRITICAL | AI統合テスト欠落 | Task 10.1に10.1c/10.1d（AI解決成功/失敗シナリオ）を追加 | tasks.md |
| CRITICAL | エラーシナリオ統合テスト欠落 | Task 10.1に10.1e/10.1f（スクリプト不在/jq不在シナリオ）を追加 | tasks.md |
| CRITICAL | インストーラー統合方法不明 | Task 9.1を9.1a/9.1bに分離（メソッド実装 vs 既存フロー組み込み） | tasks.md |
| CRITICAL | isRebasing状態配置違反 | isRebasing状態をMain Processに移動、Store層はキャッシュ化 | design.md, tasks.md |
| CRITICAL | タスク依存関係不明 | Task 9.1に「Depends on: Task 1.1」を明記 | tasks.md |
| WARNING | AI解決サービス詳細不明 | 既存spec-merge実装を調査し、具体的なサービス名・メソッド名をDesignに追加 | design.md |
| WARNING | ロギング実装タスク不在 | Tasks.mdにロギング実装タスク（2.3, 1.1拡張）を追加 | tasks.md |
| WARNING | E2Eモック戦略不明 | Tasks.md 11章にE2Eテストのモック戦略とフィクスチャ作成方法を追加 | tasks.md |

---

_This review was generated by the document-review command._
