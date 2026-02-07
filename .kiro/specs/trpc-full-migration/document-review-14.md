# Specification Review Report #14

**Feature**: trpc-full-migration
**Review Date**: 2026-02-06
**Documents Reviewed**: spec.json, requirements.md, design.md, tasks.md, research.md, product.md, tech.md, structure.md

## Executive Summary

Task 1〜8.2まで完了し、移行は中盤を過ぎた段階。9つのtRPCルーターが実装・登録済みで、15個のレガシーハンドラファイルが削除済み。残りはTask 8.3（Git/Worktreeレガシー削除）、Task 9（Subscription移行）、Task 10（残りドメイン移行）、Task 11（レガシー撤廃）、Task 12-13（E2E・ドキュメント）。

実装進捗を踏まえた現時点での問題を以下に報告する。

- **Critical**: 3件
- **Warning**: 4件
- **Info**: 2件

## 1. Document Consistency Analysis

### 1.1 Requirements <-> Design Alignment

**良好**: 全12要件がDesignのComponents and Interfacesテーブル、Requirements Traceabilityテーブルで網羅されている。各要件に対応するルーター名、プロシージャ定義、Impact Analysisが明記されている。

**注意点**:
- Req 9のドメイン分割（cloudflare, install, mcp, schedule, misc）がDesignのComponents and Interfacesテーブルとresearch.mdのチャンネルマッピングテーブルで一致している。

### 1.2 Design <-> Tasks Alignment

**良好**: Design PhaseのPhase 1〜10がTasks内のTask 1〜13に展開されており、移行順序が一致している。

**矛盾なし**: テクノロジー選択、ルーター命名規則、Zodスキーマ配置方針が全ドキュメントで整合している。

### 1.3 Design <-> Tasks Completeness

| Category | Design Definition | Task Coverage | Status |
| -------- | ----------------- | ------------- | ------ |
| systemRouter拡張 | 4プロシージャ | Task 2.1 | OK |
| configRouter | 22プロシージャ | Task 3.1 | OK |
| projectRouter | 9プロシージャ | Task 4.1 | OK |
| fileRouter | 11プロシージャ | Task 4.2 | OK |
| specRouter | 27プロシージャ | Task 5.1 | OK |
| bugRouter | 12プロシージャ | Task 5.2 | OK |
| agentRouter | 11プロシージャ | Task 6.1 | OK |
| autoExecutionRouter | 14プロシージャ | Task 7.1 | OK |
| gitRouter | 13プロシージャ | Task 8.1 | OK |
| eventsRouter | 36 Subscription | Task 9.1 | OK |
| cloudflareRouter | 10プロシージャ | Task 10.1 | OK |
| installRouter | 20プロシージャ | Task 10.2 | OK |
| mcpRouter | 6プロシージャ | Task 10.3 | OK |
| scheduleRouter | 9プロシージャ | Task 10.4 | OK |
| miscRouter | 22プロシージャ | Task 10.5 | OK |
| vanillaClient | シングルトン | Task 3.2等で使用 | OK |
| useSystemInfo | Shared Hook | Task 2.2 | OK |
| useConfigTrpc | Shared Hook | Task 3.2 | OK |
| Zodスキーマ | 全ルーター内インライン | 各Task *.1 | OK |
| レガシー削除 | 全22ハンドラ+基盤 | Task 8.3, 10.7, 11.* | OK |

### 1.4 Acceptance Criteria -> Tasks Coverage

| Criterion | Summary | Mapped Task(s) | Task Type | Status |
|-----------|---------|----------------|-----------|--------|
| 1.1 | GET_APP_VERSION等4チャンネル移行 | 2.1 | Feature | OK |
| 1.2 | Zodスキーマ定義（system） | 2.1 | Feature | OK |
| 1.3 | Rendererフック置換（system） | 2.2 | Feature | OK |
| 1.4 | 統合テスト（system） | 2.3 | Integration Test | OK |
| 1.5 | レガシーハンドラ削除（system） | 2.3 | Cleanup | OK |
| 1.6 | preload API削除（system） | 2.3 | Cleanup | OK |
| 2.1 | config router作成 | 3.1 | Feature | OK |
| 2.2 | Config全チャンネル移行 | 3.1, 3.2 | Feature | OK |
| 2.3 | Zodスキーマ（config） | 3.1 | Feature | OK |
| 2.4 | configHandlers.ts削除 | 3.3 | Cleanup | OK |
| 2.5 | 統合テスト（config） | 3.3 | Integration Test | OK |
| 3.1 | project/file router作成 | 4.1, 4.2 | Feature | OK |
| 3.2 | Project/File全チャンネル移行 | 4.1-4.3 | Feature | OK |
| 3.3 | Zodスキーマ（project/file） | 4.1, 4.2 | Feature | OK |
| 3.4 | projectHandlers/fileHandlers削除 | 4.4 | Cleanup | OK |
| 3.5 | projectFileHandlers削除 | 4.4 | Cleanup | OK |
| 3.6 | 統合テスト（project/file） | 4.4 | Integration Test | OK |
| 4.1 | spec/bug router作成 | 5.1, 5.2 | Feature | OK |
| 4.2 | Spec/Bug全チャンネル移行 | 5.1-5.3 | Feature | OK |
| 4.3 | Zodスキーマ（spec/bug） | 5.1, 5.2 | Feature | OK |
| 4.4 | specHandlers/bugHandlers等削除 | 5.4 | Cleanup | OK |
| 4.5 | convertWorktreeHandlers削除 | 5.4 | Cleanup | OK |
| 4.6 | 統合テスト（spec/bug） | 5.4 | Integration Test | OK |
| 5.1 | agent router作成 | 6.1 | Feature | OK |
| 5.2 | Agent全チャンネル移行 | 6.1, 6.2 | Feature | OK |
| 5.3 | Zodスキーマ（agent） | 6.1 | Feature | OK |
| 5.4 | agentHandlers.ts削除 | 6.3 | Cleanup | OK |
| 5.5 | 統合テスト（agent） | 6.3 | Integration Test | OK |
| 6.1 | autoExecution router作成 | 7.1 | Feature | OK |
| 6.2 | AutoExecution全チャンネル移行 | 7.1, 7.2 | Feature | OK |
| 6.3 | Zodスキーマ（autoExecution） | 7.1 | Feature | OK |
| 6.4 | autoExecution/bugAutoExecution削除 | 7.3 | Cleanup | OK |
| 6.5 | 統合テスト（autoExecution） | 7.3 | Integration Test | OK |
| 7.1 | git router作成 | 8.1 | Feature | OK |
| 7.2 | Git/Worktree全チャンネル移行 | 8.1, 8.2 | Feature | OK |
| 7.3 | Zodスキーマ（git） | 8.1 | Feature | OK |
| 7.4 | gitHandlers/worktreeHandlers削除 | 8.3 | Cleanup | OK |
| 7.5 | 統合テスト（git） | 8.3 | Integration Test | OK |
| 8.1 | tRPC Subscription設定 | 9.1 | Feature | OK |
| 8.2 | 全イベント通知移行 | 9.1 | Feature | OK |
| 8.3 | ipcRenderer.onリスナー削除 | 9.2 | Cleanup | OK |
| 8.4 | Subscriptionフック使用 | 9.2 | Feature | OK |
| 8.5 | 統合テスト（events） | 9.3 | Integration Test | OK |
| 9.1 | 残りドメイン全移行 | 10.1-10.6 | Feature | OK |
| 9.2 | Zodスキーマ（残りドメイン） | 10.1-10.5 | Feature | OK |
| 9.3 | 対応ハンドラ削除 | 10.7 | Cleanup | OK |
| 9.4 | 統合テスト（残りドメイン） | 10.7 | Integration Test | OK |
| 10.1 | preload/index.ts削除/最小化 | 11.1 | Cleanup | OK |
| 10.2 | channels.ts削除 | 11.2 | Cleanup | OK |
| 10.3 | handlers.ts・全ドメインハンドラ削除 | 11.2 | Cleanup | OK |
| 10.4 | electron.d.ts型定義削除 | 11.3 | Cleanup | OK |
| 10.5 | contextBridge削除 | 11.1 | Cleanup | OK |
| 10.6 | window.electronAPI参照全削除 | 11.4 | Cleanup | OK |
| 10.7 | TypeScript/テストpass | 11.5 | Integration Test | OK |
| 10.8 | 全統合テストpass | 11.5 | Integration Test | OK |
| 11.1 | E2E/人間テストチェックリスト | 12.1, 12.2 | Feature | OK |
| 11.2 | 自動化可能項目のE2Eテスト | 12.1 | Integration Test | OK |
| 11.3 | 人間テスト項目文書化 | 12.2 | Feature | OK |
| 12.1 | tech.md更新 | 13.1 | Infrastructure | OK |
| 12.2 | structure.md更新 | 13.2 | Infrastructure | OK |
| 12.3 | 計画書ステータス更新 | 13.3 | Infrastructure | OK |
| 12.4 | tRPC API追加手順文書化 | 13.4 | Infrastructure | OK |

**Validation Results**:
- [x] 全criterion IDがtasksにマッピングされている
- [x] ユーザー向けcriterionにFeature Implementationタスクがある
- [x] Criterionが単独でInfrastructureタスクに依存するケースなし

### 1.5 Integration Test Coverage

| Integration Point | Design Section | Test Task | Status |
|-------------------|----------------|-----------|--------|
| tRPC Router → Service呼び出し | Components and Interfaces | 各Task *.3-*.4 | OK |
| Subscription → EventEmitter | eventsRouter | Task 9.3 | OK |
| Context DI | DD-006 | Task 1.1 | OK |
| vanillaClient → ipcLink | vanillaClient | テストあり | OK |

**Validation Results**:
- [x] 各ルーターに統合テストタスクが存在
- [x] Subscription配信テストがTask 9.3で定義
- [x] Context伝搬テストがTask 1.1で対応

### 1.6 Cross-Document Contradictions

**矛盾なし**: 主要ドキュメント間に矛盾は検出されなかった。

## 2. Gap Analysis

### 2.1 Technical Considerations

1. **CRITICAL: handlers.tsのAutoExecution/Agent系イベントブロードキャスト移行の具体手順不足**

   handlers.ts（1,416行）内にはAutoExecution系イベントハンドラ（約320行、行1009-1330）とAgent系イベントブロードキャスト（`webContents.send()`呼び出し5箇所）が残存している。Task 9.2で「既存の`BrowserWindow.webContents.send()`呼び出しを削除または整理する」と記載されているが、handlers.ts内のこの大規模なイベントハンドリングコード（AutoExecution状態変更コールバック、Agent出力ストリーミング等）をどこに移行するかの具体的方針が不足している。

   **問題点**: 単に`webContents.send()`を削除するだけでは、イベント発火元の登録ロジックが消失する。これらのコールバック登録はService初期化時に行われており、tRPC Subscription移行後もService側のイベント発火元は維持する必要がある。Task 9.2の記述だけでは、handlers.ts内のコールバック登録コード（例: `coordinator.on('statusChanged', ...)` → `webContents.send()`）のリファクタリング方針が不明。

   **推奨**: Task 9.2にhandlers.ts内のイベントコールバック登録コードの移行先（eventsRouter内のobservable、またはService層への統合）を明記する。

2. **CRITICAL: Renderer側の`window.electronAPI`残存307箇所の移行完了性担保**

   現時点でRenderer/Shared全体に307箇所の`window.electronAPI`参照が残存している（51ファイル+13ファイル）。Task 8.2までの完了タスクでRenderer差し替えが行われているにもかかわらず307箇所残存しているのは、以下の理由による:
   - 移行済みドメイン（system, config, project, file, spec, bug, agent, autoExecution, git）のRenderer差し替え完了後も、**未移行ドメイン（cloudflare, install, mcp, schedule, misc, events）** のRenderer呼び出しが残存
   - **IpcApiClient.ts**（699行）が44メソッドで`window.electronAPI`を使用し続けている

   Task 11.4で「`window.electronAPI`参照の全削除」が定義されているが、Task 10.6（その他ドメインRenderer差し替え）とTask 9.2（Subscription差し替え）の完了が前提。これらのタスク依存関係は正しく定義されているが、**307箇所の網羅的な削除を1つのタスク（11.4）で実行するのは実装リスクが高い**。

   **推奨**: 各ドメイン移行タスク完了時に`window.electronAPI`参照のカウントダウンを記録し、Task 11.4時点での残存数をゼロに向けて段階的に減少させる方針を明記する。

3. **WARNING: preload/index.tsの段階的縮小が不十分**

   preload/index.ts（1,303行）は、移行済みドメインのAPIが`@deprecated`コメント付きで残存している状態。Task 2.3〜8.3の各Cleanupタスクで「preload/index.tsから対応APIを削除する」と記載されているが、実際にはTask 8.2完了時点でもpreloadに大量のレガシーAPIが残っている。

   **推奨**: 各ドメイン移行完了時にpreload/index.tsからの対応API削除を確実に実施していることを検証する手順を追加する。

### 2.2 Operational Considerations

1. **WARNING: Remote UI（WebSocketApiClient）への影響検証タスク不足**

   Design DD-005でIpcApiClient段階的廃止が決定されているが、`ApiClient`インターフェースの変更がWebSocketApiClientに波及するリスクへの具体的検証タスクがない。Task 11.4に「ApiClientインターフェースからIpcApiClient固有メソッドを削除してWebSocketApiClient実装に合わせて整理する」と記載されているが、**WebSocketApiClientのメソッドセットとtRPCルーターのプロシージャセットの差分検証**がタスクとして明示されていない。

   **推奨**: Task 11.4の実行前に、WebSocketApiClientが提供するメソッド一覧とtRPCルーターのプロシージャ一覧を照合し、Remote UIで使用される全APIがWebSocketApiClient経由で引き続き利用可能であることを検証するステップを追加する。

## 3. Ambiguities and Unknowns

1. **WARNING: Task 10.7のregisterUnmigratedProjectHandlers/registerUnmigratedFileHandlers削除タイミング**

   Task 10.7に「handlers.ts内の`registerUnmigratedProjectHandlers()`と`registerUnmigratedFileHandlers()`の呼び出しと関数定義を削除する（全7チャンネルはTask 4.1/4.2/10.5でtRPCルーターに移行済み）」と記載されている。しかし現時点の実装ではTask 4.1/4.2は完了済みだがTask 10.5は未完了。Task 10.7のVerify条件が`registerUnmigratedProjectHandlers`等のGrep結果0件を要求しているため、**Task 10.5（miscルーター実装）の完了がTask 10.7の前提条件**になっている。この依存関係はTasksの記述から推測可能だが、明示的な前提条件の記載がない。

   **推奨**: Task 10.7の冒頭に「前提: Task 10.1〜10.6全完了」を明記する。

2. **INFO: Subscription統合テスト（Task 9.3）のテスト対象優先度**

   Task 9.3で「主要イベント（Agent出力、Spec変更、AutoExecution状態変更）を優先的にテストする」と記載されているが、36個のSubscription全てをテストするかの判断基準が不明。

   **推奨**: 最低限テストすべきSubscriptionリストと、省略可能なもの（例: Menu系のシンプルなイベント）を区分する。

## 4. Steering Alignment

### 4.1 Architecture Compatibility

**tech.md**: 現在のtech.mdは「IPC設計パターン」として`channels.ts`/`handlers.ts`/preloadの旧パターンを記載しており、tRPC移行後の状態を反映していない。Task 13.1で更新が計画されている。**移行完了まではtech.mdと実装の乖離が存在する**が、これは計画通り。

**structure.md**: 現在のstructure.mdは`main/ipc/`ディレクトリを記載しているが、tRPC移行により`main/trpc/`ディレクトリが主要な通信レイヤーになりつつある。Task 13.2で更新が計画されている。

### 4.2 Integration Concerns

1. **CRITICAL: structure.mdのState Management Rules とtRPC移行の整合性**

   structure.mdの「Electron Process Boundary Rules (Strict)」セクションでは、ステート変更の流れを「Renderer → IPC → Main → ブロードキャスト → Renderer」と定義しており、アンチパターン例でも`window.electronAPI`を使用している。tRPC移行後は「Renderer → tRPC mutation → Main → Subscription → Renderer」に変わるが、**この原則自体は維持される**（通信手段が変わるだけで、境界の原則は不変）。

   ただし、**vanillaClient導入により、Zustand Store内から直接tRPC mutation/queryを呼び出すパターンが正式に導入される**。これはstructure.mdの「Rendererへの委譲禁止パターン」に記載された「Renderer内で状態を更新してからIPCを呼ぶ」パターンとは区別が必要。vanillaClientを使うStoreパターンが「正しい実装パターン」のセクションに含まれるべき。

   **推奨**: Task 13.2でstructure.md更新時に、tRPC + vanillaClientを使ったStore実装パターンを「正しい実装パターン」セクションに追加する。

### 4.3 Migration Requirements

- **データ移行**: 不要（データモデルに変更なし）
- **後方互換性**: 移行期間中はレガシーIPC/tRPCが共存（Design記載通り）
- **段階的ロールアウト**: ドメイン単位での段階的移行が計画通り進行中

## 5. Recommendations

### Critical Issues (Must Fix)

1. **C-01: handlers.ts内イベントコールバック移行方針の明確化**
   - Task 9.2の記述にhandlers.ts内のAutoExecution/Agentイベントコールバック登録コード（約320行）の移行先を明記する
   - 選択肢: (a) eventsRouter内のobservable設定時にService.onコールバックを登録、(b) Service初期化ロジックをmain/index.tsに移動
   - **影響ドキュメント**: tasks.md

2. **C-02: window.electronAPI残存307箇所の段階的削減追跡**
   - 各ドメイン移行タスク完了時に`window.electronAPI`参照の残存数を確認し、確実にゼロに向かっていることを検証する手順を追加する
   - Task 10.6完了時に残存数がIpcApiClient.ts内のみになっていることを期待値として明記する
   - **影響ドキュメント**: tasks.md

3. **C-03: structure.mdのtRPC対応パターン追加**
   - Task 13.2のスコープに、vanillaClientを使ったStore実装パターンの追加を含める
   - Electron Process Boundary Rulesの例示コードをtRPCフック/vanillaClientに更新する
   - **影響ドキュメント**: tasks.md, structure.md

### Warnings (Should Address)

1. **W-01: preload/index.tsの段階的縮小検証**
   - Task 8.3以降の各Cleanupタスクで、preload/index.tsの行数削減を検証ステップに追加
   - **影響ドキュメント**: tasks.md

2. **W-02: Remote UI WebSocketApiClientの互換性検証**
   - Task 11.4の前にWebSocketApiClientメソッドセットの網羅性を確認するステップを追加
   - **影響ドキュメント**: tasks.md

3. **W-03: Task 10.7の前提条件明示**
   - Task 10.7の冒頭に「前提: Task 10.1〜10.6全完了」を明記
   - **影響ドキュメント**: tasks.md

4. **W-04: Subscription統合テスト対象の優先度区分**
   - Task 9.3に最低限テストすべきSubscriptionリスト（Agent系、AutoExecution系、Spec/Bug変更）と省略可能なもの（Menu系）を区分
   - **影響ドキュメント**: tasks.md

### Suggestions (Nice to Have)

1. **S-01: 移行進捗ダッシュボード**
   - 各ドメインの移行状態（ルーター実装/Renderer差し替え/レガシー削除/テスト）を一覧で追跡できるチェックリストをtasks.mdまたは別ドキュメントに追加
   - 現在のtasks.mdのCheckbox状態で追跡可能だが、ドメイン横断的な進捗が見にくい

2. **S-02: テストカバレッジの定量目標**
   - 各ルーターテストのプロシージャカバレッジ（全プロシージャのうちテスト対象の割合）を定義

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
| -------- | ----- | ------------------ | ------------------ |
| Critical | C-01 | Task 9.2にhandlers.ts内イベントコールバック移行方針を明記 | tasks.md |
| Critical | C-02 | 各ドメイン移行タスクに`window.electronAPI`残存数検証を追加 | tasks.md |
| Critical | C-03 | Task 13.2にvanillaClientパターン追加を含める | tasks.md |
| Warning | W-01 | Cleanupタスクにpreload行数削減検証を追加 | tasks.md |
| Warning | W-02 | Task 11.4前にWebSocketApiClient互換性検証ステップ追加 | tasks.md |
| Warning | W-03 | Task 10.7に前提条件を明記 | tasks.md |
| Warning | W-04 | Task 9.3にSubscriptionテスト優先度区分を追加 | tasks.md |
| Info | S-01 | 移行進捗ダッシュボードの追加検討 | tasks.md or 新規 |
| Info | S-02 | テストカバレッジ定量目標の定義 | tasks.md |

---

_This review was generated by the document-review command._
