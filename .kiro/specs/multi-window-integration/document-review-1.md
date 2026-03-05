# Specification Review Report #1

**Feature**: multi-window-integration
**Review Date**: 2026-02-26
**Documents Reviewed**:
- `spec.json` - Spec構成（phase: tasks-generated, language: ja）
- `requirements.md` - 要件定義（8要件、32受入基準）
- `design.md` - 技術設計（5コンポーネント、5 Design Decisions、3統合テスト）
- `tasks.md` - 実装タスク（10タスクグループ、38サブタスク）
- `research.md` - 技術調査結果
- `.kiro/steering/product.md` - プロダクト概要
- `.kiro/steering/tech.md` - 技術スタック
- `.kiro/steering/structure.md` - プロジェクト構造
- `.kiro/steering/design-principles.md` - 設計原則
- `.kiro/steering/logging.md` - ロギングガイドライン

## Executive Summary

| 種別 | 件数 |
|------|------|
| Critical | 0 |
| Warning | 7 |
| Info | 4 |

全体的に高品質な仕様セットであり、Requirements→Design→Tasksの一貫性は良好。全32受入基準がDesignとTasksに適切にマッピングされている。Refactoring Integrity（windowFactory.ts物理削除タスク）も明示的に定義済み。ただし、いくつかのギャップと曖昧な記述が存在し、実装前に確認が望ましい。

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

全8要件・32受入基準がDesign.mdのRequirements Traceabilityテーブルにマッピング済み。各基準にコンポーネント名と実装アプローチ（既存活用 vs 新規実装）が明記されている。

**矛盾検出: 「再設計」vs「拡張」アプローチ**

- `requirements.md` Decision Log（line 22-23）: 「既存WindowManagerを**再設計する**」と決定
- `research.md` Findings（line 54）: 「**再設計ではなく拡張が適切**」と結論
- `design.md` Implementation Notes（line 351）: 「既存WindowManagerクラスに...追加」（拡張アプローチを採用）

→ 調査フェーズで方針が変更されたが、Requirements Decision Logが更新されていない。（**WARNING-1**）

### 1.2 Design ↔ Tasks Alignment

Design.mdの5コンポーネントすべてにTasksが対応。Wiring Points（既存ファイル変更12箇所）も個別タスクでカバー済み。

| Design Component | Task Coverage | Status |
|-----------------|---------------|--------|
| WindowManager（拡張） | Task 1（1.1-1.5） | ✅ |
| WindowContextFactory | Task 2（2.1-2.4） | ✅ |
| EventBusFilter | Task 4（4.1-4.4） | ✅ |
| ProjectStateCompat | Task 3（3.1-3.2） | ✅ |
| MenuFocusTracker | Task 5（5.1-5.2） | ✅ |

### 1.3 Design ↔ Tasks Completeness

| Category | Design Definition | Task Coverage | Status |
|----------|-------------------|---------------|--------|
| UI Components | なし（Main Process変更のみ） | N/A | ✅ |
| Services（WindowContextFactory） | Service Interface定義あり | Task 2.1 | ✅ |
| Services（EventBusFilter） | Event Contract定義あり | Task 4.1-4.3 | ✅ |
| Types/Models（PerWindowContext, PerWindowServices） | 型定義あり | Task 1.1-1.2 | ✅ |
| Data Models（webContentsToWindowId Map） | Logical Data Model定義あり | Task 1.2 | ✅ |

### 1.4 Acceptance Criteria → Tasks Coverage

| Criterion | Summary | Mapped Task(s) | Task Type | Status |
|-----------|---------|----------------|-----------|--------|
| 1.1 | 新しいウィンドウ作成 | 1.3, 5.1, 7.1 | Infrastructure + Feature | ✅ |
| 1.2 | tRPCコンテキスト紐づけ | 1.2, 2.1 | Implementation | ✅ |
| 1.3 | リクエスト元コンテキスト実行 | 1.2, 2.1, 9.1 | Implementation + Integration Test | ✅ |
| 1.4 | プロジェクトコンテキスト独立性 | 1.2, 2.1, 9.1 | Implementation + Integration Test | ✅ |
| 1.5 | ウィンドウクローズ時リソース解放 | 1.1, 1.3, 6.2, 9.3 | Implementation + Integration Test | ✅ |
| 1.6 | 最後のウィンドウクローズ動作 | 7.1 | Wiring（既存ロジック活用） | ✅ |
| 2.1 | windowFactory廃止 | 7.3 | Cleanup（物理削除） | ✅ |
| 2.2 | 起動フローでWindowManager使用 | 7.1 | Wiring | ✅ |
| 2.3 | activateでWindowManager使用 | 7.2 | Wiring | ✅ |
| 2.4 | second-instanceでWindowManager使用 | 7.2 | Wiring | ✅ |
| 2.5 | ウィンドウタイトル表示 | 6.1 | Feature | ✅ |
| 3.1 | ウィンドウ別コンテキストファクトリ | 2.1, 2.2, 2.3 | Implementation | ✅ |
| 3.2 | getCurrentProjectPathのウィンドウ別化 | 1.2, 2.1, 9.1 | Implementation + Integration Test | ✅ |
| 3.3 | getSpecManagerServiceのウィンドウ別化 | 1.1, 2.1, 2.3, 9.1 | Implementation + Integration Test | ✅ |
| 3.4 | グローバル変数のウィンドウ別化 | 3.1 | Implementation | ✅ |
| 3.5 | selectProjectのウィンドウ別化 | 6.1, 6.2, 9.3 | Implementation + Integration Test | ✅ |
| 3.6 | ウィンドウクローズ時クリーンアップ | 1.1, 6.4, 9.3 | Implementation + Integration Test | ✅ |
| 4.1 | EventBusにprojectPathメタデータ | 4.1, 6.3 | Implementation | ✅ |
| 4.2 | Subscriptionフィルタリング | 4.3, 9.2 | Implementation + Integration Test | ✅ |
| 4.3 | ウィンドウ別イベント配信 | 4.2, 4.3, 9.2 | Implementation + Integration Test | ✅ |
| 4.4 | アプリ全体イベントのブロードキャスト | 4.2, 4.3, 9.2 | Implementation + Integration Test | ✅ |
| 4.5 | ウィンドウクローズ時Subscription解除 | 1.3 | Implementation（electron-trpc内蔵） | ✅ |
| 5.1 | 重複プロジェクトの既存ウィンドウフォーカス | 6.1, 9.3 | Feature + Integration Test | ✅ |
| 5.2 | 最小化ウィンドウの復元フォーカス | 1.5 | Test（既存実装） | ✅ |
| 5.3 | パス正規化後の重複チェック | 1.4 | Implementation | ✅ |
| 5.4 | CLI/second-instanceでの重複チェック | 7.2 | Wiring | ✅ |
| 6.1 | フォーカスウィンドウのメニュー更新 | 5.2 | Feature | ✅ |
| 6.2 | 未選択ウィンドウのメニュー無効化 | 5.2 | Feature | ✅ |
| 6.3 | 最近使ったプロジェクトのメニュー操作 | 5.1 | Feature | ✅ |
| 6.4 | 新しいウィンドウメニュー | 5.1 | Feature | ✅ |
| 7.1 | ウィンドウ状態永続化 | 8.1 | Implementation | ✅ |
| 7.2 | ウィンドウ状態復元 | 8.2 | Implementation | ✅ |
| 7.3 | 存在しないプロジェクトのスキップ | 8.2 | Implementation | ✅ |
| 7.4 | 初回起動デフォルトウィンドウ | 8.2 | Implementation | ✅ |
| 7.5 | マルチディスプレイ対応 | 8.2 | Implementation | ✅ |
| 8.1 | マルチウィンドウE2E | 10.1 | E2E Test | ✅ |
| 8.2 | 重複オープンE2E | 10.2 | E2E Test | ✅ |
| 8.3 | ウィンドウ別tRPC操作E2E | 10.3 | E2E Test | ✅ |
| 8.4 | リソース解放E2E | 10.4 | E2E Test | ✅ |

**Validation Results**:
- [x] 全criterion ID（1.1-8.4）がマッピング済み
- [x] ユーザー向け基準にFeature Implementationタスクが存在
- [x] Infrastructureタスクのみに依存する基準なし

### 1.5 Integration Test Coverage

| Integration Point | Design Section | Test Task | Status |
|-------------------|----------------|-----------|--------|
| tRPCコンテキスト分離 | "Test 1: tRPCコンテキスト分離" | 9.1 | ✅ |
| EventBusフィルタリング | "Test 2: EventBusフィルタリング" | 9.2 | ✅ |
| プロジェクト選択→サービスライフサイクル | "Test 3: プロジェクト選択とサービスライフサイクル" | 9.3 | ✅ |

**Design Testing Strategy vs Tasks Gap**:

Design.mdのTesting Strategyセクション（E2E Tests）では以下の4シナリオが記載されている:
1. マルチウィンドウ操作 → Task 10.1 ✅
2. 重複防止 → Task 10.2 ✅
3. ウィンドウクローズ → Task 10.4 ✅
4. **状態復元** → **タスクなし** ⚠️（**WARNING-4**）

Design.md line 527: 「状態復元: アプリ再起動後に前回のウィンドウ配置が復元される」がE2Eテスト対象として記載されているが、Requirement 8の受入基準にも、Task 10にも含まれていない。

**Validation Results**:
- [x] 全シーケンス図に対応する統合テストが存在
- [x] 全IPCチャネルに配信検証テストが存在
- [x] 全ストア同期フローに状態伝搬テストが存在

### 1.6 Cross-Document Contradictions

| 箇所 | 矛盾内容 | 影響度 |
|------|----------|--------|
| requirements.md Decision Log vs research.md/design.md | WindowManagerの方針: 「再設計」（requirements）vs「拡張」（research/design） | WARNING - 方針は調査で修正済みだが、Decision Log未更新 |
| requirements.md OQ2 vs tasks.md | パフォーマンス影響（10ウィンドウ同時）が未解決のまま設計・タスクフェーズに進行 | WARNING |

## 2. Gap Analysis

### 2.1 Technical Considerations

**EventBus projectPathメタデータの網羅性**（WARNING-5）

Design.mdのEvent Contract（line 424-428）ではプロジェクトスコープイベントを22件と分類している。しかしTask 6.3のイベントprojectPath付与作業では以下のファイルのみ明示的に列挙:
- `watcherUtils.ts`: SPECS_CHANGED, BUGS_CHANGED, AGENT_RECORD_CHANGED
- `projectSetup.ts`: Auto-Execution EventBus bridge
- `projectFileUtils.ts`: PROJECT_FILE_CHANGED
- `GitFileWatcherService`: GIT_CHANGES_DETECTED

以下のイベント発火箇所が明示されていない:
- Agent系6イベント（AGENT_STARTED, AGENT_STOPPED等）
- METRICS_UPDATED
- BugAutoExecution系6イベント

Task 6.3は「その他プロジェクトスコープイベントの発火箇所を網羅的に更新」と記載しているが、具体的な22イベントのチェックリストがない。実装時に漏れが発生するリスクがある。

**macOS Case-Insensitive Path比較**（WARNING-6）

Requirement 5.3はパス正規化（末尾スラッシュ除去、シンボリックリンク解決）を要求しているが、macOS APFS（デフォルトでcase-insensitive）でのパス比較について言及がない。例えば `/Users/foo/Project` と `/users/foo/project` は同一プロジェクトだが、Map lookupでは異なるキーとして扱われる。

Task 1.4は`fs.realpathSync`を追加するが、case-insensitiveなパス比較は含まれていない。

**Auto-Execution `BrowserWindow.getAllWindows()[0]` の明示的修正**（WARNING-3）

Research.md（line 75）で「Auto-Execution内の`BrowserWindow.getAllWindows()[0]`はWindowManager.getFocusedWindowId()に置換が必要」と明記されているが、この修正を明示的に実施するタスクがない。Task 3.1（互換レイヤー）とTask 6.4（productionServices分離）で暗黙的にカバーされる可能性があるが、`BrowserWindow.getAllWindows()[0]`は`getCurrentProjectPath()`経由ではなく直接BrowserWindow APIを使用している可能性があり、互換レイヤーでは対処できない。

### 2.2 Operational Considerations

**Steering文書の更新計画なし**

実装後に以下のsteering文書が陳腐化する:
- `tech.md`: `setupTRPCHandler(window, serviceOverrides?)` の記載が `initializeTRPCHandler(windowManager, sharedServices)` に変更される
- `product.md`: マルチウィンドウ機能がCore Capabilitiesに含まれていない
- `structure.md`: tRPC Patternセクションの`handler.ts`説明が変更される

これらの更新を実装完了後に実施するタスクまたはチェックリストがない。

**パフォーマンス影響の未検証**（WARNING-2）

Requirements Open Question 2: 「10ウィンドウ同時オープン時のメモリ消費とEventBusフィルタリングオーバーヘッド」が設計・タスクフェーズで未解決のまま。Research.md（line 173）では「実用上3-5ウィンドウ程度を想定」と記載しているが、パフォーマンス測定タスクは存在しない。

## 3. Ambiguities and Unknowns

**DD-003 互換レイヤーのトレードオフ検証**（WARNING-7）

Design.md DD-003（line 591）: 「移行期間中、tRPC外からのグローバル関数呼び出しはフォーカスウィンドウの状態を返す（非フォーカスウィンドウのAuto-Executionは正しく動作しない可能性）」

この既知の制限事項について:
- ユーザーへの影響範囲が不明（Auto-Execution実行中にウィンドウフォーカスを切り替えた場合の動作）
- 制限事項をドキュメントするタスクがない
- 将来の修正スケジュールが不明

**タスクの(P)マーカーの意味**

Tasks.md内で多数のタスクに`(P)`マーカーが付与されているが、その定義が記載されていない。「Parallel実行可能」を示すと推測されるが、タスクグループ内の実行順序制約（例: Task 4.1→4.2→4.3）との関係が不明確。

## 4. Steering Alignment

### 4.1 Architecture Compatibility

- **structure.md Electron Process Boundary Rules**: 設計はウィンドウ状態をMain Processで管理しており、ルールに準拠 ✅
- **structure.md State Management Rules**: WindowManagerがSSOTとなる設計は、structure.mdの「複数ウィンドウ/Remote UI間でのステート不整合」懸念に対処 ✅
- **design-principles.md**: SSOT（WindowManager）、DRY（サービスファクトリ共通化）、関心の分離（Window/tRPC/EventBus 3層分離）に準拠 ✅
- **tech.md tRPC IPC設計パターン**: 既存のContext DI、EventBus Subscriptionパターンを活用・拡張 ✅
- **logging.md**: `[WindowManager]`プレフィックスのログ設計がガイドラインに準拠 ✅

### 4.2 Integration Concerns

- **Remote UI影響**: Design Non-Goalsで「Remote UIのマルチセッション対応は将来spec」と明記。EventBusフィルタリングがSubscription側で実装されるため、WebSocketハンドラにも同様のフィルタを将来追加可能。アーキテクチャ上の拡張性は確保されている ✅
- **既存テストとの互換性**: Design（line 353）で「既存26件のテストとの互換性維持が必要」と明記。Task 1.5で「既存26件のテストが全てパスすることを確認」を検証 ✅
- **electron-trpc依存**: Research.mdでelectron-trpc 0.7.1のソースコード調査が完了し、`attachWindow`/`detachWindow`/`createContext`の動作が確認済み ✅

### 4.3 Migration Requirements

- **windowFactory.ts → WindowManager**: 移行パスが明確（Task 7.3で物理削除、全参照箇所の更新） ✅
- **projectState.ts互換レイヤー**: DD-003で段階的移行を選択。tRPC内は新方式、tRPC外は互換レイヤー ✅
- **handler.ts API変更**: `setupTRPCHandler` → `initializeTRPCHandler`の変更。テストファイル更新も明記 ✅

## 5. Recommendations

### Critical Issues (Must Fix)

なし

### Warnings (Should Address)

| ID | Issue | Description | Affected Documents |
|----|-------|-------------|-------------------|
| W-1 | Requirements Decision Log未更新 | WindowManagerの方針が「再設計」から「拡張」に変更されたが、Decision Logが更新されていない | requirements.md |
| W-2 | パフォーマンステスト欠如 | OQ2（10ウィンドウ同時）が未解決。メモリ消費の上限検証なし | requirements.md, tasks.md |
| W-3 | Auto-Execution BrowserWindow直接参照 | `BrowserWindow.getAllWindows()[0]`の明示的修正タスクなし | tasks.md |
| W-4 | 状態復元E2Eテスト欠落 | Design Testing Strategyに記載のE2Eシナリオがタスクに不在 | design.md, tasks.md |
| W-5 | EventBus projectPath網羅性不明 | 22プロジェクトスコープイベントのうち明示列挙は6件のみ | tasks.md |
| W-6 | Case-insensitiveパス比較未対応 | macOS APFSでのcase-insensitiveパス比較が設計に含まれていない | design.md, tasks.md |
| W-7 | DD-003トレードオフ未検証 | 非フォーカスウィンドウAuto-Executionの動作制限が未ドキュメント | design.md, tasks.md |

### Suggestions (Nice to Have)

| ID | Issue | Description |
|----|-------|-------------|
| I-1 | Steering文書更新 | 実装完了後にtech.md、product.md、structure.mdの更新が必要 |
| I-2 | (P)マーカーの定義 | tasks.mdに(P)マーカーの意味と使い方の説明を追加 |
| I-3 | webContentsToWindowId最適化 | `BrowserWindow.fromWebContents`で十分な場合、webContentsToWindowIdマップは不要な可能性 |
| I-4 | OQ3の正式解決 | 「旧WindowManager/ConfigStore拡張コードの扱い」をresearch結果に基づきDecision Logに反映 |

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|-------------------|-------------------|
| Medium | W-1 | Requirements Decision Logの「再設計する」を「拡張する（研究フェーズで再評価）」に更新 | requirements.md |
| Medium | W-2 | パフォーマンステストタスクの追加（5-10ウィンドウ同時起動時のメモリ計測）、またはOQ2を「実装後検証」として正式にクローズ | requirements.md, tasks.md |
| Medium | W-3 | Task 6.4にAuto-Execution内の`BrowserWindow.getAllWindows()[0]`参照箇所の特定と修正を明記 | tasks.md |
| Low | W-4 | Requirement 8に状態復元E2Eを追加するか、Design Testing Strategyから削除して整合を取る | requirements.md or design.md |
| Medium | W-5 | Task 6.3に22プロジェクトスコープイベントの完全チェックリストを追加 | tasks.md |
| Low | W-6 | Task 1.4にmacOS case-insensitiveパス比較（`path.toLowerCase()`等）の検討を追加 | design.md, tasks.md |
| Low | W-7 | DD-003のトレードオフを「Known Limitations」セクションとして文書化し、将来の修正計画を記載 | design.md |
| Low | I-1 | 実装完了後のsteering更新タスクをTask 10の後に追加 | tasks.md |

---

_This review was generated by the document-review command._
