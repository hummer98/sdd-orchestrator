# Specification Review Report #5

**Feature**: trpc-full-migration
**Review Date**: 2026-02-06
**Documents Reviewed**: spec.json, requirements.md, design.md, tasks.md, research.md, document-review-1.md〜document-review-4-reply.md, product.md, tech.md, structure.md, design-principles.md

## Executive Summary

| 重要度 | 件数 |
|--------|------|
| CRITICAL | 0 |
| WARNING | 2 |
| INFO | 3 |

レビュー#1〜#4で指摘されたCritical/Warning事項は全て修正適用済みであり、仕様ドキュメント全体の品質は高い水準に達している。本レビュー#5は**実装着手直前の最終確認レビュー**として、以下の新規観点から検証を行った:

1. **WARNING**: requirements.md Req 1のAcceptance Criteria 1.1に`GET_APP_PATH`が記載されていないが、design.mdのRequirements Traceability 1.1とresearch.mdのsystem routerマッピングには4チャンネル（GET_APP_VERSION, GET_PLATFORM, GET_NODE_ENV + GET_APP_PATH相当の`getAppPath`）が含まれる。tasks.md Task 2.1でも4プロシージャとして明示。requirements.mdの列挙が3つのみで不一致
2. **WARNING**: research.mdのconfig routerマッピングに22チャンネル記載（SETTINGS_BUGS_WORKTREE_DEFAULT_GET/SETがbug routerに移行と注記）だが、requirements.md Req 2のAcceptance Criteria 2.4では「configHandlers.ts（18チャンネル）」としか記載しておらず、configルーターの実プロシージャ数22個との差異が説明不足
3. **INFO**: design.md eventsRouter Subscriptionインターフェースの`onAutoExecutionPhaseStarted`と`onBugAutoExecutionPhaseStarted`はresearch.mdで「preloadにリスナー無し、Main側でbroadcast/sendされるが現在preloadで未受信」と注記。tRPC移行で新たにRenderer側で受信する設計変更であり、これが意図的な機能拡張かの確認が望ましい
4. **INFO**: tasks.md Task 10.5 miscルーターに15プロシージャ+SSH関連7プロシージャが列挙されているが、research.mdのmisc routerマッピング（15行）+ SSH関連マッピング（7行）= 22プロシージャであり、Task 10.5の「15プロシージャ」という記述が実態と乖離
5. **INFO**: design.md eventsRouter Subscription数は「36個」（Task 9.1の記述）だが、research.mdのマッピングテーブルでは34個（preload実測）+ 3個（Main側のみbroadcast）= 37行ある。`MENU_NEW_WINDOW`は除外済みで36が正しいが、research.mdテーブルの行数との間で混同リスクがある

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**全体評価**: 優良。レビュー#1〜#4の修正が全て反映済みで、主要な矛盾は解消されている。

**新規検出**:

| # | 不一致内容 | requirements.md | design.md/research.md | 重要度 |
|---|-----------|----------------|----------------------|--------|
| 1 | **Req 1 Acceptance Criteria 1.1のチャンネル列挙** | 「GET_APP_VERSION、GET_PLATFORM、GET_NODE_ENV」の3チャンネルを列挙 | design.md Traceability 1.1: 「GET_APP_VERSION等4チャンネルtRPC移行」。tasks.md Task 2.1: 「getAppVersion, getPlatform, getAppPath, getNodeEnvの4プロシージャ」。research.mdのsystem routerマッピングにはGET_APP_VERSION, GET_PLATFORM, GET_NODE_ENVの3行のみ（GET_APP_PATHはchannels.tsに定義されていない新規プロシージャの可能性） | WARNING |
| 2 | **Req 2 AC 2.4のチャンネル数** | 「configHandlers.ts（18チャンネル）」 | research.mdのconfig routerマッピング: 22行（ただしSETTINGS_BUGS_WORKTREE系2チャンネルはbug routerへの注記あり、実質20プロシージャ）。configHandlers.tsの実チャンネル数18とconfig routerのプロシージャ数22は、configRouter Service Interfaceに記載の22プロシージャ（VcsScheme、RemoteUiAutoStart等がconfigHandlersに含まれない別ハンドラから来ている可能性）で差異がある | WARNING |

### 1.2 Design ↔ Tasks Alignment

**全体評価**: 良好。レビュー#4のC1（registerSteeringHandlers）修正が適用済みで、design.mdとtasks.mdの整合性は確保されている。

**新規検出**:

| # | 不一致内容 | Design | Tasks | 影響 |
|---|-----------|--------|-------|------|
| 1 | **Task 10.5 miscルーターのプロシージャ数** | research.md: misc router 15プロシージャ + SSH関連 7プロシージャ = 合計22プロシージャ | tasks.md Task 10.5: 「全15プロシージャ」「SSH関連プロシージャも含める」 | INFO: 15という数字がSSH関連を含まない数値。タスク記述で「SSH関連プロシージャも含める」とあるため実装時に問題にはならないが、数値が不正確 |

### 1.3 Design ↔ Tasks Completeness

| Category | Design Definition | Task Coverage | Status |
|----------|-------------------|---------------|--------|
| systemRouter拡張 | ✅ 4プロシージャ | Task 2.1-2.3 | ⚠️（requirements.mdで3チャンネルのみ列挙） |
| configRouter | ✅ 22プロシージャ Service Interface | Task 3.1-3.3 | ✅ |
| projectRouter | ✅ 9プロシージャ Service Interface | Task 4.1, 4.3-4.4 | ✅ |
| fileRouter | ✅ research.md 11プロシージャ | Task 4.2, 4.3-4.4 | ✅ |
| specRouter | ✅ research.md 27プロシージャ + steering 4 | Task 5.1, 5.3-5.4 | ✅ |
| bugRouter | ✅ research.md 10プロシージャ | Task 5.2, 5.3-5.4 | ✅ |
| agentRouter | ✅ research.md 11プロシージャ | Task 6.1-6.3 | ✅ |
| autoExecutionRouter | ✅ research.md 14プロシージャ | Task 7.1-7.3 | ✅ |
| gitRouter | ✅ research.md 13プロシージャ | Task 8.1-8.3 | ✅ |
| eventsRouter | ✅ 36 Subscription | Task 9.1-9.3 | ✅ |
| cloudflareRouter | ✅ research.md 10プロシージャ | Task 10.1 | ✅ |
| installRouter | ✅ research.md 20プロシージャ | Task 10.2 | ✅ |
| mcpRouter | ✅ research.md 6プロシージャ | Task 10.3 | ✅ |
| scheduleRouter | ✅ research.md 9プロシージャ | Task 10.4 | ✅ |
| miscRouter | ✅ research.md 15+7=22プロシージャ | Task 10.5 | ⚠️（数値表記のみ） |
| Zodスキーマ群 | ✅ 14ファイル | 各タスクに含む | ✅ |
| レガシー撤廃 | ✅ Impact Analysis Contract完備 | Task 11.1-11.5 | ✅ |
| E2Eテスト | ✅ Verification Contract定義済み | Task 12.1-12.2 | ✅ |
| ドキュメント更新 | ✅ 対象ファイル明記 | Task 13.1-13.4 | ✅ |

### 1.4 Acceptance Criteria → Tasks Coverage

**全50個のcriterion IDマッピング**: tasks.md末尾のRequirements Coverage Matrixで網羅的に管理されている。レビュー#4以降の変更なし。

| Criterion | Summary | Mapped Task(s) | Task Type | Status |
|-----------|---------|----------------|-----------|--------|
| 1.1 | GET_APP_VERSION等tRPC移行 | 2.1 | Feature | ⚠️（requirements.mdで3チャンネル、design.md/tasks.mdで4プロシージャ） |
| 1.2〜1.6 | system関連 | 2.1-2.3 | Feature/Cleanup | ✅ |
| 2.1〜2.5 | config関連 | 3.1-3.3 | Feature/Cleanup | ✅ |
| 3.1〜3.6 | project/file関連 | 4.1-4.4 | Feature/Cleanup | ✅ |
| 4.1〜4.6 | spec/bug関連 | 5.1-5.4 | Feature/Cleanup | ✅ |
| 5.1〜5.5 | agent関連 | 6.1-6.3 | Feature/Cleanup | ✅ |
| 6.1〜6.5 | autoExecution関連 | 7.1-7.3 | Feature/Cleanup | ✅ |
| 7.1〜7.5 | git関連 | 8.1-8.3 | Feature/Cleanup | ✅ |
| 8.1〜8.5 | subscription関連 | 9.1-9.3 | Feature/Cleanup | ✅ |
| 9.1〜9.4 | その他ドメイン | 10.1-10.7 | Feature/Cleanup | ✅ |
| 10.1〜10.8 | レガシー撤廃 | 11.1-11.5 | Cleanup | ✅ |
| 11.1〜11.3 | E2E/人間テスト | 12.1-12.2 | Feature | ✅ |
| 12.1〜12.4 | ドキュメント更新 | 13.1-13.4 | Infrastructure | ✅ |

**Validation Results**:
- [x] 全criterion IDからrequirements.mdへのマッピングが完了
- [x] ユーザー向けcriterionにFeature Implementationタスクが存在
- [x] Cleanupタスクに対応する削除対象ファイルが具体的に列挙されている
- [ ] Criterion 1.1のチャンネル列挙がrequirements.md（3個）とdesign.md/tasks.md（4個）で不一致

### 1.5 Integration Test Coverage

| Integration Point | Design Section | Test Task | Status |
|-------------------|----------------|-----------|--------|
| tRPC Router → Service呼び出し | 全ルーター | 各ドメインTask X.3/X.4 | ✅ |
| Context DI → モックService注入 | DD-006 | Task 1.1, 1.2 | ✅ |
| Zodスキーマバリデーション | Zodスキーマ群 | 各ルーターテスト内 | ✅ |
| Subscription → EventEmitter | eventsRouter | Task 9.3 | ✅ |
| Subscription cleanup on window close | DD-003 / Risk 1 | Task 9.1（修正適用済み） | ✅ |
| Renderer Subscription接続 | Subscription移行フロー | Task 12.1（UJ-004） | ✅ |
| IpcApiClient完全削除後の動作 | DD-005 | Task 11.5 | ✅ |
| Remote UI WebSocketApiClient独立性 | Migration Strategy | N/A（Scope外） | ✅ |

**Validation Results**:
- [x] 各ルーターに統合テストタスクが存在
- [x] Subscription統合テスト方法がTask 9.3に記載
- [x] Subscriptionライフサイクル管理（cleanup）の検証がTask 9.1に追加済み
- [x] E2E Smoke TestがTask 12.1に含まれる

### 1.6 Cross-Document Contradictions

| # | 矛盾内容 | 文書A | 文書B | 重要度 |
|---|---------|-------|-------|--------|
| 1 | **system routerのプロシージャ数** | requirements.md Req 1 AC 1.1: 3チャンネル列挙（GET_APP_VERSION, GET_PLATFORM, GET_NODE_ENV） | design.md Traceability 1.1: 「4チャンネル」、tasks.md Task 2.1: 4プロシージャ（+getAppPath） | WARNING |
| 2 | **config routerプロシージャ数 vs configHandlers.tsチャンネル数** | requirements.md Req 2 AC 2.4: 「configHandlers.ts（18チャンネル）」 | design.md configRouter Service Interface: 22プロシージャ。config routerは他ハンドラからのチャンネルも統合している可能性 | WARNING |
| 3 | **eventsルーター新規受信3 Subscription** | design.md eventsRouter: onAutoExecutionPhaseStarted, onBugAutoExecutionPhaseStarted, onMetricsUpdatedを含む | research.md: 「preloadにリスナー無し」と注記。現在のRendererでは受信しておらず、tRPC移行で新たに受信開始する機能拡張 | INFO |

## 2. Gap Analysis

### 2.1 Technical Considerations

| # | Gap | 重要度 | 影響 |
|---|-----|--------|------|
| 1 | **system router `getAppPath`の出自不明確**: tasks.md Task 2.1で`getAppPath`プロシージャが列挙されているが、requirements.md AC 1.1にはなく、research.mdのsystem routerマッピングにも対応するレガシーチャンネルが記載されていない。channels.tsに`GET_APP_PATH`は存在しない可能性がある（新規追加プロシージャか、既存の別名チャンネルか） | WARNING | 実装時に`getAppPath`の仕様が不明確。ただし`app.getPath()`を呼ぶだけの単純なプロシージャであり、実装上のリスクは低い |
| 2 | **Subscription新規3イベントの仕様未定義**: design.md eventsRouterにonAutoExecutionPhaseStarted、onBugAutoExecutionPhaseStarted、onMetricsUpdatedが含まれるが、これらは現在のRendererで受信されていない新規機能。受信時のUI動作仕様が未定義 | INFO | Subscription移行と同時に新規機能追加を行うことになるが、既にMain側でbroadcastされているイベントを単にSubscriptionで受信するだけであり、UI側の処理は後から追加可能 |

### 2.2 Operational Considerations

| # | Gap | 重要度 | 影響 |
|---|-----|--------|------|
| 1 | **移行進捗の定量的トラッキング方法が未定義**: 219チャンネルの移行進捗を各Phase完了時にどう計測するかが未定義。レビュー#4 Suggestion 2で提案されたGrepベース進捗追跡は未採用 | INFO | 移行漏れの検出は各ドメインのレガシーハンドラ削除タスク（X.3/X.4）のVerify行で対応可能だが、全体の進捗可視化は手動確認に依存 |

## 3. Ambiguities and Unknowns

| # | 曖昧な記述 | 文書 | 具体化が必要な理由 |
|---|-----------|------|-------------------|
| 1 | **`getAppPath`プロシージャの仕様**: tasks.md Task 2.1で4番目のプロシージャとして列挙されているが、requirements.md/research.mdでの定義が不明確。`app.getPath('userData')`等のElectron app.getPath()を呼ぶのか、`app.getAppPath()`を呼ぶのかも不明 | tasks.md, requirements.md | 実装者が正しいElectron APIを呼び出すために仕様の明確化が必要 |
| 2 | **config routerの22プロシージャの出自**: configHandlers.ts（18チャンネル）以外の4プロシージャがどのレガシーハンドラから来ているのか。VcsScheme（2チャンネル）とRemoteUiAutoStart（2チャンネル）がconfigHandlers.ts内ではなく別ハンドラに定義されている可能性 | requirements.md, research.md | Req 2 AC 2.4の「configHandlers.ts（18チャンネル）が削除されていること」が完了条件だが、config routerには22プロシージャが存在するため、残り4プロシージャの出自と対応するレガシーコード削除が別Taskでカバーされているか確認が必要 |

## 4. Steering Alignment

### 4.1 Architecture Compatibility

**全体評価**: 優良。

- **tech.md**: 「IPC設計パターン」セクションがレガシーIPC基盤のみ記載。Task 13.1で更新予定。tRPC関連技術（electron-trpc, @trpc/server, @trpc/react-query）がtech.md Key Librariesに未記載だが、trpc-infrastructure Specで導入済み。Task 13.1のスコープ内で対応予定
- **structure.md**: `src/main/ipc/`セクションは現状のまま。Task 13.2で`src/main/trpc/`に更新予定。Electron Process Boundary Rulesの「Renderer → IPC → Main → ブロードキャスト → Renderer」パターンはtRPC移行後も「Renderer → tRPC mutation/query → Main → Subscription → Renderer」として維持。設計原則との整合性は良好
- **design-principles.md**: DRY/SSOT/KISS/YAGNI原則との適合を確認。DD-002「薄いアダプター」はKISS準拠。DD-004「Zodスキーマ=SSoT」はSSOT原則準拠。DD-006「Context DI」はテスト容易性を優先した技術的に正しい判断
- **product.md**: Core Capabilitiesとの整合性良好。tRPC移行は内部リファクタリングであり、ユーザー向け機能に変更なし

### 4.2 Integration Concerns

| 懸念 | 影響 | 対応状況 |
|------|------|---------|
| **Remote UI（WebSocketApiClient）への影響** | IpcApiClient削除後もWebSocketApiClientは独立して動作 | DD-005で方針定義済み ✅ |
| **ApiClientインターフェース整理** | Task 11.4で具体化済み（メソッド差分分析ステップ追加） | ✅ |
| **既存IPCテスト33ファイルの扱い** | 各ドメインルーターテストで知識引き継ぎ | ✅ |
| **Electron Process Boundary維持** | tRPC移行で自然に維持 | ✅ |
| **tech.md tRPC未記載** | Task 13.1で更新予定 | ✅ |
| **Subscription新規3イベント** | 現在未受信のイベントがtRPC移行で受信開始 | ⚠️ UIへの影響は限定的 |

### 4.3 Migration Requirements

- **段階的移行**: DD-001の方針は適切。実装順序が依存関係を考慮している
- **WebSocketHandler独立性**: channels.tsに直接依存しないため、レガシーIPC撤廃の影響なし
- **trpc-infrastructure前提**: spec.jsonのdependencies.requiresに`trpc-infrastructure`が記載済み
- **後方互換性**: 移行期間中のレガシー/tRPC共存設計は健全

## 5. Recommendations

### Critical Issues (Must Fix)

なし。レビュー#1〜#4のCritical指摘事項は全て解決済み。

### Warnings (Should Address)

1. **requirements.md Req 1 AC 1.1のチャンネル列挙を4個に統一**（Section 1.1 #1, Section 1.6 #1）
   - requirements.md AC 1.1には3チャンネルのみ列挙（GET_APP_VERSION, GET_PLATFORM, GET_NODE_ENV）だが、design.md/tasks.mdでは4プロシージャ（+ getAppPath）が定義されている
   - **推奨**: 以下のいずれかを実施:
     a. `getAppPath`がchannels.tsの既存チャンネルに対応するなら、requirements.md AC 1.1に追加
     b. `getAppPath`が新規追加プロシージャ（レガシー対応なし）なら、requirements.md AC 1.1の記述を「GET_NODE_ENV（新規追加プロシージャ）」と同様に注記を付けてgetAppPathも新規追加であることを明記。または、design.md/tasks.mdから削除してrequirements.mdに合わせる
   - **影響**: 実装者が4番目のプロシージャの仕様を正確に把握できない

2. **config routerプロシージャ数22個の根拠を明確化**（Section 1.1 #2, Section 3 #2）
   - requirements.md AC 2.4は「configHandlers.ts（18チャンネル）」の削除を完了条件としているが、config routerは22プロシージャを持つ。差分の4プロシージャ（VcsScheme 2個 + RemoteUiAutoStart 2個と推定）がどのレガシーハンドラから移行されるかが不明確
   - **推奨**: research.mdのconfig routerマッピングテーブルに、各チャンネルの出自ハンドラファイル名を列として追加し、configHandlers.ts以外から来るプロシージャを明示。requirements.md AC 2.4の「18チャンネル」をconfig router全体のプロシージャ数に合わせて修正、または「configHandlers.ts由来の18チャンネル + 他ハンドラから移行される4チャンネル」と記述
   - **影響**: 他ハンドラ由来の4プロシージャの元ファイル削除が別Task（例: Task 10.7）でカバーされているか確認が必要

### Suggestions (Nice to Have)

1. **Subscription新規3イベントの受信方針を明記**: design.md eventsRouterの`onAutoExecutionPhaseStarted`、`onBugAutoExecutionPhaseStarted`、`onMetricsUpdated`は現在のRendererで受信されていない。tRPC移行時にこれらのSubscriptionを定義するが、Renderer側でデータを受信してもUI表示に使用しない場合は、Subscriptionの定義のみ行いuseSubscriptionの呼び出しは後回しにする選択肢がある。design.mdまたはtasks.mdに方針を一文追記すると明確になる

2. **research.md events routerテーブルのカラム追加**: research.mdのeventsマッピングテーブルに「preloadリスナー有無」列を追加し、新規Subscriptionとレガシー置換の区別を視覚的に明確化すると、実装時の判断が容易になる

3. **各ドメインルーターのプロシージャ数サマリー**: design.mdまたはresearch.mdに全ルーターのプロシージャ数一覧サマリーテーブルを追加すると、移行規模の全体像が一目で把握できる:
   - system: 4, config: 22, project: 9, file: 11, spec: 27+4=31, bug: 10, agent: 11, autoExecution: 14, git: 13, events: 36, cloudflare: 10, install: 20, mcp: 6, schedule: 9, misc: 22
   - 合計: 228プロシージャ（219レガシーチャンネル + 新規追加分）

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|--------------------|--------------------|
| WARNING | Req 1 AC 1.1のチャンネル列挙が3個（design.md/tasks.mdでは4個） | requirements.mdのAC 1.1に`getAppPath`を追加、またはdesign.md/tasks.mdから削除して整合性を確保 | requirements.md, design.md, tasks.md |
| WARNING | config router 22プロシージャ vs configHandlers.ts 18チャンネルの差異根拠不足 | research.md config routerテーブルに出自ハンドラファイル名を追記。requirements.md AC 2.4の数値を正確化 | requirements.md, research.md |
| INFO | Subscription新規3イベントの受信方針未明示 | design.md eventsRouterセクションにRenderer側での受信・表示方針を追記 | design.md |
| INFO | Task 10.5 miscルーターのプロシージャ数15が不正確（SSH含め22） | tasks.md Task 10.5の「全15プロシージャ」を「全22プロシージャ（misc 15 + SSH関連7）」に修正 | tasks.md |
| INFO | events routerのSubscription数とresearch.mdテーブル行数の混同リスク | 既存で十分だが、research.mdテーブルに「合計36（preload実測34 + Main側のみ3 - 未使用1）」の計算式を追記するとより明確 | research.md |

---

_This review was generated by the document-review command._
