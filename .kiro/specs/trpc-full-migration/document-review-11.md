# Specification Review Report #11

**Feature**: trpc-full-migration
**Review Date**: 2026-02-06
**Documents Reviewed**: spec.json, requirements.md, design.md, tasks.md, research.md, product.md, tech.md, structure.md, design-principles.md

## Executive Summary

10ラウンドのレビュー・修正サイクルを経て、仕様ドキュメント全体の品質は大幅に向上している。実装はTask 5.2まで完了（spec/bugルーター実装済み）しており、Task 5.3（Renderer差し替え）が次の実装対象。今回のレビューでは、**実装進行に伴い顕在化した課題**と**残タスクに対する新たな指摘**に焦点を当てる。

- **Critical**: 2件
- **Warning**: 3件
- **Info**: 2件

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

全12 Requirementsに対して、Design内のRequirements Traceabilityテーブルで対応が確認できる。主要な問題は検出されない。

**軽微な不一致**:
- Requirements Req 2.4: 「config routerに統合される全22プロシージャの元ハンドラが削除されていること（`configHandlers.ts`由来18チャンネル + `projectHandlers.ts`由来2チャンネル + `handlers.ts`由来2チャンネル）」→ Design/Tasksでは`handlers.ts`由来のVCS_SCHEME_GET/SETの削除がTask 11.2（handlers.ts全体削除）に依存している。これはDesignの並行存在方針（中間パターン）で明示的にカバーされているため、整合性に問題はない。

### 1.2 Design ↔ Tasks Alignment

Design内の全コンポーネント（15ルーター + vanillaClient + フック群）がTasks内の対応するタスクにマッピングされている。

| Design Component | Task Coverage | Status |
|-----------------|--------------|--------|
| systemRouter拡張 | Task 2.1-2.3 | ✅ 完了 |
| configRouter | Task 3.1-3.3 | ✅ 完了 |
| projectRouter | Task 4.1 | ✅ 完了 |
| fileRouter | Task 4.2 | ✅ 完了 |
| specRouter | Task 5.1 | ✅ 完了 |
| bugRouter | Task 5.2 | ✅ 完了 |
| agentRouter | Task 6.1 | ✅ タスクあり |
| autoExecutionRouter | Task 7.1 | ✅ タスクあり |
| gitRouter | Task 8.1 | ✅ タスクあり |
| eventsRouter | Task 9.1 | ✅ タスクあり |
| cloudflareRouter | Task 10.1 | ✅ タスクあり |
| installRouter | Task 10.2 | ✅ タスクあり |
| mcpRouter | Task 10.3 | ✅ タスクあり |
| scheduleRouter | Task 10.4 | ✅ タスクあり |
| miscRouter | Task 10.5 | ✅ タスクあり |
| vanillaClient | Task 1.1含む | ✅ 完了 |
| useSystemInfo / useConfigTrpc | Task 2.2, 3.2含む | ✅ 完了 |

### 1.3 Design ↔ Tasks Completeness

| Category | Design Definition | Task Coverage | Status |
|----------|------------------|--------------|--------|
| UI Components | Rendererフック置換（各ドメイン） | Task X.2/X.3で網羅 | ✅ |
| Services | 15ドメインルーター | Task群で網羅 | ✅ |
| Types/Models | Zodスキーマ群 | 各ルーターTask内で定義 | ✅ |
| Subscription | eventsRouter 36 Subscription | Task 9.1 | ✅ |
| Cleanup | レガシーIPC撤廃 | Task 11.1-11.5 | ✅ |

### 1.4 Acceptance Criteria → Tasks Coverage

| Criterion | Summary | Mapped Task(s) | Task Type | Status |
|-----------|---------|----------------|-----------|--------|
| 1.1 | 4チャンネルtRPC移行 | 2.1 | Feature | ✅ |
| 1.2 | Zodスキーマ（system） | 2.1 | Feature | ✅ |
| 1.3 | Rendererフック置換 | 2.2 | Feature | ✅ |
| 1.4 | 統合テスト（system） | 2.3 | Integration Test | ✅ |
| 1.5 | レガシーハンドラ削除 | 2.3, 4.4 | Cleanup | ✅ |
| 1.6 | preload API削除 | 2.3 | Cleanup | ✅ |
| 2.1-2.5 | Config移行 | 3.1-3.3 | Feature/Cleanup | ✅ |
| 3.1-3.6 | Project/File移行 | 4.1-4.4 | Feature/Cleanup | ✅ |
| 4.1-4.6 | Spec/Bug移行 | 5.1-5.4 | Feature/Cleanup | ✅ |
| 5.1-5.5 | Agent移行 | 6.1-6.3 | Feature/Cleanup | ✅ |
| 6.1-6.5 | AutoExecution移行 | 7.1-7.3 | Feature/Cleanup | ✅ |
| 7.1-7.5 | Git/Worktree移行 | 8.1-8.3 | Feature/Cleanup | ✅ |
| 8.1-8.5 | Subscription移行 | 9.1-9.3 | Feature/Integration | ✅ |
| 9.1-9.4 | 残りドメイン移行 | 10.1-10.7 | Feature/Cleanup | ✅ |
| 10.1-10.8 | レガシー撤廃 | 11.1-11.5 | Cleanup | ✅ |
| 11.1-11.3 | E2Eテスト | 12.1-12.2 | Feature | ✅ |
| 12.1-12.4 | ドキュメント更新 | 13.1-13.4 | Infrastructure | ✅ |

**Validation Results**:
- [x] 全criterion IDがtasks.mdのCoverage Matrixに含まれている
- [x] User-facing criteriaにFeature Implementationタスクがある
- [x] Infrastructureタスクのみに依存するcriterionはない

### 1.5 Integration Test Coverage

| Integration Point | Design Section | Test Task | Status |
|-------------------|---------------|-----------|--------|
| tRPC Router → Service呼び出し | Architecture Pattern | 各Task X.3/X.4 | ✅ |
| Zodスキーマバリデーション | Zodスキーマ群 | 各ルーターテスト | ✅ |
| Subscription配信 | eventsRouter | Task 9.3 | ✅ |
| Context DI | DD-006 | Task 1.1 | ✅ 完了 |
| vanillaClient→IPC | vanillaClient | Task 1.1内 | ✅ 完了 |

**Validation Results**:
- [x] 全ルーターに統合テストタスクが存在
- [x] SubscriptionテストにwaitForパターン指定あり
- [x] Context DIのテストがTask 1.1/1.2で完了済み

### 1.6 Cross-Document Contradictions

**CRITICAL-1: handlers.ts内の未移行ハンドラ管理とTask 5.4のスコープ不一致**

Design.md「並行存在の方針」セクションで定義された「中間パターン」（`registerUnmigratedXxxHandlers()`としてhandlers.tsに集約）は、実装で正しく運用されている（Task 4.4でprojectHandlers.ts/fileHandlers.ts/configHandlers.ts削除済み、未移行ハンドラはhandlers.tsに集約済み）。

しかし、**Task 5.4の記述では`specHandlers.ts`（25チャンネル）を物理削除するとされているが、実際のコードベースではhandlers.ts内に`registerSteeringHandlers()`（4チャンネル）が存在し、これらはTask 5.1でspec routerに移行されることが記載されている**（Design.md Implementation Notes参照）。

問題: handlers.ts内の`specHandlers.ts`に由来しない、独自定義されたSteeringハンドラ（`CHECK_STEERING_FILES`等4チャンネル）が、Task 5.4の「specHandlers.ts削除」記述だけでは見落とされる可能性がある。

→ **Status**: Task 5.1でspec routerへの移行が明記されており（Design.md Implementation Notes）、Tasks.mdのTask 5.1説明にも「checkSteeringFiles等」と記載されているため、**カバーはされている。ただし、Task 5.4でこれらがhandlers.tsからも削除されることを明記すべき。**

**CRITICAL-2: Renderer側 `window.electronAPI` 残存数と移行計画の乖離**

Design.md: 「合計: Renderer/Shared全体で約693箇所」
実測値: renderer/で298件（54ファイル）+ shared/で88件（14ファイル）= **合計386件（68ファイル）**

Task 1-4が完了した現在、約307箇所が既にtRPCに移行済みと推定される（693 - 386 = 307）。しかし、残存386件は依然として大量であり、Task 5.3以降で確実に削減される必要がある。

→ **Status**: Design.mdの数値は移行前の初期値として記載されたもの。実装進行中の現在値との乖離は自然だが、**tasks.md内に中間マイルストンでの残存数チェックポイントがない**点がリスク。

## 2. Gap Analysis

### 2.1 Technical Considerations

**WARNING-1: Renderer側のipcRenderer.onリスナーがApp.tsxから既に0件**

App.tsx内の`ipcRenderer.on`リスナーをGrepした結果が0件。これはTask 1-4の実装過程で既にリスナーが削除/移行された可能性があるが、**Task 9.2「App.tsxの全イベントリスナー（34個）を置換」の前提条件が変化している**。

→ 実装者は Task 9.2 着手前に現在のイベントリスナー実装状態を再確認する必要がある。

**WARNING-2: `shared/hooks/useConfigTrpc.ts`と`shared/hooks/useSystemInfo.ts`にwindow.electronAPIフォールバックが残存**

実測で`shared/hooks/useConfigTrpc.ts`に4件、`shared/hooks/useSystemInfo.ts`に2件の`window.electronAPI`参照が残存。これらはTask 2.2/3.2で作成されたtRPCフック内のフォールバックコードの可能性がある。

→ Task 11.4（window.electronAPI全削除）のスコープ内でカバーされるが、フォールバックがある状態でのテスト信頼性に注意。

**WARNING-3: テスト実行の検証コマンドがtasks.mdに不足**

各タスクのVerifyセクションはGrepパターンのみで、`npm run build && npm run typecheck` や `vitest run` の実行確認が最終タスク（11.5）にしか明記されていない。Design.mdの「各Phaseは独立してTypeScript/テストがpassする状態を維持」との方針に対し、中間タスクでのビルド/テスト検証が明示されていない。

### 2.2 Operational Considerations

**INFO-1: ロールバック手順の具体化**

Design.mdにRollback Triggersは定義されているが、具体的なロールバック手順（git revert戦略、ブランチ管理）は記載されていない。worktreeベースの開発であるため、ブランチ単位のrevertで対応可能だが明示されていると安心。

## 3. Ambiguities and Unknowns

**INFO-2: Open Question #1（Subscriptionの実装方式）が未解決ステータス**

Requirements.mdのOpen Questions #1「Subscriptionの実装方式」は「調査が必要」と記載されているが、research.mdとDesign.md DD-003で既に解決済み（electron-trpc 0.7.1がSubscriptionを完全サポート）。Requirements.mdのOpen Questions内のステータスが更新されていない。

## 4. Steering Alignment

### 4.1 Architecture Compatibility

- **tech.md**: IPC設計パターンセクションは依然として「channels.ts + handlers.ts + preload」の旧パターンを記載。Task 13.1で更新予定。移行完了前の現状としては問題ないが、tRPCインフラの記述が欠如している。
- **structure.md**: `main/ipc/`セクションは旧パターンを記載。Task 13.2で更新予定。同様に移行中は問題ないが、`main/trpc/`構造の記述が欠如。

### 4.2 Integration Concerns

- **Remote UI影響**: Design.md DD-005でRemote UIへの影響は分析済み。WebSocketApiClientは維持され、ApiClientインターフェースのみ整理対象。
- **IpcApiClient削除**: Task 11.4でIpcApiClient.tsを物理削除。ApiClientインターフェースからIpcApiClient固有メソッドを削除する手順が記載済み。

### 4.3 Migration Requirements

- **段階的移行の進捗**: Task 1-4完了、Task 5.1-5.2完了。configHandlers.ts、projectHandlers.ts、fileHandlers.ts、projectFileHandlers.tsは削除済み。
- **中間パターン運用**: handlers.ts内に未移行ハンドラが`registerUnmigratedXxxHandlers()`として集約されている。Design.mdの方針通りに運用中。

## 5. Recommendations

### Critical Issues (Must Fix)

1. **CRITICAL-1**: Task 5.4の説明に「handlers.ts内の`registerSteeringHandlers()`由来4チャンネル（CHECK_STEERING_FILES, GENERATE_VERIFICATION_MD, CHECK_RELEASE_MD, GENERATE_RELEASE_MD）もhandlers.tsから削除する」旨を追記する。Task 5.1でspec routerに移行後、Task 5.4のスコープ内でhandlers.tsからの参照を削除する流れを明確化する。
   - **影響ドキュメント**: tasks.md（Task 5.4の説明）

2. **CRITICAL-2**: tasks.md内の中間マイルストン（例: Task 5.4完了時、Task 9完了時）で`window.electronAPI`残存数のチェックポイントを追加する。これにより、移行漏れを早期検出できる。
   - **影響ドキュメント**: tasks.md（Task 5.4, 9.2, 10.6にVerify追加）

### Warnings (Should Address)

3. **WARNING-1**: Task 9.2着手前にApp.tsxの現在のイベントリスナー実装状態を調査し、タスク説明の「34個」が現在の実態と合致するか確認する。既に移行済みのリスナーがあればタスク説明を更新する。
   - **影響ドキュメント**: tasks.md（Task 9.2の説明）

4. **WARNING-2**: `shared/hooks/useConfigTrpc.ts`と`shared/hooks/useSystemInfo.ts`内の`window.electronAPI`フォールバック参照を、次のRenderer差し替えタスク（Task 5.3相当の中間作業 or Task 11.4）で確実に削除対象とする。
   - **影響ドキュメント**: tasks.md（Task 11.4のVerifyに追記検討）

5. **WARNING-3**: 各ドメイン移行タスクの最終サブタスク（例: 5.4, 6.3, 7.3等）のVerifyセクションに `npm run build && npm run typecheck && vitest run` の実行確認を追記する。
   - **影響ドキュメント**: tasks.md（Task 5.4, 6.3, 7.3, 8.3, 9.3, 10.7のVerify）

### Suggestions (Nice to Have)

6. **INFO-1**: Design.mdのRollback Triggersセクションに、具体的なリカバリ手順（`git revert`ベースのブランチ戦略）を1-2行追記する。
   - **影響ドキュメント**: design.md

7. **INFO-2**: Requirements.mdのOpen Questions #1に「解決済み: research.md参照」と追記し、ステータスを更新する。
   - **影響ドキュメント**: requirements.md

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|-------------------|-------------------|
| CRITICAL | CRITICAL-1: Steeringハンドラのhandlers.ts削除スコープ不明確 | Task 5.4にhandlers.ts内Steering関連削除を明記 | tasks.md |
| CRITICAL | CRITICAL-2: 移行進捗のチェックポイント不足 | 中間マイルストンでelectronAPI残存数チェックを追加 | tasks.md |
| WARNING | WARNING-1: App.tsxリスナー数の実態乖離 | Task 9.2着手前に現状調査、タスク説明更新 | tasks.md |
| WARNING | WARNING-2: フック内electronAPIフォールバック残存 | Task 11.4 Verifyに明示追加 | tasks.md |
| WARNING | WARNING-3: 中間タスクのビルド検証不足 | 各削除タスクVerifyにbuild/typecheck/test追加 | tasks.md |
| INFO | INFO-1: ロールバック手順の具体化 | Rollback Triggersにリカバリ手順追記 | design.md |
| INFO | INFO-2: Open Questionステータス未更新 | 解決済みステータスに更新 | requirements.md |

---

_This review was generated by the document-review command._
