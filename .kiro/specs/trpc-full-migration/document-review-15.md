# Specification Review Report #15

**Feature**: trpc-full-migration
**Review Date**: 2026-02-06
**Documents Reviewed**: spec.json, requirements.md, design.md, tasks.md, research.md, product.md, tech.md, structure.md, design-principles.md

## Executive Summary

全体的にドキュメント間の整合性は高く、14回のレビュー・修正サイクルを経て成熟した仕様となっている。Task 1〜8が完了済みで、実装とドキュメントの整合性を実装状況も含めて検証した。

| Severity | Count |
|----------|-------|
| Critical | 2 |
| Warning | 4 |
| Info | 3 |

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

全12要件がDesignのRequirements Traceabilityテーブルにマッピングされており、基本的な対応は良好。

**指摘なし** — Requirements IDとDesign Components/Approachの対応が適切。

### 1.2 Design ↔ Tasks Alignment

DesignのRequirements TraceabilityとTasksのCoverage Matrixが一致している。全Criterion ID（1.1〜12.4）がTasksに反映されている。

**指摘なし** — テクノロジー選択（Zod, tRPC, observable()等）の一貫性が確認できた。

### 1.3 Design ↔ Tasks Completeness

| Category | Design Definition | Task Coverage | Status |
|----------|-------------------|---------------|--------|
| systemRouter拡張 | 4プロシージャ追加 | Task 2.1 | ✅ |
| configRouter | 22プロシージャ | Task 3.1 | ✅ |
| projectRouter | 9プロシージャ | Task 4.1 | ✅ |
| fileRouter | 11プロシージャ | Task 4.2 | ✅ |
| specRouter | 27プロシージャ | Task 5.1 | ✅ |
| bugRouter | 12プロシージャ | Task 5.2 | ✅ |
| agentRouter | 11プロシージャ | Task 6.1 | ✅ |
| autoExecutionRouter | 14プロシージャ | Task 7.1 | ✅ |
| gitRouter | 13プロシージャ | Task 8.1 | ✅ |
| eventsRouter | 36 Subscription | Task 9.1 | ✅ |
| cloudflareRouter | 10プロシージャ | Task 10.1 | ✅（未着手） |
| installRouter | 20プロシージャ | Task 10.2 | ✅（未着手） |
| mcpRouter | 6プロシージャ | Task 10.3 | ✅（未着手） |
| scheduleRouter | 9プロシージャ | Task 10.4 | ✅（未着手） |
| miscRouter | 22プロシージャ | Task 10.5 | ✅（未着手） |
| vanillaClient | Shared/Client | Task 1〜のStore置換で使用 | ✅ |
| useSystemInfo | Shared/Hooks | Task 2.2 | ✅ |
| useConfigTrpc | Shared/Hooks | Task 3.2 | ✅ |
| Zodスキーマ群 | 各ルーター内インライン | 各ルータータスク | ✅ |
| レガシーIPC撤廃 | handlers.ts, channels.ts等 | Task 11.1〜11.5 | ✅（未着手） |
| E2Eテスト | Smoke/Critical Path | Task 12.1〜12.2 | ✅（未着手） |
| ドキュメント更新 | tech.md, structure.md | Task 13.1〜13.4 | ✅（未着手） |

### 1.4 Acceptance Criteria → Tasks Coverage

| Criterion | Summary | Mapped Task(s) | Task Type | Status |
|-----------|---------|----------------|-----------|--------|
| 1.1 | GET_APP_VERSION等4チャンネルtRPC移行 | 2.1 | Feature | ✅ |
| 1.2 | Zodスキーマ定義（system） | 2.1 | Feature | ✅ |
| 1.3 | Rendererフック置換（system） | 2.2 | Feature | ✅ |
| 1.4 | 統合テスト（system） | 1.2, 2.3 | Integration Test | ✅ |
| 1.5 | レガシーハンドラ削除（system） | 2.3, 4.4 | Cleanup | ✅ |
| 1.6 | preload API削除（system） | 2.3 | Cleanup | ✅ |
| 2.1 | config router作成 | 3.1 | Feature | ✅ |
| 2.2 | Config全チャンネル移行 | 3.1, 3.2 | Feature | ✅ |
| 2.3 | Zodスキーマ（config） | 3.1 | Feature | ✅ |
| 2.4 | configHandlers.ts削除 | 3.3 | Cleanup | ✅ |
| 2.5 | 統合テスト（config） | 1.2, 3.3 | Integration Test | ✅ |
| 3.1 | project/file router作成 | 4.1, 4.2 | Feature | ✅ |
| 3.2 | Project/File全チャンネル移行 | 4.1, 4.2, 4.3 | Feature | ✅ |
| 3.3 | Zodスキーマ（project/file） | 4.1, 4.2 | Feature | ✅ |
| 3.4 | projectHandlers/fileHandlers削除 | 4.4 | Cleanup | ✅ |
| 3.5 | projectFileHandlers削除 | 4.4 | Cleanup | ✅ |
| 3.6 | 統合テスト（project/file） | 1.2, 4.4 | Integration Test | ✅ |
| 4.1 | spec/bug router作成 | 5.1, 5.2 | Feature | ✅ |
| 4.2 | Spec/Bug全チャンネル移行 | 5.1, 5.2, 5.3 | Feature | ✅ |
| 4.3 | Zodスキーマ（spec/bug） | 5.1, 5.2 | Feature | ✅ |
| 4.4 | specHandlers/bugHandlers/worktreeHandlers削除 | 5.4 | Cleanup | ✅ |
| 4.5 | convertWorktreeHandlers削除 | 5.4 | Cleanup | ✅ |
| 4.6 | 統合テスト（spec/bug） | 5.4 | Integration Test | ✅ |
| 5.1 | agent router作成 | 6.1 | Feature | ✅ |
| 5.2 | Agent全チャンネル移行 | 6.1, 6.2 | Feature | ✅ |
| 5.3 | Zodスキーマ（agent） | 6.1 | Feature | ✅ |
| 5.4 | agentHandlers.ts削除 | 6.3 | Cleanup | ✅ |
| 5.5 | 統合テスト（agent） | 6.3 | Integration Test | ✅ |
| 6.1 | autoExecution router作成 | 7.1 | Feature | ✅ |
| 6.2 | AutoExecution全チャンネル移行 | 7.1, 7.2 | Feature | ✅ |
| 6.3 | Zodスキーマ（autoExecution） | 7.1 | Feature | ✅ |
| 6.4 | autoExecution/bugAutoExecutionHandlers削除 | 7.3 | Cleanup | ✅ |
| 6.5 | 統合テスト（autoExecution） | 7.3 | Integration Test | ✅ |
| 7.1 | git router作成 | 8.1 | Feature | ✅ |
| 7.2 | Git/Worktree全チャンネル移行 | 8.1, 8.2 | Feature | ✅ |
| 7.3 | Zodスキーマ（git） | 8.1 | Feature | ✅ |
| 7.4 | gitHandlers/worktreeHandlers削除 | 8.3 | Cleanup | ✅ |
| 7.5 | 統合テスト（git） | 8.3 | Integration Test | ✅ |
| 8.1 | tRPC Subscription設定 | 9.1 | Feature | ✅ |
| 8.2 | 全イベント通知移行 | 9.1 | Feature | ✅ |
| 8.3 | ipcRenderer.onリスナー削除 | 9.2 | Cleanup | ✅（未着手） |
| 8.4 | Subscriptionフック使用 | 9.2 | Feature | ✅（未着手） |
| 8.5 | 統合テスト（events） | 9.3 | Integration Test | ✅（未着手） |
| 9.1 | 残りドメイン全移行 | 10.1〜10.6 | Feature | ✅（未着手） |
| 9.2 | Zodスキーマ（残りドメイン） | 10.1〜10.5 | Feature | ✅（未着手） |
| 9.3 | 対応ハンドラ削除 | 10.7 | Cleanup | ✅（未着手） |
| 9.4 | 統合テスト（残りドメイン） | 10.7 | Integration Test | ✅（未着手） |
| 10.1 | preload/index.ts削除/最小化 | 11.1 | Cleanup | ✅（未着手） |
| 10.2 | channels.ts削除 | 11.2 | Cleanup | ✅（未着手） |
| 10.3 | handlers.ts・全ドメインハンドラ削除 | 11.2 | Cleanup | ✅（未着手） |
| 10.4 | electron.d.ts型定義削除 | 11.3 | Cleanup | ✅（未着手） |
| 10.5 | contextBridge削除 | 11.1 | Cleanup | ✅（未着手） |
| 10.6 | window.electronAPI参照全削除 | 11.4 | Cleanup | ✅（未着手） |
| 10.7 | TypeScript/テストpass | 11.5 | Integration Test | ✅（未着手） |
| 10.8 | 全統合テストpass | 11.5 | Integration Test | ✅（未着手） |
| 11.1 | E2E/人間テストチェックリスト | 12.1, 12.2 | Feature | ✅（未着手） |
| 11.2 | 自動化可能項目のE2Eテスト | 12.1 | Integration Test | ✅（未着手） |
| 11.3 | 人間テスト項目文書化 | 12.2 | Feature | ✅（未着手） |
| 12.1 | tech.md更新 | 13.1 | Infrastructure | ✅（未着手） |
| 12.2 | structure.md更新 | 13.2 | Infrastructure | ✅（未着手） |
| 12.3 | 計画書ステータス更新 | 13.3 | Infrastructure | ✅（未着手） |
| 12.4 | tRPC API追加手順文書化 | 13.4 | Infrastructure | ✅（未着手） |

**Validation Results**:
- [x] 全criterion IDがrequirements.mdからマッピングされている
- [x] ユーザー向けcriteria（UI移行、機能実装）にFeature Implementationタスクがある
- [x] InfrastructureのみのcriteriはDoc更新系（12.1〜12.4）に限定されている

### 1.5 Integration Test Coverage

| Integration Point | Design Section | Test Task | Status |
|-------------------|----------------|-----------|--------|
| tRPC Router → Service呼び出し | "Architecture Pattern" | 各ルーターテスト(2.3, 3.3等) | ✅ |
| Zodスキーマバリデーション | "Main / Schema Layer" | 各ルーターテスト | ✅ |
| tRPC Subscription → EventEmitter | "Subscription移行フロー" | 9.3 | ✅（未着手） |
| Context DI → Service注入 | "DD-006" | context.test.ts, handler-context.test.ts | ✅ |
| vanillaClient → Store統合 | "vanillaClient" | vanillaClient.test.ts | ✅ |
| E2E: アプリ起動→Smoke Test | "Verification Contract UJ-001" | 12.1 | ✅（未着手） |
| E2E: プロジェクト選択→Agent実行 | "Verification Contract UJ-003" | 12.1 | ✅（未着手） |

**Validation Results**:
- [x] 全ルーターに対する統合テストファイルが存在（16テストファイル確認済み）
- [x] Subscriptionの統合テストタスクが定義されている（Task 9.3）
- [x] Store同期フロー（vanillaClient経由）のテストがある

### 1.6 Cross-Document Contradictions

**CRITICAL-01: steering/tech.md「IPC設計パターン」セクションが移行前の状態のまま**

tech.mdの「IPC設計パターン」セクション（行94-97）は以下の記述のままである:
```
### IPC設計パターン
- `channels.ts`: チャンネル名定義（型安全）
- `handlers.ts`: IPCハンドラ実装
- preload経由でrendererに公開
```

実装状況: Task 1〜8完了により、10個のtRPCルーターが実装・登録済み。channels.ts/handlers.tsベースの記述は現在の実装と大幅に乖離している。

> **注**: Task 13.1でtech.md更新が予定されているが、移行が進行中の現時点でも、既にtRPCが主要な通信手段として機能しているため、移行途中の状態を反映する更新が必要。

**CRITICAL-02: steering/structure.md「IPC Pattern」セクションがレガシー構造のまま**

structure.mdの「IPC Pattern」セクション（行308-315）は以下の記述のままである:
```
### IPC Pattern
main/ipc/
├── channels.ts
├── handlers.ts
├── remoteAccessHandlers.ts
└── sshHandlers.ts
```

実装状況: `src/main/trpc/routers/`に10個のルーターファイルが存在し、tRPCが主要なIPC通信手段。ipcディレクトリには8個のレガシーハンドラと4個のユーティリティファイルが残存。

> **注**: Task 13.2でstructure.md更新が予定されている。

## 2. Gap Analysis

### 2.1 Technical Considerations

**WARNING-01: Task 9.2（Subscription Renderer差し替え）の`webContents.send`削除スコープが不明確**

Task 9.2の記述:
> Main側の`webContents.send()`呼び出し箇所（約40箇所、22ファイル）に対応するRenderer側のイベント受信をtRPC Subscriptionに移行する

**問題**: `webContents.send()`の呼び出しはMain側（handlers.ts等）に存在するが、Subscription移行によりこれらの呼び出しも削除/置換が必要。Task 9.2はRenderer側の差し替えを主眼としているが、Main側の`webContents.send()`削除がどのTaskで行われるか明確でない。

eventsRouterのSubscriptionはEventBus経由で動作するため、既存の`webContents.send()`呼び出し元がEventBus発火に置換される必要がある。この作業がTask 9.2に含まれるのか、別途handlers.ts内の修正として必要なのかを明確化すべき。

**WARNING-02: handlers.ts内のユーティリティファイル（projectFileUtils.ts等）の最終処分が未記載**

実装済みのTask 4.4等で、レガシーハンドラから抽出されたユーティリティファイルが作成されている:
- `src/main/ipc/projectFileUtils.ts`
- `src/main/ipc/projectUtils.ts`
- `src/main/ipc/watcherUtils.ts`
- `src/main/ipc/worktreeUtils.ts`

これらのファイルはTask 11.2（`handlers.ts`削除タスク）のスコープに含まれていない。`ipc/`ディレクトリ全体の削除を明確にするか、ユーティリティファイルの移動先を定義する必要がある。

**WARNING-03: Remote UI WebSocketApiClientとの整合性検証タスクの具体性不足**

Task 11.4に以下の記述がある:
> 実装着手前にWebSocketApiClientが提供するメソッド一覧とApiClientインターフェースの現状を照合し、削除予定のメソッドがWebSocketApiClientで使用されていないことを確認する

この照合作業は手動確認に依存しており、テストやスクリプトによる自動検証が定義されていない。`ApiClient`インターフェースの変更がWebSocketApiClientのビルドに影響しないことを、TypeScriptコンパイル（`npm run build`）で検証可能であるものの、Task 11.5の前にRemote UIビルド（`npm run build:remote`）を明示的に含めるべき。

**INFO-01: eventsRouter Subscription数の不一致（軽微）**

design.mdのeventsRouter Service Interface定義には36個のSubscriptionが列挙されている。一方、research.mdのイベントマッピングテーブルには34個（preloadリスナー）+ 3個（preloadにリスナー無し）= 37個が記載されている。

差異の原因: design.mdでは`onMetricsUpdated`がService Interfaceに含まれているが、research.mdでは「preloadにリスナー無し」として別枠に分類されている。実質的に同じイベントを指しているため機能上の問題はないが、数値の記載を統一すべき。

### 2.2 Operational Considerations

**WARNING-04: 移行中のTypeScript/ビルド検証状態が不明**

Task 1〜8が完了済みだが、各Task完了時の`npm run build && npm run typecheck`の通過状態が不明。tasks.mdの各ハンドラ削除タスク（3.3, 4.4, 5.4, 6.3, 7.3, 8.3）にはVerify条件として`npm run build && npm run typecheck pass`が記載されているが、現時点でこれがpassしているかの記録がない。

次の実装タスク（Task 9.2以降）に着手する前に、現在のビルド状態を確認すべき。

## 3. Ambiguities and Unknowns

**INFO-02: Task 10.5 miscルーターのプロシージャ数の変動可能性**

misc routerには「その他」カテゴリの15プロシージャ + SSH 7プロシージャ = 22プロシージャが予定されている。しかし、handlers.tsには`registerUnmigratedProjectHandlers()`と`registerUnmigratedFileHandlers()`に未移行チャンネルが残存しており、これらのTask 10.7での削除時にmiscルーターのスコープに影響する可能性がある。

Task 10.7の記述にはこの点が明記されているため、実装時に最終的なプロシージャ構成を確定する形で問題ない。

**INFO-03: Req 2 Acceptance Criteria 2.4のチャンネル数記載の正確性**

Req 2.4の記述: 「config routerに統合される全22プロシージャの元ハンドラが削除されていること（`configHandlers.ts`由来18チャンネル + `projectHandlers.ts`由来2チャンネル〔GET_RECENT_PROJECTS, ADD_RECENT_PROJECT〕+ `handlers.ts`由来2チャンネル〔VCS_SCHEME_GET, VCS_SCHEME_SET〕）」

design.md ConfigRouterProceduresのインターフェース定義を数えると、22プロシージャが定義されている。research.mdのマッピングテーブルでも22エントリある。数値に矛盾はない。

## 4. Steering Alignment

### 4.1 Architecture Compatibility

**全体的に良好**。design.mdのアーキテクチャはsteering文書（product.md, tech.md, structure.md）のElectron + React構成と整合している。

**注意点**: design.mdで定義されたtRPC Context DI（DD-006）パターンは、structure.mdの「Electron Process Boundary Rules」セクションの「正しい実装パターン」と整合している。Main Processがステートを保持し、Rendererは読み取り専用キャッシュとして機能する原則はtRPCフック経由でも維持される。

### 4.2 Integration Concerns

**Remote UIへの影響**: design.mdで明確にScope外としており、WebSocketApiClientは維持する方針。IpcApiClient削除時にApiClientインターフェースが影響を受ける可能性はTask 11.4で対応予定。

**vanillaClientの利用範囲**: design.mdではElectron専用と明記されており、Remote UIからの利用不可が明確化されている。structure.mdの「Renderer Process Module Restrictions」との整合性は保たれている。

### 4.3 Migration Requirements

design.mdの「Migration Strategy」セクションで10フェーズの段階的移行が定義されており、各フェーズが独立してTypeScript/テストpassする状態を維持する方針は、design-principles.mdの「技術的正しさ」原則と整合している。

## 5. Recommendations

### Critical Issues (Must Fix)

1. **CRITICAL-01: tech.md「IPC設計パターン」の更新** — 現在の記述はレガシーIPC構造のみを記載しており、tRPCルーターの存在が反映されていない。Task 13.1で対応予定だが、移行進行中の現時点でも、少なくともtRPC基盤の記述を追加することを推奨する。実装者がtech.mdを参照した際に誤ったアーキテクチャ認識を持つリスクがある。

2. **CRITICAL-02: structure.md「IPC Pattern」の更新** — 同上。`src/main/trpc/`ディレクトリ構造の追記が必要。Task 13.2で対応予定。

### Warnings (Should Address)

1. **WARNING-01: Task 9.2のMain側`webContents.send()`削除スコープの明確化** — Renderer側のSubscription差し替えだけでなく、Main側のイベント送信元（`webContents.send()`→ EventBus発火）の置換もTask 9.2のスコープに含まれることを明記すべき。

2. **WARNING-02: `src/main/ipc/`ユーティリティファイルの処分計画** — projectFileUtils.ts, projectUtils.ts, watcherUtils.ts, worktreeUtils.tsの最終配置先（`src/main/trpc/helpers/`等への移動 or `src/main/ipc/`内に残留の場合はTask 11.2での削除対象に含める）を明確化すべき。

3. **WARNING-03: Task 11.5にRemote UIビルド検証の追加** — `npm run build:remote`をTask 11.5の検証コマンドに追加し、WebSocketApiClientへの影響がないことを確認すべき。

4. **WARNING-04: 現在のビルド状態確認** — Task 9.2着手前に`npm run build && npm run typecheck`の通過を確認すべき。

### Suggestions (Nice to Have)

1. **INFO-01: Subscription数の統一** — design.mdとresearch.mdで数え方を統一する（36 vs 34+3=37）。
2. **INFO-02/03**: 実装時に自然解消される想定のため、ドキュメント修正は不要。

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|--------------------|--------------------|
| Critical | CRITICAL-01: tech.md IPC設計パターン乖離 | tRPC基盤の記述を追加（Task 13.1を前倒し or 暫定更新） | steering/tech.md |
| Critical | CRITICAL-02: structure.md IPC Pattern乖離 | tRPCディレクトリ構造を追記（Task 13.2を前倒し or 暫定更新） | steering/structure.md |
| Warning | WARNING-01: Task 9.2 Main側スコープ不明確 | Task 9.2の記述にMain側`webContents.send()`→EventBus置換を明記 | tasks.md |
| Warning | WARNING-02: ユーティリティファイル処分未定義 | Task 11.2にipc/ユーティリティファイルの処分を追記 | tasks.md |
| Warning | WARNING-03: Remote UIビルド検証不足 | Task 11.5に`npm run build:remote`を追加 | tasks.md |
| Warning | WARNING-04: ビルド状態未確認 | Task 9.2着手前にビルド検証を実施 | （実行時対応） |
| Info | INFO-01: Subscription数不一致 | design.md/research.mdの数値記載を統一 | design.md, research.md |

---

_This review was generated by the document-review command._
