# Specification Review Report #12

**Feature**: trpc-full-migration
**Review Date**: 2026-02-06
**Documents Reviewed**: spec.json, requirements.md, design.md, tasks.md, research.md, product.md, tech.md, structure.md, design-principles.md

## Executive Summary

11ラウンドのレビュー・修正サイクルを経て、仕様ドキュメント全体の品質は非常に高い水準に達している。前回レビュー（#11）のCRITICAL-1（Task 5.4のSteeringハンドラ記述）は既に修正済み、WARNING-2（useConfigTrpc/useSystemInfo内のelectronAPI参照）はコメントのみで実際の呼び出しは無いことを確認、INFO-2（Open Question #1のステータス）も解決済みに更新されていることを確認した。

実装はTask 5.3まで完了（Spec/Bug Renderer差し替え完了）、Task 5.4（レガシーハンドラ削除）が次の実装対象。handlers.ts内には依然として`registerSteeringHandlers()`と`registerUnmigratedXxxHandlers()`が残存しており、Task 5.4およびTask 11.2で削除予定。

今回のレビューでは、**前回指摘の解消状況確認**と**実装進行に伴い新たに顕在化した課題**に焦点を当てる。

- **Critical**: 1件
- **Warning**: 2件
- **Info**: 2件

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

全12 Requirementsに対して、Design内のRequirements Traceabilityテーブルで完全に対応が確認できる。前回指摘事項（Req 2.4のVCS_SCHEME handlers.ts由来チャンネルの扱い）もDesignの並行存在方針で明確にカバーされている。

**問題なし。**

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
| Spec/Bug Renderer差し替え | Task 5.3 | ✅ 完了 |
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
| 1.1-1.6 | パイロット移行（system） | 2.1-2.3 | Feature/Cleanup | ✅ |
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

**CRITICAL-1: handlers.ts内のregisterUnmigratedXxxHandlersのクリーンアップ計画が不明確**

handlers.ts内に以下の「中間パターン」関数が残存している:
- `registerUnmigratedFileHandlers()` （呼び出し: 行508、定義: 行939付近）
- `registerUnmigratedProjectHandlers()` （呼び出し: 行520、定義: 行846付近）

これらは、configHandlers.ts/projectHandlers.ts/fileHandlers.ts削除時に、まだtRPCに移行されていなかったチャンネルをhandlers.tsに一時集約したものである。Design.md「並行存在の方針」で中間パターンとして定義されており、「対応するtRPCルーター実装完了後にhandlers.tsから削除」と記載されている。

**問題**: Tasks.md内でこれら`registerUnmigratedXxxHandlers()`の削除タイミングが明示されていない。

- `registerUnmigratedProjectHandlers()` 内のチャンネルは、既にproject/file routerに移行済みの可能性が高いが、いつ物理削除するかが不明。
- `registerUnmigratedFileHandlers()` も同様。
- Task 11.2（handlers.ts全体削除）でまとめて削除されるとしても、それまでの間に未使用のレガシーコードが残存し続けるリスクがある。

→ **推奨**: 各ドメインの削除タスク（Task 5.4以降）または専用の中間クリーンアップタスクで、対応する`registerUnmigratedXxxHandlers()`も削除することを明記すべき。少なくとも、Task 5.4のスコープ内でproject/file関連の`registerUnmigrated`関数がまだ必要かどうかを検証する記述を追加すべき。

### 1.7 前回レビュー（#11）指摘事項の解消状況

| # | 指摘 | 重要度 | 解消状況 |
|---|------|--------|---------|
| CRITICAL-1 | Task 5.4にregisterSteeringHandlers削除を明記 | CRITICAL | ✅ **解消済み**: tasks.md Task 5.4に「handlers.ts内の`registerSteeringHandlers()`呼び出し（行610）と関数定義（行1019-1066）を削除する」が追記されている |
| CRITICAL-2 | 中間マイルストンでelectronAPI残存数チェック追加 | CRITICAL | ❌ **未解消**: tasks.md内に中間チェックポイントは追加されていない |
| WARNING-1 | Task 9.2のApp.tsxリスナー数の実態確認 | WARNING | ⚠️ **部分解消**: App.tsxのipcRenderer.onリスナーは現在0件で、Task 9.2の前提「34個」は実態と乖離。ただしTask 9.2の記述は未更新 |
| WARNING-2 | useConfigTrpc/useSystemInfoのelectronAPI参照 | WARNING | ✅ **解消済み**: 実測でコメント内参照のみ、実際のAPI呼び出しは無い。完全にtRPCに移行済み |
| WARNING-3 | 中間タスクのビルド検証追加 | WARNING | ❌ **未解消**: 各削除タスクのVerifyにbuild/typecheck/testは追加されていない |
| INFO-1 | ロールバック手順の具体化 | INFO | ❌ **未解消**: design.mdのRollback Triggersに具体的手順は追記されていない |
| INFO-2 | Open Question #1ステータス更新 | INFO | ✅ **解消済み**: requirements.md内で「解決済み: research.md DD-003参照」と更新されている |

## 2. Gap Analysis

### 2.1 Technical Considerations

**WARNING-1: App.tsxのipcRenderer.onリスナー0件とTask 9.2の乖離（前回WARNING-1の再指摘）**

実測で`ipcRenderer.on`リスナーがApp.tsx内に0件であることを確認。Task 9.2は「App.tsxの全イベントリスナー（34個）を`trpc.events.*.useSubscription()`に変更する」と記載しているが、**既にTask 5.3までの実装過程でipcRenderer.onリスナーが別パターン（Store直接購読やTRPC Subscription以外の方式）に移行されている可能性がある**。

App.tsxから削除されたリスナーの移行先を把握し、Task 9.2のスコープを現在の実態に合わせて更新する必要がある。考えられるシナリオ:
1. リスナーがApp.tsxから各コンポーネント/Storeに分散移行された
2. リスナーが既にtRPC Subscriptionに置き換え済み
3. webContents.sendパターンがまだMain側に残っていて、Renderer側のリスナーだけが削除された（イベント欠損リスク）

→ **推奨**: Task 9.2の実装着手前に、Main側の`webContents.send`呼び出し箇所とRenderer側のイベント受信箇所の現状マッピングを実施し、Task 9.2の記述を更新する。

**WARNING-2: 中間タスクのビルド/テスト検証ステップの欠如（前回WARNING-3の再指摘）**

Design.md「各Phaseは独立してTypeScript/テストがpassする状態を維持」との方針に対し、tasks.md内でビルド/テスト検証が明示されているのはTask 11.5（最終検証）のみ。

実測で373件のwindow.electronAPI参照が残存しており、移行が進むにつれて中間状態でのTypeScriptコンパイルエラーが発生する可能性がある。各ドメイン削除タスク完了時にビルド検証を行わないと、エラーの蓄積によりデバッグが困難になるリスクがある。

→ **推奨**: 少なくとも各Phase完了タスク（Task 5.4, 6.3, 7.3, 8.3, 9.3, 10.7）のVerifyセクションに `npm run build && npm run typecheck` を追加する。

### 2.2 Operational Considerations

**INFO-1: window.electronAPI残存373件の進捗トラッキング（前回CRITICAL-2の再指摘）**

現在のwindow.electronAPI残存件数:
- renderer/: 285件
- shared/: 88件
- **合計: 373件**（Design.md初期値693件からの移行進捗: 約46%削減）

tasks.md内に中間マイルストンでのチェックポイントがないため、移行漏れの早期検出が困難。Task 5.4完了後に改めて残存数を確認し、予想される削減ペースと実績を照合すべき。

## 3. Ambiguities and Unknowns

**INFO-2: registerUnmigratedXxxHandlersの内容と対応ルーターの不明確さ**

handlers.ts内の`registerUnmigratedProjectHandlers()`と`registerUnmigratedFileHandlers()`が具体的にどのチャンネルを含んでいるかが、仕様ドキュメント上で明確に記載されていない。Design.mdの「並行存在の方針」セクションで中間パターンの概念は説明されているが、具体的なチャンネル一覧と対応するtRPCルーターへのマッピングは記載がない。

これらのチャンネルがproject/fileルーターで既にカバーされているならば、即座にhandlers.tsから削除可能。まだカバーされていないチャンネルがあれば、追加のルーター実装が必要。

→ **推奨**: Task 5.4またはそれ以前のタスクとして、`registerUnmigratedXxxHandlers()`の内容を棚卸しし、対応するtRPCルーターとの照合を実施する。

## 4. Steering Alignment

### 4.1 Architecture Compatibility

- **tech.md**: IPC設計パターンセクションは依然として「channels.ts + handlers.ts + preload」の旧パターンを記載。Task 13.1で更新予定。tRPC基盤の記述（trpc/ディレクトリ、ルーター構成等）は欠如しているが、移行中の暫定状態としては問題ない。
- **structure.md**: `main/ipc/`セクションは旧パターンを記載。Task 13.2で更新予定。`main/trpc/`構造の記述が欠如。同上。

### 4.2 Integration Concerns

- **Remote UI影響**: Design.md DD-005でRemote UIへの影響は分析済み。WebSocketApiClientは維持され、ApiClientインターフェースのみ整理対象。現在の実装ではRemote UIに影響なし。
- **IpcApiClient削除**: Task 11.4でIpcApiClient.tsを物理削除予定。現在IpcApiClientは依然として存在し、tRPC移行済みのドメインでも一部のメソッドが参照されている可能性がある。

### 4.3 Migration Requirements

- **段階的移行の進捗**: Task 1-5.3完了。6ルーター登録済み（system, config, project, file, bug, spec）。4レガシーハンドラファイル削除済み（configHandlers, fileHandlers, projectHandlers, projectFileHandlers + 各テストファイル）。
- **中間パターン運用**: handlers.ts内に`registerUnmigratedProjectHandlers()`、`registerUnmigratedFileHandlers()`、`registerSteeringHandlers()`が残存。Task 5.4でSteering関連の削除が予定されている。

## 5. Recommendations

### Critical Issues (Must Fix)

1. **CRITICAL-1**: handlers.ts内の`registerUnmigratedProjectHandlers()`と`registerUnmigratedFileHandlers()`の削除計画をtasks.mdに明記する。具体的には:
   - Task 5.4のスコープ内で、これら関数が含むチャンネルの棚卸しを実施する記述を追加
   - 対応するtRPCルーターで既にカバー済みの場合は、Task 5.4でhandlers.tsから削除
   - 未カバーのチャンネルがある場合は、対応するTask（6.1-10.5）のスコープに含める
   - **影響ドキュメント**: tasks.md

### Warnings (Should Address)

2. **WARNING-1**: Task 9.2の記述を現在のApp.tsx実態に合わせて更新する。ipcRenderer.onリスナーが0件の状態で「34個を置換」は不正確。Main側の`webContents.send`呼び出し箇所の現状調査を含め、Subscription移行の実スコープを明確化する。
   - **影響ドキュメント**: tasks.md（Task 9.2の説明）

3. **WARNING-2**: 各ドメイン削除タスク（5.4, 6.3, 7.3, 8.3, 9.3, 10.7）のVerifyセクションに `npm run build && npm run typecheck` を追加する。Design.mdの「各Phaseは独立してTypeScript/テストがpassする状態を維持」方針との整合性を確保する。
   - **影響ドキュメント**: tasks.md

### Suggestions (Nice to Have)

4. **INFO-1**: 主要マイルストンタスク（Task 5.4, 9.2, 10.6, 11.4）のVerifyに`Grep "window.electronAPI" --count`による残存数チェックを追加し、移行進捗の定量的トラッキングを可能にする。
   - **影響ドキュメント**: tasks.md

5. **INFO-2**: handlers.ts内の`registerUnmigratedXxxHandlers()`に含まれる具体的チャンネル一覧と、対応するtRPCルーターへのマッピングをresearch.mdまたはtasks.md Appendixに追記する。
   - **影響ドキュメント**: research.md or tasks.md

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|-------------------|-------------------|
| CRITICAL | CRITICAL-1: registerUnmigratedXxxHandlersの削除計画未定義 | Task 5.4にチャンネル棚卸し・削除を明記 | tasks.md |
| WARNING | WARNING-1: Task 9.2のApp.tsxリスナー数が実態と乖離 | Main側webContents.send調査後、Task 9.2記述更新 | tasks.md |
| WARNING | WARNING-2: 中間タスクのビルド検証ステップ欠如 | 各削除タスクVerifyにbuild/typecheck追加 | tasks.md |
| INFO | INFO-1: electronAPI残存数の定量トラッキング | 主要マイルストンにGrepカウント追加 | tasks.md |
| INFO | INFO-2: registerUnmigratedの具体的チャンネル一覧 | research.mdに棚卸し結果を追記 | research.md |

---

_This review was generated by the document-review command._
