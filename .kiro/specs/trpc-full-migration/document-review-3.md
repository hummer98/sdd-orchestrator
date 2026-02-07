# Specification Review Report #3

**Feature**: trpc-full-migration
**Review Date**: 2026-02-06
**Documents Reviewed**: spec.json, requirements.md, design.md, tasks.md, research.md, document-review-1.md, document-review-1-reply.md, document-review-2.md, document-review-2-reply.md, product.md, tech.md, structure.md, design-principles.md

## Executive Summary

| 重要度 | 件数 |
|--------|------|
| CRITICAL | 2 |
| WARNING | 4 |
| INFO | 3 |

レビュー#1・#2で指摘されたCritical/Warning事項は全て修正適用済み。本レビューでは、**コードベース実測値とspec文書の数値乖離**を中心に新規検出を行った。主な発見は、**IpcApiClientメソッド数の大幅な過小見積もり**（design.md「44メソッド」vs 実測110メソッド）と**Renderer側のwindow.electronAPI使用ファイル数の修正必要性**（design.md「~60ファイル」vs 実測75ファイル）である。また、**handlers.tsのDIパターン移行に関するTask 1.1の具体性不足**が実装リスクとして検出された。

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**全体評価**: 良好。レビュー#1・#2指摘事項の修正により、requirements.mdとdesign.md/research.md間の矛盾は解消済み。新規検出なし。

### 1.2 Design ↔ Tasks Alignment

**全体評価**: 良好。Tasks Coverage Matrixの全criterion IDマッピングが完了しており、Task TypeのInfrastructure/Feature分類も適切。

**新規検出**:

| # | 不一致内容 | Design | Tasks | 影響 |
|---|-----------|--------|-------|------|
| 1 | **IpcApiClientメソッド数** | design.md: 「44メソッド」（Interface Changes行693） | 実測: **110メソッド**。IpcApiClientはApiClient抽象化層の実装であり、Result型ラッパーとして多数のメソッドを持つ | Task 11.4（IpcApiClient物理削除）の影響範囲が過小評価されている |
| 2 | **window.electronAPI使用箇所数** | design.md: 「Renderer ~120呼び出し（Store）、~60呼び出し（Component）」合計~554 | 実測: renderer 554行/75ファイル + shared 76行/13ファイル = 合計630行/88ファイル | 合計行数は概ね一致だが、ファイル数はdesign.mdに記載なし |

### 1.3 Design ↔ Tasks Completeness

| Category | Design Definition | Task Coverage | Status |
|----------|-------------------|---------------|--------|
| systemRouter拡張 | ✅ 定義済み | Task 2.1-2.3 | ✅ |
| configRouter | ✅ Service Interface（22プロシージャ） | Task 3.1-3.3 | ✅ |
| projectRouter | ✅ Service Interface（9プロシージャ） | Task 4.1, 4.3-4.4 | ✅ |
| fileRouter | ⚠️ design.mdに詳細なし（research.md参照） | Task 4.2, 4.3-4.4 | ⚠️ |
| specRouter | ⚠️ 「同じパターン」（research.md参照） | Task 5.1, 5.3-5.4 | ⚠️ |
| bugRouter | ⚠️ 「同じパターン」（research.md参照） | Task 5.2, 5.3-5.4 | ⚠️ |
| agentRouter | ⚠️ 「同じパターン」（research.md参照） | Task 6.1-6.3 | ⚠️ |
| autoExecutionRouter | ⚠️ 「同じパターン」（research.md参照） | Task 7.1-7.3 | ⚠️ |
| gitRouter | ⚠️ 「同じパターン」（research.md参照） | Task 8.1-8.3 | ⚠️ |
| eventsRouter | ✅ Subscription Interface（36 Subscription） | Task 9.1-9.3 | ✅ |
| cloudflare/install/mcp/schedule/misc | ⚠️ 「同じパターン」（research.md参照） | Task 10.1-10.7 | ⚠️ |
| Zodスキーマ群 | ✅ ファイル配置定義済み | 各タスクに含む | ✅ |
| レガシー撤廃 | ✅ Impact Analysis Contract完備 | Task 11.1-11.5 | ✅ |
| E2Eテスト | ✅ Verification Contract定義済み | Task 12.1-12.2 | ✅ |
| ドキュメント更新 | ✅ 対象ファイル明記 | Task 13.1-13.4 | ✅ |

**注記**: 「同じパターン」ルーター群はdesign.mdで意図的にDRY省略されている（「configRouter/projectRouterと同じパターンに従う」記載あり）。research.mdに全ドメインの詳細マッピングが記載されているため、design.md単体の完全性は低いが参照性は確保されている。これはレビュー#1以来の既知事項であり、設計方針として許容する。

### 1.4 Acceptance Criteria → Tasks Coverage

**レビュー#1-#2との差分**: 全criterion IDのマッピング状況は変更なし。全50個のcriterionが適切なTaskにマッピングされており、Coverage Matrixが完全。新規検出なし。

**Validation Results**:
- [x] 全criterion IDからrequirements.mdへのマッピングが完了
- [x] ユーザー向けcriterionにFeature Implementationタスクが存在
- [x] Infrastructureのみのcriterionはドキュメント更新系（12.x）のみで適切
- [x] Cleanupタスクに対応する削除対象ファイルが具体的に列挙されている

### 1.5 Integration Test Coverage

| Integration Point | Design Section | Test Task | Status |
|-------------------|----------------|-----------|--------|
| tRPC Router → Service呼び出し | 全ルーター | 各ドメインTask X.3/X.4 | ✅ |
| Context DI → モックService注入 | DD-006 | Task 1.1, 1.2 | ✅ |
| Zodスキーマバリデーション | Zodスキーマ群 | 各ルーターテスト内 | ✅ |
| Subscription → EventEmitter | eventsRouter | Task 9.3 | ✅ |
| Renderer Subscription接続 | Subscription移行フロー | Task 12.1（UJ-004） | ✅ |
| IpcApiClient完全削除後の動作 | DD-005 | Task 11.5 | ⚠️ |
| Remote UI WebSocketApiClient独立性 | Migration Strategy | なし | ✅ コードベースで確認済 |

**新規指摘**:
- IpcApiClientが110メソッドを持つため、Task 11.4の「物理削除」後にTask 11.5のTypeScript/テストpassが想定以上に困難になる可能性がある。各ドメインTask (X.2/X.3) でIpcApiClient内の該当メソッド呼び出し元を段階的にtRPCに移行する手順は明記されているが、110メソッド全てのカバレッジ検証が最終Taskに集中するリスクがある

**Validation Results**:
- [x] 各ルーターに統合テストタスクが存在
- [x] Subscription統合テスト方法がTask 9.3に記載
- [x] E2E Smoke TestがTask 12.1に含まれる
- [ ] IpcApiClient 110メソッドの段階的削除の完全性検証方法が未明示

### 1.6 Cross-Document Contradictions

| # | 矛盾内容 | 文書A | 文書B | 重要度 |
|---|---------|-------|-------|--------|
| 1 | **IpcApiClientメソッド数の過小見積もり** | design.md: 「IpcApiClient.ts 44メソッド」（行693） | コードベース実測: **110メソッド**（698行）。ApiClient抽象化でResult型ラッパーとして実装 | CRITICAL |
| 2 | **preload electronAPIメソッド定義数の未記載** | design.md: 「preload/index.ts 2,771行」 | コードベース実測: 2,774行、約**618メソッド定義**。行数は概ね正確だが、メソッド数が未記載のため移行ボリューム感が伝わりにくい | INFO |
| 3 | **Renderer使用ファイル数の乖離** | design.md: 「~60呼び出し」（コンポーネント）、「~120呼び出し」（Store） | 実測: renderer 554行/**75ファイル** + shared 76行/**13ファイル** = **88ファイル** | WARNING |
| 4 | **IPCハンドラファイル数** | requirements.md/design.md: 「19ファイル」 | コードベース実測: **22ハンドラファイル**（`startImplPhase.ts`, `clipboardHandlers.ts`, `ipcUtils.ts`がカウント外） | WARNING |

## 2. Gap Analysis

### 2.1 Technical Considerations

| # | Gap | 重要度 | 影響 |
|---|-----|--------|------|
| 1 | **handlers.ts DIパターン移行の具体性不足**: handlers.tsは37個の`registerXxxHandlers()`関数を呼び出すオーケストレーターとして機能し、`currentProjectPath`、`specManagerService`等のグローバルステートを管理している。Task 1.1ではContext拡張によるDIを定義しているが、handlers.tsの具体的な「37関数のDI引数パターン」をどのようにContextに移行するかの詳細が不足 | WARNING | Task 1.1の実装スコープが不明確。特に`currentProjectPath`のようなmutableステートのContext注入方式が未決定 |
| 2 | **IpcApiClient 110メソッドの段階的削除追跡**: IpcApiClientは110メソッドを持ち、各ドメイン移行時に該当メソッドの呼び出し元をtRPCに移行する。ただし各ドメインTaskの記述は「Store/コンポーネントのwindow.electronAPI呼び出しをtRPCに置換」であり、IpcApiClient経由の呼び出し（44メソッドではなく実際は110メソッド）との関係が曖昧 | WARNING | 一部のIpcApiClientメソッドがドメインTask完了後も残存し、Task 11.4時点で大量の未移行メソッドが発覚するリスク |
| 3 | **`safeHandle` ラッパーの廃止方針**: 既存IPCハンドラはほぼ全て`safeHandle`ラッパー（205箇所）で統一的なエラーハンドリングを行っている。tRPCルーターでは`TRPCError`に置換するが、`safeHandle`のエラー変換ロジックの移行方針が明示されていない | INFO | 各ルーターで個別にエラーハンドリングを実装する際の一貫性リスク |

### 2.2 Operational Considerations

| # | Gap | 重要度 | 影響 |
|---|-----|--------|------|
| 1 | **IPCテストファイル（33ファイル）の移行/削除方針**: `src/main/ipc/`配下に33個のテストファイルが存在する。Task 11.2でhandlers.tsを削除する際にこれらのテストファイルも同時に削除する必要があるが、一部のテストロジック（特にService層のテスト）はtRPCルーターテストに移行すべきかの判断基準が未記載 | INFO | テストカバレッジの一時的な低下リスク |

## 3. Ambiguities and Unknowns

| # | 曖昧な記述 | 文書 | 具体化が必要な理由 |
|---|-----------|------|-------------------|
| 1 | **handlers.tsの`currentProjectPath`ミュータブルステート**: handlers.tsは`let currentProjectPath: string \| undefined`でミュータブルステートを保持し、`selectProject`関数で更新される。DD-006のContext DI設計では「サービスインスタンスを注入」とあるが、このミュータブルステートの注入方式（getter関数? Context再生成? Closure?）が未定義 | design.md DD-006, tasks.md Task 1.1 | Context拡張の設計がブロックされる可能性 |
| 2 | **IpcApiClientとdirect window.electronAPI呼び出しの関係**: Renderer側には「IpcApiClient経由」の呼び出しと「window.electronAPIを直接呼び出す」2パターンが混在している。design.md DD-005ではIpcApiClient段階的廃止を定義しているが、両パターンの移行優先順位やマージ戦略が未明記 | design.md DD-005 | 各ドメインTask実装時に「IpcApiClient内メソッド移行」と「直接呼び出し移行」のどちらを先に実施すべきか不明 |
| 3 | **既存IPCテスト（33ファイル）のtRPCテストへの移行方針**: `src/main/ipc/__tests__/`に33個のテストファイルがあるが、これらの知識（テストケース、エッジケース）をtRPCルーターテストに引き継ぐか、単純に削除するかの判断基準が未記載 | tasks.md | 既存テストに含まれるエッジケース知識の喪失リスク |

## 4. Steering Alignment

### 4.1 Architecture Compatibility

**全体評価**: 良好。tRPC移行はSteering文書の全設計原則と整合している。

- **tech.md**: 「IPC設計パターン: channels.ts + handlers.ts + preload」は移行完了後にTask 13.1で更新予定。現時点では正確な記載
- **structure.md**: `src/main/ipc/`セクションはTask 13.2で`src/main/trpc/`に更新予定。Electron Process Boundary RulesはtRPCでも同様に適用される（ステート変更はMain→IPCの方向ルールがtRPCでも維持）
- **design-principles.md**: DD-002「ルーターは既存Serviceの薄いアダプター」はKISS/YAGNI原則に準拠。「中間Service層導入」を却下した判断は適切
- **structure.md Electron Process Boundary Rules**: tRPC移行後も「Renderer → IPC → Main → ブロードキャスト → Renderer」の流れが維持される。tRPC mutation/queryがIPCの代替となり、SubscriptionがブロードキャストのtRPC版となる

### 4.2 Integration Concerns

| 懸念 | 影響 | 対応状況 |
|------|------|---------|
| **Remote UI（WebSocketApiClient）への影響** | IpcApiClient削除後もWebSocketApiClientは独立して動作 | DD-005で方針定義済み、コードベースで検証済み |
| **ApiClientインターフェース整理** | IpcApiClient 110メソッドの削除後、ApiClient型をWebSocketApiClient用に縮小 | Task 11.4で対応。ただしメソッド数の実測（110）がdesign.md（44）と乖離 |
| **既存IPCテスト33ファイルの扱い** | テストファイル削除によるカバレッジ低下 | 各ドメインルーターテスト（Task X.3/X.4）で代替カバレッジ確保の方針だが、既存テストの移行方針が未記載 |
| **Electron Process Boundary維持** | tRPC移行後もMain/Renderer境界ルール維持が必要 | structure.mdのルールはtRPCでも自然に適用される（ルーターはMain Processで実行） |

### 4.3 Migration Requirements

- **段階的移行**: DD-001の方針に変更なし。各Phase独立でTypeScript/テストpassを維持
- **WebSocketHandler独立性**: コードベースで確認済み。webSocketHandlerはchannels.tsに依存していない
- **後方互換性**: 移行中のレガシーIPC/tRPC共存は設計通り
- **IPCテスト移行**: 33テストファイルの知識引き継ぎ方針の明確化が望ましい

## 5. Recommendations

### Critical Issues (Must Fix)

1. **IpcApiClientメソッド数の修正**（Section 1.6 #1）
   - design.md Interface Changes行693の「IpcApiClient.ts 44メソッド」が実測110メソッドと大幅に乖離
   - **推奨**: design.md Interface Changesテーブルの`IpcApiClient.ts`行を「110メソッド」に修正。各ドメインTaskでのIpcApiClient移行対象メソッド数を正確に見積もり、Task 11.4時点で残存メソッドがゼロであることの検証方法を追記
   - **影響**: 移行ボリュームの過小評価によるスケジュールリスク

2. **handlers.tsの`currentProjectPath`ミュータブルステートのContext注入方式を明確化**（Section 3 #1）
   - handlers.tsは`currentProjectPath`をクロージャ変数として保持し、`selectProject`で更新する。このパターンをtRPC Contextにどう移行するかが未定義
   - **推奨**: design.md DD-006にミュータブルステートのContext注入パターンを追記。具体的には「getter関数をContextに注入」パターン（`ctx.services.getCurrentProjectPath()`）を明示する。Task 1.1にこの設計判断の実装を含める
   - **影響**: Task 1.1がブロックされるリスク。Context設計が曖昧だと全ルーターの実装に波及する

### Warnings (Should Address)

1. **Renderer使用ファイル数の修正**（Section 1.6 #3）
   - design.md Interface Changesの呼び出し数は概ね正確だが、影響ファイル数がrenderer 75ファイル + shared 13ファイル = 88ファイルである点を追記すべき
   - **推奨**: design.md Interface Changesに「影響ファイル数: 88ファイル」を追記

2. **IPCハンドラファイル数の修正**（Section 1.6 #4）
   - requirements.md/design.mdの「19ハンドラファイル」に対し、実測22ファイル（`startImplPhase.ts`, `clipboardHandlers.ts`, `ipcUtils.ts`を含む）
   - **推奨**: design.md Impact Analysis Contractの削除対象ファイルリストを確認し、22ファイル全てが含まれていることを検証。既にImpact Analysisテーブルには`clipboardHandlers.ts`、`startImplPhase.ts`、`ipcUtils.ts`が個別に記載されているため、requirements.mdの「19個」を「22個（ユーティリティ含む）」に修正するか、注記を追加

3. **IpcApiClient経由と直接呼び出しの移行優先順位**（Section 3 #2）
   - **推奨**: design.md DD-005のRenderer側移行手順に「1. Store内のIpcApiClient.method()呼び出し → tRPC hook、2. Store/Component内のwindow.electronAPI直接呼び出し → tRPC hook、3. IpcApiClientメソッド自体の削除」という明確な3段階を追記

4. **既存IPCテスト33ファイルの移行方針**（Section 3 #3）
   - **推奨**: tasks.mdの各ドメイン統合テストTask（X.3/X.4）に「既存`src/main/ipc/__tests__/xxxHandlers.test.ts`のテストケース・エッジケースを参考にし、tRPCルーターテストに知識を引き継ぐ」旨を追記

### Suggestions (Nice to Have)

1. **IpcApiClient 110メソッドのドメイン別分布**: research.mdにIpcApiClientメソッドのドメイン別分布（例: Config系15メソッド、Spec系20メソッド等）を追記すると、各ドメインTaskでの移行スコープ見積もりが正確になる
2. **`safeHandle`エラーハンドリングパターンの統一テンプレート**: design.md Error Handlingセクションに、既存`safeHandle`のエラー変換ロジックをtRPC `TRPCError`に変換するテンプレートコードを追記すると、各ルーター実装の一貫性が向上
3. **移行進捗追跡メカニズム**: 219チャンネル/110メソッド/88ファイルの移行進捗を追跡するための、各Phase完了後のGrepベース検証コマンド一覧を統一的に定義すると、移行漏れのリスクが低減する

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|--------------------|--------------------|
| CRITICAL | IpcApiClientメソッド数「44」→ 実測110 | design.md Interface Changes修正、各ドメインTask移行対象メソッドの正確化 | design.md |
| CRITICAL | `currentProjectPath`ミュータブルステートのContext注入方式未定義 | DD-006にgetter関数注入パターンを明記、Task 1.1に設計判断を含める | design.md, tasks.md |
| WARNING | Renderer使用ファイル数の追記 | design.md Interface Changesに「88ファイル」を追記 | design.md |
| WARNING | IPCハンドラファイル数「19」→ 実測22 | requirements.md/design.mdの数値修正または注記追加 | requirements.md, design.md |
| WARNING | IpcApiClient経由/直接呼び出しの移行優先順位 | DD-005に3段階の移行手順を明記 | design.md |
| WARNING | 既存IPCテスト33ファイルの移行方針 | 各ドメインTaskに既存テスト参照の旨を追記 | tasks.md |
| INFO | preload electronAPIメソッド定義数 | design.mdに「約618メソッド」を追記 | design.md |
| INFO | IpcApiClientメソッドのドメイン別分布 | research.mdに分布テーブル追加 | research.md |
| INFO | `safeHandle`→ TRPCError変換テンプレート | design.md Error Handlingに追記 | design.md |

---

_This review was generated by the document-review command._
